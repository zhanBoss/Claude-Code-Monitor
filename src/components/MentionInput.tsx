import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { getThemeVars } from '../theme'

/* 引用项数据结构 */
export interface MentionItem {
  id: string
  label: string
  content: string
  type: 'prompt' | 'realtime' | 'history'
}

/* 对外暴露的方法 */
export interface MentionInputRef {
  focus: () => void
  insertMention: (mention: MentionItem) => void
  dismissMention: () => void
  getContent: () => { text: string; mentions: MentionItem[] }
  clear: () => void
  getTextLength: () => number
  setTextContent: (text: string) => void
  appendText: (text: string) => void
}

interface MentionInputProps {
  placeholder?: string
  disabled?: boolean
  darkMode: boolean
  /** 弹窗当前是否可见（用于决定 Enter 键行为） */
  mentionPopupVisible?: boolean
  onSend?: () => void
  onChange?: (textLength: number) => void
  onMentionTrigger?: (searchText: string) => void
  onMentionSearchChange?: (searchText: string) => void
  onMentionDismiss?: () => void
  onFocus?: () => void
  onBlur?: () => void
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>((props, ref) => {
  const {
    placeholder = '输入消息... (Shift+Enter 换行)',
    disabled = false,
    darkMode,
    mentionPopupVisible = false,
    onSend,
    onChange,
    onMentionTrigger,
    onMentionSearchChange,
    onMentionDismiss,
    onFocus,
    onBlur
  } = props

  const editorRef = useRef<HTMLDivElement>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(true)

  /* @ 触发状态 */
  const mentionActiveRef = useRef(false)
  const mentionAtNodeRef = useRef<Text | null>(null)
  const mentionAtOffsetRef = useRef(0)

  /* IME 中文输入法组合状态 */
  const composingRef = useRef(false)

  const themeVars = getThemeVars(darkMode)

  /* 检查编辑器是否为空 */
  const checkEmpty = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return true
    return (editor.textContent || '').trim().length === 0
  }, [])

