import { createArtworkCache, loadCachedArtwork } from "./image-runtime";
import manifest from "./art-manifest.json";

const entries: Record<string, { webp: string; jpeg: string; preferred: string; preview: string }> = manifest;
export const shopIllustrations: Record<string, string> = Object.fromEntries(
  Object.entries(entries).map(([id, art]) => [id, `${import.meta.env.BASE_URL}${art.preferred === "webp" ? art.webp : art.jpeg}`]),
);
// Tiny previews travel with the app: no extra request or blank hero.
export const shopPreviews: Record<string, string> = Object.fromEntries(
  Object.entries(entries).map(([id, art]) => [id, art.preview]),
);
export const loadShopArtwork = createArtworkCache(async id => {
  const art = entries[id];
  if (!art) throw new Error("没有找到这家店的插画");
  try {
    return await loadCachedArtwork(shopIllustrations[id]);
  } catch {
    // Format fallback, not a promise of a different network route.
    try {
      return await loadCachedArtwork(`${import.meta.env.BASE_URL}${art.preferred === "webp" ? art.jpeg : art.webp}`);
    } catch {
      throw new Error("清晰插画尚未加载完成，请检查网络后重试；预览图会继续保留");
    }
  }
});
