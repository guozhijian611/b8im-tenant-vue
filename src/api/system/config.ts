import request from '@/utils/http'

/**
 * 系统设置API
 */
export default {
  /**
   * 基础配置
   * @returns 基础配置信息
   */
  basic() {
    return request.get<Api.Common.ApiPage>({
      url: '/saimulti/tenant/config/basicConfig'
    })
  },

  /**
   * 保存基础配置
   * @param params 数据参数
   * @returns 执行结果
   */
  saveBasic(params: Record<string, any>) {
    return request.post<Api.Common.ApiData>({
      url: '/saimulti/tenant/config/saveBasic',
      data: params
    })
  },

  /**
   * 分组配置
   * @returns 数据列表
   */
  groupConfig() {
    return request.get<Api.Common.ApiData>({
      url: '/saimulti/tenant/config/groupConfig'
    })
  },

  /**
   * 保存分组配置
   * @param params 数据参数
   * @returns 执行结果
   */
  saveGroup(params: Record<string, any>) {
    return request.post<any>({
      url: '/saimulti/tenant/config/saveGroup',
      data: params
    })
  }
}
