<template>
  <SaSearchBar
    ref="searchBarRef"
    v-model="formData"
    label-width="90px"
    :show-expand="false"
    @reset="handleReset"
    @search="handleSearch"
  >
    <ElCol v-bind="setSpan(7)">
      <ElFormItem label="公告标题" prop="title">
        <ElInput v-model="formData.title" clearable placeholder="请输入公告标题" />
      </ElFormItem>
    </ElCol>
    <ElCol v-bind="setSpan(6)">
      <ElFormItem label="展示方式" prop="display_mode">
        <ElSelect v-model="formData.display_mode" clearable placeholder="全部">
          <ElOption label="列表" value="list" />
          <ElOption label="弹窗" value="popup" />
          <ElOption label="列表和弹窗" value="both" />
        </ElSelect>
      </ElFormItem>
    </ElCol>
    <ElCol v-bind="setSpan(6)">
      <ElFormItem label="状态" prop="status">
        <ElSelect v-model="formData.status" clearable placeholder="全部">
          <ElOption label="草稿" :value="1" />
          <ElOption label="已发布" :value="2" />
          <ElOption label="已下线" :value="3" />
        </ElSelect>
      </ElFormItem>
    </ElCol>
  </SaSearchBar>
</template>

<script setup lang="ts">
  interface Props {
    modelValue: Record<string, any>
  }
  const props = defineProps<Props>()
  const emit = defineEmits<{
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }>()
  const searchBarRef = ref()
  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const handleReset = () => {
    searchBarRef.value?.ref.resetFields()
    emit('reset')
  }
  const handleSearch = () => emit('search', formData.value)
  const setSpan = (span: number) => ({ span, xs: 24, sm: 12, md: 8, lg: span, xl: span })
</script>
