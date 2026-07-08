import request from '@/utils/http'

/**
 * 日志API
 */
export default {
  /**
   * 登录日志
   * @param params 搜索参数
   * @returns 数据列表
   */
  loginList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({
      url: '/saimulti/tenant/loginLog/index',
      params
    })
  },

  /**
   * 删除登录日志
   * @param id 数据ID
   * @returns 执行结果
   */
  destroyLogin(params: Record<string, any>) {
    return request.del<any>({
      url: '/saimulti/tenant/loginLog/destroy',
      data: params
    })
  },

  /**
   * 操作日志
   * @param params 搜索参数
   * @returns 数据列表
   */
  operList(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({
      url: '/saimulti/tenant/operateLog/index',
      params
    })
  },

  /**
   * 删除操作日志
   * @param id 数据ID
   * @returns 执行结果
   */
  destroyOper(params: Record<string, any>) {
    return request.del<any>({
      url: '/saimulti/tenant/operateLog/destroy',
      data: params
    })
  }
}
