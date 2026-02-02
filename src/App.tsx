import { useEffect, useState } from 'react'
import { Result, Button, ConfigProvider, Spin } from 'antd'
import { WarningOutlined, LoadingOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/MainLayout'
import LogViewer from './components/LogViewer'
import HistoryViewer from './components/HistoryViewer'
import SettingsView from './components/SettingsView'
import DevFooter from './components/DevFooter'
import { ClaudeRecord } from './types'
import { lightTheme, darkTheme } from './theme'
import 'antd/dist/reset.css'

type Route = 'realtime' | 'history' | 'settings'

function App() {
  const [isClaudeInstalled, setIsClaudeInstalled] = useState<boolean>(false)
  const [isCheckingClaude, setIsCheckingClaude] = useState<boolean>(true)
  const [claudeDir, setClaudeDir] = useState<string>('')
  const [records, setRecords] = useState<ClaudeRecord[]>([])
  const [currentRoute, setCurrentRoute] = useState<Route>('realtime')
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

  // 根据路由渲染不同内容
  const renderContent = () => {
    switch (currentRoute) {
      case 'realtime':
        return (
          <LogViewer
            records={records}
            onClear={handleClearRecords}
            onOpenSettings={() => setCurrentRoute('settings')}
            darkMode={darkMode}
          />
        )
      case 'history':
        return (
          <HistoryViewer
            onOpenSettings={() => setCurrentRoute('settings')}
            darkMode={darkMode}
          />
        )
      case 'settings':
        return (
          <SettingsView
            darkMode={darkMode}
            onThemeModeChange={setThemeMode}
            claudeDir={claudeDir}
          />
        )
      default:
        return null
    }
  }

  return (
    <ConfigProvider theme={darkMode ? darkTheme : lightTheme} locale={zhCN}>
      <MainLayout
        currentRoute={currentRoute}
        onRouteChange={setCurrentRoute}
        darkMode={darkMode}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      >
        {renderContent()}
      </MainLayout>

      {/* 开发模式提示（仅开发构建版本显示） */}
      {__IS_DEV_BUILD__ && <DevFooter />}
    </ConfigProvider>
  )
}

export default App
