import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  clipboard,
  nativeImage,
  shell,
} from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import Store from "electron-store";
import { request as httpRequest } from "./utils/http";

// 扩展 global 类型
declare global {
  var processedImages: Map<string, Set<string>> | undefined;
}

const store = new Store();

let mainWindow: BrowserWindow | null = null;
let historyWatcher: fs.FSWatcher | null = null;
let lastFileSize = 0;

// 自动清理缓存定时器
let autoCleanupTimer: ReturnType<typeof setInterval> | null = null;

// ========== 图片处理函数（独立提取，供多处调用） ==========

/**
 * 从 Claude Code 2.0.55+ projects 目录提取图片
 * @param sessionId - 会话 ID
 * @param project - 项目路径
 * @param savePath - 应用保存路径
 * @param displayText - 记录的 display 文本，用于识别图片编号
 * @returns 图片路径数组
 */
async function extractImagesFromProjects(
  sessionId: string,
  project: string,
  savePath: string,
  displayText: string
): Promise<string[]> {
  const images: string[] = [];

  try {
    // 从 display 文本中提取图片编号
    const imageMatches = displayText.match(/\[Image #(\d+)\]/g);
    if (!imageMatches || imageMatches.length === 0) {
      // 如果没有图片标记，直接返回
      return images;
    }

    // 提取所有图片编号
    const imageNumbers = imageMatches
      .map((match) => {
        const num = match.match(/\d+/);
        return num ? parseInt(num[0]) : null;
      })
      .filter((n) => n !== null) as number[];

    if (imageNumbers.length === 0) {
      return images;
    }

    console.log(`[Image Extract] 记录中需要 ${imageNumbers.length} 张图片:`, imageNumbers);

    // 构建 project 路径（将绝对路径转换为文件夹名）
    const projectFolderName = project.replace(/\//g, "-");
    const projectSessionFile = path.join(
      CLAUDE_DIR,
      "projects",
      projectFolderName,
      `${sessionId}.jsonl`
    );

    if (!fs.existsSync(projectSessionFile)) {
      console.log(`[Image Extract] Session 文件不存在，跳过`);
      return images;
    }

    const lines = fs
      .readFileSync(projectSessionFile, "utf-8")
      .split("\n")
      .filter((line) => line.trim());

    // 从 session 文件中提取所有 base64 图片
    const base64Images: { index: number; data: string }[] = [];
    let currentImageIndex = 1;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        // 查找用户消息中的图片
        if (
          entry.message &&
          Array.isArray(entry.message.content) &&
          entry.message.role === "user"
        ) {
          for (const content of entry.message.content) {
            if (
              content.type === "image" &&
              content.source &&
              content.source.type === "base64" &&
              content.source.data
            ) {
              base64Images.push({
                index: currentImageIndex,
                data: content.source.data,
              });
              currentImageIndex++;
            }
          }
        }
      } catch (err) {
        // 忽略解析错误的行
      }
    }

    console.log(`[Image Extract] Session 中共有 ${base64Images.length} 张图片`);

    // 只保存当前记录需要的图片
    const imagesDir = path.join(savePath, "images", sessionId);
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    for (const imageNum of imageNumbers) {
      // 在 base64Images 数组中查找对应编号的图片
      const imageData = base64Images.find((img) => img.index === imageNum);

      if (imageData) {
        const imageFileName = `${imageNum}.png`;
        const imagePath = path.join(imagesDir, imageFileName);

        // 如果图片已存在，跳过
        if (!fs.existsSync(imagePath)) {
          // 将 base64 数据写入文件
          const buffer = Buffer.from(imageData.data, "base64");
          fs.writeFileSync(imagePath, buffer);
          console.log(`[Image Extract] 成功提取图片 #${imageNum}`);
        }

        images.push(`images/${sessionId}/${imageFileName}`);
      } else {
        console.warn(`[Image Extract] 找不到图片 #${imageNum}`);
      }
    }

    if (images.length > 0) {
      console.log(`[Image Extract] 本条记录提取了 ${images.length} 张图片`);
    }
  } catch (err) {
    console.error("[Image Extract] 提取图片失败:", err);
  }

  return images;
}

// ==========================================================

let autoCleanupTickTimer: ReturnType<typeof setInterval> | null = null;

const CLAUDE_DIR = path.join(os.homedir(), ".claude");
const HISTORY_FILE = path.join(CLAUDE_DIR, "history.jsonl");
const SETTINGS_FILE = path.join(CLAUDE_DIR, "settings.json");

function createWindow() {
  /* 应用图标路径：开发模式使用 build 目录，打包后使用 resources 目录 */
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "icon.png")
    : path.join(__dirname, "..", "build", "icon.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  /* macOS Dock 图标设置 */
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(iconPath);
  }

  // 开发模式：加载 Vite 开发服务器
  // 生产模式：加载打包后的文件
  const isDev = !app.isPackaged;
  // 开发构建模式：打包后仍然显示 DevTools（通过环境变量控制）
  const isDevBuild = process.env.ELECTRON_DEV_BUILD === "true";

  if (isDev) {
    const devServerUrl =
      process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的 index.html
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));

    // 如果是开发构建模式，打开 DevTools 方便调试
    if (isDevBuild) {
      mainWindow.webContents.openDevTools();
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // 应用启动时,自动启动文件监控(如果已启用)
  const recordEnabled = store.get("recordEnabled", false) as boolean;
  const savePath = store.get("savePath", "") as string;

  if (recordEnabled && savePath) {
    console.log(
      `[启动] 自动启动文件监控: enabled=${recordEnabled}, savePath=${savePath}`,
    );
    startHistoryMonitor(savePath);
  } else {
    console.log(
      `[启动] 未启动文件监控: enabled=${recordEnabled}, savePath=${savePath}`,
    );
  }

  // 启动自动清理缓存定时器
  setupAutoCleanupTimer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (historyWatcher) {
    historyWatcher.close();
  }
  // 清理自动清理定时器
  if (autoCleanupTimer) {
    clearInterval(autoCleanupTimer);
    autoCleanupTimer = null;
  }
  if (autoCleanupTickTimer) {
    clearInterval(autoCleanupTickTimer);
    autoCleanupTickTimer = null;
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 检查 Claude Code 是否安装
ipcMain.handle("check-claude-installed", async () => {
  try {
    const exists = fs.existsSync(CLAUDE_DIR) && fs.existsSync(SETTINGS_FILE);
    return { installed: exists, claudeDir: CLAUDE_DIR };
  } catch (error) {
    return { installed: false, error: (error as Error).message };
  }
});

// 读取 Claude Code 配置
ipcMain.handle("get-claude-config", async () => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      throw new Error("配置文件不存在");
    }
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { success: true, config: content };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 保存 Claude Code 配置
ipcMain.handle("save-claude-config", async (_, config: string) => {
  try {
    // 验证 JSON 格式
    JSON.parse(config);
    fs.writeFileSync(SETTINGS_FILE, config, "utf-8");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 选择保存路径
ipcMain.handle("select-save-path", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
    title: "选择对话记录保存目录",
  });

  if (result.canceled) {
    return { canceled: true };
  }

  return { canceled: false, path: result.filePaths[0] };
});

// 获取记录配置
ipcMain.handle("get-record-config", async () => {
  const enabled = store.get("recordEnabled", false) as boolean;
  const savePath = store.get("savePath", "") as string;
  return { enabled, savePath };
});

// 保存记录配置
ipcMain.handle(
  "save-record-config",
  async (_, config: { enabled: boolean; savePath: string }) => {
    try {
      store.set("recordEnabled", config.enabled);
      store.set("savePath", config.savePath);

      // 确保目录存在
      if (config.enabled && config.savePath) {
        if (!fs.existsSync(config.savePath)) {
          fs.mkdirSync(config.savePath, { recursive: true });
        }
      }

      // 启动或停止监控
      if (config.enabled) {
        startHistoryMonitor(config.savePath);
      } else {
        stopHistoryMonitor();
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

// 获取应用设置
ipcMain.handle("get-app-settings", async () => {
  const defaultProviders = {
    groq: {
      apiKey: "",
      apiBaseUrl: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
    },
    deepseek: {
      apiKey: "",
      apiBaseUrl: "https://api.deepseek.com/v1",
      model: "deepseek-chat",
    },
    gemini: {
      apiKey: "",
      apiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
      model: "gemini-2.0-flash-exp",
    },
    custom: {
      apiKey: "",
      apiBaseUrl: "",
      model: "",
    },
  };

  const defaultSettings = {
    themeMode: "system" as "light" | "dark" | "system",
    autoStart: false,
    // AI 对话配置（简化版，只需三个字段）
    aiChat: {
      apiKey: "",
      apiBaseUrl: "",
      model: "",
    },
    // AI 总结配置
    aiSummary: {
      enabled: false,
      provider: "groq" as "groq" | "deepseek" | "gemini" | "custom",
      providers: defaultProviders,
    },
  };

  // 兼容旧的 darkMode 设置，迁移到 themeMode
  const oldDarkMode = store.get("darkMode", null);
  if (oldDarkMode !== null && !store.has("themeMode")) {
    store.set("themeMode", oldDarkMode ? "dark" : "light");
    store.delete("darkMode");
  }

  const themeMode = store.get("themeMode", defaultSettings.themeMode) as
    | "light"
    | "dark"
    | "system";
  const autoStart = store.get(
    "autoStart",
    defaultSettings.autoStart,
  ) as boolean;

  // 数据迁移：从旧的 ai 配置迁移到新的 aiChat 和 aiSummary 配置
  const oldAi = store.get("ai", null) as any;

  let aiChat = store.get("aiChat", null) as any;
  let aiSummary = store.get("aiSummary", null) as any;

  // 如果旧配置存在且新配置不存在，执行迁移
  if (oldAi && (!aiChat || !aiSummary)) {
    console.log("[数据迁移] 检测到旧的 AI 配置，开始迁移...");

    // 迁移到 aiChat（对话配置简化为三个字段）
    if (!aiChat) {
      const oldProvider = oldAi.provider || "deepseek";
      const oldProviderConfig = oldAi.providers?.[oldProvider] || {};

      aiChat = {
        apiKey: oldProviderConfig.apiKey || "",
        apiBaseUrl: oldProviderConfig.apiBaseUrl || "",
        model: oldProviderConfig.model || "",
      };
      store.set("aiChat", aiChat);
    }

    // 迁移到 aiSummary（总结配置继承旧配置）
    if (!aiSummary) {
      aiSummary = {
        enabled: oldAi.enabled || false,
        provider: oldAi.provider || "groq",
        providers: oldAi.providers || defaultProviders,
      };
      store.set("aiSummary", aiSummary);
    }

    // 删除旧配置
    store.delete("ai");
    console.log("[数据迁移] 迁移完成，已删除旧配置");
  }

  // 如果没有旧配置，使用默认值
  if (!aiChat) {
    aiChat = defaultSettings.aiChat;
    store.set("aiChat", aiChat);
  }

  if (!aiSummary) {
    aiSummary = defaultSettings.aiSummary;
    store.set("aiSummary", aiSummary);
  }

  // 自动清理缓存配置
  const autoCleanup = store.get("autoCleanup", {
    enabled: false,
    intervalMs: 24 * 60 * 60 * 1000, // 默认 24 小时
    retainMs: 12 * 60 * 60 * 1000, // 默认保留 12 小时
    lastCleanupTime: null,
    nextCleanupTime: null,
    showFloatingBall: true, // 默认显示悬浮球
  }) as any;

  return { themeMode, autoStart, aiChat, aiSummary, autoCleanup };
});

// 保存应用设置
ipcMain.handle(
  "save-app-settings",
  async (
    _,
    settings: {
      themeMode: "light" | "dark" | "system";
      autoStart: boolean;
      aiChat: any;
      aiSummary: any;
      autoCleanup?: any;
    },
  ) => {
    try {
      store.set("themeMode", settings.themeMode);
      store.set("autoStart", settings.autoStart);
      if (settings.aiChat) {
        store.set("aiChat", settings.aiChat);
      }
      if (settings.aiSummary) {
        store.set("aiSummary", settings.aiSummary);
      }
      if (settings.autoCleanup !== undefined) {
        store.set("autoCleanup", settings.autoCleanup);
        // 重新启动或停止自动清理定时器
        setupAutoCleanupTimer();
        // 通知渲染进程配置已更新
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("auto-cleanup-config-updated", settings.autoCleanup);
        }
      }

      // 设置开机自启
      app.setLoginItemSettings({
        openAtLogin: settings.autoStart,
        openAsHidden: false,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  },
);

// 复制到剪贴板
ipcMain.handle("copy-to-clipboard", async (_, text: string) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 复制图片到剪贴板（使用原生 nativeImage）
ipcMain.handle(
  "copy-image-to-clipboard",
  async (_, base64Data: string) => {
    try {
      const image = nativeImage.createFromDataURL(base64Data);
      if (image.isEmpty()) {
        return { success: false, error: "无法解析图片数据" };
      }
      clipboard.writeImage(image);
      return { success: true };
    } catch (error) {
      console.error("复制图片到剪贴板失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 在 Finder 中打开文件夹
ipcMain.handle("open-in-finder", async (_, folderPath: string) => {
  try {
    if (fs.existsSync(folderPath)) {
      shell.showItemInFolder(folderPath);
      return { success: true };
    } else {
      return { success: false, error: "文件夹不存在" };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 在外部浏览器中打开链接
ipcMain.handle("open-external", async (_, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// 启动历史记录监控
function startHistoryMonitor(savePath: string) {
  if (historyWatcher) {
    historyWatcher.close();
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    return;
  }

  // 获取当前文件大小
  const stats = fs.statSync(HISTORY_FILE);
  lastFileSize = stats.size;

  historyWatcher = fs.watch(HISTORY_FILE, (eventType: string) => {
    if (eventType === "change") {
      readNewLines(savePath);
    }
  });
}

// 停止历史记录监控
function stopHistoryMonitor() {
  if (historyWatcher) {
    historyWatcher.close();
    historyWatcher = null;
  }
}

// 读取新增的行
function readNewLines(savePath: string) {
  try {
    const stats = fs.statSync(HISTORY_FILE);
    const currentSize = stats.size;

    if (currentSize <= lastFileSize) {
      return;
    }

    const stream = fs.createReadStream(HISTORY_FILE, {
      start: lastFileSize,
      end: currentSize,
      encoding: "utf-8",
    });

    let buffer = "";
    stream.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      lines.forEach((line) => {
        if (line.trim()) {
          try {
            const record = JSON.parse(line);
            processRecord(record, savePath);
          } catch (e) {
            console.error("Failed to parse line:", e);
          }
        }
      });
    });

    stream.on("end", () => {
      lastFileSize = currentSize;
    });
  } catch (error) {
    console.error("Error reading new lines:", error);
  }
}

// 处理对话记录
async function processRecord(record: any, savePath: string) {
  // 保存到文件
  try {
    const timestamp = new Date(record.timestamp).toISOString();
    const projectName = record.project
      ? path.basename(record.project)
      : "unknown";
    const date = new Date(record.timestamp).toISOString().split("T")[0];

    const fileName = `${projectName}_${date}.jsonl`;
    const filePath = path.join(savePath, fileName);

    // 处理粘贴内容：读取实际内容
    const expandedPastedContents: Record<string, any> = {};
    if (record.pastedContents && typeof record.pastedContents === "object") {
      for (const [key, value] of Object.entries(record.pastedContents)) {
        if (value && typeof value === "object" && (value as any).contentHash) {
          const contentHash = (value as any).contentHash;
          const pasteFilePath = path.join(
            CLAUDE_DIR,
            "paste-cache",
            `${contentHash}.txt`,
          );

          try {
            if (fs.existsSync(pasteFilePath)) {
              const actualContent = fs.readFileSync(pasteFilePath, "utf-8");
              expandedPastedContents[key] = {
                ...value,
                content: actualContent,
              };
            } else {
              expandedPastedContents[key] = value;
            }
          } catch (err) {
            console.error(`Failed to read paste cache ${contentHash}:`, err);
            expandedPastedContents[key] = value;
          }
        } else {
          expandedPastedContents[key] = value;
        }
      }
    }

    // 处理图片：兼容多个版本的 Claude Code
    const images: string[] = [];

    if (record.sessionId) {
      // 方案1: Claude Code 2.0.55+ 从 projects/{project}/{sessionId}.jsonl 读取 base64 图片
      // 方案2: Claude Code 2.0+ 使用 image-cache/{sessionId} 目录
      const imageCacheDirNew = path.join(
        CLAUDE_DIR,
        "image-cache",
        record.sessionId,
      );

      // 方案3: 旧版本可能使用其他位置（兼容扩展）
      const imageCacheDirOld = path.join(CLAUDE_DIR, "images", record.sessionId);

      // 尝试多个可能的图片目录
      const possibleDirs = [imageCacheDirNew, imageCacheDirOld];

      // 优先方案：Claude Code 2.0.55+ 从 projects 目录提取 base64 图片
      const extractedImages = await extractImagesFromProjects(
        record.sessionId,
        record.project,
        savePath,
        record.display // 传入 display 文本用于识别图片编号
      );
      images.push(...extractedImages);

      // 如果方案1没有成功提取图片，继续尝试方案2和3（从 image-cache 目录）
      if (images.length === 0) {
        // 等待图片目录创建（最多等待3秒，针对某些版本延迟创建的情况）
        let waitCount = 0;
        while (waitCount < 30) {
          if (possibleDirs.some(dir => fs.existsSync(dir))) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          waitCount++;
        }

        try {
          for (const imageCacheDir of possibleDirs) {
          if (!fs.existsSync(imageCacheDir)) continue;

          // 再等待一小段时间，确保图片文件写入完成
          await new Promise((resolve) => setTimeout(resolve, 300));

          // 读取目录下的所有图片文件
          const allImageFiles = fs
            .readdirSync(imageCacheDir)
            .filter(
              (f: string) =>
                f.endsWith(".png") ||
                f.endsWith(".jpg") ||
                f.endsWith(".jpeg") ||
                f.endsWith(".gif") ||
                f.endsWith(".webp"),
            );

          if (allImageFiles.length > 0) {
            // 创建图片保存目录
            const imagesDir = path.join(savePath, "images", record.sessionId);
            if (!fs.existsSync(imagesDir)) {
              fs.mkdirSync(imagesDir, { recursive: true });
            }

            const recordTimestamp = new Date(record.timestamp).getTime();

            // 方案1: 如果 display 中有 [Image #N] 标记，使用精确匹配
            const imageMatches = record.display.match(/\[Image #(\d+)\]/g);
            if (imageMatches && imageMatches.length > 0) {
              const imageNumbers = imageMatches
                .map((match: string) => {
                  const num = match.match(/\d+/);
                  return num ? parseInt(num[0]) : null;
                })
                .filter((n: number | null) => n !== null) as number[];

              // 按文件名排序（自然排序: 1.png, 2.png, ... 10.png）
              const sortedImageFiles = allImageFiles.sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || "0");
                const numB = parseInt(b.match(/\d+/)?.[0] || "0");
                return numA - numB;
              });

              console.log(`[Image Matcher] 找到 ${imageNumbers.length} 个图片标记, ${sortedImageFiles.length} 个图片文件`);
              console.log(`[Image Matcher] 标记编号:`, imageNumbers);
              console.log(`[Image Matcher] 文件列表:`, sortedImageFiles);

              for (const imageNum of imageNumbers) {
                // 尝试两种映射方式以兼容不同版本
                // 方式1: [Image #1] -> 文件名 1.png（直接映射）
                let imageFile = sortedImageFiles.find(f => {
                  const fileNum = parseInt(f.match(/\d+/)?.[0] || "0");
                  return fileNum === imageNum;
                });

                // 方式2: [Image #1] -> 索引 0（数组索引映射，兼容旧版本）
                if (!imageFile) {
                  const imageIndex = imageNum - 1;
                  if (imageIndex >= 0 && imageIndex < sortedImageFiles.length) {
                    imageFile = sortedImageFiles[imageIndex];
                  }
                }

                if (imageFile) {
                  const srcPath = path.join(imageCacheDir, imageFile);
                  const destPath = path.join(imagesDir, imageFile);

                  try {
                    if (!fs.existsSync(destPath)) {
                      fs.copyFileSync(srcPath, destPath);
                      console.log(`[Image Copy] 成功复制: ${imageFile}`);
                    }
                    images.push(`images/${record.sessionId}/${imageFile}`);
                  } catch (err) {
                    console.error(`Failed to copy image ${imageFile}:`, err);
                  }
                }
              }
            } else {
              // 方案2: 没有标记时，使用时间戳匹配（前后 5 秒内的图片）
              console.log(`[Image Matcher] 无标记，使用时间戳匹配`);
              for (const imageFile of allImageFiles) {
                const srcPath = path.join(imageCacheDir, imageFile);
                const stat = fs.statSync(srcPath);
                const imageTimestamp = stat.mtimeMs;

                // 图片修改时间在记录时间戳前后 5 秒内，认为是当前记录的图片
                const timeDiff = Math.abs(imageTimestamp - recordTimestamp);
                if (timeDiff <= 5000) {
                  const destPath = path.join(imagesDir, imageFile);

                  try {
                    if (!fs.existsSync(destPath)) {
                      fs.copyFileSync(srcPath, destPath);
                      console.log(`[Image Copy] 时间戳匹配复制: ${imageFile}`);
                    }
                    images.push(`images/${record.sessionId}/${imageFile}`);
                  } catch (err) {
                    console.error(`Failed to copy image ${imageFile}:`, err);
                  }
                }
              }
            }

            // 找到图片后退出循环
            if (images.length > 0) break;
          }
        }
      } catch (err) {
        console.error("Failed to process images:", err);
      }
      } // 结束 if (images.length === 0)

      // 如果图片目录不存在，但 display 中有 [Image #N] 标记，记录警告
      if (images.length === 0 && record.display.includes("[Image #")) {
        console.warn(`[Image Warning] Session ${record.sessionId} 包含图片标记但未找到图片文件`);
      }
    }

    const logEntry = {
      timestamp,
      project: record.project,
      sessionId: record.sessionId,
      prompt: record.display,
      pastedContents: expandedPastedContents,
      images: images.length > 0 ? images : undefined,
    };

    fs.appendFileSync(filePath, JSON.stringify(logEntry) + "\n", "utf-8");

    // 发送到渲染进程（在图片处理完成后）
    // 构建完整的 record 对象，包含相对路径的图片和展开后的 pastedContents
    const enrichedRecord = {
      ...record,
      pastedContents: expandedPastedContents,
      images: images.length > 0 ? images : undefined,
    };

    if (mainWindow) {
      mainWindow.webContents.send("new-record", enrichedRecord);
    }
  } catch (error) {
    console.error("Failed to save record:", error);
  }
}

// 读取历史记录元数据（轻量级，只返回会话信息）
ipcMain.handle("read-history-metadata", async () => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    const files = fs
      .readdirSync(savePath)
      .filter((f: string) => f.endsWith(".jsonl"));

    if (files.length === 0) {
      return { success: true, sessions: [] };
    }

    // 使用 Map 按 sessionId 分组统计
    const sessionsMap = new Map<
      string,
      {
        sessionId: string;
        project: string;
        latestTimestamp: number;
        recordCount: number;
        firstTimestamp: number;
      }
    >();

    for (const file of files) {
      try {
        const filePath = path.join(savePath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const timestamp = new Date(record.timestamp).getTime();

            if (isNaN(timestamp) || !record.project) {
              continue;
            }

            const sessionId = record.sessionId || `single-${timestamp}`;

            if (!sessionsMap.has(sessionId)) {
              sessionsMap.set(sessionId, {
                sessionId,
                project: record.project,
                latestTimestamp: timestamp,
                firstTimestamp: timestamp,
                recordCount: 0,
              });
            }

            const session = sessionsMap.get(sessionId)!;
            session.recordCount++;
            session.latestTimestamp = Math.max(
              session.latestTimestamp,
              timestamp,
            );
            session.firstTimestamp = Math.min(
              session.firstTimestamp,
              timestamp,
            );
          } catch (e) {
            // 跳过无效记录
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError);
      }
    }

    const sessions = Array.from(sessionsMap.values()).sort(
      (a, b) => b.latestTimestamp - a.latestTimestamp,
    );

    return { success: true, sessions };
  } catch (error) {
    console.error("读取历史记录元数据时发生错误:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 读取指定会话的详细记录（按需加载）
ipcMain.handle("read-session-details", async (_, sessionId: string) => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    const files = fs
      .readdirSync(savePath)
      .filter((f: string) => f.endsWith(".jsonl"));

    if (files.length === 0) {
      return { success: true, records: [] };
    }

    const records: any[] = [];

    for (const file of files) {
      try {
        const filePath = path.join(savePath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const timestamp = new Date(record.timestamp).getTime();

            if (isNaN(timestamp) || !record.project) {
              continue;
            }

            const recordSessionId = record.sessionId || `single-${timestamp}`;

            // 只加载匹配的 sessionId
            if (recordSessionId !== sessionId) {
              continue;
            }

            // 处理粘贴内容：如果是旧格式（只有 contentHash），尝试读取实际内容
            let pastedContents = record.pastedContents || {};
            if (pastedContents && typeof pastedContents === "object") {
              const expandedContents: Record<string, any> = {};
              for (const [key, value] of Object.entries(pastedContents)) {
                if (
                  value &&
                  typeof value === "object" &&
                  (value as any).contentHash &&
                  !(value as any).content
                ) {
                  const contentHash = (value as any).contentHash;
                  const pasteFilePath = path.join(
                    CLAUDE_DIR,
                    "paste-cache",
                    `${contentHash}.txt`,
                  );

                  try {
                    if (fs.existsSync(pasteFilePath)) {
                      const actualContent = fs.readFileSync(
                        pasteFilePath,
                        "utf-8",
                      );
                      expandedContents[key] = {
                        ...value,
                        content: actualContent,
                      };
                    } else {
                      expandedContents[key] = value;
                    }
                  } catch (err) {
                    expandedContents[key] = value;
                  }
                } else {
                  expandedContents[key] = value;
                }
              }
              pastedContents = expandedContents;
            }

            // 🔥 关键修复：在读取历史记录时也提取图片
            let images = record.images || [];
            // 如果record中没有图片数据，但display中有[Image #]标记，尝试提取
            if (images.length === 0 && record.prompt && record.prompt.includes("[Image #")) {
              try {
                const extractedImages = await extractImagesFromProjects(
                  recordSessionId,
                  record.project,
                  savePath,
                  record.prompt // 传入 prompt 文本用于识别图片编号
                );
                images = extractedImages;
              } catch (err) {
                console.error("读取历史时提取图片失败:", err);
              }
            }

            records.push({
              timestamp,
              project: record.project,
              sessionId: recordSessionId,
              display: record.prompt || "",
              pastedContents,
              images,
            });
          } catch (e) {
            console.error("解析记录失败:", e);
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError);
      }
    }

    // 按时间倒序排序（最新的在前）
    records.sort((a, b) => b.timestamp - a.timestamp);

    return { success: true, records };
  } catch (error) {
    console.error("读取会话详情时发生错误:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 读取历史记录（保留旧接口以兼容）
ipcMain.handle("read-history", async () => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    const files = fs
      .readdirSync(savePath)
      .filter((f: string) => f.endsWith(".jsonl"));

    if (files.length === 0) {
      return { success: true, records: [] };
    }

    const records: any[] = [];
    const MAX_RECORDS = 1000; // 限制最大记录数，避免 IPC 消息过大

    for (const file of files) {
      if (records.length >= MAX_RECORDS) {
        break;
      }

      try {
        const filePath = path.join(savePath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line: string) => line.trim());

        for (const line of lines) {
          if (records.length >= MAX_RECORDS) break;

          try {
            const record = JSON.parse(line);
            // 转换时间戳格式（从 ISO 字符串转为毫秒数）
            const timestamp = new Date(record.timestamp).getTime();

            // 验证数据完整性
            if (isNaN(timestamp) || !record.project) {
              continue;
            }

            // 处理粘贴内容：如果是旧格式（只有 contentHash），尝试读取实际内容
            let pastedContents = record.pastedContents || {};
            if (pastedContents && typeof pastedContents === "object") {
              const expandedContents: Record<string, any> = {};
              for (const [key, value] of Object.entries(pastedContents)) {
                if (
                  value &&
                  typeof value === "object" &&
                  (value as any).contentHash &&
                  !(value as any).content
                ) {
                  const contentHash = (value as any).contentHash;
                  const pasteFilePath = path.join(
                    CLAUDE_DIR,
                    "paste-cache",
                    `${contentHash}.txt`,
                  );

                  try {
                    if (fs.existsSync(pasteFilePath)) {
                      const actualContent = fs.readFileSync(
                        pasteFilePath,
                        "utf-8",
                      );
                      expandedContents[key] = {
                        ...value,
                        content: actualContent,
                      };
                    } else {
                      expandedContents[key] = value;
                    }
                  } catch (err) {
                    expandedContents[key] = value;
                  }
                } else {
                  expandedContents[key] = value;
                }
              }
              pastedContents = expandedContents;
            }

            // 🔥 关键修复：在读取历史记录时也提取图片
            let images = record.images || [];
            const sessionId = record.sessionId || "";
            // 如果record中没有图片数据，但display中有[Image #]标记，尝试提取
            if (images.length === 0 && record.prompt && record.prompt.includes("[Image #")) {
              try {
                const extractedImages = await extractImagesFromProjects(
                  sessionId,
                  record.project,
                  savePath,
                  record.prompt // 传入 prompt 文本用于识别图片编号
                );
                images = extractedImages;
              } catch (err) {
                console.error("读取历史时提取图片失败:", err);
              }
            }

            records.push({
              timestamp,
              project: record.project,
              sessionId,
              display: record.prompt || "",
              pastedContents,
              images,
            });
          } catch (e) {
            console.error(
              "解析记录失败:",
              e,
              "行内容:",
              line.substring(0, 100),
            );
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError);
        // 继续处理其他文件
      }
    }

    return { success: true, records };
  } catch (error) {
    console.error("读取历史记录时发生错误:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 导出记录为 Markdown
ipcMain.handle("export-records", async (_, options: any) => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    // 读取所有 .jsonl 文件
    const files = fs.readdirSync(savePath).filter((f: string) => f.endsWith(".jsonl"));
    if (files.length === 0) {
      return { success: false, error: "没有找到记录文件" };
    }

    // 解析所有记录
    const allRecords: any[] = [];
    for (const file of files) {
      try {
        const filePath = path.join(savePath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line: string) => line.trim());

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const timestamp = new Date(record.timestamp).getTime();

            if (isNaN(timestamp) || !record.project) {
              continue;
            }

            allRecords.push({
              timestamp,
              project: record.project,
              sessionId: record.sessionId || "",
              display: record.prompt || "",
              pastedContents: record.pastedContents || {},
              images: record.images || [],
            });
          } catch (e) {
            // 跳过无效记录
          }
        }
      } catch (fileError) {
        console.error(`读取文件 ${file} 失败:`, fileError);
      }
    }

    if (allRecords.length === 0) {
      return { success: false, error: "没有有效的记录" };
    }

    // 过滤记录
    let filteredRecords = allRecords;

    // 按 sessionIds 过滤
    if (options.sessionIds && options.sessionIds.length > 0) {
      filteredRecords = filteredRecords.filter((r) =>
        options.sessionIds.includes(r.sessionId),
      );
    }

    // 按日期范围过滤
    if (options.startDate) {
      filteredRecords = filteredRecords.filter(
        (r) => r.timestamp >= options.startDate,
      );
    }
    if (options.endDate) {
      filteredRecords = filteredRecords.filter(
        (r) => r.timestamp <= options.endDate,
      );
    }

    if (filteredRecords.length === 0) {
      return { success: false, error: "筛选后没有记录" };
    }

    // 按时间排序
    filteredRecords.sort((a, b) => a.timestamp - b.timestamp);

    // 按会话分组
    const sessions = new Map<string, any[]>();
    for (const record of filteredRecords) {
      const sessionId = record.sessionId || `single-${record.timestamp}`;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, []);
      }
      sessions.get(sessionId)!.push(record);
    }

    // 生成 Markdown 内容
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");

    let markdown = "# Claude Code 对话记录导出\n\n";
    markdown += `**导出时间**: ${now.toLocaleString("zh-CN")}\n\n`;
    markdown += `**记录总数**: ${filteredRecords.length} 条对话\n\n`;
    markdown += `**会话总数**: ${sessions.size} 个会话\n\n`;
    markdown += "---\n\n";

    // 遍历每个会话
    let sessionIndex = 1;
    for (const [sessionId, records] of sessions) {
      const firstRecord = records[0];
      const projectName = path.basename(firstRecord.project);

      markdown += `## 会话 ${sessionIndex}: ${projectName}\n\n`;

      if (sessionId && !sessionId.startsWith("single-")) {
        markdown += `**Session ID**: \`${sessionId}\`\n\n`;
      }

      markdown += `**项目路径**: \`${firstRecord.project}\`\n\n`;
      markdown += `**对话数量**: ${records.length} 条\n\n`;
      markdown += `**时间范围**: ${new Date(records[0].timestamp).toLocaleString("zh-CN")} ~ ${new Date(records[records.length - 1].timestamp).toLocaleString("zh-CN")}\n\n`;
      markdown += "---\n\n";

      // 遍历每条对话
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        markdown += `### 对话 #${i + 1}\n\n`;
        markdown += `**时间**: ${new Date(record.timestamp).toLocaleString("zh-CN")}\n\n`;
        markdown += "**内容**:\n\n";
        markdown += "```\n";
        markdown += record.display;
        markdown += "\n```\n\n";

        // 如果有附加内容
        if (
          record.pastedContents &&
          Object.keys(record.pastedContents).length > 0
        ) {
          markdown += "**附加内容**:\n\n";
          for (const [key, value] of Object.entries(record.pastedContents)) {
            markdown += `- 附件 ${key}:\n`;
            if (typeof value === "string") {
              markdown += "```\n";
              markdown += value;
              markdown += "\n```\n\n";
            } else if (
              value &&
              typeof value === "object" &&
              (value as any).content
            ) {
              // 新格式：包含 content 字段
              markdown += "```\n";
              markdown += (value as any).content;
              markdown += "\n```\n\n";
            } else {
              markdown += "```json\n";
              markdown += JSON.stringify(value, null, 2);
              markdown += "\n```\n\n";
            }
          }
        }

        // 如果有图片
        if (record.images && record.images.length > 0) {
          markdown += "**图片**:\n\n";
          for (const imagePath of record.images) {
            markdown += `![图片](${imagePath})\n\n`;
          }
        }

        markdown += "---\n\n";
      }

      sessionIndex++;
    }

    // 让用户选择保存位置
    const result = await dialog.showSaveDialog({
      title: "保存 Markdown 文件",
      defaultPath: `claude-code-export-${dateStr}-${timeStr}.md`,
      filters: [
        { name: "Markdown Files", extensions: ["md"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: "用户取消了保存" };
    }

    // 写入文件
    fs.writeFileSync(result.filePath, markdown, "utf-8");

    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error("导出记录失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// AI 总结功能
ipcMain.handle(
  "summarize-records",
  async (event, request: { records: any[]; type: "brief" | "detailed" }) => {
    try {
      // 获取 AI 总结设置（使用独立的 aiSummary 配置）
      const aiSummarySettings = store.get("aiSummary") as any;

      if (!aiSummarySettings || !aiSummarySettings.enabled) {
        return {
          success: false,
          error: "AI 总结功能未启用，请先在设置中启用",
        };
      }

      const provider: "groq" | "deepseek" | "gemini" | "custom" =
        aiSummarySettings.provider || "groq";
      const currentConfig = aiSummarySettings.providers?.[provider];

      if (!currentConfig || !currentConfig.apiKey) {
        const providerNames: Record<
          "groq" | "deepseek" | "gemini" | "custom",
          string
        > = {
          groq: "Groq",
          deepseek: "DeepSeek",
          gemini: "Google Gemini",
          custom: "自定义",
        };
        return {
          success: false,
          error: `未配置 ${providerNames[provider] || "AI"} API Key，请前往设置页面配置`,
        };
      }

      // 验证 API Key 格式（只对特定提供商验证）
      if (provider === "deepseek" && !currentConfig.apiKey.startsWith("sk-")) {
        return {
          success: false,
          error: 'API Key 格式不正确，DeepSeek API Key 应以 "sk-" 开头',
        };
      }

      if (provider === "groq" && !currentConfig.apiKey.startsWith("gsk_")) {
        return {
          success: false,
          error: 'API Key 格式不正确，Groq API Key 应以 "gsk_" 开头',
        };
      }

      // 自定义提供商需要验证必填字段
      if (provider === "custom") {
        if (!currentConfig.apiBaseUrl) {
          return {
            success: false,
            error: "自定义提供商需要配置 API 地址",
          };
        }
        if (!currentConfig.model) {
          return {
            success: false,
            error: "自定义提供商需要配置模型名称",
          };
        }
      }

      if (!request.records || request.records.length === 0) {
        return {
          success: false,
          error: "没有可总结的记录",
        };
      }

      // 构建提示词
      const conversations = request.records
        .map((record: any, index: number) => {
          return `[对话 ${index + 1}]\n时间: ${new Date(record.timestamp).toLocaleString("zh-CN")}\n内容: ${record.display}`;
        })
        .join("\n\n---\n\n");

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

${conversations}`,
      };

      const prompt = templates[request.type] || templates.detailed;

      // 调用 AI API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        // Gemini 使用不同的 API 格式（注意：自定义提供商默认使用 OpenAI 格式）
        if (provider === "gemini") {
          const response = await httpRequest<Response>({
            url: `${currentConfig.apiBaseUrl}/models/${currentConfig.model}:generateContent?key=${currentConfig.apiKey}`,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text:
                        "你是一个专业的技术对话总结助手，擅长提取关键信息和技术要点。请使用简洁清晰的中文进行总结。\n\n" +
                        prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2000,
              },
            }),
            signal: controller.signal,
            webContents: event.sender, // 传递 webContents 以在 DevTools 中显示日志
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as any;
            return {
              success: false,
              error: `Gemini API 错误: ${response.status} ${errorData.error?.message || response.statusText}`,
            };
          }

          const data = await response.json() as any;
          const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!summary) {
            return {
              success: false,
              error: "Gemini API 返回格式异常",
            };
          }

          return {
            success: true,
            summary: summary.trim(),
            tokensUsed: data.usageMetadata?.totalTokenCount || 0,
          };
        }

        // OpenAI 兼容格式 (Groq, DeepSeek, 自定义)
        // 注意：自定义提供商默认使用 OpenAI 格式，用户可自行配置兼容的 API
        const response = await httpRequest<Response>({
          url: `${currentConfig.apiBaseUrl}/chat/completions`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: currentConfig.model,
            messages: [
              {
                role: "system",
                content:
                  "你是一个专业的技术对话总结助手，擅长提取关键信息和技术要点。请使用简洁清晰的中文进行总结。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
          }),
          signal: controller.signal,
          webContents: event.sender, // 传递 webContents 以在 DevTools 中显示日志
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            (errorData as any).error?.message || response.statusText;

          // 针对不同错误码提供友好提示
          let userFriendlyError = "";
          switch (response.status) {
            case 401:
              userFriendlyError = "API Key 无效或已过期，请检查并重新配置";
              break;
            case 402:
              userFriendlyError =
                "DeepSeek 账户余额不足，请前往 https://platform.deepseek.com 充值";
              break;
            case 429:
              userFriendlyError = "API 调用频率超限，请稍后再试";
              break;
            case 500:
            case 502:
            case 503:
              userFriendlyError = "DeepSeek 服务暂时不可用，请稍后再试";
              break;
            default:
              userFriendlyError = `API 错误 (${response.status}): ${errorMessage}`;
          }

          return {
            success: false,
            error: userFriendlyError,
          };
        }

        const data = await response.json() as any;

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          return {
            success: false,
            error: "DeepSeek API 返回格式异常",
          };
        }

        return {
          success: true,
          summary: data.choices[0].message.content.trim(),
          tokensUsed: data.usage?.total_tokens || 0,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
          return {
            success: false,
            error: "请求超时，请检查网络连接",
          };
        }

        return {
          success: false,
          error: error.message || "未知错误",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "总结失败",
      };
    }
  },
);

// 流式 AI 总结功能
ipcMain.handle(
  "summarize-records-stream",
  async (event, request: { records: any[]; type: "brief" | "detailed" }) => {
    try {
      // 获取 AI 总结设置（使用独立的 aiSummary 配置）
      const aiSummarySettings = store.get("aiSummary") as any;

      if (!aiSummarySettings || !aiSummarySettings.enabled) {
        event.sender.send(
          "summary-stream-error",
          "AI 总结功能未启用，请先在设置中启用",
        );
        return;
      }

      const provider: "groq" | "deepseek" | "gemini" | "custom" =
        aiSummarySettings.provider || "groq";
      const currentConfig = aiSummarySettings.providers?.[provider];

      if (!currentConfig || !currentConfig.apiKey) {
        const providerNames: Record<"groq" | "deepseek" | "gemini", string> = {
          groq: "Groq",
          deepseek: "DeepSeek",
          gemini: "Google Gemini",
        };
        event.sender.send(
          "summary-stream-error",
          `未配置 ${providerNames[provider as "groq" | "deepseek" | "gemini"] || "AI"} API Key，请前往设置页面配置`,
        );
        return;
      }

      if (!request.records || request.records.length === 0) {
        event.sender.send("summary-stream-error", "没有可总结的记录");
        return;
      }

      // 构建提示词
      const conversations = request.records
        .map((record: any, index: number) => {
          return `[对话 ${index + 1}]\n时间: ${new Date(record.timestamp).toLocaleString("zh-CN")}\n内容: ${record.display}`;
        })
        .join("\n\n---\n\n");

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

${conversations}`,
      };

      const prompt = templates[request.type] || templates.detailed;

      // Gemini 不支持流式
      if (provider === "gemini") {
        event.sender.send(
          "summary-stream-error",
          "Gemini 暂不支持流式输出，请使用普通总结",
        );
        return;
      }

      // OpenAI 兼容格式的流式请求 (Groq, DeepSeek, 自定义)
      // 自定义提供商需要确保 API 兼容 OpenAI 的流式格式
      const response = await httpRequest<Response>({
        url: `${currentConfig.apiBaseUrl}/chat/completions`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: currentConfig.model,
          messages: [
            {
              role: "system",
              content:
                "你是一个专业的技术对话总结助手，擅长提取关键信息和技术要点。请使用简洁清晰的中文进行总结。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
          stream: true, // 启用流式输出
        }),
        webContents: event.sender, // 传递 webContents 以在 DevTools 中显示日志
      });

      if (!response.ok) {
        await response.json().catch(() => ({}));
        event.sender.send(
          "summary-stream-error",
          `API 错误: ${response.status}`,
        );
        return;
      }

      // 确保 body 是 Readable stream
      if (!response.body || typeof response.body === "string") {
        event.sender.send("summary-stream-error", "响应格式错误");
        return;
      }

      // 读取流式响应 - 使用 Node.js Stream API
      let buffer = "";
      (response.body as any)
        .on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");

          // 保留最后一个不完整的行
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;

            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();

              if (data === "[DONE]") {
                event.sender.send("summary-stream-complete");
                return;
              }

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  event.sender.send("summary-stream-chunk", content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        })
        .on("end", () => {
          event.sender.send("summary-stream-complete");
        })
        .on("error", (error: Error) => {
          event.sender.send(
            "summary-stream-error",
            error.message || "流式读取失败",
          );
        });
    } catch (error: any) {
      event.sender.send("summary-stream-error", error.message || "总结失败");
    }
  },
);

// 获取配置文件路径
ipcMain.handle("get-config-path", async () => {
  return store.path;
});

// 在默认编辑器中打开配置文件
ipcMain.handle("open-config-file", async () => {
  try {
    const configPath = store.path;
    await shell.openPath(configPath);
  } catch (error) {
    console.error("打开配置文件失败:", error);
    throw error;
  }
});

// 在文件管理器中显示配置文件
ipcMain.handle("show-config-in-folder", async () => {
  try {
    const configPath = store.path;
    shell.showItemInFolder(configPath);
  } catch (error) {
    console.error("显示配置文件失败:", error);
    throw error;
  }
});

// 在文件管理器中显示 Claude Code 配置文件
ipcMain.handle("show-claude-config-in-folder", async () => {
  try {
    shell.showItemInFolder(SETTINGS_FILE);
  } catch (error) {
    console.error("显示 Claude Code 配置文件失败:", error);
    throw error;
  }
});

// 删除单条历史记录（包括相关图片）
ipcMain.handle(
  "delete-record",
  async (_, sessionId: string, timestamp: number) => {
    try {
      const savePath = store.get("savePath", "") as string;
      if (!savePath) {
        return { success: false, error: "未配置保存路径" };
      }

      if (!fs.existsSync(savePath)) {
        return { success: false, error: "保存路径不存在" };
      }

      // 1. 找到包含该记录的文件
      const files = fs
        .readdirSync(savePath)
        .filter((f: string) => f.endsWith(".jsonl"));
      let recordFound = false;
      let recordToDelete: any = null;

      for (const file of files) {
        const filePath = path.join(savePath, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line: string) => line.trim());
        const newLines: string[] = [];
        let fileModified = false;

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            const recordTimestamp = new Date(record.timestamp).getTime();
            const recordSessionId =
              record.sessionId || `single-${recordTimestamp}`;

            // 找到要删除的记录
            if (
              recordSessionId === sessionId &&
              recordTimestamp === timestamp
            ) {
              recordFound = true;
              recordToDelete = record;
              fileModified = true;
              // 不添加到 newLines，即删除这条记录
              continue;
            }

            newLines.push(line);
          } catch (e) {
            // 保留无法解析的行
            newLines.push(line);
          }
        }

        // 如果文件被修改，写回文件
        if (fileModified) {
          if (newLines.length === 0) {
            // 如果文件没有记录了，删除文件
            fs.unlinkSync(filePath);
          } else {
            fs.writeFileSync(filePath, newLines.join("\n") + "\n", "utf-8");
          }
        }
      }

      if (!recordFound) {
        return { success: false, error: "未找到该记录" };
      }

      // 2. 删除相关图片
      if (
        recordToDelete &&
        recordToDelete.images &&
        Array.isArray(recordToDelete.images)
      ) {
        const imagesDir = path.join(savePath, "images");
        for (const imagePath of recordToDelete.images) {
          try {
            const fullImagePath = path.join(
              imagesDir,
              path.basename(imagePath),
            );
            if (fs.existsSync(fullImagePath)) {
              fs.unlinkSync(fullImagePath);
            }
          } catch (error) {
            console.error("删除图片失败:", error);
            // 继续删除其他图片，不中断流程
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error("删除记录失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 读取应用配置文件内容
ipcMain.handle("read-app-config-file", async () => {
  try {
    const configPath = store.path;
    const content = fs.readFileSync(configPath, "utf-8");
    return content;
  } catch (error) {
    console.error("读取配置文件失败:", error);
    throw new Error("读取配置文件失败");
  }
});

// 保存应用配置文件内容
ipcMain.handle("save-app-config-file", async (_, content: string) => {
  try {
    // 验证 JSON 格式
    const parsed = JSON.parse(content);

    // 保存到文件
    const configPath = store.path;
    fs.writeFileSync(configPath, content, "utf-8");

    // 重新加载 store
    store.store = parsed;
  } catch (error) {
    console.error("保存配置文件失败:", error);
    if (error instanceof SyntaxError) {
      throw new Error("JSON 格式错误");
    }
    throw new Error("保存配置文件失败");
  }
});

// 清除缓存（清空保存路径下的所有数据）
ipcMain.handle("clear-cache", async () => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    // 读取目录下的所有文件
    const files = fs.readdirSync(savePath);
    let deletedCount = 0;

    // 删除所有 .jsonl 文件和 images 目录
    for (const file of files) {
      const filePath = path.join(savePath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && file.endsWith(".jsonl")) {
        fs.unlinkSync(filePath);
        deletedCount++;
      } else if (stat.isDirectory() && file === "images") {
        // 递归删除 images 目录
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("清除缓存失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 按时间范围清理缓存（保留 retainMs 内的数据，删除更早的）
ipcMain.handle("clear-cache-by-age", async (_, retainMs: number) => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    if (!fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    const cutoffTime = Date.now() - retainMs;
    let deletedCount = 0;
    const files = fs.readdirSync(savePath);

    for (const file of files) {
      const filePath = path.join(savePath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && file.endsWith(".jsonl")) {
        // 读取 JSONL 文件，过滤掉超期的记录
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());
        const retainedLines: string[] = [];
        let removedInFile = 0;

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.timestamp && record.timestamp >= cutoffTime) {
              retainedLines.push(line);
            } else {
              removedInFile++;
            }
          } catch {
            // 无法解析的行保留
            retainedLines.push(line);
          }
        }

        if (removedInFile > 0) {
          if (retainedLines.length > 0) {
            fs.writeFileSync(filePath, retainedLines.join("\n") + "\n", "utf-8");
          } else {
            fs.unlinkSync(filePath);
          }
          deletedCount += removedInFile;
        }
      }
    }

    // 清理过期的图片缓存目录
    const imagesDir = path.join(savePath, "images");
    if (fs.existsSync(imagesDir)) {
      const sessionDirs = fs.readdirSync(imagesDir);
      for (const sessionDir of sessionDirs) {
        const sessionDirPath = path.join(imagesDir, sessionDir);
        const sessionStat = fs.statSync(sessionDirPath);
        if (sessionStat.isDirectory() && sessionStat.mtimeMs < cutoffTime) {
          fs.rmSync(sessionDirPath, { recursive: true, force: true });
        }
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    console.error("按时间范围清理缓存失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 获取自动清理状态
ipcMain.handle("get-auto-cleanup-status", async () => {
  const autoCleanup = store.get("autoCleanup", null) as any;
  if (!autoCleanup || !autoCleanup.enabled) {
    return { enabled: false, nextCleanupTime: null, remainingMs: null };
  }

  const now = Date.now();
  const nextCleanupTime = autoCleanup.nextCleanupTime || null;
  const remainingMs = nextCleanupTime ? Math.max(0, nextCleanupTime - now) : null;

  return { enabled: true, nextCleanupTime, remainingMs };
});

// 手动触发自动清理（立即执行一次清理）
ipcMain.handle("trigger-auto-cleanup", async () => {
  try {
    const config = store.get("autoCleanup", null) as any;
    if (!config || !config.enabled) {
      return { success: false, error: "自动清理未启用" };
    }

    const savePath = store.get("savePath", "") as string;
    if (!savePath || !fs.existsSync(savePath)) {
      return { success: false, error: "保存路径不存在" };
    }

    const cutoffTime = Date.now() - config.retainMs;
    let deletedCount = 0;
    const files = fs.readdirSync(savePath);

    for (const file of files) {
      const filePath = path.join(savePath, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile() && file.endsWith(".jsonl")) {
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter((line) => line.trim());
        const retainedLines: string[] = [];
        let removedInFile = 0;

        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.timestamp && record.timestamp >= cutoffTime) {
              retainedLines.push(line);
            } else {
              removedInFile++;
            }
          } catch {
            retainedLines.push(line);
          }
        }

        if (removedInFile > 0) {
          if (retainedLines.length > 0) {
            fs.writeFileSync(filePath, retainedLines.join("\n") + "\n", "utf-8");
          } else {
            fs.unlinkSync(filePath);
          }
          deletedCount += removedInFile;
        }
      }
    }

    // 清理过期图片
    const imagesDir = path.join(savePath, "images");
    if (fs.existsSync(imagesDir)) {
      const sessionDirs = fs.readdirSync(imagesDir);
      for (const sessionDir of sessionDirs) {
        const sessionDirPath = path.join(imagesDir, sessionDir);
        const sessionStat = fs.statSync(sessionDirPath);
        if (sessionStat.isDirectory() && sessionStat.mtimeMs < cutoffTime) {
          fs.rmSync(sessionDirPath, { recursive: true, force: true });
        }
      }
    }

    // 更新下次清理时间
    const newNextCleanupTime = Date.now() + config.intervalMs;
    store.set("autoCleanup.lastCleanupTime", Date.now());
    store.set("autoCleanup.nextCleanupTime", newNextCleanupTime);

    console.log(`[手动清理] 完成，删除了 ${deletedCount} 条记录`);

    // 重新启动定时器（重置倒计时）
    setupAutoCleanupTimer();

    // 通知渲染进程
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auto-cleanup-executed", {
        deletedCount,
        nextCleanupTime: newNextCleanupTime,
      });
    }

    return { success: true, deletedCount, nextCleanupTime: newNextCleanupTime };
  } catch (error) {
    console.error("[手动清理] 执行失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

/**
 * 自动清理缓存定时器管理
 * 启动、停止和执行自动清理任务
 */
const setupAutoCleanupTimer = () => {
  // 清除旧定时器
  if (autoCleanupTimer) {
    clearInterval(autoCleanupTimer);
    autoCleanupTimer = null;
  }
  if (autoCleanupTickTimer) {
    clearInterval(autoCleanupTickTimer);
    autoCleanupTickTimer = null;
  }

  const autoCleanup = store.get("autoCleanup", null) as any;
  if (!autoCleanup || !autoCleanup.enabled) {
    return;
  }

  const now = Date.now();

  // 确定下次清理时间
  let nextCleanupTime = autoCleanup.nextCleanupTime;
  if (!nextCleanupTime || nextCleanupTime <= now) {
    // 如果没有设置或已过期，从现在开始计算
    nextCleanupTime = now + autoCleanup.intervalMs;
    store.set("autoCleanup.nextCleanupTime", nextCleanupTime);
  }

  // 执行清理的函数
  const executeCleanup = async () => {
    try {
      const config = store.get("autoCleanup", null) as any;
      if (!config || !config.enabled) return;

      const savePath = store.get("savePath", "") as string;
      if (!savePath || !fs.existsSync(savePath)) return;

      const cutoffTime = Date.now() - config.retainMs;
      let deletedCount = 0;
      const files = fs.readdirSync(savePath);

      for (const file of files) {
        const filePath = path.join(savePath, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && file.endsWith(".jsonl")) {
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter((line) => line.trim());
          const retainedLines: string[] = [];
          let removedInFile = 0;

          for (const line of lines) {
            try {
              const record = JSON.parse(line);
              if (record.timestamp && record.timestamp >= cutoffTime) {
                retainedLines.push(line);
              } else {
                removedInFile++;
              }
            } catch {
              retainedLines.push(line);
            }
          }

          if (removedInFile > 0) {
            if (retainedLines.length > 0) {
              fs.writeFileSync(filePath, retainedLines.join("\n") + "\n", "utf-8");
            } else {
              fs.unlinkSync(filePath);
            }
            deletedCount += removedInFile;
          }
        }
      }

      // 清理过期图片
      const imagesDir = path.join(savePath, "images");
      if (fs.existsSync(imagesDir)) {
        const sessionDirs = fs.readdirSync(imagesDir);
        for (const sessionDir of sessionDirs) {
          const sessionDirPath = path.join(imagesDir, sessionDir);
          const sessionStat = fs.statSync(sessionDirPath);
          if (sessionStat.isDirectory() && sessionStat.mtimeMs < cutoffTime) {
            fs.rmSync(sessionDirPath, { recursive: true, force: true });
          }
        }
      }

      // 更新状态
      const newNextCleanupTime = Date.now() + config.intervalMs;
      store.set("autoCleanup.lastCleanupTime", Date.now());
      store.set("autoCleanup.nextCleanupTime", newNextCleanupTime);

      console.log(`[自动清理] 完成，删除了 ${deletedCount} 条记录，下次清理时间: ${new Date(newNextCleanupTime).toLocaleString()}`);

      // 通知渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("auto-cleanup-executed", {
          deletedCount,
          nextCleanupTime: newNextCleanupTime,
        });
      } else {
        console.warn("[自动清理] 主窗口不可用，无法发送清理完成通知");
      }

      // 清理完成后，重新调度下次清理（使用 setTimeout 而不是 setInterval，确保时间准确）
      scheduleNextCleanup(config.intervalMs);
    } catch (error) {
      console.error("[自动清理] 执行失败:", error);
      // 通知渲染进程清理失败（如果窗口可用）
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("auto-cleanup-error", {
          error: (error as Error).message,
        });
      }
      // 即使失败也要调度下次清理
      const config = store.get("autoCleanup", null) as any;
      if (config && config.enabled) {
        scheduleNextCleanup(config.intervalMs);
      }
    }
  };

  // 调度下次清理
  const scheduleNextCleanup = (intervalMs: number) => {
    if (autoCleanupTimer) {
      clearTimeout(autoCleanupTimer);
      autoCleanupTimer = null;
    }
    autoCleanupTimer = setTimeout(executeCleanup, intervalMs) as any;
  };

  // 计算首次执行的延���
  const initialDelay = Math.max(0, nextCleanupTime - now);

  // 设置首次执行
  setTimeout(executeCleanup, initialDelay);

  // 每秒向渲染进程发送倒计时更新
  autoCleanupTickTimer = setInterval(() => {
    const currentConfig = store.get("autoCleanup", null) as any;
    if (!currentConfig || !currentConfig.enabled) {
      // 配置已禁用，停止发送更新
      if (autoCleanupTickTimer) {
        clearInterval(autoCleanupTickTimer);
        autoCleanupTickTimer = null;
      }
      return;
    }

    const currentNextTime = currentConfig.nextCleanupTime;
    if (!currentNextTime) return;

    const remaining = Math.max(0, currentNextTime - Date.now());

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("auto-cleanup-tick", {
        nextCleanupTime: currentNextTime,
        remainingMs: remaining,
      });
    } else if (mainWindow && mainWindow.isDestroyed()) {
      console.warn("[自动清理] 主窗口已销毁，无法发送倒计时更新");
    }
  }, 1000);

  console.log(`[自动清理] 定时器已启动，间隔: ${autoCleanup.intervalMs}ms，保留: ${autoCleanup.retainMs}ms，下次执行: ${new Date(nextCleanupTime).toLocaleString()}`);
};

// 卸载应用
ipcMain.handle("uninstall-app", async () => {
  try {
    // 停止文件监控
    if (historyWatcher) {
      historyWatcher.close();
      historyWatcher = null;
    }

    // 获取配置文件路径
    const configPath = store.path;
    const configDir = path.dirname(configPath);

    // 删除应用配置文件
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }

    // 删除 Claude Code 配置备份文件
    try {
      if (fs.existsSync(CLAUDE_DIR)) {
        const files = fs.readdirSync(CLAUDE_DIR);
        files.forEach((file: string) => {
          // 只删除备份文件，保留 settings.json 和 history.jsonl
          if (file.startsWith("settings.backup-") && file.endsWith(".json")) {
            const backupPath = path.join(CLAUDE_DIR, file);
            if (fs.existsSync(backupPath)) {
              fs.unlinkSync(backupPath);
            }
          }
        });
      }
    } catch (err) {
      console.error("删除备份文件失败:", err);
      // 继续执行，不阻断卸载流程
    }

    // 删除应用配置目录（如果为空）
    try {
      if (fs.existsSync(configDir)) {
        const files = fs.readdirSync(configDir);
        if (files.length === 0) {
          fs.rmdirSync(configDir);
        }
      }
    } catch (err) {
      // 忽略删除目录的错误
    }

    // 延迟退出，确保响应已发送
    setTimeout(() => {
      app.quit();
    }, 500);

    return { success: true };
  } catch (error) {
    console.error("卸载应用失败:", error);
    throw error;
  }
});

// 打开开发者工具
ipcMain.handle("open-devtools", async () => {
  try {
    if (mainWindow) {
      mainWindow.webContents.openDevTools();
      return { success: true };
    }
    return { success: false, error: "窗口不存在" };
  } catch (error) {
    console.error("打开开发者工具失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 读取图片文件（返回 base64）
ipcMain.handle("read-image", async (_, imagePath: string) => {
  try {
    const savePath = store.get("savePath", "") as string;
    if (!savePath) {
      return { success: false, error: "未配置保存路径" };
    }

    const fullPath = path.join(savePath, imagePath);

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: "图片文件不存在" };
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const base64 = imageBuffer.toString("base64");

    // 检测图片类型
    let mimeType = "image/png";
    if (imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (imagePath.endsWith(".gif")) {
      mimeType = "image/gif";
    }

    return {
      success: true,
      data: `data:${mimeType};base64,${base64}`,
    };
  } catch (error) {
    console.error("读取图片失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 读取任意文件内容（用于代码编辑器查看）
ipcMain.handle("read-file-content", async (_, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "文件不存在" };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("读取文件失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 保存文件内容（用于代码编辑器保存）
ipcMain.handle(
  "save-file-content",
  async (_, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (error) {
      console.error("保存文件失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 在系统默认编辑器中打开文件
ipcMain.handle("open-file-in-editor", async (_, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) {
      return { success: false, error: "文件不存在" };
    }
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    console.error("打开文件失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// ==================== Claude Code 配置备份管理 ====================

// 提取配置信息
function extractConfigInfo(configContent: string): {
  model?: string;
  baseUrl?: string;
  hasApiKey: boolean;
} {
  try {
    const config = JSON.parse(configContent);
    return {
      model: config.env?.ANTHROPIC_MODEL || config.model,
      baseUrl: config.env?.ANTHROPIC_BASE_URL || config.baseUrl,
      hasApiKey: !!(config.env?.ANTHROPIC_API_KEY || config.apiKey),
    };
  } catch {
    return { hasApiKey: false };
  }
}

// 获取备份文件路径
function getBackupFilePath(id: number): string {
  return path.join(CLAUDE_DIR, `settings.backup-${id}.json`);
}

// 列出所有备份
ipcMain.handle("list-claude-config-backups", async () => {
  try {
    const backups = store.get("claudeConfigBackups", []) as any[];

    // 验证备份文件是否存在，并更新自动识别信息
    const validBackups = backups.filter((backup) => {
      const filePath = getBackupFilePath(backup.id);
      if (!fs.existsSync(filePath)) {
        return false;
      }

      // 更新自动识别信息
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        backup.autoDetectedInfo = extractConfigInfo(content);
      } catch {
        // 忽略读取错误
      }

      return true;
    });

    // 保存清理后的备份列表
    store.set("claudeConfigBackups", validBackups);

    return validBackups;
  } catch (error) {
    console.error("列出备份失败:", error);
    return [];
  }
});

// 创建备份
ipcMain.handle("create-claude-config-backup", async (_, name: string) => {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { success: false, error: "配置文件不存在" };
    }

    // 读取当前配置
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");

    // 验证 JSON 格式
    JSON.parse(content);

    // 获取现有备份列表
    const backups = store.get("claudeConfigBackups", []) as any[];

    // 生成新的备份ID
    const maxId =
      backups.length > 0 ? Math.max(...backups.map((b) => b.id)) : 0;
    const newId = maxId + 1;

    // 创建备份文件
    const backupFilePath = getBackupFilePath(newId);
    fs.writeFileSync(backupFilePath, content, "utf-8");

    // 创建备份元数据
    const backup = {
      id: newId,
      name: name || `备份 ${newId}`,
      autoDetectedInfo: extractConfigInfo(content),
      isActive: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 保存到 store
    backups.push(backup);
    store.set("claudeConfigBackups", backups);

    return { success: true, backup };
  } catch (error) {
    console.error("创建备份失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 删除备份
ipcMain.handle("delete-claude-config-backup", async (_, id: number) => {
  try {
    const backups = store.get("claudeConfigBackups", []) as any[];
    const backup = backups.find((b) => b.id === id);

    if (!backup) {
      return { success: false, error: "备份不存在" };
    }

    if (backup.isActive) {
      return { success: false, error: "无法删除当前激活的配置" };
    }

    // 删除备份文件
    const backupFilePath = getBackupFilePath(id);
    if (fs.existsSync(backupFilePath)) {
      fs.unlinkSync(backupFilePath);
    }

    // 从 store 中移除
    const newBackups = backups.filter((b) => b.id !== id);
    store.set("claudeConfigBackups", newBackups);

    return { success: true };
  } catch (error) {
    console.error("删除备份失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 切换配置
ipcMain.handle("switch-claude-config-backup", async (_, id: number) => {
  try {
    const backups = store.get("claudeConfigBackups", []) as any[];
    const targetBackup = backups.find((b) => b.id === id);

    if (!targetBackup) {
      return { success: false, error: "备份不存在" };
    }

    const backupFilePath = getBackupFilePath(id);
    if (!fs.existsSync(backupFilePath)) {
      return { success: false, error: "备份文件不存在" };
    }

    // 读取目标备份内容
    const backupContent = fs.readFileSync(backupFilePath, "utf-8");

    // 验证 JSON 格式
    JSON.parse(backupContent);

    // 如果当前有激活的备份，取消激活状态
    const currentActive = backups.find((b) => b.isActive);
    if (currentActive) {
      currentActive.isActive = false;
    }

    // 将当前 settings.json 保存为备份（如果不是从备份切换来的）
    if (!currentActive && fs.existsSync(SETTINGS_FILE)) {
      const currentContent = fs.readFileSync(SETTINGS_FILE, "utf-8");

      // 生成新的备份ID
      const maxId =
        backups.length > 0 ? Math.max(...backups.map((b) => b.id)) : 0;
      const newId = maxId + 1;

      // 创建备份文件
      const newBackupFilePath = getBackupFilePath(newId);
      fs.writeFileSync(newBackupFilePath, currentContent, "utf-8");

      // 创建备份元数据
      const newBackup = {
        id: newId,
        name: `切换前的配置`,
        autoDetectedInfo: extractConfigInfo(currentContent),
        isActive: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      backups.push(newBackup);
    }

    // 将目标备份内容写入 settings.json
    fs.writeFileSync(SETTINGS_FILE, backupContent, "utf-8");

    // 标记为激活状态
    targetBackup.isActive = true;
    targetBackup.updatedAt = Date.now();

    // 保存到 store
    store.set("claudeConfigBackups", backups);

    return { success: true };
  } catch (error) {
    console.error("切换配置失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 更新备份名称
ipcMain.handle(
  "update-claude-config-backup-name",
  async (_, id: number, name: string) => {
    try {
      const backups = store.get("claudeConfigBackups", []) as any[];
      const backup = backups.find((b) => b.id === id);

      if (!backup) {
        return { success: false, error: "备份不存在" };
      }

      backup.name = name;
      backup.updatedAt = Date.now();

      store.set("claudeConfigBackups", backups);

      return { success: true };
    } catch (error) {
      console.error("更新备份名称失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 获取备份配置内容
ipcMain.handle("get-claude-config-backup-content", async (_, id: number) => {
  try {
    const backupFilePath = getBackupFilePath(id);

    if (!fs.existsSync(backupFilePath)) {
      return { success: false, error: "备份文件不存在" };
    }

    const content = fs.readFileSync(backupFilePath, "utf-8");
    return { success: true, config: content };
  } catch (error) {
    console.error("读取备份配置失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// ==================== 常用命令管理 ====================

// 获取所有常用命令
ipcMain.handle("get-common-commands", async () => {
  try {
    const commands = store.get("commonCommands", []) as any[];
    return commands;
  } catch (error) {
    console.error("获取常用命令失败:", error);
    return [];
  }
});

// 添加常用命令
ipcMain.handle(
  "add-common-command",
  async (_, name: string, content: string) => {
    try {
      const commands = store.get("commonCommands", []) as any[];
      // 计算新命令的 order：取当前最大 order + 1
      const maxOrder = commands.length > 0
        ? Math.max(...commands.map(cmd => cmd.order || 0))
        : -1;

      const newCommand = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        name,
        content,
        pinned: false,
        order: maxOrder + 1, // 新命令排在最后
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      commands.push(newCommand);
      store.set("commonCommands", commands);

      return { success: true, command: newCommand };
    } catch (error) {
      console.error("添加常用命令失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 更新常用命令
ipcMain.handle(
  "update-common-command",
  async (_, id: string, name: string, content: string) => {
    try {
      const commands = store.get("commonCommands", []) as any[];
      const commandIndex = commands.findIndex((cmd) => cmd.id === id);

      if (commandIndex === -1) {
        return { success: false, error: "命令不存在" };
      }

      commands[commandIndex] = {
        ...commands[commandIndex],
        name,
        content,
        updatedAt: Date.now(),
      };

      store.set("commonCommands", commands);
      return { success: true };
    } catch (error) {
      console.error("更新常用命令失败:", error);
      return { success: false, error: (error as Error).message };
    }
  },
);

// 删除常用命令
ipcMain.handle("delete-common-command", async (_, id: string) => {
  try {
    const commands = store.get("commonCommands", []) as any[];
    const filteredCommands = commands.filter((cmd) => cmd.id !== id);

    store.set("commonCommands", filteredCommands);
    return { success: true };
  } catch (error) {
    console.error("删除常用命令失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 切换置顶状态
ipcMain.handle("toggle-pin-command", async (_, id: string) => {
  try {
    const commands = store.get("commonCommands", []) as any[];
    const commandIndex = commands.findIndex((cmd) => cmd.id === id);

    if (commandIndex === -1) {
      return { success: false, error: "命令不存在" };
    }

    commands[commandIndex] = {
      ...commands[commandIndex],
      pinned: !commands[commandIndex].pinned,
      updatedAt: Date.now(),
    };

    store.set("commonCommands", commands);
    return { success: true };
  } catch (error) {
    console.error("切换置顶失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 打开常用命令配置文件
ipcMain.handle("open-common-commands-file", async () => {
  try {
    const configPath = store.path;
    // 在默认编辑器中打开配置文件
    await shell.openPath(configPath);
    return { success: true };
  } catch (error) {
    console.error("打开配置文件失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// 更新命令排序
ipcMain.handle("reorder-commands", async (_, commands: any[]) => {
  try {
    // 保存更新后的命令列表
    store.set("commonCommands", commands);
    return { success: true };
  } catch (error) {
    console.error("更新排序失败:", error);
    return { success: false, error: (error as Error).message };
  }
});

// ==================== AI 对话功能 ====================

// AI 对话流式响应
ipcMain.handle(
  "chat-stream",
  async (
    event,
    request: {
      messages: any[];
    },
  ) => {
    try {
      // 获取 AI 对话设置（简化版，只有三个字段）
      const aiChatSettings = store.get("aiChat") as any;

      if (!aiChatSettings) {
        event.sender.send(
          "chat-stream-error",
          "AI 配置未找到，请前往设置页面配置",
        );
        return;
      }

      const { apiKey, apiBaseUrl, model } = aiChatSettings;

      if (!apiKey || !apiBaseUrl || !model) {
        event.sender.send(
          "chat-stream-error",
          "AI 配置不完整，请填写 API Key、API 地址和模型名称",
        );
        return;
      }

      if (!request.messages || request.messages.length === 0) {
        event.sender.send("chat-stream-error", "消息不能为空");
        return;
      }

      // 清理消息格式，只保留 role 和 content（API 不接受多余字段）
      const cleanedMessages = request.messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      }));

      // OpenAI 兼容格式的流式请求
      const response = await httpRequest<Response>({
        url: `${apiBaseUrl}/chat/completions`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: cleanedMessages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
        webContents: event.sender,
      });

      if (!response.body || typeof response.body === "string") {
        event.sender.send("chat-stream-error", "响应格式错误");
        return;
      }

      let buffer = "";
      (response.body as any)
        .on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();

              if (data === "[DONE]") {
                event.sender.send("chat-stream-complete");
                return;
              }

              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  event.sender.send("chat-stream-chunk", content);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          }
        })
        .on("end", () => {
          event.sender.send("chat-stream-complete");
        })
        .on("error", (error: Error) => {
          event.sender.send(
            "chat-stream-error",
            error.message || "流式读取失败",
          );
        });
    } catch (error: any) {
      event.sender.send("chat-stream-error", error.message || "对话失败");
    }
  },
);

// AI 格式化 Prompt（保持内容不变，转换为结构化 Markdown）
ipcMain.handle(
  "format-prompt",
  async (
    event,
    request: {
      content: string;
      contentHash?: string; // 用于缓存
    },
  ): Promise<{ success: boolean; formatted?: string; error?: string }> => {
    try {
      // 使用 AI 总结配置（格式化是轻量任务，用总结 API 更合适）
      const aiSummarySettings = store.get("aiSummary") as any;

      // 检查 AI 配置是否存在
      if (!aiSummarySettings) {
        return { success: false, error: "AI 配置不存在" };
      }

      // 检查缓存
      if (request.contentHash) {
        const cacheKey = `formatted_${request.contentHash}`;
        const cached = store.get(cacheKey) as string | undefined;
        if (cached) {
          return { success: true, formatted: cached };
        }
      }

      const provider: "groq" | "deepseek" | "gemini" | "custom" =
        aiSummarySettings.provider || "groq";
      const currentConfig = aiSummarySettings.providers?.[provider];

      if (!currentConfig || !currentConfig.apiKey) {
        return { success: false, error: "AI 配置不完整" };
      }

      // 构建格式化 system prompt
      const systemPrompt = `你是一个专业的 Markdown 格式化助手。请将用户提供的内容转换为结构化的 Markdown 格式。

严格要求：
1. **保持内容完全不变** - 不要修改、删除或添加任何实质性内容
2. **识别并标记代码块** - 将代码片段用 \`\`\`语言名 包裹，自动识别语言（如 javascript, python, json, bash 等）
3. **识别结构** - 适当添加标题（#）、列表（- 或 1.）、引用（>）等 Markdown 标记
4. **保留原有格式** - 已有的换行、空行、缩进尽量保留
5. **不要添加任何说明** - 直接输出格式化后的 Markdown，不要添加"以下是格式化后的内容"等说明

示例：
输入：请帮我写一个函数 function add(a, b) { return a + b }
输出：
请帮我写一个函数

\`\`\`javascript
function add(a, b) {
  return a + b;
}
\`\`\``;

      const timeout = aiSummarySettings.formatTimeout || 15000; // 默认15秒超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let formatted = "";

      // Gemini 使用非流式模式
      if (provider === "gemini") {
        const response = await httpRequest<Response>({
          url: `${currentConfig.apiBaseUrl}/models/${currentConfig.model}:generateContent?key=${currentConfig.apiKey}`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text:
                      systemPrompt +
                      "\n\n--- 需要格式化的内容 ---\n\n" +
                      request.content,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1, // 低温度，确保准确性
              maxOutputTokens: 4000,
            },
          }),
          signal: controller.signal,
          webContents: event.sender,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return { success: false, error: "Gemini API 调用失败" };
        }

        const data = await response.json() as any;
        formatted = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } else {
        // OpenAI 兼容格式 (Groq, DeepSeek, 自定义)
        const response = await httpRequest<Response>({
          url: `${currentConfig.apiBaseUrl}/chat/completions`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: currentConfig.model,
            messages: [
              {
                role: "system",
                content: systemPrompt,
              },
              {
                role: "user",
                content: request.content,
              },
            ],
            temperature: 0.1, // 低温度，确保准确性
            max_tokens: 4000,
          }),
          signal: controller.signal,
          webContents: event.sender,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return { success: false, error: "API 调用失败" };
        }

        const data = await response.json() as any;
        formatted = data.choices?.[0]?.message?.content || "";
      }

      if (!formatted) {
        return { success: false, error: "格式化结果为空" };
      }

      // 缓存结果
      if (request.contentHash) {
        const cacheKey = `formatted_${request.contentHash}`;
        store.set(cacheKey, formatted);
      }

      return { success: true, formatted: formatted.trim() };
    } catch (error: any) {
      if (error.name === "AbortError") {
        return { success: false, error: "格式化超时" };
      }
      return { success: false, error: error.message || "格式化失败" };
    }
  },
);
