<template>
  <div class="art-full-height">
    <ElCard
      v-loading="quotaLoading"
      class="art-table-card"
      shadow="never"
      style="margin-bottom: 16px"
    >
      <template #header>中央存储配额（只读）</template>
      <ElAlert
        title="来源：中央 StorageQuota。机构容量由平台统一配置，file_media 模块不能修改。"
        type="info"
        :closable="false"
        style="margin-bottom: 12px"
      />
      <ElDescriptions v-if="storageQuota" :column="3" border>
        <ElDescriptionsItem label="容量上限">
          {{ formatQuotaByteCount(storageQuota.quota_value, storageQuota.unlimited) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="已确认用量">
          {{ formatByteCount(storageQuota.used_value) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="上传预留">
          {{ formatByteCount(storageQuota.held_value) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="当前占用">
          {{ formatByteCount(storageQuota.occupancy_value) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="剩余容量">
          {{
            storageQuota.remaining_value === null
              ? '无限'
              : formatByteCount(storageQuota.remaining_value)
          }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="占用率">
          {{ formatUsageRatio(storageQuota.usage_ratio) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="已确认文件数">
          {{ storageQuota.used_file_count }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="预留文件数">
          {{ storageQuota.held_file_count }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="配额版本">v{{ storageQuota.version }}</ElDescriptionsItem>
      </ElDescriptions>
      <ElEmpty v-else-if="!quotaLoading" description="中央存储配额不可用" />
    </ElCard>

    <ElCard
      v-loading="quotaLoading"
      class="art-table-card"
      shadow="never"
      style="margin-bottom: 16px"
    >
      <template #header>file_media 模块策略</template>
      <ElAlert
        title="来源：file_media policy。这里只控制单文件上限、预览、大文件与模块状态，不承载机构总容量。"
        type="warning"
        :closable="false"
        style="margin-bottom: 12px"
      />
      <ElDescriptions v-if="policy" :column="4" border>
        <ElDescriptionsItem label="单文件上限">
          {{ formatByteCount(policy.max_file_bytes) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="大文件">
          {{ policy.large_file_enabled === 1 ? '开启' : '关闭' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="预览">
          {{ policy.preview_enabled === 1 ? '开启' : '关闭' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="模块状态">
          {{ policy.status === 1 ? '启用' : '停用' }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <ElEmpty v-else-if="!quotaLoading" description="file_media 策略不可用" />
      <div style="margin-top: 12px">
        <ElButton
          v-permission="'saimulti:tenant:file_media:quota'"
          type="primary"
          :disabled="policyDialogLoading"
          @click="openPolicy"
        >
          编辑模块策略
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
            <template #size="{ row }">{{ formatRecordedFileBytes(row.size_bytes) }}</template>
            <template #operation="{ row }">
              <ElButton size="small" type="danger" @click="deleteItem(row)">删除</ElButton>
            </template>
          </ArtTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <ElDialog
      v-model="policyVisible"
      v-loading="policyDialogLoading"
      title="编辑 file_media 模块策略"
      width="520px"
      align-center
      :close-on-click-modal="!policySaving"
      :close-on-press-escape="!policySaving"
      :show-close="!policySaving"
      @close="invalidatePolicyDialog"
    >
      <ElForm :model="policyForm" label-width="140px">
        <ElFormItem label="单文件上限(字节)">
          <ElInput v-model="policyForm.max_file_bytes" inputmode="numeric" autocomplete="off" />
        </ElFormItem>
        <ElFormItem label="大文件">
          <ElSwitch v-model="policyForm.large_file_enabled" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="预览">
          <ElSwitch v-model="policyForm.preview_enabled" :active-value="1" :inactive-value="0" />
        </ElFormItem>
        <ElFormItem label="文件服务状态">
          <ElSwitch v-model="policyForm.status" :active-value="1" :inactive-value="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton :disabled="policySaving" @click="closePolicyDialog">取消</ElButton>
        <ElButton
          type="primary"
          :loading="policySaving"
          :disabled="policyDialogLoading"
          @click="savePolicy"
        >
          保存
        </ElButton>
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
  import { useSiteStore } from '@/store/modules/site'
  import api, { type FileMediaPolicy, type StorageQuota } from '@/api/file-media'
  import {
    createLatestRequestFence,
    formatByteCount,
    formatQuotaByteCount,
    formatUsageRatio,
    parseExpectedOrganization,
    parseFileMediaPolicy
  } from '@/utils/fileMediaContract'

  const siteStore = useSiteStore()
  const activeTab = ref('folder')
  const storageQuota = ref<StorageQuota | null>(null)
  const policy = ref<FileMediaPolicy | null>(null)
  const quotaLoading = ref(false)
  const quotaFence = createLatestRequestFence()
  const policyDialogFence = createLatestRequestFence()
  const policyStateFence = createLatestRequestFence()
  const policyVisible = ref(false)
  const policyDialogLoading = ref(false)
  const policySaving = ref(false)
  const policyForm = reactive<FileMediaPolicy>({
    max_file_bytes: '',
    large_file_enabled: 1,
    preview_enabled: 1,
    status: 1
  })
  let viewMounted = false

  const currentOrganization = () => {
    if (!siteStore.loaded) throw new Error('当前机构信息尚未加载')
    return parseExpectedOrganization(siteStore.info.organization)
  }

  const isCurrentOrganization = (expectedOrganization: number) => {
    try {
      return siteStore.loaded && currentOrganization() === expectedOrganization
    } catch {
      return false
    }
  }

  const loadQuota = async () => {
    let expectedOrganization: number
    try {
      expectedOrganization = currentOrganization()
    } catch {
      storageQuota.value = null
      policy.value = null
      quotaLoading.value = false
      return
    }
    const quotaToken = quotaFence.begin()
    const policyToken = policySaving.value || policyVisible.value ? null : policyStateFence.begin()
    quotaLoading.value = true
    const policyRequest: Promise<FileMediaPolicy | null> =
      policyToken === null ? Promise.resolve(null) : api.policyRead()
    try {
      const [storageResult, policyResult] = await Promise.allSettled([
        api.storageRead(expectedOrganization),
        policyRequest
      ])
      const failures: unknown[] = []
      if (quotaFence.isCurrent(quotaToken) && isCurrentOrganization(expectedOrganization)) {
        if (storageResult.status === 'fulfilled') {
          storageQuota.value = storageResult.value
        } else {
          storageQuota.value = null
          failures.push(storageResult.reason)
        }
      }
      if (
        policyToken !== null &&
        policyStateFence.isCurrent(policyToken) &&
        isCurrentOrganization(expectedOrganization)
      ) {
        if (policyResult.status === 'fulfilled' && policyResult.value !== null) {
          policy.value = policyResult.value
        } else {
          policy.value = null
          if (policyResult.status === 'rejected') failures.push(policyResult.reason)
        }
      }
      const failure = failures[0]
      if (failure !== undefined) {
        ElMessage.error(failure instanceof Error ? failure.message : '存储配额或模块策略加载失败')
      }
    } finally {
      if (quotaFence.isCurrent(quotaToken) && isCurrentOrganization(expectedOrganization)) {
        quotaLoading.value = false
      }
    }
  }

  const invalidateTenantContext = () => {
    quotaFence.invalidate()
    policyDialogFence.invalidate()
    policyStateFence.invalidate()
    storageQuota.value = null
    policy.value = null
    quotaLoading.value = false
    policyVisible.value = false
    policyDialogLoading.value = false
    policySaving.value = false
    Object.assign(policyForm, {
      max_file_bytes: '',
      large_file_enabled: 1,
      preview_enabled: 1,
      status: 1
    })
  }

  watch(
    () => [siteStore.loaded, siteStore.info.organization] as const,
    () => {
      invalidateTenantContext()
      if (viewMounted && siteStore.loaded) void loadQuota()
    }
  )

  onMounted(() => {
    viewMounted = true
    if (siteStore.loaded) void loadQuota()
  })

  const formatRecordedFileBytes = (value: unknown) => {
    if (typeof value === 'string') return formatByteCount(value)
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      return formatByteCount(String(value))
    }
    return '—'
  }

  const invalidatePolicyDialog = () => {
    policyDialogFence.invalidate()
    policyDialogLoading.value = false
  }

  const closePolicyDialog = () => {
    if (policySaving.value) return
    invalidatePolicyDialog()
    policyVisible.value = false
  }

  const openPolicy = async () => {
    let expectedOrganization: number
    try {
      expectedOrganization = currentOrganization()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '当前机构信息无效')
      return
    }
    const dialogToken = policyDialogFence.begin()
    const stateToken = policyStateFence.begin()
    if (policy.value) Object.assign(policyForm, policy.value)
    policyVisible.value = true
    policyDialogLoading.value = true
    try {
      const nextPolicy = await api.policyRead()
      if (
        !policyDialogFence.isCurrent(dialogToken) ||
        !policyStateFence.isCurrent(stateToken) ||
        !isCurrentOrganization(expectedOrganization)
      ) {
        return
      }
      policy.value = nextPolicy
      Object.assign(policyForm, nextPolicy)
    } catch (error) {
      if (
        !policyDialogFence.isCurrent(dialogToken) ||
        !policyStateFence.isCurrent(stateToken) ||
        !isCurrentOrganization(expectedOrganization)
      ) {
        return
      }
      ElMessage.error(error instanceof Error ? error.message : 'file_media 模块策略加载失败')
      policyVisible.value = false
    } finally {
      if (policyDialogFence.isCurrent(dialogToken) && isCurrentOrganization(expectedOrganization)) {
        policyDialogLoading.value = false
      }
    }
  }

  const savePolicy = async () => {
    if (policySaving.value || policyDialogLoading.value) return
    let requestData: FileMediaPolicy
    try {
      requestData = parseFileMediaPolicy({ ...policyForm })
    } catch (error) {
      ElMessage.warning(error instanceof Error ? error.message : '模块策略格式无效')
      return
    }

    let expectedOrganization: number
    try {
      expectedOrganization = currentOrganization()
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '当前机构信息无效')
      return
    }

    const token = policyStateFence.begin()
    policySaving.value = true
    try {
      const nextPolicy = await api.policyUpdate(requestData)
      if (!policyStateFence.isCurrent(token) || !isCurrentOrganization(expectedOrganization)) {
        return
      }
      policy.value = nextPolicy
      ElMessage.success('已保存')
      policyVisible.value = false
    } finally {
      if (policyStateFence.isCurrent(token) && isCurrentOrganization(expectedOrganization)) {
        policySaving.value = false
      }
    }
  }

  onBeforeUnmount(() => {
    viewMounted = false
    invalidateTenantContext()
  })

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
