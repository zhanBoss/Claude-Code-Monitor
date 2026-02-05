import { useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Card, Switch, Button, Typography, Space, Spin, Tag, Alert, message, Modal } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { RecordConfig } from '../types'
import { getElectronModalConfig } from './ElectronModal'

const { Title, Text } = Typography

interface RecordControlProps {
  // darkMode 参数保留以保持接口一致性，但当前未使用
}

export interface RecordControlRef {
  refresh: () => Promise<void>
}

const RecordControl = forwardRef<RecordControlRef, RecordControlProps>((_, ref) => {
  const [config, setConfig] = useState<RecordConfig>({
    enabled: false,
    savePath: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [])

  // 暴露 refresh 方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await loadConfig()
    }
  }))

  const loadConfig = async () => {
    const result = await window.electronAPI.getRecordConfig()
    setConfig(result)
    setLoading(false)
  }

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      // 开启记录，选择路径
      const result = await window.electronAPI.selectSavePath()
      if (result.canceled || !result.path) {
        return
      }

      const newConfig = {
        enabled: true,
        savePath: result.path
      }

      const saveResult = await window.electronAPI.saveRecordConfig(newConfig)
      if (saveResult.success) {
        setConfig(newConfig)
      } else {
        alert('保存失败：' + saveResult.error)
      }
    } else {
      // 关闭记录
      const newConfig = {
        enabled: false,
        savePath: config.savePath
      }

      const saveResult = await window.electronAPI.saveRecordConfig(newConfig)
      if (saveResult.success) {
        setConfig(newConfig)
      }
    }
  }

  const handleChangePath = async () => {
    const result = await window.electronAPI.selectSavePath()
    if (result.canceled || !result.path) {
      return
    }

    const newConfig = {
      ...config,
      savePath: result.path
    }

    const saveResult = await window.electronAPI.saveRecordConfig(newConfig)
    if (saveResult.success) {
      setConfig(newConfig)
    } else {
      alert('保存失败：' + saveResult.error)
    }
  }

  const handleClearCache = () => {
    Modal.confirm({
      title: '清除缓存',
      icon: <ExclamationCircleOutlined />,
      content: '将删除保存路径下的所有对话记录和图片缓存，不影响 Claude Code 原始数据。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await window.electronAPI.clearCache()
          if (result.success) {
            message.success(`已清除 ${result.deletedCount} 个文件`)
          } else {
            message.error(result.error || '清除失败')
          }
        } catch (error: any) {
          message.error(error?.message || '清除失败')
        }
      },
      ...getElectronModalConfig()
    })
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin tip="加载中..." />
      </div>
    )
  }

  return (
    <Space vertical size="middle" style={{ width: '100%' }}>
      <Title level={4} style={{ margin: 0 }}>对话记录控制</Title>

      {!config.enabled && (
        <Alert
          message="此功能必须开启才能使用应用"
          type="warning"
          showIcon
          style={{ marginBottom: 8 }}
        />
      )}

      <Card size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text strong>启用记录</Text>
              {config.enabled ? (
                <Tag icon={<PlayCircleOutlined />} color="success">运行中</Tag>
              ) : (
                <Tag icon={<PauseCircleOutlined />} color="default">未开启</Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {config.enabled ? '正在记录所有对话' : '开启后自动记录所有 Claude Code 对话'}
            </Text>
          </div>
          <Switch
            checked={config.enabled}
            onChange={handleToggle}
            checkedChildren="开"
            unCheckedChildren="关"
          />
        </div>
      </Card>

      {config.savePath && (
        <Card size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: 12 }}>
              <div style={{ marginBottom: 4 }}>
                <Text strong>保存路径</Text>
              </div>
              <Text
                code
                style={{
                  fontSize: 12,
                  wordBreak: 'break-all',
                  display: 'block'
                }}
              >
                {config.savePath}
              </Text>
            </div>
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={handleChangePath}
            >
              更改
            </Button>
          </div>
        </Card>
      )}

      {config.savePath && (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleClearCache}
          block
        >
          清除缓存
        </Button>
      )}
    </Space>
  )
})

RecordControl.displayName = 'RecordControl'

export default RecordControl
