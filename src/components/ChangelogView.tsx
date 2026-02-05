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
    version: '1.6.0',
    date: '2026-02-05',
    type: 'minor',
    changes: [
      { type: 'feat', description: '常用Prompt页面新增快捷搜索功能，支持 Cmd+F / Ctrl+F 快捷键' },
      { type: 'feat', description: '搜索弹窗支持 Prompt 名称和内容搜索，关键词高亮显示' },
      { type: 'feat', description: '点击搜索结果直接复制内容，按 ESC 快速关闭搜索' },
      { type: 'refactor', description: '常用Prompt页面交互升级：移除复制按钮，点击卡片直接复制' },
      { type: 'refactor', description: '添加 hover 和点击动画效果，卡片向右上角浮动' },
      { type: 'refactor', description: '卡片采用阴影设计，操作按钮仅在 hover 时显示' },
      { type: 'refactor', description: '复制成功显示浮层提示，带动画效果' },
      { type: 'fix', description: '修复快捷键无法触发搜索弹窗的问题' },
      { type: 'fix', description: '主列表不受搜索影响，始终显示完整数据' }
    ]
  },
  {
    version: '1.5.0',
    date: '2026-02-05',
    type: 'minor',
    changes: [
      { type: 'feat', description: '实时对话页面新增快捷搜索功能，支持 Cmd+F / Ctrl+F 快捷键' },
      { type: 'feat', description: '居中弹窗式搜索界面，实时搜索 Prompt 内容，支持关键词高亮' },
      { type: 'feat', description: '历史记录页面搜索功能全面升级，改为搜索 Prompt 内容' },
      { type: 'feat', description: '搜索结果显示匹配上下文，点击直接查看详情' },
      { type: 'refactor', description: '打开搜索时自动关闭所有其他弹窗，界面更清爽' },
      { type: 'refactor', description: '搜索支持防抖（300ms），减少不必要的计算' },
      { type: 'refactor', description: '封装 ElectronModal 组件，Modal 代码量减少 80%' },
      { type: 'fix', description: '改进图片匹配逻辑，支持无标记的图片识别' },
      { type: 'fix', description: '修复图片关联错误，只关联当前 prompt 使用的图片' },
      { type: 'fix', description: '修复实时对话清空后刷新数据回显问题' }
    ]
  },
  {
    version: '1.4.2',
    date: '2026-02-03',
    type: 'patch',
    changes: [
      { type: 'fix', description: '修复实时对话图片加载失败问题，解决路径重复拼接导致文件找不到' },
      { type: 'fix', description: '添加图片加载轮询机制，确保图片最终能成功加载' },
      { type: 'fix', description: '图片现在可以立即显示，无需刷新页面' }
    ]
  },
  {
    version: '1.4.1',
    date: '2026-02-03',
    type: 'patch',
    changes: [
      { type: 'fix', description: '修复 TypeScript 编译错误，添加 downlevelIteration 支持 Map/Set 迭代' },
      { type: 'fix', description: '添加 esModuleInterop 和 allowSyntheticDefaultImports 支持模块导入' },
      { type: 'fix', description: '为 Electron 主进程创建独立的 TypeScript 配置 (tsconfig.electron.json)' },
      { type: 'fix', description: '修复 global.processedImages 类型声明问题' }
    ]
  },
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
        maxWidth: 900,
        margin: '0 auto',
        padding: '24px 20px'
      }}>
        {/* 页面标题 */}
        <div style={{
          marginBottom: 24,
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: themeVars.text,
            marginBottom: 6
          }}>
            更新日志
          </h1>
          <p style={{
            fontSize: 13,
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
                  borderRadius: 8,
                  marginBottom: index === changelog.length - 1 ? 0 : 16,
                  boxShadow: darkMode
                    ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.06)'
                }}
                bodyStyle={{ padding: 16 }}
              >
                {/* 版本头部 */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${themeVars.borderSecondary}`
                }}>
                  <Space size={8}>
                    <span style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: themeVars.primary,
                      fontFamily: 'Fira Code, monospace'
                    }}>
                      v{version.version}
                    </span>
                    {getVersionTypeTag(version.type)}
                  </Space>
                  <span style={{
                    fontSize: 13,
                    color: themeVars.textTertiary
                  }}>
                    {version.date}
                  </span>
                </div>

                {/* 变更列表 */}
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {version.changes.map((change, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 14,
                        color: themeVars.text,
                        lineHeight: 1.8
                      }}
                    >
                      <div style={{ flexShrink: 0 }}>
                        {getTypeIcon(change.type)}
                      </div>
                      <Tag
                        color={getTypeColor(change.type)}
                        style={{
                          margin: 0,
                          fontSize: 11,
                          padding: '0 4px',
                          lineHeight: '18px',
                          flexShrink: 0
                        }}
                      >
                        {getTypeLabel(change.type)}
                      </Tag>
                      <span style={{ flex: 1 }}>
                        {change.description}
                      </span>
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
