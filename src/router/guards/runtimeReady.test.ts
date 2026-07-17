import { describe, expect, it, vi } from 'vitest'
import { ensureTenantRuntimeReady, type TenantRuntimeSiteStore } from './runtimeReady'

const createSiteStore = (
  loaded: boolean,
  loadSiteInfo: TenantRuntimeSiteStore['loadSiteInfo']
): TenantRuntimeSiteStore => ({
  loaded,
  loadSiteInfo
})

describe('ensureTenantRuntimeReady', () => {
  it('waits for appInfo before allowing an authenticated route to continue', async () => {
    const siteStore = createSiteStore(false, async () => {
      await Promise.resolve()
      siteStore.loaded = true
    })

    await ensureTenantRuntimeReady(true, siteStore)

    expect(siteStore.loaded).toBe(true)
  })

  it('does not load appInfo for an unauthenticated route', async () => {
    const loadSiteInfo = vi.fn()
    const siteStore = createSiteStore(false, loadSiteInfo)

    await ensureTenantRuntimeReady(false, siteStore)

    expect(loadSiteInfo).not.toHaveBeenCalled()
  })

  it('fails closed when appInfo finishes without a verified runtime context', async () => {
    const siteStore = createSiteStore(false, async () => undefined)

    await expect(ensureTenantRuntimeReady(true, siteStore)).rejects.toThrow(
      '租户运行时上下文尚未就绪'
    )
  })
})
