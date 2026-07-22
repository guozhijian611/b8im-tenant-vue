<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never" style="margin-bottom: 16px">
      <template #header>索引状态</template>
      <ElDescriptions v-if="index" :column="2" border>
        <ElDescriptionsItem label="后端">{{ index.backend }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">{{ index.status }}</ElDescriptionsItem>
        <ElDescriptionsItem label="文档数">{{ index.doc_count }}</ElDescriptionsItem>
        <ElDescriptionsItem label="最近重建">{{ index.last_built_at || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="错误" :span="2">{{
          index.last_error || '-'
        }}</ElDescriptionsItem>
      </ElDescriptions>
      <div style="margin-top: 12px">
        <ElSpace wrap>
          <ElButton
            v-permission="'saimulti:tenant:search:index'"
            type="primary"
            :loading="rebuilding"
            @click="rebuild"
          >
            重建索引
          </ElButton>
          <ElButton @click="load">刷新</ElButton>
        </ElSpace>
      </div>
    </ElCard>

    <ElCard class="art-table-card" shadow="never">
      <template #header>重建任务</template>
      <ArtTable
        rowKey="id"
        :loading="jobLoading"
        :data="jobData"
        :columns="jobColumns"
        :pagination="jobPagination"
        @pagination:size-change="handleJobSizeChange"
        @pagination:current-change="handleJobCurrentChange"
      >
        <template #status="{ row }">
          <ElTag>{{ row.status }}</ElTag>
        </template>
      </ArtTable>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import api from '@/api/search'

  const index = ref<Record<string, any> | null>(null)
  const rebuilding = ref(false)

  const load = async () => {
    index.value = (await api.indexRead()) as any
  }
  onMounted(load)

  const rebuild = async () => {
    rebuilding.value = true
    try {
      await api.rebuild()
      ElMessage.success('重建完成')
      await load()
      refreshJobs()
    } finally {
      rebuilding.value = false
    }
  }

  const {
    columns: jobColumns,
    data: jobData,
    loading: jobLoading,
    pagination: jobPagination,
    handleSizeChange: handleJobSizeChange,
    handleCurrentChange: handleJobCurrentChange,
    refreshData: refreshJobs
  } = useTable({
    core: {
      apiFn: api.jobList,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'job_type', label: '类型', width: 100 },
        { prop: 'status', label: '状态', width: 110, useSlot: true },
        { prop: 'processed', label: '已处理', width: 100 },
        { prop: 'total', label: '总数', width: 90 },
        { prop: 'started_at', label: '开始', minWidth: 160 },
        { prop: 'finished_at', label: '结束', minWidth: 160 }
      ]
    }
  })
</script>
