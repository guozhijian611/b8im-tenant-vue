<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElInput
              v-model="searchForm.keyword"
              clearable
              placeholder="标题/摘要/目标ID"
              style="width: 200px"
              @keyup.enter="doSearch"
            />
            <ElSelect
              v-model="searchForm.target_type"
              clearable
              placeholder="类型"
              style="width: 120px"
              @change="doSearch"
            >
              <ElOption label="消息" value="message" />
              <ElOption label="文件" value="file" />
              <ElOption label="链接" value="link" />
              <ElOption label="文本" value="text" />
            </ElSelect>
            <ElButton type="primary" @click="doSearch">搜索</ElButton>
            <ElButton
              v-permission="'saimulti:tenant:favorite:destroy'"
              :disabled="selectedRows.length === 0"
              @click="deleteSelectedRows(api.delete, refreshData)"
            >
              删除
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #target_type="{ row }">{{ typeLabel(row.target_type) }}</template>
        <template #operation="{ row }">
          <ElSpace wrap>
            <ElButton
              v-permission="'saimulti:tenant:favorite:read'"
              size="small"
              @click="showDetail(row)"
            >
              详情
            </ElButton>
            <ElButton
              v-permission="'saimulti:tenant:favorite:destroy'"
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

    <ElDialog v-model="detailVisible" title="收藏详情" width="640px" align-center>
      <ElDescriptions v-if="detail" :column="1" border>
        <ElDescriptionsItem label="编号">{{ detail.id }}</ElDescriptionsItem>
                <ElDescriptionsItem label="用户">{{ detail.user_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="类型">{{ typeLabel(detail.target_type) }}</ElDescriptionsItem>
        <ElDescriptionsItem label="目标ID">{{ detail.target_id }}</ElDescriptionsItem>
        <ElDescriptionsItem label="标题">{{ detail.title }}</ElDescriptionsItem>
        <ElDescriptionsItem label="摘要">{{ detail.summary }}</ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">{{ detail.create_time }}</ElDescriptionsItem>
      </ElDescriptions>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import api from '@/api/favorite'

  const searchForm = reactive({
    keyword: '',
    target_type: undefined as string | undefined,
      })

  const {
    columns,
    columnChecks,
    data,
    loading,
    getData,
    searchParams,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: api.list,
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: '编号', width: 90, align: 'center' },
                { prop: 'user_id', label: '用户', minWidth: 120 },
        { prop: 'target_type', label: '类型', width: 100, useSlot: true },
        { prop: 'target_id', label: '目标ID', minWidth: 140, showOverflowTooltip: true },
        { prop: 'title', label: '标题', minWidth: 160, showOverflowTooltip: true },
        { prop: 'summary', label: '摘要', minWidth: 180, showOverflowTooltip: true },
        { prop: 'create_time', label: '时间', width: 170 },
        { prop: 'operation', label: '操作', width: 160, fixed: 'right', useSlot: true }
      ]
    }
  })

  const { deleteRow, deleteSelectedRows, handleSelectionChange, selectedRows } = useSaiAdmin()

  const typeLabel = (t: string) =>
    ({ message: '消息', file: '文件', link: '链接', text: '文本' })[t] || t

  const doSearch = () => {
    Object.assign(searchParams, {
      keyword: searchForm.keyword || undefined,
      target_type: searchForm.target_type || undefined,
          })
    getData()
  }

  const detailVisible = ref(false)
  const detail = ref<Record<string, any> | null>(null)
  const showDetail = async (row: Record<string, any>) => {
    const res: any = await api.read(row.id)
    detail.value = res?.data || res || row
    detailVisible.value = true
  }
</script>
