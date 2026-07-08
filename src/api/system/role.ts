import request from '@/utils/http'

/**
 * 角色API
 */
export default {
  /**
   * 获取数据列表
   * @param params 搜索参数
   * @returns 数据列表
   */
  list(params: Record<string, any>) {
    return request.get<Api.Common.ApiPage>({
      url: 'saimulti/tenant/role/index',
      params
    })
  },

  /**
   * 读取数据
   * @param id 数据ID
   * @returns 数据详情
   */
  read(id: number | string) {
    return request.get<Api.Common.ApiData>({
      url: 'saimulti/tenant/role/read?id=' + id
    })
  },

  /**
   * 创建数据
   * @param params 数据参数
   * @returns 执行结果
   */
  save(params: Record<string, any>) {
    return request.post<any>({
      url: 'saimulti/tenant/role/save',
      data: params
    })
  },

  /**
   * 更新数据
   * @param params 数据参数
   * @returns 执行结果
   */
  update(params: Record<string, any>) {
    return request.put<any>({
      url: 'saimulti/tenant/role/update',
      data: params
    })
  },

  /**
   * 删除数据
   * @param id 数据ID
   * @returns 执行结果
   */
  delete(params: Record<string, any>) {
    return request.del<any>({
      url: 'saimulti/tenant/role/destroy',
      data: params
    })
  },

  /**
   * 获取数据列表
   * @param params 搜索参数
   * @returns 数据列表
   */
  menuByRole(params: Record<string, any>) {
    return request.get<Api.Common.ApiData>({
      url: 'saimulti/tenant/role/getMenuByRole',
      params
    })
  },

  /**
   * 可操作角色
   * @returns 数据列表
   */
  accessRole() {
    return request.get<Api.Common.ApiData[]>({
      url: 'saimulti/tenant/role/accessRole'
    })
  },

  /**
   * 保存菜单权限
   * @param params
   * @returns
   */
  menuPermission(params: Record<string, any>) {
    return request.post<any>({
      url: 'saimulti/tenant/role/menuPermission',
      data: params
    })
  },

  /**
   * 获取部门数据列表
   * @param params 搜索参数
   * @returns 数据列表
   */
  deptByRole(params: Record<string, any>) {
    return request.get<Api.Common.ApiData[]>({
      url: 'saimulti/tenant/role/getDeptByRole',
      params
    })
  },

  /**
   * 保存数据权限
   * @param params
   * @returns
   */
  dataPermission(params: Record<string, any>) {
    return request.post<any>({
      url: 'saimulti/tenant/role/dataPermission',
      data: params
    })
  }
}
