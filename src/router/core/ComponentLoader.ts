import { h } from 'vue'
import type { AppRouteRecord } from '@/types/router'
import { RoutesAlias } from '../routesAlias'

export class ComponentLoader {
  private modules: Record<string, () => Promise<any>>
  private preloadTasks = new Map<string, Promise<any>>()

  constructor() {
    this.modules = import.meta.glob('../../views/**/*.vue')
  }

  load(componentPath: string): () => Promise<any> {
    if (!componentPath) {
      return this.createEmptyComponent()
    }

    const module = this.resolveModule(componentPath)

    if (!module) {
      console.error(`[ComponentLoader] Missing component: ${componentPath}`)
      return this.createErrorComponent(componentPath)
    }

    return module
  }

  preloadMenuRoutes(menuList: AppRouteRecord[]): void {
    const componentPaths = new Set<string>()

    const collectComponentPaths = (routes: AppRouteRecord[]) => {
      routes.forEach((route) => {
        if (
          typeof route.component === 'string' &&
          route.component &&
          route.component !== RoutesAlias.Layout &&
          !route.meta?.link &&
          route.meta?.isIframe !== true
        ) {
          componentPaths.add(route.component)
        }

        if (route.children?.length) {
          collectComponentPaths(route.children)
        }
      })
    }

    collectComponentPaths(menuList)

    setTimeout(() => {
      componentPaths.forEach((componentPath) => {
        this.preload(componentPath)
      })
    }, 0)
  }

  loadLayout(): () => Promise<any> {
    return () => import('@/views/index/index.vue')
  }

  loadIframe(): () => Promise<any> {
    return () => import('@/views/outside/Iframe.vue')
  }

  private createEmptyComponent(): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', {})
        }
      })
  }

  private createErrorComponent(componentPath: string): () => Promise<any> {
    return () =>
      Promise.resolve({
        render() {
          return h('div', { class: 'route-error' }, `Component not found: ${componentPath}`)
        }
      })
  }

  private preload(componentPath: string): void {
    const module = this.resolveModule(componentPath)
    if (!module || this.preloadTasks.has(componentPath)) {
      return
    }

    const preloadTask = module().catch((error) => {
      console.warn(`[ComponentLoader] Failed to preload component: ${componentPath}`, error)
    })

    this.preloadTasks.set(componentPath, preloadTask)
  }

  private resolveModule(componentPath: string): (() => Promise<any>) | undefined {
    const fullPath = `../../views${componentPath}.vue`
    const fullPathWithIndex = `../../views${componentPath}/index.vue`
    return this.modules[fullPath] || this.modules[fullPathWithIndex]
  }
}
