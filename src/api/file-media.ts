import request from '@/utils/http'

const prefix = '/saimulti/tenant/file-media'

export interface FileMediaQuota {
  id: number
  organization: number
  max_storage_bytes: number
  max_file_bytes: number
  used_storage_bytes: number
  used_file_count: number
  usage_ratio: number
  preview_enabled: number
  large_file_enabled: number
  status: number
  create_time?: string | null
  update_time?: string | null
}

export interface TenantFileMediaQuotaUpdate {
  max_file_bytes: number
  preview_enabled: number
  large_file_enabled: number
  status: number
}

export default {
  quotaRead() {
    return request.get<FileMediaQuota>({ url: `${prefix}/quotaRead` })
  },
  quotaUpdate(data: TenantFileMediaQuotaUpdate) {
    return request.put<FileMediaQuota>({
      url: `${prefix}/quotaUpdate`,
      data: {
        max_file_bytes: data.max_file_bytes,
        preview_enabled: data.preview_enabled,
        large_file_enabled: data.large_file_enabled,
        status: data.status
      }
    })
  },
  folderList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/folderIndex`, params })
  },
  folderCreate(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/folderSave`, data })
  },
  folderUpdate(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/folderUpdate`, data })
  },
  folderDelete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/folderDestroy`, data: params })
  },
  itemList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/itemIndex`, params })
  },
  itemCreate(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/itemSave`, data })
  },
  itemUpdate(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/itemUpdate`, data })
  },
  itemDelete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/itemDestroy`, data: params })
  }
}
