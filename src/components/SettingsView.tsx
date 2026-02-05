import { useState, useEffect, useRef } from 'react'
import { Card, Switch, Input, Button, Typography, Space, Divider, Tag, message, Segmented, Select, Modal } from 'antd'
import {
  SaveOutlined,
  BulbOutlined,
  RobotOutlined,
  LinkOutlined,
  SunOutlined,
  MoonOutlined,
  LaptopOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CodeOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import { AppSettings } from '../types'
import { getThemeVars } from '../theme'
import ConfigFileEditor from './ConfigFileEditor'
import ConfigEditor, { ConfigEditorRef } from './ConfigEditor'
import RecordControl, { RecordControlRef } from './RecordControl'
import { getElectronModalConfig } from './ElectronModal'

const { Text, Link } = Typography

// AI 提供商类型
type ProviderType = 'groq' | 'deepseek' | 'gemini' | 'custom'

interface SettingsViewProps {
  darkMode: boolean
  onThemeModeChange?: (themeMode: 'light' | 'dark' | 'system') => void
  claudeDir?: string
  scrollToSection?: string | null
  onScrollComplete?: () => void
}

function SettingsView({ darkMode, onThemeModeChange, claudeDir, scrollToSection, onScrollComplete }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings>({
    themeMode: 'system',
    autoStart: false,
    ai: {
      enabled: false,
      provider: 'groq',
      providers: {
        groq: {
          apiKey: '',
          apiBaseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        },
        deepseek: {
          apiKey: '',
          apiBaseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat'
        },
        gemini: {
          apiKey: '',
          apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          model: 'gemini-2.0-flash-exp'
        },
        custom: {
          apiKey: '',
          apiBaseUrl: '',
          model: ''
        }
      }
    }
  })
  const [apiKeySaving, setApiKeySaving] = useState(false)
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [isEditingApiKey, setIsEditingApiKey] = useState(false)
  const [configEditorVisible, setConfigEditorVisible] = useState(false)
  const [configPath, setConfigPath] = useState('')

  // ConfigEditor 的 ref，用于刷新数据
  const configEditorRef = useRef<ConfigEditorRef>(null)
  // RecordControl 的 ref，用于刷新数据
  const recordControlRef = useRef<RecordControlRef>(null)

  const themeVars = getThemeVars(darkMode)

  // 处理滚动到指定区域
  useEffect(() => {
    if (scrollToSection) {
      const timer = setTimeout(() => {
        const element = document.getElementById(scrollToSection)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 添加高亮效果
          element.style.transition = 'box-shadow 0.3s ease'
          element.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.3)'
          setTimeout(() => {
            element.style.boxShadow = ''
          }, 2000)
        }
        onScrollComplete?.()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [scrollToSection, onScrollComplete])

  // 打开配置文件编辑器
  const handleShowConfigPath = async () => {
    try {
      const path = await window.electronAPI.getConfigPath()
      setConfigPath(path)
      setConfigEditorVisible(true)
    } catch (error) {
      message.error('获取配置路径失败')
    }
  }

  // AI 提供商配置
  const providerConfigs: Record<ProviderType, { name: string; getKeyUrl: string; description: string }> = {
    groq: {
      name: 'Groq (免费)',
      getKeyUrl: 'https://console.groq.com/keys',
      description: '完全免费，速度超快'
    },
    deepseek: {
      name: 'DeepSeek',
      getKeyUrl: 'https://platform.deepseek.com/api_keys',
      description: '有限免费额度'
    },
    gemini: {
      name: 'Google Gemini (免费)',
      getKeyUrl: 'https://aistudio.google.com/app/apikey',
      description: '慷慨的免费额度'
    },
    custom: {
      name: '自定义',
      getKeyUrl: '',
      description: '完全自定义配置，支持任意 API 服务'
    }
  }

  // 获取当前提供商配置（类型安全）
  const getCurrentProviderInfo = () => {
    const provider = settings.ai.provider as ProviderType
    return providerConfigs[provider] || providerConfigs.groq
  }

  // 获取当前提供商的配置（带默认值保护）
  const getCurrentProviderConfig = () => {
    const defaultConfig = {
      apiKey: '',
      apiBaseUrl: '',
      model: ''
    }

    if (!settings.ai.providers) {
      return defaultConfig
    }

    return settings.ai.providers[settings.ai.provider] || defaultConfig
  }

  // 遮罩 API Key（显示前4位和后4位）
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 8) return key
    return `${key.substring(0, 4)}${'*'.repeat(Math.min(key.length - 8, 16))}${key.substring(key.length - 4)}`
  }

  // 切换 AI 提供商
  const handleProviderChange = (provider: 'deepseek' | 'groq' | 'gemini' | 'custom') => {
    const newSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        provider
      }
    }
    setSettings(newSettings)
    saveSettingsImmediately(newSettings)
    setIsEditingApiKey(false)
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getAppSettings()

      // 确保 providers 结构完整
      if (!loadedSettings.ai.providers) {
        loadedSettings.ai.providers = {
          groq: {
            apiKey: '',
            apiBaseUrl: 'https://api.groq.com/openai/v1',
            model: 'llama-3.3-70b-versatile'
          },
          deepseek: {
            apiKey: '',
            apiBaseUrl: 'https://api.deepseek.com/v1',
            model: 'deepseek-chat'
          },
          gemini: {
            apiKey: '',
            apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
            model: 'gemini-2.0-flash-exp'
          },
          custom: {
            apiKey: '',
            apiBaseUrl: '',
            model: ''
          }
        }
      }

      // 确保每个 provider 都存在
      const providers: ProviderType[] = ['groq', 'deepseek', 'gemini', 'custom']
      providers.forEach(provider => {
        if (!loadedSettings.ai.providers[provider]) {
          const defaults: Record<ProviderType, { apiKey: string; apiBaseUrl: string; model: string }> = {
            groq: {
              apiKey: '',
              apiBaseUrl: 'https://api.groq.com/openai/v1',
              model: 'llama-3.3-70b-versatile'
            },
            deepseek: {
              apiKey: '',
              apiBaseUrl: 'https://api.deepseek.com/v1',
              model: 'deepseek-chat'
            },
            gemini: {
              apiKey: '',
              apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
              model: 'gemini-2.0-flash-exp'
            },
            custom: {
              apiKey: '',
              apiBaseUrl: '',
              model: ''
            }
          }
          loadedSettings.ai.providers[provider] = defaults[provider]
        }
      })

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

  // 卸载应用
  const handleUninstall = () => {
    Modal.confirm({
      title: '确认卸载应用',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>卸载应用将执行以下操作：</p>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>移除应用配置文件（API Key、设置等）</li>
            <li>移除所有 Claude Code 配置备份文件</li>
            <li>保留 Claude Code 原始配置（settings.json 和 history.jsonl）</li>
            <li>关闭应用</li>
          </ul>
          <p style={{ marginTop: 8, color: themeVars.error, fontWeight: 500 }}>
            此操作不可恢复，请确认是否继续？
          </p>
        </div>
      ),
      okText: '确认卸载',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await window.electronAPI.uninstallApp()
          message.success('应用已卸载')
        } catch (error: any) {
          message.error(`卸载失败: ${error?.message || '未知错误'}`)
        }
      },
      ...getElectronModalConfig()
    })
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

  // 更新当前提供商的配置
  const updateCurrentProviderConfig = (key: 'apiKey' | 'apiBaseUrl' | 'model', value: string) => {
    const newSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        providers: {
          ...settings.ai.providers,
          [settings.ai.provider]: {
            ...settings.ai.providers[settings.ai.provider],
            [key]: value
          }
        }
      }
    }
    setSettings(newSettings)

    // API Key 不即时保存，其他设置即时保存
    if (key !== 'apiKey') {
      saveSettingsImmediately(newSettings)
    }
  }

  const updateAISetting = (key: 'enabled', value: boolean) => {
    const newSettings = {
      ...settings,
      ai: {
        ...settings.ai,
        [key]: value
      }
    }
    setSettings(newSettings)
    saveSettingsImmediately(newSettings)
  }


  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: themeVars.bgLayout
    }}>
      {/* 顶部标题栏 - 可拖动 */}
      <div style={{
        padding: '16px',
        borderBottom: `1px solid ${themeVars.borderSecondary}`,
        background: themeVars.bgSection,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          应用设置
        </Text>
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
          gap: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          paddingBottom: '24px',
          width: '100%'
        }}>
          {/* 卡片 1: 通用设置 */}
          <Card
            title={
              <Space>
                <BulbOutlined style={{ color: themeVars.primary }} />
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

              <Divider style={{ margin: 0 }} />

              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>Claude Code 目录</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '12px', display: 'block' }}>
                  当前监控的 Claude Code 安装路径
                </Text>
                <Input
                  value={claudeDir}
                  readOnly
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 12,
                    backgroundColor: themeVars.bgSection
                  }}
                />
              </div>

              <Divider style={{ margin: 0 }} />

              <div>
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>数据存储</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '12px', display: 'block' }}>
                  你的 API Key 和设置存储在本地加密文件中（非 localStorage）
                </Text>
                <Button
                  icon={<FolderOpenOutlined />}
                  onClick={handleShowConfigPath}
                  block
                >
                  查看配置文件位置
                </Button>
              </div>
            </Space>
          </Card>

          {/* 卡片 2: Claude Code 配置 */}
          <Card
            title={
              <Space>
                <CodeOutlined style={{ color: themeVars.primary }} />
                <span>Claude Code 配置</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border
            }}
          >
            <ConfigEditor ref={configEditorRef} darkMode={darkMode} />
          </Card>

          {/* 卡片 3: 对话记录管理 */}
          <Card
            id="record-control"
            title={
              <Space>
                <PlayCircleOutlined style={{ color: themeVars.primary }} />
                <span>对话记录管理</span>
              </Space>
            }
            style={{
              backgroundColor: themeVars.bgContainer,
              borderColor: themeVars.border
            }}
          >
            <RecordControl ref={recordControlRef} />
          </Card>

          {/* 卡片 4: AI 总结设置 */}
          <Card
            title={
              <Space>
                <RobotOutlined style={{ color: themeVars.primary }} />
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
                <Text style={{ color: themeVars.text, fontWeight: 500 }}>AI 提供商</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '8px', display: 'block' }}>
                  {getCurrentProviderInfo().description}
                </Text>
                <Select
                  value={settings.ai.provider}
                  onChange={handleProviderChange}
                  style={{ width: '100%' }}
                  options={[
                    {
                      label: (
                        <div>
                          <div style={{ fontWeight: 500 }}>Groq (推荐)</div>
                          <div style={{ fontSize: 12, color: themeVars.success }}>✓ 完全免费 · 速度超快</div>
                        </div>
                      ),
                      value: 'groq'
                    },
                    {
                      label: (
                        <div>
                          <div style={{ fontWeight: 500 }}>Google Gemini</div>
                          <div style={{ fontSize: 12, color: themeVars.success }}>✓ 慷慨免费额度</div>
                        </div>
                      ),
                      value: 'gemini'
                    },
                    {
                      label: (
                        <div>
                          <div style={{ fontWeight: 500 }}>DeepSeek</div>
                          <div style={{ fontSize: 12, color: themeVars.warning }}>⚠ 有限免费额度</div>
                        </div>
                      ),
                      value: 'deepseek'
                    },
                    {
                      label: (
                        <div>
                          <div style={{ fontWeight: 500 }}>自定义</div>
                          <div style={{ fontSize: 12, color: themeVars.info }}>⚙️ 任意 API 服务</div>
                        </div>
                      ),
                      value: 'custom'
                    }
                  ]}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <Text style={{ color: themeVars.text, fontWeight: 500 }}>API Key</Text>
                  {getCurrentProviderInfo().getKeyUrl && (
                    <Link
                      href={getCurrentProviderInfo().getKeyUrl}
                      target="_blank"
                      style={{ fontSize: '12px' }}
                    >
                      获取 API Key <LinkOutlined />
                    </Link>
                  )}
                </div>
                <Input.Password
                  value={getCurrentProviderConfig().apiKey}
                  onChange={(e) => {
                    updateCurrentProviderConfig('apiKey', e.target.value)
                    setIsEditingApiKey(true)
                  }}
                  placeholder={`请输入 ${getCurrentProviderInfo().name} API Key`}
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
                    {getCurrentProviderConfig().apiKey && !isEditingApiKey
                      ? `已设置: ${maskApiKey(getCurrentProviderConfig().apiKey)}`
                      : '你的 API Key 将加密存储在本地'}
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
                    disabled={!isEditingApiKey && !!getCurrentProviderConfig().apiKey}
                  >
                    保存 API Key
                  </Button>
                </div>
              </div>

              <div>
                <Text style={{ color: themeVars.text }}>API 地址</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '8px', display: 'block' }}>
                  {settings.ai.provider === 'custom'
                    ? '填写完整的 API 地址（支持任意服务、代理、中转）'
                    : '高级选项，通常无需修改'}
                </Text>
                <Input
                  value={getCurrentProviderConfig().apiBaseUrl}
                  onChange={(e) => updateCurrentProviderConfig('apiBaseUrl', e.target.value)}
                  placeholder={settings.ai.provider === 'custom' ? '例如: https://your-api.com/v1' : getCurrentProviderConfig().apiBaseUrl}
                />
              </div>

              <div>
                <Text style={{ color: themeVars.text }}>模型名称</Text>
                <br />
                <Text type="secondary" style={{ fontSize: '12px', color: themeVars.textSecondary, marginBottom: '8px', display: 'block' }}>
                  {settings.ai.provider === 'custom'
                    ? '填写模型 ID（根据你的 API 服务要求）'
                    : '默认已选择最优模型，通常无需修改'}
                </Text>
                <Input
                  value={getCurrentProviderConfig().model}
                  onChange={(e) => updateCurrentProviderConfig('model', e.target.value)}
                  placeholder={settings.ai.provider === 'custom' ? '例如: gpt-4, claude-3, llama-3 等' : getCurrentProviderConfig().model}
                />
              </div>
            </Space>
          </Card>
        </div>

        {/* 卸载应用 - 放在最底部 */}
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          width: '100%',
          textAlign: 'center',
          paddingTop: '24px',
          borderTop: `1px solid ${themeVars.borderSecondary}`
        }}>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={handleUninstall}
            size="small"
            style={{ padding: '4px 8px' }}
          >
            卸载应用
          </Button>
        </div>

        {/* 配置文件编辑器 */}
        <ConfigFileEditor
          title="编辑应用配置文件"
          filePath={configPath}
          darkMode={darkMode}
          visible={configEditorVisible}
          onClose={() => setConfigEditorVisible(false)}
          onLoad={async () => {
            const content = await window.electronAPI.readAppConfigFile()
            return content
          }}
          onSave={async (content: string) => {
            await window.electronAPI.saveAppConfigFile(content)
            // 重新加载设置
            await loadSettings()
            // 刷新所有组件的数据
            await Promise.all([
              configEditorRef.current?.refresh(),
              recordControlRef.current?.refresh()
            ])
            // 解析配置并更新主题
            try {
              const config = JSON.parse(content)
              if (config.themeMode && onThemeModeChange) {
                onThemeModeChange(config.themeMode)
              }
            } catch (error) {
              console.error('解析配置失败:', error)
            }
            message.success('配置已保存并刷新')
          }}
          onOpenFolder={async () => {
            await window.electronAPI.showConfigInFolder()
          }}
        />
      </div>
    </div>
  )
}

export default SettingsView
