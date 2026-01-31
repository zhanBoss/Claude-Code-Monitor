export interface ClaudeRecord {
  timestamp: number
  project: string
  sessionId?: string
  display: string
  pastedContents?: Record<string, any>
}

export interface RecordConfig {
  enabled: boolean
  savePath: string
}

// AI 提供商配置
export interface ProviderConfig {
  apiKey: string
  apiBaseUrl: string
  model: string
}

// AI 设置接口
export interface AISettings {
  enabled: boolean
  provider: 'deepseek' | 'groq' | 'gemini' | 'custom'
  // 每个提供商的独立配置
  providers: {
    deepseek: ProviderConfig
    groq: ProviderConfig
    gemini: ProviderConfig
    custom: ProviderConfig
  }
}

export interface AppSettings {
  themeMode: 'light' | 'dark' | 'system'
  autoStart: boolean
  ai: AISettings
}

export interface ExportOptions {
  format: 'markdown' | 'csv'
  sessionIds?: string[]
  startDate?: number
  endDate?: number
}

export interface ElectronAPI {
  checkClaudeInstalled: () => Promise<{ installed: boolean; claudeDir?: string; error?: string }>
  getClaudeConfig: () => Promise<{ success: boolean; config?: string; error?: string }>
  saveClaudeConfig: (config: string) => Promise<{ success: boolean; error?: string }>
  selectSavePath: () => Promise<{ canceled: boolean; path?: string }>
  getRecordConfig: () => Promise<RecordConfig>
  saveRecordConfig: (config: RecordConfig) => Promise<{ success: boolean; error?: string }>
  onNewRecord: (callback: (record: ClaudeRecord) => void) => () => void
  copyToClipboard: (text: string) => Promise<{ success: boolean; error?: string }>
  openInFinder: (path: string) => Promise<{ success: boolean; error?: string }>
  readHistory: () => Promise<{ success: boolean; records?: ClaudeRecord[]; error?: string }>
  getAppSettings: () => Promise<AppSettings>
  saveAppSettings: (settings: AppSettings) => Promise<{ success: boolean; error?: string }>
  exportRecords: (options: ExportOptions) => Promise<{ success: boolean; filePath?: string; error?: string }>
  // 新增 AI 相关方法
  summarizeRecords: (request: SummaryRequest) => Promise<SummaryResponse>
  // 流式总结，返回监听器清理函数
  summarizeRecordsStream: (
    request: SummaryRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => Promise<void>
  // 获取配置文件路径
  getConfigPath: () => Promise<string>
  // 在默认编辑器中打开配置文件
  openConfigFile: () => Promise<void>
  // 在文件管理器中显示配置文件
  showConfigInFolder: () => Promise<void>
  // 读取应用配置文件内容
  readAppConfigFile: () => Promise<string>
  // 保存应用配置文件内容
  saveAppConfigFile: (content: string) => Promise<void>
  // 卸载应用
  uninstallApp: () => Promise<{ success: boolean; error?: string }>
}

// AI 总结请求参数
export interface SummaryRequest {
  records: ClaudeRecord[]
  type: 'brief' | 'detailed'
}

// AI 总结响应
export interface SummaryResponse {
  success: boolean
  summary?: string
  error?: string
  tokensUsed?: number
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
