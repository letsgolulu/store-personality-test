import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { loadCachedArtwork } from "../lib/image-runtime.ts";
import { storeProfiles } from "../lib/assessment.ts";

const response = () => new Response("image-bytes", {headers:{"Content-Type":"image/webp"}});
const decoded = {naturalWidth:1080,naturalHeight:1080};
const helpers = {decode:async () => decoded,toDataUrl:async blob => `data:${blob.type};base64,test`};
test("only twelve compact, versioned assets and inline previews are registered", () => {
  const manifest = JSON.parse(readFileSync(new URL("../lib/art-manifest.json", import.meta.url)));
  assert.deepEqual(Object.keys(manifest).sort(),storeProfiles.map(x=>x.id).sort());
  for (const entry of Object.values(manifest)) {
    assert.match(entry.webp, /-[0-9a-f]{12}\.webp$/);
    assert.match(entry.jpeg, /-[0-9a-f]{12}\.jpg$/);
    assert.match(entry.preview, /^data:image\/jpeg;base64,/);
    assert.ok(entry.preview.length < 4000);
    assert.ok(statSync(new URL(`../public/${entry.webp}`,import.meta.url)).size < 270000);
    assert.ok(statSync(new URL(`../public/${entry[entry.preferred]}`,import.meta.url)).size < 240000);
  }
});
test("warm persistent cache works without network and shares an export-safe data URL",async () => {
  const result=await loadCachedArtwork("/illustrations/optimized/test.webp",{
    ...helpers, cacheStorage:{open:async()=>({match:async()=>response()})},
    fetcher:async()=>{throw new Error("must not fetch");},
  });
  assert.equal(result.image,decoded);
  assert.match(result.src,/^data:image\/webp/);
});
test("denied storage still fetches only the requested stable resource",async () => {
  const calls=[];
  await loadCachedArtwork("/illustrations/optimized/test.webp",{
    ...helpers, cacheStorage:{open:async()=>{throw new Error("denied");}},
    fetcher:async(url,options)=>{calls.push([url,options.cache]);return response();},
  });
  assert.deepEqual(calls,[["/illustrations/optimized/test.webp","force-cache"]]);
});
test("corrupt cached artwork is evicted and replaced, not retried forever",async () => {
  let removed=0, stored=0, fetched=0;
  await loadCachedArtwork("/illustrations/optimized/test.webp",{
    ...helpers,cacheStorage:{open:async()=>({match:async()=>new Response("not image"),delete:async()=>{removed++;},put:async()=>{stored++;}})},
    fetcher:async()=>{fetched++;return response();},
  });
  assert.deepEqual([removed,stored,fetched],[1,1,1]);
});
test("HTTP errors are not decoded or saved as successful artwork",async () => {
  let stored=0;
  await assert.rejects(loadCachedArtwork("/illustrations/optimized/test.webp",{
    ...helpers,cacheStorage:{open:async()=>({match:async()=>undefined,put:async()=>{stored++;}})},
    fetcher:async()=>new Response("missing",{status:404}),
  }),/加载失败/);
  assert.equal(stored,0);
});
