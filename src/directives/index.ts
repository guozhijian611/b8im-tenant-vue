import type { App } from 'vue'
import { setupRippleDirective, type RippleDirective } from './business/ripple'
import { setupRolesDirective, type RolesDirective } from './core/roles'
import { setupPermissionDirective } from './core/permission'

export function setupGlobDirectives(app: App) {
  setupRolesDirective(app) // 角色权限指令
  setupRippleDirective(app) // 水波纹指令
  setupPermissionDirective(app) // 权限指令
}

export type { RippleDirective, RolesDirective }
