import { useState, useEffect, useMemo } from 'react'
import { Button, Card, Tag, Space, Typography, Empty, Spin, DatePicker, message, List, Modal, Pagination, Input, Image } from 'antd'
import {
  FolderOpenOutlined,
  CopyOutlined,
  FileTextOutlined,
  SearchOutlined,
  StarOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  ExportOutlined,
  WarningOutlined,
  SettingOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Highlighter from 'react-highlight-words'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClaudeRecord, RecordConfig, SessionMetadata } from '../types'
import dayjs, { Dayjs } from 'dayjs'
import 'dayjs/locale/zh-cn'
import { getThemeVars } from '../theme'
import SmartContent from './SmartContent'

// 设置 dayjs 中文语言
dayjs.locale('zh-cn')

const { Text, Paragraph } = Typography
const { RangePicker } = DatePicker

interface HistoryViewerProps {
  onOpenSettings?: () => void
  darkMode: boolean
}

interface GroupedRecord {
  sessionId: string
  project: string
  records: ClaudeRecord[]
  latestTimestamp: number
  recordCount: number
}

type DateRange = '1d' | '7d' | '30d' | 'custom'

function HistoryViewer({ onOpenSettings, darkMode }: HistoryViewerProps) {
  // 使用会话元数据代替完整记录
  const [sessions, setSessions] = useState<SessionMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('1d')
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 标记是否为初始加载
  const themeVars = getThemeVars(darkMode)

  // 记录配置状态
  const [recordConfig, setRecordConfig] = useState<RecordConfig | null>(null)

  // 初始化默认日期范围（1天）
  useEffect(() => {
    const now = dayjs()
    const oneDayAgo = now.subtract(1, 'day')
    setCustomDateRange([oneDayAgo.startOf('day'), now.endOf('day')])
  }, [])

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 层级 2: Session 详情弹窗
  const [selectedSession, setSelectedSession] = useState<GroupedRecord | null>(null)
  const [sessionModalVisible, setSessionModalVisible] = useState(false)
  const [sessionDetailsLoading, setSessionDetailsLoading] = useState(false)

  // 层级 3: Record 详情弹窗
  const [selectedRecord, setSelectedRecord] = useState<ClaudeRecord | null>(null)
  const [recordModalVisible, setRecordModalVisible] = useState(false)

  // AI 总结相关状态
  const [summarizing, setSummarizing] = useState(false)
  const [summaryContent, setSummaryContent] = useState<string>('')
  const [summaryModalVisible, setSummaryModalVisible] = useState(false)

  // 图片加载缓存
  const [imageCache, setImageCache] = useState<Map<string, string>>(new Map())

  // Session Modal 关闭处理
  const handleCloseSessionModal = () => {
    setSessionModalVisible(false)
  }

  // Record Modal 关闭处理
  const handleCloseRecordModal = () => {
    setRecordModalVisible(false)
  }

  useEffect(() => {
    loadHistoryMetadata()
    loadRecordConfig()
  }, [])

  const loadRecordConfig = async () => {
    try {
      const config = await window.electronAPI.getRecordConfig()
      setRecordConfig(config)
    } catch (error) {
      console.error('加载记录配置失败:', error)
    }
  }

  const loadHistoryMetadata = async () => {
    setLoading(true)
    try {
      // 添加超时保护
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('加载超时')), 10000)
      })

      const result = await Promise.race([
        window.electronAPI.readHistoryMetadata(),
        timeoutPromise
      ])

      if (result.success && result.sessions) {
        setSessions(result.sessions)
        // 只在初始加载时显示提示
        if (isInitialLoad) {
          message.success(`成功加载 ${result.sessions.length} 个会话`)
          setIsInitialLoad(false)
        }
      } else {
        setSessions([])
        if (result.error) {
          console.error('加载历史记录失败:', result.error)
          // 如果是未配置保存路径的错误，不显示 toast（页面已有提示卡片）
          const isConfigError = result.error.includes('未配置保存路径') ||
                                result.error.includes('保存路径') ||
                                result.error.includes('未开启')
          if (!isConfigError) {
            message.error(`加载失败: ${result.error}`)
          }
        }
        setIsInitialLoad(false)
      }
    } catch (error: any) {
      console.error('加载历史记录时发生错误:', error)
      const errorMsg = error?.message || '未知错误'
      // 如果是配置相关错误，不显示 toast
      const isConfigError = errorMsg.includes('未配置保存路径') ||
                            errorMsg.includes('保存路径') ||
                            errorMsg.includes('未开启') ||
                            errorMsg.includes('加载超时')
      if (!isConfigError) {
        message.error(`加载失败: ${errorMsg}`)
      }
      setSessions([])
      setIsInitialLoad(false)
    } finally {
      setLoading(false)
    }
  }

  // 根据日期范围筛选会话
  const filteredSessions = useMemo(() => {
    if (customDateRange) {
      const [start, end] = customDateRange
      return sessions.filter(s =>
        s.latestTimestamp >= start.valueOf() &&
        s.latestTimestamp <= end.valueOf()
      )
    }
    return sessions
  }, [sessions, customDateRange])

  // 搜索过滤（只能按项目名搜索，因为没有加载完整内容）
  const searchedSessions = useMemo(() => {
    if (!searchKeyword.trim()) {
      return filteredSessions
    }

    const keyword = searchKeyword.toLowerCase()
    return filteredSessions.filter(session => {
      return session.project.toLowerCase().includes(keyword) ||
             session.sessionId.toLowerCase().includes(keyword)
    })
  }, [filteredSessions, searchKeyword])

  // 转换为 GroupedRecord 格式（用于显示）
  const groupedRecords = useMemo(() => {
    return searchedSessions.map(session => ({
      sessionId: session.sessionId,
      project: session.project,
      records: [], // 暂时为空，点击时才加载
      latestTimestamp: session.latestTimestamp,
      recordCount: session.recordCount
    })).sort((a, b) => b.latestTimestamp - a.latestTimestamp) // 按时间降序排序，最新的在前面
  }, [searchedSessions])

  // 分页数据
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return groupedRecords.slice(startIndex, endIndex)
  }, [groupedRecords, currentPage, pageSize])

  // 当筛选条件变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1)
  }, [dateRange, customDateRange, searchKeyword])

  // 分页变化处理
  const handlePageChange = (page: number, newPageSize?: number) => {
    setCurrentPage(page)
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize)
      setCurrentPage(1) // 改变每页条数时重置到第一页
    }
  }

  const formatTime = (timestamp: number) => {
    return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
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

  const handleExport = async () => {
    try {
      const result = await window.electronAPI.exportRecords({
        format: 'markdown'
      })

      if (result.success) {
        message.success(`导出成功: ${result.filePath}`)
      } else {
        message.error(`导出失败: ${result.error}`)
      }
    } catch (error: any) {
      message.error(`导出失败: ${error?.message || '未知错误'}`)
    }
  }

  // 打开 Session 详情弹窗（按需加载详细数据）
  const handleSessionClick = async (session: GroupedRecord) => {
    setSessionModalVisible(true)
    setSessionDetailsLoading(true)
    setSelectedSession(null)

    try {
      const result = await window.electronAPI.readSessionDetails(session.sessionId)

      if (result.success && result.records) {
        setSelectedSession({
          ...session,
          records: result.records
        })
      } else {
        message.error(`加载会话详情失败: ${result.error || '未知错误'}`)
        setSessionModalVisible(false)
      }
    } catch (error: any) {
      message.error(`加载会话详情失败: ${error?.message || '未知错误'}`)
      setSessionModalVisible(false)
    } finally {
      setSessionDetailsLoading(false)
    }
  }

  // 打开 Record 详情弹窗
  const handleRecordClick = (record: ClaudeRecord) => {
    setSelectedRecord(record)
    setRecordModalVisible(true)
  }

  // 截断文本用于预览
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // 处理 AI 总结
  const handleSummarize = async (session: GroupedRecord) => {
    try {
      // 检查 AI 配置
      const settings = await window.electronAPI.getAppSettings()

      if (!settings.ai.enabled) {
        Modal.confirm({
          title: 'AI 总结功能需要配置',
          content: '使用 AI 总结功能需要先配置 API Key，是否前往设置？',
          okText: '去设置',
          cancelText: '取消',
          onOk: () => {
            onOpenSettings?.()
          }
        })
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
        return
      }

      // 如果会话记录为空，需要先加载
      let sessionRecords = session.records
      if (!sessionRecords || sessionRecords.length === 0) {
        const result = await window.electronAPI.readSessionDetails(session.sessionId)
        if (result.success && result.records) {
          sessionRecords = result.records
        } else {
          message.error('加载会话数据失败')
          return
        }
      }

      setSummarizing(true)

      // 先打开弹窗，显示"正在生成总结..."
      setSummaryContent('正在生成总结...')
      setSummaryModalVisible(true)

      let fullSummary = ''

      // 调用流式总结接口
      await window.electronAPI.summarizeRecordsStream(
        {
          records: sessionRecords,
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
              okText: '我知道了'
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
              }
            })
          } else {
            message.error(`总结失败: ${error}`, 5)
          }
        }
      )

    } catch (error: any) {
      setSummarizing(false)
      message.error(`总结失败: ${error?.message || '未知错误'}`, 5)
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

  // 删除单条记录
  const handleDeleteRecord = async (record: ClaudeRecord) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: '删除后将无法恢复，相关图片也会被删除。确认删除这条记录吗？',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await window.electronAPI.deleteRecord(
            record.sessionId || '',
            record.timestamp
          )

          if (result.success) {
            message.success('删除成功')
            // 关闭 Record 详情弹窗
            setRecordModalVisible(false)
            // 重新加载 Session 详情
            if (selectedSession) {
              const updatedResult = await window.electronAPI.readSessionDetails(selectedSession.sessionId)
              if (updatedResult.success && updatedResult.records) {
                setSelectedSession({
                  ...selectedSession,
                  records: updatedResult.records,
                  recordCount: updatedResult.records.length
                })
                // 如果删除后该 session 没有记录了，关闭 session 弹窗并刷新列表
                if (updatedResult.records.length === 0) {
                  setSessionModalVisible(false)
                  loadHistoryMetadata()
                }
              }
            }
          } else {
            message.error(`删除失败: ${result.error}`)
          }
        } catch (error: any) {
          message.error(`删除失败: ${error?.message || '未知错误'}`)
        }
      }
    })
  }

  const renderPastedContent = (content: any) => {
    if (!content) return null

    if (content.type === 'image' && content.data) {
      return (
        <img
          src={`data:image/png;base64,${content.data}`}
          alt="Pasted content"
          style={{
            maxWidth: '100%',
            height: 'auto',
            borderRadius: 4,
            border: `1px solid ${themeVars.border}`,
            marginTop: 8
          }}
        />
      )
    }

    if (typeof content === 'string') {
      return (
        <div
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

    // 处理新格式的粘贴内容（包含 content 字段）
    if (content && typeof content === 'object' && content.content) {
      return (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            background: themeVars.codeBg,
            borderRadius: 4,
            border: `1px solid ${themeVars.border}`
          }}
        >
          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
            📎 粘贴内容 #{content.id}
          </Text>
          <div style={{ fontSize: 12, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {content.content}
          </div>
        </div>
      )
    }

    return null
  }

  // 图片组件 - 使用 Ant Design Image
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

      // 加载图片
      const loadImage = async () => {
        try {
          const result = await window.electronAPI.readImage(imagePath)
          if (result.success && result.data) {
            setImageData(result.data)
            // 更新缓存
            setImageCache(prev => new Map(prev).set(imagePath, result.data!))
          } else {
            setError(result.error || '加载失败')
          }
        } catch (err: any) {
          setError(err.message || '加载失败')
        } finally {
          setLoading(false)
        }
      }

      loadImage()
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

  // 检测内容类型并自动添加语法高亮
  const renderMarkdown = (content: string) => (
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: themeVars.bgContainer,
      minHeight: 0
    }}>
      {/* 操作栏 - 只在有记录或记录功能已开启时显示 */}
      {(recordConfig?.enabled || groupedRecords.length > 0) && (
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${themeVars.border}`,
          background: themeVars.bgContainer,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitAppRegion: 'drag'
        } as React.CSSProperties}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            共 {groupedRecords.length} 个会话，{sessions.reduce((sum, s) => sum + s.recordCount, 0)} 条记录
            {searchKeyword && ` (搜索"${searchKeyword}")`}
            {groupedRecords.length > 0 && ` | 第 ${currentPage}/${Math.ceil(groupedRecords.length / pageSize)} 页`}
          </Text>
          <Space style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadHistoryMetadata}
              loading={loading}
              size="small"
            >
              刷新
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              disabled={groupedRecords.length === 0}
              size="small"
            >
              导出
            </Button>
          </Space>
        </div>
      )}

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: recordConfig && !recordConfig.enabled ? 0 : '16px 24px',
        minHeight: 0,
        display: recordConfig && !recordConfig.enabled ? 'flex' : 'block',
        alignItems: recordConfig && !recordConfig.enabled ? 'center' : 'flex-start',
        justifyContent: recordConfig && !recordConfig.enabled ? 'center' : 'flex-start'
      }}>
        {recordConfig && !recordConfig.enabled ? (
          // 记录功能未开启时的提示 - 完全居中显示
          loading ? (
            <div style={{ textAlign: 'center' }}>
              <Spin size="large" tip="加载中..." />
            </div>
          ) : (
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
          )
        ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 时间筛选器 - 只在记录功能已开启时显示 */}
          {(recordConfig?.enabled || groupedRecords.length > 0) && (
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Space wrap>
                <Button
                  type={dateRange === '1d' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    const now = dayjs()
                    const oneDayAgo = now.subtract(1, 'day')
                    setCustomDateRange([oneDayAgo.startOf('day'), now.endOf('day')])
                    setDateRange('1d')
                  }}
                >
                  1天
                </Button>
                <Button
                  type={dateRange === '7d' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    const now = dayjs()
                    const sevenDaysAgo = now.subtract(7, 'day')
                    setCustomDateRange([sevenDaysAgo.startOf('day'), now.endOf('day')])
                    setDateRange('7d')
                  }}
                >
                  7天
                </Button>
                <Button
                  type={dateRange === '30d' ? 'primary' : 'default'}
                  size="small"
                  onClick={() => {
                    const now = dayjs()
                    const thirtyDaysAgo = now.subtract(30, 'day')
                    setCustomDateRange([thirtyDaysAgo.startOf('day'), now.endOf('day')])
                    setDateRange('30d')
                  }}
                >
                  30天
                </Button>
                <RangePicker
                  size="small"
                  value={customDateRange}
                  onChange={(dates) => {
                    if (dates) {
                      const [start, end] = dates as [Dayjs, Dayjs]
                      setCustomDateRange([start.startOf('day'), end.endOf('day')])
                      setDateRange('custom')
                    }
                  }}
                />
              </Space>
            </Card>
          )}

          {/* 搜索框 - 只在记录功能已开启时显示 */}
          {(recordConfig?.enabled || groupedRecords.length > 0) && (
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Input
                placeholder="搜索对话内容、项目名称..."
                prefix={<SearchOutlined />}
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                allowClear
              />
            </Card>
          )}

          {/* Session 列表 */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Spin size="large" tip="加载中..." />
            </div>
          ) : groupedRecords.length === 0 ? (
            <Empty description="所选时间范围内没有记录" style={{ padding: 60 }} />
          ) : (
            <>
              <List
                grid={{ gutter: 16, column: 2 }}
                dataSource={paginatedRecords}
                renderItem={(group) => (
                  <List.Item style={{ marginBottom: 8 }}>
                    <Card
                      hoverable
                      size="small"
                      onClick={() => handleSessionClick(group)}
                      title={
                        <Space>
                          <Tag color="blue">{getProjectName(group.project)}</Tag>
                          {group.sessionId && !group.sessionId.startsWith('single-') && (
                            <Text code style={{ fontSize: 11 }}>
                              {group.sessionId.slice(0, 8)}
                            </Text>
                          )}
                        </Space>
                      }
                      extra={
                        <ClockCircleOutlined style={{ color: themeVars.textTertiary }} />
                      }
                      actions={[
                        <Button
                          key="summarize"
                          type="text"
                          size="small"
                          icon={<StarOutlined />}
                          loading={summarizing}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSummarize(group)
                          }}
                        >
                          AI 总结
                        </Button>
                      ]}
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatTime(group.latestTimestamp)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {group.recordCount} 条对话
                        </Text>
                        <Button
                          type="link"
                          size="small"
                          icon={<FolderOpenOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenFolder(group.project)
                          }}
                          style={{ padding: 0, height: 'auto' }}
                        >
                          <Text code style={{ fontSize: 11 }}>{truncateText(group.project, 40)}</Text>
                        </Button>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />

              {/* 分页组件 */}
              {groupedRecords.length > 0 && (
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={groupedRecords.length}
                    onChange={handlePageChange}
                    onShowSizeChange={handlePageChange}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total) => `共 ${total} 个会话`}
                    pageSizeOptions={['10', '20', '50', '100']}
                    size="small"
                  />
                </div>
              )}
            </>
          )}
        </Space>
        )}
      </div>

      {/* 层级 2: Session 详情弹窗 */}
      <Modal
        title={
          <Space>
            <Tag color="blue">{selectedSession && getProjectName(selectedSession.project)}</Tag>
            <Text type="secondary" style={{ fontSize: 13 }}>
              会话详情 ({selectedSession?.records.length || 0} 条对话)
            </Text>
          </Space>
        }
        open={sessionModalVisible}
        onCancel={handleCloseSessionModal}
        closable={true}
        maskClosable={true}
        keyboard={true}
        width="70%"
        footer={null}
        style={{ top: 40 }}
        styles={{
          body: {
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto',
            padding: '24px 24px 24px 24px'
          }
        }}
        zIndex={1001}
      >
        {sessionDetailsLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="加载会话详情中..." />
          </div>
        ) : selectedSession && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Session 信息 */}
            <Card size="small" styles={{ body: { padding: 12 } }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>项目名称：</Text>
                  <Text style={{ fontSize: 12 }}>{getProjectName(selectedSession.project)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>最后更新：</Text>
                  <Text style={{ fontSize: 12 }}>{formatTime(selectedSession.latestTimestamp)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Session ID：</Text>
                  <Text code style={{ fontSize: 12 }}>{selectedSession.sessionId}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>项目路径：</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleOpenFolder(selectedSession.project)}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    <Text code style={{ fontSize: 12 }}>{selectedSession.project}</Text>
                  </Button>
                </div>
              </Space>
            </Card>

            {/* Records 列表 */}
            <List
              dataSource={selectedSession.records}
              renderItem={(record, index) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Card
                    hoverable
                    size="small"
                    style={{ width: '100%' }}
                    onClick={() => handleRecordClick(record)}
                    title={
                      <Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          #{index + 1}
                        </Text>
                        <ClockCircleOutlined style={{ fontSize: 12 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatTime(record.timestamp)}
                        </Text>
                      </Space>
                    }
                  >
                    <Paragraph
                      ellipsis={{ rows: 2 }}
                      style={{ margin: 0, fontSize: 13, color: themeVars.textSecondary }}
                    >
                      {searchKeyword ? (
                        <Highlighter
                          searchWords={[searchKeyword]}
                          autoEscape
                          textToHighlight={record.display}
                          highlightStyle={{
                            backgroundColor: darkMode ? themeVars.primaryHover : themeVars.primaryLight,
                            color: themeVars.text,
                            padding: 0,
                          }}
                        />
                      ) : (
                        record.display
                      )}
                    </Paragraph>
                  </Card>
                </List.Item>
              )}
            />
          </Space>
        )}
      </Modal>

      {/* 层级 3: Record 详情弹窗 */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <Text>对话详情</Text>
          </Space>
        }
        open={recordModalVisible}
        onCancel={handleCloseRecordModal}
        closable={true}
        maskClosable={true}
        keyboard={true}
        width="60%"
        footer={[
          <Button
            key="delete"
            danger
            icon={<DeleteOutlined />}
            onClick={() => selectedRecord && handleDeleteRecord(selectedRecord)}
          >
            删除
          </Button>,
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={() => selectedRecord && handleCopy(selectedRecord.display)}
          >
            复制内容
          </Button>,
          <Button key="close" type="primary" onClick={handleCloseRecordModal}>
            关闭
          </Button>
        ]}
        style={{ top: 60 }}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
        zIndex={1002}
      >
        {selectedRecord && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Record 元信息 */}
            <Card size="small" styles={{ body: { background: themeVars.bgSection } }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>时间：</Text>
                  <Text style={{ fontSize: 12 }}>{formatTime(selectedRecord.timestamp)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>项目：</Text>
                  <Text
                    code
                    style={{
                      fontSize: 12,
                      cursor: 'pointer',
                      color: themeVars.primary
                    }}
                    onClick={() => handleOpenFolder(selectedRecord.project)}
                  >
                    {selectedRecord.project}
                  </Text>
                </div>
              </Space>
            </Card>

            {/* Record 内容 */}
            <Card size="small" title="对话内容">
              <div style={{ fontSize: 13, color: themeVars.text }}>
                {searchKeyword ? (
                  <Highlighter
                    searchWords={[searchKeyword]}
                    autoEscape
                    textToHighlight={selectedRecord.display}
                    highlightStyle={{
                      backgroundColor: darkMode ? themeVars.primaryHover : themeVars.primaryLight,
                      color: themeVars.text,
                      padding: '2px 4px',
                      borderRadius: 2,
                    }}
                  />
                ) : (
                  <SmartContent content={selectedRecord.display} darkMode={darkMode} />
                )}
              </div>

              {/* 渲染图片 - 与消息内容在同一个 Card */}
              {selectedRecord.images && selectedRecord.images.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${themeVars.borderSecondary}` }}>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      📷 图片附件
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                      ({selectedRecord.images.length} 张)
                    </Text>
                  </div>
                  <Image.PreviewGroup>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                      gap: 8
                    }}>
                      {selectedRecord.images.map((imagePath, imgIndex) => (
                        <ImageThumbnail key={imgIndex} imagePath={imagePath} index={imgIndex} />
                      ))}
                    </div>
                  </Image.PreviewGroup>
                </div>
              )}
            </Card>

            {/* 粘贴的内容 */}
            {selectedRecord.pastedContents && Object.keys(selectedRecord.pastedContents).length > 0 && (
              <Card size="small" title="附加内容">
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {Object.entries(selectedRecord.pastedContents).map(([key, value]) => (
                    <div key={key}>
                      <Text type="secondary" style={{ fontSize: 12 }}>附件 {key}:</Text>
                      {renderPastedContent(value)}
                    </div>
                  ))}
                </Space>
              </Card>
            )}
          </Space>
        )}
      </Modal>

      {/* AI 总结结果弹窗 */}
      <Modal
        title={
          <Space>
            <StarOutlined style={{ color: themeVars.primary }} />
            <Text>AI 总结</Text>
          </Space>
        }
        open={summaryModalVisible}
        onCancel={() => setSummaryModalVisible(false)}
        width="60%"
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={handleCopySummary}>
            复制总结
          </Button>,
          <Button key="close" type="primary" onClick={() => setSummaryModalVisible(false)}>
            关闭
          </Button>
        ]}
        style={{ top: 60 }}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' } }}
      >
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          {renderMarkdown(summaryContent)}
        </div>
      </Modal>
    </div>
  )
}

export default HistoryViewer
