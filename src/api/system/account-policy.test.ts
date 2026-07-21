import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/http', () => ({ default: requestMock }))

import accountPolicyApi from './account-policy'

describe('accountPolicyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the current tenant account policy from the fixed endpoint', async () => {
    await accountPolicyApi.read()

    expect(requestMock.get).toHaveBeenCalledWith({
      url: '/saimulti/tenant/account/policy/read',
      showErrorMessage: false
    })
  })

  it('updates only register_enabled and version', async () => {
    const data = { register_enabled: true, version: 7 }

    await accountPolicyApi.update(data)

    expect(requestMock.put).toHaveBeenCalledWith({
      url: '/saimulti/tenant/account/policy/update',
      data,
      showErrorMessage: false
    })
    expect(requestMock.put.mock.calls[0][0].data).not.toHaveProperty('organization')
  })
})
