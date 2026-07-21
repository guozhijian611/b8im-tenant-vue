import request from '@/utils/http'
import {
  parseExpectedOrganization,
  parseFileMediaPolicy,
  parseStorageQuota,
  type FileMediaPolicy,
  type StorageQuota
} from '@/utils/fileMediaContract'

const prefix = '/saimulti/tenant/file-media'
const storageQuotaPrefix = '/saimulti/tenant/storage-quota'

export type { FileMediaPolicy, StorageQuota } from '@/utils/fileMediaContract'

export type TenantFileMediaPolicyUpdate = FileMediaPolicy

export default {
  async storageRead(expectedOrganization: number): Promise<StorageQuota> {
    const organization = parseExpectedOrganization(expectedOrganization)
    const payload = await request.get<unknown>({ url: storageQuotaPrefix + '/read' })
    const storage = parseStorageQuota(payload)
    if (storage.organization !== organization) {
      throw new Error('StorageQuota.organization 与当前 App-Id 不一致')
    }
    return storage
  },
  async policyRead(): Promise<FileMediaPolicy> {
    const payload = await request.get<unknown>({ url: prefix + '/policyRead' })
    return parseFileMediaPolicy(payload)
  },
  async policyUpdate(data: TenantFileMediaPolicyUpdate): Promise<FileMediaPolicy> {
    const requestData = parseFileMediaPolicy({
      max_file_bytes: data.max_file_bytes,
      large_file_enabled: data.large_file_enabled,
      preview_enabled: data.preview_enabled,
      status: data.status
    })
    const payload = await request.put<unknown>({
      url: prefix + '/policyUpdate',
      data: requestData
    })
    return parseFileMediaPolicy(payload)
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
