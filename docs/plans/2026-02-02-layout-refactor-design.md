# 布局重构设计文档

## 概述

将 CCMonitor 从左右分栏布局重构为经典的后台管理系统布局（侧边栏 + 顶部标题栏 + 主内容区）。

## 设计系统

### 视觉风格
- **风格：** Dark Mode (OLED) - 深色主题，高对比度
- **色彩方案：**
  - Primary: `#3B82F6` (蓝色)
  - Secondary: `#1E293B` (深灰蓝)
  - CTA: `#2563EB` (深蓝)
  - Background: `#0F172A` (深黑蓝)
  - Text: `#F1F5F9` (浅灰白)

### 字体
- **标题：** Fira Code (等宽字体，适合开发工具)
- **正文：** Fira Sans (清晰易读)
- Google Fonts: `https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700|Fira+Sans:wght@300;400;500;600;700`

## 布局架构

### 整体结构

```
┌──────────┬─────────────────────────────────────┐
│          │     顶部标题栏 (Top Bar)              │
│  Logo    ├─────────────────────────────────────┤
│          │                                     │
├──────────┤                                     │
│          │                                     │
│ 📊 实时   │         主内容区域                    │
│          │        (Main Content)               │
│ 📜 历史   │                                     │
│          │                                     │
│ ⚙️ 设置   │                                     │
│          │                                     │
└──────────┴─────────────────────────────────────┘
```

### 组件层次

1. **侧边栏 (Sidebar)** - 固定 200px 宽度
   - Logo 区域 (64px 高)
   - 导航菜单
   - 响应式：小于 768px 时自动隐藏，通过汉堡菜单调出

2. **顶部标题栏 (TopBar)** - 固定高度 64px
   - 页面标题
   - 用户信息/操作按钮
   - 面包屑导航（可选）

3. **主内容区域 (MainContent)**
   - 根据当前路由显示不同页面
   - 完全占据剩余空间

## 路由设计

### 页面映射

| 路由路径 | 组件 | 描述 |
|---------|------|------|
| `/realtime` | `LogViewer` | 实时对话监控 |
| `/history` | `HistoryViewer` | 历史记录查询 |
| `/settings` | `SettingsView` | 应用设置（整合所有配置） |

默认路由：`/realtime`

## 组件重构计划

### 1. 新建组件

#### `Sidebar.tsx`
- Logo 展示
- 导航菜单（3个菜单项）
- 响应式收起/展开逻辑
- 使用 Ant Design Menu 组件

#### `TopBar.tsx`
- 页面标题动态显示
- 设置按钮（可选，因为已有侧边栏菜单）
- 用户信息显示区域

#### `MainLayout.tsx`
- 整合 Sidebar + TopBar + MainContent
- 处理路由切换
- 响应式布局管理

### 2. 修改现有组件

#### `App.tsx`
- 移除 Sider 和 Drawer 逻辑
- 使用新的 MainLayout
- 简化状态管理

#### `SettingsView.tsx`
- 整合 ConfigEditor（Claude Code 配置）
- 整合 RecordControl（记录管理）
- 统一设置页面布局

#### `LogViewer.tsx` & `HistoryViewer.tsx`
- 移除 ViewHeader（导航已在 Sidebar）
- 简化为纯内容展示组件
- 保留各自的功能按钮

### 3. 删除组件

- `ViewHeader.tsx` - 功能被 Sidebar 和 TopBar 取代
- Drawer 相关逻辑 - 改用响应式 Sidebar

## 响应式设计

### 断点策略

| 屏幕尺寸 | 侧边栏行为 | 布局变化 |
|---------|----------|---------|
| ≥ 768px | 固定显示 | 侧边栏 + 内容区并列 |
| < 768px | 默认隐藏 | 汉堡菜单调出 Drawer |

### 移动端优化

- 侧边栏转为 Drawer（从左侧滑出）
- TopBar 显示汉堡菜单按钮
- 内容区全宽显示

## 状态管理

### 路由状态
- 使用 React Router 或简单的 state 管理当前路由
- 侧边栏高亮当前活动菜单项

### 响应式状态
- `sidebarCollapsed: boolean` - 侧边栏是否折叠（移动端）
- `currentRoute: string` - 当前路由路径

### 主题状态
- 保持现有的 `darkMode` 和 `themeMode` 逻辑
- 继续支持亮色/暗色/跟随系统

## 样式规范

### 间距
- 容器内边距：16px (移动) / 24px (桌面)
- 组件间距：16px
- 侧边栏菜单项间距：8px

### 圆角
- 卡片：8px
- 按钮：6px
- 输入框：6px

### 阴影
- 侧边栏：`0 0 20px rgba(0, 0, 0, 0.5)`
- 卡片：`0 2px 8px rgba(0, 0, 0, 0.15)`

### 过渡动画
- 菜单切换：200ms ease
- 悬停效果：150ms ease
- 侧边栏展开/折叠：300ms ease

## 实施步骤

### Phase 1: 基础架构
1. 创建 `Sidebar.tsx`
2. 创建 `TopBar.tsx`
3. 创建 `MainLayout.tsx`
4. 建立路由系统

### Phase 2: 整合现有组件
1. 重构 `App.tsx` 使用 MainLayout
2. 修改 `SettingsView` 整合所有配置
3. 简化 `LogViewer` 和 `HistoryViewer`

### Phase 3: 清理和优化
1. 删除 `ViewHeader.tsx`
2. 移除 Drawer 相关代码
3. 测试响应式行为
4. 优化性能和动画

### Phase 4: 主题和样式
1. 应用设计系统色彩
2. 引入 Fira Code 和 Fira Sans 字体
3. 统一间距和圆角
4. 添加过渡动画

## 验收标准

- [ ] 侧边栏固定 200px，响应式正常
- [ ] 3 个菜单项点击切换路由正常
- [ ] 小屏幕（< 768px）侧边栏自动隐藏
- [ ] 汉堡菜单在移动端正常工作
- [ ] 所有现有功能保持不变
- [ ] 暗色主题应用正确
- [ ] 动画流畅，无卡顿
- [ ] 构建无错误，无 console 警告

## 兼容性

- Electron 28+
- React 18+
- Ant Design 6+
- 所有主流桌面操作系统（macOS, Windows, Linux）
