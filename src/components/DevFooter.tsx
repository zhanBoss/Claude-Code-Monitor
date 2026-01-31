import { InfoCircleOutlined } from '@ant-design/icons'
import { message } from 'antd'

function DevFooter() {
  const handleOpenDevtools = async () => {
    try {
      const result = await window.electronAPI.openDevtools()
      if (result.success) {
        message.success('开发者控制台已打开')
      } else {
        message.error('打开失败: ' + result.error)
      }
    } catch (error) {
      message.error('打开失败')
    }
  }

  // 检测操作系统
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcut = isMac ? 'Cmd+Option+I' : 'Ctrl+Shift+I'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 12,
        zIndex: 1000,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <InfoCircleOutlined style={{ marginRight: 6, fontSize: 14 }} />
      <span style={{ opacity: 0.9 }}>
        开发调试模式：按{' '}
        <kbd
          style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 6px',
            borderRadius: 3,
            fontFamily: 'monospace',
            fontSize: 11,
            border: '1px solid rgba(255,255,255,0.3)'
          }}
        >
          {shortcut}
        </kbd>{' '}
        或{' '}
        <a
          onClick={handleOpenDevtools}
          style={{
            color: 'white',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          点击此处
        </a>{' '}
        打开开发者控制台
      </span>
    </div>
  )
}

export default DevFooter
