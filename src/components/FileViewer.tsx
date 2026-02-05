import { useState, useEffect } from 'react'
import { Button, message, Space } from 'antd'
import { SaveOutlined, ReloadOutlined, FormatPainterOutlined, FolderOpenOutlined } from '@ant-design/icons'
import Editor from '@monaco-editor/react'
import { getThemeVars } from '../theme'
import ElectronModal from './ElectronModal'

interface FileViewerProps {
  filePath: string
  darkMode: boolean
  visible: boolean
  onClose: () => void
  readOnly?: boolean // 是否只读模式（用于缓存文件）
}

function FileViewer({
  filePath,
  darkMode,
  visible,
  onClose,
  readOnly = false
}: FileViewerProps) {
  const themeVars = getThemeVars(darkMode)
  const [content, setContent] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // 获取文件语言类型
  const getLanguage = () => {
    if (filePath.endsWith('.json')) return 'json'
    if (filePath.endsWith('.jsonl')) return 'json'
    if (filePath.endsWith('.js')) return 'javascript'
    if (filePath.endsWith('.ts')) return 'typescript'
    if (filePath.endsWith('.tsx')) return 'typescript'
    if (filePath.endsWith('.jsx')) return 'javascript'
    if (filePath.endsWith('.md')) return 'markdown'
    if (filePath.endsWith('.txt')) return 'plaintext'
    return 'plaintext'
  }

  // 加载文件内容
  const handleLoad = async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.readFileContent(filePath)
      if (result.success && result.content !== undefined) {
        let loadedContent = result.content

        // 如果是 JSON 文件，自动格式化
        if (getLanguage() === 'json') {
          try {
            loadedContent = JSON.stringify(JSON.parse(loadedContent), null, 2)
          } catch {
            // 如果解析失败，保持原内容
          }
        }

        setContent(loadedContent)
      } else {
        message.error(result.error || '加载文件失败')
      }
    } catch (error: any) {
      message.error(error.message || '加载文件失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存文件内容
  const handleSave = async () => {
    if (readOnly) {
      message.warning('缓存文件不可编辑')
      return
    }

    setSaving(true)
    try {
      const result = await window.electronAPI.saveFileContent(filePath, content)
      if (result.success) {
        message.success('保存成功')
      } else {
        message.error(result.error || '保存失败')
      }
    } catch (error: any) {
      message.error(error.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 格式化 JSON
  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(content), null, 2)
      setContent(formatted)
      message.success('格式化成功')
    } catch (e) {
      message.error('JSON 格式错误，无法格式化')
    }
  }

  // 打开文件位置
  const handleOpenFolder = async () => {
    try {
      await window.electronAPI.openInFinder(filePath)
    } catch (error) {
      message.error('打开文件夹失败')
    }
  }

  // 当弹窗打开时自动加载内容
  useEffect(() => {
    if (visible) {
      handleLoad()
    }
  }, [visible, filePath])

  return (
    <ElectronModal
      title={
        <Space>
          <span>{readOnly ? '查看文件' : '编辑文件'}</span>
          {readOnly && <span style={{ fontSize: 12, color: themeVars.textSecondary }}>(只读)</span>}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="80%"
      style={{ top: 40 }}
      footer={[
        <Button
          key="folder"
          icon={<FolderOpenOutlined />}
          onClick={handleOpenFolder}
        >
          打开文件位置
        </Button>,
        getLanguage() === 'json' && (
          <Button
            key="format"
            icon={<FormatPainterOutlined />}
            onClick={handleFormat}
          >
            格式化
          </Button>
        ),
        <Button
          key="reload"
          icon={<ReloadOutlined />}
          onClick={handleLoad}
          loading={loading}
        >
          重新加载
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        !readOnly && (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        )
      ].filter(Boolean)}
    >
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: themeVars.textSecondary }}>
          {filePath}
        </span>
      </div>

      <Editor
        height="60vh"
        language={getLanguage()}
        value={content}
        onChange={(value) => setContent(value || '')}
        theme={darkMode ? 'vs-dark' : 'light'}
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true
        }}
      />
    </ElectronModal>
  )
}

export default FileViewer
