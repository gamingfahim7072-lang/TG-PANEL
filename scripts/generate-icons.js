import fs from 'fs';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // width, height
  const rowSize = width * 4 + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // Helper to calculate CRC32
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c >>> 0;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = (crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)) >>> 0;
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crcVal = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0 (Deflate)
  ihdr[11] = 0; // Filter: 0 (Standard)
  ihdr[12] = 0; // Interlace: 0 (No interlace)

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Draw FZ brand icon
function drawFZIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const dist = Math.hypot(x - cx, y - cy);

  // Background radial dark slate / indigo
  const factor = dist / r;
  let bgR = Math.max(11, Math.min(20, Math.floor(15 + 10 * (1 - factor))));
  let bgG = Math.max(15, Math.min(30, Math.floor(23 + 20 * (1 - factor))));
  let bgB = Math.max(25, Math.min(50, Math.floor(38 + 40 * (1 - factor))));

  // Center circle glow
  if (dist < r * 0.75) {
    const glow = 1 - (dist / (r * 0.75));
    bgR = Math.floor(bgR + 10 * glow);
    bgG = Math.floor(bgG + 80 * glow);
    bgB = Math.floor(bgB + 160 * glow);
  }

  // F & Z letter approximation / central cyber bolt
  const nx = (x - cx) / (w * 0.35); // -1 to 1
  const ny = (y - cy) / (h * 0.35); // -1 to 1

  // Draw cyber lightning / FZ monogram symbol
  const inF = (nx >= -0.55 && nx <= -0.4) && (ny >= -0.6 && ny <= 0.6) || // vertical bar
              (nx >= -0.4 && nx <= 0.1) && (ny >= -0.6 && ny <= -0.45) || // top bar
              (nx >= -0.4 && nx <= -0.05) && (ny >= -0.1 && ny <= 0.05); // mid bar

  const inZ = (nx >= 0.1 && nx <= 0.55) && (ny >= -0.6 && ny <= -0.45) || // top bar
              (nx >= 0.1 && nx <= 0.55) && (ny >= 0.45 && ny <= 0.6) || // bottom bar
              (Math.abs((0.55 - nx) - (ny + 0.6)) < 0.22 && nx >= 0.08 && nx <= 0.58 && ny >= -0.55 && ny <= 0.55); // diagonal

  if (inF || inZ) {
    return [6, 182, 212, 255]; // Cyan neon (#06b6d4)
  }

  // Border ring
  if (Math.abs(dist - r * 0.88) < (w > 200 ? 5 : 2)) {
    return [14, 165, 233, 220]; // Sky blue ring
  }

  return [Math.min(255, bgR), Math.min(255, bgG), Math.min(255, bgB), 255];
}

const pwa192 = createPNG(192, 192, drawFZIcon);
fs.writeFileSync('public/pwa-192x192.png', pwa192);

const pwa512 = createPNG(512, 512, drawFZIcon);
fs.writeFileSync('public/pwa-512x512.png', pwa512);
fs.writeFileSync('public/pwa-maskable-512x512.png', pwa512);
fs.writeFileSync('public/apple-touch-icon.png', pwa192);

console.log('PWA icons successfully generated.');
