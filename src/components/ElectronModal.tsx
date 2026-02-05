import { Modal, ModalProps } from 'antd'
import { ReactNode } from 'react'

/**
 * Electron 环境下的 Modal 组件
 *
 * 自动处理 WebkitAppRegion 问题，避免 Modal 被窗口拖动区域影响
 * 使用方式与 Ant Design Modal 完全相同
 *
 * @example
 * <ElectronModal
 *   title="标题"
 *   open={visible}
 *   onCancel={handleClose}
 * >
 *   内容
 * </ElectronModal>
 */
export const ElectronModal = (props: ModalProps) => {
  const { style, styles, modalRender, title, children, ...restProps } = props

  // 合并用户自定义样式和必需的 no-drag 样式
  const mergedStyle = {
    WebkitAppRegion: 'no-drag',
    ...style
  } as React.CSSProperties

  // 合并各部分的样式
  const mergedStyles: any = {
    body: {
      WebkitAppRegion: 'no-drag',
      ...(styles as any)?.body
    } as React.CSSProperties,
    mask: {
      WebkitAppRegion: 'no-drag',
      ...(styles as any)?.mask
    } as React.CSSProperties,
    wrapper: {
      WebkitAppRegion: 'no-drag',
      ...(styles as any)?.wrapper
    } as React.CSSProperties,
    header: {
      WebkitAppRegion: 'no-drag',
      ...(styles as any)?.header
    } as React.CSSProperties,
    footer: {
      WebkitAppRegion: 'no-drag',
      ...(styles as any)?.footer
    } as React.CSSProperties
  }

  // 包装 title
  const wrappedTitle = title && (
    <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {title}
    </div>
  )

  // 包装 modalRender
  const wrappedModalRender = (modal: ReactNode) => {
    const userRendered = modalRender ? modalRender(modal) : modal
    return (
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {userRendered}
      </div>
    )
  }

  return (
    <Modal
      {...restProps}
      title={wrappedTitle}
      style={mergedStyle}
      styles={mergedStyles}
      modalRender={wrappedModalRender}
    >
      {children}
    </Modal>
  )
}

/**
 * 获取 Electron 环境下 Modal 静态方法的配置
 *
 * 用于 Modal.confirm、Modal.error 等静态方法
 *
 * @example
 * Modal.confirm({
 *   title: '确认删除',
 *   content: '确定要删除吗？',
 *   ...getElectronModalConfig(),
 *   onOk: handleDelete
 * })
 */
export const getElectronModalConfig = () => ({
  style: {
    WebkitAppRegion: 'no-drag'
  } as React.CSSProperties,
  modalRender: (modal: ReactNode) => (
    <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {modal}
    </div>
  )
})

export default ElectronModal
