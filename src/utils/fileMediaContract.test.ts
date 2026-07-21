import { describe, expect, it } from 'vitest'
import {
  createLatestRequestFence,
  formatByteCount,
  formatQuotaByteCount,
  formatUsageRatio,
  isCanonicalByteCount,
  parseByteCount,
  parseExpectedOrganization,
  parseFileMediaPolicy,
  parseStorageQuota,
  PHP_INT_MAX_DECIMAL
} from './fileMediaContract'

const storageQuota = {
  organization: 9,
  quota_key: 'storage_bytes',
  quota_value: '10000',
  used_value: '6000',
  held_value: '500',
  occupancy_value: '6500',
  remaining_value: '3500',
  unlimited: false,
  used_file_count: 6,
  held_file_count: 1,
  usage_ratio: 0.65,
  version: 3,
  update_time: null
}

describe('file media strict contract helpers', () => {
  it('keeps decimal byte values above Number.MAX_SAFE_INTEGER precise', () => {
    expect(isCanonicalByteCount('9007199254740993')).toBe(true)
    expect(parseByteCount('9007199254740993')).toBe(9007199254740993n)
    expect(formatByteCount('9007199254740993')).toBe('8 PB')
    expect(parseByteCount(PHP_INT_MAX_DECIMAL)?.toString()).toBe(PHP_INT_MAX_DECIMAL)
    expect(parseByteCount('9223372036854775808')).toBeNull()
  })

  it('rejects non-canonical decimals and policy values outside 1 byte to 2 GiB', () => {
    for (const value of ['', '-1', '+1', '01', '1.0', '1e3', ' 1']) {
      expect(isCanonicalByteCount(value)).toBe(false)
    }
    expect(() =>
      parseFileMediaPolicy({
        max_file_bytes: '2147483649',
        large_file_enabled: 1,
        preview_enabled: 1,
        status: 1
      })
    ).toThrow('1 字节到 2 GiB')
  })

  it('validates StorageQuota invariants without numeric coercion', () => {
    expect(parseStorageQuota(storageQuota)).toEqual(storageQuota)
    expect(() => parseStorageQuota({ ...storageQuota, occupancy_value: '6499' })).toThrow(
      '已用、预留与占用值不一致'
    )
    expect(() => parseStorageQuota({ ...storageQuota, remaining_value: '3499' })).toThrow(
      '有限配额剩余值无效'
    )
    expect(() => parseStorageQuota({ ...storageQuota, usage_ratio: 0.650001 })).toThrow(
      '有限配额使用率与占用值不一致'
    )

    const largeQuota = {
      ...storageQuota,
      quota_value: '9007199254740993',
      used_value: '3002399751580331',
      held_value: '0',
      occupancy_value: '3002399751580331',
      remaining_value: '6004799503160662',
      usage_ratio: 0.333333
    }
    expect(parseStorageQuota(largeQuota)).toEqual(largeQuota)

    const halfUpTieQuota = {
      ...storageQuota,
      quota_value: '2000000',
      used_value: '1',
      held_value: '0',
      occupancy_value: '1',
      remaining_value: '1999999',
      usage_ratio: 0.000001
    }
    expect(parseStorageQuota(halfUpTieQuota)).toEqual(halfUpTieQuota)
    expect(() => parseStorageQuota({ ...halfUpTieQuota, usage_ratio: 0 })).toThrow(
      '有限配额使用率与占用值不一致'
    )

    const unlimitedQuota = {
      ...storageQuota,
      quota_value: '0',
      remaining_value: null,
      unlimited: true,
      usage_ratio: null
    }
    expect(parseStorageQuota(unlimitedQuota)).toEqual(unlimitedQuota)
    expect(() => parseStorageQuota({ ...unlimitedQuota, usage_ratio: 0 })).toThrow(
      '无限配额剩余值或使用率无效'
    )
  })

  it('accepts only a positive safe organization identity', () => {
    expect(parseExpectedOrganization(9)).toBe(9)
    expect(parseExpectedOrganization('9')).toBe(9)
    for (const value of [0, -1, 1.5, '09', '0', '9007199254740992', null]) {
      expect(() => parseExpectedOrganization(value)).toThrow('organization')
    }
  })

  it('formats quota and nullable usage ratio safely', () => {
    expect(formatQuotaByteCount('0', true)).toBe('无限')
    expect(formatByteCount('1536')).toBe('1.5 KB')
    expect(formatUsageRatio(null)).toBe('—')
    expect(formatUsageRatio(0.125)).toBe('12.50%')
  })

  it('invalidates stale and unmounted request generations', () => {
    const fence = createLatestRequestFence()
    const first = fence.begin()
    const second = fence.begin()

    expect(fence.isCurrent(first)).toBe(false)
    expect(fence.isCurrent(second)).toBe(true)

    fence.invalidate()
    expect(fence.isCurrent(second)).toBe(false)
  })
})
