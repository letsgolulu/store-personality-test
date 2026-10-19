"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DIMENSIONS, dimensionMeta, questions } from "@/lib/assessment";
import { type ProfileCopy, type SiteContent } from "@/lib/site-content";
import { apiFetch, pageUrl, supabase } from "@/lib/client";

type Tab = "overview" | "codes" | "records" | "content" | "audit";
type Code = { id: number; code: string | null; label: string; maxUses: number; usedCount: number; remainingUses: number; active: boolean; createdAt: string; batchId: string | null };
type Batch = { id: string; label: string; count: number };
type CodesData = { items: Code[]; total: number; page: number; pageSize: number; batches: Batch[] };
type RecordItem = { id: string; codeId: number; label: string; primaryName: string; scores: Record<string, number>; createdAt: string };
type RecordsData = { items: RecordItem[]; total: number; page: number; pageSize: number };
type Activity = { action: string; summary: string; createdAt: string; actorEmail?: string };
type Overview = {
  codes: { total: number; available: number; disabled: number; remaining: number };
  results: { total: number; today: number };
  sessions: { total: number };
  days: { day: string; count: number }[];
  distribution: { id: string; name: string; count: number }[];
  activity: Activity[];
  today: string;
};
type Generation = { batchId: string; count: number; maxUses: number; label: string; codes: string[] };
const tabs: { id: Tab; name: string; icon: string; sub: string }[] = [
  { id: "overview", name: "经营概览", icon: "▦", sub: "看看这家店，今天怎么样" },
  { id: "codes", name: "测试密码", icon: "⌘", sub: "从生成到发货，有序管理每一份体验" },
  { id: "records", name: "测评记录", icon: "▤", sub: "每一次作答，都是一份新的自我探索" },
  { id: "content", name: "题目与文案", icon: "✎", sub: "让每一句话，都更像你的店" },
  { id: "audit", name: "操作日志", icon: "◷", sub: "重要的修改，都留在这里" },
];
const date = (value: string) => new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

async function api<T>(path: string, options: RequestInit = {}) {
  const response = await apiFetch("/api/admin/" + path, { ...options, cache: "no-store", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers } });
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "操作未完成，请刷新重试");
  return data as T;
}

function Empty({ text }: { text: string }) { return <div className="admin-empty"><span>⌂</span><p>{text}</p></div>; }
function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  return <div className="admin-pagination"><span>共 {total} 条 · 第 {page} / {Math.max(1, Math.ceil(total / 20))} 页</span><div><button disabled={page <= 1} onClick={() => onChange(page - 1)}>← 上一页</button><button disabled={page * 20 >= total} onClick={() => onChange(page + 1)}>下一页 →</button></div></div>;
}

