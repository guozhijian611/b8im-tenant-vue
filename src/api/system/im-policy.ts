import request from '@/utils/http'

export type ImClientFamily = 'web' | 'app' | 'desktop'
export type SameDeviceLoginPolicy = 'replace' | 'coexist' | 'reject'
export type CrossDeviceLoginPolicy = 'allow' | 'kick_old' | 'reject_new'
export type ImPolicyStatus = 'ENABLED' | 'DISABLED'

export interface TenantImPolicy {
  organization: number
  allowed_client_families: ImClientFamily[]
  allow_multi_device_online: boolean
  max_online_devices: number
  same_device_login_policy: SameDeviceLoginPolicy
  cross_device_login_policy: CrossDeviceLoginPolicy
  max_message_concurrency: number
  max_message_qps: number
  default_group_display_member_count: number
  message_recall_window_seconds: number
  message_edit_window_seconds: number
  recall_notice_enabled: boolean
  group_recall_notice_enabled: boolean
  status: ImPolicyStatus
  version: number
  create_time?: string
  update_time?: string
}

export type TenantImPolicyUpdate = Omit<
  TenantImPolicy,
  'organization' | 'create_time' | 'update_time'
>

export default {
  read() {
    return request.get<TenantImPolicy>({
      url: '/saimulti/tenant/im/policy/read',
      showErrorMessage: false
    })
  },
  update(data: TenantImPolicyUpdate) {
    return request.put<TenantImPolicy>({
      url: '/saimulti/tenant/im/policy/update',
      data,
      showErrorMessage: false
    })
  }
}
