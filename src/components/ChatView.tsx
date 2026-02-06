import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Input, Button, Select, message, Typography, Spin, Tag, Tooltip, Segmented } from 'antd'
import {
  SendOutlined,
  ClearOutlined,
  RobotOutlined,
  UserOutlined,
  DeleteOutlined,
  SettingOutlined,
  FileTextOutlined,
  SearchOutlined,
  CloseOutlined,
  PushpinFilled,
  ApiOutlined,
  ThunderboltOutlined,
  StarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { ChatMessage, CommonCommand, AISettings, ClaudeRecord } from '../types'
import { getThemeVars } from '../theme'
import ElectronModal from './ElectronModal'
import MentionInput, { MentionInputRef, MentionItem } from './MentionInput'
import MentionPopup, { MentionPopupTab } from './MentionPopup'
import { highlightText } from '../utils/highlightText'

const { TextArea } = Input
const { Text } = Typography

interface ChatViewProps {
  darkMode: boolean
  onOpenSettings?: (section?: string) => void
  initialPrompt?: string | null
  onInitialPromptUsed?: () => void
  realtimeRecords?: ClaudeRecord[]
}

/* 系统提示词预设 */
const SYSTEM_PROMPTS = {
  'claude-code-expert': {
    name: 'Claude Code 专家',
    prompt: `你是 Claude Code 使用专家。可以回答关于 Claude Code 的配置、使用技巧、最佳实践等问题。
当前用户正在使用 CCMonitor 监控 Claude Code 的对话历史。`
  },
  'general': {
    name: '通用助手',
    prompt: '你是一个有帮助的 AI 助手。'
  },
  'custom': {
    name: '自定义',
    prompt: ''
  }
}

/* 提供商选项 */
const PROVIDER_OPTIONS = [
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Groq', value: 'groq' },
  { label: 'Gemini', value: 'gemini' },
  { label: '自定义', value: 'custom' }
]

/* 提供商显示名称 */
const PROVIDER_NAMES: Record<string, string> = {
  deepseek: 'DeepSeek',
  groq: 'Groq',
  gemini: 'Gemini',
  custom: '自定义'
}

/* 提供商 API Key 获取地址 */
const PROVIDER_DOCS: Record<string, string> = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  groq: 'https://console.groq.com/keys',
  gemini: 'https://aistudio.google.com/apikey',
  custom: ''
}

/* 紧凑模式阈值 */
const COMPACT_BREAKPOINT = 880

/* 历史消息每页加载条数 */
const HISTORY_PAGE_SIZE = 50

/* 引用来源 tab 类型 */
type PromptSourceTab = 'prompts' | 'realtime' | 'history'

