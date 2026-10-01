import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve('public');
const masterSvgPath = path.join(publicDir, 'logo-master.svg');
const svgBuffer = fs.readFileSync(masterSvgPath);

async function generate() {
  console.log('Generating crisp raster assets from logo-master.svg...');

  // 1. logo-primary.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo-primary.png'));

  // 2. logo-square.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo-square.png'));

  // 3. logo-app-icon.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo-app-icon.png'));

  // 4. pwa-512x512.png (512x512)
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  // 5. pwa-192x192.png (192x192)
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  // 6. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 7. favicon.png (64x64)
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // 8. pwa-maskable-512x512.png (512x512 with 10% safe zone padding)
  const innerResized = await sharp(svgBuffer)
    .resize(410, 410)
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 7, g: 11, b: 20, alpha: 1 }
    }
  })
    .composite([{ input: innerResized, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // 9. logo-transparent.png
  const transparentSvg = svgBuffer
    .toString()
    .replace('<rect width="512" height="512" rx="116" fill="url(#fzDarkBg)"/>', '')
    .replace('<rect width="504" height="504" x="4" y="4" rx="112" fill="none" stroke="url(#fzPrimaryGrad)" stroke-width="3" stroke-opacity="0.35"/>', '');

  await sharp(Buffer.from(transparentSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'logo-transparent.png'));

  console.log('✅ All high-resolution logo and PWA icon assets generated successfully!');
}

generate().catch(err => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
