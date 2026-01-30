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
  readHistory: () => ipcRenderer.invoke('read-history')
})
