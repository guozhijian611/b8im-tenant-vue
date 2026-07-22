<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="机器人" name="robot">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:save'"
                  @click="showDialog('add')"
                >
                  新增机器人
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:destroy'"
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
            <template #status="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:update'"
                  size="small"
                  @click="showDialog('edit', row)"
                >
                  编辑
                </ElButton>
                <ElButton size="small" @click="openRules(row)">规则</ElButton>
                <ElButton size="small" @click="openKb(row)">知识库</ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:destroy'"
                  size="small"
                  type="danger"
                  @click="deleteRow(row, api.delete, refreshData)"
                >
                  删除
                </ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>

        <ElTabPane label="自动回复" name="rule" :disabled="!currentRobotId">
          <ArtTableHeader
            v-model:columns="ruleColumnChecks"
            :loading="ruleLoading"
            @refresh="refreshRules"
          >
            <template #left>
              <ElSpace wrap>
                <span v-if="currentRobotName">当前：{{ currentRobotName }}</span>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:rule'"
                  @click="showRuleDialog('add')"
                >
                  新增规则
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>
          <ArtTable
            rowKey="id"
            :loading="ruleLoading"
            :data="ruleData"
            :columns="ruleColumns"
            :pagination="rulePagination"
            @pagination:size-change="handleRuleSizeChange"
            @pagination:current-change="handleRuleCurrentChange"
          >
            <template #status="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton size="small" @click="showRuleDialog('edit', row)">编辑</ElButton>
                <ElButton size="small" type="danger" @click="deleteRule(row)">删除</ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>

        <ElTabPane label="知识库" name="kb" :disabled="!currentRobotId">
          <ArtTableHeader
            v-model:columns="kbColumnChecks"
            :loading="kbLoading"
            @refresh="refreshKb"
          >
            <template #left>
              <ElSpace wrap>
                <span v-if="currentRobotName">当前：{{ currentRobotName }}</span>
                <ElButton
                  v-permission="'saimulti:tenant:robot_single:kb'"
                  @click="showKbDialog('add')"
                >
                  新增条目
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>
          <ArtTable
            rowKey="id"
            :loading="kbLoading"
            :data="kbData"
            :columns="kbColumns"
            :pagination="kbPagination"
            @pagination:size-change="handleKbSizeChange"
            @pagination:current-change="handleKbCurrentChange"
          >
            <template #status="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton size="small" @click="showKbDialog('edit', row)">编辑</ElButton>
                <ElButton size="small" type="danger" @click="deleteKb(row)">删除</ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增机器人' : '编辑机器人'"
      width="560px"
      align-center
    >
      <ElForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <ElFormItem label="编码" prop="code">
          <ElInput v-model="formData.code" :disabled="dialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="formData.name" />
        </ElFormItem>
        <ElFormItem label="欢迎语" prop="welcome_text">
          <ElInput v-model="formData.welcome_text" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="兜底回复" prop="fallback_text">
          <ElInput v-model="formData.fallback_text" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="描述" prop="description">
          <ElInput v-model="formData.description" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="formData.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitRobot">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="ruleDialogVisible"
      :title="ruleDialogType === 'add' ? '新增规则' : '编辑规则'"
      width="560px"
      align-center
    >
      <ElForm ref="ruleFormRef" :model="ruleForm" :rules="ruleRules" label-width="100px">
        <ElFormItem label="关键词" prop="keyword">
          <ElInput v-model="ruleForm.keyword" />
        </ElFormItem>
        <ElFormItem label="匹配" prop="match_mode">
          <ElSelect v-model="ruleForm.match_mode" style="width: 100%">
            <ElOption label="包含" value="contains" />
            <ElOption label="精确" value="exact" />
            <ElOption label="前缀" value="prefix" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="回复" prop="reply_text">
          <ElInput v-model="ruleForm.reply_text" type="textarea" :rows="3" />
        </ElFormItem>
        <ElFormItem label="优先级" prop="priority">
          <ElInputNumber v-model="ruleForm.priority" :min="0" controls-position="right" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="ruleForm.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="ruleDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="ruleSaving" @click="submitRule">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="kbDialogVisible"
      :title="kbDialogType === 'add' ? '新增知识库' : '编辑知识库'"
      width="560px"
      align-center
    >
      <ElForm ref="kbFormRef" :model="kbForm" :rules="kbRules" label-width="100px">
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="kbForm.title" />
        </ElFormItem>
        <ElFormItem label="内容" prop="content">
          <ElInput v-model="kbForm.content" type="textarea" :rows="4" />
        </ElFormItem>
        <ElFormItem label="标签" prop="tags">
          <ElInput v-model="kbForm.tags" placeholder="逗号分隔" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="kbForm.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="kbDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="kbSaving" @click="submitKb">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import api from '@/api/robot-single'

  const activeTab = ref('robot')
  const { selectedRows, handleSelectionChange, deleteSelectedRows, deleteRow } = useSaiAdmin()

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: api.list,
      columnsFactory: () => [
        { type: 'selection' },
        { prop: 'id', label: '编号', width: 80, align: 'center' },
        { prop: 'code', label: '编码', minWidth: 120 },
        { prop: 'name', label: '名称', minWidth: 140 },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'create_time', label: '创建时间', minWidth: 160 },
        { prop: 'operation', label: '操作', width: 260, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const currentRobotId = ref<number | null>(null)
  const currentRobotName = ref('')

  const dialogVisible = ref(false)
  const dialogType = ref<'add' | 'edit'>('add')
  const saving = ref(false)
  const formRef = ref<FormInstance>()
  const formData = reactive({
    id: 0,
    code: '',
    name: '',
    welcome_text: '',
    fallback_text: '',
    description: '',
    status: 1
  })
  const rules: FormRules = {
    code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
  }

  const showDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    dialogType.value = type
    Object.assign(formData, {
      id: row?.id ?? 0,
      code: row?.code ?? '',
      name: row?.name ?? '',
      welcome_text: row?.welcome_text ?? '',
      fallback_text: row?.fallback_text ?? '',
      description: row?.description ?? '',
      status: row?.status ?? 1
    })
    dialogVisible.value = true
  }

  const submitRobot = async () => {
    await formRef.value?.validate()
    saving.value = true
    try {
      if (dialogType.value === 'add') {
        await api.create({ ...formData })
      } else {
        await api.update({ ...formData })
      }
      ElMessage.success('保存成功')
      dialogVisible.value = false
      refreshData()
    } finally {
      saving.value = false
    }
  }

  // rules
  const {
    columns: ruleColumns,
    columnChecks: ruleColumnChecks,
    data: ruleData,
    loading: ruleLoading,
    getData: getRuleData,
    searchParams: ruleSearchParams,
    pagination: rulePagination,
    handleSizeChange: handleRuleSizeChange,
    handleCurrentChange: handleRuleCurrentChange,
    refreshData: refreshRules
  } = useTable({
    core: {
      apiFn: api.ruleList,
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'keyword', label: '关键词', minWidth: 120 },
        { prop: 'match_mode', label: '匹配', width: 100 },
        { prop: 'reply_text', label: '回复', minWidth: 180 },
        { prop: 'priority', label: '优先级', width: 90 },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'operation', label: '操作', width: 160, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const openRules = (row: Record<string, any>) => {
    currentRobotId.value = Number(row.id)
    currentRobotName.value = String(row.name || row.code)
    ruleSearchParams.robot_id = row.id
    activeTab.value = 'rule'
    getRuleData()
  }

  const ruleDialogVisible = ref(false)
  const ruleDialogType = ref<'add' | 'edit'>('add')
  const ruleSaving = ref(false)
  const ruleFormRef = ref<FormInstance>()
  const ruleForm = reactive({
    id: 0,
    robot_id: 0,
    keyword: '',
    match_mode: 'contains',
    reply_text: '',
    priority: 0,
    status: 1
  })
  const ruleRules: FormRules = {
    keyword: [{ required: true, message: '请输入关键词', trigger: 'blur' }],
    reply_text: [{ required: true, message: '请输入回复', trigger: 'blur' }]
  }

  const showRuleDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    ruleDialogType.value = type
    Object.assign(ruleForm, {
      id: row?.id ?? 0,
      robot_id: currentRobotId.value,
      keyword: row?.keyword ?? '',
      match_mode: row?.match_mode ?? 'contains',
      reply_text: row?.reply_text ?? '',
      priority: row?.priority ?? 0,
      status: row?.status ?? 1
    })
    ruleDialogVisible.value = true
  }

  const submitRule = async () => {
    await ruleFormRef.value?.validate()
    ruleSaving.value = true
    try {
      if (ruleDialogType.value === 'add') {
        await api.ruleCreate({ ...ruleForm })
      } else {
        await api.ruleUpdate({ ...ruleForm })
      }
      ElMessage.success('保存成功')
      ruleDialogVisible.value = false
      refreshRules()
    } finally {
      ruleSaving.value = false
    }
  }

  const deleteRule = async (row: Record<string, any>) => {
    await api.ruleDelete({ ids: [row.id] })
    ElMessage.success('已删除')
    refreshRules()
  }

  // kb
  const {
    columns: kbColumns,
    columnChecks: kbColumnChecks,
    data: kbData,
    loading: kbLoading,
    getData: getKbData,
    searchParams: kbSearchParams,
    pagination: kbPagination,
    handleSizeChange: handleKbSizeChange,
    handleCurrentChange: handleKbCurrentChange,
    refreshData: refreshKb
  } = useTable({
    core: {
      apiFn: api.kbList,
      immediate: false,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'title', label: '标题', minWidth: 140 },
        { prop: 'tags', label: '标签', minWidth: 120 },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'operation', label: '操作', width: 160, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const openKb = (row: Record<string, any>) => {
    currentRobotId.value = Number(row.id)
    currentRobotName.value = String(row.name || row.code)
    kbSearchParams.robot_id = row.id
    activeTab.value = 'kb'
    getKbData()
  }

  const kbDialogVisible = ref(false)
  const kbDialogType = ref<'add' | 'edit'>('add')
  const kbSaving = ref(false)
  const kbFormRef = ref<FormInstance>()
  const kbForm = reactive({
    id: 0,
    robot_id: 0,
    title: '',
    content: '',
    tags: '',
    status: 1
  })
  const kbRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
  }

  const showKbDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    kbDialogType.value = type
    Object.assign(kbForm, {
      id: row?.id ?? 0,
      robot_id: currentRobotId.value,
      title: row?.title ?? '',
      content: row?.content ?? '',
      tags: row?.tags ?? '',
      status: row?.status ?? 1
    })
    kbDialogVisible.value = true
  }

  const submitKb = async () => {
    await kbFormRef.value?.validate()
    kbSaving.value = true
    try {
      if (kbDialogType.value === 'add') {
        await api.kbCreate({ ...kbForm })
      } else {
        await api.kbUpdate({ ...kbForm })
      }
      ElMessage.success('保存成功')
      kbDialogVisible.value = false
      refreshKb()
    } finally {
      kbSaving.value = false
    }
  }

  const deleteKb = async (row: Record<string, any>) => {
    await api.kbDelete({ ids: [row.id] })
    ElMessage.success('已删除')
    refreshKb()
  }
</script>
