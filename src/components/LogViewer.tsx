import { useState, useMemo } from 'react'
import { Button, Empty, Space, Typography, Tag, Card, message, Modal } from 'antd'
import { CopyOutlined, FolderOpenOutlined, DownOutlined, UpOutlined, StarOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClaudeRecord } from '../types'
import { getThemeVars } from '../theme'
import ViewHeader from './ViewHeader'

const { Text } = Typography

interface LogViewerProps {
  records: ClaudeRecord[]
  onClear: () => void
  onToggleView: () => void
  onOpenDrawer: () => void
  onOpenSettings?: () => void
  showDrawerButton?: boolean
  darkMode: boolean
}

interface GroupedRecord {
  sessionId: string
  project: string
  records: ClaudeRecord[]
  latestTimestamp: number
}

function LogViewer({ records, onClear, onToggleView, onOpenDrawer, onOpenSettings, showDrawerButton = true, darkMode }: LogViewerProps) {
  // 每个 session 的展开/折叠状态
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const themeVars = getThemeVars(darkMode)

  // AI 总结相关状态
  const [summarizing, setSummarizing] = useState(false)
  const [summaryContent, setSummaryContent] = useState<string>('')
  const [summaryModalVisible, setSummaryModalVisible] = useState(false)

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  // 检测内容类型并自动添加语法高亮
  const detectLanguage = (text: string): string | null => {
    // 尝试解析 JSON
    try {
      JSON.parse(text)
      return 'json'
    } catch {
      // 不是 JSON
    }

    // 检测其他代码特征
    if (text.includes('function') || text.includes('const') || text.includes('let')) {
      return 'javascript'
    }
    if (text.includes('import') && text.includes('from')) {
      return 'typescript'
    }
    if (text.includes('def ') || text.includes('import ')) {
      return 'python'
    }

    return null
  }

  const renderContent = (content: string) => {
    // 如果内容看起来像代码（有换行符和特殊字符）
    const looksLikeCode = content.includes('\n') && (
      content.includes('{') ||
      content.includes('[') ||
      content.includes('function') ||
      content.includes('const')
    )

    if (looksLikeCode) {
      const language = detectLanguage(content)
      if (language) {
        return (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: 6,
              fontSize: 13
            }}
          >
            {content}
          </SyntaxHighlighter>
        )
      }
    }

    // 否则使用 Markdown 渲染
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
          }
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  // 按 sessionId 分组记录
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, GroupedRecord>()

    records.forEach(record => {
      const key = record.sessionId || `single-${record.timestamp}`

      if (!groups.has(key)) {
        groups.set(key, {
          sessionId: key,
          project: record.project,
          records: [],
          latestTimestamp: record.timestamp
        })
      }

      const group = groups.get(key)!
      group.records.push(record)
      group.latestTimestamp = Math.max(group.latestTimestamp, record.timestamp)
    })

    return Array.from(groups.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp)
  }, [records])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getProjectName = (projectPath: string) => {
    if (!projectPath) return '未知项目'
    const parts = projectPath.split('/')
    return parts[parts.length - 1]
  }

  const handleCopy = async (text: string) => {
    try {
      await window.electronAPI.copyToClipboard(text)
      message.success('已复制到剪贴板')
    } catch (error) {
      message.error('复制失败')
    }
  }

  const handleOpenFolder = async (folderPath: string) => {
    try {
      await window.electronAPI.openInFinder(folderPath)
    } catch (error) {
      message.error('打开文件夹失败')
    }
  }

  // 处理当前对话总结
  const handleSummarizeCurrentLogs = async () => {
    if (records.length === 0) {
      message.warning('当前没有对话记录')
      return
    }

    setSummarizing(true)

    try {
      // 检查 AI 配置
      const settings = await window.electronAPI.getAppSettings()

      if (!settings.ai.enabled) {
        Modal.confirm({
          title: '启用 AI 总结功能',
          content: 'AI 总结功能尚未启用，是否前往设置？',
          okText: '去设置',
          cancelText: '取消',
          onOk: () => {
            onOpenSettings?.()
          }
        })
        setSummarizing(false)
        return
      }

      const currentProvider = settings.ai.providers[settings.ai.provider]
      if (!currentProvider || !currentProvider.apiKey) {
        Modal.confirm({
          title: '配置 API Key',
          content: `尚未配置 API Key，是否前往设置？`,
          okText: '去设置',
          cancelText: '取消',
          onOk: () => {
            onOpenSettings?.()
          }
        })
        setSummarizing(false)
        return
      }

      // 先打开弹窗，显示"正在生成总结..."
      setSummaryContent('正在生成总结...')
      setSummaryModalVisible(true)

      let fullSummary = ''

      // 调用流式总结接口
      await window.electronAPI.summarizeRecordsStream(
        {
          records: records,
          type: 'detailed'
        },
        // onChunk: 接收到新内容时追加
        (chunk: string) => {
          fullSummary += chunk
          setSummaryContent(fullSummary)
        },
        // onComplete: 总结完成
        () => {
          setSummarizing(false)
        },
        // onError: 出错时处理
        (error: string) => {
          setSummarizing(false)
          setSummaryModalVisible(false)

          // 显示详细的错误信息
          if (error.includes('余额不足') || error.includes('402')) {
            Modal.error({
              title: 'AI 总结失败',
              content: (
                <div>
                  <p>{error}</p>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    提示：你可以前往相应平台充值后继续使用
                  </p>
                </div>
              ),
              okText: '我知道了'
            })
          } else if (error.includes('API Key')) {
            Modal.error({
              title: 'AI 总结失败',
              content: (
                <div>
                  <p>{error}</p>
                  <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                    提示：请前往设置页面重新配置 API Key
                  </p>
                </div>
              ),
              okText: '前往设置',
              onOk: () => {
                onOpenSettings?.()
              }
            })
          } else {
            message.error(`总结失败: ${error}`, 5)
          }
        }
      )

      // 不需要处理 result，因为流式输出在回调中处理
      return

    } catch (error: any) {
      setSummarizing(false)
      message.error(`总结失败: ${error.message || '未知错误'}`, 5)
    }
  }

  // 复制总结内容
  const handleCopySummary = async () => {
    try {
      await window.electronAPI.copyToClipboard(summaryContent)
      message.success('已复制到剪贴板')
    } catch (error) {
      message.error('复制失败')
    }
  }

  const renderPastedContent = (content: any, contentKey: string) => {
    if (!content) return null

    if (content.type === 'image' && content.data) {
      return (
        <div key={contentKey} style={{ marginTop: 8 }}>
          <img
            src={`data:image/png;base64,${content.data}`}
            alt="Pasted content"
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: 4,
              border: `1px solid ${themeVars.border}`
            }}
          />
        </div>
      )
    }

    if (typeof content === 'string') {
      return (
        <div
          key={contentKey}
          style={{
            marginTop: 8,
            padding: 8,
            background: themeVars.codeBg,
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace'
          }}
        >
          {content}
        </div>
      )
    }

    return null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: themeVars.bgContainer,
      minHeight: 0
    }}>
      <ViewHeader
        currentView="realtime"
        onViewChange={(view) => {
          if (view === 'history') {
            onToggleView()
          }
        }}
        showDrawerButton={showDrawerButton}
        onOpenDrawer={onOpenDrawer}
        darkMode={darkMode}
        realtimeActions={{
          onSummarize: handleSummarizeCurrentLogs,
          onClear: onClear,
          summarizing: summarizing,
          hasRecords: records.length > 0
        }}
      />

      {/* 统计信息 */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${themeVars.borderSecondary}`,
        background: themeVars.bgContainer
      }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          共 {groupedRecords.length} 个会话，{records.length} 条记录
        </Text>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        minHeight: 0
      }}>
        {groupedRecords.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>等待新的对话记录...</div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  在任意目录使用 Claude Code 提问即可看到记录
                </Text>
              </div>
            }
            style={{ marginTop: 100 }}
          />
        ) : (
          <Space vertical size="middle" style={{ width: '100%' }}>
            {groupedRecords.map((group, groupIndex) => {
              const isExpanded = expandedSessions.has(group.sessionId)
              const showCollapse = group.records.length > 3
              const displayRecords = (isExpanded || !showCollapse) ? group.records : group.records.slice(0, 3)

              return (
                <Card
                  key={group.sessionId}
                  size="small"
                  title={
                    <Space>
                      <Tag color="blue">{getProjectName(group.project)}</Tag>
                      {group.sessionId && !group.sessionId.startsWith('single-') && (
                        <Text code style={{ fontSize: 12 }}>
                          {group.sessionId.slice(0, 8)}
                        </Text>
                      )}
                      <Tag color="default">{group.records.length} 条</Tag>
                    </Space>
                  }
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatTime(group.latestTimestamp)}
                    </Text>
                  }
                >
                  <Space vertical size="small" style={{ width: '100%' }}>
                    {displayRecords.map((record, recordIndex) => (
                      <div key={recordIndex}>
                        <Card
                          size="small"
                          styles={{ body: { position: 'relative' } }}
                          extra={
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopy(record.display)}
                            >
                              复制
                            </Button>
                          }
                        >
                          <div style={{ fontSize: 13, color: themeVars.text }}>
                            {renderContent(record.display)}
                          </div>
                        </Card>

                        {record.pastedContents && Object.keys(record.pastedContents).length > 0 && (
                          <div>
                            {Object.entries(record.pastedContents).map(([key, value]) =>
                              renderPastedContent(value, `${groupIndex}-${recordIndex}-${key}`)
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* 展开/收起按钮 */}
                    {showCollapse && (
                      <Button
                        type="link"
                        size="small"
                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => toggleSession(group.sessionId)}
                        style={{ padding: 0 }}
                      >
                        {isExpanded ? '收起' : `展开剩余 ${group.records.length - 3} 条`}
                      </Button>
                    )}

                    <Button
                      type="link"
                      size="small"
                      icon={<FolderOpenOutlined />}
                      onClick={() => handleOpenFolder(group.project)}
                      style={{ padding: 0 }}
                    >
                      <Text code style={{ fontSize: 12 }}>{group.project}</Text>
                    </Button>
                  </Space>
                </Card>
              )
            })}
          </Space>
        )}
      </div>

      {/* AI 总结结果弹窗 */}
      <Modal
        title={
          <Space>
            <StarOutlined style={{ color: '#667eea' }} />
            <Text>当前对话 AI 总结</Text>
          </Space>
        }
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        width="60%"
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={handleCopySummary}
          >
            复制总结
          </Button>,
          <Button
            key="close"
            type="primary"
            onClick={() => setSummaryModalVisible(false)}
          >
            关闭
          </Button>
        ]}
        style={{ top: 60 }}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
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
              }
            }}
          >
            {summaryContent}
          </ReactMarkdown>
        </div>
      </Modal>
    </div>
  )
}

export default LogViewer
