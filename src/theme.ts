import { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#667eea',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 6,
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
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
  },
}
