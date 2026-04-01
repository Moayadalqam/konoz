/**
 * Generate PWA app icons for Kunoz.
 *
 * Creates a deep teal rounded-rectangle background with a bold white "K"
 * centered on it, in 192x192 and 512x512 sizes.
 *
 * Uses sharp (already bundled with Next.js) to composite SVG into PNG.
 *
 * Run: npx tsx src/scripts/generate-icons.ts
 */

import sharp from "sharp";
import path from "path";

const BG_COLOR = "#0D7377";
const SIZES = [192, 512] as const;

async function generateIcon(size: number) {
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.55);
  const yOffset = Math.round(size * 0.02); // optical center adjustment

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG_COLOR}" />
      <text
        x="50%"
        y="50%"
        dy="${yOffset}"
        text-anchor="middle"
        dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif"
        font-weight="bold"
        font-size="${fontSize}"
        fill="white"
        letter-spacing="-2"
      >K</text>
    </svg>
  `.trim();

  const outPath = path.resolve(
    __dirname,
    `../../public/icon-${size}x${size}.png`
  );

  await sharp(Buffer.from(svg)).png().toFile(outPath);

  console.log(`Generated ${outPath}`);
}

async function main() {
  for (const size of SIZES) {
    await generateIcon(size);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
