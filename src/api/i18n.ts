import request from '@/utils/http'

const prefix = '/saimulti/tenant/i18n'

export default {
  list(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/index`, params })
  },
  read(id: number | string) {
    return request.get<Api.Common.ApiData>({ url: `${prefix}/read`, params: { id } })
  },
  save(params: Record<string, any>) {
    return request.post<any>({ url: `${prefix}/save`, data: params })
  },
  update(params: Record<string, any>) {
    return request.put<any>({ url: `${prefix}/update`, data: params })
  },
  delete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/destroy`, data: params })
  },
  entryList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/entryIndex`, params })
  },
  entrySave(params: Record<string, any>) {
    return request.post<any>({ url: `${prefix}/entrySave`, data: params })
  },
  entryUpdate(params: Record<string, any>) {
    return request.put<any>({ url: `${prefix}/entryUpdate`, data: params })
  },
  entryDelete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/entryDestroy`, data: params })
  }
}
