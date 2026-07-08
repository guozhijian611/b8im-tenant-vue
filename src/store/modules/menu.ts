import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppRouteRecord } from '@/types/router'
import { getFirstMenuPath } from '@/utils'
import { HOME_PAGE_PATH } from '@/router'
import { buildRenderableMenuTree } from '@/utils/navigation'

export const useMenuStore = defineStore('menuStore', () => {
  const homePath = ref(HOME_PAGE_PATH)
  const menuList = ref<AppRouteRecord[]>([])
  const sidebarMenuList = ref<AppRouteRecord[]>([])
  const headerMenuList = ref<AppRouteRecord[]>([])
  const menuWidth = ref('')
  const removeRouteFns = ref<(() => void)[]>([])

  const setMenuList = (list: AppRouteRecord[]) => {
    menuList.value = list
    sidebarMenuList.value = buildRenderableMenuTree(list, { keepNavigableParent: true })
    headerMenuList.value = buildRenderableMenuTree(list)
    setHomePath(HOME_PAGE_PATH || getFirstMenuPath(list))
  }

  const getHomePath = () => homePath.value

  const setHomePath = (path: string) => {
    homePath.value = path
  }

  const addRemoveRouteFns = (fns: (() => void)[]) => {
    removeRouteFns.value.push(...fns)
  }

  const removeAllDynamicRoutes = () => {
    removeRouteFns.value.forEach((fn) => fn())
    removeRouteFns.value = []
  }

  const clearRemoveRouteFns = () => {
    removeRouteFns.value = []
  }

  return {
    menuList,
    sidebarMenuList,
    headerMenuList,
    menuWidth,
    removeRouteFns,
    setMenuList,
    getHomePath,
    setHomePath,
    addRemoveRouteFns,
    removeAllDynamicRoutes,
    clearRemoveRouteFns
  }
})
