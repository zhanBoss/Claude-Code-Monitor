import { Timeline, Card, Tag, Space } from 'antd'
import { ClockCircleOutlined, RocketOutlined, BugOutlined, ToolOutlined, FileTextOutlined } from '@ant-design/icons'
import { getThemeVars } from '../theme'

interface ChangelogViewProps {
  darkMode: boolean
}

interface ChangeItem {
  type: 'feat' | 'fix' | 'refactor' | 'docs'
  description: string
}

interface VersionData {
  version: string
  date: string
  type: 'major' | 'minor' | 'patch'
  changes: ChangeItem[]
}

const changelog: VersionData[] = [
  {
    version: '1.4.0',
    date: '2024-02-02',
    type: 'minor',
    changes: [
      { type: 'feat', description: '实现历史记录按需加载优化，提升大数据量场景性能' },
      { type: 'docs', description: '添加 CLAUDE.md 开发指南，规范开发流程' },
      { type: 'refactor', description: '优化配置管理和数据刷新机制' },
      { type: 'feat', description: '完善窗口拖动功能，优化左右布局体验' }
    ]
  },
  {
    version: '1.3.0',
    date: '2024-01-28',
    type: 'minor',
    changes: [
      { type: 'feat', description: '添加开发模式标识和开发者工具提示' },
      { type: 'feat', description: '优化构建配置，分离开发版和生产版构建流程' },
      { type: 'feat', description: '添加开发/生产构建脚本和清理脚本' },
      { type: 'fix', description: '修复生产环境白屏和 DevTools 显示问题' },
      { type: 'refactor', description: '更名为 CCMonitor 并使用圆角图标，提升品牌识别度' }
    ]
  },
  {
    version: '1.2.0',
    date: '2024-01-25',
    type: 'minor',
    changes: [
      { type: 'feat', description: '优化日期选择器，简化状态栏，增强设置页面交互' },
      { type: 'refactor', description: '统一顶部栏为通用 ViewHeader 组件' },
      { type: 'refactor', description: '优化视图切换 UI，使用 Segmented 组件' },
      { type: 'feat', description: '实现 AI 总结流式输出，提升用户体验' },
      { type: 'feat', description: '添加自定义 AI 提供商选项，支持完全灵活配置' },
      { type: 'feat', description: '添加免费 AI 提供商支持（Groq 和 Gemini）' },
      { type: 'feat', description: '优化设置页面和主题管理系统' },
      { type: 'fix', description: '修复流式 AI 总结在 Node.js 环境的报错' },
      { type: 'fix', description: '修复切换 AI 提供商时 API Key 丢失问题' },
      { type: 'fix', description: '修复 Ant Design 废弃 API 警告' }
    ]
  },
  {
    version: '1.1.0',
    date: '2024-01-20',
    type: 'minor',
    changes: [
      { type: 'feat', description: '添加全局搜索功能，支持关键词高亮显示' },
      { type: 'feat', description: '添加 Markdown 格式导出功能' },
      { type: 'feat', description: '添加自动启动设置，支持开机自启' },
      { type: 'feat', description: '实现暗色模式切换功能，支持 light/dark/system 三种模式' },
      { type: 'refactor', description: '完善暗黑模式主题系统，优化颜色适配' },
      { type: 'fix', description: '优化暗黑模式文字对比度' },
      { type: 'fix', description: '修复暗黑模式 UI 问题和 macOS 全屏兼容性' }
    ]
  },
  {
    version: '1.0.0',
    date: '2024-01-15',
    type: 'major',
    changes: [
      { type: 'feat', description: '实时对话监控功能，支持监控 Claude Code 对话历史' },
      { type: 'feat', description: '历史记录浏览功能，支持按日期、会话筛选' },
      { type: 'feat', description: 'Claude Code 配置管理，支持备份和恢复配置' },
      { type: 'feat', description: '基于 Electron + React 的桌面应用架构' },
      { type: 'feat', description: '集成 Monaco Editor 用于配置文件编辑' },
      { type: 'feat', description: '基础 UI 和主题系统，使用 Ant Design 组件库' }
    ]
  }
]

