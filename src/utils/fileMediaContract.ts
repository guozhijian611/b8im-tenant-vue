const CANONICAL_UNSIGNED_DECIMAL = /^(0|[1-9]\d*)$/
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] as const
const UNIT_BASE = 1024n
const MAX_FILE_BYTES = 2147483648n
const USAGE_RATIO_SCALE = 1000000n

export const PHP_INT_MAX_DECIMAL = '9223372036854775807'

export type FileMediaPolicyFlag = 0 | 1

export interface StorageQuota {
  organization: number
  quota_key: 'storage_bytes'
  quota_value: string
  used_value: string
  held_value: string
  occupancy_value: string
  remaining_value: string | null
  unlimited: boolean
  used_file_count: number
  held_file_count: number
  usage_ratio: number | null
  version: number
  update_time: string | null
}

export interface FileMediaPolicy {
  max_file_bytes: string
  large_file_enabled: FileMediaPolicyFlag
  preview_enabled: FileMediaPolicyFlag
  status: FileMediaPolicyFlag
}

const STORAGE_QUOTA_KEYS = [
  'organization',
  'quota_key',
  'quota_value',
  'used_value',
  'held_value',
  'occupancy_value',
  'remaining_value',
  'unlimited',
  'used_file_count',
  'held_file_count',
  'usage_ratio',
  'version',
  'update_time'
] as const

const FILE_MEDIA_POLICY_KEYS = [
  'max_file_bytes',
  'large_file_enabled',
  'preview_enabled',
  'status'
] as const

function fitsPhpInteger(value: string): boolean {
  return (
    value.length < PHP_INT_MAX_DECIMAL.length ||
    (value.length === PHP_INT_MAX_DECIMAL.length && value <= PHP_INT_MAX_DECIMAL)
  )
}

export function isCanonicalByteCount(value: string): boolean {
  return CANONICAL_UNSIGNED_DECIMAL.test(value) && fitsPhpInteger(value)
}

export function parseByteCount(value: string): bigint | null {
  return isCanonicalByteCount(value) ? BigInt(value) : null
}

export function parseExpectedOrganization(value: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return value
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value)
    if (Number.isSafeInteger(parsed)) return parsed
  }
  throw new Error('当前机构 organization 必须是正安全整数')
}

function calculateUsageRatio(occupancy: bigint, quota: bigint): number {
  const scaled = occupancy * USAGE_RATIO_SCALE
  const rounded = scaled / quota + ((scaled % quota) * 2n >= quota ? 1n : 0n)
  return Number(rounded) / Number(USAGE_RATIO_SCALE)
}

function assertExactRecord(
  value: unknown,
  keys: readonly string[],
  label: string
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' 必须是对象')
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(label + ' 字段集合无效')
  }
  return value as Record<string, unknown>
}

function readDecimal(row: Record<string, unknown>, key: string, label: string): string {
  const value = row[key]
  if (typeof value !== 'string' || !isCanonicalByteCount(value)) {
    throw new Error(label + '.' + key + ' 必须是规范十进制字符串')
  }
  return value
}

function readSafeInteger(
  row: Record<string, unknown>,
  key: string,
  label: string,
  minimum: number
): number {
  const value = row[key]
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(label + '.' + key + ' 必须是安全整数')
  }
  return value as number
}

function readFlag(row: Record<string, unknown>, key: string, label: string): FileMediaPolicyFlag {
  const value = row[key]
  if (value !== 0 && value !== 1) {
    throw new Error(label + '.' + key + ' 必须是 0 或 1')
  }
  return value
}

function readNullableTimestamp(
  row: Record<string, unknown>,
  key: string,
  label: string
): string | null {
  const value = row[key]
  if (value !== null && typeof value !== 'string') {
    throw new Error(label + '.' + key + ' 必须是字符串或 null')
  }
  return value as string | null
}

