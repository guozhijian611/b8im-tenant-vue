<template>
  <div class="art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">账号注册策略</div>
            <ElText type="info">管理当前机构是否允许用户从公网客户端自行注册账号。</ElText>
          </div>
          <ElButton
            v-permission="'saimulti:tenant:account:policy:read'"
            :loading="loading"
            :disabled="saving"
            @click="reloadPolicy"
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
          当前草稿已保留，但在重新加载服务端最新版本前不能再次保存。
        </template>
      </ElAlert>

      <ElSkeleton :loading="loading" animated :rows="6">
        <ElEmpty v-if="!policy || loadFailed" description="未加载到当前机构的账号注册策略">
          <ElButton
            v-permission="'saimulti:tenant:account:policy:read'"
            type="primary"
            @click="reloadPolicy"
          >
            重试
          </ElButton>
        </ElEmpty>

        <ElForm v-else class="policy-form" label-position="top">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <ElTag :type="formData.register_enabled ? 'warning' : 'info'" effect="light">
              {{ formData.register_enabled ? '公网注册已开放' : '公网注册已关闭' }}
            </ElTag>
            <ElTag effect="plain">机构 {{ policy.organization }}</ElTag>
            <ElTag effect="plain">版本 {{ formData.version }}</ElTag>
            <ElText v-if="policy.update_time" type="info">
              最后更新：{{ policy.update_time }}
            </ElText>
          </div>

          <ElAlert
            class="mb-5"
            :type="formData.register_enabled ? 'warning' : 'info'"
            :closable="false"
            show-icon
            :title="registrationNotice"
          />

          <ElFormItem label="允许公网用户注册">
            <ElSwitch
              v-model="formData.register_enabled"
              inline-prompt
              active-text="开放"
              inactive-text="关闭"
            />
            <ElText class="ml-3" type="info"> 修改开关不会立即生效，保存前仍需再次确认。 </ElText>
          </ElFormItem>

          <ElFormItem>
            <ElButton
              v-permission="'saimulti:tenant:account:policy:update'"
              type="primary"
              :loading="saving"
              :disabled="saveDisabled"
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
  import { ElMessage, ElMessageBox } from 'element-plus'
  import accountPolicyApi, {
    type TenantAccountPolicy,
    type TenantAccountPolicyUpdate
  } from '@/api/system/account-policy'
  import { HttpError } from '@/utils/http/error'
  import {
    canSaveAccountPolicy,
    getRegistrationPolicyChange,
    isAccountPolicyDirty,
    shouldConfirmPolicyReload,
    type RegistrationPolicyChange
  } from './account-policy-state'

  defineOptions({ name: 'TenantAccountPolicy' })

  const policy = ref<TenantAccountPolicy | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const loadFailed = ref(false)
  const conflicted = ref(false)
  const errorMessage = ref('')

  const formData = reactive<TenantAccountPolicyUpdate>({
    register_enabled: false,
    version: 0
  })

  const dirty = computed(() =>
    isAccountPolicyDirty(policy.value?.register_enabled ?? null, formData.register_enabled)
  )

  const saveDisabled = computed(
    () =>
      !canSaveAccountPolicy({
        currentValue: policy.value?.register_enabled ?? null,
        draftValue: formData.register_enabled,
        conflicted: conflicted.value,
        loadFailed: loadFailed.value,
        saving: saving.value
      })
  )

  const registrationNotice = computed(() =>
    formData.register_enabled
      ? '开放后，公网登录页将显示注册入口；当前注册仅受图形验证码和机构用户配额保护。'
      : '关闭后，公网客户端不再允许新用户自行注册，现有账号不受影响。'
  )

  const assignPolicy = (value: TenantAccountPolicy) => {
    policy.value = value
    Object.assign(formData, {
      register_enabled: value.register_enabled,
      version: value.version
    })
  }

  const loadPolicy = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      const response = await accountPolicyApi.read()
      assignPolicy(response)
      loadFailed.value = false
      conflicted.value = false
    } catch (error) {
      loadFailed.value = true
      errorMessage.value = formatError(error, '账号注册策略加载失败')
    } finally {
      loading.value = false
    }
  }

  const reloadPolicy = async () => {
    if (shouldConfirmPolicyReload(dirty.value, conflicted.value)) {
      const confirmed = await confirmReload()
      if (!confirmed) return
    }
    await loadPolicy()
  }

  const savePolicy = async () => {
    if (saveDisabled.value) return
    const change = getRegistrationPolicyChange(
      policy.value?.register_enabled ?? null,
      formData.register_enabled
    )
    if (!change || !(await confirmChange(change))) return

    saving.value = true
    errorMessage.value = ''
    try {
      const response = await accountPolicyApi.update({
        register_enabled: formData.register_enabled,
        version: formData.version
      })
      assignPolicy(response)
      conflicted.value = false
      loadFailed.value = false
      ElMessage.success('账号注册策略已保存')
    } catch (error) {
      if (error instanceof HttpError && error.code === 409) {
        conflicted.value = true
        errorMessage.value = '策略版本已变化，本次保存未执行。'
        ElMessage.warning('其他管理员已更新该策略，请重新加载最新版本')
      } else {
        errorMessage.value = formatError(error, '账号注册策略保存失败')
        ElMessage.error(errorMessage.value)
      }
    } finally {
      saving.value = false
    }
  }

  const confirmChange = async (change: RegistrationPolicyChange): Promise<boolean> => {
    const enabling = change === 'enable'
    try {
      await ElMessageBox.confirm(
        enabling
          ? '开放后，公网登录页将显示注册入口。当前注册仅受图形验证码和机构用户配额保护，确认开放吗？'
          : '关闭后，公网客户端将无法创建新账号，现有账号不受影响，确认关闭吗？',
        enabling ? '确认开放公网注册' : '确认关闭公网注册',
        {
          type: 'warning',
          confirmButtonText: enabling ? '确认开放' : '确认关闭',
          cancelButtonText: '取消'
        }
      )
      return true
    } catch {
      return false
    }
  }

  const confirmReload = async (): Promise<boolean> => {
    try {
      await ElMessageBox.confirm(
        '重新加载会丢弃当前尚未保存的草稿，并以服务端最新版本覆盖，是否继续？',
        '重新加载最新策略',
        {
          type: 'warning',
          confirmButtonText: '重新加载',
          cancelButtonText: '保留草稿'
        }
      )
      return true
    } catch {
      return false
    }
  }

  const formatError = (error: unknown, fallback: string) => {
    if (error instanceof HttpError) {
      if (error.code === 404) return '当前机构的账号注册策略尚未初始化。'
      if (error.code === 403) return '当前账号没有读取或维护该策略的权限。'
      return error.message || fallback
    }
    return error instanceof Error ? error.message : fallback
  }

  onMounted(loadPolicy)
</script>

<style scoped>
  .policy-form {
    max-width: 760px;
  }
</style>
