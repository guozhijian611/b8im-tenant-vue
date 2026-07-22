import { describe, expect, it, vi } from 'vitest'

vi.mock('@/locales', () => ({
  $t: (key: string) => key
}))

vi.mock('@/utils/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn()
  }
}))

import { parseTenantAccountPolicy, type TenantAccountPolicy } from '@/api/system/account-policy'
import { HttpError } from '@/utils/http/error'
import {
  createAccountPolicyController,
  createAccountPolicyState
} from './account-policy-controller'

const initialPolicy: TenantAccountPolicy = {
  organization: 42,
  register_enabled: false,
  version: 7,
  update_time: '2026-07-21 13:00:00'
}

const createHarness = () => {
  const state = createAccountPolicyState()
  const api = {
    read: vi.fn(async () => ({ ...initialPolicy })),
    update: vi.fn(async () => ({
      ...initialPolicy,
      register_enabled: true,
      version: 8
    }))
  }
  const confirmChange = vi.fn(async () => true)
  const confirmReload = vi.fn(async () => true)
  const notifications = {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn()
  }
  const controller = createAccountPolicyController({
    state,
    api,
    confirmChange,
    confirmReload,
    notifications
  })

  return { state, api, confirmChange, confirmReload, notifications, controller }
}

describe('account policy controller', () => {
  it('does not send PUT when the change confirmation is cancelled', async () => {
    const harness = createHarness()
    await harness.controller.loadPolicy()
    harness.state.formData.register_enabled = true
    harness.confirmChange.mockResolvedValue(false)

    await expect(harness.controller.savePolicy()).resolves.toBe(false)

    expect(harness.confirmChange).toHaveBeenCalledWith('enable')
    expect(harness.api.update).not.toHaveBeenCalled()
  })

  it('preserves the draft and locks saving after an HttpError 409', async () => {
    const harness = createHarness()
    await harness.controller.loadPolicy()
    harness.state.formData.register_enabled = true
    harness.api.update.mockRejectedValue(new HttpError('conflict', 409))

    await expect(harness.controller.savePolicy()).resolves.toBe(false)

    expect(harness.state.policy?.register_enabled).toBe(false)
    expect(harness.state.formData).toEqual({
      register_enabled: true,
      version: 7
    })
    expect(harness.state.conflicted).toBe(true)
    expect(harness.controller.canSave()).toBe(false)
  })

  it('does not GET when reload is cancelled and overwrites draft and version when confirmed', async () => {
    const harness = createHarness()
    harness.state.policy = { ...initialPolicy }
    Object.assign(harness.state.formData, {
      register_enabled: true,
      version: 7
    })
    harness.confirmReload.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    harness.api.read.mockResolvedValue({
      ...initialPolicy,
      register_enabled: true,
      version: 9
    })

    await expect(harness.controller.reloadPolicy()).resolves.toBe(false)
    expect(harness.api.read).not.toHaveBeenCalled()
    expect(harness.state.formData).toEqual({
      register_enabled: true,
      version: 7
    })

    await expect(harness.controller.reloadPolicy()).resolves.toBe(true)
    expect(harness.api.read).toHaveBeenCalledTimes(1)
    expect(harness.state.formData).toEqual({
      register_enabled: true,
      version: 9
    })
  })

  it('overwrites the version from a successful update response', async () => {
    const harness = createHarness()
    await harness.controller.loadPolicy()
    harness.state.formData.register_enabled = true

    await expect(harness.controller.savePolicy()).resolves.toBe(true)

    expect(harness.api.update).toHaveBeenCalledWith({
      register_enabled: true,
      version: 7
    })
    expect(harness.state.formData.version).toBe(8)
    expect(harness.state.policy?.version).toBe(8)
    expect(harness.notifications.success).toHaveBeenCalledOnce()
  })

  it('fails closed when a read response is malformed', async () => {
    const harness = createHarness()
    harness.api.read.mockImplementation(async () =>
      parseTenantAccountPolicy({
        ...initialPolicy,
        register_enabled: 'false'
      })
    )

    await expect(harness.controller.loadPolicy()).resolves.toBe(false)

    expect(harness.state.policy).toBeNull()
    expect(harness.state.loadFailed).toBe(true)
    expect(harness.controller.canSave()).toBe(false)
  })

  it('does not apply a malformed update response', async () => {
    const harness = createHarness()
    await harness.controller.loadPolicy()
    harness.state.formData.register_enabled = true
    harness.api.update.mockImplementation(async () =>
      parseTenantAccountPolicy({
        ...initialPolicy,
        register_enabled: 'false',
        version: 8
      })
    )

    await expect(harness.controller.savePolicy()).resolves.toBe(false)

    expect(harness.state.policy).toEqual(initialPolicy)
    expect(harness.state.formData).toEqual({
      register_enabled: true,
      version: 7
    })
    expect(harness.notifications.error).toHaveBeenCalledWith('账号注册策略响应数据格式无效。')
  })
})
