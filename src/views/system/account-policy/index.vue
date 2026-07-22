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
  import accountPolicyApi from '@/api/system/account-policy'
  import {
    createAccountPolicyController,
    createAccountPolicyState
  } from './account-policy-controller'
  import { type RegistrationPolicyChange } from './account-policy-state'

  defineOptions({ name: 'TenantAccountPolicy' })

  const confirmChange = async (change: RegistrationPolicyChange): Promise<boolean> => {
    const enabling = change === 'enable'
    try {
      await ElMessageBox.confirm(
        enabling
          ? '开放后，公网登录页将显示注册入口。当前已有图形验证码、注册字段与确认密码规则、同机构账号唯一、机构有效性和用户配额校验；尚无邀请码、邮件/短信验证和实名认证。确认开放吗？'
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

  const state = reactive(createAccountPolicyState())
  const controller = createAccountPolicyController({
    state,
    api: accountPolicyApi,
    confirmChange,
    confirmReload,
    notifications: {
      success: ElMessage.success,
      warning: ElMessage.warning,
      error: ElMessage.error
    }
  })

  const { policy, loading, saving, loadFailed, conflicted, errorMessage } = toRefs(state)
  const formData = state.formData
  const saveDisabled = computed(() => !controller.canSave())
  const registrationNotice = computed(() =>
    formData.register_enabled
      ? '开放后，公网登录页将显示注册入口。当前已有图形验证码、注册字段与确认密码规则、同机构账号唯一、机构有效性和用户配额校验；尚无邀请码、邮件/短信验证和实名认证。'
      : '关闭后，公网客户端不再允许新用户自行注册，现有账号不受影响。'
  )

  const { loadPolicy, reloadPolicy, savePolicy } = controller

  onMounted(loadPolicy)
</script>

<style scoped>
  .policy-form {
    max-width: 760px;
  }
</style>
