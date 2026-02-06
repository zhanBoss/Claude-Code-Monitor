---
name: mention-input
description: Implement @ mention input with inline tags, popup selection, IME composition support, and auto-dismiss. Use when building chat inputs, comment boxes, or any text input that needs @ mention/reference functionality.
---

# @ Mention Input 实现指南

## 概述

本 Skill 描述如何从 0 到 1 实现一个支持 `@` 引用的富文本输入框。核心组件拆分为三部分：

| 组件 | 职责 | 文件示例 |
|------|------|----------|
| **MentionInput** | contenteditable 输入框 + @ 检测 + 标签插入 | `MentionInput.tsx` |
| **MentionPopup** | 弹窗 UI + Tab 切换 + 列表渲染 | `MentionPopup.tsx` |
| **宿主页面** | 数据获取 + 过滤 + 状态管理 + 关闭策略 | `ChatView.tsx` |

## 从 0 到 1 的实现步骤

### Step 1: MentionInput — contenteditable 输入框

**为什么用 contenteditable 而非 textarea？**
textarea 只能输入纯文本。@ 标签需要 inline 富文本（带样式的 `<span>`），只有 contenteditable 能做到。

**核心 API 设计：**

```typescript
interface MentionInputRef {
  focus: () => void
  insertMention: (mention: MentionItem) => void   // 插入 @ 标签
  dismissMention: () => void                       // 外部关闭 @ 状态
  getContent: () => { text: string; mentions: MentionItem[] }
  clear: () => void
  setTextContent: (text: string) => void
  appendText: (text: string) => void
}

interface MentionItem {
  id: string
  label: string      // 标签显示文字
  content: string    // 实际引用内容
  type: string       // 来源分类
}
```

**关键实现点：**

1. **@ 检测** — 在 `onInput` 中检测光标前是否有 `@`：
   - 读取 `window.getSelection()` 获取光标位置
   - 检查光标前一个字符是否为 `@`
   - 记录 `@` 所在的 TextNode 和 offset（后续插入标签时需要替换）

2. **标签插入** — `insertMention` 方法：
   - 创建 `<span class="mention-tag" contentEditable="false">` 元素
   - 用 `data-*` 属性存储 mention 元数据（id、type、content、label）
   - 拆分文本节点：`@前文本` + `<span>标签</span>` + `\u00A0` + `光标后文本`
   - 用 `Range` API 设置光标到标签后

3. **内容提取** — `getContent` 方法：
   - 遍历 contenteditable 的 childNodes
   - TextNode → 纯文本
   - `.mention-tag` → 提取 data 属性重建 MentionItem
   - BR/DIV/P → 换行符

4. **Backspace 处理** — 标签需要整体删除：
   - 光标在文本节点开头 → 检查 `previousSibling` 是否是 `.mention-tag`
   - 是 → `preventDefault()` + `remove()` 整个标签

### Step 2: IME 中文输入法保护

**这是最容易被忽略的关键点。** 不处理 IME 会导致中文用户无法正常使用。

```typescript
const composingRef = useRef(false)

// compositionstart → 标记组合中，暂停搜索
// compositionend → 组合结束，用最终文字触发搜索
```

在 `handleInput` 中：
- `composingRef.current === true` → **跳过** `onMentionSearchChange` 调用
- 拼音中间态（如 `wo`、`ni`）不会触发搜索和自动关闭

### Step 3: MentionPopup — 解耦的弹窗组件

弹窗应该是纯展示组件，通过 props 接收一切数据：

```typescript
interface MentionPopupProps {
  visible: boolean
  darkMode: boolean
  searchText: string
  activeTab: string
  tabs: MentionPopupTab[]       // Tab 配置 + 已过滤的数据
  hasAnyResults: boolean         // 是否有任何匹配
  onTabChange: (tab: string) => void
  onSelect: (item: MentionItem) => void
  onDismiss: () => void
}
```

