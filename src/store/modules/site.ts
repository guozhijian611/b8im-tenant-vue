import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import AppConfig from '@/config'
import { siteInfo } from '@/api/auth'
import { StorageConfig } from '@/utils/storage/storage-config'

type SiteInfo = Partial<Api.Auth.siteInfoResponse>
type SiteInfoParams = {
  enterprise_code: string
  mode: string
}

const ENTERPRISE_CODE_QUERY_KEY = 'enterprise_code'
const DEFAULT_ENTERPRISE_CODE = import.meta.env.VITE_DEFAULT_ENTERPRISE_CODE || ''

const mode = import.meta.env.VITE_APP_MODE || 'enterprise_code'

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
  return {
    enterprise_code: enterpriseCode,
    mode: import.meta.env.VITE_APP_MODE || ''
  }
}

const resolveUrlSiteInfoParams = (enterpriseCode = ''): SiteInfoParams =>
  createSiteInfoParams(
    enterpriseCode ||
      getUrlQueryValue(ENTERPRISE_CODE_QUERY_KEY) ||
      DEFAULT_ENTERPRISE_CODE
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

    const siteTitle = computed(() => info.value.title || AppConfig.systemInfo.name)
    const siteLogo = computed(() => info.value.logo || AppConfig.systemInfo.logo || '')
    const siteDomain = computed(() => info.value.domain || '')
    const isEnabled = computed(() => String(info.value.status ?? '1') === '1')

    const getStoredEnterpriseCode = () =>
      params.value.enterprise_code ||
      (info.value.enterprise_code ? String(info.value.enterprise_code) : '')

    const applyStoredIdentifier = () => {
      let identifier = getStoredEnterpriseCode()
      if (mode === 'domain') {
        identifier = location.host
      }
      if (identifier && params.value.enterprise_code !== identifier) {
        params.value = createSiteInfoParams(identifier)
      }
      return identifier
    }

    const setSiteInfo = (data: Api.Auth.siteInfoResponse) => {
      info.value = data
      loaded.value = true
      params.value = createSiteInfoParams(
        String(data.enterprise_code || params.value.enterprise_code || '')
      )
    }

    const loadSiteInfo = async (force = false, enterpriseCode = '') => {
      const urlParams = resolveUrlSiteInfoParams(enterpriseCode)
      const hasUrlEnterpriseCode = Boolean(urlParams.enterprise_code)

      if (!hasUrlEnterpriseCode && !force && loaded.value) {
        applyStoredIdentifier()
        return info.value
      }

      const nextParams = hasUrlEnterpriseCode
        ? urlParams
        : createSiteInfoParams(applyStoredIdentifier())
      if (!nextParams.enterprise_code) {
        return info.value
      }

      const isSameParams =
        params.value.enterprise_code === nextParams.enterprise_code &&
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

      loadingPromise = siteInfo(nextParams)
        .then((data) => {
          setSiteInfo(data)
          return data
        })
        .catch((err) => {
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
        if (enterpriseCode) {
          store.params = createSiteInfoParams(enterpriseCode)
        }
      }
    }
  }
)
