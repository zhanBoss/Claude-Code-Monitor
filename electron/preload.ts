import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Claude Code 检测
  checkClaudeInstalled: () => ipcRenderer.invoke('check-claude-installed'),

  // 配置管理
  getClaudeConfig: () => ipcRenderer.invoke('get-claude-config'),
  saveClaudeConfig: (config: string) => ipcRenderer.invoke('save-claude-config', config),

  // 记录配置
  selectSavePath: () => ipcRenderer.invoke('select-save-path'),
  getRecordConfig: () => ipcRenderer.invoke('get-record-config'),
  saveRecordConfig: (config: { enabled: boolean; savePath: string }) =>
    ipcRenderer.invoke('save-record-config', config),

  // 监听新记录
  onNewRecord: (callback: (record: any) => void) => {
    const listener = (_: any, record: any) => callback(record)
    ipcRenderer.on('new-record', listener)
    // 返回清理函数
    return () => {
      ipcRenderer.removeListener('new-record', listener)
    }
  },

  // 复制到剪贴板
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),

  // 在 Finder 中打开文件夹
  openInFinder: (path: string) => ipcRenderer.invoke('open-in-finder', path),

  // 读取历史记录（完整数据，保留兼容）
  readHistory: () => ipcRenderer.invoke('read-history'),

  // 读取历史记录元数据（轻量级，只返回会话信息）
  readHistoryMetadata: () => ipcRenderer.invoke('read-history-metadata'),

  // 读取指定会话的详细记录（按需加载）
  readSessionDetails: (sessionId: string) => ipcRenderer.invoke('read-session-details', sessionId),

  // 应用设置
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings: { darkMode: boolean; autoStart: boolean }) =>
    ipcRenderer.invoke('save-app-settings', settings),

  // 导出记录
  exportRecords: (options: any) => ipcRenderer.invoke('export-records', options),

  // 新增 AI 总结方法
  summarizeRecords: (request: any) => ipcRenderer.invoke('summarize-records', request),

  // 流式 AI 总结
  summarizeRecordsStream: (
    request: any,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    // 注册流式响应监听器
    const chunkListener = (_: any, chunk: string) => onChunk(chunk)
    const completeListener = () => onComplete()
    const errorListener = (_: any, error: string) => onError(error)

    ipcRenderer.on('summary-stream-chunk', chunkListener)
    ipcRenderer.once('summary-stream-complete', completeListener)
    ipcRenderer.once('summary-stream-error', errorListener)

    // 发起请求
    return ipcRenderer.invoke('summarize-records-stream', request).then(() => {
      // 清理监听器
      return () => {
        ipcRenderer.removeListener('summary-stream-chunk', chunkListener)
        ipcRenderer.removeListener('summary-stream-complete', completeListener)
        ipcRenderer.removeListener('summary-stream-error', errorListener)
      }
    })
  },

  // 获取配置文件路径
  getConfigPath: () => ipcRenderer.invoke('get-config-path'),

  // 在默认编辑器中打开配置文件
  openConfigFile: () => ipcRenderer.invoke('open-config-file'),

  // 在文件管理器中显示配置文件
  showConfigInFolder: () => ipcRenderer.invoke('show-config-in-folder'),

  // 在文件管理器中显示 Claude Code 配置文件
  showClaudeConfigInFolder: () => ipcRenderer.invoke('show-claude-config-in-folder'),

  // 删除单条历史记录
  deleteRecord: (sessionId: string, timestamp: number) => ipcRenderer.invoke('delete-record', sessionId, timestamp),

  // 读取应用配置文件内容
  readAppConfigFile: () => ipcRenderer.invoke('read-app-config-file'),

  // 保存应用配置文件内容
  saveAppConfigFile: (content: string) => ipcRenderer.invoke('save-app-config-file', content),

  // 卸载应用
  uninstallApp: () => ipcRenderer.invoke('uninstall-app'),

  // 清除缓存
  clearCache: () => ipcRenderer.invoke('clear-cache'),

  // 按时间范围清理缓存
  clearCacheByAge: (retainMs: number) => ipcRenderer.invoke('clear-cache-by-age', retainMs),

  // 获取自动清理状态
  getAutoCleanupStatus: () => ipcRenderer.invoke('get-auto-cleanup-status'),

  // 手动触发自动清理
  triggerAutoCleanup: () => ipcRenderer.invoke('trigger-auto-cleanup'),

  // 监听自动清理倒计时更新
  onAutoCleanupTick: (callback: (data: { nextCleanupTime: number; remainingMs: number }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('auto-cleanup-tick', listener)
    return () => {
      ipcRenderer.removeListener('auto-cleanup-tick', listener)
    }
  },

  // 监听自动清理执行完成
  onAutoCleanupExecuted: (callback: (data: { deletedCount: number; nextCleanupTime: number }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('auto-cleanup-executed', listener)
    return () => {
      ipcRenderer.removeListener('auto-cleanup-executed', listener)
    }
  },

  // 监听自动清理错误
  onAutoCleanupError: (callback: (data: { error: string }) => void) => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('auto-cleanup-error', listener)
    return () => {
      ipcRenderer.removeListener('auto-cleanup-error', listener)
    }
  },

  // 监听自动清理配置更新
  onAutoCleanupConfigUpdated: (callback: (config: any) => void) => {
    const listener = (_: any, config: any) => callback(config)
    ipcRenderer.on('auto-cleanup-config-updated', listener)
    return () => {
      ipcRenderer.removeListener('auto-cleanup-config-updated', listener)
    }
  },

  // 打开开发者工具
  openDevtools: () => ipcRenderer.invoke('open-devtools'),

  // 读取图片文件
  readImage: (imagePath: string) => ipcRenderer.invoke('read-image', imagePath),

  // 复制图片到剪贴板（使用原生 nativeImage）
  copyImageToClipboard: (base64Data: string) => ipcRenderer.invoke('copy-image-to-clipboard', base64Data),

  // 读取文件内容（用于代码编辑器）
  readFileContent: (filePath: string) => ipcRenderer.invoke('read-file-content', filePath),

  // 保存文件内容（用于代码编辑器）
  saveFileContent: (filePath: string, content: string) => ipcRenderer.invoke('save-file-content', filePath, content),

  // 在系统默认编辑器中打开文件
  openFileInEditor: (filePath: string) => ipcRenderer.invoke('open-file-in-editor', filePath),

  // Claude Code 配置备份管理
  listClaudeConfigBackups: () => ipcRenderer.invoke('list-claude-config-backups'),
  createClaudeConfigBackup: (name: string) => ipcRenderer.invoke('create-claude-config-backup', name),
  deleteClaudeConfigBackup: (id: number) => ipcRenderer.invoke('delete-claude-config-backup', id),
  switchClaudeConfigBackup: (id: number) => ipcRenderer.invoke('switch-claude-config-backup', id),
  updateClaudeConfigBackupName: (id: number, name: string) =>
    ipcRenderer.invoke('update-claude-config-backup-name', id, name),
  getClaudeConfigBackupContent: (id: number) => ipcRenderer.invoke('get-claude-config-backup-content', id),

  // 在外部浏览器中打开链接
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // 常用命令管理
  getCommonCommands: () => ipcRenderer.invoke('get-common-commands'),
  addCommonCommand: (name: string, content: string) => ipcRenderer.invoke('add-common-command', name, content),
  updateCommonCommand: (id: string, name: string, content: string) =>
    ipcRenderer.invoke('update-common-command', id, name, content),
  deleteCommonCommand: (id: string) => ipcRenderer.invoke('delete-common-command', id),
  togglePinCommand: (id: string) => ipcRenderer.invoke('toggle-pin-command', id),
  reorderCommands: (commands: any[]) => ipcRenderer.invoke('reorder-commands', commands),
  openCommonCommandsFile: () => ipcRenderer.invoke('open-common-commands-file'),

  // AI 对话流式响应
  chatStream: (
    request: any,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ) => {
    // 注册流式响应监听器
    const chunkListener = (_: any, chunk: string) => onChunk(chunk)
    const completeListener = () => onComplete()
    const errorListener = (_: any, error: string) => onError(error)

    ipcRenderer.on('chat-stream-chunk', chunkListener)
    ipcRenderer.once('chat-stream-complete', completeListener)
    ipcRenderer.once('chat-stream-error', errorListener)

    // 发起请求
    return ipcRenderer.invoke('chat-stream', request).then(() => {
      // 清理监听器
      return () => {
        ipcRenderer.removeListener('chat-stream-chunk', chunkListener)
        ipcRenderer.removeListener('chat-stream-complete', completeListener)
        ipcRenderer.removeListener('chat-stream-error', errorListener)
      }
    })
  },

  // AI 格式化 Prompt
  formatPrompt: (content: string, contentHash?: string) =>
    ipcRenderer.invoke('format-prompt', { content, contentHash })
})
