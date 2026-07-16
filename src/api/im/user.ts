import request from '@/utils/http'

export type ImUserStatus = 1 | 2 | 3

export interface ImUser {
  id: number
  user_id: string
  im_short_no: string | null
  account: string
  nickname: string
  avatar: string | null
  mobile: string | null
  email: string | null
  gender: 0 | 1 | 2
  status: ImUserStatus
  remark: string | null
  signature: string
  login_time: string | null
  create_time: string
}

export interface ImUserListParams {
  page: number
  limit: number
  keyword?: string
  status?: ImUserStatus
  orderField?: string
  orderType?: 'asc' | 'desc'
}

export interface ImUserSaveParams {
  account: string
  password: string
  password_confirm: string
  nickname: string
  im_short_no: string
  avatar: string
  mobile: string
  email: string
  gender: 0 | 1 | 2
  status: ImUserStatus
  remark: string
  signature: string
}

export interface ImUserUpdateParams
  extends Omit<ImUserSaveParams, 'password' | 'password_confirm' | 'status'> {
  id: number
}

export interface ImUserQuota {
  quota_value: number
  used_value: number
  remaining_value: number
  configured: boolean
}

const prefix = '/saimulti/tenant/im/user'

export default {
  list(params: ImUserListParams) {
    return request.get<Api.Common.ApiPage<ImUser>>({ url: `${prefix}/index`, params })
  },
  read(id: number) {
    return request.get<ImUser>({ url: `${prefix}/read`, params: { id } })
  },
  save(data: ImUserSaveParams) {
    return request.post<ImUser>({ url: `${prefix}/save`, data })
  },
  update(data: ImUserUpdateParams) {
    return request.put<ImUser>({ url: `${prefix}/update`, data })
  },
  status(data: { id: number; status: ImUserStatus }) {
    return request.post<ImUser>({ url: `${prefix}/status`, data })
  },
  reset(data: { id: number; password: string; password_confirm: string }) {
    return request.post<{ id: number; revoked_session_count: number }>({
      url: `${prefix}/reset`,
      data
    })
  },
  quota() {
    return request.get<ImUserQuota>({ url: `${prefix}/quota` })
  }
}