export function AdminDashboard({ email, logoutUrl }: { email: string; logoutUrl: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [codes, setCodes] = useState<CodesData | null>(null);
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [savedContent, setSavedContent] = useState<SiteContent | null>(null);
  const [contentTab, setContentTab] = useState<"questions" | "profiles" | "gift">("questions");
  const [profileId, setProfileId] = useState("night-convenience");
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [exactCode, setExactCode] = useState("");
  const [status, setStatus] = useState("all");
  const [batch, setBatch] = useState("");
  const [codePage, setCodePage] = useState(1);
  const [recordPage, setRecordPage] = useState(1);
  const [recordCodeId, setRecordCodeId] = useState("");
  const [codeIdInput, setCodeIdInput] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingCode, setEditingCode] = useState<Code | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);

  const filter = new URLSearchParams({ q: query, codeHash: exactCode, status, batch, page: String(codePage) }).toString();
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (tab === "overview") setOverview(await api<Overview>("overview"));
      if (tab === "codes") setCodes(await api<CodesData>("codes?" + filter));
      if (tab === "records") setRecords(await api<RecordsData>(`records?page=${recordPage}&codeId=${encodeURIComponent(recordCodeId)}`));
      if (tab === "audit") setActivity((await api<{ items: Activity[] }>("audit")).items);
      if (tab === "content") {
        const data = await api<SiteContent>("content");
        setContent((existing) => existing ?? clone(data)); setSavedContent((existing) => existing ?? data);
      }
    } catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }, [tab, filter, recordPage, recordCodeId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice("已复制"); }
    catch { setError("浏览器未允许复制，请选中文字手动复制"); }
  };
  const download = async (queryString = filter) => {
    setBusy(true); setError("");
    try {
      const response = await apiFetch("/api/admin/codes/export?" + queryString, { cache: "no-store" });
      if (!response.ok) { const data = await response.json() as { error?: string }; throw new Error(data.error ?? "导出失败"); }
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = `测评密码-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000); setNotice("密码表格已导出");
    } catch (err) { setError(err instanceof Error ? err.message : "导出失败"); }
    finally { setBusy(false); }
  };
  const generate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const generated = await api<Generation>("codes", { method: "POST", body: JSON.stringify({ count: Number(data.get("count")), maxUses: Number(data.get("maxUses")), label: data.get("label"), prefix: data.get("prefix") }) });
      setGeneration(generated); setShowGenerate(false); setBatch(generated.batchId); setCodePage(1); setQuery(""); setExactCode(""); setQueryInput(""); setStatus("all");
      setNotice(`已生成${generated.count}个密码，可复制或导出发货`);
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : "生成失败"); }
    finally { setBusy(false); }
  };
  const updateCode = async (id: number, changes: object) => {
    setBusy(true); setError("");
    try { await api(`codes/${id}`, { method: "PATCH", body: JSON.stringify(changes) }); setEditingCode(null); setNotice("密码已更新"); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "更新失败"); }
    finally { setBusy(false); }
  };
  const updateContent = (updater: (current: SiteContent) => SiteContent) => { setContent((current) => current ? updater(current) : current); setDirty(true); };
  const updateProfile = (changes: Partial<ProfileCopy>) => updateContent((current) => ({ ...current, profiles: current.profiles.map((profile) => profile.id === profileId ? { ...profile, ...changes } : profile) }));
  const saveContent = async () => {
    if (!content) return;
    setBusy(true); setError("");
    try { const saved = await api<SiteContent>("content", { method: "PUT", body: JSON.stringify(content) }); setSavedContent(saved); setContent(clone(saved)); setDirty(false); setNotice("文案已发布，刷新测评页面即可看到更新"); }
    catch (err) { setError(err instanceof Error ? err.message : "发布失败"); }
    finally { setBusy(false); }
  };
  const activeTab = tabs.find((item) => item.id === tab)!;
  const selectedProfile = content?.profiles.find((profile) => profile.id === profileId);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href={pageUrl("/admin")}><span className="admin-brand-mark">店</span><div><strong>店铺人格研究所</strong><small>店长工作台</small></div></a>
        <p className="admin-nav-caption">WORKSPACE</p>
        <nav aria-label="后台导航">{tabs.map((item) => <button key={item.id} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.name}{item.id === "content" && dirty && <i />}</button>)}</nav>
        <div className="admin-sidebar-footer"><span className="admin-owner-dot" />仅网站所有者可访问<p>把日常经营，整理得井井有条。</p></div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar"><span>店长工作台 <b>/</b> {activeTab.name}</span><div><a href={pageUrl()} target="_blank" rel="noreferrer">查看测评 ↗</a><a href={logoutUrl} onClick={async (event) => { event.preventDefault(); await supabase.auth.signOut(); location.assign(pageUrl("/admin")); location.reload(); }}>退出</a><span className="admin-avatar" title={email}>店</span></div></header>
        <div className="admin-content">
          <div className="admin-page-heading"><div><p className="eyebrow">STORE OPERATIONS</p><h1>{activeTab.name}</h1><p>{activeTab.sub}</p></div><button className="admin-button" onClick={() => { if (tab === "content") { if (dirty && !confirm("重新载入将放弃尚未发布的修改，是否继续？")) return; setContent(null); setSavedContent(null); setDirty(false); } void load(); }} disabled={loading || busy}>{loading ? "加载中…" : "↻ 刷新数据"}</button></div>
          {error && <div className="admin-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="关闭提示">×</button></div>}
          {loading && <div className="admin-loading" role="status">正在整理店铺数据…</div>}

          {tab === "overview" && overview && <>
            <section className="admin-metrics" aria-label="核心统计">
              {[{ label: "累计完成测评", value: overview.results.total, sub: `今日新增 ${overview.results.today} 份` }, { label: "可用测试密码", value: overview.codes.available, sub: `共 ${overview.codes.total} 个 · 停用 ${overview.codes.disabled} 个` }, { label: "可开测剩余次数", value: overview.codes.remaining, sub: "仅统计启用中的密码" }, { label: "测评完成率", value: `${overview.sessions.total ? Math.round(overview.results.total / overview.sessions.total * 100) : 0}%`, sub: `累计开测 ${overview.sessions.total} 次` }].map((metric, index) => <article className="admin-metric" key={metric.label}><span>{metric.label}<i>0{index + 1}</i></span><strong>{metric.value}</strong><p>{metric.sub}</p></article>)}
            </section>
            <div className="admin-overview-grid">
              <section className="admin-panel"><div className="admin-panel-heading"><h2>最近14天的测评</h2><span>北京时间</span></div><div className="admin-daily-chart">{Array.from({ length: 14 }, (_, index) => {
                const day = new Date(new Date(overview.today + "T00:00:00Z").getTime() - (13 - index) * 86400_000).toISOString().slice(0, 10);
                const count = overview.days.find((item) => item.day === day)?.count ?? 0;
                const maximum = Math.max(1, ...overview.days.map((item) => item.count));
                return <div key={day} title={`${day}：${count}份`}><b>{count || ""}</b><div className="admin-bar-track"><i style={{ height: `${Math.max(2, count / maximum * 100)}%` }} /></div><small>{index % 3 === 0 || index === 13 ? day.slice(5) : ""}</small></div>;
              })}</div><p className="admin-panel-note">只统计已完成并生成报告的测评。</p></section>
              <section className="admin-panel"><div className="admin-panel-heading"><h2>店型分布</h2><span>按当前匹配规则</span></div><div className="admin-distribution">{overview.distribution.map((item) => <div key={item.id}><span>{item.name}</span><div><i style={{ width: `${overview.results.total ? item.count / overview.results.total * 100 : 0}%` }} /></div><b>{item.count}</b></div>)}</div></section>
            </div>
            <section className="admin-panel"><div className="admin-panel-heading"><h2>最近的经营动作</h2><button className="admin-text-button" onClick={() => setTab("audit")}>全部日志 →</button></div>{overview.activity.length ? <div className="admin-activity">{overview.activity.map((item, index) => <div key={index}><i /><p>{item.summary}</p><time>{date(item.createdAt)}</time></div>)}</div> : <Empty text="还没有后台操作记录，先生成第一批密码吧。" />}</section>
          </>}

          {tab === "codes" && <>
            {generation && <section className="admin-success"><div><strong>✓ 「{generation.label}」已准备好</strong><p>{generation.count}个密码 · 每个可测{generation.maxUses}次</p></div><div><button className="admin-button" onClick={() => void copy(generation.codes.join("\n"))}>复制本批密码</button><button className="admin-button" disabled={busy} onClick={() => void download(new URLSearchParams({ batch: generation.batchId }).toString())}>导出本批 CSV</button><button className="admin-text-button" onClick={() => setGeneration(null)} aria-label="关闭生成提示">×</button></div></section>}
            <section className="admin-panel admin-codes-panel">
              <div className="admin-panel-heading"><div><h2>密码库存</h2><p>默认每个可测3次，支持按订单备注和批次发货。</p></div><div className="admin-button-group"><button className="admin-button" onClick={() => void download()} disabled={busy}>↓ 导出筛选结果</button><button className="admin-button main" onClick={() => setShowGenerate(true)}>＋ 生成密码</button></div></div>
              <form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setQuery(queryInput); setExactCode(""); setCodePage(1); }}><input aria-label="搜索备注或密码编号" placeholder="搜索批次备注、密码编号…" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} /><button className="admin-button" type="submit">搜索</button><select aria-label="密码状态" value={status} onChange={(event) => { setStatus(event.target.value); setCodePage(1); }}><option value="all">全部状态</option><option value="available">可用</option><option value="exhausted">已用完</option><option value="disabled">已停用</option></select><select aria-label="密码批次" value={batch} onChange={(event) => { setBatch(event.target.value); setCodePage(1); }}><option value="">全部批次</option>{codes?.batches.map((item) => <option key={item.id} value={item.id}>{item.label}（{item.count}个）</option>)}</select><button type="button" className="admin-text-button" onClick={() => { setQuery(""); setExactCode(""); setQueryInput(""); setStatus("all"); setBatch(""); setCodePage(1); }}>重置</button></form>
              <form className="admin-exact-search" onSubmit={async (event) => { event.preventDefault(); const text = String(new FormData(event.currentTarget).get("code") ?? "").trim().toUpperCase(); const digest = text ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)) : null; setExactCode(digest ? Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("") : ""); setQuery(""); setQueryInput(""); setBatch(""); setStatus("all"); setCodePage(1); }}><input name="code" aria-label="按完整测试密码查询" placeholder="粘贴完整测试密码，精确查询次数" /><button className="admin-text-button">查询密码 →</button></form>
              <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>测试密码 / 备注</th><th>使用情况</th><th>状态</th><th>创建时间</th><th>管理</th></tr></thead><tbody>{codes?.items.map((row) => <tr key={row.id}><td><div className="admin-code-value"><code>{row.code ?? `历史密码 #${row.id}`}</code>{row.code && <button title="复制密码" aria-label={`复制密码${row.id}`} onClick={() => void copy(row.code!)}>⧉</button>}</div><small>#{row.id} · {row.label}</small></td><td><strong className="admin-remaining">剩余 {row.remainingUses} 次</strong><small>已用 {row.usedCount} / 总共 {row.maxUses} 次</small><div className="admin-mini-progress"><i style={{ width: `${Math.min(100, row.usedCount / row.maxUses * 100)}%` }} /></div></td><td><span className={`admin-status ${!row.active ? "muted" : row.remainingUses ? "available" : "used"}`}>{!row.active ? "已停用" : row.remainingUses ? "可使用" : "已用完"}</span></td><td className="admin-date">{date(row.createdAt)}</td><td><div className="admin-row-actions"><button disabled={busy} onClick={() => void updateCode(row.id, { action: "credit", amount: 3 })} aria-label={`密码${row.id}补3次`}>＋3次</button><button disabled={busy} onClick={() => setEditingCode(row)}>编辑</button><button disabled={busy} onClick={() => void updateCode(row.id, { action: "toggle", active: !row.active })}>{row.active ? "停用" : "启用"}</button><button onClick={() => { setRecordCodeId(String(row.id)); setCodeIdInput(String(row.id)); setRecordPage(1); setTab("records"); }}>记录 ↗</button></div></td></tr>)}</tbody></table></div>
              {codes && !codes.items.length && <Empty text="没有符合筛选条件的密码。" />}
              {codes && <Pager page={codePage} total={codes.total} onChange={setCodePage} />}
              <p className="admin-panel-note">历史密码不能还原原文，可按编号或备注管理。新生成的密码可重复导出。停用会阻止新开测，已开始的测试仍可完成。</p>
            </section>
          </>}

          {tab === "records" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>已完成的测评</h2><p>店型按当前规则匹配，与打开后的结果页保持一致。</p></div><span className="admin-count">{records?.total ?? 0} 份</span></div><form className="admin-filters" onSubmit={(event) => { event.preventDefault(); setRecordCodeId(codeIdInput); setRecordPage(1); }}><input aria-label="筛选密码编号" placeholder="按密码编号筛选，例如 12" inputMode="numeric" value={codeIdInput} onChange={(event) => setCodeIdInput(event.target.value)} /><button className="admin-button">筛选记录</button><button type="button" className="admin-text-button" onClick={() => { setCodeIdInput(""); setRecordCodeId(""); setRecordPage(1); }}>显示全部</button></form><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>完成时间</th><th>关联密码</th><th>店铺人格</th><th>六维分数</th><th>报告</th></tr></thead><tbody>{records?.items.map((row) => <tr key={row.id}><td className="admin-date">{date(row.createdAt)}</td><td><strong>密码 #{row.codeId}</strong><small>{row.label}</small></td><td><span className="admin-profile-tag">{row.primaryName}</span></td><td><div className="admin-score-list">{DIMENSIONS.map((dimension) => <span key={dimension} title={dimensionMeta[dimension].name}>{dimensionMeta[dimension].short}<b>{row.scores[dimension]}</b></span>)}</div></td><td><a className="admin-text-button" href={pageUrl(`/result/${row.id}`)} target="_blank" rel="noreferrer">查看报告 ↗</a></td></tr>)}</tbody></table></div>{records && !records.items.length && <Empty text="还没有符合条件的已完成测评。" />}{records && <Pager page={recordPage} total={records.total} onChange={setRecordPage} />}</section>}

          {tab === "content" && content && <section className="admin-panel admin-editor"><div className="admin-panel-heading"><div><h2>网站内容编辑</h2><p>当前第 {content.revision} 版{content.updatedAt ? ` · ${date(content.updatedAt)} 更新` : " · 使用默认文案"}</p></div><span className={`admin-status ${dirty ? "used" : "available"}`}>{dirty ? "有未发布修改" : "已同步"}</span></div><div className="admin-editor-tabs" role="tablist" aria-label="文案类别">{[{ id: "questions", label: "题目（36道）" }, { id: "profiles", label: "店型与解析" }, { id: "gift", label: "好评有礼" }].map((item) => <button key={item.id} role="tab" aria-selected={contentTab === item.id} onClick={() => setContentTab(item.id as typeof contentTab)}>{item.label}</button>)}</div>
            {contentTab === "questions" && <div className="admin-question-editor"><div className="admin-tip">可以修改题目表述；题号、所属维度与反向计分保持固定。请保留原题意，以免影响已验证的匹配规则。</div>{content.questionTexts.map((text, index) => <div className="admin-question-row" key={index}><label htmlFor={`question-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{dimensionMeta[questions[index].dimension].name}</span>{questions[index].reverse && <small>反向题</small>}</label><textarea id={`question-${index}`} rows={2} maxLength={180} value={text} onChange={(event) => updateContent((current) => ({ ...current, questionTexts: current.questionTexts.map((existing, i) => i === index ? event.target.value : existing) }))} /></div>)}</div>}
            {contentTab === "profiles" && <div className="admin-profile-editor"><label className="admin-field"><span>选择要编辑的店型</span><select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{content.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>{selectedProfile && <div className="admin-editor-grid">{[{ key: "name", label: "店型名称", max: 12 }, { key: "kicker", label: "副标题", max: 30 }, { key: "quote", label: "分享金句", max: 80 }, { key: "strength", label: "招牌能力", max: 32 }, { key: "misunderstood", label: "容易被误解", max: 32 }, { key: "lesson", label: "隐藏课题", max: 40 }, { key: "rule", label: "今日店规", max: 60 }].map(({ key, label, max }) => <label className={`admin-field ${key === "quote" || key === "rule" ? "wide" : ""}`} key={key}><span>{label}</span><input value={selectedProfile[key as keyof ProfileCopy] as string} maxLength={max} onChange={(event) => updateProfile({ [key]: event.target.value })} /></label>)}<div className="admin-field wide"><span>3个分享标签</span><div className="admin-tags-editor">{selectedProfile.tags.map((tag, index) => <input key={index} aria-label={`分享标签${index + 1}`} maxLength={10} value={tag} onChange={(event) => updateProfile({ tags: selectedProfile.tags.map((existing, i) => i === index ? event.target.value : existing) as [string, string, string] })} />)}</div></div>{selectedProfile.analysis.map((paragraph, index) => <label className="admin-field wide" key={index}><span>结果解析 · 第{index + 1}段</span><textarea rows={5} maxLength={300} value={paragraph} onChange={(event) => updateProfile({ analysis: selectedProfile.analysis.map((existing, i) => i === index ? event.target.value : existing) })} /><small>{paragraph.length}/300字</small></label>)}</div>}</div>}
            {contentTab === "gift" && <div className="admin-gift-editor"><label className="admin-field"><span>好评按钮文字</span><input maxLength={24} value={content.giftButtonLabel} onChange={(event) => updateContent((current) => ({ ...current, giftButtonLabel: event.target.value }))} /></label><label className="admin-field"><span>弹窗标题</span><input maxLength={30} value={content.giftTitle} onChange={(event) => updateContent((current) => ({ ...current, giftTitle: event.target.value }))} /></label><label className="admin-field"><span>好评提醒内容</span><textarea rows={5} maxLength={300} value={content.giftMessage} onChange={(event) => updateContent((current) => ({ ...current, giftMessage: event.target.value }))} /></label><div className="admin-gift-preview"><span>弹窗文字预览</span><h3>{content.giftTitle}</h3><p>{content.giftMessage}</p><b>{content.giftButtonLabel}</b></div></div>}
            <div className="admin-editor-footer"><span>{dirty ? "发布后，刷新网站即可看到新文案" : "题量和计分规则不会因修改文案而改变"}</span><div><button className="admin-button" disabled={!dirty || busy} onClick={() => { if (savedContent && confirm("撤销本次尚未发布的修改？")) { setContent(clone(savedContent)); setDirty(false); } }}>撤销修改</button><button className="admin-button main" disabled={!dirty || busy} onClick={() => void saveContent()}>{busy ? "发布中…" : "保存并发布文案"}</button></div></div>
          </section>}

          {tab === "audit" && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>最近100次后台操作</h2><p>记录密码生成、补次、停用、导出和文案更新。</p></div></div>{activity.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>时间</th><th>操作内容</th><th>操作账号</th></tr></thead><tbody>{activity.map((item, index) => <tr key={index}><td className="admin-date">{date(item.createdAt)}</td><td>{item.summary}</td><td className="admin-date">{item.actorEmail}</td></tr>)}</tbody></table></div> : <Empty text="后台操作会在这里留下记录。" />}</section>}
          <footer className="admin-bottom-note">店铺人格研究所 · 店长专属工作台 <span>登录账号：{email}</span></footer>
        </div>
      </main>
      {notice && <div className="admin-toast" role="status">✓ {notice}</div>}

      {showGenerate && <div className="admin-modal-backdrop"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="generate-title"><button className="admin-modal-close" aria-label="关闭生成窗口" disabled={busy} onClick={() => setShowGenerate(false)}>×</button><p className="eyebrow">NEW BATCH</p><h2 id="generate-title">准备一批新密码</h2><p>生成后可复制、下载表格，并按备注批次管理。</p><form onSubmit={(event) => void generate(event)}><label className="admin-field"><span>批次备注</span><input name="label" required maxLength={80} placeholder="例如：10月首发 / 店铺订单批次" defaultValue={`${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" }).format(new Date())} 发货批次`} /></label><div className="admin-two-fields"><label className="admin-field"><span>生成数量</span><input name="count" type="number" required min={1} max={200} defaultValue={20} /></label><label className="admin-field"><span>每个密码可测次数</span><input name="maxUses" type="number" required min={1} max={100} defaultValue={3} /></label></div><label className="admin-field"><span>密码前缀</span><input name="prefix" required maxLength={8} minLength={2} pattern="[A-Za-z0-9]{2,8}" defaultValue="SHOP" /></label><button className="admin-button main admin-full-button" disabled={busy}>{busy ? "正在生成…" : "生成密码"}</button></form></section></div>}
      {editingCode && <div className="admin-modal-backdrop"><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="edit-code-title"><button className="admin-modal-close" aria-label="关闭编辑窗口" disabled={busy} onClick={() => setEditingCode(null)}>×</button><h2 id="edit-code-title">编辑密码 #{editingCode.id}</h2><p>已用 {editingCode.usedCount} 次；总次数不能小于已用次数。</p><form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void updateCode(editingCode.id, { action: "edit", label: form.get("label"), maxUses: Number(form.get("maxUses")) }); }}><label className="admin-field"><span>备注</span><input name="label" maxLength={80} required defaultValue={editingCode.label} /></label><label className="admin-field"><span>总次数</span><input name="maxUses" type="number" min={Math.max(1, editingCode.usedCount)} max={10000} required defaultValue={editingCode.maxUses} /></label><button className="admin-button main admin-full-button" disabled={busy}>{busy ? "保存中…" : "保存修改"}</button></form></section></div>}
    </div>
  );
}
