import { createArtworkCache, loadDecodedImage, withTimeout } from "./image-runtime";

export const shopIllustrations: Record<string, string> = Object.fromEntries([
  "night-convenience", "corner-cafe", "indie-bookstore", "rainy-records",
  "weekend-florist", "concept-store", "vintage-shop", "midnight-diner",
  "seaside-grocery", "study-room", "rooftop-bar", "community-bakery",
].map(id => [id, `${import.meta.env.BASE_URL}illustrations/${id}.jpg`]));

// Only the result's own illustration is loaded. Each lazy chunk embeds the
// approved JPEG, avoiding a second image request and failed-image cache on iOS.
const embedded: Record<string, () => Promise<{ default: string }>> = {
  "night-convenience": () => import("virtual:store-illustration/night-convenience"),
  "corner-cafe": () => import("virtual:store-illustration/corner-cafe"),
  "indie-bookstore": () => import("virtual:store-illustration/indie-bookstore"),
  "rainy-records": () => import("virtual:store-illustration/rainy-records"),
  "weekend-florist": () => import("virtual:store-illustration/weekend-florist"),
  "concept-store": () => import("virtual:store-illustration/concept-store"),
  "vintage-shop": () => import("virtual:store-illustration/vintage-shop"),
  "midnight-diner": () => import("virtual:store-illustration/midnight-diner"),
  "seaside-grocery": () => import("virtual:store-illustration/seaside-grocery"),
  "study-room": () => import("virtual:store-illustration/study-room"),
  "rooftop-bar": () => import("virtual:store-illustration/rooftop-bar"),
  "community-bakery": () => import("virtual:store-illustration/community-bakery"),
};

export const loadShopArtwork = createArtworkCache(async id => {
  if (!embedded[id] || !shopIllustrations[id]) throw new Error("没有找到这家店的插画");
  try {
    const module = await withTimeout(embedded[id](), 14000, "插画加载超时");
    const image = await loadDecodedImage(module.default, 5000);
    return { src: module.default, image };
  } catch {
    // Independent fallback when a mobile network fails a module request. The
    // timestamp avoids reusing a previously failed image response in WebViews.
    const src = `${shopIllustrations[id]}?retry=${Date.now()}`;
    return { src, image: await loadDecodedImage(src, 10000) };
  }
});
