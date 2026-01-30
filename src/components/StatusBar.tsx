import { PageHeader, Tag, Space, Button, Tooltip } from 'antd'
import { FolderOutlined, MessageOutlined, BulbOutlined, SettingOutlined } from '@ant-design/icons'

interface StatusBarProps {
  claudeDir: string
  darkMode: boolean
  onThemeToggle: () => void
  onOpenSettings: () => void
}

function StatusBar({ claudeDir, darkMode, onThemeToggle, onOpenSettings }: StatusBarProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitAppRegion: 'drag' as any,
        padding: '12px 16px',
        minHeight: 64,
        flexShrink: 0
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <Space size="middle">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            fontSize: 20,
            flexShrink: 0
          }}>
            <MessageOutlined style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'white',
              letterSpacing: 0.5,
              whiteSpace: 'nowrap'
            }}>
              Claude Code Monitor
            </div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.85)',
              marginTop: 2
            }}>
              对话记录监控工具
            </div>
          </div>
        </Space>

        <Space size="middle">
          <Tooltip title="设置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={onOpenSettings}
              style={{
                WebkitAppRegion: 'no-drag' as any,
                color: 'white',
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)'
              }}
            />
          </Tooltip>

          <Tooltip title={darkMode ? '切换到亮色模式' : '切换到暗色模式'}>
            <Button
              type="text"
              icon={<BulbOutlined />}
              onClick={onThemeToggle}
              style={{
                WebkitAppRegion: 'no-drag' as any,
                color: 'white',
                background: 'rgba(255,255,255,0.15)',
                borderColor: 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)'
              }}
            />
          </Tooltip>

          <Tag
            icon={<FolderOutlined />}
            color="blue"
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.3)',
              color: 'white',
              padding: '6px 12px',
              fontSize: 12,
              fontFamily: 'monospace',
              backdropFilter: 'blur(10px)',
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {claudeDir}
          </Tag>
        </Space>
      </div>
    </div>
  )
}

export default StatusBar