**关键点：**
- `onMouseDown={(e) => e.preventDefault()}` — 防止点击弹窗时输入框失焦
- 数据过滤在宿主页面完成，弹窗只负责渲染

### Step 4: 三层自动关闭策略

这是交互体验的核心。自动关闭需要三层递进机制：

| 层级 | 触发条件 | 响应时间 | 说明 |
|------|----------|----------|------|
| **空格关闭** | 搜索文本以空格结尾 | 立即 | 明确的 "不想引用" 信号 |
| **延迟关闭** | 所有数据源无匹配 | 1.5s | 给 IME 和慢速输入留缓冲 |
| **手动关闭** | ESC / 点击关闭按钮 | 立即 | 用户主动取消 |

**延迟关闭实现：**

```typescript
const noMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// 无匹配时：启动 1.5s 定时器，弹窗保持可见显示提示
// 有匹配时：清除定时器
// 定时器触发：dismissMention() + 关闭弹窗
```

**空格关闭实现（在 MentionInput 的 handleInput 中）：**

```typescript
const searchText = getMentionSearchText()
if (searchText.endsWith(' ') || searchText.endsWith('\u00A0')) {
  mentionActiveRef.current = false
  mentionAtNodeRef.current = null
  onMentionDismiss?.()
  return
}
```

### Step 5: Enter 键智能处理

MentionInput 需要感知弹窗可见性（通过 `mentionPopupVisible` prop）：

- **弹窗可见** → Enter 被阻止（用户可能在浏览列表）
- **弹窗已隐藏**（无匹配自动关闭后） → 终止 @ 状态 + 正常发送

### Step 6: mention-tag CSS 样式

```css
.mention-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  margin: 0 2px;
  border-radius: 4px;
  background: rgba(主题色, 0.08~0.15);
  color: 主题色;
  font-size: 13px;
  line-height: 1.6;
  cursor: default;
  user-select: none;
  vertical-align: baseline;
  border: 1px solid rgba(主题色, 0.2~0.3);
  font-weight: 500;
  white-space: nowrap;
}
```

关键属性：
- `contentEditable: false` — 标签不可编辑
- `user-select: none` — 不可选中
- `vertical-align: baseline` — 与文字对齐

## 宿主页面集成清单

```
Task Progress:
- [ ] 引入 MentionInput + MentionPopup
- [ ] 创建 mentionInputRef
- [ ] 管理状态：popupVisible、sourceTab、searchText
- [ ] 准备数据源并用 useMemo 过滤
- [ ] 构建 MentionPopupTab[] 数组
- [ ] 计算 hasAnyResults
- [ ] 实现 handleMentionTrigger（打开弹窗）
- [ ] 实现 handleMentionSearchChange（延迟关闭逻辑）
- [ ] 实现 handleMentionDismiss / handleMentionSelect
- [ ] 清理定时器（组件卸载 / 关闭 / 选择时）
- [ ] 注入 mention-tag CSS（全局或 styled-components）
- [ ] 发送消息时从 getContent() 提取文本和引用列表
```

## 常见陷阱

1. **忘记 IME 处理** → 中文用户打拼音直接触发关闭
2. **弹窗点击导致失焦** → 必须 `onMouseDown={e => e.preventDefault()}`
3. **Backspace 删标签** → 不处理会删除标签内的单个字符（乱码）
4. **contenteditable 粘贴** → 必须拦截 paste 事件，只插入纯文本
5. **标签后无空格** → 光标无法定位到标签后面，用 `\u00A0` 解决
6. **光标位置丢失** → 插入标签后必须用 Range API 手动设置光标

## 参考实现

本项目的完整实现：
- `src/components/MentionInput.tsx` — 输入框核心组件
- `src/components/MentionPopup.tsx` — 弹窗 UI 组件
- `src/components/ChatView.tsx` — 集成示例（搜索、关闭策略、数据管理）

更详细的 API 文档见 [reference.md](reference.md)。
