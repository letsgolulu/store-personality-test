import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import { classifyScores, scoreAssessment, storeProfiles, balancedProfile } from "../../../lib/assessment.ts";
import { defaultSiteContent, validateSiteContent, resolveProfile } from "../../../lib/site-content.ts";
import { csvCell, parseCodeBatch, AdminError } from "../../../lib/admin-utils.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
const allowed = new Set(["https://letsgolulu.github.io", "http://127.0.0.1:5173", "http://127.0.0.1:4173", "http://localhost:5173"]);
class ApiError extends Error { constructor(message: string, public status = 400) { super(message); } }
async function rpc(op: string, p: unknown = {}, actor: string | null = null): Promise<any> {
  const { data, error } = await db.rpc("store_api", { op, p, actor });
  if (error) {
    const match = error.message.match(/^(400|403|404|409):(.+)$/s);
    if (match) throw new ApiError(match[2], Number(match[1]));
    console.error("Database operation failed", op, error.code);
    throw new ApiError("服务暂时不可用，请稍后重试", 503);
  }
  return data;
}
async function hash(value: string) { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), b => b.toString(16).padStart(2,"0")).join(""); }
function integer(value: unknown, min: number, max: number) { const n = Number(value); if (!Number.isSafeInteger(n) || n<min || n>max) throw new ApiError("请输入有效的整数参数"); return n; }

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = new Headers({ "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer", "Vary":"Origin", "X-Robots-Tag":"noindex, nofollow" });
  if (origin && allowed.has(origin)) {
    headers.set("Access-Control-Allow-Origin",origin);
    headers.set("Access-Control-Allow-Headers","authorization, apikey, content-type, x-client-info");
    headers.set("Access-Control-Allow-Methods","GET, POST, PATCH, PUT, OPTIONS");
  }
  const json = (value: unknown, status=200) => new Response(JSON.stringify(value),{status,headers});
  if (origin && !allowed.has(origin)) return json({error:"请求来源未获允许"},403);
  if (req.method==="OPTIONS") return new Response(null,{status:204,headers});
  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/store-api")[1] ?? "";
    if (path==="/api/health" && req.method==="GET") { await rpc("content"); return json({ok:true}); }
    let body: any = {};
    if (["POST","PATCH","PUT"].includes(req.method)) {
      if (Number(req.headers.get("content-length")??0)>150000) throw new ApiError("请求内容过长",413);
      const raw = await req.text(); if (raw.length>150000) throw new ApiError("请求内容过长",413);
      try { body=JSON.parse(raw); } catch { throw new ApiError("请求格式不正确"); }
      if (!body || typeof body!=="object" || Array.isArray(body)) throw new ApiError("请求格式不正确");
    }
    if (path==="/api/content" && req.method==="GET") return json(await rpc("content") ?? defaultSiteContent);
    if (path==="/api/access" && req.method==="POST") {
      const code=typeof body.code==="string" ? body.code.trim().toUpperCase() : "";
      if (!code || code.length>80) throw new ApiError("请输入有效的测试密码");
      const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const bucket=await hash(ip+":"+Math.floor(Date.now()/600000));
      if (!(await rpc("rate",{bucket})).allowed) throw new ApiError("尝试次数较多，请十分钟后再试",429);
      return json(await rpc("access",{hash:await hash(code)}));
    }
    if (path==="/api/results" && req.method==="POST") {
      if (typeof body.sessionToken!=="string" || !/^[a-f0-9-]{36}$/i.test(body.sessionToken)) throw new ApiError("测试会话无效");
      let outcome; try { outcome=scoreAssessment(body.answers); } catch { throw new ApiError("请完整回答36道题，每题选择1至5"); }
      return json(await rpc("submit",{sessionToken:body.sessionToken,...outcome}));
    }
    const resultMatch=path.match(/^\/api\/results\/([a-f0-9]{32})$/);
    if (resultMatch && req.method==="GET") { const result=await rpc("result",{id:resultMatch[1]}); return json({...result,...classifyScores(result.scores)}); }
    if (!path.startsWith("/api/admin/")) throw new ApiError("页面不存在",404);
    const token=req.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw new ApiError("请先登录管理后台",401);
    const {data:{user},error}=await db.auth.getUser(token);
    if (error || !user) throw new ApiError("登录已失效，请重新登录",401);
    const identity=await rpc("admin/me",{},user.id);
    const route=path.slice("/api/admin/".length);
    if (route==="me" && req.method==="GET") return json(identity);
    const content=await rpc("content") ?? defaultSiteContent;
    if (route==="content" && req.method==="GET") return json(content);
    if (route==="content" && req.method==="PUT") {
      let parsed; try { parsed=validateSiteContent(body); } catch(err) { throw new ApiError(err instanceof Error ? err.message : "文案格式错误"); }
      return json(await rpc("admin/save_content",parsed,user.id));
    }
    if (route==="codes" && req.method==="POST") return json(await rpc("admin/generate",parseCodeBatch(body),user.id),201);
    const codeMatch=route.match(/^codes\/(\d+)$/);
    if (codeMatch && req.method==="PATCH") {
      const p: any={id:integer(codeMatch[1],1,Number.MAX_SAFE_INTEGER),action:body.action};
      if (body.action==="credit") p.amount=integer(body.amount,1,100);
      else if (body.action==="toggle") { if(typeof body.active!=="boolean") throw new ApiError("密码状态无效"); p.active=body.active; }
      else if (body.action==="edit") { p.label=typeof body.label==="string"?body.label.trim():""; if(!p.label || p.label.length>80) throw new ApiError("备注请填写1至80字"); p.maxUses=integer(body.maxUses,1,10000); }
      else throw new ApiError("密码操作无效");
      return json(await rpc("admin/update_code",p,user.id));
    }
    if ((route==="codes" || route==="codes/export") && req.method==="GET") {
      const params=Object.fromEntries(url.searchParams);
      params.page=String(integer(params.page??1,1,100000));
      if(params.q?.length>100 || params.batch?.length>80) throw new ApiError("查询条件过长");
      if(params.status && !["all","available","disabled","exhausted"].includes(params.status)) throw new ApiError("筛选状态无效");
      if(params.codeHash && !/^[a-f0-9]{64}$/.test(params.codeHash)) throw new ApiError("密码查询格式无效");
      const data=await rpc(route==="codes/export"?"admin/export":"admin/codes",params,user.id);
      if(route==="codes") return json(data);
      const rows=[["编号","测试密码","批次备注","总次数","已用次数","剩余次数","状态","生成时间","批次编号"],...data.items.map((c:any)=>[c.id,c.code??"历史密码（无法还原）",c.label,c.maxUses,c.usedCount,c.remainingUses,c.active?"启用":"停用",c.createdAt,c.batchId??""])];
      headers.set("Content-Type","text/csv; charset=utf-8"); headers.set("Content-Disposition",'attachment; filename="test-codes.csv"');
      return new Response("\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),{headers});
    }
    if(route==="records" && req.method==="GET") {
      const params=Object.fromEntries(url.searchParams); params.page=String(integer(params.page??1,1,100000));
      if(params.codeId) integer(params.codeId,1,Number.MAX_SAFE_INTEGER);
      const data=await rpc("admin/records",params,user.id);
      data.items=data.items.map((r:any)=>{const outcome=classifyScores(r.scores);return {...r,...outcome,primaryName:resolveProfile(outcome.primaryId,content).name};});
      return json(data);
    }
    if(route==="audit" && req.method==="GET") return json(await rpc("admin/audit",{},user.id));
    if(route==="overview" && req.method==="GET") {
      const data=await rpc("admin/overview",{},user.id); const counts:Record<string,number>={};
      for(const row of data.grouped){const id=classifyScores(row.scores).primaryId;counts[id]=(counts[id]??0)+row.count;}
      delete data.grouped;
      data.distribution=[...storeProfiles,balancedProfile].map(p=>({id:p.id,name:resolveProfile(p.id,content).name,count:counts[p.id]??0})).sort((a,b)=>b.count-a.count);
      return json(data);
    }
    throw new ApiError("管理功能不存在",404);
  } catch(error) {
    if(error instanceof ApiError || error instanceof AdminError) return json({error:error.message},error.status);
    console.error("Store request failed",error instanceof Error ? error.name : "unknown");
    return json({error:"服务暂时不可用，请稍后重试"},503);
  }
});
