import { useState, useEffect } from 'react'
import { Card, Switch, Input, Button, Typography, Space, Divider, Tag, message, Segmented } from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  BulbOutlined,
  RobotOutlined,
  LinkOutlined,
  SunOutlined,
  MoonOutlined,
  LaptopOutlined
} from '@ant-design/icons'
import { AppSettings } from '../types'
import { getThemeVars } from '../theme'

const { Title, Text, Link } = Typography

interface SettingsViewProps {
  onBack: () => void
  darkMode: boolean
  onThemeModeChange?: (themeMode: 'light' | 'dark' | 'system') => void
}

function SettingsView({ onBack, darkMode, onThemeModeChange }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>({
    themeMode: 'system',
    autoStart: false,
    ai: {
      enabled: false,
      provider: 'deepseek',
      apiKey: '',
      apiBaseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat'
    }
  })
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [isEditingApiKey, setIsEditingApiKey] = useState(false)

  const themeVars = getThemeVars(darkMode)

  // 遮罩 API Key（显示前4位和后4位）
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key
    return `${key.substring(0, 4)}${'*'.repeat(Math.min(key.length - 8, 16))}${key.substring(key.length - 4)}`
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getAppSettings()
      setSettings(loadedSettings)
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  // 即时保存设置（不包括 API Key）
  const saveSettingsImmediately = async (newSettings: AppSettings) => {
    try {
      await window.electronAPI.saveAppSettings(newSettings)
    } catch (error) {
      console.error('保存设置失败:', error)
      message.error('保存设置失败')
    }
  }

  // 保存 API Key
  const handleSaveApiKey = async () => {
    setApiKeySaving(true)
    try {
      const result = await window.electronAPI.saveAppSettings(settings)
      if (result.success) {
        message.success('API Key 保存成功')
      } else {
        console.error('保存 API Key 失败:', result.error)
        message.error('保存 API Key 失败')
      }
    } catch (error) {
      console.error('保存 API Key 失败:', error)
      message.error('保存 API Key 失败')
    } finally {
      setApiKeySaving(false)
    }
  }

  const updateAISetting = <K extends keyof AppSettings['ai']>(
    key: K,
    value: AppSettings['ai'][K]
  ) => {
    const newSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        [key]: value
      }
    }
    setSettings(newSettings)

    // API Key 不即时保存，其他设置即时保存
    if (key !== 'apiKey') {
      saveSettingsImmediately(newSettings)
    }
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: themeVars.bgLayout,
      overflow: 'hidden'
    }}>
      {/* 顶部标题栏 */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: themeVars.bgContainer,
        borderBottom: `1px solid ${themeVars.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            type="text"
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0, color: themeVars.text }}>
            设置
          </Title>
        </Space>
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        padding: '24px',
        overflow: 'auto',
        minHeight: 0
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          paddingBottom: '24px'
        }}>
          {/* 卡片 1: 通用设置 */}
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: '#667eea' }} />
                <span>通用设置</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border
            }}
          >
            <Space vertical size="large" style={{ width: '100%' }}>
              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>外观主题</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '12px', display: 'block' }}>
                  选择应用的外观主题
                </Text>
                <Segmented
                  value={settings.themeMode}
                  onChange={(value) => {
                    const newSettings = { ...settings, themeMode: value as 'light' | 'dark' | 'system' }
                    setSettings(newSettings)
                    saveSettingsImmediately(newSettings)
                    // 通知父组件更新主题
                    onThemeModeChange?.(value as 'light' | 'dark' | 'system')
                  }}
                  options={[
                    {
                      label: (
                        <div style={{ padding: '4px 8px' }}>
                          <SunOutlined style={{ marginRight: 4 }} />
                          浅色
                        </div>
                      ),
                      value: 'light',
                    },
                    {
                      label: (
                        <div style={{ padding: '4px 8px' }}>
                          <MoonOutlined style={{ marginRight: 4 }} />
                          深色
                        </div>
                      ),
                      value: 'dark',
                    },
                    {
                      label: (
                        <div style={{ padding: '4px 8px' }}>
                          <LaptopOutlined style={{ marginRight: 4 }} />
                          跟随系统
                        </div>
                      ),
                      value: 'system',
                    },
                  ]}
                  block
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <Text style={{ color: themeVars.text }}>开机自启动</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary }}>
                    系统启动时自动运行应用
                  </Text>
                </div>
                <Switch
                  checked={settings.autoStart}
                  onChange={(checked) => {
                    const newSettings = { ...settings, autoStart: checked }
                    setSettings(newSettings)
                    saveSettingsImmediately(newSettings)
                  }}
                />
              </div>
            </Space>
          </Card>

          {/* 卡片 2: AI 总结设置 */}
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: '#667eea' }} />
                <span>AI 总结设置</span>
                <Tag color={settings.ai.enabled ? 'success' : 'default'}>
                  {settings.ai.enabled ? '已启用' : '未启用'}
                </Tag>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border
            }}
          >
            <Space vertical size="large" style={{ width: '100%' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <Text style={{ color: themeVars.text }}>启用 AI 总结</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary }}>
                    使用 AI 自动生成会话总结
                  </Text>
                </div>
                <Switch
                  checked={settings.ai.enabled}
                  onChange={(checked) => updateAISetting('enabled', checked)}
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text style={{ color: themeVars.text }}>API 提供商</Text>
                <Input
                  value="DeepSeek"
                  disabled
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Text style={{ color: themeVars.text, fontWeight: 500 }}>API Key</Text>
                  <Link
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    style={{ fontSize: '12px' }}
                  >
                    获取 API Key <LinkOutlined />
                  </Link>
                </div>
                <Input.Password
                  value={settings.ai.apiKey}
                  onChange={(e) => {
                    updateAISetting('apiKey', e.target.value)
                    setIsEditingApiKey(true)
                  }}
                  placeholder="请输入 DeepSeek API Key"
                  visibilityToggle={{
                    visible: apiKeyVisible,
                    onVisibleChange: setApiKeyVisible
                  }}
                  onPressEnter={handleSaveApiKey}
                  onFocus={() => setIsEditingApiKey(true)}
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary }}>
                    {settings.ai.apiKey && !isEditingApiKey ? `已设置: ${maskApiKey(settings.ai.apiKey)}` : '你的 API Key 将加密存储在本地'}
                  </Text>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                      handleSaveApiKey()
                      setIsEditingApiKey(false)
                    }}
                    loading={apiKeySaving}
                    size="small"
                    disabled={!isEditingApiKey && !!settings.ai.apiKey}
                  >
                    保存 API Key
                  </Button>
                </div>
              </div>

              <div>
                <Text style={{ color: themeVars.text }}>模型</Text>
                <Input
                  value={settings.ai.model}
                  onChange={(e) => updateAISetting('model', e.target.value)}
                  placeholder="deepseek-chat"
                  style={{ marginTop: '8px' }}
                />
              </div>

              <div>
                <Text style={{ color: themeVars.text }}>API 地址</Text>
                <Input
                  value={settings.ai.apiBaseUrl}
                  onChange={(e) => updateAISetting('apiBaseUrl', e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default SettingsView
