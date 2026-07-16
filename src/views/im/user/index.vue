<template>
  <div class="art-full-height">
    <ElCard v-if="canReadQuota" class="mb-4" shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">IM 用户席位</div>
            <ElText type="info">席位用量由后端按当前机构的正常 IM 用户实时统计。</ElText>
          </div>
          <ElButton
            v-permission="'saimulti:tenant:im:user:quota:read'"
            :loading="quotaLoading"
            @click="loadQuota"
          >
            <template #icon><ArtSvgIcon icon="ri:refresh-line" /></template>
            刷新席位
          </ElButton>
        </div>
      </template>

      <ElSkeleton :loading="quotaLoading" animated :rows="2">
        <ElAlert v-if="quotaError" type="error" :closable="false" show-icon :title="quotaError" />
        <template v-else-if="quota">
          <ElAlert
            v-if="!quota.configured"
            class="mb-4"
            type="warning"
            :closable="false"
            show-icon
            title="当前机构尚未配置 IM 用户席位，请联系平台管理员配置。"
          />
          <ElRow :gutter="20">
            <ElCol :xs="12" :md="6">
              <ElStatistic title="席位总数" :value="quota.quota_value" />
            </ElCol>
            <ElCol :xs="12" :md="6">
              <ElStatistic title="已使用" :value="quota.used_value" />
            </ElCol>
            <ElCol :xs="12" :md="6">
              <ElStatistic title="剩余席位" :value="quota.remaining_value" />
            </ElCol>
            <ElCol :xs="12" :md="6">
              <div class="text-sm text-g-600">配置状态</div>
              <ElTag class="mt-3" :type="quota.configured ? 'success' : 'warning'" size="large">
                {{ quota.configured ? '已配置' : '未配置' }}
              </ElTag>
            </ElCol>
          </ElRow>
          <div class="mt-4">
            <div class="mb-2 flex justify-between text-sm">
              <span>席位使用率</span>
              <span>{{ quota.used_value }} / {{ quota.quota_value }}</span>
            </div>
            <ElProgress
              :percentage="quotaPercentage"
              :status="quotaPercentage >= 100 ? 'exception' : undefined"
              :stroke-width="14"
            />
          </div>
        </template>
      </ElSkeleton>
    </ElCard>

    <TableSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />

    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshAll">
        <template #left>
          <ElButton
            v-permission="'saimulti:tenant:im:user:save'"
            @click="showDialog('add')"
            v-ripple
          >
            <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
            新增 IM 用户
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #identity="{ row }">
          <div class="flex items-center gap-3 min-w-0">
            <ElAvatar :size="38">{{
              String(row.nickname || row.account || 'IM').slice(0, 1)
            }}</ElAvatar>
            <div class="flex flex-col min-w-0">
              <span class="font-medium truncate">{{ row.nickname }}</span>
              <span class="text-xs text-g-700 truncate">{{ row.account }}</span>
            </div>
          </div>
        </template>

        <template #status="{ row }">
          <ElTag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</ElTag>
        </template>

        <template #operation="{ row }">
          <ElSpace wrap>
            <ElButton
              v-if="canEditUser"
              v-permission="'saimulti:tenant:im:user:update'"
              size="small"
              @click="showDialog('edit', row)"
            >
              编辑
            </ElButton>
            <ElButton
              v-permission="'saimulti:tenant:im:user:reset'"
              size="small"
              @click="openResetDialog(row)"
            >
              重置密码
            </ElButton>
            <ElDropdown trigger="click" @command="(status) => changeStatus(row, status)">
              <ElButton v-permission="'saimulti:tenant:im:user:status'" size="small" type="warning">
                切换状态
                <ArtSvgIcon icon="ri:arrow-down-s-line" class="ml-1" />
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem :command="1" :disabled="Number(row.status) === 1"
                    >正常</ElDropdownItem
                  >
                  <ElDropdownItem :command="2" :disabled="Number(row.status) === 2"
                    >停用</ElDropdownItem
                  >
                  <ElDropdownItem :command="3" :disabled="Number(row.status) === 3"
                    >封禁</ElDropdownItem
                  >
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </ElSpace>
        </template>
      </ArtTable>
    </ElCard>

    <EditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :data="dialogData"
      @success="handleUserSaved"
    />
    <ResetPasswordDialog
      v-model="resetDialogVisible"
      :data="resetDialogData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import { checkAuth } from '@/utils/tool'
  import api, { type ImUserQuota, type ImUserStatus } from '@/api/im/user'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'
  import ResetPasswordDialog from './modules/reset-password-dialog.vue'

  defineOptions({ name: 'TenantImUser' })

  const searchForm = ref({
    keyword: undefined,
    status: undefined
  })
  const quota = ref<ImUserQuota | null>(null)
  const quotaLoading = ref(false)
  const quotaError = ref('')
  const resetDialogVisible = ref(false)
  const resetDialogData = ref<Record<string, any>>({})

  const canReadQuota = computed(() => checkAuth('saimulti:tenant:im:user:quota:read'))
  const canEditUser = computed(() =>
    ['saimulti:tenant:im:user:read', 'saimulti:tenant:im:user:update'].every(checkAuth)
  )
  const quotaPercentage = computed(() => {
    if (!quota.value || quota.value.quota_value <= 0) return 0
    return Math.min(100, Math.round((quota.value.used_value / quota.value.quota_value) * 100))
  })

  const handleSearch = (params: Record<string, any>) => {
    Object.assign(searchParams, params)
    getData()
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    getData,
    searchParams,
    pagination,
    resetSearchParams,
    handleSortChange,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: api.list,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 90, align: 'center', sortable: true },
        { prop: 'identity', label: '用户', minWidth: 200, useSlot: true },
        { prop: 'user_id', label: '用户 ID', minWidth: 280, showOverflowTooltip: true },
        { prop: 'im_short_no', label: 'IM 短号', width: 130 },
        { prop: 'mobile', label: '手机号', width: 140 },
        { prop: 'email', label: '邮箱', minWidth: 190, showOverflowTooltip: true },
        { prop: 'gender', label: '性别', width: 80, saiType: 'dict', saiDict: 'gender' },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'signature', label: '个性签名', minWidth: 180, showOverflowTooltip: true },
        { prop: 'remark', label: '备注', minWidth: 160, showOverflowTooltip: true },
        { prop: 'login_time', label: '最后登录', width: 180, sortable: true },
        { prop: 'create_time', label: '创建时间', width: 180, sortable: true },
        { prop: 'operation', label: '操作', width: 280, fixed: 'right', useSlot: true }
      ]
    }
  })

  const { dialogType, dialogVisible, dialogData, showDialog } = useSaiAdmin()

  const statusLabel = (status: ImUserStatus) =>
    ({ 1: '正常', 2: '停用', 3: '封禁' })[Number(status)] || '未知'

  const statusTagType = (status: ImUserStatus) => {
    if (Number(status) === 1) return 'success'
    if (Number(status) === 3) return 'danger'
    return 'info'
  }

  const loadQuota = async () => {
    if (!canReadQuota.value) return
    quotaLoading.value = true
    quotaError.value = ''
    try {
      quota.value = await api.quota()
    } catch (error) {
      quota.value = null
      quotaError.value = error instanceof Error ? error.message : 'IM 用户席位加载失败'
    } finally {
      quotaLoading.value = false
    }
  }

  const refreshAll = async () => {
    await Promise.all([refreshData(), loadQuota()])
  }

  const handleUserSaved = async () => {
    await refreshAll()
  }

  const openResetDialog = (row: Record<string, any>) => {
    resetDialogData.value = row
    resetDialogVisible.value = true
  }

  const changeStatus = async (row: Record<string, any>, value: unknown) => {
    const status = Number(value) as ImUserStatus
    if (![1, 2, 3].includes(status) || status === Number(row.status)) return

    const label = statusLabel(status)
    await ElMessageBox.confirm(
      `确认将 IM 用户「${row.nickname || row.account}」切换为“${label}”吗？`,
      '切换用户状态',
      { type: status === 1 ? 'info' : 'warning' }
    )
    await api.status({ id: Number(row.id), status })
    ElMessage.success(`用户状态已切换为${label}`)
    await refreshAll()
  }

  onMounted(loadQuota)
</script>