const ChangelogView = ({ darkMode }: ChangelogViewProps) => {
  const themeVars = getThemeVars(darkMode)

  const getTypeIcon = (type: ChangeItem['type']) => {
    switch (type) {
      case 'feat':
        return <RocketOutlined style={{ color: themeVars.success }} />
      case 'fix':
        return <BugOutlined style={{ color: themeVars.error }} />
      case 'refactor':
        return <ToolOutlined style={{ color: themeVars.info }} />
      case 'docs':
        return <FileTextOutlined style={{ color: themeVars.warning }} />
    }
  }

  const getTypeLabel = (type: ChangeItem['type']) => {
    switch (type) {
      case 'feat':
        return '新功能'
      case 'fix':
        return '修复'
      case 'refactor':
        return '重构'
      case 'docs':
        return '文档'
    }
  }

  const getTypeColor = (type: ChangeItem['type']) => {
    switch (type) {
      case 'feat':
        return 'success'
      case 'fix':
        return 'error'
      case 'refactor':
        return 'processing'
      case 'docs':
        return 'warning'
    }
  }

  const getVersionTypeTag = (type: VersionData['type']) => {
    const config = {
      major: { label: '大版本', color: 'red' },
      minor: { label: '小版本', color: 'blue' },
      patch: { label: '补丁', color: 'default' }
    }
    return <Tag color={config[type].color}>{config[type].label}</Tag>
  }

  return (
    <div style={{
      height: '100%',
      overflow: 'auto',
      background: themeVars.bgLayout
    }}>
      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* 页面标题 */}
        <div style={{
          marginBottom: 32,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 32,
            fontWeight: 700,
            color: themeVars.text,
            marginBottom: 8
          }}>
            更新日志
          </h1>
          <p style={{
            fontSize: 14,
            color: themeVars.textSecondary
          }}>
            记录 CCMonitor 的版本演进历程
          </p>
        </div>

        {/* 时间线 */}
        <Timeline
          mode="left"
          items={changelog.map((version, index) => ({
            dot: <ClockCircleOutlined style={{ fontSize: 16, color: themeVars.primary }} />,
            children: (
              <Card
                key={version.version}
                style={{
                  background: themeVars.bgContainer,
                  border: `1px solid ${themeVars.border}`,
                  borderRadius: 12,
                  marginBottom: index === changelog.length - 1 ? 0 : 24,
                  boxShadow: darkMode
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
                bodyStyle={{ padding: 24 }}
              >
                {/* 版本头部 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${themeVars.borderSecondary}`
                }}>
                  <Space size={12}>
                    <span style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: themeVars.primary,
                      fontFamily: 'Fira Code, monospace'
                    }}>
                      v{version.version}
                    </span>
                    {getVersionTypeTag(version.type)}
                  </Space>
                  <span style={{
                    fontSize: 14,
                    color: themeVars.textTertiary
                  }}>
                    {version.date}
                  </span>
                </div>

                {/* 变更列表 */}
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {version.changes.map((change, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '8px 12px',
                        background: themeVars.bgSection,
                        borderRadius: 8,
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = themeVars.hoverBg
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = themeVars.bgSection
                      }}
                    >
                      <div style={{ marginTop: 2 }}>
                        {getTypeIcon(change.type)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4
                        }}>
                          <Tag
                            color={getTypeColor(change.type)}
                            style={{
                              margin: 0,
                              fontSize: 12,
                              padding: '0 6px',
                              lineHeight: '20px'
                            }}
                          >
                            {getTypeLabel(change.type)}
                          </Tag>
                        </div>
                        <div style={{
                          fontSize: 14,
                          color: themeVars.text,
                          lineHeight: 1.6
                        }}>
                          {change.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </Space>
              </Card>
            )
          }))}
        />
      </div>
    </div>
  )
}

export default ChangelogView
