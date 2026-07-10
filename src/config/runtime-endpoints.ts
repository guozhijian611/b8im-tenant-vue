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

export const publishRuntimeDeployment = (data: Api.Auth.siteInfoResponse) => {
  if (!Number.isInteger(data.organization) || data.organization <= 0) {
    throw new Error('appInfo.organization 无效')
  }
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(data.deployment_id)) {
    throw new Error('appInfo.deployment_id 无效')
  }
  if (!Number.isInteger(data.config_version) || data.config_version <= 0) {
    throw new Error('appInfo.config_version 无效')
  }

  const serverInfo: RuntimeServerInfo = {
    api_server_url: validateNetworkUrl(
      data.server_info.api_server_url,
      ['https', 'http'],
      'api_server_url'
    ),
    im_server_url: validateNetworkUrl(
      data.server_info.im_server_url,
      ['wss', 'ws'],
      'im_server_url'
    ),
    upload_server_url: validateNetworkUrl(
      data.server_info.upload_server_url,
      ['https', 'http'],
      'upload_server_url'
    ),
    web_server_url: validateNetworkUrl(
      data.server_info.web_server_url,
      ['https', 'http'],
      'web_server_url'
    )
  }

  verifiedContext = {
    deploymentId: data.deployment_id,
    organization: data.organization,
    configVersion: data.config_version,
    serverInfo
  }
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
