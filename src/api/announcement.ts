import request from '@/utils/http'

const prefix = '/saimulti/tenant/announcement'

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
  }
}
