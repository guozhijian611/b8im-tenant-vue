import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import AppConfig from '@/config'
import { siteInfo } from '@/api/auth'
import { StorageConfig } from '@/utils/storage/storage-config'

type SiteInfo = Partial<Api.Auth.siteInfoResponse>
type SiteInfoParams = {
  appid: string
  mode: string
}

const APP_ID_QUERY_KEY = 'app_id'

const mode = import.meta.env.VITE_APP_MODE || 'appid'

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

const createSiteInfoParams = (appid = ''): SiteInfoParams => {
  return {
    appid,
    mode: import.meta.env.VITE_APP_MODE || ''
  }
}

const resolveUrlSiteInfoParams = (appid = ''): SiteInfoParams =>
  createSiteInfoParams(appid || getUrlQueryValue(APP_ID_QUERY_KEY))

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

    const getStoredAppId = () => params.value.appid || (info.value.id ? String(info.value.id) : '')

    const applyStoredAppIdHeader = () => {
      let appid = getStoredAppId()
      if (mode === 'domain') {
        appid = location.host
      }
      if (appid && params.value.appid !== appid) {
        params.value = createSiteInfoParams(appid)
      }
      return appid
    }

    const setSiteInfo = (data: Api.Auth.siteInfoResponse) => {
      info.value = data
      loaded.value = true
      params.value = createSiteInfoParams(String(data.id || params.value.appid || ''))
    }

    const loadSiteInfo = async (force = false, appid = '') => {
      const urlParams = resolveUrlSiteInfoParams(appid)
      const hasUrlAppId = Boolean(urlParams.appid)

      if (!hasUrlAppId && !force && loaded.value) {
        applyStoredAppIdHeader()
        return info.value
      }

      const nextParams = hasUrlAppId ? urlParams : createSiteInfoParams(applyStoredAppIdHeader())
      if (!nextParams.appid) {
        return info.value
      }

      const isSameParams =
        params.value.appid === nextParams.appid && params.value.mode === nextParams.mode

      if (!force && !hasUrlAppId && loaded.value && isSameParams) {
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
        const appid = store.params?.appid || (store.info?.id ? String(store.info.id) : '')
        if (appid) {
          store.params = createSiteInfoParams(appid)
        }
      }
    }
  }
)
