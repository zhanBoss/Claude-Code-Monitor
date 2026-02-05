import { useState, useMemo, useEffect } from 'react'
import { Button, Empty, Space, Typography, Tag, Card, message, Modal, Image, Tooltip } from 'antd'
import { CopyOutlined, FolderOpenOutlined, DownOutlined, UpOutlined, StarOutlined, ClearOutlined, WarningOutlined, SettingOutlined, FileImageOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClaudeRecord, RecordConfig } from '../types'
import { getThemeVars } from '../theme'
import FileViewer from './FileViewer'
import { replacePastedContents, formatPastedContentsForModal } from '../utils/promptFormatter'
import SmartContent from './SmartContent'
import ElectronModal, { getElectronModalConfig } from './ElectronModal'

const { Text } = Typography

interface LogViewerProps {
  records: ClaudeRecord[]
  onClear: () => void
  onOpenSettings?: () => void
  darkMode: boolean
}

interface GroupedRecord {
  sessionId: string
  project: string
  records: ClaudeRecord[]
  latestTimestamp: number
}

function LogViewer({ records, onClear, onOpenSettings, darkMode }: LogViewerProps) {
  // 每个 session 的展开/折叠状态
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const themeVars = getThemeVars(darkMode)

  // 记录配置状态
  const [recordConfig, setRecordConfig] = useState<RecordConfig | null>(null)

  // AI 总结相关状态
  const [summarizing, setSummarizing] = useState(false)
  const [summaryContent, setSummaryContent] = useState<string>('')
  const [summaryModalVisible, setSummaryModalVisible] = useState(false)

  // 图片加载缓存
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())

  // 文件查看器状态
  const [fileViewerVisible, setFileViewerVisible] = useState(false)
  const [viewingFilePath, setViewingFilePath] = useState<string>('')
  const [fileViewerReadOnly, setFileViewerReadOnly] = useState(false)

  // Prompt 和 Copy Text 弹窗状态
  const [promptModalVisible, setPromptModalVisible] = useState(false)
  const [promptModalContent, setPromptModalContent] = useState<string>('')
  const [copyTextModalVisible, setCopyTextModalVisible] = useState(false)
  const [copyTextModalContent, setCopyTextModalContent] = useState<Record<string, any>>({})

  // 加载记录配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await window.electronAPI.getRecordConfig()
        setRecordConfig(config)
      } catch (error) {
        console.error('加载记录配置失败:', error)
      }
    }
    loadConfig()
  }, [])

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  const formatTimeShort = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
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

  // 打开文件查看器
  const handleOpenFile = (filePath: string, readOnly: boolean = false) => {
    setViewingFilePath(filePath)
    setFileViewerReadOnly(readOnly)
    setFileViewerVisible(true)
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
          },
          ...getElectronModalConfig()
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
          },
          ...getElectronModalConfig()
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
                  <p style={{ marginTop: 8, fontSize: 12, color: themeVars.textTertiary }}>
                    提示：你可以前往相应平台充值后继续使用
                  </p>
                </div>
              ),
              okText: '我知道了',
              ...getElectronModalConfig()
            })
          } else if (error.includes('API Key')) {
            Modal.error({
              title: 'AI 总结失败',
              content: (
                <div>
                  <p>{error}</p>
                  <p style={{ marginTop: 8, fontSize: 12, color: themeVars.textTertiary }}>
                    提示：请前往设置页面重新配置 API Key
                  </p>
                </div>
              ),
              okText: '前往设置',
              onOk: () => {
                onOpenSettings?.()
              },
              ...getElectronModalConfig()
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

  // 图片组件 - 使用轮询机制确保图片最终加载成功
  const ImageThumbnail = ({ imagePath, index }: { imagePath: string; index: number }) => {
    const [imageData, setImageData] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      // 检查缓存
      if (imageCache.has(imagePath)) {
        setImageData(imageCache.get(imagePath)!)
        setLoading(false)
        return
      }

      let isMounted = true
      let pollTimer: NodeJS.Timeout | null = null
      const startTime = Date.now()
      const maxPollTime = 30000 // 最多轮询30秒

      // 轮询加载图片
      const pollImage = async () => {
        if (!isMounted) return

        // 检查是否超时
        if (Date.now() - startTime > maxPollTime) {
          setError('加载超时')
          setLoading(false)
          return
        }

        try {
          const result = await window.electronAPI.readImage(imagePath)

          if (!isMounted) return

          if (result.success && result.data) {
            // 成功加载
            setImageData(result.data)
            setImageCache(prev => new Map(prev).set(imagePath, result.data!))
            setLoading(false)
          } else {
            // 失败，继续轮询
            pollTimer = setTimeout(pollImage, 1000) // 每秒轮询一次
          }
        } catch (err: any) {
          if (!isMounted) return
          // 出错，继续轮询
          pollTimer = setTimeout(pollImage, 1000)
        }
      }

      // 开始轮询
      pollImage()

      return () => {
        isMounted = false
        if (pollTimer) {
          clearTimeout(pollTimer)
        }
      }
    }, [imagePath])

    if (loading) {
      return (
        <div style={{
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: themeVars.codeBg,
          borderRadius: 6,
          border: `1px solid ${themeVars.border}`,
          fontSize: 10,
          color: themeVars.textSecondary
        }}>
          加载中...
        </div>
      )
    }

    if (error || !imageData) {
      return (
        <div style={{
          width: 64,
          height: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: themeVars.codeBg,
          borderRadius: 6,
          border: `1px solid ${themeVars.border}`,
          fontSize: 9,
          color: themeVars.textSecondary,
          textAlign: 'center',
          padding: 4,
          gap: 2
        }}>
          <span>❌</span>
          <span style={{ fontSize: 8 }}>加载失败</span>
        </div>
      )
    }

    return (
      <Image
        src={imageData}
        alt={`Image ${index + 1}`}
        width={64}
        height={64}
        style={{
          objectFit: 'cover',
          borderRadius: 6,
          border: `1px solid ${themeVars.border}`,
          cursor: 'pointer'
        }}
        preview={{
          src: imageData
        }}
      />
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: themeVars.bgContainer
    }}>
      {/* 操作栏 - 顶部 */}
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
          共 {groupedRecords.length} 个会话，{records.length} 条记录
        </Text>
        <Space style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <Button
            type="primary"
            icon={<StarOutlined />}
            onClick={handleSummarizeCurrentLogs}
            loading={summarizing}
            disabled={records.length === 0}
            size="small"
          >
            AI 总结
          </Button>
          <Button
            icon={<ClearOutlined />}
            onClick={onClear}
            disabled={records.length === 0}
            size="small"
          >
            清空
          </Button>
        </Space>
      </div>

      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        minHeight: 0
      }}>
        {groupedRecords.length === 0 ? (
          recordConfig && !recordConfig.enabled ? (
            // 记录功能未开启时的提示
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: 400
            }}>
              <Card
                style={{
                  maxWidth: 420,
                  textAlign: 'center',
                  border: 'none',
                  boxShadow: darkMode
                    ? '0 4px 24px rgba(0, 0, 0, 0.4)'
                    : '0 4px 24px rgba(0, 0, 0, 0.06)',
                }}
              >
                <div style={{
                  background: themeVars.primaryGradient,
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  boxShadow: `0 8px 16px ${themeVars.primaryShadow}`
                }}>
                  <WarningOutlined style={{ fontSize: 32, color: themeVars.bgContainer }} />
                </div>

                <Text strong style={{ fontSize: 20, display: 'block', marginBottom: 12 }}>
                  记录功能未开启
                </Text>

                <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 32, lineHeight: 1.6 }}>
                  开启后即可记录和查看所有对话历史
                </Text>

                <Button
                  type="primary"
                  size="large"
                  icon={<SettingOutlined />}
                  onClick={() => onOpenSettings?.()}
                  block
                  style={{
                    height: 48,
                    fontSize: 16,
                    fontWeight: 500,
                    borderRadius: 8,
                    background: themeVars.primaryGradient,
                    border: 'none'
                  }}
                >
                  前往设置开启
                </Button>
              </Card>
            </div>
          ) : (
            // 已开启但暂无记录
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
          )
        ) : (
          <Space vertical size="middle" style={{ width: '100%' }}>
            {groupedRecords.map((group) => {
              const isExpanded = expandedSessions.has(group.sessionId)
              const showCollapse = group.records.length > 3
              const displayRecords = (isExpanded || !showCollapse) ? group.records : group.records.slice(0, 3)

              return (
                <Card
                  key={group.sessionId}
                  size="small"
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FolderOpenOutlined style={{ fontSize: 14, color: themeVars.primary }} />
                      <Text strong style={{ fontSize: 14 }}>{getProjectName(group.project)}</Text>
                      {group.sessionId && !group.sessionId.startsWith('single-') && (
                        <Text code style={{ fontSize: 11, color: themeVars.textTertiary }}>
                          #{group.sessionId.slice(0, 8)}
                        </Text>
                      )}
                      <Tag color="default" style={{ fontSize: 11 }}>{group.records.length}条</Tag>
                    </div>
                  }
                  extra={
                    <Space size="small">
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatTime(group.latestTimestamp)}
                      </Text>
                      <Tooltip title="打开文件夹">
                        <Button
                          type="text"
                          size="small"
                          icon={<FolderOpenOutlined />}
                          onClick={() => handleOpenFolder(group.project)}
                        />
                      </Tooltip>
                      <Tooltip title="AI 总结此会话">
                        <Button
                          type="text"
                          size="small"
                          icon={<StarOutlined />}
                          onClick={() => {
                            // TODO: 实现单个会话的 AI 总结
                            message.info('功能开发中')
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  styles={{ body: { padding: 12 } }}
                >
                  <Space vertical size="small" style={{ width: '100%' }}>
                    {displayRecords.map((record, recordIndex) => {
                      const hasImages = record.images && record.images.length > 0
                      const hasCopyText = record.pastedContents && Object.keys(record.pastedContents).length > 0
                      const hasResources = hasImages || hasCopyText
                      const fullPrompt = replacePastedContents(record.display, record.pastedContents || {})
                      const lines = fullPrompt.split('\n')
                      const isPromptLong = lines.length > 3

                      return (
                        <Card
                          key={recordIndex}
                          size="small"
                          styles={{ body: { padding: 12 } }}
                          style={{
                            background: themeVars.bgSection,
                            border: `1px solid ${themeVars.borderSecondary}`
                          }}
                        >
                          {/* 资源信息栏 */}
                          {hasResources && (
                            <div style={{ marginBottom: 12 }}>
                              <Space size="middle">
                                {hasImages && (
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      color: themeVars.textSecondary
                                    }}
                                  >
                                    <FileImageOutlined style={{ marginRight: 4 }} />
                                    {record.images!.length}张图片
                                  </Text>
                                )}
                                {hasCopyText && (
                                  <Text
                                    style={{
                                      fontSize: 13,
                                      color: themeVars.textSecondary,
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => {
                                      setCopyTextModalContent(record.pastedContents || {})
                                      setCopyTextModalVisible(true)
                                    }}
                                  >
                                    <FileTextOutlined style={{ marginRight: 4 }} />
                                    {Object.keys(record.pastedContents!).length}个Copy Text
                                  </Text>
                                )}
                              </Space>

                              {/* 图片网格 - 默认显示 */}
                              {hasImages && (
                                <Image.PreviewGroup>
                                  <div style={{
                                    display: 'flex',
                                    gap: 8,
                                    marginTop: 8,
                                    flexWrap: 'wrap'
                                  }}>
                                    {record.images!.map((imagePath, imgIndex) => (
                                      <ImageThumbnail key={imgIndex} imagePath={imagePath} index={imgIndex} />
                                    ))}
                                  </div>
                                </Image.PreviewGroup>
                              )}
                            </div>
                          )}

                          {/* Prompt 内容 */}
                          <div style={{ marginBottom: 8 }}>
                            <SmartContent
                              content={fullPrompt}
                              darkMode={darkMode}
                              maxLines={isPromptLong ? 3 : undefined}
                              onClick={isPromptLong ? () => {
                                setPromptModalContent(fullPrompt)
                                setPromptModalVisible(true)
                              } : undefined}
                            />
                          </div>

                          {/* 底部信息栏 */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: 8,
                            borderTop: `1px solid ${themeVars.borderSecondary}`
                          }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              <ClockCircleOutlined style={{ marginRight: 4 }} />
                              {formatTimeShort(record.timestamp)}
                            </Text>
                            <Button
                              type="text"
                              size="small"
                              icon={<CopyOutlined />}
                              onClick={() => handleCopy(fullPrompt)}
                              style={{ fontSize: 11, padding: '0 4px', height: 20 }}
                            >
                              复制
                            </Button>
                          </div>
                        </Card>
                      )
                    })}

                    {/* 展开/收起按钮 */}
                    {showCollapse && (
                      <Button
                        type="link"
                        size="small"
                        icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => toggleSession(group.sessionId)}
                        style={{ padding: 0, fontSize: 12 }}
                      >
                        {isExpanded ? '收起' : `展开剩余 ${group.records.length - 3} 条`}
                      </Button>
                    )}

                    {/* Session 底部路径 */}
                    <div style={{
                      padding: '8px 12px',
                      background: themeVars.codeBg,
                      borderRadius: 4,
                      fontSize: 11,
                      color: themeVars.textTertiary,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      wordBreak: 'break-all'
                    }}
                    onClick={() => handleOpenFolder(group.project)}
                    >
                      {group.project}
                    </div>

                    {/* 存储位置 */}
                    {recordConfig?.savePath && (
                      <div style={{
                        padding: '6px 12px',
                        background: themeVars.bgSection,
                        borderRadius: 4,
                        fontSize: 11,
                        color: themeVars.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <FileTextOutlined style={{ fontSize: 11 }} />
                        <span>存储位置：</span>
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            color: themeVars.primary
                          }}
                          onClick={() => {
                            // 使用第一条记录的时间戳生成文件名
                            const firstRecord = group.records[0]
                            const jsonlPath = `${recordConfig.savePath}/${getProjectName(group.project)}_${new Date(firstRecord.timestamp).toISOString().split('T')[0]}.jsonl`
                            handleOpenFile(jsonlPath, true)
                          }}
                        >
                          点击查看
                        </Text>
                      </div>
                    )}
                  </Space>
                </Card>
              )
            })}
          </Space>
        )}
      </div>

      {/* AI 总结结果弹窗 */}
      <ElectronModal
        title={
          <Space>
            <StarOutlined style={{ color: themeVars.primary }} />
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
        styles={{
          body: {
            maxHeight: 'calc(100vh - 260px)',
            overflowY: 'auto'
          } as React.CSSProperties
        }}
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
      </ElectronModal>

      {/* Prompt 详情弹窗 */}
      <ElectronModal
        title="Prompt 详情"
        open={promptModalVisible}
        onCancel={() => setPromptModalVisible(false)}
        footer={null}
        width={800}
        styles={{
          body: {
            maxHeight: '70vh',
            overflow: 'auto'
          } as React.CSSProperties
        }}
      >
        <div style={{
          padding: '16px',
          background: themeVars.bgElevated,
          borderRadius: 8,
          fontSize: 14,
          lineHeight: 1.6,
          color: themeVars.text
        }}>
          <SmartContent content={promptModalContent} darkMode={darkMode} />
        </div>
      </ElectronModal>

      {/* Copy Text 详情弹窗 */}
      <ElectronModal
        title="Copy Text 详情"
        open={copyTextModalVisible}
        onCancel={() => setCopyTextModalVisible(false)}
        footer={null}
        width={800}
        styles={{
          body: {
            maxHeight: '70vh',
            overflow: 'auto'
          } as React.CSSProperties
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formatPastedContentsForModal(copyTextModalContent).map(({ key, content }) => (
            <div key={key}>
              <Text strong style={{ fontSize: 14, color: themeVars.textSecondary, marginBottom: 8, display: 'block' }}>
                {key}:
              </Text>
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
            </div>
          ))}
        </div>
      </ElectronModal>

      {/* 文件查看器 */}
      <FileViewer
        filePath={viewingFilePath}
        darkMode={darkMode}
        visible={fileViewerVisible}
        onClose={() => setFileViewerVisible(false)}
        readOnly={fileViewerReadOnly}
      />
    </div>
  )
}

export default LogViewer
