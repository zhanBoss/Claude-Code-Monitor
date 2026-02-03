# Changelog

All notable changes to this project will be documented in this file.

## [1.4.2] - 2026-02-03

### Fixed
- 修复实时对话图片加载失败问题
  - 解决图片路径重复拼接导致文件找不到的问题
  - 移除发送到前端时的路径拼接，保持相对路径
  - 添加图片加载轮询机制，确保图片最终能成功加载
  - 图片现在可以立即显示，无需刷新页面

## [1.4.1] - 2026-02-03

### Fixed
- 修复 TypeScript 编译错误
  - 添加 `downlevelIteration` 支持 Map/Set 迭代
  - 添加 `esModuleInterop` 和 `allowSyntheticDefaultImports` 支持模块导入
  - 为 Electron 主进程创建独立的 TypeScript 配置 (`tsconfig.electron.json`)
  - 修复 `global.processedImages` 类型声明问题

## [1.4.0] - 2026-02-03

### Added
- 添加清除缓存功能和独立的关于/更新日志页面
- 添加历史记录删除功能
- 实现历史记录按需加载优化

### Changed
- 优化图片处理和显示逻辑
- 优化 LogViewer 布局和交互体验
- 优化设置页面布局和交互体验
- 优化配置管理和数据刷新机制

### Fixed
- 修复实时对话图片加载时序问题

### Documentation
- 添加 CLAUDE.md 开发指南和主题一致性优化
