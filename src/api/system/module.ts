import request from '@/utils/http'

export type TenantModuleStatus = 'AUTHORIZED' | 'ENABLED' | 'DISABLED' | 'EXPIRED'

export type ModuleConfigType =
  | 'string'
  | 'integer'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'secret'
  | 'url'

export interface ModuleConfigSchemaItem {
  key: string
  name: string
  description?: string
  type: ModuleConfigType
  scope: 'system' | 'tenant'
  required: boolean
  sensitive: boolean
  default?: unknown
  options?: Array<{ label: string; value: string | number | boolean }>
}

export interface TenantModuleItem {
  module_key: string
  name: string
  description: string
  version: string
  platforms: string[]
  status: TenantModuleStatus
  expire_at: string | null
  effective: boolean
  config_schema: ModuleConfigSchemaItem[]
}

export interface TenantModuleListResponse {
  items: TenantModuleItem[]
}

export interface TenantModuleConfigResponse {
  module_key: string
  schema: ModuleConfigSchemaItem[]
  values: Record<string, unknown>
  configured: Record<string, boolean>
  version: number
}

export default {
  list() {
    return request.get<TenantModuleListResponse>({ url: '/saimulti/tenant/module/index' })
  },
  enable(moduleKey: string) {
    return request.post<any>({
      url: '/saimulti/tenant/module/enable',
      data: { module_key: moduleKey }
    })
  },
  disable(moduleKey: string) {
    return request.post<any>({
      url: '/saimulti/tenant/module/disable',
      data: { module_key: moduleKey }
    })
  },
  config(moduleKey: string) {
    return request.get<TenantModuleConfigResponse>({
      url: '/saimulti/tenant/module/config',
      params: { module_key: moduleKey }
    })
  },
  updateConfig(moduleKey: string, config: Record<string, unknown>) {
    return request.put<any>({
      url: '/saimulti/tenant/module/config',
      data: { module_key: moduleKey, config }
    })
  }
}
