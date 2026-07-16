<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElInput
              v-model="searchForm.keyword"
              clearable
              placeholder="内容关键词"
              style="width: 180px"
              @keyup.enter="doSearch"
            />
            <ElButton type="primary" @click="doSearch">搜索</ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>
      <ArtTable
        rowKey="id"
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <template #operation="{ row }">
          <ElButton
            v-permission="'saimulti:tenant:moments:destroy'"
            size="small"
            type="danger"
            @click="remove(row)"
          >
            删除
          </ElButton>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import api from '@/api/moments'

  const searchForm = reactive({ keyword: '' })
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
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'user_id', label: '用户', minWidth: 120 },
        { prop: 'content', label: '内容', minWidth: 220 },
        { prop: 'visibility', label: '可见', width: 100 },
        { prop: 'like_count', label: '赞', width: 70 },
        { prop: 'comment_count', label: '评', width: 70 },
        { prop: 'create_time', label: '时间', minWidth: 160 },
        { prop: 'operation', label: '操作', width: 100, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const doSearch = () => {
    Object.assign(searchParams, { keyword: searchForm.keyword || undefined })
    getData()
  }

  const remove = async (row: Record<string, any>) => {
    await ElMessageBox.confirm('确认删除该动态？', '提示')
    await api.delete({ ids: [row.id] })
    ElMessage.success('已删除')
    refreshData()
  }
</script>
