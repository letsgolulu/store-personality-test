// Re-encode approved artwork without changing its composition or crop.
// Optional runtime: node scripts/optimize-illustrations.mjs /path/to/sharp
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || "sharp");
const ids = ["night-convenience", "corner-cafe", "indie-bookstore", "rainy-records", "weekend-florist", "concept-store", "vintage-shop", "midnight-diner", "seaside-grocery", "study-room", "rooftop-bar", "community-bakery"];
const manifest = {};
mkdirSync("public/illustrations/optimized", { recursive: true });
for (const id of ids) {
  const original = readFileSync(resolve(`public/illustrations/${id}.jpg`));
  const webp = await sharp(original).resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 62, effort: 6 }).toBuffer();
  const jpeg = await sharp(original).resize({ width: 1080, withoutEnlargement: true }).jpeg({ quality: 64, mozjpeg: true }).toBuffer();
  const preview = await sharp(original).resize({ width: 100 }).jpeg({ quality: 35, mozjpeg: true }).toBuffer();
  const version = createHash("sha256").update(webp).update(jpeg).digest("hex").slice(0, 12);
  const base = `illustrations/optimized/${id}-${version}`;
  writeFileSync(`public/${base}.webp`, webp);
  writeFileSync(`public/${base}.jpg`, jpeg);
  manifest[id] = { webp: `${base}.webp`, jpeg: `${base}.jpg`, preferred: webp.length <= jpeg.length ? "webp" : "jpeg", preview: `data:image/jpeg;base64,${preview.toString("base64")}` };
  console.log(`${id}: ${Math.round(original.length / 1024)} → ${Math.round(webp.length / 1024)} KB; JPEG ${Math.round(jpeg.length / 1024)} KB; preview ${preview.length} B`);
}
writeFileSync("lib/art-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
