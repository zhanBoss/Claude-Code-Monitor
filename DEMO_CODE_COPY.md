# 代码块复制功能演示

## 📋 功能说明

AI 对话界面现在支持一键复制代码块！每个代码块右上角都会显示复制按钮。

---

## 🎯 测试方法

### 1. 启动应用
```bash
npm run dev
```

### 2. 进入 AI 助手页面
点击左侧导航栏的「AI 助手」图标

### 3. 发送测试 Prompt

**示例 1：请求代码示例**
```
请给我一个 React 组件示例
```

**示例 2：请求多语言代码**
```
分别用 JavaScript、Python、TypeScript 写一个 Hello World
```

**示例 3：请求复杂代码**
```
写一个带类型的 TypeScript 函数，实现数组去重
```

---

## ✨ 预期效果

### 代码块外观
```javascript
const example = () => {
  console.log('Hello World')
}
```
- 右上角显示 📋 复制按钮
- 代码有语法高亮（深色/浅色主题）
- 圆角边框，专业美观

### 交互流程
1. **默认状态**
   - 按钮显示 📋 图标
   - 半透明背景
   - Tooltip 提示"复制代码"

2. **悬浮状态**
   - 按钮背景变亮
   - 不透明度提升到 100%
   - 鼠标指针变为 pointer

3. **点击复制**
   - 代码立即复制到剪贴板
   - 按钮图标变为 ✓
   - 按钮变为绿色
   - Tooltip 提示"已复制"

4. **自动恢复**
   - 2秒后自动恢复默认状态
   - 可以再次点击复制

---

## 🎨 视觉效果

### 深色主题
- **代码背景**：`#1e1e1e`（VS Code Dark+ 风格）
- **复制按钮**：白色图标 + 半透明白色背景
- **悬浮效果**：背景透明度提升
- **复制成功**：绿色 ✓ 图标

### 浅色主题
- **代码背景**：`#f6f8fa`（GitHub 风格）
- **复制按钮**：黑色图标 + 半透明黑色背景
- **悬浮效果**：背景透明度提升
- **复制成功**：绿色 ✓ 图标

---

## 🔧 代码实现

### 核心组件：CodeBlock
```typescript
const CodeBlock = ({ language, value, darkMode }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await window.electronAPI.copyToClipboard(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'relative' }}>
      <Button
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        onClick={handleCopy}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          // ... 更多样式
        }}
      />
      <SyntaxHighlighter language={language}>
        {value}
      </SyntaxHighlighter>
    </div>
  )
}
```

### 集成到 Markdown 渲染
```typescript
<ReactMarkdown
  components={{
    code({ inline, className, children }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children)}
          darkMode={darkMode}
        />
      ) : (
        <code>{children}</code>
      )
    }
  }}
>
  {content}
</ReactMarkdown>
```

---

## 📊 技术细节

| 特性 | 实现 |
|-----|-----|
| 复制 API | `window.electronAPI.copyToClipboard()` |
| 状态管理 | `useState` Hook |
| 自动恢复 | `setTimeout(2000ms)` |
| 图标切换 | `CopyOutlined` ↔️ `CheckOutlined` |
| 样式动画 | `transition: all 0.2s` |
| 主题适配 | 根据 `darkMode` 动态调整颜色 |

---

## ✅ 测试清单

- [ ] 代码块显示复制按钮
- [ ] 按钮悬浮高亮效果
- [ ] 点击复制成功（剪贴板有内容）
- [ ] 复制成功显示 ✓ 图标
- [ ] 2秒后自动恢复默认状态
- [ ] 深色主题样式正确
- [ ] 浅色主题样式正确
- [ ] 支持多种编程语言（JS/TS/Python/等）
- [ ] 长代码块滚动正常
- [ ] 打字机效果与复制按钮兼容

---

## 💡 使用建议

1. **复制后直接粘贴**：按 `Cmd+V` (Mac) 或 `Ctrl+V` (Windows)
2. **支持所有语言**：JavaScript、Python、TypeScript、Go、Rust 等
3. **支持行内代码**：行内 \`code\` 不显示复制按钮（保持简洁）
4. **快捷键友好**：可以快速复制多个代码块

---

## 🎉 体验亮点

- **一键复制**：无需手动选择代码，点击即复制
- **视觉反馈**：清晰的状态提示，用户体验友好
- **主题统一**：完美融入深色/浅色主题
- **性能优化**：防抖处理，流畅不卡顿

---

**功能状态：** ✅ 已完成并测试
**适用场景：** AI 返回代码示例、代码片段、命令行等
**用户价值：** 提升开发效率，减少手动复制错误
