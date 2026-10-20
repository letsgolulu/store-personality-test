import assert from "node:assert/strict";
// Intentionally fixed to the new account: never validate against the legacy project.
const projectUrl="https://htqouphoskplwzkiwcra.supabase.co";
const publishableKey="sb_publishable_baiTgVGfvpBLGPtzQdg-cw_HOISnQWS";
const base=projectUrl+"/functions/v1/store-api";
const code=process.env.QA_CODE;
if(!code) throw new Error("Set QA_CODE to a dedicated disposable test code");
async function request(path,body) {
  const response=await fetch(base+path,{headers:{Origin:"https://letsgolulu.github.io",apikey:publishableKey,"Content-Type":"application/json"},method:body?"POST":"GET",body:body?JSON.stringify(body):undefined});
  const data=await response.json();return {status:response.status,data};
}
const content=await request("/api/content"); assert.equal(content.status,200);assert.equal(content.data.questionTexts.length,36);assert.equal(content.data.profiles.length,12);
assert.equal((await request("/api/admin/overview")).status,401);
assert.equal((await request("/api/results/00000000000000000000000000000000")).status,404);
assert.equal((await request("/api/results",{sessionToken:"invalid",answers:[]})).status,400);
const attempts=await Promise.all(Array.from({length:6},()=>request("/api/access",{code})));
const accepted=attempts.filter(a=>a.status===200);assert.equal(accepted.length,3);assert.equal(attempts.filter(a=>a.status===403).length,3);
assert.deepEqual(accepted.map(a=>a.data.remainingUses).sort(),[0,1,2]);
const expected=["seaside-grocery","community-bakery","concept-store"];
const results=[];
for(const [i,value] of [1,3,5].entries()) {
  const payload={sessionToken:accepted[i].data.sessionToken,answers:Array(36).fill(value)};
  const [first,retry]=await Promise.all([request("/api/results",payload),request("/api/results",payload)]);
  assert.equal(first.status,200);assert.equal(retry.status,200);assert.equal(first.data.resultId,retry.data.resultId);
  assert.equal(first.data.primaryId,expected[i]);
  const shared=await request("/api/results/"+first.data.resultId);assert.equal(shared.status,200);assert.deepEqual(shared.data,first.data);
  assert.deepEqual(Object.keys(shared.data).sort(),["createdAt","primaryId","resultId","scores","secondaryId"].sort());
  results.push({id:first.data.resultId,type:first.data.primaryId});
}
const denied=await fetch(projectUrl+"/rest/v1/rpc/store_api",{method:"POST",headers:{apikey:publishableKey,"Content-Type":"application/json"},body:JSON.stringify({op:"admin/codes"})});
assert.notEqual(denied.status,200);
assert.equal((await request("/api/access",{code})).status,403);
console.log(JSON.stringify({passed:true,checks:["content","unauthenticated-admin-denied","invalid-input","concurrent-three-use-limit","atomic-idempotent-submit","three-distinct-results","public-share-privacy","direct-rpc-denied"],results}));
