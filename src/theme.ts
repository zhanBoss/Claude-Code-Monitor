import { ThemeConfig, theme as antdTheme } from 'antd'

// 亮色模式主题
export const lightTheme: ThemeConfig = {
  token: {
    // 设计系统主色
    colorPrimary: '#667eea',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#3b82f6',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    // 背景色
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f7fa',
    // 边框色
    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',
    // 文本色
    colorText: '#1f2937',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
  },
  components: {
    Button: {
      borderRadius: 6,
      controlHeight: 32,
      fontWeight: 500,
    },
    Card: {
      borderRadiusLG: 8,
      paddingLG: 16,
    },
    Modal: {
      borderRadiusLG: 12,
    },
    Input: {
      borderRadius: 6,
      controlHeight: 36,
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Layout: {
      bodyBg: '#f5f7fa',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      triggerBg: '#f0f0f0',
    },
  },
}

// 暗色模式主题
export const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...lightTheme.token,
    // 暗色模式特定配置 - 提高对比度
    colorBgContainer: '#1f1f1f',
    colorBgElevated: '#262626',
    colorBgLayout: '#141414',
    colorBorder: '#434343',
    colorBorderSecondary: '#303030',
    colorText: '#f0f0f0',           // 提高主文字对比度
    colorTextSecondary: '#b8b8b8',  // 提高次级文字对比度
    colorTextTertiary: '#8c8c8c',   // 提高三级文字对比度
  },
  components: {
    ...lightTheme.components,
    Layout: {
      bodyBg: '#141414',
      headerBg: '#1f1f1f',
      siderBg: '#1f1f1f',
      triggerBg: '#262626',
    },
    Card: {
      ...lightTheme.components?.Card,
      colorBgContainer: '#1f1f1f',
    },
    Modal: {
      ...lightTheme.components?.Modal,
      contentBg: '#1f1f1f',
      headerBg: '#1f1f1f',  // 与 contentBg 保持一致，避免颜色割裂
    },
  },
}

// 向后兼容
export const theme = lightTheme

// 导出 CSS 变量用于内联样式
export const getThemeVars = (isDark: boolean) => ({
  bgContainer: isDark ? '#1f1f1f' : '#ffffff',
  bgElevated: isDark ? '#262626' : '#ffffff',
  bgLayout: isDark ? '#141414' : '#f5f7fa',
  bgSection: isDark ? '#1a1a1a' : '#f9fafb',
  border: isDark ? '#434343' : '#e5e7eb',
  borderSecondary: isDark ? '#303030' : '#f3f4f6',
  text: isDark ? '#f0f0f0' : '#1f2937',
  textSecondary: isDark ? '#b8b8b8' : '#6b7280',
  textTertiary: isDark ? '#8c8c8c' : '#9ca3af',
  codeBg: isDark ? '#2a2a2a' : '#f3f4f6',
  hoverBg: isDark ? '#2a2a2a' : '#f9fafb',
  primary: '#667eea',
  primaryHover: '#5568d3',
})
