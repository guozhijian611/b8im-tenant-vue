/**
 * Pinia Store 配置
 *
 * 统一初始化全局状态管理，并使用固定的 localStorage 键做持久化。
 */

import type { App } from 'vue'
import { createPinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'

export const store = createPinia()

store.use(
  createPersistedState({
    key: (storeId: string) => storeId,
    storage: localStorage,
    serializer: {
      serialize: JSON.stringify,
      deserialize: JSON.parse
    }
  })
)

export function initStore(app: App<Element>): void {
  app.use(store)
}
