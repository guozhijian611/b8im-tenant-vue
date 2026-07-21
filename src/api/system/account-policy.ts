import request from '@/utils/http'

export interface TenantAccountPolicy {
  organization: number
  register_enabled: boolean
  version: number
  update_time: string
}

export type TenantAccountPolicyUpdate = Pick<TenantAccountPolicy, 'register_enabled' | 'version'>

export default {
  read() {
    return request.get<TenantAccountPolicy>({
      url: '/saimulti/tenant/account/policy/read',
      showErrorMessage: false
    })
  },
  update(data: TenantAccountPolicyUpdate) {
    return request.put<TenantAccountPolicy>({
      url: '/saimulti/tenant/account/policy/update',
      data,
      showErrorMessage: false
    })
  }
}
