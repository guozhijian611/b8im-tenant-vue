import request from '@/utils/http'

const prefix = '/saimulti/tenant/search'

export default {
  indexRead() {
    return request.get<Api.Common.ApiData>({ url: `${prefix}/indexRead` })
  },
  rebuild() {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/rebuild` })
  },
  jobList(params: Record<string, any> = {}) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/jobIndex`, params })
  },
  docUpsert(data: Record<string, any>) {
    return request.post<Api.Common.ApiData>({ url: `${prefix}/docUpsert`, data })
  }
}
