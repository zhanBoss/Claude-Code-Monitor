import { Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { getThemeVars } from '../theme'

const { Text } = Typography

interface SmartContentProps {
  content: string
  darkMode: boolean
  maxLines?: number // 最大显示行数，超过则截断
  onClick?: () => void // 点击事件（用于展开）
}

/**
 * 智能内容渲染组件
 *
 * 功能：
 * 1. 自动检测代码片段并语法高亮
 * 2. 自动检测 JSON 并格式化
 * 3. 自动检测链接并支持点击跳转
 * 4. 支持 Markdown 渲染
 */
function SmartContent({ content, darkMode, maxLines, onClick }: SmartContentProps) {
  const themeVars = getThemeVars(darkMode)

  // 检测内容类型
  const detectContentType = (text: string): 'code' | 'json' | 'markdown' | 'text' => {
    const trimmed = text.trim()

    // 检测 JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch (e) {
        // 不是有效的 JSON
      }
    }

    // 检测代码特征
    const codePatterns = [
      /^(function|const|let|var|class|def|import|export|interface|type)\s/m,
      /^(public|private|protected)\s+(class|function|static)/m,
      /^\s*(if|for|while|switch)\s*\(/m,
      /=>\s*{/,
      /\{\s*\n.*:\s*.+\n.*\}/s, // 对象字面量
    ]

    if (codePatterns.some(pattern => pattern.test(trimmed))) {
      return 'code'
    }

    // 检测 Markdown 特征
    const markdownPatterns = [
      /^#{1,6}\s+.+$/m, // 标题
      /^\*\*.*\*\*$/m, // 粗体
      /^\*.*\*$/m, // 斜体
      /^\[.+\]\(.+\)$/m, // 链接
      /^```/m, // 代码块
      /^[-*+]\s+/m, // 列表
    ]

    if (markdownPatterns.some(pattern => pattern.test(trimmed))) {
      return 'markdown'
    }

    return 'text'
  }

  // 检测编程语言
  const detectLanguage = (text: string): string => {
    const trimmed = text.trim()

    // JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch (e) {
        // 继续检测其他语言
      }
    }

    // JavaScript/TypeScript
    if (/\b(function|const|let|var|=>|import.*from|export)\b/.test(text)) {
      if (/\b(interface|type|enum|namespace|as\s+\w+)\b/.test(text)) {
        return 'typescript'
      }
      return 'javascript'
    }

    // Python
    if (/\b(def|class|import|from|print|if __name__)\b/.test(text)) {
      return 'python'
    }

    // Java
    if (/\b(public|private|protected)\s+(class|interface|static|void)\b/.test(text)) {
      return 'java'
    }

    // C/C++
    if (/#include|int main\(|std::/.test(text)) {
      return 'cpp'
    }

    // Go
    if (/\bfunc\s+\w+\(|package\s+\w+/.test(text)) {
      return 'go'
    }

    // Rust
    if (/\b(fn|let mut|impl|trait|pub)\b/.test(text)) {
      return 'rust'
    }

    // SQL
    if (/\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|FROM|WHERE|JOIN)\b/i.test(text)) {
      return 'sql'
    }

    // HTML
    if (/<\/?[a-z][\s\S]*>/i.test(text)) {
      return 'html'
    }

    // CSS
    if (/\{[^}]*:[^}]*\}/.test(text) && /\.([\w-]+)\s*\{/.test(text)) {
      return 'css'
    }

    // Shell
    if (/^(#!\/bin\/|npm|yarn|git|cd|ls|mkdir|rm)\s/.test(text)) {
      return 'bash'
    }

    return 'text'
  }

  // 检测并渲染链接
  const renderTextWithLinks = (text: string) => {
    // URL 正则表达式
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: themeVars.primary,
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation()
              window.electronAPI.openExternal(part)
              e.preventDefault()
            }}
          >
            {part}
          </a>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // 渲染代码块
  const renderCodeBlock = (code: string, language: string) => {
    const lines = code.split('\n')
    const shouldTruncate = maxLines && lines.length > maxLines

    return (
      <div
        style={{
          position: 'relative',
          cursor: shouldTruncate && onClick ? 'pointer' : 'default'
        }}
        onClick={shouldTruncate && onClick ? onClick : undefined}
      >
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 6,
            fontSize: 13,
            maxHeight: shouldTruncate ? `${maxLines * 1.5}em` : undefined,
            overflow: shouldTruncate ? 'hidden' : 'auto'
          }}
          wrapLongLines={true}
        >
          {shouldTruncate ? lines.slice(0, maxLines).join('\n') : code}
        </SyntaxHighlighter>
        {shouldTruncate && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 40,
              background: `linear-gradient(transparent, ${themeVars.codeBg})`,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 8
            }}
          >
            <Text
              style={{
                fontSize: 12,
                color: themeVars.primary,
                cursor: 'pointer'
              }}
            >
              点击查看完整内容...
            </Text>
          </div>
        )}
      </div>
    )
  }

  // 渲染 Markdown
  const renderMarkdown = (text: string) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderRadius: 6,
                  fontSize: 13
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code
                style={{
                  background: themeVars.codeBg,
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontSize: 12,
                  fontFamily: 'monospace'
                }}
                {...props}
              >
                {children}
              </code>
            )
          },
          p({ children }) {
            return <p style={{ marginBottom: 8, lineHeight: 1.6 }}>{children}</p>
          },
          pre({ children }) {
            return <>{children}</>
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: themeVars.primary,
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (href) {
                    window.electronAPI.openExternal(href)
                    e.preventDefault()
                  }
                }}
              >
                {children}
              </a>
            )
          }
        }}
      >
        {text}
      </ReactMarkdown>
    )
  }

  // 渲染普通文本（带链接检测）
  const renderPlainText = (text: string) => {
    const lines = text.split('\n')
    const shouldTruncate = maxLines && lines.length > maxLines

    return (
      <div
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: 1.6,
          cursor: shouldTruncate && onClick ? 'pointer' : 'default'
        }}
        onClick={shouldTruncate && onClick ? onClick : undefined}
      >
        {(shouldTruncate ? lines.slice(0, maxLines) : lines).map((line, index) => (
          <div key={index}>{renderTextWithLinks(line)}</div>
        ))}
        {shouldTruncate && (
          <Text
            style={{
              fontSize: 12,
              color: themeVars.primary,
              cursor: 'pointer',
              display: 'block',
              marginTop: 8
            }}
          >
            点击查看完整内容...
          </Text>
        )}
      </div>
    )
  }

  // 主渲染逻辑
  const contentType = detectContentType(content)

  if (contentType === 'code' || contentType === 'json') {
    const language = detectLanguage(content)
    return renderCodeBlock(content, language)
  }

  if (contentType === 'markdown') {
    return renderMarkdown(content)
  }

  return renderPlainText(content)
}

export default SmartContent
