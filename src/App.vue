<template>
  <ElConfigProvider
    size="default"
    :locale="locales[language]"
    :z-index="3000"
    :card="{
      shadow: 'never'
    }"
  >
    <RouterView></RouterView>
  </ElConfigProvider>
</template>

<script setup lang="ts">
  import { useUserStore } from './store/modules/user'
  import { useSiteStore } from './store/modules/site'
  import zh from 'element-plus/es/locale/lang/zh-cn'
  import en from 'element-plus/es/locale/lang/en'
  import { toggleTransition } from './utils/ui/animation'
  import { initializeTheme } from './hooks/useTheme'
  import { router } from './router'
  import { setPageTitle } from './utils/router'

  const userStore = useUserStore()
  const siteStore = useSiteStore()
  const route = useRoute()
  const { language } = storeToRefs(userStore)
  let isRouteReady = false

  const locales = {
    zh: zh,
    en: en
  }

  const getRouteAppId = () => {
    const appId = route.query.app_id
    return Array.isArray(appId) ? appId[0] || '' : String(appId || '')
  }

  const loadCurrentSiteInfo = () => {
    const appId = getRouteAppId()
    siteStore
      .loadSiteInfo(Boolean(appId), appId)
      .then(() => {
        setPageTitle(router.currentRoute.value)
      })
      .catch((error) => {
        console.error('[App] Failed to load site info:', error)
      })
  }

  onBeforeMount(() => {
    toggleTransition(true)
    initializeTheme()
    router.isReady().then(() => {
      isRouteReady = true
      loadCurrentSiteInfo()
    })
  })

  watch(
    () => route.query.app_id,
    () => {
      if (!isRouteReady) {
        return
      }
      loadCurrentSiteInfo()
    }
  )

  onMounted(() => {
    toggleTransition(false)
  })
</script>
