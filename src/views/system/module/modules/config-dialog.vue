<template>
  <ElDialog
    v-model="visible"
    :title="`配置模块：${moduleName || moduleKey}`"
    width="720px"
    align-center
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="min-h-48">
      <ElAlert v-if="error" type="error" :closable="false" show-icon :title="error" />
      <template v-else-if="loaded">
        <ElAlert
          v-if="unsupportedSchema.length"
          class="mb-4"
          type="warning"
          :closable="false"
          show-icon
          :title="`有 ${unsupportedSchema.length} 个未知配置类型未渲染，配置未提交。`"
        />
        <ElForm ref="formRef" :model="formData" :rules="rules" label-width="140px">
          <ElFormItem
            v-for="item in supportedSchema"
            :key="item.key"
            :label="item.name"
            :prop="item.key"
          >
            <ElInput
              v-if="isSecretInput(item)"
              v-model="formData[item.key]"
              type="password"
              show-password
              autocomplete="new-password"
              :placeholder="secretPlaceholder(item)"
            />
            <ElInput
              v-else-if="item.type === 'string' || item.type === 'url'"
              v-model="formData[item.key]"
              :placeholder="item.description || `请输入${item.name}`"
            />
            <ElInputNumber
              v-else-if="item.type === 'integer' || item.type === 'number'"
              v-model="formData[item.key]"
              :precision="item.type === 'integer' ? 0 : undefined"
              controls-position="right"
              style="width: 100%"
            />
            <ElSwitch v-else-if="item.type === 'boolean'" v-model="formData[item.key]" />
            <ElSelect
              v-else-if="item.type === 'select'"
              v-model="formData[item.key]"
              style="width: 100%"
            >
              <ElOption
                v-for="option in item.options || []"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
            <ElSelect
              v-else-if="item.type === 'multiselect'"
              v-model="formData[item.key]"
              multiple
              style="width: 100%"
            >
              <ElOption
                v-for="option in item.options || []"
                :key="String(option.value)"
                :label="option.label"
                :value="option.value"
              />
            </ElSelect>
            <ElInput
              v-else-if="item.type === 'json'"
              v-model="jsonValues[item.key]"
              type="textarea"
              :rows="6"
              placeholder="请输入有效 JSON"
            />
            <template #error="scope">{{ scope.error }}</template>
            <div v-if="item.description" class="w-full text-xs text-gray-400">
              {{ item.description }}
            </div>
            <div v-if="isSecretInput(item)" class="w-full text-xs text-gray-400">
              <ElTag v-if="configured[item.key]" size="small" type="success" effect="plain">
                已安全配置
              </ElTag>
              <ElTag v-else size="small" type="info" effect="plain">尚未配置</ElTag>
              <span v-if="configured[item.key]" class="ml-2">留空将保留原密文</span>
            </div>
          </ElFormItem>
        </ElForm>
        <ElText type="info">配置版本：{{ version }}</ElText>
      </template>
    </div>
    <template #footer>
      <ElButton @click="handleClose">取消</ElButton>
      <ElButton
        v-permission="'saimulti:tenant:module:config:update'"
        type="primary"
        :loading="submitting"
        :disabled="!loaded || Boolean(error)"
        @click="handleSubmit"
      >
        保存配置
      </ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { ElMessage } from 'element-plus'
  import type { FormInstance, FormRules } from 'element-plus'
  import moduleApi, {
    type ModuleConfigSchemaItem,
    type ModuleConfigType
  } from '@/api/system/module'

  interface Props {
    modelValue: boolean
    moduleKey?: string
    moduleName?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: false,
    moduleKey: '',
    moduleName: ''
  })
  const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'success'): void
  }>()
  const supportedTypes = new Set<ModuleConfigType>([
    'string',
    'integer',
    'number',
    'boolean',
    'select',
    'multiselect',
    'json',
    'secret',
    'url'
  ])
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  const formRef = ref<FormInstance>()
  const loading = ref(false)
  const submitting = ref(false)
  const loaded = ref(false)
  const error = ref('')
  const schema = ref<ModuleConfigSchemaItem[]>([])
  const formData = reactive<Record<string, any>>({})
  const jsonValues = reactive<Record<string, string>>({})
  const configured = reactive<Record<string, boolean>>({})
  const version = ref(0)
  const isSecretInput = (item: ModuleConfigSchemaItem) =>
    (item.sensitive || item.type === 'secret') && ['string', 'url', 'secret'].includes(item.type)
  const supportedSchema = computed(() =>
    schema.value.filter(
      (item) =>
        item.scope === 'tenant' &&
        supportedTypes.has(item.type) &&
        (!(item.sensitive || item.type === 'secret') || isSecretInput(item))
    )
  )
  const unsupportedSchema = computed(() =>
    schema.value.filter((item) => !supportedSchema.value.includes(item))
  )
  const rules = computed<FormRules>(() => {
    const result: FormRules = {}
    supportedSchema.value.forEach((item) => {
      if (item.required) {
        result[item.key] = [
          {
            validator: (_rule, value, callback) => {
              if (isSecretInput(item) && String(value ?? '').trim() === '') {
                if (configured[item.key]) callback()
                else callback(new Error(`${item.name}必须填写`))
                return
              }
              if (value === null || value === undefined || value === '') {
                callback(new Error(`${item.name}必须填写`))
                return
              }
              callback()
            },
            trigger: ['blur', 'change']
          }
        ]
      }
    })
    return result
  })

  watch(
    () => props.modelValue,
    (open) => {
      if (open) void loadConfig()
    }
  )

  const defaultValue = (item: ModuleConfigSchemaItem) => {
    if (item.sensitive || item.type === 'secret') return ''
    if (item.default !== undefined) return item.default
    if (item.type === 'boolean') return false
    if (item.type === 'multiselect') return []
    if (item.type === 'integer' || item.type === 'number') return 0
    if (item.type === 'json') return {}
    return ''
  }

  const loadConfig = async () => {
    loaded.value = false
    error.value = ''
    schema.value = []
    Object.keys(formData).forEach((key) => delete formData[key])
    Object.keys(jsonValues).forEach((key) => delete jsonValues[key])
    Object.keys(configured).forEach((key) => delete configured[key])
    if (!props.moduleKey) {
      error.value = '模块标识不能为空'
      return
    }
    loading.value = true
    try {
      const response = await moduleApi.config(props.moduleKey)
      if (
        !response ||
        response.module_key !== props.moduleKey ||
        !Array.isArray(response.schema) ||
        !response.values ||
        typeof response.values !== 'object' ||
        Array.isArray(response.values) ||
        !response.configured ||
        typeof response.configured !== 'object' ||
        Array.isArray(response.configured) ||
        !Number.isInteger(response.version)
      ) {
        throw new Error('模块配置响应格式无效')
      }
      schema.value = response.schema
      version.value = response.version
      response.schema.forEach((item) => {
        configured[item.key] = response.configured[item.key] === true
        const value = Object.prototype.hasOwnProperty.call(response.values, item.key)
          ? response.values[item.key]
          : defaultValue(item)
        if (item.type === 'json') {
          jsonValues[item.key] = JSON.stringify(value, null, 2)
          formData[item.key] = value
        } else {
          formData[item.key] = value
        }
      })
      loaded.value = true
    } catch (value) {
      error.value = value instanceof Error ? value.message : '模块配置加载失败'
    } finally {
      loading.value = false
    }
  }

  const secretPlaceholder = (item: ModuleConfigSchemaItem) => {
    if (configured[item.key]) return '已配置；留空保留原值，输入新值则替换'
    return item.description || `请输入${item.name}`
  }

  const handleSubmit = async () => {
    if (!formRef.value || !props.moduleKey) return
    await formRef.value.validate()
    const config: Record<string, unknown> = {}
    for (const item of supportedSchema.value) {
      if (item.type === 'json') {
        try {
          config[item.key] = JSON.parse(jsonValues[item.key] || 'null')
        } catch {
          ElMessage.error(`${item.name}不是有效 JSON`)
          return
        }
      } else {
        config[item.key] = formData[item.key]
      }
    }
    submitting.value = true
    try {
      await moduleApi.updateConfig(props.moduleKey, config)
      ElMessage.success('模块配置保存成功')
      emit('success')
      handleClose()
    } finally {
      submitting.value = false
    }
  }

  const handleClose = () => {
    visible.value = false
    formRef.value?.resetFields()
    loaded.value = false
  }
</script>
