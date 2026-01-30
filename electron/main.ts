import { app, BrowserWindow, ipcMain, dialog, clipboard, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
import Store from 'electron-store'
import fetch from 'electron-fetch'

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

// 获取应用设置
ipcMain.handle('get-app-settings', async () => {
  const defaultSettings = {
    themeMode: 'system' as 'light' | 'dark' | 'system',
    autoStart: false,
    ai: {
      enabled: false,
      provider: 'groq' as 'groq' | 'deepseek' | 'gemini' | 'custom',
      providers: {
        groq: {
          apiKey: '',
          apiBaseUrl: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile'
        },
        deepseek: {
          apiKey: '',
          apiBaseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat'
        },
        gemini: {
          apiKey: '',
          apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
          model: 'gemini-2.0-flash-exp'
        },
        custom: {
          apiKey: '',
          apiBaseUrl: '',
          model: ''
        }
      }
    }
  }

  // 兼容旧的 darkMode 设置，迁移到 themeMode
  const oldDarkMode = store.get('darkMode', null)
  if (oldDarkMode !== null && !store.has('themeMode')) {
    store.set('themeMode', oldDarkMode ? 'dark' : 'light')
    store.delete('darkMode')
  }

  const themeMode = store.get('themeMode', defaultSettings.themeMode) as 'light' | 'dark' | 'system'
  const autoStart = store.get('autoStart', defaultSettings.autoStart) as boolean
  let ai = store.get('ai', defaultSettings.ai) as any

  // 兼容旧的单一配置结构，迁移到新的多提供商结构
  if (ai && !ai.providers) {
    const oldProvider = ai.provider || 'groq'
    const oldApiKey = ai.apiKey || ''
    const oldApiBaseUrl = ai.apiBaseUrl || defaultSettings.ai.providers[oldProvider].apiBaseUrl
    const oldModel = ai.model || defaultSettings.ai.providers[oldProvider].model

    ai = {
      enabled: ai.enabled || false,
      provider: oldProvider,
      providers: {
        ...defaultSettings.ai.providers,
        [oldProvider]: {
          apiKey: oldApiKey,
          apiBaseUrl: oldApiBaseUrl,
          model: oldModel
        }
      }
    }
    store.set('ai', ai)
  }

  return { themeMode, autoStart, ai }
})

// 保存应用设置
ipcMain.handle('save-app-settings', async (_, settings: { themeMode: 'light' | 'dark' | 'system'; autoStart: boolean; ai: any }) => {
  try {
    store.set('themeMode', settings.themeMode)
    store.set('autoStart', settings.autoStart)
    if (settings.ai) {
      store.set('ai', settings.ai)
    }

    // 设置开机自启
    app.setLoginItemSettings({
      openAtLogin: settings.autoStart,
      openAsHidden: false
    })

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

// 导出记录为 Markdown
ipcMain.handle('export-records', async (_, options: any) => {
  try {
    const savePath = store.get('savePath', '') as string
    if (!savePath) {
      return { success: false, error: '未配置保存路径' }
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: '保存路径不存在' }
    }

    // 读取所有 .jsonl 文件
    const files = fs.readdirSync(savePath).filter(f => f.endsWith('.jsonl'))
    if (files.length === 0) {
      return { success: false, error: '没有找到记录文件' }
    }

    // 解析所有记录
    const allRecords: any[] = []
    for (const file of files) {
      try {
        const filePath = path.join(savePath, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const record = JSON.parse(line)
            const timestamp = new Date(record.timestamp).getTime()

            if (isNaN(timestamp) || !record.project) {
              continue
            }

            allRecords.push({
              timestamp,
              project: record.project,
              sessionId: record.sessionId || '',
              display: record.prompt || '',
              pastedContents: record.pastedContents || {}
            })
          } catch (e) {
            // 跳过无效记录
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError)
      }
    }

    if (allRecords.length === 0) {
      return { success: false, error: '没有有效的记录' }
    }

    // 过滤记录
    let filteredRecords = allRecords

    // 按 sessionIds 过滤
    if (options.sessionIds && options.sessionIds.length > 0) {
      filteredRecords = filteredRecords.filter(r =>
        options.sessionIds.includes(r.sessionId)
      )
    }

    // 按日期范围过滤
    if (options.startDate) {
      filteredRecords = filteredRecords.filter(r => r.timestamp >= options.startDate)
    }
    if (options.endDate) {
      filteredRecords = filteredRecords.filter(r => r.timestamp <= options.endDate)
    }

    if (filteredRecords.length === 0) {
      return { success: false, error: '筛选后没有记录' }
    }

    // 按时间排序
    filteredRecords.sort((a, b) => a.timestamp - b.timestamp)

    // 按会话分组
    const sessions = new Map<string, any[]>()
    for (const record of filteredRecords) {
      const sessionId = record.sessionId || `single-${record.timestamp}`
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, [])
      }
      sessions.get(sessionId)!.push(record)
    }

    // 生成 Markdown 内容
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')

    let markdown = '# Claude Code 对话记录导出\n\n'
    markdown += `**导出时间**: ${now.toLocaleString('zh-CN')}\n\n`
    markdown += `**记录总数**: ${filteredRecords.length} 条对话\n\n`
    markdown += `**会话总数**: ${sessions.size} 个会话\n\n`
    markdown += '---\n\n'

    // 遍历每个会话
    let sessionIndex = 1
    for (const [sessionId, records] of sessions) {
      const firstRecord = records[0]
      const projectName = path.basename(firstRecord.project)

      markdown += `## 会话 ${sessionIndex}: ${projectName}\n\n`

      if (sessionId && !sessionId.startsWith('single-')) {
        markdown += `**Session ID**: \`${sessionId}\`\n\n`
      }

      markdown += `**项目路径**: \`${firstRecord.project}\`\n\n`
      markdown += `**对话数量**: ${records.length} 条\n\n`
      markdown += `**时间范围**: ${new Date(records[0].timestamp).toLocaleString('zh-CN')} ~ ${new Date(records[records.length - 1].timestamp).toLocaleString('zh-CN')}\n\n`
      markdown += '---\n\n'

      // 遍历每条对话
      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        markdown += `### 对话 #${i + 1}\n\n`
        markdown += `**时间**: ${new Date(record.timestamp).toLocaleString('zh-CN')}\n\n`
        markdown += '**内容**:\n\n'
        markdown += '```\n'
        markdown += record.display
        markdown += '\n```\n\n'

        // 如果有附加内容
        if (record.pastedContents && Object.keys(record.pastedContents).length > 0) {
          markdown += '**附加内容**:\n\n'
          for (const [key, value] of Object.entries(record.pastedContents)) {
            markdown += `- 附件 ${key}:\n`
            if (typeof value === 'string') {
              markdown += '```\n'
              markdown += value
              markdown += '\n```\n\n'
            } else {
              markdown += '```json\n'
              markdown += JSON.stringify(value, null, 2)
              markdown += '\n```\n\n'
            }
          }
        }

        markdown += '---\n\n'
      }

      sessionIndex++
    }

    // 让用户选择保存位置
    const result = await dialog.showSaveDialog({
      title: '保存 Markdown 文件',
      defaultPath: `claude-code-export-${dateStr}-${timeStr}.md`,
      filters: [
        { name: 'Markdown Files', extensions: ['md'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: '用户取消了保存' }
    }

    // 写入文件
    fs.writeFileSync(result.filePath, markdown, 'utf-8')

    return { success: true, filePath: result.filePath }
  } catch (error) {
    console.error('导出记录失败:', error)
    return { success: false, error: (error as Error).message }
  }
})

// AI 总结功能
ipcMain.handle('summarize-records', async (_, request: { records: any[], type: 'brief' | 'detailed' }) => {
  try {
    // 获取 AI 设置
    const aiSettings = store.get('ai') as any

    if (!aiSettings || !aiSettings.enabled) {
      return {
        success: false,
        error: 'AI 总结功能未启用，请先在设置中启用'
      }
    }

    const provider = aiSettings.provider || 'groq'
    const currentConfig = aiSettings.providers?.[provider]

    if (!currentConfig || !currentConfig.apiKey) {
      const providerNames = {
        groq: 'Groq',
        deepseek: 'DeepSeek',
        gemini: 'Google Gemini',
        custom: '自定义'
      }
      return {
        success: false,
        error: `未配置 ${providerNames[provider] || 'AI'} API Key，请前往设置页面配置`
      }
    }

    // 验证 API Key 格式（只对特定提供商验证）
    if (provider === 'deepseek' && !currentConfig.apiKey.startsWith('sk-')) {
      return {
        success: false,
        error: 'API Key 格式不正确，DeepSeek API Key 应以 "sk-" 开头'
      }
    }

    if (provider === 'groq' && !currentConfig.apiKey.startsWith('gsk_')) {
      return {
        success: false,
        error: 'API Key 格式不正确，Groq API Key 应以 "gsk_" 开头'
      }
    }

    // 自定义提供商需要验证必填字段
    if (provider === 'custom') {
      if (!currentConfig.apiBaseUrl) {
        return {
          success: false,
          error: '自定义提供商需要配置 API 地址'
        }
      }
      if (!currentConfig.model) {
        return {
          success: false,
          error: '自定义提供商需要配置模型名称'
        }
      }
    }

    if (!request.records || request.records.length === 0) {
      return {
        success: false,
        error: '没有可总结的记录'
      }
    }

    // 构建提示词
    const conversations = request.records.map((record: any, index: number) => {
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

    const prompt = templates[request.type] || templates.detailed

    // 调用 AI API
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      // Gemini 使用不同的 API 格式（注意：自定义提供商默认使用 OpenAI 格式）
      if (provider === 'gemini') {
        const response = await fetch(
          `${currentConfig.apiBaseUrl}/models/${currentConfig.model}:generateContent?key=${currentConfig.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: '你是一个专业的技术对话总结助手，擅长提取关键信息和技术要点。请使用简洁清晰的中文进行总结。\n\n' + prompt
                }]
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000
              }
            }),
            signal: controller.signal
          }
        )

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return {
            success: false,
            error: `Gemini API 错误: ${response.status} ${(errorData as any).error?.message || response.statusText}`
          }
        }

        const data = await response.json()
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!summary) {
          return {
            success: false,
            error: 'Gemini API 返回格式异常'
          }
        }

        return {
          success: true,
          summary: summary.trim(),
          tokensUsed: data.usageMetadata?.totalTokenCount || 0
        }
      }

      // OpenAI 兼容格式 (Groq, DeepSeek, Custom)
      const response = await fetch(`${currentConfig.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentConfig.apiKey}`
        },
        body: JSON.stringify({
          model: currentConfig.model,
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
        const errorMessage = (errorData as any).error?.message || response.statusText

        // 针对不同错误码提供友好提示
        let userFriendlyError = ''
        switch (response.status) {
          case 401:
            userFriendlyError = 'API Key 无效或已过期，请检查并重新配置'
            break
          case 402:
            userFriendlyError = 'DeepSeek 账户余额不足，请前往 https://platform.deepseek.com 充值'
            break
          case 429:
            userFriendlyError = 'API 调用频率超限，请稍后再试'
            break
          case 500:
          case 502:
          case 503:
            userFriendlyError = 'DeepSeek 服务暂时不可用，请稍后再试'
            break
          default:
            userFriendlyError = `API 错误 (${response.status}): ${errorMessage}`
        }

        return {
          success: false,
          error: userFriendlyError
        }
      }

      const data = await response.json()

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return {
          success: false,
          error: 'DeepSeek API 返回格式异常'
        }
      }

      return {
        success: true,
        summary: data.choices[0].message.content.trim(),
        tokensUsed: data.usage?.total_tokens || 0
      }

    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: '请求超时，请检查网络连接'
        }
      }

      return {
        success: false,
        error: error.message || '未知错误'
      }
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || '总结失败'
    }
  }
})

// 流式 AI 总结功能
ipcMain.handle('summarize-records-stream', async (event, request: { records: any[], type: 'brief' | 'detailed' }) => {
  try {
    // 获取 AI 设置（复用相同的验证逻辑）
    const aiSettings = store.get('ai') as any

    if (!aiSettings || !aiSettings.enabled) {
      event.sender.send('summary-stream-error', 'AI 总结功能未启用，请先在设置中启用')
      return
    }

    const provider = aiSettings.provider || 'groq'
    const currentConfig = aiSettings.providers?.[provider]

    if (!currentConfig || !currentConfig.apiKey) {
      const providerNames = {
        groq: 'Groq',
        deepseek: 'DeepSeek',
        gemini: 'Google Gemini'
      }
      event.sender.send('summary-stream-error', `未配置 ${providerNames[provider] || 'AI'} API Key，请前往设置页面配置`)
      return
    }

    if (!request.records || request.records.length === 0) {
      event.sender.send('summary-stream-error', '没有可总结的记录')
      return
    }

    // 构建提示词
    const conversations = request.records.map((record: any, index: number) => {
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

    const prompt = templates[request.type] || templates.detailed

    // Gemini 不支持流式
    if (provider === 'gemini') {
      event.sender.send('summary-stream-error', 'Gemini 暂不支持流式输出，请使用普通总结')
      return
    }

    // OpenAI 兼容格式的流式请求 (Groq, DeepSeek)
    const response = await fetch(`${currentConfig.apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentConfig.apiKey}`
      },
      body: JSON.stringify({
        model: currentConfig.model,
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
        max_tokens: 2000,
        stream: true  // 启用流式输出
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      event.sender.send('summary-stream-error', `API 错误: ${response.status}`)
      return
    }

    // 读取流式响应
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        event.sender.send('summary-stream-complete')
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            event.sender.send('summary-stream-complete')
            return
          }

          try {
            const json = JSON.parse(data)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              event.sender.send('summary-stream-chunk', content)
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

  } catch (error: any) {
    event.sender.send('summary-stream-error', error.message || '总结失败')
  }
})

// 获取配置文件路径
ipcMain.handle('get-config-path', async () => {
  return store.path
})

// 初始化时检查是否需要启动监控
app.whenReady().then(() => {
  const enabled = store.get('recordEnabled', false) as boolean
  const savePath = store.get('savePath', '') as string
  if (enabled && savePath) {
    startHistoryMonitor(savePath)
  }
})
