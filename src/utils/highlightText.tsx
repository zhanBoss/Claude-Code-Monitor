import React from 'react'

/**
 * 关键词高亮工具
 * 在文本中查找关键词并高亮标记，支持不区分大小写匹配
 *
 * 高亮风格与项目中 react-highlight-words (Highlighter) 保持一致：
 * 主题色实底背景 + 白色文字 + 圆角
 */
export const highlightText = (
  text: string,
  keyword: string,
  primaryColor: string,
  _darkMode?: boolean
): React.ReactNode => {
  if (!keyword.trim()) return text

  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()

  /* 查找所有匹配位置 */
  const fragments: React.ReactNode[] = []
  let lastIdx = 0
  let searchFrom = 0

  while (searchFrom < lowerText.length) {
    const idx = lowerText.indexOf(lowerKeyword, searchFrom)
    if (idx === -1) break

    /* 匹配前的普通文本 */
    if (idx > lastIdx) {
      fragments.push(text.slice(lastIdx, idx))
    }

    /* 高亮部分 — 与 Highlighter 组件风格统一 */
    fragments.push(
      <span
        key={idx}
        style={{
          backgroundColor: primaryColor,
          color: '#fff',
          padding: '0 2px',
          borderRadius: 2
        }}
      >
        {text.slice(idx, idx + keyword.length)}
      </span>
    )

    lastIdx = idx + keyword.length
    searchFrom = lastIdx
  }

  /* 无匹配 */
  if (fragments.length === 0) return text

  /* 追加剩余文本 */
  if (lastIdx < text.length) {
    fragments.push(text.slice(lastIdx))
  }

  return <>{fragments}</>
}