/* 格式化时间 */
const formatTime = (ts: number) => {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (isToday) return time
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`
}

/* 提取项目短名称 */
const getProjectShortName = (project: string) => {
  const parts = project.split('/')
  return parts[parts.length - 1] || project
}

const ChatView = (props: ChatViewProps) => {
  const { darkMode, onOpenSettings, initialPrompt, onInitialPromptUsed, realtimeRecords = [] } = props
  const themeVars = getThemeVars(darkMode)

  // AI 设置
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // 对话状态
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [textLength, setTextLength] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [systemPromptType, setSystemPromptType] = useState<keyof typeof SYSTEM_PROMPTS>('claude-code-expert')
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<'deepseek' | 'groq' | 'gemini' | 'custom'>('deepseek')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessage, setStreamingMessage] = useState('')

  // Prompt 选择器
  const [promptPickerVisible, setPromptPickerVisible] = useState(false)
  const [commonPrompts, setCommonPrompts] = useState<CommonCommand[]>([])
  const [promptSearchKeyword, setPromptSearchKeyword] = useState('')
  const promptSearchRef = useRef<any>(null)
  const [promptSourceTab, setPromptSourceTab] = useState<PromptSourceTab>('prompts')

  // 历史消息相关
  const [historySessionRecords, setHistorySessionRecords] = useState<ClaudeRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyDisplayCount, setHistoryDisplayCount] = useState(HISTORY_PAGE_SIZE)

  // 输入框焦点 & 响应式
  const [inputFocused, setInputFocused] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  // @ 引用弹窗
  const mentionInputRef = useRef<MentionInputRef>(null)
  const [mentionPopupVisible, setMentionPopupVisible] = useState(false)
  const [mentionSourceTab, setMentionSourceTab] = useState<PromptSourceTab>('prompts')
  const [mentionSearchText, setMentionSearchText] = useState('')
  const noMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 监听窗口宽度变化，决定紧凑模式
  useEffect(() => {
    const checkWidth = () => {
      setIsCompact(window.innerWidth < COMPACT_BREAKPOINT)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // 加载 AI 设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electronAPI.getAppSettings()
        setAiSettings(settings.ai)
        setSelectedProvider(settings.ai.provider)
      } catch (error) {
        console.error('加载 AI 设置失败:', error)
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [])

  // 加载常用 Prompt
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const prompts = await window.electronAPI.getCommonCommands()
        setCommonPrompts(prompts)
      } catch (error) {
        console.error('加载常用 Prompt 失败:', error)
      }
    }
    loadPrompts()
  }, [])

  // 处理外部传入的初始 Prompt
  useEffect(() => {
    if (initialPrompt) {
      mentionInputRef.current?.setTextContent(initialPrompt)
      onInitialPromptUsed?.()
    }
  }, [initialPrompt])

  // 当前提供商是否已配置好
  const providerReady = useMemo(() => {
    if (!aiSettings) return false
    if (!aiSettings.enabled) return false
    const config = aiSettings.providers?.[selectedProvider]
    if (!config) return false
    if (!config.apiKey) return false
    if (selectedProvider === 'custom') {
      return !!(config.apiBaseUrl && config.model)
    }
    return true
  }, [aiSettings, selectedProvider])

  // AI 是否已启用
  const aiEnabled = useMemo(() => aiSettings?.enabled ?? false, [aiSettings])

  // 当前模型名称
  const currentModelName = useMemo(() => {
    if (!aiSettings?.providers?.[selectedProvider]) return ''
    return aiSettings.providers[selectedProvider].model || ''
  }, [aiSettings, selectedProvider])

  // 搜索过滤后的常用 Prompt
  const filteredPrompts = useMemo(() => {
    const sorted = [...commonPrompts].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })
    if (!promptSearchKeyword.trim()) return sorted
    const keyword = promptSearchKeyword.toLowerCase()
    return sorted.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.content.toLowerCase().includes(keyword)
    )
  }, [commonPrompts, promptSearchKeyword])

  // 搜索过滤后的实时消息
  const filteredRealtimeRecords = useMemo(() => {
    if (!promptSearchKeyword.trim()) return realtimeRecords
    const keyword = promptSearchKeyword.toLowerCase()
    return realtimeRecords.filter(r =>
      r.display.toLowerCase().includes(keyword) ||
      r.project.toLowerCase().includes(keyword)
    )
  }, [realtimeRecords, promptSearchKeyword])

  // 搜索过滤后的历史消息记录
  const filteredHistoryRecords = useMemo(() => {
    if (!promptSearchKeyword.trim()) return historySessionRecords
    const keyword = promptSearchKeyword.toLowerCase()
    return historySessionRecords.filter(r =>
      r.display.toLowerCase().includes(keyword) ||
      r.project.toLowerCase().includes(keyword)
    )
  }, [historySessionRecords, promptSearchKeyword])

  // 当前页可见的历史消息
  const visibleHistoryRecords = useMemo(
    () => filteredHistoryRecords.slice(0, historyDisplayCount),
    [filteredHistoryRecords, historyDisplayCount]
  )

  // 是否还有更多历史消息
  const hasMoreHistory = filteredHistoryRecords.length > historyDisplayCount

  // @ 引用弹窗过滤后的数据
  const mentionFilteredPrompts = useMemo(() => {
    const sorted = [...commonPrompts].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })
    if (!mentionSearchText.trim()) return sorted
    const keyword = mentionSearchText.toLowerCase()
    return sorted.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.content.toLowerCase().includes(keyword)
    )
  }, [commonPrompts, mentionSearchText])

  const mentionFilteredRealtime = useMemo(() => {
    if (!mentionSearchText.trim()) return realtimeRecords
    const keyword = mentionSearchText.toLowerCase()
    return realtimeRecords.filter(r =>
      r.display.toLowerCase().includes(keyword) ||
      r.project.toLowerCase().includes(keyword)
    )
  }, [realtimeRecords, mentionSearchText])

  const mentionFilteredHistory = useMemo(() => {
    if (!mentionSearchText.trim()) return historySessionRecords
    const keyword = mentionSearchText.toLowerCase()
    return historySessionRecords.filter(r =>
      r.display.toLowerCase().includes(keyword) ||
      r.project.toLowerCase().includes(keyword)
    )
  }, [historySessionRecords, mentionSearchText])

  /* 是否有任何搜索匹配（用于弹窗内 "无匹配" 提示） */
  const mentionHasAnyResults = useMemo(() => {
    if (!mentionSearchText.trim()) return true
    return mentionFilteredPrompts.length > 0 ||
           mentionFilteredRealtime.length > 0 ||
           mentionFilteredHistory.length > 0
  }, [mentionSearchText, mentionFilteredPrompts, mentionFilteredRealtime, mentionFilteredHistory])

  /* 构建 MentionPopup 的 Tab 数据 */
  const mentionPopupTabs: MentionPopupTab[] = useMemo(() => [
    {
      key: 'prompts',
      label: '常用 Prompt',
      icon: <StarOutlined />,
      emptyIcon: <StarOutlined />,
      emptyTitle: '暂无常用 Prompt',
      emptyDescription: '请先在「常用 Prompt」页面添加',
      items: mentionFilteredPrompts.slice(0, 20).map(prompt => ({
        key: `m-${prompt.id}`,
        title: prompt.name,
        content: prompt.content,
        extra: prompt.pinned ? <PushpinFilled style={{ fontSize: 11, color: '#faad14' }} /> : undefined,
        mentionData: { id: prompt.id, label: prompt.name, content: prompt.content, type: 'prompt' as const }
      }))
    },
    {
      key: 'realtime',
      label: '实时消息',
      icon: <ThunderboltOutlined />,
      emptyIcon: <ThunderboltOutlined />,
      emptyTitle: '暂无实时消息',
      emptyDescription: '开启监控后，新的对话将出现在这里',
      items: mentionFilteredRealtime.slice(0, 30).map((record, idx) => ({
        key: `m-rt-${record.timestamp}-${idx}`,
        title: getProjectShortName(record.project),
        content: record.display,
        extra: <span style={{ fontSize: 11, color: themeVars.textTertiary, fontWeight: 400, marginLeft: 'auto' }}>{formatTime(record.timestamp)}</span>,
        mentionData: { id: `rt-${record.timestamp}-${idx}`, label: getProjectShortName(record.project), content: record.display, type: 'realtime' as const }
      }))
    },
    {
      key: 'history',
      label: '历史消息',
      icon: <ClockCircleOutlined />,
      loading: historyLoading,
      emptyIcon: <ClockCircleOutlined />,
      emptyTitle: '暂无历史消息',
      items: mentionFilteredHistory.slice(0, 30).map((record, idx) => ({
        key: `m-hr-${record.timestamp}-${idx}`,
        title: getProjectShortName(record.project),
        content: record.display,
        extra: <span style={{ fontSize: 11, color: themeVars.textTertiary, fontWeight: 400, marginLeft: 'auto' }}>{formatTime(record.timestamp)}</span>,
        mentionData: { id: `hr-${record.timestamp}-${idx}`, label: getProjectShortName(record.project), content: record.display, type: 'history' as const }
      }))
    }
  ], [mentionFilteredPrompts, mentionFilteredRealtime, mentionFilteredHistory, historyLoading, themeVars])

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])

  // 获取当前系统提示词
  const getSystemPrompt = () => {
    if (systemPromptType === 'custom') {
      return customSystemPrompt
    }
    return SYSTEM_PROMPTS[systemPromptType].prompt
  }

  // 发送消息
  const handleSend = async () => {
    const content = mentionInputRef.current?.getContent()
    if (!content || !content.text.trim() || isLoading) return

    /* 构建消息文本，引用内容附加在末尾 */
    let messageText = content.text
    if (content.mentions.length > 0) {
      messageText += '\n\n--- 引用内容 ---'
      content.mentions.forEach(m => {
        messageText += `\n\n【${m.label}】:\n${m.content}`
      })
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    mentionInputRef.current?.clear()
    setTextLength(0)
    setIsLoading(true)
    setStreamingMessage('')

    let streamContent = ''

    try {
      const systemPrompt = getSystemPrompt()
      const messagesToSend: ChatMessage[] = systemPrompt
        ? [
            { id: 'system', role: 'system', content: systemPrompt, timestamp: Date.now() },
            ...messages,
            userMessage
          ]
        : [...messages, userMessage]

      await window.electronAPI.chatStream(
        { messages: messagesToSend, provider: selectedProvider },
        (chunk: string) => {
          streamContent += chunk
          setStreamingMessage(streamContent)
        },
        () => {
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              role: 'assistant',
              content: streamContent,
              timestamp: Date.now()
            }
          ])
          setStreamingMessage('')
          setIsLoading(false)
        },
        (error: string) => {
          message.error(`对话失败: ${error}`)
          setIsLoading(false)
          setStreamingMessage('')
        }
      )
    } catch (error) {
      message.error('发送消息失败')
      setIsLoading(false)
      setStreamingMessage('')
    }
  }

  // 清空对话
  const handleClear = () => {
    setMessages([])
    setStreamingMessage('')
  }

  // 删除单条消息
  const handleDeleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id))
  }

  // 使用引用内容（追加或替换到输入框，来自"引用"弹窗）
  const handleUseContent = (content: string) => {
    const currentContent = mentionInputRef.current?.getContent()
    if (currentContent && currentContent.text.trim()) {
      mentionInputRef.current?.appendText('\n\n' + content)
    } else {
      mentionInputRef.current?.setTextContent(content)
    }
    setPromptPickerVisible(false)
    setPromptSearchKeyword('')
    mentionInputRef.current?.focus()
  }

  /* 清除无匹配自动关闭定时器 */
  const clearNoMatchTimer = useCallback(() => {
    if (noMatchTimerRef.current) {
      clearTimeout(noMatchTimerRef.current)
      noMatchTimerRef.current = null
    }
  }, [])

  /* 组件卸载时清理定时器 */
  useEffect(() => {
    return () => {
      if (noMatchTimerRef.current) {
        clearTimeout(noMatchTimerRef.current)
      }
    }
  }, [])

  // @ 引用弹窗相关处理
  const handleMentionTrigger = useCallback(() => {
    clearNoMatchTimer()
    setMentionPopupVisible(true)
    setMentionSourceTab('prompts')
    setMentionSearchText('')
    /* 刷新常用 Prompt */
    window.electronAPI.getCommonCommands().then(setCommonPrompts).catch(() => {})
  }, [clearNoMatchTimer])

  const handleMentionSearchChange = useCallback((searchText: string) => {
    setMentionSearchText(searchText)
    clearNoMatchTimer()

    /* 搜索文本非空时，检查所有 tab 是否还有匹配结果 */
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase()
      const hasPrompts = commonPrompts.some(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.content.toLowerCase().includes(keyword)
      )
      const hasRealtime = realtimeRecords.some(r =>
        r.display.toLowerCase().includes(keyword) ||
        r.project.toLowerCase().includes(keyword)
      )
      const hasHistory = historySessionRecords.some(r =>
        r.display.toLowerCase().includes(keyword) ||
        r.project.toLowerCase().includes(keyword)
      )

      if (!hasPrompts && !hasRealtime && !hasHistory) {
        /*
         * 所有 tab 均无匹配 — 延迟 1.5s 后自动关闭
         * 弹窗保持可见，显示 "无匹配" 提示，给用户反应时间
         * 若在倒计时内出现匹配（用户继续输入/删除），定时器自动取消
         */
        noMatchTimerRef.current = setTimeout(() => {
          mentionInputRef.current?.dismissMention()
          setMentionPopupVisible(false)
          setMentionSearchText('')
          noMatchTimerRef.current = null
        }, 1500)
        /* 保持弹窗可见，显示无匹配提示 */
        setMentionPopupVisible(true)
        return
      }
    }

    /* 有匹配或搜索文本为空，确保弹窗可见 */
    setMentionPopupVisible(true)
  }, [commonPrompts, realtimeRecords, historySessionRecords, clearNoMatchTimer])

  const handleMentionDismiss = useCallback(() => {
    clearNoMatchTimer()
    setMentionPopupVisible(false)
    setMentionSearchText('')
  }, [clearNoMatchTimer])

  const handleMentionSelect = useCallback((mention: MentionItem) => {
    clearNoMatchTimer()
    mentionInputRef.current?.insertMention(mention)
    setMentionPopupVisible(false)
    setMentionSearchText('')
  }, [clearNoMatchTimer])

  const handleMentionTabChange = useCallback((tab: PromptSourceTab) => {
    setMentionSourceTab(tab)

    /* 切到历史 tab 时加载记录 */
    if (tab === 'history' && historySessionRecords.length === 0) {
      setHistoryLoading(true)
      window.electronAPI.readHistory()
        .then(result => {
          if (result.success && result.records) {
            const sorted = [...result.records].sort((a, b) => b.timestamp - a.timestamp)
            setHistorySessionRecords(sorted)
          }
        })
        .catch(() => {})
        .finally(() => setHistoryLoading(false))
    }
  }, [historySessionRecords.length])

  // 打开 Prompt 选择器
  const handleOpenPromptPicker = () => {
    /* 关闭 @ 引用弹窗 */
    setMentionPopupVisible(false)
    setMentionSearchText('')

    setPromptPickerVisible(true)
    setPromptSearchKeyword('')
    setPromptSourceTab('prompts')
    setHistorySessionRecords([])
    // 刷新常用 Prompt 列表
    window.electronAPI.getCommonCommands().then(setCommonPrompts).catch(() => {})
    setTimeout(() => promptSearchRef.current?.focus(), 100)
  }

  // 切换引用来源 tab
  const handleTabChange = useCallback((tab: PromptSourceTab) => {
    setPromptSourceTab(tab)
    setPromptSearchKeyword('')
    setHistorySessionRecords([])
    setHistoryDisplayCount(HISTORY_PAGE_SIZE)

    // 切到历史 tab 时加载所有记录（扁平化展示）
    if (tab === 'history') {
      setHistoryLoading(true)
      window.electronAPI.readHistory()
        .then(result => {
          if (result.success && result.records) {
            // 按时间倒序排列，最新的在前
            const sorted = [...result.records].sort((a, b) => b.timestamp - a.timestamp)
            setHistorySessionRecords(sorted)
          }
        })
        .catch(() => {})
        .finally(() => setHistoryLoading(false))
    }
  }, [])

  // 跳转到设置页
  const handleGoToSettings = () => {
    onOpenSettings?.('ai-settings')
  }

  // 气泡颜色
  const userBubbleBg = darkMode ? 'rgba(217, 119, 87, 0.12)' : 'rgba(217, 119, 87, 0.06)'
  const aiBubbleBg = themeVars.bgContainer

  // ==================== 渲染 ====================

  // 加载中
  if (settingsLoading) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: themeVars.bgLayout
      }}>
        <Spin size="large" />
      </div>
    )
  }

  // 渲染消息气泡
  const renderMessageBubble = (msg: ChatMessage, isStreaming = false) => {
    const isUser = msg.role === 'user'

    return (
      <div
        key={msg.id}
        className="chat-message-row"
        style={{
          display: 'flex',
          gap: 12,
          flexDirection: isUser ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          maxWidth: '85%',
          marginLeft: isUser ? 'auto' : 0,
          marginRight: isUser ? 0 : 'auto'
        }}
      >
        {/* 头像 */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: isUser ? themeVars.primaryGradient : (darkMode ? '#333' : '#e8e8e8'),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: 2
        }}>
          {isUser ? (
            <UserOutlined style={{ fontSize: 14, color: '#fff' }} />
          ) : (
            <RobotOutlined style={{ fontSize: 14, color: isUser ? '#fff' : themeVars.primary }} />
          )}
        </div>

        {/* 气泡 */}
        <div style={{
          position: 'relative',
          background: isUser ? userBubbleBg : aiBubbleBg,
          border: isUser ? 'none' : `1px solid ${themeVars.borderSecondary}`,
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '12px 16px',
          minWidth: 40
        }}>
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: themeVars.text,
            fontSize: 14,
            lineHeight: 1.7
          }}>
            {msg.content}
          </div>

          {isStreaming && (
            <Spin size="small" style={{ marginTop: 8 }} />
          )}

          {!isStreaming && (
            <div
              className="chat-msg-actions"
              style={{
                position: 'absolute',
                top: 6,
                right: isUser ? 'auto' : 6,
                left: isUser ? 6 : 'auto',
                opacity: 0,
                transition: 'opacity 0.15s'
              }}
            >
              <Tooltip title="删除">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteMessage(msg.id)}
                  style={{
                    color: themeVars.textTertiary,
                    width: 24,
                    height: 24,
                    padding: 0,
                    borderRadius: '50%'
                  }}
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 渲染空状态
  const renderEmptyState = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 48,
      gap: 20
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: themeVars.primaryGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 8px 24px ${themeVars.primaryShadow}`
      }}>
        <RobotOutlined style={{ fontSize: 36, color: '#fff' }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: themeVars.text,
          marginBottom: 8
        }}>
          开始与 AI 助手对话
        </div>
        <div style={{
          fontSize: 13,
          color: themeVars.textTertiary,
          maxWidth: 320,
          lineHeight: 1.6
        }}>
          你可以输入任何问题，或点击下方「引用」使用预设的提示词
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 8,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {[
          { icon: <ThunderboltOutlined />, text: '使用技巧' },
          { icon: <SettingOutlined />, text: '配置指南' },
          { icon: <ApiOutlined />, text: '最佳实践' }
        ].map((item, i) => (
          <div
            key={i}
            onClick={() => {
              mentionInputRef.current?.setTextContent(
                i === 0
                  ? 'Claude Code 有哪些实用的使用技巧？'
                  : i === 1
                    ? '如何配置 Claude Code 的 settings.json？'
                    : 'Claude Code 的最佳实践有哪些？'
              )
              mentionInputRef.current?.focus()
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: `1px solid ${themeVars.borderSecondary}`,
              background: themeVars.bgContainer,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: themeVars.textSecondary,
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = themeVars.primary
              e.currentTarget.style.color = themeVars.primary
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = themeVars.borderSecondary
              e.currentTarget.style.color = themeVars.textSecondary
            }}
          >
            {item.icon}
            {item.text}
          </div>
        ))}
      </div>
    </div>
  )

  // 渲染引导页
  const renderGuidancePage = (type: 'disabled' | 'unconfigured') => {
    const providerName = PROVIDER_NAMES[selectedProvider] || selectedProvider
    const docUrl = PROVIDER_DOCS[selectedProvider]

    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: themeVars.bgLayout
      }}>
        {/* 顶栏 */}
        <div style={{
          padding: '10px 24px',
          background: themeVars.bgContainer,
          borderBottom: `1px solid ${themeVars.borderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: themeVars.primaryGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <RobotOutlined style={{ fontSize: 14, color: '#fff' }} />
          </div>
          {!isCompact && (
            <Text strong style={{ color: themeVars.text, fontSize: 15 }}>AI 助手</Text>
          )}

          {type === 'unconfigured' && (
            <>
              <div style={{ width: 1, height: 16, background: themeVars.borderSecondary }} />
              <Select
                value={selectedProvider}
                onChange={setSelectedProvider}
                style={{ width: 120 }}
                size="small"
                options={PROVIDER_OPTIONS}
                variant="borderless"
              />
            </>
          )}
        </div>

        {/* 引导内容 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 400,
            padding: '40px 48px',
            background: themeVars.bgContainer,
            borderRadius: 16,
            border: `1px solid ${themeVars.borderSecondary}`
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: darkMode ? 'rgba(217, 119, 87, 0.12)' : 'rgba(217, 119, 87, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              {type === 'disabled' ? (
                <SettingOutlined style={{ fontSize: 28, color: themeVars.primary }} />
              ) : (
                <ApiOutlined style={{ fontSize: 28, color: themeVars.primary }} />
              )}
            </div>

            <div style={{ fontSize: 17, fontWeight: 600, color: themeVars.text, marginBottom: 8 }}>
              {type === 'disabled' ? 'AI 功能未启用' : `${providerName} 尚未配置`}
            </div>

            <div style={{ fontSize: 13, color: themeVars.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
              {type === 'disabled'
                ? '请先在应用设置中启用 AI 功能并配置 API Key'
                : selectedProvider === 'custom'
                  ? '自定义提供商需要配置 API Key、API 地址和模型名称'
                  : `使用 ${providerName} 需要先配置 API Key`
              }
            </div>

            {type === 'unconfigured' && docUrl && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                marginBottom: 20,
                fontSize: 12,
                color: themeVars.textTertiary,
                wordBreak: 'break-all'
              }}>
                获取 Key：
                <a
                  onClick={() => window.electronAPI.openExternal(docUrl)}
                  style={{ color: themeVars.primary, cursor: 'pointer', marginLeft: 4 }}
                >
                  {docUrl}
                </a>
              </div>
            )}

            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={handleGoToSettings}
              style={{ borderRadius: 8, height: 36, paddingInline: 24 }}
            >
              {type === 'disabled' ? '前往设置' : '前往配置'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* 渲染引用内容列表项（通用样式，支持关键词高亮） */
  const renderPickerItem = (
    key: string,
    title: string,
    content: string,
    extra?: React.ReactNode,
    onClick?: () => void,
    keyword?: string
  ) => (
    <div
      key={key}
      onClick={onClick}
      style={{
        padding: '10px 14px',
        borderRadius: 8,
        cursor: 'pointer',
        border: '1px solid transparent',
        background: 'transparent',
        transition: 'all 0.15s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = themeVars.hoverBg
        e.currentTarget.style.borderColor = themeVars.borderSecondary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: themeVars.text,
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {keyword ? highlightText(title, keyword, themeVars.primary, darkMode) : title}
        {extra}
      </div>
      <div style={{
        fontSize: 12,
        color: themeVars.textTertiary,
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {keyword ? highlightText(content, keyword, themeVars.primary, darkMode) : content}
      </div>
    </div>
  )

  // 渲染 Prompt 选择器弹窗内容（按 tab 区分）
  const renderPickerContent = () => {
    // ---- 常用 Prompt ----
    if (promptSourceTab === 'prompts') {
      if (commonPrompts.length === 0) {
        return renderPickerEmpty(<StarOutlined />, '暂无常用 Prompt', '请先在「常用 Prompt」页面添加')
      }
      if (filteredPrompts.length === 0) {
        return renderPickerEmpty(<SearchOutlined />, '未找到匹配的 Prompt')
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredPrompts.map(prompt =>
            renderPickerItem(
              prompt.id,
              prompt.name,
              prompt.content,
              prompt.pinned ? <PushpinFilled style={{ fontSize: 11, color: '#faad14' }} /> : undefined,
              () => handleUseContent(prompt.content),
              promptSearchKeyword
            )
          )}
        </div>
      )
    }

    // ---- 实时消息 ----
    if (promptSourceTab === 'realtime') {
      if (realtimeRecords.length === 0) {
        return renderPickerEmpty(<ThunderboltOutlined />, '暂无实时消息', '开启监控后，新的对话将出现在这里')
      }
      if (filteredRealtimeRecords.length === 0) {
        return renderPickerEmpty(<SearchOutlined />, '未找到匹配的消息')
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredRealtimeRecords.map((record, idx) =>
            renderPickerItem(
              `rt-${record.timestamp}-${idx}`,
              getProjectShortName(record.project),
              record.display,
              <span style={{ fontSize: 11, color: themeVars.textTertiary, fontWeight: 400, marginLeft: 'auto' }}>
                {formatTime(record.timestamp)}
              </span>,
              () => handleUseContent(record.display),
              promptSearchKeyword
            )
          )}
        </div>
      )
    }

    // ---- 历史消息（扁平化展示每条 prompt） ----
    if (promptSourceTab === 'history') {
      if (historyLoading) {
        return (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="default" />
          </div>
        )
      }

      if (historySessionRecords.length === 0) {
        return renderPickerEmpty(<ClockCircleOutlined />, '暂无历史消息')
      }
      if (filteredHistoryRecords.length === 0) {
        return renderPickerEmpty(<SearchOutlined />, '未找到匹配的消息')
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {visibleHistoryRecords.map((record, idx) =>
            renderPickerItem(
              `hr-${record.timestamp}-${idx}`,
              getProjectShortName(record.project),
              record.display,
              <span style={{ fontSize: 11, color: themeVars.textTertiary, fontWeight: 400, marginLeft: 'auto' }}>
                {formatTime(record.timestamp)}
              </span>,
              () => handleUseContent(record.display),
              promptSearchKeyword
            )
          )}

          {/* 加载更多 / 统计信息 */}
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            {hasMoreHistory ? (
              <Button
                type="link"
                size="small"
                onClick={() => setHistoryDisplayCount(prev => prev + HISTORY_PAGE_SIZE)}
                style={{ fontSize: 12, color: themeVars.textSecondary }}
              >
                加载更多（已显示 {visibleHistoryRecords.length} / {filteredHistoryRecords.length} 条）
              </Button>
            ) : (
              <span style={{ fontSize: 11, color: themeVars.textTertiary }}>
                共 {filteredHistoryRecords.length} 条历史消息
              </span>
            )}
          </div>
        </div>
      )
    }

    return null
  }

  // 渲染空状态（选择器内）
  const renderPickerEmpty = (icon: React.ReactNode, title: string, desc?: string) => (
    <div style={{
      textAlign: 'center',
      padding: '32px 20px',
      color: themeVars.textTertiary
    }}>
      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 13 }}>{title}</div>
      {desc && <div style={{ fontSize: 12, marginTop: 4 }}>{desc}</div>}
    </div>
  )

  // AI 功能未启用
  if (!aiEnabled) {
    return renderGuidancePage('disabled')
  }

  // 当前提供商未配置
  if (!providerReady) {
    return renderGuidancePage('unconfigured')
  }

  // ==================== 正常聊天界面 ====================
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: themeVars.bgLayout
    }}>
      {/* 顶部栏 */}
      <div style={{
        padding: '10px 24px',
        background: themeVars.bgContainer,
        borderBottom: `1px solid ${themeVars.borderSecondary}`,
        display: 'flex',
        alignItems: 'center',
        gap: isCompact ? 8 : 12
      }}>
        {/* 标题图标 */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: themeVars.primaryGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <RobotOutlined style={{ fontSize: 14, color: '#fff' }} />
        </div>
        {/* 紧凑模式下隐藏标题文案 */}
        {!isCompact && (
          <Text strong style={{ color: themeVars.text, fontSize: 15 }}>AI 助手</Text>
        )}

        <div style={{ width: 1, height: 16, background: themeVars.borderSecondary }} />

        {/* 系统提示词 */}
        <Select
          value={systemPromptType}
          onChange={setSystemPromptType}
          style={{ width: isCompact ? 120 : 160 }}
          size="small"
          variant="borderless"
          options={Object.entries(SYSTEM_PROMPTS).map(([key, value]) => ({
            label: value.name,
            value: key
          }))}
        />

        {/* 提供商选择 */}
        <Select
          value={selectedProvider}
          onChange={setSelectedProvider}
          style={{ width: isCompact ? 90 : 110 }}
          size="small"
          variant="borderless"
          options={PROVIDER_OPTIONS}
        />

        {/* 模型名称（紧凑模式隐藏） */}
        {!isCompact && currentModelName && (
          <Tag
            style={{
              margin: 0,
              fontSize: 11,
              borderRadius: 4,
              color: themeVars.textTertiary,
              background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: 'none',
              lineHeight: '20px'
            }}
          >
            {currentModelName}
          </Tag>
        )}

        <div style={{ flex: 1 }} />

        {/* 清空 */}
        <Tooltip title="清空对话">
          <Button
            type="text"
            icon={<ClearOutlined />}
            onClick={handleClear}
            disabled={messages.length === 0 && !streamingMessage}
            style={{
              color: themeVars.textTertiary,
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: 8
            }}
          />
        </Tooltip>
      </div>

      {/* 自定义系统提示词 */}
      {systemPromptType === 'custom' && (
        <div style={{
          padding: '10px 24px',
          background: themeVars.bgContainer,
          borderBottom: `1px solid ${themeVars.borderSecondary}`
        }}>
          <TextArea
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            placeholder="输入自定义系统提示词..."
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              borderRadius: 8,
              background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${themeVars.borderSecondary}`
            }}
          />
        </div>
      )}

      {/* 消息区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: isCompact ? '20px 16px' : '24px 32px'
      }}>
        {messages.length === 0 && !streamingMessage ? (
          renderEmptyState()
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {messages.filter(msg => msg.role !== 'system').map(msg =>
              renderMessageBubble(msg)
            )}
            {streamingMessage && renderMessageBubble(
              { id: 'streaming', role: 'assistant', content: streamingMessage, timestamp: Date.now() },
              true
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div style={{ padding: isCompact ? '12px 16px 16px' : '12px 32px 20px', position: 'relative' }}>

        {/* @ 引用弹窗（浮动在输入框上方） */}
        <MentionPopup
          visible={mentionPopupVisible}
          darkMode={darkMode}
          searchText={mentionSearchText}
          activeTab={mentionSourceTab}
          tabs={mentionPopupTabs}
          hasAnyResults={mentionHasAnyResults}
          isCompact={isCompact}
          onTabChange={(tab) => handleMentionTabChange(tab as PromptSourceTab)}
          onSelect={handleMentionSelect}
          onDismiss={handleMentionDismiss}
        />

        <div style={{
          border: `1px solid ${inputFocused ? themeVars.primary : themeVars.borderSecondary}`,
          borderRadius: 12,
          background: themeVars.bgContainer,
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: inputFocused ? `0 0 0 2px ${themeVars.primaryShadow}` : 'none',
          overflow: 'hidden'
        }}>
          <MentionInput
            ref={mentionInputRef}
            darkMode={darkMode}
            disabled={isLoading}
            mentionPopupVisible={mentionPopupVisible}
            placeholder="输入消息，输入 @ 引用内容... (Shift+Enter 换行)"
            onSend={handleSend}
            onChange={setTextLength}
            onMentionTrigger={handleMentionTrigger}
            onMentionSearchChange={handleMentionSearchChange}
            onMentionDismiss={handleMentionDismiss}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
          />

          {/* 底部操作栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px 8px',
            gap: 4
          }}>
            <Tooltip title="从实时消息、历史消息、常用 Prompt 中选取">
              <Button
                type="text"
                icon={<FileTextOutlined />}
                onClick={handleOpenPromptPicker}
                size="small"
                disabled={isLoading}
                style={{
                  color: themeVars.textTertiary,
                  borderRadius: 6,
                  fontSize: 13,
                  height: 28
                }}
              >
                {/* 紧凑模式隐藏文案 */}
                {!isCompact && '引用'}
              </Button>
            </Tooltip>

            <div style={{ flex: 1 }} />

            {textLength > 0 && (
              <Text style={{ fontSize: 11, color: themeVars.textTertiary, marginRight: 4 }}>
                {textLength} 字
              </Text>
            )}

            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isLoading}
              disabled={textLength === 0}
              size="small"
              style={{ borderRadius: 8, height: 30, paddingInline: isCompact ? 10 : 14, fontSize: 13 }}
            >
              {!isCompact && '发送'}
            </Button>
          </div>
        </div>
      </div>

      {/* 引用内容选择器弹窗 */}
      <ElectronModal
        open={promptPickerVisible}
        onCancel={() => {
          setPromptPickerVisible(false)
          setPromptSearchKeyword('')
        }}
        footer={null}
        closable={false}
        width={560}
        style={{ top: '12%' }}
        styles={{ body: { padding: 0 } as React.CSSProperties }}
      >
        <div style={{ padding: '16px 20px' }}>
          {/* 标题 + 关闭 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <Text strong style={{ fontSize: 15, color: themeVars.text }}>引用内容</Text>
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={() => {
                setPromptPickerVisible(false)
                setPromptSearchKeyword('')
              }}
              style={{ color: themeVars.textTertiary }}
            />
          </div>

          {/* 来源 Tab */}
          <Segmented
            value={promptSourceTab}
            onChange={(val) => handleTabChange(val as PromptSourceTab)}
            options={[
              { label: '常用 Prompt', value: 'prompts', icon: <StarOutlined /> },
              { label: '实时消息', value: 'realtime', icon: <ThunderboltOutlined /> },
              { label: '历史消息', value: 'history', icon: <ClockCircleOutlined /> }
            ]}
            block
            style={{ marginBottom: 12 }}
          />

          {/* 搜索框 */}
          <div style={{ marginBottom: 12 }}>
            <Input
              ref={promptSearchRef}
              placeholder={
                promptSourceTab === 'prompts'
                  ? '搜索 Prompt...'
                  : promptSourceTab === 'realtime'
                    ? '搜索实时消息...'
                    : '搜索历史消息...'
              }
              value={promptSearchKeyword}
              onChange={(e) => {
                setPromptSearchKeyword(e.target.value)
                setHistoryDisplayCount(HISTORY_PAGE_SIZE)
              }}
              prefix={<SearchOutlined style={{ color: themeVars.textTertiary }} />}
              suffix={
                promptSearchKeyword ? (
                  <CloseOutlined
                    style={{ fontSize: 12, color: themeVars.textTertiary, cursor: 'pointer' }}
                    onClick={() => setPromptSearchKeyword('')}
                  />
                ) : null
              }
              style={{ borderRadius: 8 }}
              allowClear={false}
            />
          </div>

          {/* 列表内容 */}
          <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {renderPickerContent()}
          </div>
        </div>
      </ElectronModal>

      {/* 全局样式 */}
      <style>{`
        .chat-message-row:hover .chat-msg-actions {
          opacity: 1 !important;
        }
        .mention-tag {
          display: inline-flex;
          align-items: center;
          padding: 1px 8px;
          margin: 0 2px;
          border-radius: 4px;
          background: ${darkMode ? 'rgba(217, 119, 87, 0.15)' : 'rgba(217, 119, 87, 0.08)'};
          color: ${darkMode ? '#E88B6F' : '#D97757'};
          font-size: 13px;
          line-height: 1.6;
          cursor: default;
          user-select: none;
          vertical-align: baseline;
          border: 1px solid ${darkMode ? 'rgba(217, 119, 87, 0.3)' : 'rgba(217, 119, 87, 0.2)'};
          font-weight: 500;
          white-space: nowrap;
        }
        .mention-tag:hover {
          background: ${darkMode ? 'rgba(217, 119, 87, 0.25)' : 'rgba(217, 119, 87, 0.15)'};
        }
      `}</style>
    </div>
  )
}

export default ChatView
