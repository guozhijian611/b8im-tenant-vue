<template>
  <el-dialog
    v-model="visible"
    title="重置 IM 用户密码"
    width="520px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-alert
      class="mb-4"
      type="warning"
      :closable="false"
      show-icon
      :title="`重置后将撤销「${data?.nickname || data?.account || ''}」的现有登录会话。`"
    />
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <el-form-item label="新密码" prop="password">
        <el-input
          v-model="formData.password"
          type="password"
          show-password
          placeholder="8-72 个字符"
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="password_confirm">
        <el-input
          v-model="formData.password_confirm"
          type="password"
          show-password
          placeholder="请再次输入密码"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认重置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import api from '@/api/im/user'

  interface Props {
    modelValue: boolean
    data?: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    data: undefined
  })
  const emit = defineEmits<Emits>()
  const formRef = ref<FormInstance>()
  const submitting = ref(false)

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const initialFormData = { password: '', password_confirm: '' }
  const formData = reactive({ ...initialFormData })

  const validatePasswordConfirm = (
    _rule: unknown,
    value: string,
    callback: (error?: Error) => void
  ) => {
    if (value !== formData.password) {
      callback(new Error('两次输入的密码不一致'))
      return
    }
    callback()
  }

  const rules: FormRules = {
    password: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 8, max: 72, message: '密码长度必须为 8 至 72 个字符', trigger: 'blur' }
    ],
    password_confirm: [
      { required: true, message: '请输入确认密码', trigger: 'blur' },
      { validator: validatePasswordConfirm, trigger: 'blur' }
    ]
  }

  watch(
    () => props.modelValue,
    (opened) => {
      if (!opened) return
      Object.assign(formData, initialFormData)
      formRef.value?.clearValidate()
    }
  )

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  const handleSubmit = async () => {
    if (!formRef.value || !props.data?.id) return
    await formRef.value.validate()

    submitting.value = true
    try {
      const result = await api.reset({
        id: Number(props.data.id),
        password: formData.password,
        password_confirm: formData.password_confirm
      })
      ElMessage.success(
        result.revoked_session_count > 0
          ? `密码重置成功，已撤销 ${result.revoked_session_count} 个登录会话`
          : '密码重置成功'
      )
      emit('success')
      handleClose()
    } finally {
      submitting.value = false
    }
  }
</script>
