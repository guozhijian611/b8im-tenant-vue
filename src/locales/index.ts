/**
 * 国际化配置
 *
 * 基于 vue-i18n 实现的多语言国际化方案。
 * 支持中文和英文切换，并从当前用户持久化存储中恢复语言偏好。
 */

import { createI18n } from 'vue-i18n'
import type { I18n, I18nOptions } from 'vue-i18n'
import { LanguageEnum } from '@/enums/appEnum'

import enMessages from './langs/en.json'
import zhMessages from './langs/zh.json'

const messages = {
  [LanguageEnum.EN]: enMessages,
  [LanguageEnum.ZH]: zhMessages
}

export const languageOptions = [
  { value: LanguageEnum.ZH, label: '简体中文' },
  { value: LanguageEnum.EN, label: 'English' }
]

const getDefaultLanguage = (): LanguageEnum => {
  try {
    const userStore = localStorage.getItem('user')

    if (userStore) {
      const { language } = JSON.parse(userStore)
      if (language && Object.values(LanguageEnum).includes(language)) {
        return language
      }
    }
  } catch (error) {
    console.warn('[i18n] Failed to read persisted language setting:', error)
  }

  return LanguageEnum.ZH
}

const i18nOptions: I18nOptions = {
  locale: getDefaultLanguage(),
  legacy: false,
  globalInjection: true,
  fallbackLocale: LanguageEnum.ZH,
  messages
}

const i18n: I18n = createI18n(i18nOptions)

interface Translation {
  (key: string): string
}

export const $t = i18n.global.t as Translation

export default i18n
