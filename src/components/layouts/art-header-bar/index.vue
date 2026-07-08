<template>
  <div
    class="w-full bg-[var(--default-bg-color)]"
    :class="[
      tabStyle === 'tab-card' || tabStyle === 'tab-google' ? 'mb-3 max-sm:mb-3 !bg-box' : ''
    ]"
  >
    <div
      class="relative box-border flex-b h-15 leading-15 select-none"
      :class="[
        tabStyle === 'tab-card' || tabStyle === 'tab-google'
          ? 'border-b border-[var(--art-card-border)]'
          : ''
      ]"
    >
      <div class="flex-c flex-1 min-w-0 leading-15" style="display: flex">
        <div class="flex-c c-p" @click="toHome" v-if="isTopMenu">
          <ArtLogo class="pl-4.5" />
          <p class="system-name my-0 mx-2 ml-2 text-lg">{{ siteTitle }}</p>
        </div>

        <ArtLogo
          class="!hidden pl-3.5 overflow-hidden align-[-0.15em] fill-current"
          @click="toHome"
        />

        <ArtIconButton
          v-if="isLeftMenu && shouldShowMenuButton"
          icon="ri:menu-2-fill"
          class="ml-3 max-sm:ml-[7px]"
          @click="visibleMenu"
        />

        <ArtIconButton
          v-if="shouldShowRefreshButton"
          icon="ri:refresh-line"
          class="!ml-3 refresh-btn max-sm:!hidden"
          :style="{ marginLeft: !isLeftMenu ? '10px' : '0' }"
          @click="reload"
        />

        <ArtBreadcrumb
          v-if="(shouldShowBreadcrumb && isLeftMenu) || (shouldShowBreadcrumb && isDualMenu)"
        />

        <ArtHorizontalMenu v-if="isTopMenu" :list="headerMenuList" />
        <ArtMixedMenu v-if="isTopLeftMenu" :list="headerMenuList" />
      </div>

      <div class="flex-c gap-2.5">
        <ArtIconButton
          v-if="shouldShowFullscreen"
          :icon="isFullscreen ? 'ri:fullscreen-exit-line' : 'ri:fullscreen-fill'"
          :class="[!isFullscreen ? 'full-screen-btn' : 'exit-full-screen-btn', 'ml-3']"
          class="max-md:!hidden"
          @click="toggleFullScreen"
        />

        <ElDropdown
          @command="changeLanguage"
          popper-class="langDropDownStyle"
          v-if="shouldShowLanguage"
        >
          <ArtIconButton icon="ri:translate-2" class="language-btn text-[19px]" />
          <template #dropdown>
            <ElDropdownMenu>
              <div v-for="item in languageOptions" :key="item.value" class="lang-btn-item">
                <ElDropdownItem
                  :command="item.value"
                  :class="{ 'is-selected': locale === item.value }"
                >
                  <span class="menu-txt">{{ item.label }}</span>
                  <ArtSvgIcon icon="ri:check-fill" v-if="locale === item.value" />
                </ElDropdownItem>
              </div>
            </ElDropdownMenu>
          </template>
        </ElDropdown>

        <ArtIconButton
          v-if="shouldShowNotification"
          icon="ri:notification-2-line"
          class="notice-button relative"
          @click="visibleNotice"
        >
          <div class="absolute top-2 right-2 size-1.5 !bg-danger rounded-full"></div>
        </ArtIconButton>

        <div v-if="shouldShowSettings">
          <ElPopover :visible="showSettingGuide" placement="bottom-start" :width="190" :offset="0">
            <template #reference>
              <div class="flex-cc">
                <ArtIconButton icon="ri:settings-line" class="setting-btn" @click="openSetting" />
              </div>
            </template>
            <template #default>
              <p>
                {{ $t('topBar.guide.title') }}
                <span :style="{ color: systemThemeColor }"> {{ $t('topBar.guide.theme') }} </span>
                。
                <span :style="{ color: systemThemeColor }"> {{ $t('topBar.guide.menu') }} </span>
                {{ $t('topBar.guide.description') }}
              </p>
            </template>
          </ElPopover>
        </div>

        <ArtIconButton
          v-if="shouldShowThemeToggle"
          @click="themeAnimation"
          :icon="isDark ? 'ri:sun-fill' : 'ri:moon-line'"
        />

        <ArtUserMenu />
      </div>
    </div>

    <ArtWorkTab />
    <ArtNotification v-model:value="showNotice" ref="notice" />
  </div>
</template>

