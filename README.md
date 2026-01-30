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

## License

MIT
# Claude-Code-Monitor
# Claude-Code-Monitor
# Claude-Code-Monitor
# Claude-Code-Monitor
# Claude-Code-Monitor
# Claude-Code-Monitor
# Claude-Code-Monitor
