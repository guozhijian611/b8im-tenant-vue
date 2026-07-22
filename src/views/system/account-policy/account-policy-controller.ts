import type { TenantAccountPolicy, TenantAccountPolicyUpdate } from '@/api/system/account-policy'
import { HttpError } from '@/utils/http/error'
import {
  canSaveAccountPolicy,
  getRegistrationPolicyChange,
  isAccountPolicyDirty,
  shouldConfirmPolicyReload,
  type RegistrationPolicyChange
} from './account-policy-state'

export interface AccountPolicyApi {
  read(): Promise<TenantAccountPolicy>
  update(data: TenantAccountPolicyUpdate): Promise<TenantAccountPolicy>
}

export interface AccountPolicyControllerState {
  policy: TenantAccountPolicy | null
  formData: TenantAccountPolicyUpdate
  loading: boolean
  saving: boolean
  loadFailed: boolean
  conflicted: boolean
  errorMessage: string
}

export interface AccountPolicyNotifications {
  success(message: string): void
  warning(message: string): void
  error(message: string): void
}

export interface AccountPolicyControllerDependencies {
  state: AccountPolicyControllerState
  api: AccountPolicyApi
  confirmChange(change: Exclude<RegistrationPolicyChange, null>): Promise<boolean>
  confirmReload(): Promise<boolean>
  notifications?: AccountPolicyNotifications
}

const emptyNotifications: AccountPolicyNotifications = {
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined
}

export const createAccountPolicyState = (): AccountPolicyControllerState => ({
  policy: null,
  formData: {
    register_enabled: false,
    version: 0
  },
  loading: false,
  saving: false,
  loadFailed: false,
  conflicted: false,
  errorMessage: ''
})

export const formatAccountPolicyError = (error: unknown, fallback: string): string => {
  if (error instanceof HttpError) {
    if (error.code === 404) return '当前机构的账号注册策略尚未初始化。'
    if (error.code === 403) return '当前账号没有读取或维护该策略的权限。'
    return error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

export const createAccountPolicyController = ({
  state,
  api,
  confirmChange,
  confirmReload,
  notifications = emptyNotifications
}: AccountPolicyControllerDependencies) => {
  const isDirty = (): boolean =>
    isAccountPolicyDirty(state.policy?.register_enabled ?? null, state.formData.register_enabled)

  const canSave = (): boolean =>
    canSaveAccountPolicy({
      currentValue: state.policy?.register_enabled ?? null,
      draftValue: state.formData.register_enabled,
      conflicted: state.conflicted,
      loadFailed: state.loadFailed,
      saving: state.saving
    })

  const assignPolicy = (value: TenantAccountPolicy): void => {
    state.policy = value
    Object.assign(state.formData, {
      register_enabled: value.register_enabled,
      version: value.version
    })
  }

  const loadPolicy = async (): Promise<boolean> => {
    state.loading = true
    state.errorMessage = ''
    try {
      assignPolicy(await api.read())
      state.loadFailed = false
      state.conflicted = false
      return true
    } catch (error) {
      state.loadFailed = true
      state.errorMessage = formatAccountPolicyError(error, '账号注册策略加载失败')
      return false
    } finally {
      state.loading = false
    }
  }

  const reloadPolicy = async (): Promise<boolean> => {
    if (shouldConfirmPolicyReload(isDirty(), state.conflicted) && !(await confirmReload())) {
      return false
    }
    return loadPolicy()
  }

  const savePolicy = async (): Promise<boolean> => {
    if (!canSave()) return false

    const change = getRegistrationPolicyChange(
      state.policy?.register_enabled ?? null,
      state.formData.register_enabled
    )
    if (!change || !(await confirmChange(change))) return false

    state.saving = true
    state.errorMessage = ''
    try {
      const response = await api.update({
        register_enabled: state.formData.register_enabled,
        version: state.formData.version
      })
      assignPolicy(response)
      state.conflicted = false
      state.loadFailed = false
      notifications.success('账号注册策略已保存')
      return true
    } catch (error) {
      if (error instanceof HttpError && error.code === 409) {
        state.conflicted = true
        state.errorMessage = '策略版本已变化，本次保存未执行。'
        notifications.warning('其他管理员已更新该策略，请重新加载最新版本')
      } else {
        state.errorMessage = formatAccountPolicyError(error, '账号注册策略保存失败')
        notifications.error(state.errorMessage)
      }
      return false
    } finally {
      state.saving = false
    }
  }

  return {
    isDirty,
    canSave,
    loadPolicy,
    reloadPolicy,
    savePolicy
  }
}
