#!/bin/bash

echo "🚀 启动 Claude Code Monitor..."
echo ""
echo "提示："
echo "- 应用会自动检测 Claude Code 安装状态"
echo "- 左侧可以编辑配置文件"
echo "- 下方可以控制记录开关"
echo "- 右侧实时显示对话日志"
echo ""

npm run electron:dev
