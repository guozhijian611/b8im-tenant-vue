import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn()
}))

vi.mock('@/utils/http', () => ({ default: requestMock }))

import fileMediaApi, { type TenantFileMediaPolicyUpdate } from './file-media'

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
  update_time: '2026-07-22 12:00:00'
} as const

const policy = {
  max_file_bytes: '2147483648',
  large_file_enabled: 1,
  preview_enabled: 0,
  status: 1
} as const

describe('fileMediaApi tenant storage and policy contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads the central read-only StorageQuota endpoint with exact keys', async () => {
    requestMock.get.mockResolvedValue(storageQuota)

    await expect(fileMediaApi.storageRead(9)).resolves.toEqual(storageQuota)
    expect(requestMock.get).toHaveBeenCalledWith({
      url: '/saimulti/tenant/storage-quota/read'
    })
    expect(Object.keys(await fileMediaApi.storageRead(9)).sort()).toEqual(
      Object.keys(storageQuota).sort()
    )
  })

  it('rejects a StorageQuota response from a different App-Id organization', async () => {
    requestMock.get.mockResolvedValue({ ...storageQuota, organization: 10 })

    await expect(fileMediaApi.storageRead(9)).rejects.toThrow(
      'StorageQuota.organization 与当前 App-Id 不一致'
    )
  })

  it('uses only policyRead and policyUpdate for the four-field module policy', async () => {
    requestMock.get.mockResolvedValue(policy)
    requestMock.put.mockResolvedValue(policy)
    const maliciousDraft = {
      ...policy,
      organization: 9,
      version: 7,
      quota_value: '1',
      used_value: '1'
    } as unknown as TenantFileMediaPolicyUpdate

    await expect(fileMediaApi.policyRead()).resolves.toEqual(policy)
    await expect(fileMediaApi.policyUpdate(maliciousDraft)).resolves.toEqual(policy)

    expect(requestMock.get).toHaveBeenCalledWith({
      url: '/saimulti/tenant/file-media/policyRead'
    })
    expect(requestMock.put).toHaveBeenCalledWith({
      url: '/saimulti/tenant/file-media/policyUpdate',
      data: policy
    })
    expect(Object.keys(requestMock.put.mock.calls[0][0].data).sort()).toEqual([
      'large_file_enabled',
      'max_file_bytes',
      'preview_enabled',
      'status'
    ])
  })

  it('fails closed on numeric byte fields, missing keys, or legacy mixed fields', async () => {
    requestMock.get.mockResolvedValueOnce({ ...storageQuota, quota_value: 10000 })
    await expect(fileMediaApi.storageRead(9)).rejects.toThrow(
      'StorageQuota.quota_value 必须是规范十进制字符串'
    )

    requestMock.get.mockResolvedValueOnce({
      ...storageQuota,
      max_storage_bytes: '10000'
    })
    await expect(fileMediaApi.storageRead(9)).rejects.toThrow('StorageQuota 字段集合无效')

    const missingPolicyKey: Record<string, unknown> = { ...policy }
    delete missingPolicyKey.status
    requestMock.get.mockResolvedValueOnce(missingPolicyKey)
    await expect(fileMediaApi.policyRead()).rejects.toThrow('FileMediaPolicy 字段集合无效')
  })
})
