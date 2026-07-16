<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="tab">
        <ElTabPane label="会话" name="conversation">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSelect v-model="status" clearable placeholder="状态" style="width: 120px" @change="doSearch">
                <ElOption label="排队中" value="queued" />
                <ElOption label="已分配" value="assigned" />
                <ElOption label="进行中" value="active" />
                <ElOption label="已关闭" value="closed" />
              </ElSelect>
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
            <template #status="{ row }">{{ statusLabel(row.status) }}</template>
            <template #operation="{ row }">
              <ElSpace>
                <ElButton size="small" @click="assign(row)">分配给我</ElButton>
                <ElButton size="small" type="warning" @click="closeConv(row)">关闭</ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>
        <ElTabPane label="队列" name="queue">
          <ElButton class="mb-3" type="primary" @click="createQueue">新增默认队列</ElButton>
          <ElTable :data="queues" v-loading="queueLoading">
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="code" label="编码" />
            <ElTableColumn prop="name" label="名称" />
            <ElTableColumn prop="status" label="状态" width="90" />
          </ElTable>
        </ElTabPane>
        <ElTabPane label="入口" name="entry">
          <ElButton class="mb-3" type="primary" @click="createEntry">新增入口</ElButton>
          <ElTable :data="entries" v-loading="entryLoading">
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="public_entry_code" label="公开编码" />
            <ElTableColumn prop="name" label="名称" />
            <ElTableColumn prop="queue_id" label="队列ID" width="100" />
            <ElTableColumn prop="status" label="状态" width="90" />
          </ElTable>
        </ElTabPane>
        <ElTabPane label="坐席" name="agent">
          <ElButton class="mb-3" type="primary" @click="createAgent">新增坐席</ElButton>
          <ElTable :data="agents" v-loading="agentLoading">
            <ElTableColumn prop="id" label="ID" width="80" />
            <ElTableColumn prop="user_id" label="用户" />
            <ElTableColumn prop="display_name" label="显示名" />
            <ElTableColumn prop="online_status" label="在线" width="100" />
            <ElTableColumn prop="status" label="状态" width="90" />
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import api from '@/api/customer-service'

  const tab = ref('conversation')
  const status = ref<string | undefined>()
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
      apiFn: api.conversationList,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 90 },
        { prop: 'conversation_no', label: '会话号', minWidth: 160 },
        { prop: 'customer_subject_id', label: '客户', minWidth: 120 },
        { prop: 'status', label: '状态', width: 100, useSlot: true },
        { prop: 'agent_id', label: '坐席', width: 90 },
        { prop: 'subject', label: '主题', minWidth: 140, showOverflowTooltip: true },
        { prop: 'queued_at', label: '入队', width: 170 },
        { prop: 'operation', label: '操作', width: 200, fixed: 'right', useSlot: true }
      ]
    }
  })

  const statusLabel = (s: string) =>
    ({ queued: '排队中', assigned: '已分配', active: '进行中', closed: '已关闭' })[s] || s

  const doSearch = () => {
    Object.assign(searchParams, { status: status.value || undefined })
    getData()
  }

  const assign = async (row: Record<string, any>) => {
    const { value } = await ElMessageBox.prompt('输入坐席 agent_id', '分配会话')
    await api.conversationUpdate({ id: row.id, agent_id: Number(value), status: 'assigned' })
    ElMessage.success('已分配')
    refreshData()
  }

  const closeConv = async (row: Record<string, any>) => {
    await api.conversationUpdate({ id: row.id, status: 'closed', close_reason: 'tenant_close' })
    ElMessage.success('已关闭')
    refreshData()
  }

  const queues = ref<any[]>([])
  const queueLoading = ref(false)
  const loadQueues = async () => {
    queueLoading.value = true
    try {
      const res: any = await api.queueList({ page: 1, limit: 100 })
      queues.value = res?.data?.data || res?.data || []
    } finally {
      queueLoading.value = false
    }
  }
  const createQueue = async () => {
    await api.queueSave({ code: 'default', name: '默认队列', status: 1 })
    ElMessage.success('已创建')
    loadQueues()
  }

  const entries = ref<any[]>([])
  const entryLoading = ref(false)
  const loadEntries = async () => {
    entryLoading.value = true
    try {
      const res: any = await api.entryList({ page: 1, limit: 100 })
      entries.value = res?.data?.data || res?.data || []
    } finally {
      entryLoading.value = false
    }
  }
  const createEntry = async () => {
    await loadQueues()
    const qid = queues.value[0]?.id
    if (!qid) {
      ElMessage.warning('请先创建队列')
      return
    }
    const code = 'entry_' + Date.now().toString(36)
    await api.entrySave({ public_entry_code: code, name: '默认入口', queue_id: qid, status: 1 })
    ElMessage.success('已创建入口 ' + code)
    loadEntries()
  }

  const agents = ref<any[]>([])
  const agentLoading = ref(false)
  const loadAgents = async () => {
    agentLoading.value = true
    try {
      const res: any = await api.agentList({ page: 1, limit: 100 })
      agents.value = res?.data?.data || res?.data || []
    } finally {
      agentLoading.value = false
    }
  }
  const createAgent = async () => {
    const { value } = await ElMessageBox.prompt('坐席 user_id', '新增坐席')
    await api.agentSave({ user_id: value, display_name: value, status: 1, online_status: 'online' })
    ElMessage.success('已创建')
    loadAgents()
  }

  watch(tab, (t) => {
    if (t === 'queue') loadQueues()
    if (t === 'entry') loadEntries()
    if (t === 'agent') loadAgents()
  })
</script>
