import request from '@/utils/http'

const prefix = '/saimulti/tenant/file-media'

export default {
  quotaRead() {
    return request.get<Api.Common.ApiData>({ url: `${prefix}/quotaRead` })
  },
  quotaUpdate(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/quotaUpdate`, data })
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
