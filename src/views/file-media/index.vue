<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never" style="margin-bottom: 16px">
      <template #header>存储配额</template>
      <ElDescriptions v-if="quota" :column="2" border>
        <ElDescriptionsItem label="已用/上限">
          {{ formatBytes(quota.used_storage_bytes) }} /
          {{ formatBytes(quota.max_storage_bytes) }}
          ({{ Math.round(Number(quota.usage_ratio || 0) * 100) }}%)
        </ElDescriptionsItem>
        <ElDescriptionsItem label="文件数">{{ quota.used_file_count }}</ElDescriptionsItem>
        <ElDescriptionsItem label="单文件上限">
          {{ formatBytes(quota.max_file_bytes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="大文件/预览">
          {{ Number(quota.large_file_enabled) === 1 ? '开' : '关' }} /
          {{ Number(quota.preview_enabled) === 1 ? '开' : '关' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <div style="margin-top: 12px">
        <ElButton
          v-permission="'saimulti:tenant:file_media:quota'"
          type="primary"
          @click="openQuota"
        >
          编辑策略
        </ElButton>
      </div>
    </ElCard>

    <ElCard class="art-table-card" shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="目录" name="folder">
          <ArtTableHeader
            v-model:columns="folderColumnChecks"
            :loading="folderLoading"
            @refresh="refreshFolders"
          >
            <template #left>
              <ElButton
                v-permission="'saimulti:tenant:file_media:space'"
                @click="showFolderDialog('add')"
              >
                新建目录
              </ElButton>
            </template>
          </ArtTableHeader>
          <ArtTable
            rowKey="id"
            :loading="folderLoading"
            :data="folderData"
            :columns="folderColumns"
            :pagination="folderPagination"
            @pagination:size-change="handleFolderSizeChange"
            @pagination:current-change="handleFolderCurrentChange"
          >
            <template #operation="{ row }">
              <ElSpace wrap>
                <ElButton size="small" @click="showFolderDialog('edit', row)">编辑</ElButton>
                <ElButton size="small" type="danger" @click="deleteFolder(row)">删除</ElButton>
              </ElSpace>
            </template>
          </ArtTable>
        </ElTabPane>
        <ElTabPane label="文件" name="item">
          <ArtTableHeader
            v-model:columns="itemColumnChecks"
            :loading="itemLoading"
            @refresh="refreshItems"
          >
            <template #left>
              <ElButton v-permission="'saimulti:tenant:file_media:space'" @click="showItemDialog">
                登记文件
              </ElButton>
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
            <template #size="{ row }">{{ formatBytes(row.size_bytes) }}</template>
            <template #operation="{ row }">
              <ElButton size="small" type="danger" @click="deleteItem(row)">删除</ElButton>
            </template>
          </ArtTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog v-model="quotaVisible" title="编辑配额策略" width="520px" align-center>
      <ElForm :model="quotaForm" label-width="140px">
        <ElFormItem label="存储上限(字节)">
          <ElInput v-model="quotaForm.max_storage_bytes" />
        </ElFormItem>
        <ElFormItem label="单文件上限(字节)">
          <ElInput v-model="quotaForm.max_file_bytes" />
        </ElFormItem>
        <ElFormItem label="大文件">
          <ElSwitch v-model="quotaForm.large_file_enabled" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="预览">
          <ElSwitch v-model="quotaForm.preview_enabled" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="quotaVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="quotaSaving" @click="saveQuota">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog
      v-model="folderVisible"
      :title="folderType === 'add' ? '新建目录' : '编辑目录'"
      width="480px"
      align-center
    >
      <ElForm :model="folderForm" label-width="100px">
        <ElFormItem label="名称">
          <ElInput v-model="folderForm.name" />
        </ElFormItem>
        <ElFormItem label="父目录ID">
          <ElInputNumber v-model="folderForm.parent_id" :min="0" controls-position="right" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="folderVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="folderSaving" @click="saveFolder">保存</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="itemVisible" title="登记文件" width="520px" align-center>
      <ElForm :model="itemForm" label-width="100px">
        <ElFormItem label="文件名">
          <ElInput v-model="itemForm.name" />
        </ElFormItem>
        <ElFormItem label="file_id">
          <ElInput v-model="itemForm.file_id" />
        </ElFormItem>
        <ElFormItem label="大小(字节)">
          <ElInput v-model="itemForm.size_bytes" />
        </ElFormItem>
        <ElFormItem label="类型">
          <ElSelect v-model="itemForm.kind" style="width: 100%">
            <ElOption label="file" value="file" />
            <ElOption label="image" value="image" />
            <ElOption label="voice" value="voice" />
            <ElOption label="video" value="video" />
            <ElOption label="other" value="other" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="目录ID">
          <ElInputNumber v-model="itemForm.folder_id" :min="0" controls-position="right" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="itemVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="itemSaving" @click="saveItem">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import { useTable } from '@/hooks/useTable'
  import api from '@/api/file-media'

  const activeTab = ref('folder')
  const quota = ref<Record<string, any> | null>(null)

  const loadQuota = async () => {
    quota.value = (await api.quotaRead()) as any
  }
  onMounted(loadQuota)

  const formatBytes = (n: number) => {
    const v = Number(n || 0)
    if (v === 0) return '0 B'
    if (v < 1024) return `${v} B`
    if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
    if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`
    return `${(v / 1024 ** 3).toFixed(2)} GB`
  }

  const quotaVisible = ref(false)
  const quotaSaving = ref(false)
  const quotaForm = reactive({
    max_storage_bytes: '',
    max_file_bytes: '',
    large_file_enabled: 1,
    preview_enabled: 1
  })
  const openQuota = () => {
    if (!quota.value) return
    Object.assign(quotaForm, {
      max_storage_bytes: String(quota.value.max_storage_bytes ?? ''),
      max_file_bytes: String(quota.value.max_file_bytes ?? ''),
      large_file_enabled: Number(quota.value.large_file_enabled ?? 1),
      preview_enabled: Number(quota.value.preview_enabled ?? 1)
    })
    quotaVisible.value = true
  }
  const saveQuota = async () => {
    quotaSaving.value = true
    try {
      await api.quotaUpdate({
        max_storage_bytes: Number(quotaForm.max_storage_bytes),
        max_file_bytes: Number(quotaForm.max_file_bytes),
        large_file_enabled: quotaForm.large_file_enabled,
        preview_enabled: quotaForm.preview_enabled
      })
      ElMessage.success('已保存')
      quotaVisible.value = false
      await loadQuota()
    } finally {
      quotaSaving.value = false
    }
  }

  const {
    columns: folderColumns,
    columnChecks: folderColumnChecks,
    data: folderData,
    loading: folderLoading,
    pagination: folderPagination,
    handleSizeChange: handleFolderSizeChange,
    handleCurrentChange: handleFolderCurrentChange,
    refreshData: refreshFolders
  } = useTable({
    core: {
      apiFn: api.folderList,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'name', label: '名称', minWidth: 140 },
        { prop: 'parent_id', label: '父目录', width: 90 },
        { prop: 'owner_user_id', label: '所有者', minWidth: 120 },
        { prop: 'operation', label: '操作', width: 160, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const folderVisible = ref(false)
  const folderType = ref<'add' | 'edit'>('add')
  const folderSaving = ref(false)
  const folderForm = reactive({ id: 0, name: '', parent_id: 0 })
  const showFolderDialog = (type: 'add' | 'edit', row?: Record<string, any>) => {
    folderType.value = type
    Object.assign(folderForm, {
      id: row?.id ?? 0,
      name: row?.name ?? '',
      parent_id: Number(row?.parent_id ?? 0)
    })
    folderVisible.value = true
  }
  const saveFolder = async () => {
    folderSaving.value = true
    try {
      if (folderType.value === 'add') {
        await api.folderCreate({ name: folderForm.name, parent_id: folderForm.parent_id })
      } else {
        await api.folderUpdate({
          id: folderForm.id,
          name: folderForm.name,
          parent_id: folderForm.parent_id
        })
      }
      ElMessage.success('已保存')
      folderVisible.value = false
      refreshFolders()
    } finally {
      folderSaving.value = false
    }
  }
  const deleteFolder = async (row: Record<string, any>) => {
    await api.folderDelete({ ids: [row.id] })
    ElMessage.success('已删除')
    refreshFolders()
  }

  const {
    columns: itemColumns,
    columnChecks: itemColumnChecks,
    data: itemData,
    loading: itemLoading,
    pagination: itemPagination,
    handleSizeChange: handleItemSizeChange,
    handleCurrentChange: handleItemCurrentChange,
    refreshData: refreshItems
  } = useTable({
    core: {
      apiFn: api.itemList,
      columnsFactory: () => [
        { prop: 'id', label: '编号', width: 80 },
        { prop: 'name', label: '名称', minWidth: 140 },
        { prop: 'kind', label: '类型', width: 90 },
        { prop: 'size', label: '大小', width: 110, useSlot: true },
        { prop: 'file_id', label: 'file_id', minWidth: 120 },
        { prop: 'operation', label: '操作', width: 100, useSlot: true, fixed: 'right' }
      ]
    }
  })

  const itemVisible = ref(false)
  const itemSaving = ref(false)
  const itemForm = reactive({
    name: '',
    file_id: '',
    size_bytes: '',
    kind: 'file',
    folder_id: 0
  })
  const showItemDialog = () => {
    Object.assign(itemForm, { name: '', file_id: '', size_bytes: '', kind: 'file', folder_id: 0 })
    itemVisible.value = true
  }
  const saveItem = async () => {
    itemSaving.value = true
    try {
      await api.itemCreate({
        name: itemForm.name,
        file_id: itemForm.file_id,
        size_bytes: Number(itemForm.size_bytes),
        kind: itemForm.kind,
        folder_id: itemForm.folder_id
      })
      ElMessage.success('已登记')
      itemVisible.value = false
      refreshItems()
      await loadQuota()
    } finally {
      itemSaving.value = false
    }
  }
  const deleteItem = async (row: Record<string, any>) => {
    await api.itemDelete({ ids: [row.id] })
    ElMessage.success('已删除')
    refreshItems()
    await loadQuota()
  }
</script>
