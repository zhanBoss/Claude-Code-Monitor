import { useEffect, useState } from 'react'
import { Card, Button, Alert, Spin, Space, Typography, Modal, message } from 'antd'
import { EditOutlined, SaveOutlined, ReloadOutlined, FormatPainterOutlined, CodeOutlined, CloseOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { getThemeVars } from '../theme'

const { Title, Text } = Typography

interface ConfigEditorProps {
  darkMode: boolean
}

function ConfigEditor({ darkMode }: ConfigEditorProps) {
  const themeVars = getThemeVars(darkMode)
  const [config, setConfig] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editedConfig, setEditedConfig] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <Title level={4} style={{ margin: 0, minWidth: 150 }}>Claude Code 配置</Title>
        </div>

        {/* 配置入口卡片 */}
        <Card
          hoverable
          onClick={handleOpenModal}
          style={{ cursor: 'pointer' }}
          styles={{ body: { padding: 16 } }}
        >
          <Space vertical size="small" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space>
                <CodeOutlined style={{ fontSize: 20, color: darkMode ? '#8b9eff' : '#667eea' }} />
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
        </Card>

        <Alert
          message="点击卡片查看和编辑完整配置"
          type="info"
          showIcon
          style={{ fontSize: 12 }}
        />
      </Space>

      {/* 编辑 Modal */}
      <Modal
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
        styles={{ body: { padding: 0 } }}
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
      </Modal>
    </>
  )
}

export default ConfigEditor
