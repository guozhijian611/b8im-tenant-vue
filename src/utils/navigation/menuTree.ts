import type { AppRouteRecord } from '@/types/router'

interface BuildMenuTreeOptions {
  keepNavigableParent?: boolean
}

function isNavigableMenuItem(item: AppRouteRecord): boolean {
  return Boolean(
    !item.meta?.isHide &&
      ((item.path && item.path.trim()) || item.meta?.link || item.meta?.isIframe === true) &&
      (item.component || item.meta?.link || item.meta?.isIframe === true)
  )
}

export function buildRenderableMenuTree(
  items: AppRouteRecord[],
  options: BuildMenuTreeOptions = {}
): AppRouteRecord[] {
  const { keepNavigableParent = false } = options

  return items.reduce<AppRouteRecord[]>((acc, item) => {
    if (item.meta?.isHide) {
      return acc
    }

    const hasChildren = Boolean(item.children?.length)
    const children = hasChildren ? buildRenderableMenuTree(item.children!, options) : undefined
    const hasVisibleChildren = Boolean(children?.length)
    const isNavigable = isNavigableMenuItem(item)
    const shouldKeep =
      hasVisibleChildren ||
      (!hasChildren && isNavigable) ||
      (keepNavigableParent && hasChildren && isNavigable)

    if (!shouldKeep) {
      return acc
    }

    acc.push({
      ...item,
      children: hasVisibleChildren ? children : undefined
    })

    return acc
  }, [])
}
