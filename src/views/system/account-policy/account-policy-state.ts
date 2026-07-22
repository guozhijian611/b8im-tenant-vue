export type RegistrationPolicyChange = 'enable' | 'disable' | null

export interface AccountPolicySaveState {
  currentValue: boolean | null
  draftValue: boolean
  conflicted: boolean
  loadFailed: boolean
  saving: boolean
}

export const isAccountPolicyDirty = (currentValue: boolean | null, draftValue: boolean): boolean =>
  currentValue !== null && currentValue !== draftValue

export const getRegistrationPolicyChange = (
  currentValue: boolean | null,
  draftValue: boolean
): RegistrationPolicyChange => {
  if (!isAccountPolicyDirty(currentValue, draftValue)) return null
  return draftValue ? 'enable' : 'disable'
}

export const canSaveAccountPolicy = ({
  currentValue,
  draftValue,
  conflicted,
  loadFailed,
  saving
}: AccountPolicySaveState): boolean =>
  !conflicted && !loadFailed && !saving && isAccountPolicyDirty(currentValue, draftValue)

export const shouldConfirmPolicyReload = (dirty: boolean, conflicted: boolean): boolean =>
  dirty || conflicted
