/**
 * useTable - 企业级表格数据管理方案
 *
 * 功能完整的表格数据管理解决方案，专为后台管理系统设计。
 * 封装了表格开发中的常见需求，让你专注于业务逻辑。
 *
 * ## 主要功能
 *
 * 1. 数据管理 - 自动处理 API 请求、响应转换、加载状态和错误处理
 * 2. 分页控制 - 自动同步分页状态、移动端适配、智能页码边界处理
 * 3. 搜索功能 - 防抖搜索优化、参数管理、一键重置、参数过滤
 * 4. 刷新策略 - 提供多种刷新方法适配不同业务场景
 * 5. 列配置管理 - 动态显示/隐藏列、列排序、配置持久化、批量操作（可选）
 *
 * @module useTable
 * @author Art Design Pro Team
 */

import { ref, reactive, computed, onMounted, onUnmounted, nextTick, readonly } from 'vue'
import { useTableColumns } from './useTableColumns'
import type { ColumnOption } from '@/types/component'
import {
  type TableError,
  type ApiResponse,
  defaultResponseAdapter,
  extractTableData,
  updatePaginationFromResponse,
  createSmartDebounce,
  createErrorHandler
} from '../utils/table/tableUtils'
import { tableConfig } from '../utils/table/tableConfig'

type InferApiParams<T> = T extends (params: infer P) => any ? P : never
type InferApiResponse<T> = T extends (params: any) => Promise<infer R> ? R : never
type InferRecordType<T> = T extends Api.Common.PaginatedResponse<infer U> ? U : never

// useTable 配置项，按“核心能力 / 数据转换 / 性能 / 生命周期”分组
export interface UseTableConfig<
  TApiFn extends (params: any) => Promise<any> = (params: any) => Promise<any>,
  TRecord = InferRecordType<InferApiResponse<TApiFn>>,
  TParams = InferApiParams<TApiFn>,
  TResponse = InferApiResponse<TApiFn>
> {
  core: {
    apiFn: TApiFn
    apiParams?: Partial<TParams>
    excludeParams?: string[]
    immediate?: boolean
    columnsFactory?: () => ColumnOption<TRecord>[]
    paginationKey?: {
      current?: string
      size?: string
    }
  }

  transform?: {
    dataTransformer?: (data: TRecord[]) => TRecord[]
    responseAdapter?: (response: TResponse) => ApiResponse<TRecord>
  }

  performance?: {
    debounceTime?: number
  }

  hooks?: {
    onSuccess?: (data: TRecord[], response: ApiResponse<TRecord>) => void
    onError?: (error: TableError) => void
    onLoading?: (loading: boolean) => void
    resetFormCallback?: () => void
  }
}

export function useTable<TApiFn extends (params: any) => Promise<any>>(
  config: UseTableConfig<TApiFn>
) {
  return useTableImpl(config)
}

/**
 * useTable 核心实现
 *
 * 保留表格页最常用的能力：
 * - 请求加载与错误处理
 * - 搜索参数管理
 * - 分页联动
 * - 防抖搜索
 * - 常见刷新策略
 * - 列配置管理
 */
