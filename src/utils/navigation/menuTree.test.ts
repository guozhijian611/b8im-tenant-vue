import { describe, expect, it } from 'vitest'
import type { AppRouteRecord } from '@/types/router'
import { buildRenderableMenuTree } from './menuTree'

const route = (item: Partial<AppRouteRecord>): AppRouteRecord => item as AppRouteRecord

describe('buildRenderableMenuTree', () => {
  it('removes hidden and non-navigable menu items', () => {
    const result = buildRenderableMenuTree([
      route({ path: '/visible', component: '/visible/index' }),
      route({
        path: '/hidden',
        component: '/hidden/index',
        meta: { title: 'Hidden', isHide: true }
      }),
      route({ path: '/empty' })
    ])

    expect(result.map((item) => item.path)).toEqual(['/visible'])
  })

  it('keeps a group only when it has visible children', () => {
    const result = buildRenderableMenuTree([
      route({
        path: '/system',
        children: [
          route({ path: '/system/users', component: '/system/users/index' }),
          route({
            path: '/system/hidden',
            component: '/system/hidden/index',
            meta: { title: 'Hidden', isHide: true }
          })
        ]
      })
    ])

    expect(result).toHaveLength(1)
    expect(result[0].children?.map((item) => item.path)).toEqual(['/system/users'])
  })

  it('keeps an empty navigable parent only when explicitly requested', () => {
    const item = route({
      path: '/report',
      component: '/report/index',
      children: [
        route({
          path: '/report/hidden',
          component: '/report/hidden',
          meta: { title: 'Hidden', isHide: true }
        })
      ]
    })

    expect(buildRenderableMenuTree([item])).toEqual([])
    expect(buildRenderableMenuTree([item], { keepNavigableParent: true })).toHaveLength(1)
  })
})
