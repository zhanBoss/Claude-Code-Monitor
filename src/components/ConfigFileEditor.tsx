import { useState, useEffect } from 'react'
import { Button, message, Space } from 'antd'
import { EditOutlined, SaveOutlined, ReloadOutlined, FormatPainterOutlined, FolderOpenOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { getThemeVars } from '../theme'
import ElectronModal from './ElectronModal'

interface ConfigFileEditorProps {
  title: string
  filePath: string
  darkMode: boolean
  visible: boolean
  onClose: () => void
  onLoad: () => Promise<string>
  onSave: (content: string) => Promise<void>
  onOpenFolder?: () => Promise<void>
}

function ConfigFileEditor({
  title,
  filePath,
  darkMode,
  visible,
  onClose,
  onLoad,
  onSave,
  onOpenFolder
}: ConfigFileEditorProps) {
  const themeVars = getThemeVars(darkMode)
  const [editedConfig, setEditedConfig] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLoad = async () => {
    setLoading(true)
    try {
      const content = await onLoad()
      try {
        const formatted = JSON.stringify(JSON.parse(content), null, 2)
        setEditedConfig(formatted)
      } catch {
        setEditedConfig(content)
      }
    } catch (error: any) {
      message.error(error.message || '加载配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      JSON.parse(editedConfig)
      await onSave(editedConfig)
      onClose()
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        message.error('JSON 格式错误，请检查')
      } else {
        message.error(e.message || '保存失败')
      }
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

  const handleOpenFolder = async () => {
    if (onOpenFolder) {
      try {
        await onOpenFolder()
        message.success('已在文件管理器中显示')
      } catch (error) {
        message.error('打开文件夹失败')
      }
    }
  }

  useEffect(() => {
    if (visible) {
      handleLoad()
    }
  }, [visible])

  return (
    <ElectronModal
      title={
        <Space direction="vertical" size={0}>
          <Space>
            <EditOutlined />
            <span>{title}</span>
          </Space>
          {filePath && (
            <span style={{ fontSize: 12, fontWeight: 'normal', color: themeVars.textTertiary }}>{filePath}</span>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      closable={true}
      maskClosable={true}
      keyboard={true}
      destroyOnClose={true}
      width="70%"
      zIndex={99999}
      footer={[
        onOpenFolder && (
          <Button key="folder" icon={<FolderOpenOutlined />} onClick={handleOpenFolder}>
            打开文件位置
          </Button>
        ),
        <Button key="format" icon={<FormatPainterOutlined />} onClick={handleFormat}>
          格式化
        </Button>,
        <Button key="reload" icon={<ReloadOutlined />} onClick={handleLoad} loading={loading}>
          重新加载
        </Button>,
        <Button key="cancel" onClick={onClose}>
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
      <div style={{ height: 500, border: `1px solid ${themeVars.border}` } as React.CSSProperties}>
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
  )
}

export default ConfigFileEditor
