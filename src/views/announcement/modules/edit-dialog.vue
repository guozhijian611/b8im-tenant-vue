<template>
  <ElDialog
    v-model="visible"
    :title="dialogTitle"
    width="840px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading">
      <ElAlert
        v-if="loadError"
        class="mb-4"
        type="error"
        :closable="false"
        show-icon
        :title="loadError"
      />
      <ElForm
        v-else
        ref="formRef"
        :model="formData"
        :rules="rules"
        :disabled="readonly"
        label-width="110px"
      >
        <ElRow :gutter="20">
          <ElCol :span="24">
            <ElFormItem label="公告标题" prop="title">
              <ElInput v-model="formData.title" maxlength="200" show-word-limit />
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="摘要" prop="summary">
              <ElInput
                v-model="formData.summary"
                type="textarea"
                :rows="3"
                maxlength="500"
                show-word-limit
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="24">
            <ElFormItem label="正文" prop="content">
              <ElInput v-model="formData.content" type="textarea" :rows="10" />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="展示方式" prop="display_mode">
              <ElSelect v-model="formData.display_mode" style="width: 100%">
                <ElOption label="列表" value="list" />
                <ElOption label="弹窗" value="popup" />
                <ElOption label="列表和弹窗" value="both" />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="优先级" prop="priority">
              <ElInputNumber
                v-model="formData.priority"
                :min="0"
                :max="1000000"
                controls-position="right"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="8">
            <ElFormItem label="状态" prop="status">
              <ElSelect v-model="formData.status" style="width: 100%">
                <ElOption
                  v-for="option in statusOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="生效时间" prop="start_time">
              <ElDatePicker
                v-model="formData.start_time"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="立即生效"
                style="width: 100%"
              />
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="结束时间" prop="end_time">
              <ElDatePicker
                v-model="formData.end_time"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
                placeholder="长期有效"
                style="width: 100%"
              />
            </ElFormItem>
          </ElCol>
          <ElCol v-if="dialogType !== 'add'" :span="12">
            <ElFormItem label="发布时间">
              <ElInput :model-value="publishedAt || '尚未发布'" disabled />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
    </div>
    <template #footer>
      <ElButton @click="handleClose">{{ readonly ? '关闭' : '取消' }}</ElButton>
      <ElButton
        v-if="!readonly"
        type="primary"
        :loading="submitting"
        :disabled="Boolean(loadError)"
        @click="handleSubmit"
      >
        提交
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import api from '@/api/announcement'

  interface Props {
    modelValue: boolean
    dialogType: string
    data?: Record<string, any>
  }
  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    dialogType: 'add',
    data: undefined
  })
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }>()
  const formRef = ref<FormInstance>()
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const readonly = computed(() => props.dialogType === 'view')
  const dialogTitle = computed(() => {
    if (props.dialogType === 'add') return '新增租户公告'
    if (props.dialogType === 'view') return '租户公告详情'
    return '编辑租户公告'
  })
  const loading = ref(false)
  const submitting = ref(false)
  const loadError = ref('')
  const publishedAt = ref('')
  type AnnouncementStatus = 1 | 2 | 3
  const sourceStatus = ref<AnnouncementStatus>(1)
  const statusLabels: Record<AnnouncementStatus, string> = {
    1: '草稿',
    2: '已发布',
    3: '已下线'
  }
  const allowedStatusTransitions: Record<AnnouncementStatus, AnnouncementStatus[]> = {
    1: [1, 2],
    2: [2, 3],
    3: [3, 2]
  }
  const normalizeStatus = (value: unknown): AnnouncementStatus => {
    const status = Number(value)
    if (status !== 1 && status !== 2 && status !== 3) throw new Error('公告状态无效')
    return status
  }
  const statusOptions = computed(() => {
    const statuses =
      props.dialogType === 'add'
        ? allowedStatusTransitions[1]
        : allowedStatusTransitions[sourceStatus.value]
    return statuses.map((value) => ({ value, label: statusLabels[value] }))
  })
  const initialFormData = {
    id: null as number | null,
    title: '',
    summary: '',
    content: '',
    display_mode: 'list',
    priority: 0,
    status: 1,
    start_time: null as string | null,
    end_time: null as string | null
  }
  const formData = reactive({ ...initialFormData })
  const validateEndTime = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    if (value && formData.start_time && value <= formData.start_time) {
      callback(new Error('结束时间必须晚于生效时间'))
      return
    }
    callback()
  }
  const rules = reactive<FormRules>({
    title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入公告正文', trigger: 'blur' }],
    display_mode: [{ required: true, message: '请选择展示方式', trigger: 'change' }],
    status: [{ required: true, message: '请选择状态', trigger: 'change' }],
    end_time: [{ validator: validateEndTime, trigger: 'change' }]
  })

  watch(
    () => props.modelValue,
    (open) => {
      if (open) void initPage()
    }
  )

  const initPage = async () => {
    Object.assign(formData, initialFormData)
    sourceStatus.value = 1
    publishedAt.value = ''
    loadError.value = ''
    if (props.dialogType === 'add') return
    if (!props.data?.id) {
      loadError.value = '公告编号不能为空'
      return
    }
    loading.value = true
    try {
      const detail = await api.read(props.data.id)
      const detailStatus = normalizeStatus(detail.status)
      Object.keys(initialFormData).forEach((key) => {
        if (detail[key] !== undefined && detail[key] !== null) {
          ;(formData as Record<string, any>)[key] = detail[key]
        }
      })
      formData.status = detailStatus
      sourceStatus.value = detailStatus
      publishedAt.value = String(detail.published_at || '')
    } catch (value) {
      loadError.value = value instanceof Error ? value.message : '公告详情加载失败'
    } finally {
      loading.value = false
    }
  }

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate()
    if (!statusOptions.value.some((option) => option.value === Number(formData.status))) {
      ElMessage.error('公告状态变更不符合发布流程，请重新打开后再操作')
      return
    }
    const payload: Record<string, any> = {
      title: formData.title.trim(),
      summary: formData.summary.trim(),
      content: formData.content,
      display_mode: formData.display_mode,
      priority: Number(formData.priority),
      status: Number(formData.status),
      start_time: formData.start_time || null,
      end_time: formData.end_time || null
    }
    if (props.dialogType !== 'add') payload.id = formData.id
    submitting.value = true
    try {
      if (props.dialogType === 'add') await api.save(payload)
      else await api.update(payload)
      ElMessage.success(props.dialogType === 'add' ? '新增成功' : '修改成功')
      emit('success')
      handleClose()
    } finally {
      submitting.value = false
    }
  }

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }
</script>
