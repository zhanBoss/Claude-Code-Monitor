# @ Mention Input — API 参考

## MentionInput 组件

### Props

| Prop | 类型 | 必须 | 说明 |
|------|------|------|------|
| `darkMode` | `boolean` | 是 | 暗色模式 |
| `placeholder` | `string` | 否 | 输入框占位文本 |
| `disabled` | `boolean` | 否 | 禁用状态 |
| `mentionPopupVisible` | `boolean` | 否 | 弹窗是否可见（影响 Enter 键行为） |
| `onSend` | `() => void` | 否 | Enter 发送回调 |
| `onChange` | `(textLength: number) => void` | 否 | 文本长度变化回调 |
| `onMentionTrigger` | `(searchText: string) => void` | 否 | @ 触发回调（打开弹窗） |
| `onMentionSearchChange` | `(searchText: string) => void` | 否 | @ 后搜索文本变化回调 |
| `onMentionDismiss` | `() => void` | 否 | @ 状态关闭回调（关闭弹窗） |
| `onFocus` | `() => void` | 否 | 输入框聚焦回调 |
| `onBlur` | `() => void` | 否 | 输入框失焦回调 |

### Ref 方法 (MentionInputRef)

| 方法 | 签名 | 说明 |
|------|------|------|
| `focus` | `() => void` | 聚焦输入框 |
| `insertMention` | `(mention: MentionItem) => void` | 在 @ 位置插入引用标签 |
| `dismissMention` | `() => void` | 外部关闭 @ 状态（不触发 callback） |
| `getContent` | `() => { text: string; mentions: MentionItem[] }` | 提取纯文本 + 引用列表 |
| `clear` | `() => void` | 清空所有内容 |
| `getTextLength` | `() => number` | 获取文本字数 |
| `setTextContent` | `(text: string) => void` | 设置纯文本（替换全部） |
| `appendText` | `(text: string) => void` | 追加文本到末尾 |

### MentionItem 数据结构

```typescript
interface MentionItem {
  id: string        // 唯一标识
  label: string     // 标签上显示的文字
  content: string   // 引用的完整内容
  type: string      // 来源分类（如 'prompt' | 'realtime' | 'history'）
}
```

### 内部状态机

```
[空闲] --输入@--> [mention激活] --输入文字--> [搜索中]
                       |                        |
                  ESC/Backspace@            空格/无匹配超时
                       |                        |
                       v                        v
                    [空闲]                   [空闲]
                       ^                        
                       |
                  选中item (insertMention)
```

### IME 生命周期

```
compositionstart → composingRef = true → 暂停搜索
                                          ↓
用户选字 → compositionend → composingRef = false → 触发搜索
```

---

## MentionPopup 组件

### Props

| Prop | 类型 | 必须 | 说明 |
|------|------|------|------|
| `visible` | `boolean` | 是 | 是否显示 |
| `darkMode` | `boolean` | 是 | 暗色模式 |
| `searchText` | `string` | 是 | 当前搜索文本 |
| `activeTab` | `string` | 是 | 当前激活的 Tab key |
| `tabs` | `MentionPopupTab[]` | 是 | Tab 配置（含已过滤数据） |
| `hasAnyResults` | `boolean` | 是 | 所有 tab 是否有任何匹配 |
| `isCompact` | `boolean` | 否 | 紧凑模式 |
| `style` | `CSSProperties` | 否 | 容器 style 覆盖 |
| `onTabChange` | `(tab: string) => void` | 是 | Tab 切换 |
| `onSelect` | `(item: MentionItem) => void` | 是 | 选中 item |
| `onDismiss` | `() => void` | 是 | 关闭弹窗 |

### MentionPopupTab 数据结构

