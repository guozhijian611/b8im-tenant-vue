import { describe, expect, it } from 'vitest'
import {
  canSaveAccountPolicy,
  getRegistrationPolicyChange,
  isAccountPolicyDirty,
  shouldConfirmPolicyReload
} from './account-policy-state'

describe('account policy state', () => {
  it('is dirty only after a loaded value changes', () => {
    expect(isAccountPolicyDirty(null, false)).toBe(false)
    expect(isAccountPolicyDirty(false, false)).toBe(false)
    expect(isAccountPolicyDirty(false, true)).toBe(true)
  })

  it('requires a distinct confirmation intent for enabling and disabling registration', () => {
    expect(getRegistrationPolicyChange(false, true)).toBe('enable')
    expect(getRegistrationPolicyChange(true, false)).toBe('disable')
    expect(getRegistrationPolicyChange(true, true)).toBeNull()
  })

  it('locks saving after a conflict until a successful reload clears the conflict', () => {
    const dirtyState = {
      currentValue: false,
      draftValue: true,
      loadFailed: false,
      saving: false
    }

    expect(canSaveAccountPolicy({ ...dirtyState, conflicted: false })).toBe(true)
    expect(canSaveAccountPolicy({ ...dirtyState, conflicted: true })).toBe(false)
    expect(shouldConfirmPolicyReload(true, true)).toBe(true)

    const reloadedState = {
      currentValue: true,
      draftValue: true,
      conflicted: false,
      loadFailed: false,
      saving: false
    }
    expect(canSaveAccountPolicy(reloadedState)).toBe(false)
  })

  it('does not allow saving while the latest load failed', () => {
    expect(
      canSaveAccountPolicy({
        currentValue: false,
        draftValue: true,
        conflicted: false,
        loadFailed: true,
        saving: false
      })
    ).toBe(false)
  })
})
