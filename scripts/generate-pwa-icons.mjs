import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Original mark; central artwork fits within the maskable safe circle.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<rect width="512" height="512" rx="0" fill="#4F46E5"/>
<path d="M144 166h90q22 0 22 18 0-18 22-18h90v180h-90q-22 0-22 18-0-18-22-18h-90z" fill="#fff"/>
<path d="M256 184v154" stroke="#C7D2FE" stroke-width="12"/>
<path d="m318 202 8 21 22 8-22 8-8 21-8-21-22-8 22-8z" fill="#EC4899"/>
</svg>`;
await mkdir('public/icons', { recursive: true });
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['maskable-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(`public/icons/${file}`);
}
console.log('Generated four PNG app icons');
