import { Card, Space, Typography, Divider, Button } from 'antd'
import {
  InfoCircleOutlined,
  GithubOutlined,
  HeartOutlined,
  CodeOutlined
} from '@ant-design/icons'
import { getThemeVars } from '../theme'

const { Text, Link } = Typography

interface AboutViewProps {
  darkMode: boolean
}

function AboutView({ darkMode }: AboutViewProps) {
  const themeVars = getThemeVars(darkMode)

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: themeVars.bgLayout
    }}>
      {/* 顶部标题栏 - 可拖动 */}
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
        <Text strong style={{ fontSize: 16 }}>关于</Text>
      </div>

      {/* 内容区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto'
        }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 应用信息卡片 */}
            <Card
              style={{
                backgroundColor: themeVars.bgContainer,
                borderColor: themeVars.border
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{
                    background: themeVars.primaryGradient,
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: `0 8px 16px ${themeVars.primaryShadow}`
                  }}>
                    <InfoCircleOutlined style={{ fontSize: 40, color: themeVars.bgContainer }} />
                  </div>
                  <Text strong style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>
                    Claude Code Monitor
                  </Text>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    实时监控 Claude Code 对话历史的开源工具
                  </Text>
                </div>

                <Divider style={{ margin: 0 }} />

                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">版本</Text>
                    <Text strong>1.4.0</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">作者</Text>
                    <Text strong>mac033</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">开源协议</Text>
                    <Text strong>MIT License</Text>
                  </div>
                </Space>
              </Space>
            </Card>

            {/* 功能特性卡片 */}
            <Card
              title={
                <Space>
                  <CodeOutlined style={{ color: themeVars.primary }} />
                  <span>功能特性</span>
                </Space>
              }
              style={{
                backgroundColor: themeVars.bgContainer,
                borderColor: themeVars.border
              }}
            >
              <Space direction="vertical" size={8}>
                <Text>• 实时监控 Claude Code 对话历史</Text>
                <Text>• 支持对话记录的搜索和筛选</Text>
                <Text>• AI 驱动的对话摘要功能</Text>
                <Text>• Claude Code 配置管理和备份</Text>
                <Text>• 支持明暗主题切换</Text>
                <Text>• 跨平台支持（macOS、Windows、Linux）</Text>
              </Space>
            </Card>

            {/* 开源信息卡片 */}
            <Card
              title={
                <Space>
                  <GithubOutlined style={{ color: themeVars.primary }} />
                  <span>开源信息</span>
                </Space>
              }
              style={{
                backgroundColor: themeVars.bgContainer,
                borderColor: themeVars.border
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    本项目基于 MIT 协议开源，欢迎贡献代码和提出建议
                  </Text>
                  <Button
                    type="primary"
                    icon={<GithubOutlined />}
                    href="https://github.com/zhanBoss/Claude-Code-Monitor"
                    target="_blank"
                    size="large"
                  >
                    访问 GitHub 仓库
                  </Button>
                </div>

                <Divider style={{ margin: 0 }} />

                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    如果觉得这个项目对你有帮助，欢迎给个 Star ⭐
                  </Text>
                </div>
              </Space>
            </Card>

            {/* 致谢卡片 */}
            <Card
              title={
                <Space>
                  <HeartOutlined style={{ color: themeVars.error }} />
                  <span>致谢</span>
                </Space>
              }
              style={{
                backgroundColor: themeVars.bgContainer,
                borderColor: themeVars.border
              }}
            >
              <Space direction="vertical" size={8}>
                <Text>感谢以下开源项目：</Text>
                <Text type="secondary">• Electron - 跨平台桌面应用框架</Text>
                <Text type="secondary">• React - 用户界面库</Text>
                <Text type="secondary">• Ant Design - 企业级 UI 设计语言</Text>
                <Text type="secondary">• Monaco Editor - 代码编辑器</Text>
                <Text type="secondary">• Vite - 前端构建工具</Text>
              </Space>
            </Card>

            {/* 联系方式卡片 */}
            <Card
              title="联系方式"
              style={{
                backgroundColor: themeVars.bgContainer,
                borderColor: themeVars.border
              }}
            >
              <Space direction="vertical" size={8}>
                <div>
                  <Text type="secondary">GitHub: </Text>
                  <Link href="https://github.com/zhanBoss" target="_blank">
                    @zhanBoss
                  </Link>
                </div>
                <div>
                  <Text type="secondary">问题反馈: </Text>
                  <Link href="https://github.com/zhanBoss/Claude-Code-Monitor/issues" target="_blank">
                    GitHub Issues
                  </Link>
                </div>
              </Space>
            </Card>
          </Space>
        </div>
      </div>
    </div>
  )
}

export default AboutView
