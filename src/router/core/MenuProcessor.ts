import type { AppRouteRecord } from '@/types/router'
import { fetchGetMenuList } from '@/api/auth'
import { RoutesAlias } from '../routesAlias'
import { formatMenuTitle } from '@/utils'

export class MenuProcessor {
  async getMenuList(): Promise<AppRouteRecord[]> {
    const menuList = await fetchGetMenuList()

    this.validateMenuPaths(menuList)
    return this.normalizeMenuPaths(menuList)
  }

  validateMenuList(menuList: AppRouteRecord[]): boolean {
    return Array.isArray(menuList) && menuList.length > 0
  }

  private normalizeMenuPaths(menuList: AppRouteRecord[], parentPath = ''): AppRouteRecord[] {
    return menuList
      .map((item) => {
        const fullPath = this.buildFullPath(item.path || '', parentPath)
        const children = item.children?.length
          ? this.normalizeMenuPaths(item.children, fullPath)
          : item.children
        const redirect = item.redirect || this.resolveDefaultRedirect(children)

        return {
          ...item,
          path: fullPath,
          redirect,
          children
        }
      })
      .filter((item) => this.shouldKeepMenuItem(item))
  }

  private shouldKeepMenuItem(item: AppRouteRecord): boolean {
    if (item.children !== undefined) {
      return true
    }

    if (item.meta?.isIframe === true || item.meta?.link) {
      return true
    }

    return Boolean(item.component && item.component !== '' && item.component !== RoutesAlias.Layout)
  }

  private resolveDefaultRedirect(children?: AppRouteRecord[]): string | undefined {
    if (!children?.length) {
      return undefined
    }

    for (const child of children) {
      if (this.isNavigableRoute(child)) {
        return child.path
      }

      const nestedRedirect = this.resolveDefaultRedirect(child.children)
      if (nestedRedirect) {
        return nestedRedirect
      }
    }

    return undefined
  }

  private isNavigableRoute(route: AppRouteRecord): boolean {
    return Boolean(
      route.path &&
        route.path !== '/' &&
        !route.meta?.link &&
        route.meta?.isIframe !== true &&
        route.component &&
        route.component !== ''
    )
  }

  private validateMenuPaths(menuList: AppRouteRecord[], level = 1): void {
    menuList.forEach((route) => {
      if (!route.children?.length) return

      route.children.forEach((child) => {
        const childPath = child.path || ''

        if (this.isValidAbsolutePath(childPath)) return
      })

      this.validateMenuPaths(route.children, level + 1)
    })
  }

  private isValidAbsolutePath(path: string): boolean {
    return (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('/outside/iframe/')
    )
  }

  private logPathError(
    route: AppRouteRecord,
    path: string,
    parentName: string,
    level: number
  ): void {
    const routeName = String(route.name || path || 'UnknownRoute')
    const menuTitle = route.meta?.title || routeName
    const suggestedPath = path.split('/').pop() || path.slice(1)

    console.error(
      `[RouteConfigError] menu "${formatMenuTitle(menuTitle)}" (name: ${routeName}, path: ${path}) is invalid.\n` +
        `  position: ${parentName} > ${routeName}\n` +
        `  issue: level ${level + 1} child path should not start with "/"\n` +
        `  current: path: '${path}'\n` +
        `  expected: path: '${suggestedPath}'`
    )
  }

  private buildFullPath(path: string, parentPath: string): string {
    if (!path) return ''

    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    if (path.startsWith('/')) {
      return path
    }

    if (parentPath) {
      const cleanParent = parentPath.replace(/\/$/, '')
      const cleanChild = path.replace(/^\//, '')
      return `${cleanParent}/${cleanChild}`
    }

    return `/${path}`
  }
}
