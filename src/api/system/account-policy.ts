import request from '@/utils/http'

export interface TenantAccountPolicy {
  organization: number
  register_enabled: boolean
  version: number
  update_time: string
}

export type TenantAccountPolicyUpdate = Pick<TenantAccountPolicy, 'register_enabled' | 'version'>

const invalidPolicyResponse = (): never => {
  throw new Error('账号注册策略响应数据格式无效。')
}

export const parseTenantAccountPolicy = (value: unknown): TenantAccountPolicy => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidPolicyResponse()
  }

  const data = value as Record<string, unknown>
  if (
    typeof data.organization !== 'number' ||
    !Number.isInteger(data.organization) ||
    data.organization <= 0 ||
    typeof data.register_enabled !== 'boolean' ||
    typeof data.version !== 'number' ||
    !Number.isSafeInteger(data.version) ||
    data.version <= 0 ||
    typeof data.update_time !== 'string' ||
    data.update_time.trim() === ''
  ) {
    return invalidPolicyResponse()
  }

  return {
    organization: data.organization,
    register_enabled: data.register_enabled,
    version: data.version,
    update_time: data.update_time
  }
}

export default {
  async read(): Promise<TenantAccountPolicy> {
    const data = await request.get<unknown>({
      url: '/saimulti/tenant/account/policy/read',
      showErrorMessage: false
    })
    return parseTenantAccountPolicy(data)
  },
  async update(data: TenantAccountPolicyUpdate): Promise<TenantAccountPolicy> {
    const response = await request.put<unknown>({
      url: '/saimulti/tenant/account/policy/update',
      data: {
        register_enabled: data.register_enabled,
        version: data.version
      },
      showErrorMessage: false
    })
    return parseTenantAccountPolicy(response)
  }
}
