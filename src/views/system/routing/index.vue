<template>
  <div class="art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div
            ><div class="text-lg font-semibold">接入线路策略</div
            ><ElText type="info"
              >当前机构只能查看平台已发布的线路，不能填写或修改服务地址。</ElText
            ></div
          >
          <div class="flex gap-2"
            ><ElSelect v-model="clientFamily" style="width: 130px" @change="load"
              ><ElOption label="Web" value="web" /><ElOption label="App" value="app" /><ElOption
                label="Desktop"
                value="desktop" /></ElSelect
            ><ElButton
              v-permission="'saimulti:tenant:routing:read'"
              :loading="loading"
              @click="load"
              >刷新</ElButton
            ></div
          >
        </div>
      </template>

      <ElAlert
        v-if="errorMessage"
        class="mb-4"
        type="error"
        :closable="false"
        show-icon
        :title="errorMessage"
      />
      <ElSkeleton :loading="loading" animated :rows="8">
        <ElEmpty v-if="!routing" description="尚未发布该客户端线路" />
        <template v-else>
          <div class="mb-4 flex flex-wrap gap-2"
            ><ElTag>机构 {{ routing.organization }}</ElTag
            ><ElTag effect="plain">{{ routing.deployment_id }}</ElTag
            ><ElTag type="success">{{ routing.server_info.policy.mode }}</ElTag
            ><ElTag effect="plain">routing v{{ routing.server_info.routing_version }}</ElTag
            ><ElTag effect="plain">pool v{{ routing.server_info.route_pool_version }}</ElTag></div
          >
          <ElDescriptions class="mb-5" :column="2" border
            ><ElDescriptionsItem label="线路池">{{
              routing.server_info.route_pool_id
            }}</ElDescriptionsItem
            ><ElDescriptionsItem label="签名密钥">{{
              routing.routing_signature.kid
            }}</ElDescriptionsItem
            ><ElDescriptionsItem label="发布时间">{{ routing.publish_time }}</ElDescriptionsItem
            ><ElDescriptionsItem label="有效期">{{
              routing.server_info.expires_at
            }}</ElDescriptionsItem></ElDescriptions
          >
          <ElTable :data="routing.server_info.routes" border>
            <ElTableColumn prop="name" label="线路" min-width="130" />
            <ElTableColumn prop="route_id" label="route_id" min-width="150" />
            <ElTableColumn prop="route_version" label="版本" width="80" />
            <ElTableColumn prop="priority" label="优先级" width="90" />
            <ElTableColumn label="API" min-width="230"
              ><template #default="{ row }">{{
                row.endpoints.api_server_url
              }}</template></ElTableColumn
            >
            <ElTableColumn label="IM" min-width="230"
              ><template #default="{ row }">{{
                row.endpoints.im_server_url
              }}</template></ElTableColumn
            >
          </ElTable>
        </template>
      </ElSkeleton>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import routingApi, { type ClientFamily, type TenantRoutingResult } from '@/api/system/routing'

  defineOptions({ name: 'TenantRouting' })
  const clientFamily = ref<ClientFamily>('web')
  const routing = ref<TenantRoutingResult | null>(null)
  const loading = ref(false)
  const errorMessage = ref('')
  const load = async () => {
    loading.value = true
    errorMessage.value = ''
    try {
      routing.value = await routingApi.read(clientFamily.value)
    } catch (error) {
      routing.value = null
      errorMessage.value = error instanceof Error ? error.message : '线路配置读取失败'
    } finally {
      loading.value = false
    }
  }
  onMounted(load)
</script>
