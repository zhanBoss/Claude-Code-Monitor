import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Button, Spin, Space, Typography, message } from 'antd'
import {
  EditOutlined,
  SaveOutlined,
  ReloadOutlined,
  FormatPainterOutlined,
  CodeOutlined,
  CloseOutlined,
  FolderOpenOutlined
} from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { getThemeVars } from '../theme'
import ElectronModal from './ElectronModal'

const { Text } = Typography

interface ConfigEditorProps {
  darkMode: boolean
}

export interface ConfigEditorRef {
  refresh: () => Promise<void>
}

const ConfigEditor = forwardRef<ConfigEditorRef, ConfigEditorProps>(({ darkMode }, ref) => {
  const themeVars = getThemeVars(darkMode)
  const [config, setConfig] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editedConfig, setEditedConfig] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  // 暴露 refresh 方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await loadConfig()
    }
  }))

  const loadConfig = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.getClaudeConfig()
      if (result.success && result.config) {
        // 格式化 JSON
        try {
          const formatted = JSON.stringify(JSON.parse(result.config), null, 2)
          setConfig(formatted)
          setEditedConfig(formatted)
        } catch {
          setConfig(result.config)
          setEditedConfig(result.config)
        }
      } else {
        message.error(result.error || '加载失败')
      }
    } catch (error) {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 验证 JSON
      JSON.parse(editedConfig)
      const result = await window.electronAPI.saveClaudeConfig(editedConfig)
      if (result.success) {
        setConfig(editedConfig)
        message.success('保存成功！')
        setModalVisible(false)
      } else {
        message.error(result.error || '保存失败')
      }
    } catch (e) {
      message.error('JSON 格式错误，请检查')
    } finally {
      setSaving(false)
    }
  }

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(editedConfig), null, 2)
      setEditedConfig(formatted)
      message.success('格式化成功')
    } catch (e) {
      message.error('JSON 格式错误，无法格式化')
    }
  }

  const handleOpenModal = () => {
    setEditedConfig(config)
    setModalVisible(true)
  }

  const handleCloseModal = () => {
    setModalVisible(false)
  }

  const getConfigSummary = () => {
    try {
      const obj = JSON.parse(config)
      const keys = Object.keys(obj)
      return `${keys.length} 个配置项`
    } catch {
      return '配置已损坏'
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 150 }}>
        <Spin size="large" tip="加载配置中..." />
      </div>
    )
  }

  return (
    <>
      <Space vertical size="middle" style={{ width: '100%' }}>
        {/* 当前配置显示 */}
        <div
          onClick={handleOpenModal}
          style={{
            cursor: 'pointer',
            padding: '16px',
            border: `1px solid ${themeVars.border}`,
            borderRadius: '8px',
            backgroundColor: themeVars.bgContainer,
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = themeVars.primary
            e.currentTarget.style.boxShadow = `0 0 0 2px ${themeVars.primary}20`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = themeVars.border
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <Space vertical size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <CodeOutlined style={{ fontSize: 20, color: themeVars.primary }} />
                <div>
                  <Text strong>settings.json</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {getConfigSummary()}
                  </Text>
                </div>
              </Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                size="small"
              >
                查看/编辑
              </Button>
            </div>
            <div
              style={{
                background: themeVars.codeBg,
                borderRadius: 4,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: 12,
                color: themeVars.textSecondary,
                maxHeight: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {config.split('\n').slice(0, 3).join('\n')}
              {config.split('\n').length > 3 && '...'}
            </div>
          </Space>
        </div>

      </Space>

      {/* 编辑 Modal */}
      <ElectronModal
        title={
          <Space>
            <CodeOutlined />
            <span>编辑 Claude Code 配置</span>
          </Space>
        }
        open={modalVisible}
        onCancel={handleCloseModal}
        closable={true}
        closeIcon={<CloseOutlined onClick={(e) => {
          e.stopPropagation()
          handleCloseModal()
        }} />}
        maskClosable={true}
        keyboard={true}
        destroyOnClose={false}
        width="70%"
        footer={[
          <Button key="folder" icon={<FolderOpenOutlined />} onClick={async () => {
            try {
              await window.electronAPI.showClaudeConfigInFolder()
              message.success('已在文件管理器中显示')
            } catch (error) {
              message.error('打开文件夹失败')
            }
          }}>
            打开文件位置
          </Button>,
          <Button key="format" icon={<FormatPainterOutlined />} onClick={handleFormat}>
            格式化
          </Button>,
          <Button key="reload" icon={<ReloadOutlined />} onClick={loadConfig}>
            重新加载
          </Button>,
          <Button key="cancel" onClick={handleCloseModal}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        ]}
        style={{ top: 40 }}
        styles={{
          body: {
            padding: 0
          } as React.CSSProperties
        }}
      >
        <div style={{ height: 500, border: `1px solid ${themeVars.border}` }}>
          <Editor
            height="100%"
            defaultLanguage="json"
            value={editedConfig}
            onChange={(value) => setEditedConfig(value || '')}
            theme={darkMode ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              formatOnPaste: true,
              formatOnType: true
            }}
          />
        </div>
      </ElectronModal>
    </>
  )
})

ConfigEditor.displayName = 'ConfigEditor'

export default ConfigEditor
