import { beforeEach, describe, expect, it, vi } from 'vitest'

const requestMock = vi.hoisted(() => ({
  put: vi.fn()
}))

vi.mock('@/utils/http', () => ({ default: requestMock }))

import fileMediaApi, { type TenantFileMediaQuotaUpdate } from './file-media'

describe('fileMediaApi tenant quota update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestMock.put.mockResolvedValue({})
  })

  it('submits only tenant-editable policy fields and never submits total storage quota', async () => {
    const maliciousDraft = {
      max_file_bytes: 104857600,
      preview_enabled: 1,
      large_file_enabled: 0,
      status: 1,
      max_storage_bytes: 1
    } as TenantFileMediaQuotaUpdate

    await fileMediaApi.quotaUpdate(maliciousDraft)

    expect(requestMock.put).toHaveBeenCalledWith({
      url: '/saimulti/tenant/file-media/quotaUpdate',
      data: {
        max_file_bytes: 104857600,
        preview_enabled: 1,
        large_file_enabled: 0,
        status: 1
      }
    })
    expect(requestMock.put.mock.calls[0][0].data).not.toHaveProperty('max_storage_bytes')
  })
})
