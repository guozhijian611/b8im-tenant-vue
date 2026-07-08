import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { LanguageEnum } from '@/enums/appEnum'
import { router } from '@/router'
import { useSettingStore } from './setting'
import { useWorktabStore } from './worktab'
import { setPageTitle } from '@/utils/router'
import { resetRouterState } from '@/router/guards/beforeEach'
import { useMenuStore } from './menu'
import { StorageConfig } from '@/utils/storage/storage-config'
import { fetchClearCache } from '@/api/auth'

export const useUserStore = defineStore(
  'userStore',
  () => {
    const language = ref(LanguageEnum.ZH)
    const isLogin = ref(false)
    const info = ref<Partial<Api.Auth.UserInfo>>({})
    const accessToken = ref('')
    const refreshToken = ref('')

    const getUserInfo = computed(() => info.value)
    const getSettingState = computed(() => useSettingStore().$state)
    const getWorktabState = computed(() => useWorktabStore().$state)

    const setUserInfo = (newInfo: Api.Auth.UserInfo) => {
      info.value = newInfo
    }

    const setAvatar = (newAvatar: string) => {
      info.value.avatar = newAvatar
    }

    const setLoginStatus = (status: boolean) => {
      isLogin.value = status
    }

    const setLanguage = (lang: LanguageEnum) => {
      setPageTitle(router.currentRoute.value)
      language.value = lang
    }

    const setToken = (newAccessToken: string, newRefreshToken?: string) => {
      accessToken.value = newAccessToken
      if (newRefreshToken) {
        refreshToken.value = newRefreshToken
      }
    }

    /**
     * 清理缓存
     */
    const clearCache = () => {
      fetchClearCache()
    }

    const logOut = () => {
      const currentUserId = info.value.id
      if (currentUserId) {
        localStorage.setItem(StorageConfig.LAST_USER_ID_KEY, String(currentUserId))
      }

      info.value = {}
      isLogin.value = false
      accessToken.value = ''
      refreshToken.value = ''
      sessionStorage.removeItem('iframeRoutes')
      useMenuStore().setHomePath('')
      resetRouterState(500)

      const currentRoute = router.currentRoute.value
      const redirect = currentRoute.path !== '/login' ? currentRoute.fullPath : undefined

      router.push({
        name: 'Login',
        query: redirect ? { redirect } : undefined
      })
    }

    const checkAndClearWorktabs = () => {
      const lastUserId = localStorage.getItem(StorageConfig.LAST_USER_ID_KEY)
      const currentUserId = info.value.id

      if (!currentUserId) return
      if (!lastUserId) return

      if (String(currentUserId) !== lastUserId) {
        const worktabStore = useWorktabStore()
        worktabStore.opened = []
        worktabStore.keepAliveExclude = []
      }

      localStorage.removeItem(StorageConfig.LAST_USER_ID_KEY)
    }

    return {
      language,
      isLogin,
      info,
      accessToken,
      refreshToken,
      getUserInfo,
      getSettingState,
      getWorktabState,
      setUserInfo,
      setAvatar,
      setLoginStatus,
      setLanguage,
      setToken,
      clearCache,
      logOut,
      checkAndClearWorktabs
    }
  },
  {
    persist: {
      key: StorageConfig.USER_STORE_KEY,
      storage: localStorage,
      pick: ['language', 'accessToken'],
      afterHydrate: ({ store }) => {
        store.isLogin = Boolean(store.accessToken)
      }
    }
  }
)
