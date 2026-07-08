<template>
  <div class="menu-layout-settings">
    <SectionTitle :title="$t('setting.menuType.title')" />
    <div class="setting-box-wrap">
      <div
        class="setting-item"
        v-for="(item, index) in configOptions.menuLayoutList"
        :key="item.value"
        @click="switchMenuLayouts(item.value)"
      >
        <div class="box" :class="{ 'is-active': item.value === menuType, 'mt-16': index > 2 }">
          <img :src="item.img" />
        </div>
        <p class="name">{{ $t(`setting.menuType.list[${index}]`) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import SectionTitle from './SectionTitle.vue'
  import { useSettingStore } from '@/store/modules/setting'
  import { useSettingsConfig } from '../composables/useSettingsConfig'
  import { useSettingsState } from '../composables/useSettingsState'

  const settingStore = useSettingStore()
  const { menuType } = storeToRefs(settingStore)
  const { configOptions } = useSettingsConfig()
  const { switchMenuLayouts } = useSettingsState()
</script>

<style lang="scss" scoped>
  @media (width <= 1000px) {
    .menu-layout-settings {
      display: none;
    }
  }
</style>
