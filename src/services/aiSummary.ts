import type { ClaudeRecord, AISettings, SummaryRequest } from '../types'

export class AISummaryService {
  private settings: AISettings

  constructor(settings: AISettings) {
    this.settings = settings
  }

  /**
   * 总结对话记录
   * @param records 要总结的记录
   * @param type 总结类型（简短/详细）
   * @returns 总结文本
   */
  async summarize(records: ClaudeRecord[], type: 'brief' | 'detailed' = 'detailed'): Promise<string> {
    if (!this.settings.enabled || !this.settings.apiKey) {
      throw new Error('AI 总结功能未启用或未配置 API Key')
    }

    if (records.length === 0) {
      throw new Error('没有可总结的记录')
    }

    const prompt = this.buildPrompt(records, type)
    const summary = await this.callDeepSeekAPI(prompt)

    return summary
  }

  /**
   * 构建提示词
   */
  private buildPrompt(records: ClaudeRecord[], type: 'brief' | 'detailed'): string {
    // 提取对话内容
    const conversations = records.map((record, index) => {
      return `[对话 ${index + 1}]\n时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}\n内容: ${record.display}`
    }).join('\n\n---\n\n')

    const templates = {
      brief: `请用 1-2 句话简短总结以下 Claude Code 对话的核心内容：\n\n${conversations}`,
      detailed: `请详细总结以下 Claude Code 对话记录，使用 Markdown 格式，包含以下结构：

## 📋 会话摘要
（用一段话概括整个对话的主题和目的）

## 🎯 主要讨论点
（列出 3-5 个要点）

## 💡 解决方案/结论
（总结得出的结论或实施的方案）

## 🔧 涉及的技术/工具
（如果有，列出提到的技术栈、工具或文件）

对话记录：

${conversations}`
    }

    return templates[type]
  }

  /**
   * 调用 DeepSeek API
   */
  private async callDeepSeekAPI(prompt: string): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时

    try {
      const response = await fetch(`${this.settings.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify({
          model: this.settings.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的技术对话总结助手，擅长提取关键信息和技术要点。请使用简洁清晰的中文进行总结。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`DeepSeek API 错误: ${response.status} ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('DeepSeek API 返回格式异常')
      }

      return data.choices[0].message.content.trim()

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 验证 API Key 是否有效
   */
  async validateAPIKey(): Promise<boolean> {
    try {
      const testPrompt = '请回复"OK"'
      await this.callDeepSeekAPI(testPrompt)
      return true
    } catch (error) {
      return false
    }
  }
}

/**
 * 创建 AI 总结服务实例
 */
export function createAISummaryService(settings: AISettings): AISummaryService {
  return new AISummaryService(settings)
}
