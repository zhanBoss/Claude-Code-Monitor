import { useState, useEffect, useMemo } from 'react'
import { Button, Card, Tag, Space, Typography, Empty, Spin, DatePicker, message, List, Modal, Pagination, Input } from 'antd'
import {
  FolderOpenOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  CloseOutlined,
  ReloadOutlined,
  ExportOutlined,
  SearchOutlined
} from '@ant-design/icons'
import Highlighter from 'react-highlight-words'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ClaudeRecord } from '../types'
import dayjs, { Dayjs } from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { RangePicker } = DatePicker

interface HistoryViewerProps {
  onToggleView: () => void
}

interface GroupedRecord {
  sessionId: string
  project: string
  records: ClaudeRecord[]
  latestTimestamp: number
}

type DateRange = '1d' | '7d' | '30d' | 'custom'

function HistoryViewer({ onToggleView }: HistoryViewerProps) {
  const [records, setRecords] = useState<ClaudeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [customDateRange, setCustomDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 层级 2: Session 详情弹窗
  const [selectedSession, setSelectedSession] = useState<GroupedRecord | null>(null)
  const [sessionModalVisible, setSessionModalVisible] = useState(false)

  // 层级 3: Record 详情弹窗
  const [selectedRecord, setSelectedRecord] = useState<ClaudeRecord | null>(null)
  const [recordModalVisible, setRecordModalVisible] = useState(false)

  // Session Modal 关闭处理
  const handleCloseSessionModal = () => {
    setSessionModalVisible(false)
  }

  // Record Modal 关闭处理
  const handleCloseRecordModal = () => {
    setRecordModalVisible(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    setLoading(true)
    try {
      // 添加超时保护
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('加载超时')), 10000)
      })

      const result = await Promise.race([
        window.electronAPI.readHistory(),
        timeoutPromise
      ])

      if (result.success && result.records) {
        setRecords(result.records)
        message.success(`成功加载 ${result.records.length} 条记录`)
      } else {
        setRecords([])
        if (result.error) {
          console.error('加载历史记录失败:', result.error)
          message.error(`加载失败: ${result.error}`)
        } else {
          message.info('没有找到历史记录')
        }
      }
    } catch (error: any) {
      console.error('加载历史记录时发生错误:', error)
      const errorMsg = error?.message || '未知错误'
      message.error(`加载失败: ${errorMsg}`)
      setRecords([])
    } finally {
      setLoading(false)
    }
  }

  // 根据日期范围筛选记录
  const filteredRecords = useMemo(() => {
    const now = Date.now()
    let startTime: number

    switch (dateRange) {
      case '1d':
        startTime = now - 24 * 60 * 60 * 1000
        break
      case '7d':
        startTime = now - 7 * 24 * 60 * 60 * 1000
        break
      case '30d':
        startTime = now - 30 * 24 * 60 * 60 * 1000
        break
      case 'custom':
        if (customDateRange) {
          const [start, end] = customDateRange
          return records.filter(r =>
            r.timestamp >= start.valueOf() &&
            r.timestamp <= end.endOf('day').valueOf()
          )
        }
        return records
      default:
        return records
    }

    return records.filter(r => r.timestamp >= startTime)
  }, [records, dateRange, customDateRange])

  // 搜索过滤
  const searchedRecords = useMemo(() => {
    if (!searchKeyword.trim()) {
      return filteredRecords
    }

    const keyword = searchKeyword.toLowerCase()
    return filteredRecords.filter(record => {
      return record.display.toLowerCase().includes(keyword) ||
             record.project.toLowerCase().includes(keyword)
    })
  }, [filteredRecords, searchKeyword])

  // 按 sessionId 分组
  const groupedRecords = useMemo(() => {
    const groups = new Map<string, GroupedRecord>()

    searchedRecords.forEach(record => {
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
  }, [searchedRecords])

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

  // 打开 Session 详情弹窗
  const handleSessionClick = (session: GroupedRecord) => {
    setSelectedSession(session)
    setSessionModalVisible(true)
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
            border: '1px solid #d9d9d9',
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
            background: '#f5f5f5',
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

  // 检测内容类型并自动添加语法高亮
  const detectLanguage = (text: string): string | null => {
    const trimmed = text.trim()

    // 尝试解析完整 JSON
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch (e) {
      // JSON 解析失败，继续其他检测
    }

    // 检测 JSON 特征（更宽松的规则）
    const hasJsonChars = trimmed.includes('{') && trimmed.includes(':')
    const hasQuotedKeys = /["'][a-zA-Z0-9_-]+["']\s*:/.test(trimmed)
    const startsWithQuotedKey = /^["'][a-zA-Z0-9_-]+["']\s*:/.test(trimmed)

    if (hasJsonChars || hasQuotedKeys || startsWithQuotedKey) {
      return 'json'
    }

    // 检测其他代码特征
    if (text.includes('function') || text.includes('const') || text.includes('let') || text.includes('var')) {
      return 'javascript'
    }
    if (text.includes('import') && text.includes('from')) {
      return 'typescript'
    }
    if (text.includes('def ') || text.includes('class ')) {
      return 'python'
    }
    if (text.includes('<?php')) {
      return 'php'
    }
    if (text.includes('<html') || text.includes('<div') || text.includes('</')) {
      return 'html'
    }
    if (text.includes('SELECT') || text.includes('INSERT') || text.includes('UPDATE')) {
      return 'sql'
    }

    return null
  }

  const renderContent = (content: string) => {
    // 检测并处理转义的字符串
    let processedContent = content

    // 检查是否是被 JSON.stringify 包裹的字符串（以 " 开头和结尾）
    if (content.startsWith('"') && content.endsWith('"')) {
      try {
        // 尝试作为 JSON 字符串解析
        const parsed = JSON.parse(content)
        if (typeof parsed === 'string') {
          processedContent = parsed
        }
      } catch (e) {
        // 如果解析失败，直接去除首尾引号并手动处理转义
        processedContent = content.slice(1, -1)
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\')
      }
    }

    const trimmed = processedContent.trim()

    // 改进代码检测逻辑：不再强制要求换行符
    const looksLikeCode = (
      // JSON 格式
      (trimmed.startsWith('{') || trimmed.startsWith('[')) ||
      // 常见代码关键字
      processedContent.includes('function') ||
      processedContent.includes('const ') ||
      processedContent.includes('let ') ||
      processedContent.includes('var ') ||
      processedContent.includes('import ') ||
      processedContent.includes('export ') ||
      processedContent.includes('class ') ||
      processedContent.includes('def ') ||
      processedContent.includes('<?php') ||
      // 多行代码
      (processedContent.includes('\n') && (processedContent.includes('{') || processedContent.includes('=')))
    )

    if (looksLikeCode) {
      const language = detectLanguage(processedContent)

      if (language) {
        return (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              borderRadius: 6,
              fontSize: 13,
              maxHeight: 500,
              overflow: 'auto'
            }}
            wrapLongLines={true}
          >
            {processedContent}
          </SyntaxHighlighter>
        )
      }
    }

    // 否则使用 Markdown 渲染
    return renderMarkdown(processedContent)
  }

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
                background: '#f5f5f5',
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
      background: '#fff',
      minHeight: 0
    }}>
      {/* 顶部标题栏 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
        flexShrink: 0
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <Title level={4} style={{ margin: 0, marginBottom: 4, fontSize: 16 }}>历史对话日志</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {groupedRecords.length} 个会话，{searchedRecords.length} 条记录
              {searchKeyword && ` (搜索"${searchKeyword}")`}
              {groupedRecords.length > 0 && ` | 第 ${currentPage}/${Math.ceil(groupedRecords.length / pageSize)} 页`}
            </Text>
          </div>
          <Space wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadHistory}
              size="small"
              loading={loading}
            >
              刷新
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              size="small"
              disabled={groupedRecords.length === 0}
            >
              导出
            </Button>
            <Button
              icon={<ClockCircleOutlined />}
              type="primary"
              onClick={onToggleView}
              size="small"
            >
              实时对话
            </Button>
          </Space>
        </div>
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px 24px',
        minHeight: 0
      }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 时间筛选器 */}
          <Card size="small" bodyStyle={{ padding: 12 }}>
            <Space wrap>
              <Button
                type={dateRange === '1d' ? 'primary' : 'default'}
                size="small"
                onClick={() => setDateRange('1d')}
              >
                1天
              </Button>
              <Button
                type={dateRange === '7d' ? 'primary' : 'default'}
                size="small"
                onClick={() => setDateRange('7d')}
              >
                7天
              </Button>
              <Button
                type={dateRange === '30d' ? 'primary' : 'default'}
                size="small"
                onClick={() => setDateRange('30d')}
              >
                30天
              </Button>
              <RangePicker
                size="small"
                value={customDateRange}
                onChange={(dates) => {
                  if (dates) {
                    setCustomDateRange(dates as [Dayjs, Dayjs])
                    setDateRange('custom')
                  }
                }}
              />
            </Space>
          </Card>

          {/* 搜索框 */}
          <Card size="small" bodyStyle={{ padding: 12 }}>
            <Input
              placeholder="搜索对话内容、项目名称..."
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
            />
          </Card>

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
                        <ClockCircleOutlined style={{ color: '#999' }} />
                      }
                    >
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatTime(group.latestTimestamp)}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {group.records.length} 条对话
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
        closeIcon={<CloseOutlined onClick={(e) => {
          e.stopPropagation()
          handleCloseSessionModal()
        }} />}
        maskClosable={true}
        keyboard={true}
        destroyOnClose={false}
        width="70%"
        footer={null}
        style={{ top: 40 }}
        bodyStyle={{
          maxHeight: 'calc(100vh - 220px)',
          overflowY: 'auto',
          padding: '24px 24px 24px 24px'
        }}
        zIndex={1001}
      >
        {selectedSession && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Session 信息 */}
            <Card size="small" bodyStyle={{ padding: 12 }}>
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
                      style={{ margin: 0, fontSize: 13, color: '#666' }}
                    >
                      {searchKeyword ? (
                        <Highlighter
                          searchWords={[searchKeyword]}
                          autoEscape
                          textToHighlight={record.display}
                          highlightStyle={{
                            backgroundColor: '#ffc069',
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
        closeIcon={<CloseOutlined onClick={(e) => {
          e.stopPropagation()
          handleCloseRecordModal()
        }} />}
        maskClosable={true}
        keyboard={true}
        destroyOnClose={false}
        width="60%"
        footer={[
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
        bodyStyle={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
        zIndex={1002}
      >
        {selectedRecord && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* Record 元信息 */}
            <Card size="small" bodyStyle={{ background: '#fafafa' }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>时间：</Text>
                  <Text style={{ fontSize: 12 }}>{formatTime(selectedRecord.timestamp)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>项目：</Text>
                  <Text code style={{ fontSize: 12 }}>{selectedRecord.project}</Text>
                </div>
              </Space>
            </Card>

            {/* Record 内容 */}
            <Card size="small" title="对话内容">
              <div style={{ fontSize: 13, color: '#333' }}>
                {searchKeyword ? (
                  <Highlighter
                    searchWords={[searchKeyword]}
                    autoEscape
                    textToHighlight={selectedRecord.display}
                    highlightStyle={{
                      backgroundColor: '#ffc069',
                      padding: '2px 4px',
                      borderRadius: 2,
                    }}
                  />
                ) : (
                  renderContent(selectedRecord.display)
                )}
              </div>
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
    </div>
  )
}

export default HistoryViewer
