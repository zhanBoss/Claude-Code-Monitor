/**
 * 代码检测工具
 * 判断文本内容是否为代码
 */

/**
 * 代码特征模式
 */
const CODE_PATTERNS = [
  // 函数定义
  /\b(function|const|let|var|def|class|interface|type|enum)\s+\w+\s*[=({]/,
  // 箭头函数
  /=>\s*[{(]/,
  // 导入导出
  /\b(import|export|from|require)\s+/,
  // 控制流
  /\b(if|else|for|while|switch|case|break|continue|return)\s*[({]/,
  // 常见编程关键字组合
  /\b(async|await|try|catch|finally|throw|new)\s+/,
  // JSX/TSX
  /<[A-Z]\w+[\s/>]/,
  // 对象/数组字面量（多行）
  /{\s*\n[\s\S]*?:\s*[\s\S]*?\n[\s\S]*?}/,
  // 类型注解
  /:\s*(string|number|boolean|any|void|never|unknown|object)\b/,
  // 泛型
  /<[A-Z]\w*(?:,\s*[A-Z]\w*)*>/,
  // 注释
  /\/\*[\s\S]*?\*\/|\/\/.+|#.+$/m,
  // 分号结尾的语句（多行）
  /;\s*\n/,
  // 方法调用链
  /\.\w+\([^)]*\)\s*\.\w+/,
  // console/log 语句
  /\bconsole\.(log|error|warn|info)\s*\(/,
  // SQL 语句
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)\b/i,
  // HTML 标签
  /<[a-z][\s\S]*?>/i,
  // CSS 属性
  /[\w-]+:\s*[^;]+;/,
  // JSON 结构（严格）
  /^[\s\n]*[\[{][\s\S]*?[\]}][\s\n]*$/,
  // Python 装饰器
  /@\w+/,
  // 模板字符串
  /`[\s\S]*?\${[\s\S]*?}[\s\S]*?`/,
  // 正则表达式字面量
  /\/[^/\n]+\/[gimuy]*/,
]

/**
 * 代码特征计分
 */
interface CodeFeatures {
  hasCodePatterns: number
  hasBraces: number
  hasIndentation: number
  hasSemicolons: number
  hasSpecialChars: number
  lineCount: number
  avgLineLength: number
  hasOperators: number
  hasQuotes: number
}

/**
 * 分析文本的代码特征
 */
const analyzeCodeFeatures = (content: string): CodeFeatures => {
  const lines = content.split('\n')
  const lineCount = lines.length

  // 匹配代码模式的数量
  const hasCodePatterns = CODE_PATTERNS.filter(pattern => pattern.test(content)).length

  // 是否有大括号
  const hasBraces = (content.match(/[{}]/g) || []).length

  // 是否有缩进（连续空格或 tab）
  const hasIndentation = lines.filter(line => /^[\s\t]{2,}/.test(line)).length

  // 是否有分号
  const hasSemicolons = (content.match(/;/g) || []).length

  // 是否有特殊字符（代码中常见）
  const hasSpecialChars = (content.match(/[()[\]<>{}=]/g) || []).length

  // 运算符数量（避免与自然语言混淆）
  const hasOperators = (content.match(/[+\-*/%&|^~!]=?|===?|!==?|<=?|>=?|&&|\|\||<<|>>/g) || []).length

  // 引号数量（成对出现）
  const hasQuotes = (content.match(/["'`]/g) || []).length

  // 平均行长度
  const totalLength = lines.reduce((sum, line) => sum + line.length, 0)
  const avgLineLength = lineCount > 0 ? totalLength / lineCount : 0

  return {
    hasCodePatterns,
    hasBraces,
    hasIndentation,
    hasSemicolons,
    hasSpecialChars,
    lineCount,
    avgLineLength,
    hasOperators,
    hasQuotes
  }
}

/**
 * 检测内容是否为代码
 *
 * @param content 要检测的文本内容
 * @returns 是否为代码
 */
export const isCode = (content: string): boolean => {
  if (!content || content.trim().length === 0) {
    return false
  }

  // 特殊情况：单行且长度过短，大概率不是代码
  if (content.split('\n').length === 1 && content.trim().length < 10) {
    return false
  }

  const features = analyzeCodeFeatures(content)

  // 评分规则（总分 100）
  let score = 0

  // 1. 代码模式匹配（35分）
  if (features.hasCodePatterns >= 3) {
    score += 35
  } else if (features.hasCodePatterns >= 2) {
    score += 20
  } else if (features.hasCodePatterns >= 1) {
    score += 10
  }

  // 2. 大括号（12分）
  if (features.hasBraces >= 4) {
    score += 12
  } else if (features.hasBraces >= 2) {
    score += 6
  }

  // 3. 缩进（15分）
  if (features.hasIndentation >= features.lineCount * 0.3) {
    score += 15
  } else if (features.hasIndentation >= 2) {
    score += 8
  }

  // 4. 分号（8分）
  if (features.hasSemicolons >= 3) {
    score += 8
  } else if (features.hasSemicolons >= 1) {
    score += 4
  }

  // 5. 特殊字符密度（10分）
  const specialCharDensity = features.hasSpecialChars / content.length
  if (specialCharDensity > 0.1) {
    score += 10
  } else if (specialCharDensity > 0.05) {
    score += 5
  }

  // 6. 运算符（8分）
  if (features.hasOperators >= 3) {
    score += 8
  } else if (features.hasOperators >= 1) {
    score += 4
  }

  // 7. 引号（成对出现，表示字符串常量）（7分）
  if (features.hasQuotes >= 4 && features.hasQuotes % 2 === 0) {
    score += 7
  } else if (features.hasQuotes >= 2) {
    score += 3
  }

  // 8. 行数和行长度（5分）
  if (features.lineCount >= 5 && features.avgLineLength > 20 && features.avgLineLength < 120) {
    score += 5
  } else if (features.lineCount >= 3) {
    score += 2
  }

  // 阈值：45分以上认为是代码
  return score >= 45
}

/**
 * 尝试检测代码语言
 *
 * @param content 代码内容
 * @returns 语言标识符（如 'typescript', 'javascript', 'json' 等）
 */
export const detectLanguage = (content: string): string => {
  const trimmed = content.trim()

  // JSON（需要严格检测，避免误判）
  if (/^[\s\n]*[\[{]/.test(trimmed) && /[\]}][\s\n]*$/.test(trimmed)) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      // 不是有效的 JSON，继续检测
    }
  }

  // TypeScript（优先级高于 JavaScript）
  if (/\b(interface|type|enum|namespace|as\s+\w+|implements|declare)\b/.test(content)) {
    return 'typescript'
  }

  // React/JSX/TSX
  if (/<[A-Z]\w+[\s/>]/.test(content) || /import\s+.*\s+from\s+['"]react['"]/.test(content)) {
    if (/\b(interface|type|enum)\b/.test(content)) {
      return 'tsx'
    }
    return 'jsx'
  }

  // JavaScript
  if (/\b(import|export|const|let|var|function|class|=>)\b/.test(content)) {
    return 'javascript'
  }

  // HTML
  if (/<(!DOCTYPE|html|head|body|div|span|p|a|img)[\s>]/i.test(content)) {
    return 'html'
  }

  // CSS/SCSS/LESS
  if (/[\w-]+\s*{[\s\S]*?[\w-]+:\s*[^;]+;/.test(content)) {
    if (/@mixin|@include|\$\w+|@extend/.test(content)) {
      return 'scss'
    }
    if (/@[\w-]+:/.test(content)) {
      return 'less'
    }
    return 'css'
  }

  // Python
  if (/\b(def|class|import|from|if __name__|print|elif|lambda)\b/.test(content)) {
    return 'python'
  }

  // Go
  if (/\b(package|func|import|type|struct|interface|defer|go)\b/.test(content)) {
    return 'go'
  }

  // Rust
  if (/\b(fn|let mut|impl|trait|pub|use|mod|struct|enum)\b/.test(content)) {
    return 'rust'
  }

  // Java/C#
  if (/\b(public|private|protected)\s+(class|interface|static|void)\b/.test(content)) {
    if (/\bnamespace\b|using System/.test(content)) {
      return 'csharp'
    }
    return 'java'
  }

  // C/C++
  if (/#include|int main\(|std::|cout|cin|printf/.test(content)) {
    return 'cpp'
  }

  // PHP
  if (/<\?php|\$\w+\s*=|function\s+\w+\s*\(/.test(content)) {
    return 'php'
  }

  // Ruby
  if (/\b(def|class|module|require|end|puts)\b/.test(content)) {
    return 'ruby'
  }

  // SQL
  if (/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|CREATE|DROP|ALTER|TABLE)\b/i.test(content)) {
    return 'sql'
  }

  // Shell/Bash
  if (/^#!/.test(content) || /\b(echo|cd|ls|grep|awk|sed|chmod|mkdir)\b/.test(content)) {
    return 'bash'
  }

  // YAML
  if (/^[\w-]+:\s*$|^[\w-]+:\s+[^{}\[\]]+$/m.test(content) && !/[{}();\[\]]/.test(content)) {
    return 'yaml'
  }

  // Markdown（需要在最后检测，避免误判）
  if (/^#{1,6}\s+.+$|^\*\*.*\*\*$|^\[.+\]\(.+\)$|^```/m.test(content)) {
    return 'markdown'
  }

  // 默认返回纯文本
  return 'plaintext'
}
