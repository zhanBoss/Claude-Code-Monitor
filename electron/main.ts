import { app, BrowserWindow, ipcMain, dialog, clipboard, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import Store from 'electron-store'

const store = new Store()

let mainWindow: BrowserWindow | null = null
let historyWatcher: fs.FSWatcher | null = null
let lastFileSize = 0

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const HISTORY_FILE = path.join(CLAUDE_DIR, 'history.jsonl')
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // 开发模式：加载 Vite 开发服务器
  // 生产模式：加载打包后的文件
  const isDev = process.env.NODE_ENV !== 'production'

  if (isDev) {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'
    mainWindow.loadURL(devServerUrl)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (historyWatcher) {
    historyWatcher.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 检查 Claude Code 是否安装
ipcMain.handle('check-claude-installed', async () => {
  try {
    const exists = fs.existsSync(CLAUDE_DIR) && fs.existsSync(SETTINGS_FILE)
    return { installed: exists, claudeDir: CLAUDE_DIR }
  } catch (error) {
    return { installed: false, error: (error as Error).message }
  }
})

// 读取 Claude Code 配置
ipcMain.handle('get-claude-config', async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      throw new Error('配置文件不存在')
    }
    const content = fs.readFileSync(SETTINGS_FILE, 'utf-8')
    return { success: true, config: content }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 保存 Claude Code 配置
ipcMain.handle('save-claude-config', async (_, config: string) => {
  try {
    // 验证 JSON 格式
    JSON.parse(config)
    fs.writeFileSync(SETTINGS_FILE, config, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 选择保存路径
ipcMain.handle('select-save-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title: '选择对话记录保存目录'
  })

  if (result.canceled) {
    return { canceled: true }
  }

  return { canceled: false, path: result.filePaths[0] }
})

// 获取记录配置
ipcMain.handle('get-record-config', async () => {
  const enabled = store.get('recordEnabled', false) as boolean
  const savePath = store.get('savePath', '') as string
  return { enabled, savePath }
})

// 保存记录配置
ipcMain.handle('save-record-config', async (_, config: { enabled: boolean; savePath: string }) => {
  try {
    store.set('recordEnabled', config.enabled)
    store.set('savePath', config.savePath)

    // 确保目录存在
    if (config.enabled && config.savePath) {
      if (!fs.existsSync(config.savePath)) {
        fs.mkdirSync(config.savePath, { recursive: true })
      }
    }

    // 启动或停止监控
    if (config.enabled) {
      startHistoryMonitor(config.savePath)
    } else {
      stopHistoryMonitor()
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 复制到剪贴板
ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
  try {
    clipboard.writeText(text)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 在 Finder 中打开文件夹
ipcMain.handle('open-in-finder', async (_, folderPath: string) => {
  try {
    if (fs.existsSync(folderPath)) {
      shell.showItemInFolder(folderPath)
      return { success: true }
    } else {
      return { success: false, error: '文件夹不存在' }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

// 启动历史记录监控
function startHistoryMonitor(savePath: string) {
  if (historyWatcher) {
    historyWatcher.close()
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    return
  }

  // 获取当前文件大小
  const stats = fs.statSync(HISTORY_FILE)
  lastFileSize = stats.size

  historyWatcher = fs.watch(HISTORY_FILE, (eventType) => {
    if (eventType === 'change') {
      readNewLines(savePath)
    }
  })
}

// 停止历史记录监控
function stopHistoryMonitor() {
  if (historyWatcher) {
    historyWatcher.close()
    historyWatcher = null
  }
}

// 读取新增的行
function readNewLines(savePath: string) {
  try {
    const stats = fs.statSync(HISTORY_FILE)
    const currentSize = stats.size

    if (currentSize <= lastFileSize) {
      return
    }

    const stream = fs.createReadStream(HISTORY_FILE, {
      start: lastFileSize,
      end: currentSize,
      encoding: 'utf-8'
    })

    let buffer = ''
    stream.on('data', (chunk) => {
      buffer += chunk
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      lines.forEach(line => {
        if (line.trim()) {
          try {
            const record = JSON.parse(line)
            processRecord(record, savePath)
          } catch (e) {
            console.error('Failed to parse line:', e)
          }
        }
      })
    })

    stream.on('end', () => {
      lastFileSize = currentSize
    })
  } catch (error) {
    console.error('Error reading new lines:', error)
  }
}

// 处理对话记录
function processRecord(record: any, savePath: string) {
  // 发送到渲染进程
  if (mainWindow) {
    mainWindow.webContents.send('new-record', record)
  }

  // 保存到文件
  try {
    const timestamp = new Date(record.timestamp).toISOString()
    const projectName = record.project ? path.basename(record.project) : 'unknown'
    const date = new Date(record.timestamp).toISOString().split('T')[0]

    const fileName = `${projectName}_${date}.jsonl`
    const filePath = path.join(savePath, fileName)

    const logEntry = {
      timestamp,
      project: record.project,
      sessionId: record.sessionId,
      prompt: record.display,
      pastedContents: record.pastedContents
    }

    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf-8')
  } catch (error) {
    console.error('Failed to save record:', error)
  }
}

// 读取历史记录
ipcMain.handle('read-history', async () => {
  try {
    const savePath = store.get('savePath', '') as string
    if (!savePath) {
      return { success: false, error: '未配置保存路径' }
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: '保存路径不存在' }
    }

    const files = fs.readdirSync(savePath).filter(f => f.endsWith('.jsonl'))

    if (files.length === 0) {
      return { success: true, records: [] }
    }

    const records: any[] = []
    const MAX_RECORDS = 1000 // 限制最大记录数，避免 IPC 消息过大

    for (const file of files) {
      if (records.length >= MAX_RECORDS) {
        break
      }

      try {
        const filePath = path.join(savePath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())

        for (const line of lines) {
          if (records.length >= MAX_RECORDS) break

          try {
            const record = JSON.parse(line)
            // 转换时间戳格式（从 ISO 字符串转为毫秒数）
            const timestamp = new Date(record.timestamp).getTime()

            // 验证数据完整性
            if (isNaN(timestamp) || !record.project) {
              continue
            }

            records.push({
              timestamp,
              project: record.project,
              sessionId: record.sessionId || '',
              display: record.prompt || '',
              pastedContents: record.pastedContents || {}
            })
          } catch (e) {
            console.error('解析记录失败:', e, '行内容:', line.substring(0, 100))
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError)
        // 继续处理其他文件
      }
    }

    return { success: true, records }
  } catch (error) {
    console.error('读取历史记录时发生错误:', error)
    return { success: false, error: (error as Error).message }
  }
})

// 初始化时检查是否需要启动监控
app.whenReady().then(() => {
  const enabled = store.get('recordEnabled', false) as boolean
  const savePath = store.get('savePath', '') as string
  if (enabled && savePath) {
    startHistoryMonitor(savePath)
  }
})
