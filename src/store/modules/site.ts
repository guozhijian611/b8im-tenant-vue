import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import AppConfig from '@/config'
import { siteInfo } from '@/api/auth'
import { StorageConfig } from '@/utils/storage/storage-config'
import { clearRuntimeDeployment, publishRuntimeDeployment } from '@/config/runtime-endpoints'

type SiteInfo = Partial<Api.Auth.siteInfoResponse>
type SiteInfoParams = {
  enterprise_code: string
  domain: string
  mode: 'enterprise_code' | 'domain'
}

const ENTERPRISE_CODE_QUERY_KEY = 'enterprise_code'
const DEFAULT_ENTERPRISE_CODE = import.meta.env.VITE_DEFAULT_ENTERPRISE_CODE || ''

const mode = import.meta.env.VITE_APP_MODE || 'enterprise_code'
if (!['enterprise_code', 'domain'].includes(mode)) {
  throw new Error('VITE_APP_MODE 只允许 enterprise_code 或 domain')
}

const getUrlQueryValue = (key: string): string => {
  const searchParams = new URLSearchParams(window.location.search)
  const searchValue = searchParams.get(key)
  if (searchValue) {
    return searchValue
  }

  const hashQuery = window.location.hash.split('?')[1] || ''
  const hashParams = new URLSearchParams(hashQuery)
  return hashParams.get(key) || ''
}

const createSiteInfoParams = (enterpriseCode = ''): SiteInfoParams => {
  if (mode === 'domain') {
    return {
      enterprise_code: '',
      domain: location.hostname.toLowerCase(),
      mode: 'domain'
    }
  }

  return {
    enterprise_code: enterpriseCode,
    domain: '',
    mode: 'enterprise_code'
  }
}

const toDiscoveryParams = (selection: SiteInfoParams): Record<string, string> =>
  selection.mode === 'domain'
    ? { mode: 'domain', domain: selection.domain }
    : { enterprise_code: selection.enterprise_code }

const resolveUrlSiteInfoParams = (enterpriseCode = ''): SiteInfoParams =>
  createSiteInfoParams(
    enterpriseCode || getUrlQueryValue(ENTERPRISE_CODE_QUERY_KEY) || DEFAULT_ENTERPRISE_CODE
  )

export const useSiteStore = defineStore(
  'siteStore',
  () => {
    const info = ref<SiteInfo>({})
    const loading = ref(false)
    const loaded = ref(false)
    const error = ref<unknown>(null)
    const params = ref<SiteInfoParams>(createSiteInfoParams())
    let loadingPromise: Promise<Api.Auth.siteInfoResponse> | null = null

    const siteTitle = computed(() => info.value.site_name || AppConfig.systemInfo.name)
    const siteLogo = computed(() => info.value.logo || AppConfig.systemInfo.logo || '')
    const siteDomain = computed(() => location.hostname)
    const isEnabled = computed(() => loaded.value && Boolean(info.value.organization))

    const getStoredEnterpriseCode = () =>
      params.value.enterprise_code ||
      (info.value.enterprise_code ? String(info.value.enterprise_code) : '')

    const applyStoredIdentifier = () => {
      if (mode === 'domain') {
        const domain = location.hostname.toLowerCase()
        if (params.value.domain !== domain || params.value.mode !== 'domain') {
          params.value = createSiteInfoParams()
        }
        return domain
      }
      const identifier = getStoredEnterpriseCode()
      if (identifier && params.value.enterprise_code !== identifier) {
        params.value = createSiteInfoParams(identifier)
      }
      return identifier
    }

    const setSiteInfo = (data: Api.Auth.siteInfoResponse, selection: SiteInfoParams) => {
      publishRuntimeDeployment(data)
      info.value = data
      loaded.value = true
      params.value =
        selection.mode === 'domain'
          ? selection
          : createSiteInfoParams(String(data.enterprise_code || selection.enterprise_code))
    }

    const loadSiteInfo = async (force = false, enterpriseCode = '') => {
      const urlParams = resolveUrlSiteInfoParams(enterpriseCode)
      const hasUrlEnterpriseCode = urlParams.mode === 'domain' || Boolean(urlParams.enterprise_code)

      if (!hasUrlEnterpriseCode && !force && loaded.value) {
        applyStoredIdentifier()
        return info.value
      }

      const nextParams = hasUrlEnterpriseCode
        ? urlParams
        : createSiteInfoParams(applyStoredIdentifier())
      if (
        (nextParams.mode === 'enterprise_code' && !nextParams.enterprise_code) ||
        (nextParams.mode === 'domain' && !nextParams.domain)
      ) {
        return info.value
      }

      const isSameParams =
        params.value.enterprise_code === nextParams.enterprise_code &&
        params.value.domain === nextParams.domain &&
        params.value.mode === nextParams.mode

      if (!force && !hasUrlEnterpriseCode && loaded.value && isSameParams) {
        return info.value
      }

      if (loadingPromise) {
        return loadingPromise
      }

      loading.value = true
      error.value = null
      params.value = nextParams

      loadingPromise = siteInfo(toDiscoveryParams(nextParams))
        .then((data) => {
          setSiteInfo(data, nextParams)
          return data
        })
        .catch((err) => {
          clearRuntimeDeployment()
          info.value = {}
          loaded.value = false
          error.value = err
          throw err
        })
        .finally(() => {
          loading.value = false
          loadingPromise = null
        })

      return loadingPromise
    }

    const refreshSiteInfo = () => loadSiteInfo(true)

    return {
      info,
      params,
      loading,
      loaded,
      error,
      siteTitle,
      siteLogo,
      siteDomain,
      isEnabled,
      setSiteInfo,
      loadSiteInfo,
      refreshSiteInfo
    }
  },
  {
    persist: {
      key: StorageConfig.SITE_STORE_KEY,
      storage: localStorage,
      pick: ['info', 'params'],
      afterHydrate: ({ store }) => {
        const enterpriseCode =
          store.params?.enterprise_code ||
          (store.info?.enterprise_code ? String(store.info.enterprise_code) : '')
        store.loaded = false
        store.params = createSiteInfoParams(enterpriseCode)
      }
    }
  }
)
