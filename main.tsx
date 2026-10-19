import { StrictMode, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { AssessmentApp } from "@/components/assessment-app";
import { AdminDashboard } from "@/components/admin-dashboard";
import { ResultView, type SavedResult } from "@/components/result-view";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";
import { apiFetch, pageUrl, supabase } from "@/lib/client";
import "./styles/main.css";
import "./styles/admin.css";

function AdminEntry() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [identity, setIdentity] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  async function check() {
    setChecking(true);
    try {
      const response = await apiFetch("/api/admin/me");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "尚未登录管理账号");
      setIdentity(data.email);
    } catch { setIdentity(null); }
    finally { setChecking(false); }
  }
  useEffect(() => { void check(); }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); setChecking(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("邮箱或后台密码不正确，请确认管理员账号已经建立。");
      setPassword("");
      const response = await apiFetch("/api/admin/me"); const data = await response.json();
      if (!response.ok) { await supabase.auth.signOut(); throw new Error(data.error ?? "此账号没有管理员权限"); }
      setIdentity(data.email);
    } catch (err) { setError(err instanceof Error ? err.message : "登录失败"); }
    finally { setChecking(false); }
  }
  if (identity) return <AdminDashboard email={identity} logoutUrl={pageUrl("/admin")} />;
  return <main className="admin-login"><section className="admin-login-card"><a className="brand" href={pageUrl()}><span className="brand-mark">店</span>店铺人格研究所</a><p className="eyebrow">MANAGER ACCESS</p><h1>欢迎回来，店长</h1><p>使用本站的管理员邮箱和后台密码登录。这里的密码不是 GitHub 或 Supabase 控制台的登录密码。</p><form onSubmit={login}><label className="admin-field"><span>管理员邮箱</span><input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label className="admin-field"><span>后台密码</span><input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="admin-button main admin-full-button" disabled={checking}>{checking ? "正在检查…" : "登录工作台 →"}</button></form><a className="admin-login-back" href={pageUrl()}>← 返回测评首页</a></section></main>;
}

function App() {
  const [route, setRoute] = useState(location.hash.slice(1) || "/");
  const [content, setContent] = useState<SiteContent>(defaultSiteContent);
  const [result, setResult] = useState<SavedResult | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { const changed = () => { setRoute(location.hash.slice(1) || "/"); setResult(null); }; window.addEventListener("hashchange", changed); return () => window.removeEventListener("hashchange", changed); }, []);
  useEffect(() => {
    let cancelled = false; setError(""); setReady(false);
    void (async () => {
      try {
        const response = await apiFetch("/api/content"); if (!response.ok) throw new Error("暂时无法连接测评服务，请稍后重试。");
        const loaded = await response.json(); if (cancelled) return; setContent(loaded);
        const match = route.match(/^\/result\/([a-f0-9]{32})$/);
        if (match) {
          const report = await apiFetch(`/api/results/${match[1]}`); const data = await report.json();
          if (!report.ok) throw new Error(data.error ?? "这份报告暂时无法读取");
          if (!cancelled) setResult(data);
        }
        if (!cancelled) setReady(true);
      } catch (err) { if (!cancelled) setError(err instanceof Error ? err.message : "连接失败，请检查网络后重试。"); }
    })(); return () => { cancelled = true; };
  }, [route, retry]);
  if (route === "/admin") return <AdminEntry />;
  if (error) return <main className="loading-page"><h1>稍等，店铺还在连接中</h1><p role="alert">{error}</p><button className="primary-button" onClick={() => setRetry(value => value + 1)}>重新连接</button><a href={pageUrl()}>返回首页</a></main>;
  if (!ready) return <main className="loading-page"><p className="eyebrow">STORE PERSONALITY</p><h1>店铺正在亮灯…</h1><p>正在读取最新测评内容</p></main>;
  if (result) return <ResultView result={result} content={content} />;
  if (route.startsWith("/result/")) return <main className="loading-page"><h1>报告链接不完整</h1><a href={pageUrl()}>返回首页</a></main>;
  return <AssessmentApp content={content} />;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
