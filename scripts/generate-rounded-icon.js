const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/assets/logo/logo.png');
const outputPath = path.join(__dirname, '../src/assets/logo/logo-rounded.png');

async function generateRoundedIcon() {
  try {
    // 读取原始图片
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const size = Math.min(metadata.width, metadata.height);

    // 创建圆角遮罩（圆角半径为尺寸的 20%，适合 macOS 风格）
    const roundedCorners = Buffer.from(
      `<svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.2}" ry="${size * 0.2}" fill="white"/>
      </svg>`
    );

    // 应用圆角
    await sharp(inputPath)
      .resize(size, size)
      .composite([
        {
          input: roundedCorners,
          blend: 'dest-in'
        }
      ])
      .png()
      .toFile(outputPath);

    console.log(`✅ 圆角图标已生成: ${outputPath}`);

    // 生成各种尺寸的圆角图标用于应用
    const sizes = [16, 32, 64, 128, 256, 512, 1024];
    const iconsDir = path.join(__dirname, '../build/icons-rounded');

    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    for (const s of sizes) {
      const roundedMask = Buffer.from(
        `<svg width="${s}" height="${s}">
          <rect x="0" y="0" width="${s}" height="${s}" rx="${s * 0.2}" ry="${s * 0.2}" fill="white"/>
        </svg>`
      );

      await sharp(inputPath)
        .resize(s, s)
        .composite([
          {
            input: roundedMask,
            blend: 'dest-in'
          }
        ])
        .png()
        .toFile(path.join(iconsDir, `${s}x${s}.png`));

      console.log(`✅ 生成 ${s}x${s} 圆角图标`);
    }

    console.log('\n所有圆角图标已生成完成！');
  } catch (error) {
    console.error('生成圆角图标时出错:', error);
    process.exit(1);
  }
}

generateRoundedIcon();
