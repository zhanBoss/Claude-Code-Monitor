#!/usr/bin/env node

/**
 * Post-install script
 * 确保 Electron 二进制已正确下载
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 运行 post-install 检查...\n');

// 检查 Electron 是否需要重新安装
const electronPath = path.join(
  process.cwd(),
  'node_modules/.pnpm/electron@28.3.3/node_modules/electron'
);

if (fs.existsSync(electronPath)) {
  const pathTxtFile = path.join(electronPath, 'path.txt');

  if (!fs.existsSync(pathTxtFile)) {
    console.log('⚠️  Electron 二进制缺失，开始下载...');

    const installScript = path.join(electronPath, 'install.js');

    try {
      execSync(`node "${installScript}"`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Electron 二进制下载完成\n');
    } catch (error) {
      console.error('❌ Electron 安装失败:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Electron 二进制已存在\n');
  }
} else {
  console.log('⚠️  Electron 包不存在，请运行 pnpm install\n');
}

console.log('✨ Post-install 完成\n');
