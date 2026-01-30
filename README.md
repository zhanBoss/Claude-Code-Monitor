# Claude Code Monitor

Claude Code 配置管理和对话记录监控工具。

## 功能

- 自动检测 Claude Code 安装状态
- 可视化编辑配置文件（`~/.claude/settings.json`）
- 实时监控对话记录（`~/.claude/history.jsonl`）
- 自动保存对话历史到指定目录
- 按项目和日期分类存储
- 历史对话查看和搜索
- 代码语法高亮显示
- 🌙 暗色模式切换 (v1.1.0)
- 📤 导出为 Markdown 格式 (v1.1.0)
- 🔍 全局搜索（跨会话搜索，关键词高亮） (v1.1.0)
- 🚀 开机自启动设置 (v1.1.0)
- ✨ AI 总结功能（基于 DeepSeek API） (v1.2.0)
- ⚙️ 设置页面化（完整的设置管理界面） (v1.2.0)

## 技术栈

- Electron + React 18 + TypeScript
- Ant Design + Tailwind CSS
- Vite

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建应用
npm run build
```

## 使用

1. 启动应用后自动检测 Claude Code 安装状态
2. 左侧面板管理配置文件
3. 启用记录开关并选择保存目录
4. 实时查看对话记录
5. 历史对话支持分页查看和搜索

## AI 总结功能

1. 点击右上角设置按钮进入设置页面
2. 在"AI 总结设置"卡片中：
   - 启用 AI 总结开关
   - 填入 DeepSeek API Key（从 https://platform.deepseek.com/api_keys 获取）
   - 保存设置
3. 在历史对话或实时对话页面点击"AI 总结"按钮
4. 查看 AI 生成的结构化总结

## 记录格式

文件名：`{项目名}_{日期}.jsonl`

```json
{
  "timestamp": "2026-01-30T10:55:00.000Z",
  "project": "/path/to/project",
  "sessionId": "session-id",
  "prompt": "用户提问内容",
  "pastedContents": {}
}
```

## 系统要求

- macOS 10.14+
- Claude Code

## 版本历史

### v1.2.0 (2026-01-30)
- ✨ AI 总结功能（支持 DeepSeek API）
- ⚙️ 设置页面化（卡片式布局）
- 🤖 历史会话智能总结
- 💬 实时对话智能总结
- 🔐 API Key 加密存储

### v1.1.1 (2026-01-30)
- 🐛 修复暗黑模式 UI 问题
- 🐛 修复 macOS 全屏模式兼容性
- 🌏 添加中文语言包支持

### v1.1.0 (2026-01-30)
- 🌙 暗色模式切换
- 📤 导出为 Markdown 格式
- 🔍 全局搜索（跨会话）
- 🚀 开机自启动设置

### v1.0.0 (2026-01-30)
- 基础功能实现

## License

MIT
