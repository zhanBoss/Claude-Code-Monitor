# Electron Modal 开发规范

## 核心规则

**本项目禁止直接使用 Ant Design 的 `<Modal>` 组件。**

在 Electron 环境下，必须使用封装好的 `ElectronModal` 组件或 `getElectronModalConfig()` 函数。

## 为什么？

Electron 窗口使用 `WebkitAppRegion: 'drag'` 实现拖拽，会导致 Modal 的点击事件失效。ElectronModal 已经处理好了这个问题。

---

## 使用方法

### 1. Modal 组件形式

```tsx
// ✅ 正确
import ElectronModal from './ElectronModal'

<ElectronModal
  title="标题"
  open={visible}
  onCancel={onClose}
>
  内容
</ElectronModal>

// ❌ 错误 - 不要用 Modal
import { Modal } from 'antd'
<Modal title="标题">内容</Modal>
```

### 2. Modal 静态方法（confirm/error/warning/info）

```tsx
// ✅ 正确
import { Modal } from 'antd'
import { getElectronModalConfig } from './ElectronModal'

Modal.confirm({
  title: '确认',
  content: '内容',
  onOk: handleOk,
  ...getElectronModalConfig()  // 必须加这一行
})

// ❌ 错误 - 忘记配置
Modal.confirm({
  title: '确认',
  content: '内容',
  onOk: handleOk
  // 缺少 getElectronModalConfig()
})
```

---

## 导入方式

```tsx
// 只用组件
import ElectronModal from './ElectronModal'

// 只用静态方法配置
import { getElectronModalConfig } from './ElectronModal'

// 两个都用
import ElectronModal, { getElectronModalConfig } from './ElectronModal'
```

---

## 注意事项

1. **组件位置：** `/src/components/ElectronModal.tsx`
2. **完全兼容：** 所有 Modal 的 props 都可以直接用
3. **必须遵守：** 不遵守会导致 Modal 无法点击关闭

---

## 检查清单

写代码时记得检查：

- [ ] 用了 `ElectronModal` 而不是 `Modal`（组件形式）
- [ ] 加了 `...getElectronModalConfig()`（静态方法）
- [ ] 正确导入了组件/函数
- [ ] 测试点击关闭按钮是否正常

---

**记住：看到 Modal 就用 ElectronModal！**
