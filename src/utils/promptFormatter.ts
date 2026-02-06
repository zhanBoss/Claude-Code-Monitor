/**
 * Prompt 格式化工具
 * 处理 pastedContents 的替换和格式化
 */

/**
 * 检测内容是否为 JSON
 */
const isJSON = (str: string): boolean => {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * 格式化内容
 * - JSON 自动格式化
 * - 其他内容保持原样
 */
export const formatContent = (content: string): string => {
  if (isJSON(content)) {
    try {
      return JSON.stringify(JSON.parse(content), null, 2)
    } catch {
      return content
    }
  }
  return content
}

/**
 * 替换 prompt 中的 pastedContents 占位符
 * 例如：[Pasted text #1 +19 lines] -> 实际内容
 */
export const replacePastedContents = (
  prompt: string,
  pastedContents: Record<string, any>
): string => {
  if (!pastedContents || Object.keys(pastedContents).length === 0) {
    return prompt
  }

  let result = prompt

  // 匹配占位符：[Pasted text #N +X lines] 或 [Pasted text #N]
  const regex = /\[Pasted text #(\d+)(?:\s+\+\d+\s+lines)?\]/g

  result = result.replace(regex, (match, index) => {
    // 尝试两种 key 格式：完整格式和数字格式
    const fullKey = `Pasted text #${index}`
    const numberKey = index
    const value = pastedContents[fullKey] || pastedContents[numberKey]

    if (value !== undefined) {
      // 如果是对象且包含 content 字段（已展开的粘贴内容），提取 content
      let contentStr: string
      if (value && typeof value === 'object' && 'content' in value) {
        contentStr = value.content
      } else {
        contentStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      }

      return `\n\n--- ${fullKey} ---\n${formatContent(contentStr)}\n--- End ---\n\n`
    }

    return match // 如果找不到对应内容，保持原样
  })

  return result
}

/**
 * 检查文本是否超过指定行数
 */
export const isTextOverflowing = (text: string, maxLines: number): boolean => {
  const lines = text.split('\n')
  return lines.length > maxLines
}

/**
 * 格式化 pastedContents 用于弹窗显示
 */
export const formatPastedContentsForModal = (
  pastedContents: Record<string, any>
): Array<{ key: string; content: string }> => {
  return Object.entries(pastedContents).map(([key, value]) => {
    // 规范化 key：如果是纯数字，转换为 "Pasted text #N" 格式
    const displayKey = /^\d+$/.test(key) ? `Pasted text #${key}` : key

    // 如果 value 是对象且包含 content 字段（已展开的粘贴内容），提取 content
    if (value && typeof value === 'object' && 'content' in value) {
      return {
        key: displayKey,
        content: formatContent(value.content)
      }
    }
    // 否则直接使用 value（可能是字符串或其他格式）
    const contentStr = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
    return {
      key: displayKey,
      content: formatContent(contentStr)
    }
  })
}
