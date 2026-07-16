import request from '@/utils/http'

const prefix = '/saimulti/tenant/robot-single'

export default {
  list(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/index`, params })
  },
  read(id: number | string) {
    return request.get<Api.Common.ApiData>({ url: `${prefix}/read`, params: { id } })
  },
  create(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/save`, data })
  },
  update(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/update`, data })
  },
  delete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/destroy`, data: params })
  },
  ruleList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/ruleIndex`, params })
  },
  ruleCreate(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/ruleSave`, data })
  },
  ruleUpdate(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/ruleUpdate`, data })
  },
  ruleDelete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/ruleDestroy`, data: params })
  },
  kbList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/kbIndex`, params })
  },
  kbCreate(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/kbSave`, data })
  },
  kbUpdate(data: Record<string, any>) {
    return request.put<Api.Common.ApiData>({ url: `${prefix}/kbUpdate`, data })
  },
  kbDelete(params: { ids: Array<number | string> }) {
    return request.del<any>({ url: `${prefix}/kbDestroy`, data: params })
  }
}
