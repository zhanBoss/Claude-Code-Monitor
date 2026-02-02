import { Menu } from 'antd'
import { ThunderboltOutlined, ClockCircleOutlined, SettingOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { getThemeVars } from '../theme'

interface SidebarProps {
  currentRoute: string
  onNavigate: (route: string) => void
  darkMode: boolean
}

function Sidebar({ currentRoute, onNavigate, darkMode }: SidebarProps) {
  const themeVars = getThemeVars(darkMode)

  const menuItems = [
    {
      key: 'realtime',
      icon: <ThunderboltOutlined />,
      label: '实时对话'
    },
    {
      key: 'history',
      icon: <ClockCircleOutlined />,
      label: '历史记录'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '应用设置'
    },
    {
      key: 'changelog',
      icon: <FileTextOutlined />,
      label: '更新日志'
    },
    {
      key: 'about',
      icon: <InfoCircleOutlined />,
      label: '关于'
    }
  ]

  return (
    <div style={{
      width: 200,
      height: '100vh',
      background: themeVars.bgContainer,
      borderRight: `1px solid ${themeVars.borderSecondary}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Logo 区域 */}
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: `1px solid ${themeVars.borderSecondary}`,
        fontSize: 18,
        fontWeight: 600,
        fontFamily: 'Fira Code, monospace',
        color: themeVars.primary,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        CCMonitor
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[currentRoute]}
        onClick={({ key }) => onNavigate(key)}
        items={menuItems}
        style={{
          border: 'none',
          background: 'transparent'
        }}
      />
    </div>
  )
}

export default Sidebar
