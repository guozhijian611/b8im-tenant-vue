<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="text-lg font-semibold">模块中心</div>
            <ElText type="info"
              >这里只展示平台已授权给当前机构的模块，真实可用性由 Server 校验。</ElText
            >
          </div>
          <ElButton :loading="loading" @click="loadModules">
            <template #icon><ArtSvgIcon icon="ri:refresh-line" /></template>
            刷新
          </ElButton>
        </div>
      </template>

      <ElAlert v-if="error" class="mb-4" type="error" :closable="false" show-icon :title="error" />
      <ArtTable
        rowKey="module_key"
        :loading="loading"
        :data="items"
        :columns="columns"
        empty-text="当前机构暂无可用模块"
      >
        <template #module="{ row }">
          <div class="flex flex-col gap-1">
            <span class="font-semibold">{{ row.name }}</span>
            <ElText type="info" size="small">{{ row.module_key }} · {{ row.version }}</ElText>
            <ElText truncated style="max-width: 420px">{{ row.description }}</ElText>
          </div>
        </template>
        <template #platforms="{ row }">
          <ElSpace wrap>
            <ElTag v-for="platform in row.platforms" :key="platform" size="small" effect="plain">
              {{ platform }}
            </ElTag>
          </ElSpace>
        </template>
        <template #status="{ row }">
          <ElTag :type="statusTagType(row.status)">{{ statusLabel(row.status) }}</ElTag>
          <ElTag v-if="row.effective" class="ml-2" type="success" effect="plain">当前生效</ElTag>
        </template>
        <template #expire="{ row }">
          <span v-if="row.expire_at">{{ row.expire_at }}</span>
          <ElText v-else type="info">长期有效</ElText>
        </template>
        <template #operation="{ row }">
          <ElSpace wrap>
            <ElButton
              v-if="row.status === 'AUTHORIZED' || row.status === 'DISABLED'"
              v-permission="'saimulti:tenant:module:enable'"
              size="small"
              type="success"
              :loading="isActionLoading(row, 'enable')"
              @click="toggleModule(row, 'enable')"
            >
              启用
            </ElButton>
            <ElButton
              v-if="row.status === 'ENABLED'"
              v-permission="'saimulti:tenant:module:disable'"
              size="small"
              type="warning"
              :loading="isActionLoading(row, 'disable')"
              @click="toggleModule(row, 'disable')"
            >
              禁用
            </ElButton>
            <ElButton
              v-if="canConfigure(row)"
              v-permission="'saimulti:tenant:module:config:read'"
              size="small"
              @click="openConfig(row)"
            >
              模块配置
            </ElButton>
          </ElSpace>
        </template>
      </ArtTable>
    </ElCard>

    <ConfigDialog
      v-model="configVisible"
      :module-key="selectedModule?.module_key"
      :module-name="selectedModule?.name"
      @success="loadModules"
    />
  </div>
</template>

<script setup lang="ts">
  import { ElMessage, ElMessageBox } from 'element-plus'
  import moduleApi, { type TenantModuleItem, type TenantModuleStatus } from '@/api/system/module'
  import { refreshDynamicRoutes, router } from '@/router'
  import ConfigDialog from './modules/config-dialog.vue'

  const loading = ref(false)
  const error = ref('')
  const items = ref<TenantModuleItem[]>([])
  const activeAction = ref('')
  const selectedModule = ref<TenantModuleItem | null>(null)
  const configVisible = ref(false)
  const columns = [
    { prop: 'module', label: '模块', minWidth: 360, useSlot: true },
    { prop: 'platforms', label: '支持平台', minWidth: 220, useSlot: true },
    { prop: 'status', label: '授权状态', width: 210, useSlot: true },
    { prop: 'expire', label: '到期时间', width: 190, useSlot: true },
    { prop: 'operation', label: '操作', width: 220, fixed: 'right' as const, useSlot: true }
  ]
  const statusLabels: Record<TenantModuleStatus, string> = {
    AUTHORIZED: '已授权',
    ENABLED: '已启用',
    DISABLED: '已禁用',
    EXPIRED: '已过期'
  }

  const statusLabel = (status: TenantModuleStatus) => statusLabels[status]
  const statusTagType = (status: TenantModuleStatus) => {
    if (status === 'ENABLED') return 'success'
    if (status === 'EXPIRED') return 'danger'
    if (status === 'DISABLED') return 'info'
    return 'primary'
  }

  const loadModules = async () => {
    loading.value = true
    error.value = ''
    try {
      const response = await moduleApi.list()
      if (!response || !Array.isArray(response.items)) throw new Error('模块列表响应格式无效')
      items.value = response.items
    } catch (value) {
      items.value = []
      error.value = value instanceof Error ? value.message : '模块列表加载失败'
    } finally {
      loading.value = false
    }
  }

  const isActionLoading = (row: TenantModuleItem, action: 'enable' | 'disable') =>
    activeAction.value === `${action}:${row.module_key}`

  const toggleModule = async (row: TenantModuleItem, action: 'enable' | 'disable') => {
    const label = action === 'enable' ? '启用' : '禁用'
    await ElMessageBox.confirm(`确认${label}模块“${row.name}”吗？`, `${label}模块`, {
      type: action === 'enable' ? 'info' : 'warning'
    })
    activeAction.value = `${action}:${row.module_key}`
    try {
      await moduleApi[action](row.module_key)
      await Promise.all([loadModules(), refreshDynamicRoutes(router)])
      ElMessage.success(`${label}成功`)
    } finally {
      activeAction.value = ''
    }
  }

  const canConfigure = (row: TenantModuleItem) =>
    row.config_schema.length > 0 && row.status !== 'EXPIRED'

  const openConfig = (row: TenantModuleItem) => {
    selectedModule.value = row
    configVisible.value = true
  }

  onMounted(loadModules)
</script>
