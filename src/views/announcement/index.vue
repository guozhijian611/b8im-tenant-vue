<template>
  <div class="art-full-height">
    <TableSearch v-model="searchForm" @search="handleSearch" @reset="resetSearchParams" />
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-permission="'saimulti:tenant:announcement:save'"
              @click="showDialog('add')"
              v-ripple
            >
              <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
              新增公告
            </ElButton>
            <ElButton
              v-permission="'saimulti:tenant:announcement:destroy'"
              :disabled="selectedRows.length === 0"
              @click="deleteSelectedRows(api.delete, refreshData)"
              v-ripple
            >
              <template #icon><ArtSvgIcon icon="ri:delete-bin-5-line" /></template>
              删除
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable
        ref="tableRef"
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #displayMode="{ row }">{{ displayModeLabel(row.display_mode) }}</template>
        <template #status="{ row }">
          <ElTag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</ElTag>
        </template>
        <template #operation="{ row }">
          <ElSpace wrap>
            <ElButton
              v-permission="'saimulti:tenant:announcement:read'"
              size="small"
              @click="showDialog('view', row)"
            >
              详情
            </ElButton>
            <ElButton v-if="canEditAnnouncement" size="small" @click="showDialog('edit', row)">
              编辑
            </ElButton>
            <ElButton
              v-if="[1, 3].includes(Number(row.status))"
              v-permission="'saimulti:tenant:announcement:update'"
              size="small"
              type="success"
              @click="changeStatus(row, 2, '发布')"
            >
              发布
            </ElButton>
            <ElButton
              v-else-if="Number(row.status) === 2"
              v-permission="'saimulti:tenant:announcement:update'"
              size="small"
              type="warning"
              @click="changeStatus(row, 3, '下线')"
            >
              下线
            </ElButton>
            <ElButton
              v-permission="'saimulti:tenant:announcement:destroy'"
              size="small"
              type="danger"
              @click="deleteRow(row, api.delete, refreshData)"
            >
              删除
            </ElButton>
          </ElSpace>
        </template>
      </ArtTable>
    </ElCard>
    <EditDialog
      v-model="dialogVisible"
      :dialog-type="dialogType"
      :data="dialogData"
      @success="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import { checkAuth } from '@/utils/tool'
  import api from '@/api/announcement'
  import TableSearch from './modules/table-search.vue'
  import EditDialog from './modules/edit-dialog.vue'

  const searchForm = ref({ title: undefined, display_mode: undefined, status: undefined })
  const canEditAnnouncement = computed(() =>
    ['saimulti:tenant:announcement:read', 'saimulti:tenant:announcement:update'].every(checkAuth)
  )
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
        { type: 'selection' },
        { prop: 'id', label: '编号', width: 90, align: 'center' },
        { prop: 'title', label: '标题', minWidth: 180, showOverflowTooltip: true },
        { prop: 'summary', label: '摘要', minWidth: 220, showOverflowTooltip: true },
        { prop: 'displayMode', label: '展示方式', width: 120, useSlot: true },
        { prop: 'priority', label: '优先级', width: 90, sortable: true },
        { prop: 'status', label: '状态', width: 100, useSlot: true },
        { prop: 'start_time', label: '生效时间', width: 180 },
        { prop: 'end_time', label: '结束时间', width: 180 },
        { prop: 'published_at', label: '发布时间', width: 180 },
        { prop: 'operation', label: '操作', width: 330, fixed: 'right', useSlot: true }
      ]
    }
  })
  const {
    dialogType,
    dialogVisible,
    dialogData,
    showDialog,
    deleteRow,
    deleteSelectedRows,
    handleSelectionChange,
    selectedRows
  } = useSaiAdmin()
  const statusLabel = (status: number) =>
    ({ 1: '草稿', 2: '已发布', 3: '已下线' })[Number(status)] || '未知'
  const statusTagType = (status: number) => {
    if (Number(status) === 2) return 'success'
    if (Number(status) === 3) return 'info'
    return 'warning'
  }
  const displayModeLabel = (mode: string) =>
    ({ list: '列表', popup: '弹窗', both: '列表和弹窗' })[mode] || '未知'
  const changeStatus = async (row: Record<string, any>, status: 2 | 3, label: string) => {
    await ElMessageBox.confirm(`确认${label}公告“${row.title}”吗？`, `${label}公告`, {
      type: status === 2 ? 'info' : 'warning'
    })
    await api.update({ id: row.id, status })
    ElMessage.success(`${label}成功`)
    refreshData()
  }
</script>
