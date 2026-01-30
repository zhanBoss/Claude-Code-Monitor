import { useEffect, useState } from 'react'
import { Layout, Result, Button, ConfigProvider, Drawer, Spin } from 'antd'
import { WarningOutlined, LoadingOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import StatusBar from './components/StatusBar'
import ConfigEditor from './components/ConfigEditor'
import RecordControl from './components/RecordControl'
import LogViewer from './components/LogViewer'
import HistoryViewer from './components/HistoryViewer'
import SettingsView from './components/SettingsView'
import { ClaudeRecord } from './types'
import { lightTheme, darkTheme, getThemeVars } from './theme'
import 'antd/dist/reset.css'

const { Content, Sider } = Layout

type ViewMode = 'realtime' | 'history' | 'settings'

function App() {
  const [isClaudeInstalled, setIsClaudeInstalled] = useState<boolean>(false)
  const [isCheckingClaude, setIsCheckingClaude] = useState<boolean>(true)
  const [claudeDir, setClaudeDir] = useState<string>('')
  const [records, setRecords] = useState<ClaudeRecord[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('realtime')
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false)
  const [siderCollapsed, setSiderCollapsed] = useState<boolean>(false)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')

  // 检测系统主题
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateDarkMode = () => {
      if (themeMode === 'system') {
        setDarkMode(mediaQuery.matches)
      } else {
        setDarkMode(themeMode === 'dark')
      }
    }

    updateDarkMode()

    // 监听系统主题变化
    const handler = () => {
      if (themeMode === 'system') {
        setDarkMode(mediaQuery.matches)
      }
    }
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [themeMode])

  useEffect(() => {
    // 检查 Claude Code 是否安装
    window.electronAPI.checkClaudeInstalled().then(result => {
      setIsClaudeInstalled(result.installed)
      if (result.claudeDir) {
        setClaudeDir(result.claudeDir)
      }
      setIsCheckingClaude(false)
    })

    // 加载应用设置
    window.electronAPI.getAppSettings().then(settings => {
      setThemeMode(settings.themeMode)
    })

    // 监听新记录
    const cleanup = window.electronAPI.onNewRecord((record) => {
      setRecords(prev => [record, ...prev])
    })

    // 清理监听器
    return cleanup
  }, [])

  // 当侧边栏展开时，自动关闭 Drawer
  useEffect(() => {
    if (!siderCollapsed && drawerVisible) {
      setDrawerVisible(false)
    }
  }, [siderCollapsed, drawerVisible])

  // 检测中显示加载状态
  if (isCheckingClaude) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48, color: '#667eea' }} spin />}
          size="large"
        />
        <div style={{
          fontSize: 16,
          color: '#667eea',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          检测 Claude Code 中...
        </div>
      </div>
    )
  }

  // 未安装 Claude Code
  if (!isClaudeInstalled) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <Result
          icon={<WarningOutlined style={{ fontSize: 72, color: '#faad14' }} />}
          title="未检测到 Claude Code"
          subTitle="请先安装 Claude Code 才能使用本应用"
          extra={[
            <Button
              type="primary"
              size="large"
              key="install"
              href="https://claude.ai/code"
              target="_blank"
            >
              前往安装 Claude Code
            </Button>,
            <div key="hint" style={{ marginTop: 16, fontSize: 12, color: '#999' }}>
              安装后请重启本应用
            </div>
          ]}
          style={{
            background: 'white',
            borderRadius: 16,
            padding: '48px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }}
        />
      </div>
    )
  }

  const handleClearRecords = () => {
    setRecords([])
  }

  const handleToggleView = () => {
    setViewMode(prev => prev === 'realtime' ? 'history' : 'realtime')
  }


  const themeVars = getThemeVars(darkMode)

  return (
    <ConfigProvider theme={darkMode ? darkTheme : lightTheme} locale={zhCN}>
      <Layout style={{ height: '100vh' }}>
        <StatusBar
          claudeDir={claudeDir}
          onOpenSettings={() => setViewMode('settings')}
        />

        <Layout style={{ minHeight: 0 }}>
          {/* 左侧：配置和控制 */}
          <Sider
            width="50%"
            theme={darkMode ? 'dark' : 'light'}
            breakpoint="lg"
            collapsedWidth={0}
            onBreakpoint={(broken) => {
              setSiderCollapsed(broken)
            }}
            onCollapse={(collapsed) => {
              setSiderCollapsed(collapsed)
            }}
            style={{
              borderRight: `1px solid ${themeVars.borderSecondary}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 400,
              maxWidth: '50%',
              background: themeVars.bgContainer
            }}
          >
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
              minHeight: 0
            }}>
              <ConfigEditor darkMode={darkMode} />
            </div>
            <div style={{
              borderTop: `1px solid ${themeVars.borderSecondary}`,
              padding: 24,
              background: themeVars.bgSection,
              flexShrink: 0
            }}>
              <RecordControl darkMode={darkMode} />
            </div>
          </Sider>

          {/* 右侧：日志查看 */}
          <Content style={{
            display: 'flex',
            flexDirection: 'column',
            minWidth: 400,
            overflow: 'hidden'
          }}>
            {viewMode === 'realtime' ? (
              <LogViewer
                records={records}
                onClear={handleClearRecords}
                onToggleView={handleToggleView}
                onOpenDrawer={() => setDrawerVisible(true)}
                onOpenSettings={() => setViewMode('settings')}
                showDrawerButton={siderCollapsed && !drawerVisible}
                darkMode={darkMode}
              />
            ) : viewMode === 'history' ? (
              <HistoryViewer
                onToggleView={handleToggleView}
                onOpenSettings={() => setViewMode('settings')}
                darkMode={darkMode}
              />
            ) : (
              <SettingsView
                onBack={() => setViewMode('realtime')}
                darkMode={darkMode}
                onThemeModeChange={setThemeMode}
                claudeDir={claudeDir}
              />
            )}
          </Content>
        </Layout>

        {/* 抽屉：小屏幕下显示配置 */}
        <Drawer
          title="配置与控制"
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          size={400}
          closable={false}
          styles={{
            header: {
              paddingLeft: 80  // 为 macOS 全屏模式的窗口控制按钮预留空间
            }
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ flex: 1, overflow: 'auto', marginBottom: 24 }}>
              <ConfigEditor darkMode={darkMode} />
            </div>
            <div style={{
              borderTop: `1px solid ${themeVars.borderSecondary}`,
              paddingTop: 24
            }}>
              <RecordControl darkMode={darkMode} />
            </div>
          </div>
        </Drawer>

      </Layout>
    </ConfigProvider>
  )
}

export default App