<script setup lang="ts">
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useFullscreen } from '@vueuse/core'
  import { LanguageEnum, MenuTypeEnum } from '@/enums/appEnum'
  import { useSettingStore } from '@/store/modules/setting'
  import { useUserStore } from '@/store/modules/user'
  import { useMenuStore } from '@/store/modules/menu'
  import { useSiteStore } from '@/store/modules/site'
  import { languageOptions } from '@/locales'
  import { mittBus } from '@/utils/sys'
  import { themeAnimation } from '@/utils/ui/animation'
  import { useCommon } from '@/hooks/useCommon'
  import { useHeaderBar } from '@/hooks/useHeaderBar'
  import ArtUserMenu from './widget/ArtUserMenu.vue'

  defineOptions({ name: 'ArtHeaderBar' })

  const router = useRouter()
  const { locale } = useI18n()

  const settingStore = useSettingStore()
  const userStore = useUserStore()
  const menuStore = useMenuStore()
  const { siteTitle } = storeToRefs(useSiteStore())

  const {
    shouldShowMenuButton,
    shouldShowRefreshButton,
    shouldShowBreadcrumb,
    shouldShowFullscreen,
    shouldShowNotification,
    shouldShowLanguage,
    shouldShowSettings,
    shouldShowThemeToggle
  } = useHeaderBar()

  const { menuOpen, systemThemeColor, showSettingGuide, menuType, isDark, tabStyle } =
    storeToRefs(settingStore)

  const { language } = storeToRefs(userStore)
  const { headerMenuList } = storeToRefs(menuStore)

  const showNotice = ref(false)
  const notice = ref(null)

  const isLeftMenu = computed(() => menuType.value === MenuTypeEnum.LEFT)
  const isDualMenu = computed(() => menuType.value === MenuTypeEnum.DUAL_MENU)
  const isTopMenu = computed(() => menuType.value === MenuTypeEnum.TOP)
  const isTopLeftMenu = computed(() => menuType.value === MenuTypeEnum.TOP_LEFT)

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen()

  onMounted(() => {
    initLanguage()
    document.addEventListener('click', bodyCloseNotice)
  })

  onUnmounted(() => {
    document.removeEventListener('click', bodyCloseNotice)
  })

  const toggleFullScreen = (): void => {
    toggleFullscreen()
  }

  const visibleMenu = (): void => {
    settingStore.setMenuOpen(!menuOpen.value)
  }

  const { homePath, refresh } = useCommon()

  const toHome = (): void => {
    router.push(homePath.value)
  }

  const reload = (time: number = 0): void => {
    setTimeout(() => {
      refresh()
    }, time)
  }

  const initLanguage = (): void => {
    locale.value = language.value
  }

  const changeLanguage = (lang: LanguageEnum): void => {
    if (locale.value === lang) return
    locale.value = lang
    userStore.setLanguage(lang)
    reload(50)
  }

  const openSetting = (): void => {
    mittBus.emit('openSetting')

    if (showSettingGuide.value) {
      settingStore.hideSettingGuide()
    }
  }

  const bodyCloseNotice = (e: any): void => {
    if (!showNotice.value) return

    const target = e.target as HTMLElement
    const isNoticeButton = target.closest('.notice-button')
    const isNoticePanel = target.closest('.art-notification-panel')

    if (!isNoticeButton && !isNoticePanel) {
      showNotice.value = false
    }
  }

  const visibleNotice = (): void => {
    showNotice.value = !showNotice.value
  }
</script>

<style lang="scss" scoped>
  @keyframes rotate180 {
    0% {
      transform: rotate(0);
    }

    100% {
      transform: rotate(180deg);
    }
  }

  @keyframes shake {
    0% {
      transform: rotate(0);
    }

    25% {
      transform: rotate(-5deg);
    }

    50% {
      transform: rotate(5deg);
    }

    75% {
      transform: rotate(-5deg);
    }

    100% {
      transform: rotate(0);
    }
  }

  @keyframes expand {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.1);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes shrink {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(0.9);
    }

    100% {
      transform: scale(1);
    }
  }

  @keyframes moveUp {
    0% {
      transform: translateY(0);
    }

    50% {
      transform: translateY(-3px);
    }

    100% {
      transform: translateY(0);
    }
  }

  .refresh-btn:hover :deep(.art-svg-icon) {
    animation: rotate180 0.5s;
  }

  .language-btn:hover :deep(.art-svg-icon) {
    animation: moveUp 0.4s;
  }

  .setting-btn:hover :deep(.art-svg-icon) {
    animation: rotate180 0.5s;
  }

  .full-screen-btn:hover :deep(.art-svg-icon) {
    animation: expand 0.6s forwards;
  }

  .exit-full-screen-btn:hover :deep(.art-svg-icon) {
    animation: shrink 0.6s forwards;
  }

  .notice-button:hover :deep(.art-svg-icon) {
    animation: shake 0.5s ease-in-out;
  }

  .system-name {
    display: none;
  }

  @media screen and (width >= 1400px) {
    .system-name {
      display: block;
    }
  }

  @media screen and (width <= 768px) {
    .logo2 {
      display: block !important;
    }
  }

  @media screen and (width <= 640px) {
    .btn-box {
      width: 40px;
    }
  }
</style>
