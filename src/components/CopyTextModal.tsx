import { useState, useEffect } from 'react'
import { Typography, Tag, Segmented, Button, message, Spin, Space } from 'antd'
import { CopyOutlined, RobotOutlined } from '@ant-design/icons'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ReactMarkdown from 'react-markdown'
import ElectronModal from './ElectronModal'
import { getThemeVars } from '../theme'
import { formatPastedContentsForModal } from '../utils/promptFormatter'
import { isCode, detectLanguage } from '../utils/codeDetector'
import crypto from 'crypto-js'

const { Text } = Typography

interface CopyTextModalProps {
  visible: boolean
  onClose: () => void
  content: Record<string, any>
  darkMode: boolean
  zIndex?: number
  enableAIFormat?: boolean // 是否启用 AI 格式化
}

type ViewMode = 'original' | 'formatted'

/**
 * Copy Text 详情弹窗组件
 *
 * 用于展示 Claude Code 对话中的 pastedContents（Copy Text）内容
 * - 自动检测代码并进行语法高亮
 * - 支持多个 Copy Text 的展示
 * - 支持 AI 格式化（可选）
 * - 统一的样式和交互
 */
function CopyTextModal({
  visible,
  onClose,
  content,
  darkMode,
  zIndex = 1003,
  enableAIFormat = false
}: CopyTextModalProps) {
  const themeVars = getThemeVars(darkMode)

  const [viewMode, setViewMode] = useState<ViewMode>('original')
  const [formattedContent, setFormattedContent] = useState<Record<string, string>>({})
  const [formatting, setFormatting] = useState(false)
  const [formatError, setFormatError] = useState<string>('')

  // 弹窗打开时尝试 AI 格式化（仅当启用时）
  useEffect(() => {
    if (!visible || !enableAIFormat) return

    const tryFormat = async () => {
      setFormatting(true)
      setFormatError('')

      const formatted: Record<string, string> = {}
      const pastedItems = formatPastedContentsForModal(content)

      try {
        // 并行格式化所有 Copy Text 内容
        await Promise.all(
          pastedItems.map(async ({ key, content: itemContent }) => {
            // 只格式化非代码内容，或者所有内容（根据需求）
            const contentHash = crypto.MD5(itemContent).toString()

            try {
              const result = await window.electronAPI.formatPrompt(itemContent, contentHash)
              if (result.success && result.formatted) {
                formatted[key] = result.formatted
              }
            } catch (error) {
              console.error(`格式化 ${key} 失败:`, error)
            }
          })
        )

        setFormattedContent(formatted)
      } catch (error: any) {
        setFormatError(error.message || '格式化失败')
        setViewMode('original')
      } finally {
        setFormatting(false)
      }
    }

    tryFormat()
  }, [visible, content, enableAIFormat])

  // 复制内容
  const handleCopy = async (itemContent: string, formattedItemContent?: string) => {
    const textToCopy = viewMode === 'formatted' && formattedItemContent
      ? formattedItemContent
      : itemContent

    try {
      await window.electronAPI.copyToClipboard(textToCopy)
      message.success('已复制到剪贴板')
    } catch (error) {
      message.error('复制失败')
    }
  }

  // 渲染原始内容
  const renderOriginalContent = (itemContent: string, language: string, isCodeContent: boolean) => {
    if (isCodeContent) {
      return (
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.6
          }}
          showLineNumbers
        >
          {itemContent}
        </SyntaxHighlighter>
      )
    }

    return (
      <div style={{
        padding: '12px',
        background: themeVars.bgElevated,
        borderRadius: 8,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 13,
        lineHeight: 1.6,
        color: themeVars.text,
        fontFamily: 'monospace'
      }}>
        {itemContent}
      </div>
    )
  }

  // 渲染格式化后的 Markdown 内容
  const renderFormattedContent = (formattedItemContent: string) => (
    <div
      style={{
        padding: '16px',
        background: themeVars.bgElevated,
        borderRadius: 8,
        fontSize: 14,
        lineHeight: 1.8,
        color: themeVars.text
      }}
    >
      <ReactMarkdown
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: '8px 0',
                  borderRadius: 6,
                  fontSize: 13
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                className={className}
                style={{
                  background: themeVars.bgContainer,
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: '0.9em',
                  fontFamily: 'monospace'
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          h1: ({ children }) => (
            <h1 style={{ color: themeVars.text, marginTop: 24, marginBottom: 16, borderBottom: `2px solid ${themeVars.border}`, paddingBottom: 8 }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: themeVars.text, marginTop: 20, marginBottom: 12, borderBottom: `1px solid ${themeVars.border}`, paddingBottom: 6 }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: themeVars.text, marginTop: 16, marginBottom: 10 }}>{children}</h3>
          ),
          p: ({ children }) => (
            <p style={{ color: themeVars.text, marginBottom: 12 }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ color: themeVars.text, marginBottom: 12, paddingLeft: 24 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ color: themeVars.text, marginBottom: 12, paddingLeft: 24 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 6 }}>{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              style={{ color: themeVars.primary }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: `4px solid ${themeVars.border}`,
                paddingLeft: 16,
                margin: '12px 0',
                color: themeVars.textSecondary,
                fontStyle: 'italic'
              }}
            >
              {children}
            </blockquote>
          )
        }}
      >
        {formattedItemContent}
      </ReactMarkdown>
    </div>
  )

  const pastedItems = formatPastedContentsForModal(content)

  return (
    <ElectronModal
      title="Copy Text 详情"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      styles={{
        body: {
          maxHeight: '70vh',
          overflow: 'auto'
        } as React.CSSProperties
      }}
      zIndex={zIndex}
    >
      {/* AI 格式化控制 */}
      {enableAIFormat && (
        <div style={{ marginBottom: 16 }}>
          <Space size="middle">
            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              options={[
                { label: '原始', value: 'original' },
                {
                  label: (
                    <span>
                      <RobotOutlined style={{ marginRight: 4 }} />
                      AI 格式化
                    </span>
                  ),
                  value: 'formatted',
                  disabled: formatting || Object.keys(formattedContent).length === 0
                }
              ]}
            />
            {formatting && (
              <Spin size="small" tip="AI 格式化中..." />
            )}
            {formatError && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {formatError}
              </Text>
            )}
          </Space>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pastedItems.map(({ key, content: itemContent }) => {
          const isCodeContent = isCode(itemContent)
          const language = isCodeContent ? detectLanguage(itemContent) : 'plaintext'
          const formattedItemContent = formattedContent[key]

          return (
            <div key={key}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 14, color: themeVars.textSecondary }}>
                    {key}:
                  </Text>
                  {viewMode === 'original' && isCodeContent && (
                    <Tag color="blue" style={{ fontSize: 11 }}>
                      {language}
                    </Tag>
                  )}
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(itemContent, formattedItemContent)}
                >
                  复制
                </Button>
              </div>

              {viewMode === 'formatted' && formattedItemContent ? (
                renderFormattedContent(formattedItemContent)
              ) : (
                renderOriginalContent(itemContent, language, isCodeContent)
              )}
            </div>
          )
        })}
      </div>
    </ElectronModal>
  )
}

export default CopyTextModal
