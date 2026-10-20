export function withTimeout<T>(promise: PromiseLike<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), milliseconds);
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}

export function loadDecodedImage(source: string, timeoutMs = 12000, createImage = () => new Image()): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = createImage();
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) { image.src = ""; reject(error); }
      else resolve(image);
    };
    const ready = () => image.naturalWidth > 0 && image.naturalHeight > 0
      ? finish() : finish(new Error("插画未能完整加载，请点击重试"));
    const timer = setTimeout(() => finish(new Error("插画加载超时，请检查网络后重试")), timeoutMs);
    image.onload = ready;
    image.onerror = () => finish(new Error("插画加载失败，请检查网络后重试"));
    image.src = source;
    if (image.complete && image.naturalWidth > 0) ready();
  });
}

export type LoadedArtwork = { src: string; image: HTMLImageElement };

// A result page and its export share one decoded bitmap. Failed requests are
// evicted so Retry actually makes a new attempt instead of reusing a rejection.
export function createArtworkCache(load: (id: string) => Promise<LoadedArtwork>) {
  const pending = new Map<string, Promise<LoadedArtwork>>();
  return (id: string) => {
    const cached = pending.get(id);
    if (cached) return cached;
    const request = Promise.resolve().then(() => load(id)).catch(error => {
      if (pending.get(id) === request) pending.delete(id);
      throw error;
    });
    pending.set(id, request);
    return request;
  };
}

// Older iOS/WeChat WebViews don't implement CanvasRenderingContext2D.roundRect.
export function fillRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
  context.fill();
}

export async function canvasPng(canvas: HTMLCanvasElement, timeoutMs = 5000): Promise<Blob> {
  try {
    const blob = await withTimeout(new Promise<Blob>((resolve, reject) => {
      if (!canvas.toBlob) { reject(new Error("toBlob unavailable")); return; }
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("PNG encoding failed")), "image/png");
    }), timeoutMs, "PNG encoding timed out");
    return blob;
  } catch {
    // Some embedded WebViews never call toBlob's callback. A bounded fallback
    // avoids leaving the save button stuck forever. Canvas size is capped first.
    const data = canvas.toDataURL("image/png");
    if (!data.startsWith("data:image/png;base64,")) throw new Error("手机可用内存不足，请在 Safari 浏览器打开结果链接后保存");
    const bytes = Uint8Array.from(atob(data.split(",")[1]), character => character.charCodeAt(0));
    return new Blob([bytes], { type: "image/png" });
  }
}

export async function blobDataUrl(blob: Blob, timeoutMs = 5000): Promise<string> {
  return withTimeout(new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("图片预览失败，请重试"));
    reader.onerror = () => reject(new Error("图片预览失败，请重试"));
    reader.readAsDataURL(blob);
  }), timeoutMs, "图片预览超时，请重试");
}
