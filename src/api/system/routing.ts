import request from '@/utils/http'

export type ClientFamily = 'web' | 'app' | 'desktop'

export interface TenantRoutingResult {
  organization: number
  deployment_id: string
  client_family: ClientFamily
  server_info: {
    route_pool_id: string
    route_pool_version: number
    routing_version: number
    expires_at: string
    policy: { mode: 'single' | 'primary_backup'; primary_route_id: string; backup_route_ids: string[] }
    routes: Array<{
      route_id: string
      route_version: number
      name: string
      priority: number
      region: string
      carrier: string
      endpoints: {
        api_server_url: string
        im_server_url: string
        upload_server_url: string
        web_server_url: string
      }
    }>
  }
  routing_signature: { kid: string }
  publish_time: string
}

export default {
  read(clientFamily: ClientFamily) {
    return request.get<TenantRoutingResult>({
      url: '/saimulti/tenant/routing/read',
      params: { client_family: clientFamily },
      showErrorMessage: false
    })
  }
}
