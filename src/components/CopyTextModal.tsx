import { Typography, Tag } from 'antd'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ElectronModal from './ElectronModal'
import { getThemeVars } from '../theme'
import { formatPastedContentsForModal } from '../utils/promptFormatter'
import { isCode, detectLanguage } from '../utils/codeDetector'

const { Text } = Typography

interface CopyTextModalProps {
  visible: boolean
  onClose: () => void
  content: Record<string, any>
  darkMode: boolean
  zIndex?: number
}

/**
 * Copy Text 详情弹窗组件
 *
 * 用于展示 Claude Code 对话中的 pastedContents（Copy Text）内容
 * - 自动检测代码并进行语法高亮
 * - 支持多个 Copy Text 的展示
 * - 统一的样式和交互
 */
function CopyTextModal({ visible, onClose, content, darkMode, zIndex = 1003 }: CopyTextModalProps) {
  const themeVars = getThemeVars(darkMode)

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {formatPastedContentsForModal(content).map(({ key, content }) => {
          const isCodeContent = isCode(content)
          const language = isCodeContent ? detectLanguage(content) : 'plaintext'

          return (
            <div key={key}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8
              }}>
                <Text strong style={{ fontSize: 14, color: themeVars.textSecondary }}>
                  {key}:
                </Text>
                {isCodeContent && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    {language}
                  </Tag>
                )}
              </div>

              {isCodeContent ? (
                // 代码内容：使用语法高亮
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
                  {content}
                </SyntaxHighlighter>
              ) : (
                // 纯文本内容：使用普通样式
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
                  {content}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </ElectronModal>
  )
}

export default CopyTextModal
