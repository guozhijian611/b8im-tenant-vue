import { useRoute } from 'vue-router'
import type { AppRouteRecord } from '@/types/router'

type AuthItem = NonNullable<AppRouteRecord['meta']['authList']>[number]

export const useAuth = () => {
  const route = useRoute()

  const hasAuth = (auth: string): boolean => {
    const authList: AuthItem[] = Array.isArray(route.meta.authList)
      ? (route.meta.authList as AuthItem[])
      : []

    return authList.some((item) => item?.authMark === auth)
  }

  return {
    hasAuth
  }
}
