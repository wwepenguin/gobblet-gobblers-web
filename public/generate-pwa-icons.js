import fs from 'fs';
import { createCanvas } from 'canvas';

function createPWAIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 繪製淺灰色背景
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 繪製藍色圓邊框
  ctx.strokeStyle = '#4a55a2';
  ctx.lineWidth = size / 20;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - size / 40, 0, Math.PI * 2);
  ctx.stroke();

  // 繪製藍色圓
  ctx.fillStyle = '#4a55a2';
  ctx.beginPath();
  ctx.arc(size * 0.35, size * 0.35, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 繪製紅色圓
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.arc(size * 0.65, size * 0.35, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 繪製深藍色圓
  ctx.fillStyle = '#1d3557';
  ctx.beginPath();
  ctx.arc(size * 0.35, size * 0.65, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 繪製淺紅色圓
  ctx.fillStyle = '#ffb4a2';
  ctx.beginPath();
  ctx.arc(size * 0.65, size * 0.65, size * 0.15, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// 生成不同尺寸的圖標
const iconSizes = [192, 512];
iconSizes.forEach(size => {
  const buffer = createPWAIcon(size);
  fs.writeFileSync(`public/pwa-${size}x${size}.png`, buffer);
  console.log(`Generated pwa-${size}x${size}.png`);
});

// 生成 Apple Touch 圖標
const appleTouchBuffer = createPWAIcon(180);
fs.writeFileSync('public/apple-touch-icon.png', appleTouchBuffer);
console.log('Generated apple-touch-icon.png');