export interface RuntimeServerInfo {
  api_server_url: string
  im_server_url: string
  upload_server_url: string
  web_server_url: string
}

export interface RuntimeDeploymentContext {
  deploymentId: string
  organization: number
  configVersion: number
  serverInfo: RuntimeServerInfo
  routingVersion: number
}

let verifiedContext: RuntimeDeploymentContext | null = null

const allowInsecure = import.meta.env.VITE_ALLOW_INSECURE_SERVER_URLS === 'true'

const validateNetworkUrl = (value: string, schemes: string[], field: string): string => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${field} 不是完整的网络地址`)
  }

  const scheme = url.protocol.replace(':', '').toLowerCase()
  if (
    !url.hostname ||
    !schemes.includes(scheme) ||
    url.username ||
    url.password ||
    url.hash ||
    (!allowInsecure && ['http', 'ws'].includes(scheme))
  ) {
    throw new Error(`${field} 不符合当前环境的安全要求`)
  }

  return value.replace(/\/+$/, '')
}

export const publishRuntimeDeployment = async (data: Api.Auth.siteInfoResponse) => {
  if (!Number.isInteger(data.organization) || data.organization <= 0) {
    throw new Error('appInfo.organization 无效')
  }
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(data.deployment_id)) {
    throw new Error('appInfo.deployment_id 无效')
  }
  if (!Number.isInteger(data.config_version) || data.config_version <= 0) {
    throw new Error('appInfo.config_version 无效')
  }
  if (data.client_family !== 'web' || data.server_info.schema_version !== 2) {
    throw new Error('appInfo 客户端形态或 schema 无效')
  }
  await verifyRoutingSignature(data)
  if (Date.parse(data.server_info.expires_at) <= Date.now()) {
    throw new Error('appInfo 线路快照已经过期')
  }
  const primary = data.server_info.routes.find(
    (route) => route.route_id === data.server_info.policy.primary_route_id
  )
  if (!primary || primary.deployment_id !== data.deployment_id) {
    throw new Error('appInfo 主线路与 deployment_id 不一致')
  }

  const serverInfo: RuntimeServerInfo = {
    api_server_url: validateNetworkUrl(
      primary.endpoints.api_server_url,
      ['https', 'http'],
      'api_server_url'
    ),
    im_server_url: validateNetworkUrl(
      primary.endpoints.im_server_url,
      ['wss', 'ws'],
      'im_server_url'
    ),
    upload_server_url: validateNetworkUrl(
      primary.endpoints.upload_server_url,
      ['https', 'http'],
      'upload_server_url'
    ),
    web_server_url: validateNetworkUrl(
      primary.endpoints.web_server_url,
      ['https', 'http'],
      'web_server_url'
    )
  }

  verifiedContext = {
    deploymentId: data.deployment_id,
    organization: data.organization,
    configVersion: data.config_version,
    serverInfo,
    routingVersion: data.server_info.routing_version
  }
}

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b, 'en'))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const verifyRoutingSignature = async (data: Api.Auth.siteInfoResponse) => {
  const signature = data.routing_signature
  if (signature.alg !== 'Ed25519' || signature.canonicalization !== 'JCS-RFC8785') {
    throw new Error('appInfo 线路签名算法无效')
  }
  let keys: Record<string, string>
  try {
    keys = JSON.parse(import.meta.env.VITE_ROUTING_PUBLIC_KEYS || '') as Record<string, string>
  } catch {
    throw new Error('VITE_ROUTING_PUBLIC_KEYS 配置无效')
  }
  const publicKey = keys[signature.kid]
  if (!publicKey || decodeBase64Url(publicKey).length !== 32) {
    throw new Error(`appInfo 签名密钥 ${signature.kid} 不受信任`)
  }
  const key = await crypto.subtle.importKey('raw', decodeBase64Url(publicKey), 'Ed25519', false, ['verify'])
  const valid = await crypto.subtle.verify(
    'Ed25519',
    key,
    decodeBase64Url(signature.value),
    new TextEncoder().encode(canonicalJson({
      organization: data.organization,
      deployment_id: data.deployment_id,
      enterprise_code: data.enterprise_code,
      client_family: data.client_family,
      server_info: data.server_info
    }))
  )
  if (!valid) throw new Error('appInfo 线路签名验证失败')
}

export const clearRuntimeDeployment = () => {
  verifiedContext = null
}

export const getRuntimeDeployment = () => verifiedContext

export const getRuntimeApiBaseUrl = () => verifiedContext?.serverInfo.api_server_url || ''

export const tokenMatchesRuntimeDeployment = (token: string): boolean => {
  if (!verifiedContext) return false

  try {
    const encodedPayload = token.split('.')[1]
    if (!encodedPayload) return false
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payloadBytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<string, unknown>
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud]

    return (
      Number(payload.organization) === verifiedContext.organization &&
      String(payload.deployment_id || payload.iss || '') === verifiedContext.deploymentId &&
      audience.includes('tenant-api')
    )
  } catch {
    return false
  }
}
