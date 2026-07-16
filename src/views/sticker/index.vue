<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="表情包" name="pack">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton v-permission="'saimulti:tenant:sticker:save'" @click="showDialog('add')">
                  新增表情包
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:sticker:destroy'"
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
                  v-permission="'saimulti:tenant:sticker:update'"
                  size="small"
                  @click="showDialog('edit', row)"
                >
                  编辑
                </ElButton>
                <ElButton size="small" @click="openItems(row)">表情项</ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:sticker:destroy'"
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
        <ElTabPane label="表情项" name="item" :disabled="!currentPackId">
          <ArtTableHeader
            v-model:columns="itemColumnChecks"
            :loading="itemLoading"
            @refresh="refreshItems"
          >
            <template #left>
              <ElSpace wrap>
                <span v-if="currentPackName">当前包：{{ currentPackName }}</span>
                <ElButton v-permission="'saimulti:tenant:sticker:item'" @click="showItemDialog('add')">
                  新增表情
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>
          <ArtTable
            rowKey="id"
            :loading="itemLoading"
            :data="itemData"
            :columns="itemColumns"
            :pagination="itemPagination"
            @pagination:size-change="handleItemSizeChange"
            @pagination:current-change="handleItemCurrentChange"
          >
            <template #status="{ row }">
              <ElTag :type="Number(row.status) === 1 ? 'success' : 'info'">
                {{ Number(row.status) === 1 ? '启用' : '停用' }}
              </ElTag>
            </template>
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:sticker:item'"
                  size="small"
                  @click="showItemDialog('edit', row)"
                >
                  编辑
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:sticker:item'"
                  size="small"
                  type="danger"
                  @click="deleteItem(row)"
                >
                  删除
                </ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增表情包' : '编辑表情包'"
      width="520px"
      align-center
    >
      <ElForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <ElFormItem label="编码" prop="code">
          <ElInput v-model="formData.code" :disabled="dialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="formData.name" />
        </ElFormItem>
        <ElFormItem label="描述" prop="description">
          <ElInput v-model="formData.description" type="textarea" :rows="2" />
        </ElFormItem>
        <ElFormItem label="排序" prop="sort">
          <ElInputNumber v-model="formData.sort" :min="0" controls-position="right" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="formData.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitPack">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="itemDialogVisible"
      :title="itemDialogType === 'add' ? '新增表情' : '编辑表情'"
      width="520px"
      align-center
    >
      <ElForm ref="itemFormRef" :model="itemForm" :rules="itemRules" label-width="100px">
        <ElFormItem label="编码" prop="code">
          <ElInput v-model="itemForm.code" :disabled="itemDialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="itemForm.name" />
        </ElFormItem>
        <ElFormItem label="file_id" prop="file_id">
          <ElInput v-model="itemForm.file_id" placeholder="可选，私有附件 file_id" />
        </ElFormItem>
        <ElFormItem label="排序" prop="sort">
          <ElInputNumber v-model="itemForm.sort" :min="0" controls-position="right" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="itemForm.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="itemDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="itemSaving" @click="submitItem">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import api from '@/api/sticker'

  const activeTab = ref('pack')
  const {
    columns,
    columnChecks,
    data,
    loading,
    getData,
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
        { prop: 'code', label: '编码', width: 140 },
        { prop: 'name', label: '名称', minWidth: 140 },
        { prop: 'description', label: '描述', minWidth: 180, showOverflowTooltip: true },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'sort', label: '排序', width: 90 },
        { prop: 'operation', label: '操作', width: 240, fixed: 'right', useSlot: true }
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

  const formRef = ref<FormInstance>()
  const saving = ref(false)
  const formData = reactive({
    id: 0,
    code: '',
    name: '',
    description: '',
    sort: 0,
    status: 1
  })
  const rules: FormRules = {
    code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
  }

  watch(dialogVisible, (open) => {
    if (!open) return
    if (dialogType.value === 'add') {
      Object.assign(formData, { id: 0, code: '', name: '', description: '', sort: 0, status: 1 })
    } else {
      Object.assign(formData, {
        id: Number(dialogData.value?.id || 0),
        code: String(dialogData.value?.code || ''),
        name: String(dialogData.value?.name || ''),
        description: String(dialogData.value?.description || ''),
        sort: Number(dialogData.value?.sort || 0),
        status: Number(dialogData.value?.status ?? 1)
      })
    }
  })

  const submitPack = async () => {
    await formRef.value?.validate()
    saving.value = true
    try {
      if (dialogType.value === 'add') await api.save({ ...formData })
      else await api.update({ ...formData })
      ElMessage.success('保存成功')
      dialogVisible.value = false
      refreshData()
    } finally {
      saving.value = false
    }
  }

  const currentPackId = ref<number | undefined>()
  const currentPackName = ref('')
  const openItems = (row: Record<string, any>) => {
    currentPackId.value = Number(row.id)
    currentPackName.value = String(row.name || row.code)
    activeTab.value = 'item'
    Object.assign(itemSearchParams, { pack_id: currentPackId.value })
    getItemData()
  }

  const {
    columns: itemColumns,
    columnChecks: itemColumnChecks,
    data: itemData,
    loading: itemLoading,
    getData: getItemData,
    searchParams: itemSearchParams,
    pagination: itemPagination,
    handleSizeChange: handleItemSizeChange,
    handleCurrentChange: handleItemCurrentChange,
    refreshData: refreshItems
  } = useTable({
    core: {
      apiFn: (params: Record<string, any>) =>
        api.itemList({ ...params, pack_id: currentPackId.value }),
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 90, align: 'center' },
        { prop: 'code', label: '编码', width: 140 },
        { prop: 'name', label: '名称', minWidth: 120 },
        { prop: 'file_id', label: 'file_id', minWidth: 140, showOverflowTooltip: true },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'sort', label: '排序', width: 90 },
        { prop: 'operation', label: '操作', width: 160, fixed: 'right', useSlot: true }
      ]
    }
  })

  const itemDialogVisible = ref(false)
  const itemDialogType = ref<'add' | 'edit'>('add')
  const itemSaving = ref(false)
  const itemFormRef = ref<FormInstance>()
  const itemForm = reactive({
    id: 0,
    pack_id: 0,
    code: '',
    name: '',
    file_id: '',
    sort: 0,
    status: 1
  })
  const itemRules: FormRules = {
    code: [{ required: true, message: '请输入编码', trigger: 'blur' }]
  }

  const showItemDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    itemDialogType.value = type
    if (type === 'add') {
      Object.assign(itemForm, {
        id: 0,
        pack_id: currentPackId.value || 0,
        code: '',
        name: '',
        file_id: '',
        sort: 0,
        status: 1
      })
    } else {
      Object.assign(itemForm, {
        id: Number(row?.id || 0),
        pack_id: Number(row?.pack_id || currentPackId.value || 0),
        code: String(row?.code || ''),
        name: String(row?.name || ''),
        file_id: String(row?.file_id || ''),
        sort: Number(row?.sort || 0),
        status: Number(row?.status ?? 1)
      })
    }
    itemDialogVisible.value = true
  }

  const submitItem = async () => {
    await itemFormRef.value?.validate()
    itemSaving.value = true
    try {
      if (itemDialogType.value === 'add') await api.itemSave({ ...itemForm })
      else await api.itemUpdate({ ...itemForm })
      ElMessage.success('保存成功')
      itemDialogVisible.value = false
      refreshItems()
    } finally {
      itemSaving.value = false
    }
  }

  const deleteItem = async (row: Record<string, any>) => {
    await ElMessageBox.confirm(`确认删除表情「${row.code}」吗？`, '删除表情', { type: 'warning' })
    await api.itemDelete({ ids: [row.id] })
    ElMessage.success('删除成功')
    refreshItems()
  }
</script>