```typescript
interface MentionPopupTab {
  key: string                    // Tab 唯一标识
  label: string                  // Tab 显示文字
  icon: React.ReactNode          // Tab 图标
  items: MentionPopupItem[]      // 已过滤的列表数据
  loading?: boolean              // 是否加载中
  emptyIcon?: React.ReactNode    // 无数据时的图标
  emptyTitle?: string            // 无数据时的标题
  emptyDescription?: string      // 无数据时的描述
}

interface MentionPopupItem {
  key: string                    // 列表项唯一 key
  title: string                  // 主标题
  content: string                // 内容摘要
  extra?: React.ReactNode        // 右侧额外信息
  mentionData: MentionItem       // 选中时传回的数据
}
```

### 渲染逻辑优先级

```
tab.loading === true         → Spin 加载状态
items.length === 0 && 无搜索  → emptyIcon + emptyTitle + emptyDescription
items.length === 0 && 有搜索  → "未找到匹配的内容"
items.length > 0             → 列表渲染
!hasAnyResults && 有搜索      → 底部 "即将作为普通文本处理" 提示
```

---

## 宿主页面集成模板

```tsx
// 1. 状态
const mentionInputRef = useRef<MentionInputRef>(null)
const [mentionPopupVisible, setMentionPopupVisible] = useState(false)
const [mentionSourceTab, setMentionSourceTab] = useState('tab1')
const [mentionSearchText, setMentionSearchText] = useState('')
const noMatchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

// 2. 数据过滤
const filteredItems = useMemo(() => {
  if (!mentionSearchText.trim()) return allItems
  return allItems.filter(item =>
    item.label.toLowerCase().includes(mentionSearchText.toLowerCase())
  )
}, [allItems, mentionSearchText])

// 3. 延迟关闭逻辑
const clearNoMatchTimer = useCallback(() => {
  if (noMatchTimerRef.current) {
    clearTimeout(noMatchTimerRef.current)
    noMatchTimerRef.current = null
  }
}, [])

const handleMentionSearchChange = useCallback((searchText: string) => {
  setMentionSearchText(searchText)
  clearNoMatchTimer()

  if (searchText.trim() && /* 所有数据源无匹配 */) {
    noMatchTimerRef.current = setTimeout(() => {
      mentionInputRef.current?.dismissMention()
      setMentionPopupVisible(false)
      setMentionSearchText('')
    }, 1500)
    setMentionPopupVisible(true) // 保持可见显示提示
    return
  }
  setMentionPopupVisible(true)
}, [/* deps */])

// 4. 清理
useEffect(() => () => { clearNoMatchTimer() }, [])

// 5. JSX
<MentionInput
  ref={mentionInputRef}
  mentionPopupVisible={mentionPopupVisible}
  onMentionTrigger={handleMentionTrigger}
  onMentionSearchChange={handleMentionSearchChange}
  onMentionDismiss={handleMentionDismiss}
  // ...
/>
<MentionPopup
  visible={mentionPopupVisible}
  searchText={mentionSearchText}
  activeTab={mentionSourceTab}
  tabs={popupTabs}
  hasAnyResults={hasAnyResults}
  onSelect={handleMentionSelect}
  onDismiss={handleMentionDismiss}
  // ...
/>
```

---

## mention-tag CSS 完整样式

```css
.mention-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  margin: 0 2px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  cursor: default;
  user-select: none;
  vertical-align: baseline;
  font-weight: 500;
  white-space: nowrap;
}

/* 亮色主题 */
.mention-tag {
  background: rgba(主题色, 0.08);
  color: 主题色;
  border: 1px solid rgba(主题色, 0.2);
}
.mention-tag:hover {
  background: rgba(主题色, 0.15);
}

/* 暗色主题 */
.dark .mention-tag {
  background: rgba(主题色, 0.15);
  color: 主题色-亮;
  border: 1px solid rgba(主题色, 0.3);
}
.dark .mention-tag:hover {
  background: rgba(主题色, 0.25);
}
```

将 `主题色` 替换为项目实际主题色（如 `#D97757`）。
