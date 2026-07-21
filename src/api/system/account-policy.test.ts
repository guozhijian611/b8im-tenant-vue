import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/http', () => ({ default: requestMock }))

import accountPolicyApi, {
  parseTenantAccountPolicy,
  type TenantAccountPolicy
} from './account-policy'

const validPolicy: TenantAccountPolicy = {
  organization: 42,
  register_enabled: false,
  version: 7,
  update_time: '2026-07-21 13:00:00'
}

describe('accountPolicyApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestMock.get.mockResolvedValue(validPolicy)
    requestMock.put.mockResolvedValue({
      ...validPolicy,
      register_enabled: true,
      version: 8
    })
  })

  it('reads the current tenant account policy from the fixed endpoint', async () => {
    const result = await accountPolicyApi.read()

    expect(requestMock.get).toHaveBeenCalledWith({
      url: '/saimulti/tenant/account/policy/read',
      showErrorMessage: false
    })
    expect(result).toEqual(validPolicy)
  })

  it('updates only register_enabled and version', async () => {
    const policy: TenantAccountPolicy = {
      ...validPolicy,
      register_enabled: true,
      version: 7
    }

    await accountPolicyApi.update(policy)

    expect(requestMock.put).toHaveBeenCalledWith({
      url: '/saimulti/tenant/account/policy/update',
      data: {
        register_enabled: true,
        version: 7
      },
      showErrorMessage: false
    })
  })

  it.each([
    null,
    [],
    { ...validPolicy, organization: 0 },
    { ...validPolicy, organization: 1.5 },
    { ...validPolicy, register_enabled: 'false' },
    { ...validPolicy, version: 0 },
    { ...validPolicy, version: Number.MAX_SAFE_INTEGER + 1 },
    { ...validPolicy, update_time: '   ' }
  ])('rejects malformed policy response data %#', (value) => {
    expect(() => parseTenantAccountPolicy(value)).toThrow('账号注册策略响应数据格式无效。')
  })

  it('rejects malformed data returned by the read endpoint', async () => {
    requestMock.get.mockResolvedValue({
      ...validPolicy,
      register_enabled: 'false'
    })

    await expect(accountPolicyApi.read()).rejects.toThrow('账号注册策略响应数据格式无效。')
  })

  it('rejects malformed data returned by the update endpoint', async () => {
    requestMock.put.mockResolvedValue({
      ...validPolicy,
      version: 0
    })

    await expect(
      accountPolicyApi.update({
        register_enabled: true,
        version: 7
      })
    ).rejects.toThrow('账号注册策略响应数据格式无效。')
  })
})
