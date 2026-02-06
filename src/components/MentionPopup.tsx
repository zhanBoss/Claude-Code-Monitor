import { useMemo } from 'react'
import { Button, Typography, Spin, Segmented } from 'antd'
import { SearchOutlined, CloseOutlined } from '@ant-design/icons'
import { getThemeVars } from '../theme'
import { highlightText } from '../utils/highlightText'
import type { MentionItem } from './MentionInput'

const { Text } = Typography

/* ======================== 类型定义 ======================== */

/** 弹窗中每条可选项 */
export interface MentionPopupItem {
  key: string
  title: string
  content: string
  extra?: React.ReactNode
  mentionData: MentionItem
}

/** 弹窗中的 Tab 配置 */
export interface MentionPopupTab {
  key: string
  label: string
  icon: React.ReactNode
  items: MentionPopupItem[]
  loading?: boolean
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

interface MentionPopupProps {
  visible: boolean
  darkMode: boolean
  searchText: string
  activeTab: string
  tabs: MentionPopupTab[]
  /** 所有 tab 是否有任何匹配（用于底部 "无匹配" 提示） */
  hasAnyResults: boolean
  /** 紧凑模式（窄屏） */
  isCompact?: boolean
  /** 容器 style 覆盖 */
  style?: React.CSSProperties
  onTabChange: (tab: string) => void
  onSelect: (item: MentionItem) => void
  onDismiss: () => void
}

/* ======================== 组件 ======================== */

const MentionPopup = (props: MentionPopupProps) => {
  const {
    visible,
    darkMode,
    searchText,
    activeTab,
    tabs,
    hasAnyResults,
    isCompact = false,
    style,
    onTabChange,
    onSelect,
    onDismiss
  } = props

  const themeVars = getThemeVars(darkMode)

  /* 当前激活的 tab 配置 */
  const currentTab = useMemo(
    () => tabs.find(t => t.key === activeTab) ?? tabs[0],
    [tabs, activeTab]
  )

  /* Segmented 选项 */
  const segmentedOptions = useMemo(
    () => tabs.map(t => ({ label: t.label, value: t.key, icon: t.icon })),
    [tabs]
  )

  if (!visible) return null

  /* ---- 渲染单条列表项 ---- */
  const renderItem = (item: MentionPopupItem) => (
    <div
      key={item.key}
      onClick={() => onSelect(item.mentionData)}
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
        {highlightText(item.title, searchText, themeVars.primary, darkMode)}
        {item.extra}
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
        {highlightText(item.content, searchText, themeVars.primary, darkMode)}
      </div>
    </div>
  )

  /* ---- 渲染空状态 ---- */
  const renderEmpty = (icon: React.ReactNode, title: string, desc?: string) => (
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

  /* ---- 渲染当前 tab 内容 ---- */
  const renderTabContent = () => {
    if (!currentTab) return null

    /* 加载中 */
    if (currentTab.loading) {
      return (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin size="default" />
        </div>
      )
    }

    /* 原始数据为空（非搜索导致的空） */
    if (currentTab.items.length === 0 && !searchText.trim()) {
      return renderEmpty(
        currentTab.emptyIcon,
        currentTab.emptyTitle || '暂无数据',
        currentTab.emptyDescription
      )
    }

    /* 搜索无结果 */
    if (currentTab.items.length === 0 && searchText.trim()) {
      return renderEmpty(<SearchOutlined />, '未找到匹配的内容')
    }

    /* 正常列表 */
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentTab.items.slice(0, 30).map(renderItem)}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: isCompact ? 16 : 32,
        right: isCompact ? 16 : 32,
        marginBottom: 8,
        background: themeVars.bgContainer,
        border: `1px solid ${themeVars.borderSecondary}`,
        borderRadius: 12,
        boxShadow: darkMode
          ? '0 -4px 24px rgba(0,0,0,0.3)'
          : '0 -4px 24px rgba(0,0,0,0.1)',
        zIndex: 100,
        overflow: 'hidden',
        ...style
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div style={{ padding: '12px 16px' }}>
        {/* 标题 + 关闭 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10
        }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: themeVars.text }}>
            选择引用内容
          </Text>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onDismiss}
            style={{ color: themeVars.textTertiary, width: 24, height: 24, padding: 0, borderRadius: '50%' }}
          />
        </div>

        {/* 来源 Tab */}
        <Segmented
          value={activeTab}
          onChange={(val) => onTabChange(val as string)}
          options={segmentedOptions}
          block
          size="small"
          style={{ marginBottom: 10 }}
        />

        {/* 搜索提示 */}
        {searchText && (
          <div style={{
            fontSize: 12,
            color: themeVars.textTertiary,
            marginBottom: 8,
            padding: '4px 8px',
            borderRadius: 4,
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
          }}>
            搜索: <span style={{ color: themeVars.primary, fontWeight: 500 }}>{searchText}</span>
          </div>
        )}

        {/* 列表内容 */}
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          {renderTabContent()}
        </div>

        {/* 所有 tab 均无匹配时的提示 */}
        {!hasAnyResults && searchText.trim() && (
          <div style={{
            textAlign: 'center',
            padding: '10px 12px',
            fontSize: 12,
            color: themeVars.textTertiary,
            borderTop: `1px solid ${themeVars.borderSecondary}`,
            marginTop: 4,
            lineHeight: 1.6
          }}>
            <span style={{ color: themeVars.textSecondary }}>未找到匹配内容</span>
            <span style={{ margin: '0 4px' }}>·</span>
            <span>即将作为普通文本处理</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MentionPopup
