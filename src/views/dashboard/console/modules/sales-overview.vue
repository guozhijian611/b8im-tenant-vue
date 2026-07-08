<template>
  <div class="art-card h-105 p-5 mb-5 max-sm:mb-4">
    <div class="art-card-header">
      <div class="title">
        <h4>Traffic Overview</h4>
        <p>Yearly summary</p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-2 gap-3">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="rounded-xl border border-g-200 bg-g-100 px-4 py-3"
      >
        <p class="text-xs text-g-600">{{ metric.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-g-900">{{ metric.value }}</p>
        <p
          class="mt-1 text-xs"
          :class="metric.delta.startsWith('+') ? 'text-success' : 'text-danger'"
        >
          {{ metric.delta }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  interface MetricItem {
    label: string
    value: string
    delta: string
  }

  const metrics: MetricItem[] = [
    { label: 'Total Visits', value: '48.6k', delta: '+15%' },
    { label: 'Avg. Session', value: '06m 24s', delta: '+4%' },
    { label: 'Bounce Rate', value: '28%', delta: '-3%' },
    { label: 'Conversions', value: '1,284', delta: '+9%' }
  ]
</script>
