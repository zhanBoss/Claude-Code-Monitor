import { ThemeConfig, theme as antdTheme } from 'antd'

// 亮色模式主题
export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#667eea',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f7fa',
    colorBorder: '#d9d9d9',
    colorBorderSecondary: '#f0f0f0',
    colorText: '#333333',
    colorTextSecondary: '#666666',
    colorTextTertiary: '#999999',
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
      headerBg: '#262626',
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
  bgSection: isDark ? '#1a1a1a' : '#fafafa',
  border: isDark ? '#434343' : '#d9d9d9',
  borderSecondary: isDark ? '#303030' : '#f0f0f0',
  text: isDark ? '#f0f0f0' : '#333333',           // 提高主文字对比度
  textSecondary: isDark ? '#b8b8b8' : '#666666',  // 提高次级文字对比度
  textTertiary: isDark ? '#8c8c8c' : '#999999',   // 提高三级文字对比度
  codeBg: isDark ? '#2a2a2a' : '#f5f5f5',
  hoverBg: isDark ? '#2a2a2a' : '#f5f5f5',
})
