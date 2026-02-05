import { useState, useEffect } from 'react'
import { Card, Button, List, Space, Input, Form, message, Typography, Empty, Popconfirm, Tooltip, Tag } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  StarOutlined,
  PushpinOutlined,
  PushpinFilled,
  FileTextOutlined
} from '@ant-design/icons'
import { CommonCommand } from '../types'
import { getThemeVars } from '../theme'
import ConfigFileEditor from './ConfigFileEditor'
import ElectronModal from './ElectronModal'

const { TextArea } = Input
const { Text, Title } = Typography

interface CommonPromptsProps {
  darkMode: boolean
}

const CommonPrompts = ({ darkMode }: CommonPromptsProps) => {
  const [commands, setCommands] = useState<CommonCommand[]>([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCommand, setEditingCommand] = useState<CommonCommand | null>(null)
  const [configEditorVisible, setConfigEditorVisible] = useState(false)
  const [configFilePath, setConfigFilePath] = useState('')
  const [form] = Form.useForm()
  const themeVars = getThemeVars(darkMode)

  useEffect(() => {
    loadCommands()
  }, [])

  const loadCommands = async () => {
    setLoading(true)
    try {
      const cmds = await window.electronAPI.getCommonCommands()
      setCommands(cmds)
    } catch (error: any) {
      message.error(`加载常用Prompt失败: ${error?.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingCommand(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (command: CommonCommand) => {
    setEditingCommand(command)
    form.setFieldsValue({
      name: command.name,
      content: command.content
    })
    setModalVisible(true)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()

      if (editingCommand) {
        const result = await window.electronAPI.updateCommonCommand(
          editingCommand.id,
          values.name,
          values.content
        )

        if (result.success) {
          message.success('更新成功')
          loadCommands()
          setModalVisible(false)
        } else {
          message.error(`更新失败: ${result.error}`)
        }
      } else {
        const result = await window.electronAPI.addCommonCommand(
          values.name,
          values.content
        )

        if (result.success) {
          message.success('添加成功')
          loadCommands()
          setModalVisible(false)
        } else {
          message.error(`添加失败: ${result.error}`)
        }
      }
    } catch (error: any) {
      console.error('表单验证失败:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await window.electronAPI.deleteCommonCommand(id)

      if (result.success) {
        message.success('删除成功')
        loadCommands()
      } else {
        message.error(`删除失败: ${result.error}`)
      }
    } catch (error: any) {
      message.error(`删除失败: ${error?.message || '未知错误'}`)
    }
  }

  const handleUse = async (content: string) => {
    try {
      await window.electronAPI.copyToClipboard(content)
      message.success('已复制到剪贴板，可以直接粘贴到对话框中使用')
    } catch (error) {
      message.error('复制失败')
    }
  }

  const handleTogglePin = async (id: string) => {
    try {
      const result = await window.electronAPI.togglePinCommand(id)

      if (result.success) {
        loadCommands()
        message.success('操作成功')
      } else {
        message.error(`操作失败: ${result.error}`)
      }
    } catch (error: any) {
      message.error(`操作失败: ${error?.message || '未知错误'}`)
    }
  }

  const sortedCommands = [...commands].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.updatedAt - a.updatedAt
  })

  const handleOpenFile = async () => {
    try {
      const path = await window.electronAPI.getConfigPath()
      setConfigFilePath(path)
      setConfigEditorVisible(true)
    } catch (error: any) {
      message.error(`打开文件失败: ${error?.message || '未知错误'}`)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: themeVars.bgContainer
      }}>
        {/* 页面标题 */}
      <div style={{
        padding: '24px 24px 16px',
        borderBottom: `1px solid ${themeVars.border}`,
        background: themeVars.bgContainer,
        WebkitAppRegion: 'drag'
      } as React.CSSProperties}>
        <Space align="center" size="middle">
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: themeVars.primaryGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${themeVars.primaryShadow}`
          }}>
            <StarOutlined style={{ fontSize: 24, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontSize: 20 }}>
              常用Prompt
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              保存常用的对话提示词，一键复制使用
            </Text>
          </div>
        </Space>
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, padding: '16px 24px', overflow: 'auto' }}>
        <Card
          extra={
            <Space size="small" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
              <Button
                icon={<FileTextOutlined />}
                onClick={handleOpenFile}
                size="middle"
              >
                打开配置文件
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAdd}
                size="middle"
              >
                新增Prompt
              </Button>
            </Space>
          }
          styles={{
            header: { WebkitAppRegion: 'drag' } as React.CSSProperties,
            body: { padding: '16px' }
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <Text type="secondary">加载中...</Text>
            </div>
          ) : commands.length === 0 ? (
            <Empty
              description="暂无常用Prompt"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '60px 0' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                添加第一个Prompt
              </Button>
            </Empty>
          ) : (
            <List
              dataSource={sortedCommands}
              renderItem={(command) => (
                <List.Item
                  style={{
                    padding: '12px 0',
                    borderBottom: `1px solid ${themeVars.borderSecondary}`
                  }}
                  actions={[
                    <Tooltip key="use" title="使用">
                      <Button
                        type="text"
                        size="small"
                        icon={<SendOutlined style={{ color: themeVars.primary, fontSize: 16 }} />}
                        onClick={() => handleUse(command.content)}
                      />
                    </Tooltip>,
                    <Tooltip key="pin" title={command.pinned ? '取消置顶' : '置顶'}>
                      <Button
                        type="text"
                        size="small"
                        icon={command.pinned ? <PushpinFilled style={{ color: themeVars.primary }} /> : <PushpinOutlined />}
                        onClick={() => handleTogglePin(command.id)}
                      />
                    </Tooltip>,
                    <Tooltip key="edit" title="编辑">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(command)}
                      />
                    </Tooltip>,
                    <Popconfirm
                      key="delete"
                      title="确定删除这个Prompt吗?"
                      onConfirm={() => handleDelete(command.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Tooltip title="删除">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size="small">
                        <Text strong style={{ fontSize: 14 }}>
                          {command.name}
                        </Text>
                        {command.pinned && (
                          <Tag icon={<PushpinFilled />} color="gold" style={{ fontSize: 11, padding: '0 4px' }}>
                            置顶
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div
                        style={{
                          fontSize: 12,
                          color: themeVars.textSecondary,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          lineHeight: 1.5,
                          marginTop: 4
                        }}
                      >
                        {command.content}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>

      {/* 新增/编辑弹窗 */}
      <ElectronModal
        title={editingCommand ? '编辑Prompt' : '新增Prompt'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={700}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="name"
            label="Prompt名称"
            rules={[
              { required: true, message: '请输入Prompt名称' },
              { max: 50, message: 'Prompt名称不能超过50个字符' }
            ]}
          >
            <Input placeholder="例如: 代码审查、生成注释、优化性能..." />
          </Form.Item>

          <Form.Item
            name="content"
            label="Prompt内容"
            rules={[
              { required: true, message: '请输入Prompt内容' },
              { max: 2000, message: 'Prompt内容不能超过2000个字符' }
            ]}
          >
            <TextArea
              rows={10}
              placeholder="请输入Prompt内容，例如：请帮我审查这段代码，找出潜在的问题..."
              showCount
              maxLength={2000}
            />
          </Form.Item>
        </Form>
      </ElectronModal>

      {/* 配置文件编辑器 */}
      <ConfigFileEditor
        title="编辑应用配置文件"
        filePath={configFilePath}
        darkMode={darkMode}
        visible={configEditorVisible}
        onClose={() => {
          setConfigEditorVisible(false)
        }}
        onLoad={async () => {
          const content = await window.electronAPI.readAppConfigFile()
          return content
        }}
        onSave={async (content: string) => {
          await window.electronAPI.saveAppConfigFile(content)
          message.success('保存成功')
          loadCommands()
        }}
        onOpenFolder={async () => {
          await window.electronAPI.showConfigInFolder()
        }}
      />
    </>
  )
}

export default CommonPrompts