function readUsageRatio(row: Record<string, unknown>, label: string): number | null {
  const value = row.usage_ratio
  if (
    value !== null &&
    (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    throw new Error(label + '.usage_ratio 必须是 0 至 1 的数字或 null')
  }
  return value as number | null
}

export function parseStorageQuota(value: unknown): StorageQuota {
  const label = 'StorageQuota'
  const row = assertExactRecord(value, STORAGE_QUOTA_KEYS, label)
  const quotaValue = readDecimal(row, 'quota_value', label)
  const usedValue = readDecimal(row, 'used_value', label)
  const heldValue = readDecimal(row, 'held_value', label)
  const occupancyValue = readDecimal(row, 'occupancy_value', label)
  const remainingRaw = row.remaining_value
  const remainingValue = remainingRaw === null ? null : readDecimal(row, 'remaining_value', label)
  const unlimited = row.unlimited
  if (typeof unlimited !== 'boolean') {
    throw new Error(label + '.unlimited 必须是布尔值')
  }
  const usageRatio = readUsageRatio(row, label)
  const quota = BigInt(quotaValue)
  const used = BigInt(usedValue)
  const held = BigInt(heldValue)
  const occupancy = BigInt(occupancyValue)

  if (used + held !== occupancy) {
    throw new Error(label + ' 的已用、预留与占用值不一致')
  }
  if (unlimited !== (quota === 0n)) {
    throw new Error(label + ' 的无限配额标记不一致')
  }
  if (quota === 0n) {
    if (remainingValue !== null || usageRatio !== null) {
      throw new Error(label + ' 的无限配额剩余值或使用率无效')
    }
  } else {
    if (
      occupancy > quota ||
      remainingValue === null ||
      BigInt(remainingValue) !== quota - occupancy
    ) {
      throw new Error(label + ' 的有限配额剩余值无效')
    }
    if (usageRatio === null) {
      throw new Error(label + ' 的有限配额使用率无效')
    }
    if (usageRatio !== calculateUsageRatio(occupancy, quota)) {
      throw new Error(label + ' 的有限配额使用率与占用值不一致')
    }
  }

  if (row.quota_key !== 'storage_bytes') {
    throw new Error(label + '.quota_key 必须是 storage_bytes')
  }

  return {
    organization: readSafeInteger(row, 'organization', label, 1),
    quota_key: 'storage_bytes',
    quota_value: quotaValue,
    used_value: usedValue,
    held_value: heldValue,
    occupancy_value: occupancyValue,
    remaining_value: remainingValue,
    unlimited,
    used_file_count: readSafeInteger(row, 'used_file_count', label, 0),
    held_file_count: readSafeInteger(row, 'held_file_count', label, 0),
    usage_ratio: usageRatio,
    version: readSafeInteger(row, 'version', label, 1),
    update_time: readNullableTimestamp(row, 'update_time', label)
  }
}

export function parseFileMediaPolicy(value: unknown): FileMediaPolicy {
  const label = 'FileMediaPolicy'
  const row = assertExactRecord(value, FILE_MEDIA_POLICY_KEYS, label)
  const maxFileBytes = readDecimal(row, 'max_file_bytes', label)
  const maximum = BigInt(maxFileBytes)
  if (maximum < 1n || maximum > MAX_FILE_BYTES) {
    throw new Error(label + '.max_file_bytes 必须在 1 字节到 2 GiB 之间')
  }

  return {
    max_file_bytes: maxFileBytes,
    large_file_enabled: readFlag(row, 'large_file_enabled', label),
    preview_enabled: readFlag(row, 'preview_enabled', label),
    status: readFlag(row, 'status', label)
  }
}

export function formatByteCount(value: string): string {
  const bytes = parseByteCount(value)
  if (bytes === null) return '—'

  let unitIndex = 0
  let unitSize = 1n
  while (unitIndex < BYTE_UNITS.length - 1 && bytes >= unitSize * UNIT_BASE) {
    unitIndex += 1
    unitSize *= UNIT_BASE
  }
  if (unitIndex === 0) return bytes.toString() + ' B'

  const whole = bytes / unitSize
  const hundredths = ((bytes % unitSize) * 100n) / unitSize
  const decimal = hundredths.toString().padStart(2, '0').replace(/0+$/, '')
  return whole.toString() + (decimal ? '.' + decimal : '') + ' ' + BYTE_UNITS[unitIndex]
}

export function formatQuotaByteCount(value: string, unlimited: boolean): string {
  return unlimited ? '无限' : formatByteCount(value)
}

export function formatUsageRatio(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return (value * 100).toFixed(2).replace(/\.00$/, '') + '%'
}

export interface LatestRequestFence {
  begin: () => number
  isCurrent: (token: number) => boolean
  invalidate: () => void
}

export function createLatestRequestFence(): LatestRequestFence {
  let generation = 0
  return {
    begin: () => {
      generation += 1
      return generation
    },
    isCurrent: (token) => token === generation,
    invalidate: () => {
      generation += 1
    }
  }
}
