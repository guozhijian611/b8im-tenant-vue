import { HeaderBarFeatureConfig } from '@/types'

export const headerBarConfig: HeaderBarFeatureConfig = {
  menuButton: {
    enabled: true,
    description: '控制左侧菜单展开和收起'
  },
  refreshButton: {
    enabled: true,
    description: '页面刷新按钮'
  },
  breadcrumb: {
    enabled: true,
    description: '面包屑导航'
  },
  fullscreen: {
    enabled: true,
    description: '全屏切换按钮'
  },
  notification: {
    enabled: true,
    description: '通知中心'
  },
  language: {
    enabled: true,
    description: '多语言切换'
  },
  settings: {
    enabled: true,
    description: '系统设置面板'
  },
  themeToggle: {
    enabled: true,
    description: '主题切换'
  }
}

export default headerBarConfig
