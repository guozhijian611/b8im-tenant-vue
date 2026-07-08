import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { MenuThemeType } from '@/types/store'
import AppConfig from '@/config'
import { SystemThemeEnum, MenuThemeEnum, MenuTypeEnum, ContainerWidthEnum } from '@/enums/appEnum'
import { setElementThemeColor } from '@/utils/ui'
import { StorageConfig } from '@/utils/storage/storage-config'
import { SETTING_DEFAULT_CONFIG } from '@/config/setting'

export const useSettingStore = defineStore(
  'settingStore',
  () => {
    const menuType = ref(SETTING_DEFAULT_CONFIG.menuType)
    const menuOpenWidth = ref(SETTING_DEFAULT_CONFIG.menuOpenWidth)
    const menuOpen = ref(SETTING_DEFAULT_CONFIG.menuOpen)
    const dualMenuShowText = ref(SETTING_DEFAULT_CONFIG.dualMenuShowText)

    const systemThemeType = ref(SETTING_DEFAULT_CONFIG.systemThemeType)
    const systemThemeMode = ref(SETTING_DEFAULT_CONFIG.systemThemeMode)
    const menuThemeType = ref(SETTING_DEFAULT_CONFIG.menuThemeType)
    const systemThemeColor = ref(SETTING_DEFAULT_CONFIG.systemThemeColor)

    const showMenuButton = ref(SETTING_DEFAULT_CONFIG.showMenuButton)
    const showRefreshButton = ref(SETTING_DEFAULT_CONFIG.showRefreshButton)
    const showCrumbs = ref(SETTING_DEFAULT_CONFIG.showCrumbs)
    const showWorkTab = ref(SETTING_DEFAULT_CONFIG.showWorkTab)
    const showLanguage = ref(SETTING_DEFAULT_CONFIG.showLanguage)
    const showNprogress = ref(SETTING_DEFAULT_CONFIG.showNprogress)
    const showSettingGuide = ref(SETTING_DEFAULT_CONFIG.showSettingGuide)
    const watermarkVisible = ref(SETTING_DEFAULT_CONFIG.watermarkVisible)

    const autoClose = ref(SETTING_DEFAULT_CONFIG.autoClose)
    const uniqueOpened = ref(SETTING_DEFAULT_CONFIG.uniqueOpened)
    const colorWeak = ref(SETTING_DEFAULT_CONFIG.colorWeak)
    const refresh = ref(SETTING_DEFAULT_CONFIG.refresh)

    const boxBorderMode = ref(SETTING_DEFAULT_CONFIG.boxBorderMode)
    const pageTransition = ref(SETTING_DEFAULT_CONFIG.pageTransition)
    const tabStyle = ref(SETTING_DEFAULT_CONFIG.tabStyle)
    const customRadius = ref(SETTING_DEFAULT_CONFIG.customRadius)
    const containerWidth = ref(SETTING_DEFAULT_CONFIG.containerWidth)

    const getMenuTheme = computed((): MenuThemeType => {
      const list = AppConfig.themeList.filter((item) => item.theme === menuThemeType.value)
      if (isDark.value) {
        return AppConfig.darkMenuStyles[0]
      }
      return list[0]
    })

    const isDark = computed((): boolean => {
      return systemThemeType.value === SystemThemeEnum.DARK
    })

    const getMenuOpenWidth = computed((): string => {
      return menuOpenWidth.value + 'px' || SETTING_DEFAULT_CONFIG.menuOpenWidth + 'px'
    })

    const getCustomRadius = computed((): string => {
      return customRadius.value + 'rem' || SETTING_DEFAULT_CONFIG.customRadius + 'rem'
    })

    const switchMenuLayouts = (type: MenuTypeEnum) => {
      menuType.value = type
    }

    const setMenuOpenWidth = (width: number) => {
      menuOpenWidth.value = width
    }

    const setGlopTheme = (theme: SystemThemeEnum, themeMode: SystemThemeEnum) => {
      systemThemeType.value = theme
      systemThemeMode.value = themeMode
    }

    const switchMenuStyles = (theme: MenuThemeEnum) => {
      menuThemeType.value = theme
    }

    const setElementTheme = (theme: string) => {
      systemThemeColor.value = theme
      setElementThemeColor(theme)
    }

    const setBorderMode = () => {
      boxBorderMode.value = !boxBorderMode.value
    }

    const setContainerWidth = (width: ContainerWidthEnum) => {
      containerWidth.value = width
    }

    const setUniqueOpened = () => {
      uniqueOpened.value = !uniqueOpened.value
    }

    const setButton = () => {
      showMenuButton.value = !showMenuButton.value
    }

    const setAutoClose = () => {
      autoClose.value = !autoClose.value
    }

    const setShowRefreshButton = () => {
      showRefreshButton.value = !showRefreshButton.value
    }

    const setCrumbs = () => {
      showCrumbs.value = !showCrumbs.value
    }

    const setWorkTab = (show: boolean) => {
      showWorkTab.value = show
    }

    const setLanguage = () => {
      showLanguage.value = !showLanguage.value
    }

    const setNprogress = () => {
      showNprogress.value = !showNprogress.value
    }

    const setColorWeak = () => {
      colorWeak.value = !colorWeak.value
    }

    const hideSettingGuide = () => {
      showSettingGuide.value = false
    }

    const openSettingGuide = () => {
      showSettingGuide.value = true
    }

    const setPageTransition = (transition: string) => {
      pageTransition.value = transition
    }

    const setTabStyle = (style: string) => {
      tabStyle.value = style
    }

    const setMenuOpen = (open: boolean) => {
      menuOpen.value = open
    }

    const reload = () => {
      refresh.value = !refresh.value
    }

    const setWatermarkVisible = (visible: boolean) => {
      watermarkVisible.value = visible
    }

    const setCustomRadius = (radius: string) => {
      customRadius.value = radius
      document.documentElement.style.setProperty('--custom-radius', `${radius}rem`)
    }

    const setDualMenuShowText = (show: boolean) => {
      dualMenuShowText.value = show
    }

    return {
      menuType,
      menuOpenWidth,
      systemThemeType,
      systemThemeMode,
      menuThemeType,
      systemThemeColor,
      boxBorderMode,
      uniqueOpened,
      showMenuButton,
      showRefreshButton,
      showCrumbs,
      autoClose,
      showWorkTab,
      showLanguage,
      showNprogress,
      colorWeak,
      showSettingGuide,
      pageTransition,
      tabStyle,
      menuOpen,
      refresh,
      watermarkVisible,
      customRadius,
      dualMenuShowText,
      containerWidth,
      getMenuTheme,
      isDark,
      getMenuOpenWidth,
      getCustomRadius,
      switchMenuLayouts,
      setMenuOpenWidth,
      setGlopTheme,
      switchMenuStyles,
      setElementTheme,
      setBorderMode,
      setContainerWidth,
      setUniqueOpened,
      setButton,
      setAutoClose,
      setShowRefreshButton,
      setCrumbs,
      setWorkTab,
      setLanguage,
      setNprogress,
      setColorWeak,
      hideSettingGuide,
      openSettingGuide,
      setPageTransition,
      setTabStyle,
      setMenuOpen,
      reload,
      setWatermarkVisible,
      setCustomRadius,
      setDualMenuShowText
    }
  },
  {
    persist: {
      key: StorageConfig.SETTING_STORE_KEY,
      storage: localStorage,
      omit: ['refresh']
    }
  }
)
