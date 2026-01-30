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

// AI 设置接口
export interface AISettings {
  enabled: boolean
  provider: 'deepseek'
  apiKey: string
  apiBaseUrl: string
  model: string
}

export interface AppSettings {
  darkMode: boolean
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
