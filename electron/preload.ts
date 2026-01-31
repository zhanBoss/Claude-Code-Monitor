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

  // 读取历史记录
  readHistory: () => ipcRenderer.invoke('read-history'),

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

  // 读取应用配置文件内容
  readAppConfigFile: () => ipcRenderer.invoke('read-app-config-file'),

  // 保存应用配置文件内容
  saveAppConfigFile: (content: string) => ipcRenderer.invoke('save-app-config-file', content),

  // 卸载应用
  uninstallApp: () => ipcRenderer.invoke('uninstall-app'),

  // 打开开发者工具
  openDevtools: () => ipcRenderer.invoke('open-devtools')
})