  /* 获取文本长度 */
  const getTextLength = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return 0
    return (editor.textContent || '').replace(/\u00A0/g, ' ').trim().length
  }, [])

  /* 更新占位符可见性和字数 */
  const updateState = useCallback(() => {
    setShowPlaceholder(checkEmpty())
    onChange?.(getTextLength())
  }, [checkEmpty, getTextLength, onChange])

  /* 提取 @ 后的搜索文本（@ 到光标之间的文字） */
  const getMentionSearchText = useCallback(() => {
    if (!mentionActiveRef.current || !mentionAtNodeRef.current) return ''

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return ''

    const range = selection.getRangeAt(0)

    if (range.startContainer === mentionAtNodeRef.current) {
      const text = range.startContainer.textContent || ''
      return text.substring(mentionAtOffsetRef.current + 1, range.startOffset)
    }

    return ''
  }, [])

  /* 输入事件处理 */
  const handleInput = useCallback(() => {
    updateState()

    /* 如果正在 @ 搜索，更新搜索文本 */
    if (mentionActiveRef.current) {
      if (!mentionAtNodeRef.current || !mentionAtNodeRef.current.parentNode) {
        mentionActiveRef.current = false
        mentionAtNodeRef.current = null
        onMentionDismiss?.()
        return
      }

      /* 检查 @ 字符是否还在文本节点中 */
      const atNode = mentionAtNodeRef.current
      const atOffset = mentionAtOffsetRef.current
      const nodeText = atNode.textContent || ''
      if (atOffset >= nodeText.length || nodeText[atOffset] !== '@') {
        mentionActiveRef.current = false
        mentionAtNodeRef.current = null
        onMentionDismiss?.()
        return
      }

      /*
       * IME 组合输入保护：
       * 中文输入法打字时 composing = true，此时不触发搜索更新
       * 避免拼音字母（如 "wo"）被误判为无匹配而关闭弹窗
       * compositionend 事件中会补发一次搜索更新
       */
      if (composingRef.current) return

      const searchText = getMentionSearchText()

      /* 空格 = 用户不想引用，立即退出 @ 模式，文本保留为普通文本 */
      if (searchText.endsWith(' ') || searchText.endsWith('\u00A0')) {
        mentionActiveRef.current = false
        mentionAtNodeRef.current = null
        onMentionDismiss?.()
        return
      }

      onMentionSearchChange?.(searchText)
      return
    }

    /* IME 组合中不检测 @ 触发 */
    if (composingRef.current) return

    /* 检测 @ 触发 */
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const textNode = range.startContainer

    if (textNode.nodeType !== Node.TEXT_NODE) return

    const text = textNode.textContent || ''
    const cursorPos = range.startOffset

    if (cursorPos <= 0 || text[cursorPos - 1] !== '@') return

    /* 支持多个 @，每次输入 @ 都可以触发引用弹窗 */
    mentionActiveRef.current = true
    mentionAtNodeRef.current = textNode as Text
    mentionAtOffsetRef.current = cursorPos - 1
    onMentionTrigger?.('')
  }, [updateState, getMentionSearchText, onMentionTrigger, onMentionSearchChange, onMentionDismiss])

  /* IME 组合开始 */
  const handleCompositionStart = useCallback(() => {
    composingRef.current = true
  }, [])

  /* IME 组合结束（中文字符已确认） */
  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false

    /* 组合结束后，用最终的中文文本触发一次搜索更新 */
    if (mentionActiveRef.current && mentionAtNodeRef.current) {
      const searchText = getMentionSearchText()
      onMentionSearchChange?.(searchText)
    }

    /* 同时更新占位符和字数 */
    updateState()
  }, [getMentionSearchText, onMentionSearchChange, updateState])

  /* 键盘事件处理 */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    /* Enter 发送消息 */
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()

      if (mentionActiveRef.current) {
        /*
         * @ 激活状态下的 Enter 行为：
         * - 弹窗可见 → 阻止发送（用户可能在浏览列表）
         * - 弹窗已隐藏（无匹配结果已自动关闭）→ 终止 @ 搜索并正常发送
         */
        if (mentionPopupVisible) return

        /* 弹窗不可见，终止 @ 状态，允许发送 */
        mentionActiveRef.current = false
        mentionAtNodeRef.current = null
        onMentionDismiss?.()
      }

      onSend?.()
    }

    /* ESC 关闭 @ 弹窗 */
    if (e.key === 'Escape' && mentionActiveRef.current) {
      mentionActiveRef.current = false
      mentionAtNodeRef.current = null
      onMentionDismiss?.()
    }

    /* Backspace 处理引用标签删除 */
    if (e.key === 'Backspace') {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) return

      const range = selection.getRangeAt(0)
      if (!range.collapsed) return

      const { startContainer, startOffset } = range

      /* 光标在文本节点开头，检查前一个兄弟是否是引用标签 */
      if (startOffset === 0 && startContainer.nodeType === Node.TEXT_NODE) {
        const prev = startContainer.previousSibling
        if (prev instanceof HTMLElement && prev.classList.contains('mention-tag')) {
          e.preventDefault()
          prev.remove()
          updateState()
          return
        }
      }

      /* 光标在编辑器 div 内直接子节点之间 */
      if (startContainer === editorRef.current && startOffset > 0) {
        const prevChild = startContainer.childNodes[startOffset - 1]
        if (prevChild instanceof HTMLElement && prevChild.classList.contains('mention-tag')) {
          e.preventDefault()
          prevChild.remove()
          updateState()
          return
        }
      }

      /* 如果正在删除触发 @ 的字符，关闭弹窗 */
      if (mentionActiveRef.current && mentionAtNodeRef.current) {
        if (startContainer === mentionAtNodeRef.current && startOffset === mentionAtOffsetRef.current + 1) {
          mentionActiveRef.current = false
          mentionAtNodeRef.current = null
          onMentionDismiss?.()
        }
      }
    }
  }, [onSend, onMentionDismiss, updateState, mentionPopupVisible])

  /* 创建引用标签 DOM 元素 */
  const createMentionElement = useCallback((mention: MentionItem) => {
    const el = document.createElement('span')
    el.className = 'mention-tag'
    el.contentEditable = 'false'
    el.setAttribute('data-mention-id', mention.id)
    el.setAttribute('data-mention-type', mention.type)
    el.setAttribute('data-mention-content', mention.content)
    el.setAttribute('data-mention-label', mention.label)
    el.textContent = `@${mention.label}`
    return el
  }, [])

  /* 插入引用标签 */
  const insertMention = useCallback((mention: MentionItem) => {
    const editor = editorRef.current
    if (!editor) return

    /* 如果没有活跃的 @ 触发，追加到末尾 */
    if (!mentionActiveRef.current || !mentionAtNodeRef.current) {
      const mentionEl = createMentionElement(mention)
      editor.appendChild(mentionEl)
      editor.appendChild(document.createTextNode('\u00A0'))

      const sel = window.getSelection()
      if (sel) {
        sel.selectAllChildren(editor)
        sel.collapseToEnd()
      }

      mentionActiveRef.current = false
      onMentionDismiss?.()
      updateState()
      editor.focus()
      return
    }

    const textNode = mentionAtNodeRef.current
    const atOffset = mentionAtOffsetRef.current

    /* 确定搜索文本的结束位置（光标当前位置） */
    const selection = window.getSelection()
    let endOffset = textNode.textContent?.length || 0
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (range.startContainer === textNode) {
        endOffset = range.startOffset
      }
    }

    const fullText = textNode.textContent || ''
    const beforeAt = fullText.substring(0, atOffset)
    const afterCursor = fullText.substring(endOffset)

    const parent = textNode.parentNode
    if (!parent) return

    const mentionEl = createMentionElement(mention)

    /* 重建 DOM：@ 前的文本 + 引用标签 + 空格 + 光标后的文本 */
    if (beforeAt) {
      parent.insertBefore(document.createTextNode(beforeAt), textNode)
    }
    parent.insertBefore(mentionEl, textNode)

    const afterNode = document.createTextNode('\u00A0' + afterCursor)
    parent.insertBefore(afterNode, textNode)
    parent.removeChild(textNode)

    /* 设置光标到引用标签后的空格之后 */
    const range = document.createRange()
    range.setStart(afterNode, 1)
    range.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)

    mentionActiveRef.current = false
    mentionAtNodeRef.current = null
    onMentionDismiss?.()
    updateState()
    editor.focus()
  }, [createMentionElement, onMentionDismiss, updateState])

  /* 获取编辑器内容（纯文本 + 引用列表） */
  const getContent = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return { text: '', mentions: [] as MentionItem[] }

    let text = ''
    const mentions: MentionItem[] = []

    const processNode = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += (node.textContent || '').replace(/\u00A0/g, ' ')
      } else if (node instanceof HTMLElement) {
        if (node.classList.contains('mention-tag')) {
          const label = node.getAttribute('data-mention-label') || ''
          text += `@${label}`
          mentions.push({
            id: node.getAttribute('data-mention-id') || '',
            label,
            content: node.getAttribute('data-mention-content') || '',
            type: (node.getAttribute('data-mention-type') || 'prompt') as MentionItem['type']
          })
        } else if (node.tagName === 'BR') {
          text += '\n'
        } else if (node.tagName === 'DIV' || node.tagName === 'P') {
          /* contenteditable 中 DIV/P 代表换行 */
          if (text && !text.endsWith('\n')) text += '\n'
          node.childNodes.forEach(processNode)
          return
        }
        node.childNodes.forEach(processNode)
      }
    }

    editor.childNodes.forEach(processNode)
    return { text: text.trim(), mentions }
  }, [])

  /* 清空内容 */
  const clear = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    editor.innerHTML = ''
    mentionActiveRef.current = false
    mentionAtNodeRef.current = null
    updateState()
  }, [updateState])

  /* 设置纯文本内容（清除已有内容） */
  const setTextContent = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.textContent = text
    updateState()

    const sel = window.getSelection()
    if (sel) {
      sel.selectAllChildren(editor)
      sel.collapseToEnd()
    }
  }, [updateState])

  /* 追加文本到末尾（保留已有内容和引用标签） */
  const appendText = useCallback((text: string) => {
    const editor = editorRef.current
    if (!editor) return

    const textNode = document.createTextNode(text)
    editor.appendChild(textNode)
    updateState()

    const sel = window.getSelection()
    if (sel) {
      sel.selectAllChildren(editor)
      sel.collapseToEnd()
    }
  }, [updateState])

  /* 外部主动关闭 @ 状态（搜索无结果时由父组件调用） */
  const dismissMention = useCallback(() => {
    mentionActiveRef.current = false
    mentionAtNodeRef.current = null
  }, [])

  /* 暴露方法给外部 */
  useImperativeHandle(ref, () => ({
    focus: () => editorRef.current?.focus(),
    insertMention,
    dismissMention,
    getContent,
    clear,
    getTextLength,
    setTextContent,
    appendText
  }), [insertMention, dismissMention, getContent, getTextLength, setTextContent, appendText])

  /* 粘贴处理（仅允许纯文本） */
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    updateState()
  }, [updateState])

  return (
    <div style={{ position: 'relative' }}>
      {/* 占位符 */}
      {showPlaceholder && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 16,
            color: themeVars.textTertiary,
            fontSize: 14,
            pointerEvents: 'none',
            userSelect: 'none',
            lineHeight: 1.7
          }}
        >
          {placeholder}
        </div>
      )}

      {/* 可编辑区域 */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          padding: '12px 16px 4px',
          fontSize: 14,
          lineHeight: 1.7,
          outline: 'none',
          minHeight: 24,
          maxHeight: 24 * 6,
          overflowY: 'auto',
          color: themeVars.text,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.5 : 1
        }}
      />
    </div>
  )
})

MentionInput.displayName = 'MentionInput'

export default MentionInput
