<template>
  <el-dialog
    v-model="visible"
    :title="dialogType === 'add' ? '新增 IM 用户' : '编辑 IM 用户'"
    width="760px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" v-loading="loading" :model="formData" :rules="rules" label-width="100px">
      <el-form-item label="头像文件 ID" prop="avatar">
        <el-input
          v-model="formData.avatar"
          maxlength="255"
          placeholder="可选，填写私有附件 file_id"
        />
      </el-form-item>

      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <el-form-item label="登录账号" prop="account">
            <el-input v-model="formData.account" placeholder="2-64 位字母、数字、下划线或连字符" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="用户昵称" prop="nickname">
            <el-input v-model="formData.nickname" placeholder="请输入用户昵称" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <el-form-item label="IM 短号" prop="im_short_no">
            <el-input v-model="formData.im_short_no" placeholder="可选，仅限字母和数字" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="性别" prop="gender">
            <sa-radio v-model="formData.gender" dict="gender" value-type="number" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row v-if="dialogType === 'add'" :gutter="20">
        <el-col :xs="24" :md="12">
          <el-form-item label="登录密码" prop="password">
            <el-input
              v-model="formData.password"
              type="password"
              show-password
              placeholder="8-72 个字符"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="确认密码" prop="password_confirm">
            <el-input
              v-model="formData.password_confirm"
              type="password"
              show-password
              placeholder="请再次输入密码"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :xs="24" :md="12">
          <el-form-item label="手机号" prop="mobile">
            <el-input v-model="formData.mobile" placeholder="请输入手机号" />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :md="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="formData.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item v-if="dialogType === 'add'" label="初始状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="2">停用</el-radio>
          <el-radio :value="3">封禁</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="个性签名" prop="signature">
        <el-input
          v-model="formData.signature"
          type="textarea"
          :rows="2"
          placeholder="请输入个性签名"
        />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="loading" @click="handleSubmit">
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import api, {
    type ImUserSaveParams,
    type ImUserStatus,
    type ImUserUpdateParams
  } from '@/api/im/user'

  interface Props {
    modelValue: boolean
    dialogType: string
    data?: Record<string, any>
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    dialogType: 'add',
    data: undefined
  })
  const emit = defineEmits<Emits>()
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const submitting = ref(false)

  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const initialFormData = {
    id: 0,
    account: '',
    password: '',
    password_confirm: '',
    nickname: '',
    im_short_no: '',
    avatar: '',
    mobile: '',
    email: '',
    gender: 0 as 0 | 1 | 2,
    status: 1 as ImUserStatus,
    remark: '',
    signature: ''
  }
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
    account: [
      { required: true, message: '请输入登录账号', trigger: 'blur' },
      { min: 2, max: 64, message: '登录账号长度必须为 2 至 64 个字符', trigger: 'blur' },
      {
        pattern: /^[A-Za-z0-9_-]+$/,
        message: '登录账号只能包含字母、数字、下划线和连字符',
        trigger: 'blur'
      }
    ],
    nickname: [
      { required: true, message: '请输入用户昵称', trigger: 'blur' },
      { min: 1, max: 64, message: '用户昵称最多 64 个字符', trigger: 'blur' }
    ],
    im_short_no: [
      { max: 32, message: 'IM 短号最多 32 个字符', trigger: 'blur' },
      { pattern: /^[A-Za-z0-9]*$/, message: 'IM 短号只能包含字母和数字', trigger: 'blur' }
    ],
    password: [
      { required: true, message: '请输入登录密码', trigger: 'blur' },
      { min: 8, max: 72, message: '密码长度必须为 8 至 72 个字符', trigger: 'blur' }
    ],
    password_confirm: [
      { required: true, message: '请输入确认密码', trigger: 'blur' },
      { min: 8, max: 72, message: '密码长度必须为 8 至 72 个字符', trigger: 'blur' },
      { validator: validatePasswordConfirm, trigger: 'blur' }
    ],
    mobile: [{ max: 32, message: '手机号最多 32 个字符', trigger: 'blur' }],
    email: [
      { type: 'email', message: '请输入正确的邮箱', trigger: 'blur' },
      { max: 120, message: '邮箱最多 120 个字符', trigger: 'blur' }
    ],
    status: [{ required: true, message: '请选择初始状态', trigger: 'change' }]
  }

  watch(
    () => props.modelValue,
    (opened) => {
      if (opened) initPage()
    }
  )

  const initPage = async () => {
    Object.assign(formData, initialFormData)
    formRef.value?.clearValidate()
    if (props.dialogType !== 'edit' || !props.data?.id) return

    loading.value = true
    try {
      const detail = await api.read(Number(props.data.id))
      for (const key in formData) {
        const value = detail[key as keyof typeof detail]
        if (value !== null && value !== undefined) {
          ;(formData as Record<string, unknown>)[key] = value
        }
      }
    } finally {
      loading.value = false
    }
  }

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
  }

  const saveParams = (): ImUserSaveParams => ({
    account: formData.account,
    password: formData.password,
    password_confirm: formData.password_confirm,
    nickname: formData.nickname,
    im_short_no: formData.im_short_no,
    avatar: formData.avatar,
    mobile: formData.mobile,
    email: formData.email,
    gender: formData.gender,
    status: formData.status,
    remark: formData.remark,
    signature: formData.signature
  })

  const updateParams = (): ImUserUpdateParams => ({
    id: formData.id,
    account: formData.account,
    nickname: formData.nickname,
    im_short_no: formData.im_short_no,
    avatar: formData.avatar,
    mobile: formData.mobile,
    email: formData.email,
    gender: formData.gender,
    remark: formData.remark,
    signature: formData.signature
  })

  const handleSubmit = async () => {
    if (!formRef.value) return
    await formRef.value.validate()

    submitting.value = true
    try {
      if (props.dialogType === 'add') {
        await api.save(saveParams())
        ElMessage.success('新增 IM 用户成功')
      } else {
        await api.update(updateParams())
        ElMessage.success('编辑 IM 用户成功')
      }
      emit('success')
      handleClose()
    } finally {
      submitting.value = false
    }
  }
</script>
