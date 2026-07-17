export interface TenantRuntimeSiteStore {
  loaded: boolean
  loadSiteInfo: () => Promise<unknown>
}

/**
 * 已登录页面恢复前必须先重建经过验证的租户运行时上下文。
 *
 * 刷新页面会清空 runtime-endpoints 中仅存在于内存的 verifiedContext。
 * 如果路由守卫先请求用户信息，请求拦截器会因为无法匹配 deployment
 * 而移除 Authorization，最终把缺少凭证误报为 Token 过期。
 */
export async function ensureTenantRuntimeReady(
  isLogin: boolean,
  siteStore: TenantRuntimeSiteStore
): Promise<void> {
  if (!isLogin || siteStore.loaded) {
    return
  }

  await siteStore.loadSiteInfo()

  if (!siteStore.loaded) {
    throw new Error('租户运行时上下文尚未就绪')
  }
}
