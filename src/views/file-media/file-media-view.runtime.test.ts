import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey, toRaw, type App } from 'vue'
import type { FileMediaPolicy, StorageQuota } from '@/utils/fileMediaContract'

const mocks = vi.hoisted(() => ({
  api: {
    storageRead: vi.fn(),
    policyRead: vi.fn(),
    policyUpdate: vi.fn(),
    folderList: vi.fn(),
    folderCreate: vi.fn(),
    folderUpdate: vi.fn(),
    folderDelete: vi.fn(),
    itemList: vi.fn(),
    itemCreate: vi.fn(),
    itemUpdate: vi.fn(),
    itemDelete: vi.fn()
  },
  message: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  },
  siteState: {
    loaded: true,
    info: { organization: 9 }
  }
}))

vi.mock('@/api/file-media', () => ({ default: mocks.api }))
vi.mock('element-plus', () => ({ ElMessage: mocks.message }))
vi.mock('@/hooks/useTable', () => ({
  useTable: () => ({
    columns: [],
    columnChecks: [],
    data: [],
    loading: false,
    pagination: {},
    handleSizeChange: vi.fn(),
    handleCurrentChange: vi.fn(),
    refreshData: vi.fn()
  })
}))
vi.mock('@/store/modules/site', async () => {
  const { reactive } = await import('vue')
  const testSiteStore = reactive(mocks.siteState)
  return {
    useSiteStore: () => testSiteStore,
    testSiteStore
  }
})

import { useSiteStore } from '@/store/modules/site'
import FileMediaView from './index.vue'

interface HostNode {
  type: string
  text: string
  parent: HostNode | null
  children: HostNode[]
  props: Record<string, unknown>
}

function hostNode(type: string, text = ''): HostNode {
  return { type, text, parent: null, children: [], props: {} }
}

