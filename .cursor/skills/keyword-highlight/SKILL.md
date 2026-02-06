---
name: keyword-highlight
description: Unified keyword highlight style for search results across the project. Use when implementing search filtering, keyword matching, or displaying filtered list items with highlight. Ensures all search result highlights use the same visual style.
---

# 关键词高亮规范

## 核心原则

项目中所有搜索结果的关键词高亮**必须**使用统一的视觉风格。有两种实现方式，效果完全一致：

| 方式 | 适用场景 |
|------|----------|
| `react-highlight-words` (`Highlighter`) | 已有组件直接使用 |
| `highlightText()` 公共函数 | 自定义列表、无法直接用 Highlighter 的场景 |

两种方式的高亮样式**必须一致**。

## 统一高亮样式

```tsx
{
  backgroundColor: themeVars.primary,   // 主题色实底背景
  color: '#fff',                        // 白色文字
  padding: '0 2px',                     // 水平内边距
  borderRadius: 2                       // 圆角
}
```

**不区分亮色/暗色模式** — 统一使用 `themeVars.primary` 实底背景 + 白色文字。

## 方式一：react-highlight-words

```tsx
import Highlighter from 'react-highlight-words'

<Highlighter
  searchWords={[keyword]}
  autoEscape
  textToHighlight={text}
  highlightStyle={{
    backgroundColor: themeVars.primary,
    color: '#fff',
    padding: '0 2px',
    borderRadius: 2
  }}
/>
```

已用于：`CommonPrompts.tsx`、`HistoryViewer.tsx`、`LogViewer.tsx`

## 方式二：highlightText 工具函数

位置：`src/utils/highlightText.tsx`

```tsx
import { highlightText } from '../utils/highlightText'

highlightText(text, keyword, themeVars.primary)
```

已用于：`MentionPopup.tsx`、`ChatView.tsx` 的 `renderPickerItem`

### 使用示例

```tsx
// 有搜索关键词时高亮，无关键词时显示原文
{keyword
  ? highlightText(item.title, keyword, themeVars.primary)
  : item.title
}

// 直接传入，函数内部处理空字符串
{highlightText(item.content, searchText, themeVars.primary)}
```

## 功能特性

- 不区分大小写匹配
- 支持多处匹配（同一文本中所有出现位置全部高亮）
- 空关键词直接返回原文（无性能损耗）
- 返回 `React.ReactNode`，可直接用于 JSX

## 新增搜索场景时的检查清单

```
- [ ] 优先使用 Highlighter 组件，不适用时使用 highlightText()
- [ ] 高亮样式必须是：primary 实底背景 + 白色文字 + 0 2px padding + 2px 圆角
- [ ] title 和 content 都需要高亮
- [ ] 禁止自定义不同的高亮颜色
```

## 禁止的做法

- 使用半透明背景 + 彩色文字的高亮风格（项目统一用实底白字）
- 在组件内用 `useCallback` / `useMemo` 自行实现高亮逻辑
- 使用蓝色、黄色等非主题色背景
- 使用 `dangerouslySetInnerHTML` 实现高亮
- 只高亮第一处匹配（必须高亮所有匹配位置）
