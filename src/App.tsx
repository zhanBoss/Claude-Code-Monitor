import { useEffect, useState } from 'react'
import { Result, Button, ConfigProvider, Spin } from 'antd'
import { WarningOutlined, LoadingOutlined } from '@ant-design/icons'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/MainLayout'
import LogViewer from './components/LogViewer'
import HistoryViewer from './components/HistoryViewer'
import CommonPrompts from './components/CommonPrompts'
import ChatView from './components/ChatView'
import SettingsView from './components/SettingsView'
import AboutView from './components/AboutView'
import ChangelogView from './components/ChangelogView'
import DevFooter from './components/DevFooter'
import { ClaudeRecord } from './types'
import { lightTheme, darkTheme, getThemeVars } from './theme'
import 'antd/dist/reset.css'

type Route = 'realtime' | 'history' | 'prompts' | 'chat' | 'settings' | 'changelog' | 'about'

function App() {
  const [isClaudeInstalled, setIsClaudeInstalled] = useState<boolean>(false)
  const [isCheckingClaude, setIsCheckingClaude] = useState<boolean>(true)
  const [claudeDir, setClaudeDir] = useState<string>('')
  const [records, setRecords] = useState<ClaudeRecord[]>([])
  const [currentRoute, setCurrentRoute] = useState<Route>('realtime')
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('system')
  const [scrollToSection, setScrollToSection] = useState<string | null>(null)
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | null>(null)

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

    // 注意：实时对话页面不加载历史记录，只显示当前会话的新记录
    // 历史记录在 HistoryViewer 组件中按需加载

    // 监听新记录
    const cleanup = window.electronAPI.onNewRecord((record) => {
      setRecords(prev => [record, ...prev])
    })

    // 清理监听器
    return cleanup
  }, [])

  // 检测中显示加载状态
  if (isCheckingClaude) {
    const themeVars = getThemeVars(darkMode)
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '24px',
        background: themeVars.primaryGradient
      }}>
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 48, color: themeVars.primary }} spin />}
          size="large"
        />
        <div style={{
          fontSize: 16,
          color: themeVars.primary,
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
    const themeVars = getThemeVars(darkMode)
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: themeVars.primaryGradient
      }}>
        <Result
          icon={<WarningOutlined style={{ fontSize: 72, color: themeVars.primary }} />}
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
            <div key="hint" style={{ marginTop: 16, fontSize: 12, color: themeVars.textTertiary }}>
              安装后请重启本应用
            </div>
          ]}
          style={{
            background: themeVars.bgContainer,
            borderRadius: 16,
            padding: '48px',
            boxShadow: `0 8px 24px ${themeVars.primaryShadow}`
          }}
        />
      </div>
    )
  }

  const handleClearRecords = () => {
    // 只清空当前会话的内存记录，不删除历史文件
    setRecords([])
  }

  const handleOpenSettings = (section?: string) => {
    setCurrentRoute('settings')
    if (section) {
      setScrollToSection(section)
    }
  }

  // 根据路由渲染不同内容
  const renderContent = () => {
    switch (currentRoute) {
      case 'realtime':
        return (
          <LogViewer
            records={records}
            onClear={handleClearRecords}
            onOpenSettings={() => handleOpenSettings('record-control')}
            darkMode={darkMode}
            onSendToChat={(content: string) => {
              setChatInitialPrompt(content)
              setCurrentRoute('chat')
            }}
          />
        )
      case 'history':
        return (
          <HistoryViewer
            onOpenSettings={() => handleOpenSettings('record-control')}
            darkMode={darkMode}
            onSendToChat={(content: string) => {
              setChatInitialPrompt(content)
              setCurrentRoute('chat')
            }}
          />
        )
      case 'prompts':
        return (
          <CommonPrompts
            darkMode={darkMode}
            onSendToChat={(content: string) => {
              setChatInitialPrompt(content)
              setCurrentRoute('chat')
            }}
          />
        )
      case 'chat':
        return (
          <ChatView
            darkMode={darkMode}
            onOpenSettings={handleOpenSettings}
            initialPrompt={chatInitialPrompt}
            onInitialPromptUsed={() => setChatInitialPrompt(null)}
            realtimeRecords={records}
          />
        )
      case 'settings':
        return (
          <SettingsView
            darkMode={darkMode}
            onThemeModeChange={setThemeMode}
            claudeDir={claudeDir}
            scrollToSection={scrollToSection}
            onScrollComplete={() => setScrollToSection(null)}
          />
        )
      case 'changelog':
        return (
          <ChangelogView
            darkMode={darkMode}
          />
        )
      case 'about':
        return (
          <AboutView
            darkMode={darkMode}
          />
        )
      default:
        return null
    }
  }

  const handleRouteChange = (route: string) => {
    setCurrentRoute(route as Route)
  }

  return (
    <ConfigProvider theme={darkMode ? darkTheme : lightTheme} locale={zhCN}>
      <MainLayout
        currentRoute={currentRoute}
        onRouteChange={handleRouteChange}
        darkMode={darkMode}
      >
        {renderContent()}
      </MainLayout>

      {/* 开发模式提示（仅开发构建版本显示） */}
      {__IS_DEV_BUILD__ && <DevFooter darkMode={darkMode} />}
    </ConfigProvider>
  )
}

export default App
