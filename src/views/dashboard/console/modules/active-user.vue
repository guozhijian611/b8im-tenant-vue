<template>
  <div class="art-card h-105 p-5 box-border mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>Active Users</h4>
        <p>7 day snapshot</p>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3 mt-4">
      <div
        v-for="item in weeklyStats"
        :key="item.label"
        class="rounded-xl border border-g-200 bg-g-100 px-3 py-3"
      >
        <p class="text-xs text-g-600">{{ item.label }}</p>
        <p class="mt-1 text-xl font-semibold text-g-900">{{ item.value }}</p>
        <p
          class="mt-1 text-xs"
          :class="item.delta.startsWith('+') ? 'text-success' : 'text-danger'"
        >
          {{ item.delta }}
        </p>
      </div>
    </div>

    <div class="mt-5 space-y-3">
      <div v-for="item in channelStats" :key="item.name">
        <div class="flex items-center justify-between text-sm">
          <span class="text-g-700">{{ item.name }}</span>
          <span class="font-medium text-g-900">{{ item.value }}%</span>
        </div>
        <ElProgress
          :percentage="item.value"
          :stroke-width="8"
          :show-text="false"
          :color="item.color"
          class="mt-2"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface StatCard {
    label: string
    value: string
    delta: string
  }

  interface ChannelStat {
    name: string
    value: number
    color: string
  }

  const weeklyStats: StatCard[] = [
    { label: 'Today', value: '1,284', delta: '+8.2%' },
    { label: 'This Week', value: '8,942', delta: '+12.4%' },
    { label: 'Retention', value: '73%', delta: '-1.1%' }
  ]

  const channelStats: ChannelStat[] = [
    { name: 'Direct', value: 68, color: 'var(--el-color-primary)' },
    { name: 'Search', value: 54, color: 'var(--el-color-success)' },
    { name: 'Referral', value: 31, color: 'var(--el-color-warning)' }
  ]
</script>
