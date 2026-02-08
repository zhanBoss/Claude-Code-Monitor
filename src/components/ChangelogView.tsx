import { useState } from 'react'
import { Timeline, Card, Tag, Space } from 'antd'
import { ClockCircleOutlined, RocketOutlined, BugOutlined, ToolOutlined, FileTextOutlined, DownOutlined } from '@ant-design/icons'
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
  changes: ChangeItem[]
}

const changelog: VersionData[] = [
  {
    version: '1.7.0',
    date: '2026-02-08',
    changes: [
      { type: 'feat', description: 'AI 助手对话支持重新生成回复功能' },
      { type: 'feat', description: '每条 AI 回复添加"重新生成"按钮，支持针对单条消息独立重新生成' },
      { type: 'feat', description: '使用原始 prompt 重新生成，不影响其他对话' },
      { type: 'feat', description: '流式显示在原位置替换，保持对话顺序' },
      { type: 'refactor', description: '重新生成按钮 UI 优化：位于消息气泡右侧外部，不遮挡内容' },
      { type: 'refactor', description: '按钮默认隐藏，hover 消息时显示，简洁的图标设计' },
      { type: 'refactor', description: '平滑的淡入淡出动画效果，距离消息气泡仅 4px' },
      { type: 'feat', description: 'AI 对话功能全面升级：支持 Markdown 渲染、打字机效果、代码块复制' },
      { type: 'feat', description: '添加 @ 引用输入框功能，支持引用历史对话内容到 AI 助手' },
      { type: 'feat', description: '支持将对话内容发送到 AI 助手，实现上下文对话' },
      { type: 'feat', description: '添加图片复制到剪贴板功能，抽取可复用的图片组件' },
      { type: 'feat', description: '常用 Prompt 支持拖拽排序，自定义 Prompt 顺序' },
      { type: 'feat', description: '优化应用图标符合 macOS 规范，提升视觉一致性' },
      { type: 'feat', description: '添加自动清理倒计时悬浮框，实时显示下次清理时间' },
      { type: 'feat', description: '悬浮球开关即时响应优化，移除轮询机制' },
      { type: 'feat', description: '设置页面导航栏优化：默认收起只显示图标，hover 展开' },
      { type: 'feat', description: '导航栏收起状态下图标居中显示，激活项右上角显示高亮点' },
      { type: 'feat', description: 'MentionPopup 添加完整键盘导航支持，支持上下键选择' },
      { type: 'feat', description: '导出对话代码块支持语法高亮，采用 Catppuccin Mocha 配色方案' },
      { type: 'feat', description: '代码块语法高亮支持 10+ 编程语言（JS/TS/Python/Java/Go/Rust/C/C++/SQL 等）' },
      { type: 'refactor', description: '移除导出和清空按钮的冗余 Tooltip，简化界面交互' },
      { type: 'refactor', description: '重构 AI 配置架构：拆分对话与总结功能，独立配置' },
      { type: 'refactor', description: '统一颜色系统，移除所有硬编码颜色，使用主题变量' },
      { type: 'refactor', description: '优化设置页面导航交互体验，改进滚动和高亮逻辑' },
      { type: 'refactor', description: '提取公共关键词高亮工具，统一全项目高亮风格' },
      { type: 'refactor', description: '将复制成功提示改为 toast 样式，提升用户体验' },
      { type: 'refactor', description: '移除左侧 Sidebar 自动收起功能，保持固定宽度' },
      { type: 'fix', description: '修复应用启动时未自动启动文件监控的问题' },
      { type: 'fix', description: '修复自动清理定时器状态同步和页面刷新丢失问题' },
      { type: 'fix', description: '修复导航栏高亮跟随问题，收起状态下仍保持高亮指示' },
      { type: 'fix', description: '修复图标居中对齐问题，使用 justifyContent 实现完美居中' },
      { type: 'fix', description: '修复 electron/main.ts 的 TypeScript 类型错误' },
      { type: 'docs', description: '添加 mention-input 和 keyword-highlight 两个开发 Skill' },
      { type: 'docs', description: '添加发布工作流程 Skill，规范版本发布流程' }
    ]
  },
  {
    version: '1.6.0',
    date: '2026-02-05',
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
    changes: [
      { type: 'fix', description: '修复实时对话图片加载失败问题，解决路径重复拼接导致文件找不到' },
      { type: 'fix', description: '添加图片加载轮询机制，确保图片最终能成功加载' },
      { type: 'fix', description: '图片现在可以立即显示，无需刷新页面' }
    ]
  },
  {
    version: '1.4.1',
    date: '2026-02-03',
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
  // 默认展开最新版本（第一个）
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['0'])

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

  // 统计每个版本的更新数量
  const getChangeSummary = (changes: ChangeItem[]) => {
    const summary = {
      feat: changes.filter(c => c.type === 'feat').length,
      fix: changes.filter(c => c.type === 'fix').length,
      refactor: changes.filter(c => c.type === 'refactor').length,
      docs: changes.filter(c => c.type === 'docs').length
    }
    return summary
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
          items={changelog.map((version, index) => {
            const summary = getChangeSummary(version.changes)
            const isLatest = index === 0

            return {
              dot: <ClockCircleOutlined style={{ fontSize: 16, color: themeVars.primary }} />,
              children: (
                <Card
                  key={version.version}
                  style={{
                    background: themeVars.bgContainer,
                    border: `1px solid ${isLatest ? themeVars.primary : themeVars.border}`,
                    borderRadius: 8,
                    marginBottom: index === changelog.length - 1 ? 0 : 16,
                    boxShadow: darkMode
                      ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                      : '0 2px 8px rgba(0, 0, 0, 0.06)'
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  {/* 版本头部 - 可点击展开/收起 */}
                  <div
                    onClick={() => {
                      const key = index.toString()
                      setExpandedKeys(prev =>
                        prev.includes(key)
                          ? prev.filter(k => k !== key)
                          : [...prev, key]
                      )
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      cursor: 'pointer',
                      borderBottom: expandedKeys.includes(index.toString())
                        ? `1px solid ${themeVars.borderSecondary}`
                        : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Space size={12}>
                      <span style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: isLatest ? themeVars.primary : themeVars.text,
                        fontFamily: 'Fira Code, monospace'
                      }}>
                        v{version.version}
                      </span>
                      {isLatest && (
                        <Tag color="blue" style={{ margin: 0 }}>最新</Tag>
                      )}
                      <span style={{
                        fontSize: 13,
                        color: themeVars.textTertiary
                      }}>
                        {version.date}
                      </span>
                    </Space>

                    <Space size={8}>
                      {/* 更新统计 */}
                      <Space size={4}>
                        {summary.feat > 0 && (
                          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                            {summary.feat} 新功能
                          </Tag>
                        )}
                        {summary.fix > 0 && (
                          <Tag color="error" style={{ margin: 0, fontSize: 11 }}>
                            {summary.fix} 修复
                          </Tag>
                        )}
                        {summary.refactor > 0 && (
                          <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
                            {summary.refactor} 重构
                          </Tag>
                        )}
                        {summary.docs > 0 && (
                          <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                            {summary.docs} 文档
                          </Tag>
                        )}
                      </Space>

                      {/* 展开/收起图标 */}
                      <DownOutlined
                        style={{
                          fontSize: 12,
                          color: themeVars.textSecondary,
                          transform: expandedKeys.includes(index.toString())
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                          transition: 'transform 0.2s'
                        }}
                      />
                    </Space>
                  </div>

                  {/* 变更列表 - 折叠内容 */}
                  {expandedKeys.includes(index.toString()) && (
                    <div style={{ padding: '20px' }}>
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
                    </div>
                  )}
                </Card>
              )
            }
          })}
        />
      </div>
    </div>
  )
}

export default ChangelogView
