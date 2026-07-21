<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="语言目录" name="locale">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:save'"
                  @click="showDialog('add')"
                  v-ripple
                >
                  <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
                  新增语言
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:destroy'"
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
            <template #is_default="{ row }">
              <ElTag v-if="Number(row.is_default) === 1" type="warning">默认</ElTag>
              <span v-else>—</span>
            </template>
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:update'"
                  size="small"
                  @click="showDialog('edit', row)"
                >
                  编辑
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:destroy'"
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
        <ElTabPane label="词条" name="entry">
          <ArtTableHeader
            v-model:columns="entryColumnChecks"
            :loading="entryLoading"
            @refresh="refreshEntry"
          >
            <template #left>
              <ElSpace wrap>
                <ElSelect
                  v-model="entryLocale"
                  placeholder="语言"
                  clearable
                  style="width: 140px"
                  @change="refreshEntry"
                >
                  <ElOption
                    v-for="item in localeOptions"
                    :key="item.code"
                    :label="`${item.name} (${item.code})`"
                    :value="item.code"
                  />
                </ElSelect>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:entry'"
                  @click="showEntryDialog('add')"
                  v-ripple
                >
                  <template #icon><ArtSvgIcon icon="ri:add-fill" /></template>
                  新增词条
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>
          <ArtTable
            rowKey="id"
            :loading="entryLoading"
            :data="entryData"
            :columns="entryColumns"
            :pagination="entryPagination"
            @pagination:size-change="handleEntrySizeChange"
            @pagination:current-change="handleEntryCurrentChange"
          >
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:entry'"
                  size="small"
                  @click="showEntryDialog('edit', row)"
                >
                  编辑
                </ElButton>
                <ElButton
                  v-permission="'saimulti:tenant:i18n:entry'"
                  size="small"
                  type="danger"
                  @click="deleteEntry(row)"
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
      :title="dialogType === 'add' ? '新增语言' : '编辑语言'"
      width="520px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm ref="formRef" :model="formData" :rules="rules" label-width="100px">
        <ElFormItem label="语言代码" prop="code">
          <ElInput v-model="formData.code" :disabled="dialogType === 'edit'" placeholder="zh-CN" />
        </ElFormItem>
        <ElFormItem label="显示名称" prop="name">
          <ElInput v-model="formData.name" maxlength="100" />
        </ElFormItem>
        <ElFormItem label="排序" prop="sort">
          <ElInputNumber v-model="formData.sort" :min="0" controls-position="right" />
        </ElFormItem>
        <ElFormItem label="状态" prop="status">
          <ElSwitch v-model="formData.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="默认语言" prop="is_default">
          <ElSwitch v-model="formData.is_default" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitLocale">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="entryDialogVisible"
      :title="entryDialogType === 'add' ? '新增词条' : '编辑词条'"
      width="560px"
      align-center
      :close-on-click-modal="false"
    >
      <ElForm ref="entryFormRef" :model="entryForm" :rules="entryRules" label-width="100px">
        <ElFormItem label="语言" prop="locale_code">
          <ElSelect v-model="entryForm.locale_code" style="width: 100%">
            <ElOption
              v-for="item in localeOptions"
              :key="item.code"
              :label="`${item.name} (${item.code})`"
              :value="item.code"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="词条键" prop="msg_key">
          <ElInput v-model="entryForm.msg_key" :disabled="entryDialogType === 'edit'" />
        </ElFormItem>
        <ElFormItem label="词条值" prop="msg_value">
          <ElInput v-model="entryForm.msg_value" type="textarea" :rows="4" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="entryDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="entrySaving" @click="submitEntry">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import { useSaiAdmin } from '@/composables/useSaiAdmin'
  import api from '@/api/i18n'

  const activeTab = ref('locale')
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
        { prop: 'id', label: '编号', width: 90, align: 'center' },
        { prop: 'code', label: '代码', width: 120 },
        { prop: 'name', label: '名称', minWidth: 140 },
        { prop: 'is_default', label: '默认', width: 90, useSlot: true },
        { prop: 'status', label: '状态', width: 90, useSlot: true },
        { prop: 'sort', label: '排序', width: 90 },
        { prop: 'operation', label: '操作', width: 180, fixed: 'right', useSlot: true }
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
    sort: 0,
    status: 1,
    is_default: 0
  })
  const rules: FormRules = {
    code: [{ required: true, message: '请输入语言代码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
  }

  watch(dialogVisible, (open) => {
    if (!open) return
    if (dialogType.value === 'add') {
      Object.assign(formData, { id: 0, code: '', name: '', sort: 0, status: 1, is_default: 0 })
    } else {
      Object.assign(formData, {
        id: Number(dialogData.value?.id || 0),
        code: String(dialogData.value?.code || ''),
        name: String(dialogData.value?.name || ''),
        sort: Number(dialogData.value?.sort || 0),
        status: Number(dialogData.value?.status ?? 1),
        is_default: Number(dialogData.value?.is_default ?? 0)
      })
    }
  })

  const submitLocale = async () => {
    await formRef.value?.validate()
    saving.value = true
    try {
      if (dialogType.value === 'add') {
        await api.save({ ...formData })
      } else {
        await api.update({ ...formData })
      }
      ElMessage.success('保存成功')
      dialogVisible.value = false
      refreshData()
      await loadLocaleOptions()
    } finally {
      saving.value = false
    }
  }

  const localeOptions = ref<Array<{ code: string; name: string }>>([])
  const loadLocaleOptions = async () => {
    const res = await api.list({ page: 1, limit: 100, status: 1 })
    const list = (res as any)?.data || (res as any) || []
    const rows = Array.isArray(list) ? list : list.data || []
    localeOptions.value = rows.map((r: any) => ({ code: r.code, name: r.name }))
  }
  onMounted(loadLocaleOptions)

  const entryLocale = ref<string | undefined>()
  const {
    columns: entryColumns,
    columnChecks: entryColumnChecks,
    data: entryData,
    loading: entryLoading,
    getData: getEntryData,
    searchParams: entrySearchParams,
    pagination: entryPagination,
    handleSizeChange: handleEntrySizeChange,
    handleCurrentChange: handleEntryCurrentChange,
    refreshData: refreshEntry
  } = useTable({
    core: {
      apiFn: (params: Record<string, any>) =>
        api.entryList({ ...params, locale_code: entryLocale.value }),
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 90, align: 'center' },
        { prop: 'locale_code', label: '语言', width: 120 },
        { prop: 'msg_key', label: '词条键', minWidth: 180 },
        { prop: 'msg_value', label: '词条值', minWidth: 220, showOverflowTooltip: true },
        { prop: 'operation', label: '操作', width: 160, fixed: 'right', useSlot: true }
      ]
    }
  })

  watch(entryLocale, () => {
    Object.assign(entrySearchParams, { locale_code: entryLocale.value })
    getEntryData()
  })

  const entryDialogVisible = ref(false)
  const entryDialogType = ref<'add' | 'edit'>('add')
  const entrySaving = ref(false)
  const entryFormRef = ref<FormInstance>()
  const entryForm = reactive({
    id: 0,
    locale_code: '',
    msg_key: '',
    msg_value: ''
  })
  const entryRules: FormRules = {
    locale_code: [{ required: true, message: '请选择语言', trigger: 'change' }],
    msg_key: [{ required: true, message: '请输入词条键', trigger: 'blur' }],
    msg_value: [{ required: true, message: '请输入词条值', trigger: 'blur' }]
  }

  const showEntryDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    entryDialogType.value = type
    if (type === 'add') {
      Object.assign(entryForm, {
        id: 0,
        locale_code: entryLocale.value || localeOptions.value[0]?.code || '',
        msg_key: '',
        msg_value: ''
      })
    } else {
      Object.assign(entryForm, {
        id: Number(row?.id || 0),
        locale_code: String(row?.locale_code || ''),
        msg_key: String(row?.msg_key || ''),
        msg_value: String(row?.msg_value || '')
      })
    }
    entryDialogVisible.value = true
  }

  const submitEntry = async () => {
    await entryFormRef.value?.validate()
    entrySaving.value = true
    try {
      if (entryDialogType.value === 'add') {
        await api.entrySave({ ...entryForm })
      } else {
        await api.entryUpdate({ ...entryForm })
      }
      ElMessage.success('保存成功')
      entryDialogVisible.value = false
      refreshEntry()
    } finally {
      entrySaving.value = false
    }
  }

  const deleteEntry = async (row: Record<string, any>) => {
    await ElMessageBox.confirm(`确认删除词条「${row.msg_key}」吗？`, '删除词条', {
      type: 'warning'
    })
    await api.entryDelete({ ids: [row.id] })
    ElMessage.success('删除成功')
    refreshEntry()
  }
</script>