function useTableImpl<TApiFn extends (params: any) => Promise<any>>(
  config: UseTableConfig<TApiFn>
) {
  type TRecord = InferRecordType<InferApiResponse<TApiFn>>
  type TParams = InferApiParams<TApiFn>

  const {
    core: {
      apiFn,
      apiParams = {} as Partial<TParams>,
      excludeParams = [],
      immediate = true,
      columnsFactory,
      paginationKey
    },
    transform: { dataTransformer, responseAdapter = defaultResponseAdapter } = {},
    performance: { debounceTime = 300 } = {},
    hooks: { onSuccess, onError, onLoading, resetFormCallback } = {}
  } = config

  const pageKey = paginationKey?.current || tableConfig.paginationKey.current
  const sizeKey = paginationKey?.size || tableConfig.paginationKey.size
  const orderFieldKey = tableConfig.paginationKey.orderField
  const orderTypeKey = tableConfig.paginationKey.orderType

  // 统一维护加载状态，便于上层区分 idle / loading / success / error
  type LoadingState = 'idle' | 'loading' | 'success' | 'error'
  const loadingState = ref<LoadingState>('idle')
  const loading = computed(() => loadingState.value === 'loading')
  const error = ref<TableError | null>(null)
  const data = ref<TRecord[]>([])

  // 取消上一次未完成请求，避免快速操作时旧请求回写新状态
  let abortController: AbortController | null = null

  // 搜索参数始终和分页参数共用同一份响应式对象
  const searchParams = reactive(
    Object.assign(
      {
        [pageKey]: 1,
        [sizeKey]: 10
      },
      apiParams || {}
    ) as TParams
  )

  // 分页状态以独立对象维护，便于和表格组件联动
  const pagination = reactive<Api.Common.PaginationParams>({
    current: ((searchParams as Record<string, unknown>)[pageKey] as number) || 1,
    size: ((searchParams as Record<string, unknown>)[sizeKey] as number) || 10,
    total: 0
  })

  // 如果页面提供了列工厂，就启用列配置能力
  const columnConfig = columnsFactory ? useTableColumns<TRecord>(columnsFactory) : null
  const columns = columnConfig?.columns
  const columnChecks = columnConfig?.columnChecks
  const hasData = computed(() => data.value.length > 0)

  const setLoadingState = (state: LoadingState) => {
    loadingState.value = state
    onLoading?.(state === 'loading')
  }

  const handleError = createErrorHandler(onError)

  // 核心请求方法：组装参数、发起请求、处理响应并回写分页状态
  const fetchData = async (params?: Partial<TParams>): Promise<ApiResponse<TRecord>> => {
    if (abortController) {
      abortController.abort()
    }

    const currentController = new AbortController()
    abortController = currentController

    setLoadingState('loading')
    error.value = null

    try {
      let requestParams = Object.assign(
        {},
        searchParams,
        {
          [pageKey]: pagination.current,
          [sizeKey]: pagination.size
        },
        params || {}
      ) as TParams

      if (excludeParams.length > 0) {
        const filteredParams = { ...requestParams }
        excludeParams.forEach((key) => {
          delete (filteredParams as Record<string, unknown>)[key]
        })
        requestParams = filteredParams as TParams
      }

      const response = await apiFn(requestParams)

      if (currentController.signal.aborted) {
        throw new Error('请求已取消')
      }

      const standardResponse = responseAdapter(response)

      let tableData = extractTableData(standardResponse)

      if (dataTransformer) {
        tableData = dataTransformer(tableData)
      }

      data.value = tableData
      updatePaginationFromResponse(pagination, standardResponse)

      const paramsRecord = searchParams as Record<string, unknown>
      if (paramsRecord[pageKey] !== pagination.current) {
        paramsRecord[pageKey] = pagination.current
      }
      if (paramsRecord[sizeKey] !== pagination.size) {
        paramsRecord[sizeKey] = pagination.size
      }

      setLoadingState('success')
      onSuccess?.(tableData, standardResponse)

      return standardResponse
    } catch (err) {
      if (err instanceof Error && err.message === '请求已取消') {
        setLoadingState('idle')
        return { records: [], total: 0, current: 1, size: 10 }
      }

      setLoadingState('error')
      data.value = []
      error.value = handleError(err, '获取表格数据失败')
      throw error.value
    } finally {
      if (abortController === currentController) {
        abortController = null
      }
    }
  }

  // 保持当前页加载，适合刷新、分页跳转等场景
  const getData = async (params?: Partial<TParams>): Promise<ApiResponse<TRecord> | void> => {
    try {
      return await fetchData(params)
    } catch {
      return Promise.resolve()
    }
  }

  // 重置到第一页后再加载，适合搜索场景
  const getDataByPage = async (params?: Partial<TParams>): Promise<ApiResponse<TRecord> | void> => {
    pagination.current = 1
    ;(searchParams as Record<string, unknown>)[pageKey] = 1

    try {
      return await fetchData(params)
    } catch {
      return Promise.resolve()
    }
  }

  // 搜索输入场景默认走防抖，避免短时间内频繁请求
  const debouncedGetDataByPage = createSmartDebounce(getDataByPage, debounceTime)

  // 恢复初始搜索参数，并在必要时回调表单层执行 reset
  const resetSearchParams = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()

    const paramsRecord = searchParams as Record<string, unknown>
    const defaultPagination = {
      [pageKey]: 1,
      [sizeKey]: (paramsRecord[sizeKey] as number) || 10
    }

    Object.keys(searchParams).forEach((key) => {
      delete paramsRecord[key]
    })

    Object.assign(searchParams, apiParams || {}, defaultPagination)

    pagination.current = 1
    pagination.size = defaultPagination[sizeKey] as number
    error.value = null

    await getData()

    if (resetFormCallback) {
      await nextTick()
      resetFormCallback()
    }
  }

  // 用新参数整体替换搜索条件，避免旧字段残留影响查询
  const replaceSearchParams = (params?: Partial<TParams>): void => {
    const paramsRecord = searchParams as Record<string, unknown>
    const currentSize = pagination.size || ((paramsRecord[sizeKey] as number) ?? 10)

    Object.keys(searchParams).forEach((key) => {
      if (key !== pageKey && key !== sizeKey) {
        delete paramsRecord[key]
      }
    })

    Object.assign(
      searchParams,
      {
        [pageKey]: 1,
        [sizeKey]: currentSize
      },
      params || {}
    )

    pagination.current = 1
    pagination.size = currentSize
  }

  // 防止分页组件在联动更新时重复触发请求
  let isCurrentChanging = false

  // 修改每页条数时，统一回到第一页重新加载
  const handleSizeChange = async (newSize: number): Promise<void> => {
    if (newSize <= 0) return

    debouncedGetDataByPage.cancel()

    const paramsRecord = searchParams as Record<string, unknown>
    pagination.size = newSize
    pagination.current = 1
    paramsRecord[sizeKey] = newSize
    paramsRecord[pageKey] = 1

    await getData()
  }

  // 页码变化时保持当前搜索条件，只更新当前页
  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    if (newCurrent <= 0) return

    if (isCurrentChanging) {
      return
    }

    if (pagination.current === newCurrent) {
      return
    }

    try {
      isCurrentChanging = true

      const paramsRecord = searchParams as Record<string, unknown>
      pagination.current = newCurrent
      if (paramsRecord[pageKey] !== newCurrent) {
        paramsRecord[pageKey] = newCurrent
      }

      await getData()
    } finally {
      isCurrentChanging = false
    }
  }

  // 处理表格排序变化：更新查询参数中的排序字段与排序类型，并请求后端数据
  const handleSortChange = async (payload: {
    column?: unknown
    prop?: string
    order?: 'ascending' | 'descending' | null
  }): Promise<void> => {
    const paramsRecord = searchParams as Record<string, unknown>

    // 如果清除排序，则移除相关查询参数
    if (!payload.order || !payload.prop) {
      delete paramsRecord[orderFieldKey]
      delete paramsRecord[orderTypeKey]
    } else {
      paramsRecord[orderFieldKey] = payload.prop
      paramsRecord[orderTypeKey] = payload.order === 'ascending' ? 'asc' : 'desc'
    }

    // 排序变化通常回到第一页以保持数据一致性
    pagination.current = 1
    paramsRecord[pageKey] = 1

    await getData()
  }

  // 新增后通常回到第一页，确保能看到最新插入的数据
  const refreshCreate = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()
    pagination.current = 1
    ;(searchParams as Record<string, unknown>)[pageKey] = 1
    await getData()
  }

  // 编辑后保持当前页刷新
  const refreshUpdate = async (): Promise<void> => {
    await getData()
  }

  // 删除后如果当前页为空，则自动回退到上一页
  const refreshRemove = async (): Promise<void> => {
    const { current } = pagination

    await getData()

    if (data.value.length === 0 && current > 1) {
      pagination.current = current - 1
      ;(searchParams as Record<string, unknown>)[pageKey] = current - 1
      await getData()
    }
  }

  // 手动刷新场景
  const refreshData = async (): Promise<void> => {
    debouncedGetDataByPage.cancel()
    await getData()
  }

  // 软刷新与普通刷新保持同一行为，便于页面按语义调用
  const refreshSoft = async (): Promise<void> => {
    await getData()
  }

  // 页面卸载或切换条件前，主动取消进行中的请求和防抖任务
  const cancelRequest = (): void => {
    if (abortController) {
      abortController.abort()
    }
    debouncedGetDataByPage.cancel()
  }

  // 清空当前表格数据，但不重置搜索条件
  const clearData = (): void => {
    data.value = []
    error.value = null
  }

  // 需要首屏自动加载时，在组件挂载后执行首次请求
  if (immediate) {
    onMounted(async () => {
      await getData()
    })
  }

  onUnmounted(() => {
    cancelRequest()
  })

  return {
    // 数据状态
    data,
    loading: readonly(loading),
    error: readonly(error),
    isEmpty: computed(() => data.value.length === 0),
    hasData,

    // 分页控制
    pagination: readonly(pagination),
    handleSizeChange,
    handleCurrentChange,
    handleSortChange,

    // 搜索控制
    searchParams,
    replaceSearchParams,
    resetSearchParams,

    // 数据请求
    fetchData: getData,
    getData: getDataByPage,
    getDataDebounced: debouncedGetDataByPage,
    clearData,

    // 刷新策略
    refreshData,
    refreshSoft,
    refreshCreate,
    refreshUpdate,
    refreshRemove,

    // 请求控制
    cancelRequest,

    // 列配置能力按需暴露，避免无 columnsFactory 时返回无效 API
    ...(columnConfig && {
      columns,
      columnChecks,
      addColumn: columnConfig.addColumn,
      removeColumn: columnConfig.removeColumn,
      toggleColumn: columnConfig.toggleColumn,
      updateColumn: columnConfig.updateColumn,
      batchUpdateColumns: columnConfig.batchUpdateColumns,
      reorderColumns: columnConfig.reorderColumns,
      getColumnConfig: columnConfig.getColumnConfig,
      getAllColumns: columnConfig.getAllColumns,
      resetColumns: columnConfig.resetColumns
    })
  }
}

export type { ApiResponse, BaseRequestParams, TableError } from '../utils/table/tableUtils'
