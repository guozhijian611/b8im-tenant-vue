<template>
  <el-cascader
    v-model="internalValue"
    v-bind="$attrs"
    style="width: 100%"
    :options="areaOptions"
    :placeholder="placeholder"
    :disabled="disabled"
    :clearable="clearable"
    :filterable="filterable"
    :show-all-levels="showAllLevels"
    :collapse-tags="collapseTags"
    :collapse-tags-tooltip="collapseTagsTooltip"
    :props="mergedProps"
  />
</template>

<script setup lang="ts">
  import { computed, nextTick, ref, watch } from 'vue'
  import { fetchAreaCode, type AreaCodeOption } from '@/api/auth'

  defineOptions({ name: 'SaArea', inheritAttrs: false })

  type AreaValue = string | number
  type CascaderModel = AreaValue | AreaValue[] | AreaValue[][] | null | undefined
  type AreaOption = AreaCodeOption & { children?: AreaOption[] }

  interface LazyNode {
    value?: AreaValue
    level: number
  }

  interface Props {
    /** Select depth: 1 province, 2 city, 3 county, 4 town, 5 village. */
    level?: number
    /** Convert option value to number or string. */
    valueType?: 'number' | 'string'
    /** Whether v-model returns the full path. */
    emitPath?: boolean
    /** Whether parent nodes can be selected. */
    checkStrictly?: boolean
    /** Whether multiple selection is enabled. */
    multiple?: boolean
    /** Extra Element Plus cascader props, such as expandTrigger. */
    cascaderProps?: Record<string, any>
    placeholder?: string
    disabled?: boolean
    clearable?: boolean
    filterable?: boolean
    showAllLevels?: boolean
    collapseTags?: boolean
    collapseTagsTooltip?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    level: 3,
    valueType: 'number',
    emitPath: true,
    checkStrictly: false,
    multiple: false,
    placeholder: '请选择地区',
    disabled: false,
    clearable: true,
    filterable: false,
    showAllLevels: true,
    collapseTags: true,
    collapseTagsTooltip: true,
    cascaderProps: () => ({})
  })

  const modelValue = defineModel<CascaderModel>()
  const internalValue = ref<CascaderModel>()
  const areaOptions = ref<AreaOption[]>([])
  const loadedPcodes = new Set<string>()
  const pathCache = new Map<string, AreaOption[]>()
  const syncingFromModel = ref(false)

  const targetLevel = computed(() => Math.max(1, Math.min(5, Number(props.level) || 3)))

  const normalizeComparable = (value: any): any => {
    if (Array.isArray(value)) {
      return value.map((item) => normalizeComparable(item))
    }
    if (value === null || value === undefined || value === '') {
      return value
    }
    return String(value)
  }

  const isSameValue = (left: any, right: any) => {
    return JSON.stringify(normalizeComparable(left)) === JSON.stringify(normalizeComparable(right))
  }

  const setInternalValue = (value: CascaderModel) => {
    if (!isSameValue(internalValue.value, value)) {
      internalValue.value = value
    }
  }

  const formatValue = (value: AreaValue) => {
    if (props.valueType === 'string') {
      return String(value)
    }
    return Number(value)
  }

  const getLoadKey = (pcode?: AreaValue) => (pcode === undefined ? '__root__' : String(pcode))

  const formatOptions = (list: AreaCodeOption[]): AreaOption[] => {
    return list.map((item) => ({
      ...item,
      value: formatValue(item.value),
      leaf: item.level >= targetLevel.value || item.leaf
    }))
  }

  const mergeOptions = (current: AreaOption[], incoming: AreaOption[]) => {
    const map = new Map(current.map((item) => [String(item.value), item]))

    incoming.forEach((item) => {
      const exists = map.get(String(item.value))
      if (exists) {
        Object.assign(exists, item, {
          children: exists.children || item.children
        })
      } else {
        current.push(item)
      }
    })

    current.sort((a, b) => Number(a.value) - Number(b.value))
  }

  const findOption = (list: AreaOption[], value: AreaValue): AreaOption | undefined => {
    for (const item of list) {
      if (String(item.value) === String(value)) {
        return item
      }
      const found = item.children ? findOption(item.children, value) : undefined
      if (found) {
        return found
      }
    }
    return undefined
  }

  const loadChildren = async (pcode?: AreaValue) => {
    const key = getLoadKey(pcode)
    if (loadedPcodes.has(key)) {
      return pcode === undefined ? areaOptions.value : findOption(areaOptions.value, pcode)?.children || []
    }

    const children = formatOptions(
      await fetchAreaCode({
        pcode,
        level: targetLevel.value
      })
    )

    if (pcode === undefined) {
      mergeOptions(areaOptions.value, children)
    } else {
      const parent = findOption(areaOptions.value, pcode)
      if (parent) {
        parent.children = parent.children || []
        mergeOptions(parent.children, children)
      }
    }

    loadedPcodes.add(key)
    return children
  }

  const loadPath = async (code: AreaValue) => {
    const key = `${targetLevel.value}:${props.valueType}:${code}`
    if (pathCache.has(key)) {
      return pathCache.get(key) || []
    }

    const path = formatOptions(
      await fetchAreaCode({
        code,
        level: targetLevel.value
      })
    )

    pathCache.set(key, path)
    return path
  }

  const ensurePathOptions = async (path: AreaOption[]) => {
    if (!path.length) {
      return
    }

    await loadChildren()
    for (let index = 0; index < path.length - 1; index++) {
      await loadChildren(path[index].value)
    }
  }

  const getLastValue = (value: CascaderModel) => {
    if (Array.isArray(value)) {
      return value[value.length - 1] as AreaValue | undefined
    }
    return value as AreaValue | undefined
  }

  const isEmptyValue = (value: CascaderModel) => {
    return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)
  }

  const toPathValue = async (value: CascaderModel) => {
    const code = getLastValue(value)
    if (code === undefined || code === '') {
      return []
    }

    const path = await loadPath(code)
    await ensurePathOptions(path)
    return path.map((item) => item.value)
  }

  const syncFromModel = async (value: CascaderModel) => {
    syncingFromModel.value = true

    try {
      if (isEmptyValue(value)) {
        setInternalValue(props.multiple ? [] : null)
        return
      }

      if (props.multiple) {
        const values = Array.isArray(value) ? value : []
        const nextValue = props.emitPath
          ? await Promise.all(values.map((item) => toPathValue(item as AreaValue[])))
          : await Promise.all(values.map((item) => toPathValue(item as AreaValue)))
        setInternalValue(nextValue)
        return
      }

      const nextValue = props.emitPath ? await toPathValue(value as AreaValue[]) : await toPathValue(value)
      setInternalValue(nextValue)
    } finally {
      await nextTick()
      syncingFromModel.value = false
    }
  }

  const toExternalValue = (value: CascaderModel): CascaderModel => {
    if (props.emitPath) {
      return value
    }

    if (props.multiple) {
      const values = Array.isArray(value) ? value : []
      return values.map((item) => getLastValue(item as AreaValue[])).filter(Boolean) as AreaValue[]
    }

    return getLastValue(value) || null
  }

  const lazyLoad = async (node: LazyNode, resolve: (data: AreaOption[]) => void) => {
    if (node.level >= targetLevel.value) {
      resolve([])
      return
    }

    try {
      const children = await loadChildren(node.level === 0 ? undefined : node.value)
      resolve(children)
    } catch (error) {
      console.error('Failed to load area code options:', error)
      resolve([])
    }
  }

  const mergedProps = computed(() => ({
    value: 'value',
    label: 'label',
    children: 'children',
    leaf: 'leaf',
    emitPath: true,
    checkStrictly: props.checkStrictly,
    multiple: props.multiple,
    ...props.cascaderProps,
    lazy: true,
    lazyLoad: lazyLoad as any
  }))

  watch(
    () => modelValue.value,
    (value) => {
      syncFromModel(value)
    },
    { immediate: true, deep: true }
  )

  watch(
    internalValue,
    (value) => {
      if (syncingFromModel.value) {
        return
      }
      const nextValue = toExternalValue(value)
      if (!isSameValue(modelValue.value, nextValue)) {
        modelValue.value = nextValue
      }
    },
    { deep: true }
  )

  watch([targetLevel, () => props.valueType], () => {
    areaOptions.value = []
    loadedPcodes.clear()
    pathCache.clear()
    syncFromModel(modelValue.value)
  })
</script>
