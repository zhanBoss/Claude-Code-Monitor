#!/usr/bin/env node

/**
 * 验证项目环境配置
 * 检查 pnpm、Node.js 版本，以及 Electron 安装情况
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

console.log(`\n${blue}🔍 CCMonitor 环境验证${reset}\n`);
console.log('='.repeat(60));

const checks = [];

// 1. 检查 Node.js 版本
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

  if (majorVersion >= 18) {
    checks.push({ name: 'Node.js 版本', status: 'pass', value: nodeVersion });
  } else {
    checks.push({
      name: 'Node.js 版本',
      status: 'fail',
      value: `${nodeVersion} (需要 >= 18.0.0)`
    });
  }
} catch (error) {
  checks.push({ name: 'Node.js 版本', status: 'fail', value: 'N/A' });
}

// 2. 检查 pnpm
try {
  const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
  const majorVersion = parseInt(pnpmVersion.split('.')[0]);

  if (majorVersion >= 8) {
    checks.push({ name: 'pnpm 版本', status: 'pass', value: pnpmVersion });
  } else {
    checks.push({
      name: 'pnpm 版本',
      status: 'fail',
      value: `${pnpmVersion} (需要 >= 8.0.0)`
    });
  }
} catch (error) {
  checks.push({
    name: 'pnpm',
    status: 'fail',
    value: '未安装 (运行: npm install -g pnpm)'
  });
}

// 3. 检查 node_modules
if (fs.existsSync('node_modules')) {
  checks.push({ name: '依赖安装', status: 'pass', value: '已安装' });

  // 4. 检查 Electron
  const electronPath = path.join(
    process.cwd(),
    'node_modules/.pnpm/electron@28.3.3/node_modules/electron'
  );

  if (fs.existsSync(electronPath)) {
    const pathTxtFile = path.join(electronPath, 'path.txt');

    if (fs.existsSync(pathTxtFile)) {
      const electronBinPath = fs.readFileSync(pathTxtFile, 'utf-8').trim();
      const fullPath = path.join(electronPath, 'dist', electronBinPath);

      if (fs.existsSync(fullPath)) {
        checks.push({
          name: 'Electron 二进制',
          status: 'pass',
          value: '已下载'
        });
      } else {
        checks.push({
          name: 'Electron 二进制',
          status: 'fail',
          value: '未找到二进制文件'
        });
      }
    } else {
      checks.push({
        name: 'Electron 二进制',
        status: 'warn',
        value: 'path.txt 缺失（运行: pnpm install）'
      });
    }
  } else {
    checks.push({
      name: 'Electron',
      status: 'fail',
      value: '未安装'
    });
  }

  // 5. 检查 katex
  const katexPath = path.join(
    process.cwd(),
    'node_modules/katex/dist/katex.min.css'
  );

  if (fs.existsSync(katexPath)) {
    checks.push({ name: 'katex CSS', status: 'pass', value: '已安装' });
  } else {
    checks.push({
      name: 'katex CSS',
      status: 'warn',
      value: '未找到（运行: pnpm install katex）'
    });
  }
} else {
  checks.push({
    name: '依赖安装',
    status: 'fail',
    value: '未安装 (运行: pnpm install)'
  });
}

// 6. 检查 .npmrc
if (fs.existsSync('.npmrc')) {
  const npmrcContent = fs.readFileSync('.npmrc', 'utf-8');

  if (npmrcContent.includes('ignore-scripts=false')) {
    checks.push({ name: '.npmrc 配置', status: 'pass', value: '正确' });
  } else {
    checks.push({
      name: '.npmrc 配置',
      status: 'warn',
      value: '可能缺少 ignore-scripts=false'
    });
  }
} else {
  checks.push({ name: '.npmrc', status: 'fail', value: '文件缺失' });
}

// 7. 检查包管理器锁定
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

  if (packageJson.packageManager && packageJson.packageManager.includes('pnpm')) {
    checks.push({
      name: 'packageManager 锁定',
      status: 'pass',
      value: packageJson.packageManager
    });
  } else {
    checks.push({
      name: 'packageManager 锁定',
      status: 'warn',
      value: '未锁定'
    });
  }
} catch (error) {
  checks.push({ name: 'package.json', status: 'fail', value: '读取失败' });
}

// 打印结果
console.log();
checks.forEach(check => {
  let symbol, color;

  switch (check.status) {
    case 'pass':
      symbol = '✅';
      color = green;
      break;
    case 'fail':
      symbol = '❌';
      color = red;
      break;
    case 'warn':
      symbol = '⚠️ ';
      color = yellow;
      break;
    default:
      symbol = '❓';
      color = reset;
  }

  console.log(
    `${symbol} ${check.name.padEnd(20)} ${color}${check.value}${reset}`
  );
});

console.log('\n' + '='.repeat(60));

// 统计
const passCount = checks.filter(c => c.status === 'pass').length;
const failCount = checks.filter(c => c.status === 'fail').length;
const warnCount = checks.filter(c => c.status === 'warn').length;

console.log(`\n${green}通过: ${passCount}${reset} | ${red}失败: ${failCount}${reset} | ${yellow}警告: ${warnCount}${reset}\n`);

// 给出建议
if (failCount > 0) {
  console.log(`${red}❌ 发现问题，项目可能无法正常运行${reset}`);
  console.log(`\n${yellow}建议操作:${reset}`);
  console.log('  1. 安装 pnpm: npm install -g pnpm');
  console.log('  2. 安装依赖: pnpm install');
  console.log('  3. 重新运行验证: node scripts/verify-env.js\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log(`${yellow}⚠️  有警告项，建议检查${reset}\n`);
  process.exit(0);
} else {
  console.log(`${green}🎉 环境配置完美！可以开始开发了${reset}`);
  console.log(`\n${blue}运行开发服务器:${reset} pnpm run dev\n`);
  process.exit(0);
}
