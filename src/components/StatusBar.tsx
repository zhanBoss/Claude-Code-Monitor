import { Space, Button, Tooltip } from 'antd'
import { MessageOutlined, SettingOutlined } from '@ant-design/icons'
import type { CSSProperties } from 'react'

interface StatusBarProps {
  onOpenSettings: () => void
}

function StatusBar({ onOpenSettings }: StatusBarProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitAppRegion: 'drag',
        padding: '12px 16px',
        paddingLeft: 80,  // 为 macOS 全屏模式的窗口控制按钮预留空间
        minHeight: 64,
        flexShrink: 0
      } as CSSProperties}
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
              CCMonitor{__IS_DEV_BUILD__ ? ' --develop' : ''}
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

        <Tooltip title="设置">
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
            style={{
              WebkitAppRegion: 'no-drag',
              color: 'white',
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.3)',
              backdropFilter: 'blur(10px)'
            } as CSSProperties}
          />
        </Tooltip>
      </div>
    </div>
  )
}

export default StatusBar
