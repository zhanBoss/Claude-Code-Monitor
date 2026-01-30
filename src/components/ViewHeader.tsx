import { Button, Space, Segmented } from 'antd'
import {
  MenuOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  StarOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { getThemeVars } from '../theme'

interface ViewHeaderProps {
  currentView: 'realtime' | 'history'
  onViewChange: (view: 'realtime' | 'history') => void
  showDrawerButton?: boolean
  onOpenDrawer?: () => void
  darkMode: boolean

  // 实时对话特有的操作
  realtimeActions?: {
    onSummarize: () => void
    onClear: () => void
    summarizing?: boolean
    hasRecords?: boolean
  }

  // 历史记录特有的操作
  historyActions?: {
    onRefresh: () => void
    onExport: () => void
    loading?: boolean
    hasRecords?: boolean
  }
}

function ViewHeader({
  currentView,
  onViewChange,
  showDrawerButton = false,
  onOpenDrawer,
  darkMode,
  realtimeActions,
  historyActions
}: ViewHeaderProps) {
  const themeVars = getThemeVars(darkMode)

  return (
    <div style={{
      padding: '16px',
      borderBottom: `1px solid ${themeVars.borderSecondary}`,
      background: themeVars.bgSection,
      flexShrink: 0
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12
      }}>
        {/* 左侧：汉堡菜单 + 视图切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {showDrawerButton && (
            <Button
              icon={<MenuOutlined />}
              onClick={onOpenDrawer}
              size="small"
              className="drawer-trigger-btn"
            >
              配置
            </Button>
          )}
          <Segmented
            value={currentView}
            onChange={onViewChange}
            options={[
              {
                label: (
                  <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ThunderboltOutlined />
                    <span>实时对话</span>
                  </div>
                ),
                value: 'realtime'
              },
              {
                label: (
                  <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClockCircleOutlined />
                    <span>历史记录</span>
                  </div>
                ),
                value: 'history'
              }
            ]}
          />
        </div>

        {/* 右侧：根据当前视图显示不同的操作按钮 */}
        <Space wrap>
          {currentView === 'realtime' && realtimeActions && (
            <>
              <Button
                icon={<StarOutlined />}
                onClick={realtimeActions.onSummarize}
                size="small"
                loading={realtimeActions.summarizing}
                disabled={!realtimeActions.hasRecords}
                type="primary"
              >
                AI 总结
              </Button>
              <Button
                icon={<DeleteOutlined />}
                danger
                onClick={realtimeActions.onClear}
                size="small"
                disabled={!realtimeActions.hasRecords}
              >
                清空
              </Button>
            </>
          )}

          {currentView === 'history' && historyActions && (
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={historyActions.onRefresh}
                size="small"
                loading={historyActions.loading}
              >
                刷新
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={historyActions.onExport}
                size="small"
                disabled={!historyActions.hasRecords}
              >
                导出
              </Button>
            </>
          )}
        </Space>
      </div>
    </div>
  )
}

export default ViewHeader
