#!/usr/bin/env node

/**
 * 强制使用 pnpm 包管理器
 * 如果使用 npm 或 yarn 安装，立即报错并退出
 */

const userAgent = process.env.npm_config_user_agent || '';

const isUsingPnpm = userAgent.includes('pnpm');
const isUsingYarn = userAgent.includes('yarn');
const isUsingNpm = userAgent.includes('npm') && !isUsingPnpm;

if (!isUsingPnpm) {
  const red = '\x1b[31m';
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';

  console.error(`
${red}╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║  ❌  此项目强制使用 pnpm 作为包管理器                           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝${reset}

${yellow}检测到您正在使用:${reset} ${isUsingYarn ? 'yarn' : 'npm'}

${yellow}请执行以下步骤:${reset}

  1️⃣  安装 pnpm (如果未安装):
     npm install -g pnpm

  2️⃣  使用 pnpm 安装依赖:
     pnpm install

${yellow}为什么必须使用 pnpm?${reset}
  - Electron 需要运行构建脚本下载二进制文件
  - pnpm 10+ 默认禁止构建脚本，需要特定配置
  - 本项目已包含正确的 .npmrc 配置
  - npm/yarn 可能导致依赖冲突和路径解析问题

${yellow}当前环境:${reset}
  User Agent: ${userAgent}
  Package Manager: ${isUsingYarn ? 'yarn' : 'npm'}

`);

  process.exit(1);
}

console.log('✅ 使用 pnpm，继续安装...');
