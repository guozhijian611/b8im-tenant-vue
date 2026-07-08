import { usePreferredDark } from '@vueuse/core'
import { watch } from 'vue'
import AppConfig from '@/config'
import { SystemThemeEnum } from '@/enums/appEnum'
import { useSettingStore } from '@/store/modules/setting'
import type { SystemThemeTypes } from '@/types/store'
import { setElementThemeColor } from '@/utils/ui'

export function useTheme() {
  const settingStore = useSettingStore()
  const prefersDark = usePreferredDark()

  const disableTransitions = () => {
    const style = document.createElement('style')
    style.setAttribute('id', 'disable-transitions')
    style.textContent = '* { transition: none !important; }'
    document.head.appendChild(style)
  }

  const enableTransitions = () => {
    document.getElementById('disable-transitions')?.remove()
  }

  const setSystemTheme = (theme: SystemThemeEnum, themeMode: SystemThemeEnum = theme) => {
    disableTransitions()

    const currentTheme = AppConfig.systemThemeStyles[theme as keyof SystemThemeTypes]
    if (currentTheme) {
      document.documentElement.setAttribute('class', currentTheme.className)
    }

    settingStore.setGlopTheme(theme, themeMode)
    setElementThemeColor(settingStore.systemThemeColor)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        enableTransitions()
      })
    })
  }

  const setSystemAutoTheme = () => {
    const theme = prefersDark.value ? SystemThemeEnum.DARK : SystemThemeEnum.LIGHT
    setSystemTheme(theme, SystemThemeEnum.AUTO)
  }

  const switchThemeStyles = (theme: SystemThemeEnum) => {
    if (theme === SystemThemeEnum.AUTO) {
      setSystemAutoTheme()
      return
    }

    setSystemTheme(theme)
  }

  return {
    setSystemTheme,
    setSystemAutoTheme,
    switchThemeStyles,
    prefersDark
  }
}

export function initializeTheme() {
  const settingStore = useSettingStore()
  const prefersDark = usePreferredDark()

  const applyThemeByMode = () => {
    let actualTheme = settingStore.systemThemeType

    if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
      actualTheme = prefersDark.value ? SystemThemeEnum.DARK : SystemThemeEnum.LIGHT
      settingStore.systemThemeType = actualTheme
    }

    const currentTheme = AppConfig.systemThemeStyles[actualTheme as keyof SystemThemeTypes]
    if (currentTheme) {
      document.documentElement.setAttribute('class', currentTheme.className)
    }

    setElementThemeColor(settingStore.systemThemeColor)
    document.documentElement.style.setProperty('--custom-radius', `${settingStore.customRadius}rem`)
  }

  applyThemeByMode()

  if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
    watch(
      prefersDark,
      () => {
        if (settingStore.systemThemeMode === SystemThemeEnum.AUTO) {
          applyThemeByMode()
        }
      },
      { immediate: false }
    )
  }
}
