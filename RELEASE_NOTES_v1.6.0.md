# CCMonitor v1.6.0

## ✨ 新功能

### 🔍 常用Prompt页面快捷搜索
- **快捷键搜索功能**
  - ✅ 支持 `Cmd+F` (Mac) / `Ctrl+F` (Windows) 快捷键唤起搜索
  - ✅ 居中弹窗式搜索界面，实时搜索 Prompt 内容
  - ✅ 支持搜索 Prompt 名称和内容，关键词高亮显示
  - ✅ 点击搜索结果直接复制内容
  - ✅ 按 `ESC` 键快速关闭搜索弹窗

### 🎯 常用Prompt页面交互优化
- **卡片式设计升级**
  - ✅ 移除复制按钮，点击卡片直接复制内容
  - ✅ 添加 hover 和点击动画效果（卡片向右上角浮动）
  - ✅ 卡片采用阴影设计，移除边框线条
  - ✅ 操作按钮（置顶/编辑/删除）仅在 hover 时显示
  - ✅ 复制成功后显示浮层提示（带动画效果）

### 🎨 UI 主题优化
- **优化侧边栏菜单选中背景色**
  - 亮色模式：使用 `#FFF5ED` (米色/浅橙色)，与应用主题色完美融合
  - 暗色模式：使用 `#2A2420` (深橙棕色)，保持视觉协调
  - 提升了整体 UI 的一致性和美观度

### 🔧 HTTP 请求日志系统
- **全新的 HTTP 请求监控工具**
  - ✅ 自动生成 cURL 命令，可直接复制到终端测试
  - ✅ 双重日志输出：
    - 主进程控制台（终端）
    - **渲染进程 DevTools**（浏览器开发者工具）⭐️ 新增！
  - ✅ 彩色日志输出
    - 🟢 成功请求（HTTP 2xx）显示为绿色
    - 🔴 失败请求（HTTP 4xx/5xx）显示为红色
  - ✅ 支持超时控制和请求取消
  - ✅ 统一的错误处理和响应状态打印

### 📋 如何使用新功能

**使用快捷搜索：**
1. 打开 "常用Prompt" 页面
2. 按 `Cmd+F` (Mac) 或 `Ctrl+F` (Windows)
3. 输入关键词，实时查看搜索结果
4. 点击搜索结果直接复制内容

**查看 HTTP 请求日志（推荐方式）：**
1. 启动应用
2. 打开浏览器开发者工具：
   - macOS: `Cmd + Option + I`
   - Windows/Linux: `Ctrl + Shift + I`
3. 切换到 "Console" 标签
4. 触发 AI 总结功能
5. 在 DevTools 中查看彩色的 HTTP 请求日志和 cURL 命令

**复制 cURL 测试 API：**
- 直接从 DevTools 或终端复制完整的 cURL 命令
- 粘贴到终端执行，快速验证 API 连通性

## 🛠️ 技术改进

- 新增 `electron/utils/http.ts` - 全局 HTTP 请求工具
- 重构所有 AI API 调用，使用统一的请求工具
- 优化搜索功能实现，与实时对话/历史记录页面保持一致
- 修复 TypeScript 类型问题
- 优化代码结构，提升可维护性

## 🐛 Bug 修复

- 修复快捷键无法触发搜索弹窗的问题
- 主列表不受搜索影响，始终显示完整数据
- 修复流式响应的类型错误
- 优化错误处理逻辑

## 📚 文档更新

- 新增 `HTTP_LOGGING_GUIDE.md` - HTTP 日志功能详细使用指南
- 更新 `OPTIMIZATION_SUMMARY.md` - 优化内容总结
- 更新 `CHANGELOG.md` - 添加 v1.6.0 版本更新记录

## 📦 下载

请从 [Releases](https://github.com/zhanBoss/Claude-Code-Monitor/releases) 页面下载适合您系统的安装包：

- **macOS**: `CCMonitor-1.6.0.dmg` 或 `CCMonitor-1.6.0-mac.zip`
- **Windows**: `CCMonitor-Setup-1.6.0.exe`
- **Linux**: `CCMonitor-1.6.0.AppImage` 或 `CCMonitor_1.6.0_amd64.deb`

## 📝 完整更新日志

查看所有更改：[完整更新日志](https://github.com/zhanBoss/Claude-Code-Monitor/compare/v1.5.0...v1.6.0)

---

**Co-Authored-By:** Claude Opus 4.5 <noreply@anthropic.com>
