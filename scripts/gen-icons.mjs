import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, "icon.svg");
const outDir = path.join(__dirname, "..", "public");
mkdirSync(outDir, { recursive: true });

const sizes = [
  { file: "pwa-192.png", size: 192 },
  { file: "pwa-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of sizes) {
  await sharp(svgPath).resize(size, size).png().toFile(path.join(outDir, file));
  console.log("wrote", file);
}

// maskable icon: same art but with padding so safe-zone isn't clipped
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2f7d6e"/>
  <g transform="translate(256 256) scale(0.7) rotate(-45)">
    <rect x="-140" y="-56" width="280" height="112" rx="56" fill="#ffffff"/>
    <rect x="-140" y="-56" width="140" height="112" rx="56" fill="#dff2ec"/>
    <line x1="0" y1="-56" x2="0" y2="56" stroke="#2f7d6e" stroke-width="8"/>
  </g>
</svg>`;
await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(path.join(outDir, "pwa-maskable-512.png"));
console.log("wrote pwa-maskable-512.png");
