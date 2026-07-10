<template>
  <div class="art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">IM 运行策略</div>
            <ElText type="info">
              管理当前机构的客户端登录、在线设备、消息限流以及撤回编辑规则。
            </ElText>
          </div>
          <ElButton
            v-permission="'saimulti:tenant:im:policy:read'"
            :loading="loading"
            :disabled="saving"
            @click="loadPolicy"
          >
            <template #icon><ArtSvgIcon icon="ri:refresh-line" /></template>
            重新加载
          </ElButton>
        </div>
      </template>

      <ElAlert
        v-if="errorMessage"
        class="mb-4"
        type="error"
        :closable="false"
        show-icon
        :title="errorMessage"
      >
        <template v-if="conflicted" #default>
          当前输入已保留。请先重新加载服务端最新版本，再决定是否重新修改。
        </template>
      </ElAlert>

      <ElSkeleton :loading="loading" animated :rows="10">
        <ElEmpty v-if="!policy" description="未加载到当前机构的 IM 策略">
          <ElButton
            v-permission="'saimulti:tenant:im:policy:read'"
            type="primary"
            @click="loadPolicy"
          >
            重试
          </ElButton>
        </ElEmpty>

        <ElForm
          v-else
          ref="formRef"
          class="policy-form"
          :model="formData"
          :rules="rules"
          label-position="top"
        >
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElTag :type="formData.status === 'ENABLED' ? 'success' : 'danger'" effect="light">
              {{ formData.status === 'ENABLED' ? '策略已启用' : '策略已停用' }}
            </ElTag>
            <ElTag effect="plain">机构 {{ policy.organization }}</ElTag>
            <ElTag effect="plain">版本 {{ formData.version }}</ElTag>
            <ElText v-if="policy.update_time" type="info">
              最后更新：{{ policy.update_time }}
            </ElText>
          </div>

          <ElAlert
            class="mb-5"
            type="info"
            :closable="false"
            show-icon
            title="保存使用版本号并发控制；若其他管理员先保存，系统会拒绝本次更新并要求重新加载。"
          />

          <ElDivider content-position="left">客户端与在线设备</ElDivider>
          <ElRow :gutter="24">
            <ElCol :xs="24" :lg="12">
              <ElFormItem label="允许的客户端形态" prop="allowed_client_families">
                <ElCheckboxGroup v-model="formData.allowed_client_families">
                  <ElCheckbox value="web">Web</ElCheckbox>
                  <ElCheckbox value="app">App</ElCheckbox>
                  <ElCheckbox value="desktop">桌面端</ElCheckbox>
                </ElCheckboxGroup>
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :lg="12">
              <ElFormItem label="允许多设备同时在线" prop="allow_multi_device_online">
                <ElSwitch
                  v-model="formData.allow_multi_device_online"
                  inline-prompt
                  active-text="允许"
                  inactive-text="禁止"
                  @change="handleMultiDeviceChange"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="8">
              <ElFormItem label="最大在线设备数" prop="max_online_devices">
                <ElInputNumber
                  v-model="formData.max_online_devices"
                  :min="1"
                  :max="100"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="8">
              <ElFormItem label="同设备再次登录" prop="same_device_login_policy">
                <ElSelect v-model="formData.same_device_login_policy" class="w-full">
                  <ElOption label="替换旧连接" value="replace" />
                  <ElOption label="允许并存" value="coexist" />
                  <ElOption label="拒绝新登录" value="reject" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="8">
              <ElFormItem label="跨设备登录" prop="cross_device_login_policy">
                <ElSelect v-model="formData.cross_device_login_policy" class="w-full">
                  <ElOption
                    label="允许同时在线"
                    value="allow"
                    :disabled="!formData.allow_multi_device_online"
                  />
                  <ElOption label="踢下线旧设备" value="kick_old" />
                  <ElOption label="拒绝新设备" value="reject_new" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElDivider content-position="left">消息与群组限制</ElDivider>
          <ElRow :gutter="24">
            <ElCol :xs="24" :md="8">
              <ElFormItem label="消息并发上限" prop="max_message_concurrency">
                <ElInputNumber
                  v-model="formData.max_message_concurrency"
                  :min="1"
                  :max="1000"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="8">
              <ElFormItem label="每秒消息上限（QPS）" prop="max_message_qps">
                <ElInputNumber
                  v-model="formData.max_message_qps"
                  :min="1"
                  :max="10000"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="8">
              <ElFormItem label="默认群成员展示数量" prop="default_group_display_member_count">
                <ElInputNumber
                  v-model="formData.default_group_display_member_count"
                  :min="1"
                  :max="100000"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElDivider content-position="left">消息撤回与编辑</ElDivider>
          <ElRow :gutter="24">
            <ElCol :xs="24" :md="12">
              <ElFormItem label="消息撤回窗口（秒）" prop="message_recall_window_seconds">
                <ElInputNumber
                  v-model="formData.message_recall_window_seconds"
                  :min="0"
                  :max="86400"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="12">
              <ElFormItem label="消息编辑窗口（秒）" prop="message_edit_window_seconds">
                <ElInputNumber
                  v-model="formData.message_edit_window_seconds"
                  :min="0"
                  :max="86400"
                  controls-position="right"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="12">
              <ElFormItem label="发送撤回通知" prop="recall_notice_enabled">
                <ElSwitch
                  v-model="formData.recall_notice_enabled"
                  inline-prompt
                  active-text="发送"
                  inactive-text="关闭"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :xs="24" :md="12">
              <ElFormItem label="群聊发送撤回通知" prop="group_recall_notice_enabled">
                <ElSwitch
                  v-model="formData.group_recall_notice_enabled"
                  inline-prompt
                  active-text="发送"
                  inactive-text="关闭"
                />
              </ElFormItem>
            </ElCol>
          </ElRow>

          <ElDivider content-position="left">策略状态</ElDivider>
          <ElFormItem label="运行状态" prop="status">
            <ElRadioGroup v-model="formData.status">
              <ElRadio value="ENABLED">启用</ElRadio>
              <ElRadio value="DISABLED">停用</ElRadio>
            </ElRadioGroup>
            <ElText class="ml-3" type="info">
              停用后 IM 登录与消息链路将按后端策略拒绝访问。
            </ElText>
          </ElFormItem>

          <ElFormItem>
            <ElButton
              v-permission="'saimulti:tenant:im:policy:update'"
              type="primary"
              :loading="saving"
              @click="savePolicy"
            >
              保存策略
            </ElButton>
          </ElFormItem>
        </ElForm>
      </ElSkeleton>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import imPolicyApi, {
    type ImClientFamily,
    type TenantImPolicy,
    type TenantImPolicyUpdate
  } from '@/api/system/im-policy'
  import { HttpError } from '@/utils/http/error'

  defineOptions({ name: 'TenantImPolicy' })

  const policy = ref<TenantImPolicy | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const errorMessage = ref('')
  const conflicted = ref(false)
  const formRef = ref<FormInstance>()

  const formData = reactive<TenantImPolicyUpdate>({
    allowed_client_families: ['web', 'app', 'desktop'],
    allow_multi_device_online: true,
    max_online_devices: 5,
    same_device_login_policy: 'replace',
    cross_device_login_policy: 'allow',
    max_message_concurrency: 8,
    max_message_qps: 20,
    default_group_display_member_count: 50,
    message_recall_window_seconds: 120,
    message_edit_window_seconds: 120,
    recall_notice_enabled: true,
    group_recall_notice_enabled: true,
    status: 'ENABLED',
    version: 1
  })

  const rules: FormRules = {
    allowed_client_families: [
      { type: 'array', required: true, min: 1, message: '至少允许一种客户端形态' }
    ],
    max_online_devices: [{ required: true, message: '请输入最大在线设备数' }],
    same_device_login_policy: [{ required: true, message: '请选择同设备登录策略' }],
    cross_device_login_policy: [{ required: true, message: '请选择跨设备登录策略' }],
    max_message_concurrency: [{ required: true, message: '请输入消息并发上限' }],
    max_message_qps: [{ required: true, message: '请输入每秒消息上限' }],
    default_group_display_member_count: [{ required: true, message: '请输入群成员展示数量' }],
    message_recall_window_seconds: [{ required: true, message: '请输入消息撤回窗口' }],
    message_edit_window_seconds: [{ required: true, message: '请输入消息编辑窗口' }],
    status: [{ required: true, message: '请选择策略状态' }]
  }

  const assignPolicy = (value: TenantImPolicy) => {
    policy.value = value
    Object.assign(formData, {
      allowed_client_families: [...value.allowed_client_families] as ImClientFamily[],
      allow_multi_device_online: value.allow_multi_device_online,
      max_online_devices: value.max_online_devices,
      same_device_login_policy: value.same_device_login_policy,
      cross_device_login_policy: value.cross_device_login_policy,
      max_message_concurrency: value.max_message_concurrency,
      max_message_qps: value.max_message_qps,
      default_group_display_member_count: value.default_group_display_member_count,
      message_recall_window_seconds: value.message_recall_window_seconds,
      message_edit_window_seconds: value.message_edit_window_seconds,
      recall_notice_enabled: value.recall_notice_enabled,
      group_recall_notice_enabled: value.group_recall_notice_enabled,
      status: value.status,
      version: value.version
    })
  }

  const loadPolicy = async () => {
    loading.value = true
    errorMessage.value = ''
    conflicted.value = false
    try {
      const response = await imPolicyApi.read()
      assignPolicy(response)
      formRef.value?.clearValidate()
    } catch (error) {
      policy.value = null
      errorMessage.value = formatError(error, 'IM 策略加载失败')
    } finally {
      loading.value = false
    }
  }

  const savePolicy = async () => {
    if (!formRef.value) return
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    errorMessage.value = ''
    conflicted.value = false
    try {
      const response = await imPolicyApi.update({
        ...formData,
        allowed_client_families: [...formData.allowed_client_families]
      })
      assignPolicy(response)
      ElMessage.success('IM 策略已保存')
    } catch (error) {
      if (error instanceof HttpError && error.code === 409) {
        conflicted.value = true
        errorMessage.value = '策略版本已变化，当前保存未执行。'
        ElMessage.warning('其他管理员已更新该策略，请重新加载最新版本后再保存')
      } else {
        errorMessage.value = formatError(error, 'IM 策略保存失败')
        ElMessage.error(errorMessage.value)
      }
    } finally {
      saving.value = false
    }
  }

  const handleMultiDeviceChange = (value: string | number | boolean) => {
    if (!value && formData.cross_device_login_policy === 'allow') {
      formData.cross_device_login_policy = 'kick_old'
    }
  }

  const formatError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      if (error.code === 404) return '当前机构的 IM 策略尚未初始化。'
      if (error.code === 403) return '当前账号没有读取或维护该策略的权限。'
      return error.message || fallback
    }
    return error instanceof Error ? error.message : fallback
  }

  onMounted(loadPolicy)
</script>

<style scoped>
  .policy-form {
    max-width: 1120px;
  }
</style>
