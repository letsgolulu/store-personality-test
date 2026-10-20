import test from "node:test";
import assert from "node:assert/strict";
import { withTimeout, loadDecodedImage, createArtworkCache, fillRoundedRect, canvasPng } from "../lib/image-runtime.ts";

test("a never-settling asset/font promise has a finite timeout", async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 5, "timed out"), /timed out/);
  assert.equal(await withTimeout(Promise.resolve("ready"), 1000, "timeout"), "ready");
  await assert.rejects(withTimeout(Promise.reject(new Error("offline")), 1000, "timeout"), /offline/);
});

function fakeImage(mode) {
  return { complete: false, naturalWidth: 0, naturalHeight: 0, onload: null, onerror: null,
    set src(value) {
      this.lastSource = value;
      if (!value || mode === "pending") return;
      queueMicrotask(() => {
        if (mode === "error") this.onerror?.();
        else { this.naturalWidth = mode === "empty" ? 0 : 1080; this.naturalHeight = this.naturalWidth; this.onload?.(); }
      });
    },
  };
}
test("image loading resolves only a decoded non-empty image", async () => {
  const image = fakeImage("ok");
  assert.equal(await loadDecodedImage("data:image/jpeg;base64,test", 100, () => image), image);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  await assert.rejects(loadDecodedImage("broken.jpg", 100, () => fakeImage("error")), /加载失败/);
  await assert.rejects(loadDecodedImage("empty.jpg", 100, () => fakeImage("empty")), /完整加载/);
});
test("stalled mobile image requests reject and clean up handlers", async () => {
  const image = fakeImage("pending");
  await assert.rejects(loadDecodedImage("stalled.jpg", 5, () => image), /超时/);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.lastSource, "");
});
test("page and poster share one decoded image, and failure can be retried", async () => {
  let attempts = 0;
  const art = { src: "data:image/jpeg;base64,test", image: fakeImage("ok") };
  const load = createArtworkCache(async () => { attempts++; if (attempts === 1) throw new Error("offline"); return art; });
  await assert.rejects(load("vintage-shop"), /offline/);
  const first = load("vintage-shop");
  assert.equal(first, load("vintage-shop"));
  assert.equal(await first, art);
  assert.equal(await load("vintage-shop"), art);
  assert.equal(attempts, 2);
});
test("rounded cards work without the newer roundRect canvas API", () => {
  const calls = [];
  const context = Object.fromEntries(["beginPath", "moveTo", "lineTo", "quadraticCurveTo", "closePath", "fill"].map(name => [name, (...args) => calls.push([name, ...args])]));
  fillRoundedRect(context, 0, 0, 100, 60, 10);
  assert.equal(calls.filter(([name]) => name === "quadraticCurveTo").length, 4);
  assert.equal(calls.at(-1)[0], "fill");
});
test("PNG export recovers if toBlob is missing, null, or never calls back", async () => {
  const data = "data:image/png;base64,iVBORw0KGgo=";
  for (const toBlob of [undefined, callback => callback(null), () => {}]) {
    const blob = await canvasPng({ toBlob, toDataURL: () => data }, 5);
    assert.equal(blob.type, "image/png");
    assert.equal(blob.size, 8);
  }
  const expected = new Blob(["png"], { type: "image/png" });
  assert.equal(await canvasPng({ toBlob: callback => callback(expected) }), expected);
});
test("an unavailable or over-limit canvas gives a useful error, not an empty poster", async () => {
  await assert.rejects(canvasPng({ toDataURL: () => "data:," }, 5), /内存不足/);
});
