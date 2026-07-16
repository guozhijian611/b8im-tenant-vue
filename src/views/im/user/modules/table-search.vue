<template>
  <sa-search-bar
    ref="searchBarRef"
    v-model="formData"
    label-width="80px"
    :showExpand="false"
    @reset="handleReset"
    @search="handleSearch"
    @expand="handleExpand"
  >
    <el-col v-bind="setSpan(8)">
      <el-form-item label="关键词" prop="keyword">
        <el-input
          v-model="formData.keyword"
          placeholder="账号、昵称、用户 ID、短号、手机或邮箱"
          clearable
        />
      </el-form-item>
    </el-col>
    <el-col v-bind="setSpan(6)">
      <el-form-item label="状态" prop="status">
        <el-select v-model="formData.status" placeholder="全部状态" clearable>
          <el-option label="正常" :value="1" />
          <el-option label="停用" :value="2" />
          <el-option label="封禁" :value="3" />
        </el-select>
      </el-form-item>
    </el-col>
  </sa-search-bar>
</template>

<script setup lang="ts">
  interface Props {
    modelValue: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: Record<string, any>): void
    (e: 'search', params: Record<string, any>): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
  const searchBarRef = ref()
  const isExpanded = ref(false)

  const formData = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const handleReset = () => {
    searchBarRef.value?.ref.resetFields()
    emit('reset')
  }

  const handleSearch = () => {
    emit('search', formData.value)
  }

  const handleExpand = (expanded: boolean) => {
    isExpanded.value = expanded
  }

  const setSpan = (span: number) => ({
    span,
    xs: 24,
    sm: 12,
    md: span >= 8 ? span : 8,
    lg: span,
    xl: span
  })
</script>
