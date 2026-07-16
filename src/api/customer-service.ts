import request from '@/utils/http'

const prefix = '/saimulti/tenant/customer-service'

export default {
  queueList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/queue/index`, params })
  },
  queueSave(params: Record<string, any>) {
    return request.post({ url: `${prefix}/queue/save`, data: params })
  },
  queueUpdate(params: Record<string, any>) {
    return request.put({ url: `${prefix}/queue/update`, data: params })
  },
  queueDelete(params: { ids: Array<number | string> }) {
    return request.del({ url: `${prefix}/queue/destroy`, data: params })
  },
  entryList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/entry/index`, params })
  },
  entrySave(params: Record<string, any>) {
    return request.post({ url: `${prefix}/entry/save`, data: params })
  },
  entryUpdate(params: Record<string, any>) {
    return request.put({ url: `${prefix}/entry/update`, data: params })
  },
  entryDelete(params: { ids: Array<number | string> }) {
    return request.del({ url: `${prefix}/entry/destroy`, data: params })
  },
  agentList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/agent/index`, params })
  },
  agentSave(params: Record<string, any>) {
    return request.post({ url: `${prefix}/agent/save`, data: params })
  },
  agentUpdate(params: Record<string, any>) {
    return request.put({ url: `${prefix}/agent/update`, data: params })
  },
  agentDelete(params: { ids: Array<number | string> }) {
    return request.del({ url: `${prefix}/agent/destroy`, data: params })
  },
  conversationList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({ url: `${prefix}/conversation/index`, params })
  },
  conversationRead(id: number | string) {
    return request.get<Api.Common.ApiData>({ url: `${prefix}/conversation/read`, params: { id } })
  },
  conversationUpdate(params: Record<string, any>) {
    return request.put({ url: `${prefix}/conversation/update`, data: params })
  }
}