const renderer = createRenderer<HostNode, HostNode>({
  patchProp(node, key, _previous, value) {
    node.props[key] = value
  },
  insert(child, parent, anchor) {
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(child)
    else parent.children.splice(index, 0, child)
  },
  remove(child) {
    if (!child.parent) return
    const index = child.parent.children.indexOf(child)
    if (index >= 0) child.parent.children.splice(index, 1)
    child.parent = null
  },
  createElement(type) {
    return hostNode(type)
  },
  createText(text) {
    return hostNode('#text', text)
  },
  createComment(text) {
    return hostNode('#comment', text)
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode(node) {
    return node.parent
  },
  nextSibling(node) {
    if (!node.parent) return null
    const index = node.parent.children.indexOf(node)
    return node.parent.children[index + 1] ?? null
  },
  querySelector() {
    return null
  },
  setScopeId() {},
  cloneNode(node) {
    return { ...node, parent: null, children: [...node.children], props: { ...node.props } }
  },
  insertStaticContent(content, parent, anchor) {
    const node = hostNode('#static', content)
    node.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    if (index < 0) parent.children.push(node)
    else parent.children.splice(index, 0, node)
    return [node, node]
  }
})

const baseStorage = {
  organization: 9,
  quota_key: 'storage_bytes',
  quota_value: '10000',
  used_value: '6000',
  held_value: '500',
  occupancy_value: '6500',
  remaining_value: '3500',
  unlimited: false,
  used_file_count: 6,
  held_file_count: 1,
  usage_ratio: 0.65,
  version: 3,
  update_time: null
} as const

const basePolicy = {
  max_file_bytes: '1024',
  large_file_enabled: 1,
  preview_enabled: 1,
  status: 1
} as const

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

async function flush() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

const siteStore = useSiteStore() as unknown as {
  loaded: boolean
  info: { organization: number }
}
const mountedApps = new Set<App>()

function mountFileMediaView() {
  const runtimeComponent = { ...FileMediaView, render: () => null }
  const app = renderer.createApp(runtimeComponent)
  app.provide(ssrContextKey, { modules: new Set<string>() })
  mountedApps.add(app)
  const proxy = app.mount(hostNode('#root')) as unknown as {
    $: { setupState: Record<string, any> }
  }
  return {
    app,
    setup: proxy.$.setupState,
    unmount() {
      if (!mountedApps.delete(app)) return
      app.unmount()
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  siteStore.loaded = true
  siteStore.info = { organization: 9 }
  mocks.api.storageRead.mockResolvedValue(baseStorage)
  mocks.api.policyRead.mockResolvedValue(basePolicy)
  mocks.api.policyUpdate.mockResolvedValue(basePolicy)
})

afterEach(() => {
  for (const app of mountedApps) app.unmount()
  mountedApps.clear()
})

describe('file media view runtime fencing', () => {
  it('mounts the real component and a dialog close suppresses its pending policy read', async () => {
    const mounted = mountFileMediaView()
    await flush()
    expect(mounted.setup.policy).toEqual(basePolicy)

    const pending = deferred<FileMediaPolicy>()
    mocks.api.policyRead.mockImplementationOnce(() => pending.promise)
    const opening = mounted.setup.openPolicy()
    expect(mounted.setup.policyVisible).toBe(true)
    expect(mounted.setup.policyDialogLoading).toBe(true)

    mounted.setup.policyVisible = false
    mounted.setup.invalidatePolicyDialog()
    pending.resolve({ ...basePolicy, max_file_bytes: '2048' })
    await opening
    await flush()

    expect(mounted.setup.policy).toEqual(basePolicy)
    expect(mounted.setup.policyForm.max_file_bytes).toBe('1024')
    expect(mounted.setup.policyDialogLoading).toBe(false)
  })

  it('runs a real component save and commits only its returned four-field policy', async () => {
    const mounted = mountFileMediaView()
    await flush()
    const updated = { ...basePolicy, max_file_bytes: '4096', preview_enabled: 0 as const }
    Object.assign(mounted.setup.policyForm, updated)
    mounted.setup.policyVisible = true
    mocks.api.policyUpdate.mockResolvedValueOnce(updated)

    await mounted.setup.savePolicy()

    expect(mocks.api.policyUpdate).toHaveBeenCalledWith(updated)
    expect(mounted.setup.policy).toEqual(updated)
    expect(mounted.setup.policyVisible).toBe(false)
    expect(mocks.message.success).toHaveBeenCalledWith('已保存')
  })

  it('switches organization during an in-flight load without committing the old result', async () => {
    const oldStorage = deferred<StorageQuota>()
    const newStorage = deferred<StorageQuota>()
    mocks.api.storageRead.mockImplementation((organization: number) =>
      organization === 9 ? oldStorage.promise : newStorage.promise
    )
    const mounted = mountFileMediaView()
    await Promise.resolve()
    expect(mocks.api.storageRead).toHaveBeenCalledWith(9)

    siteStore.info.organization = 10
    await flush()
    expect(mocks.api.storageRead).toHaveBeenCalledWith(10)

    oldStorage.resolve(baseStorage)
    await flush()
    expect(mounted.setup.storageQuota).toBeNull()
    expect(mounted.setup.quotaLoading).toBe(true)

    const currentStorage = organizationStorage(10)
    newStorage.resolve(currentStorage)
    await flush()
    expect(mounted.setup.storageQuota).toEqual(currentStorage)
    expect(mounted.setup.quotaLoading).toBe(false)
  })

  it('checks organization synchronously before a save can commit, even before watch runs', async () => {
    const mounted = mountFileMediaView()
    await flush()
    const pending = deferred<FileMediaPolicy>()
    const returned = { ...basePolicy, max_file_bytes: '8192' }
    Object.assign(mounted.setup.policyForm, returned)
    mocks.api.policyUpdate.mockReturnValueOnce(pending.promise)
    const saving = mounted.setup.savePolicy()

    toRaw(siteStore.info).organization = 10
    pending.resolve(returned)
    await saving

    expect(mounted.setup.policy).toEqual(basePolicy)
    expect(mocks.message.success).not.toHaveBeenCalled()
  })

  it('unmount invalidates an in-flight save before success or finally can repopulate state', async () => {
    const mounted = mountFileMediaView()
    await flush()
    const pending = deferred<FileMediaPolicy>()
    const returned = { ...basePolicy, max_file_bytes: '16384' }
    Object.assign(mounted.setup.policyForm, returned)
    mocks.api.policyUpdate.mockReturnValueOnce(pending.promise)
    const saving = mounted.setup.savePolicy()

    mounted.unmount()
    pending.resolve(returned)
    await saving
    await flush()

    expect(mounted.setup.policy).toBeNull()
    expect(mounted.setup.policySaving).toBe(false)
    expect(mocks.message.success).not.toHaveBeenCalled()
  })
})

function organizationStorage(organization: number) {
  return { ...baseStorage, organization }
}
