"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { questions as baseQuestions, type AssessmentOutcome } from "@/lib/assessment";
import { ResultView, type SavedResult } from "@/components/result-view";
import { defaultSiteContent, type SiteContent } from "@/lib/site-content";
import { apiFetch, pageUrl } from "@/lib/client";

const choices = [
  { value: 1, label: "完全不符合", short: "完全不符合" },
  { value: 2, label: "比较不符合", short: "比较不符合" },
  { value: 3, label: "不确定 / 一半一半", short: "一半一半" },
  { value: 4, label: "比较符合", short: "比较符合" },
  { value: 5, label: "非常符合", short: "非常符合" },
];

type Screen = "gate" | "quiz" | "submitting" | "result";

type Draft = {
  sessionToken: string;
  expiresAt: string;
  remainingUses: number;
  answers: Array<number | null>;
  current: number;
};

export function AssessmentApp({ content = defaultSiteContent }: { content?: SiteContent }) {
  const questions = useMemo(() => baseQuestions.map((question, index) => ({ ...question, text: content.questionTexts[index] ?? question.text })), [content]);
  const [screen, setScreen] = useState<Screen>("gate");
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [remainingUses, setRemainingUses] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>(() => Array(questions.length).fill(null));
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<SavedResult | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("store-supabase-draft-v1");
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      if (
        draft.sessionToken &&
        new Date(draft.expiresAt).getTime() > Date.now() &&
        Array.isArray(draft.answers) &&
        draft.answers.length === questions.length
      ) {
        setSessionToken(draft.sessionToken);
        setExpiresAt(draft.expiresAt);
        setRemainingUses(draft.remainingUses);
        setAnswers(draft.answers);
        setCurrent(Math.min(Math.max(draft.current, 0), questions.length - 1));
        setScreen("quiz");
      }
    } catch {
      sessionStorage.removeItem("store-supabase-draft-v1");
    }
  }, []);

  useEffect(() => {
    if (screen !== "quiz" || !sessionToken) return;
    const draft: Draft = { sessionToken, expiresAt, remainingUses: remainingUses ?? 0, answers, current };
    sessionStorage.setItem("store-supabase-draft-v1", JSON.stringify(draft));
  }, [screen, sessionToken, expiresAt, remainingUses, answers, current]);

  const answeredCount = useMemo(() => answers.filter((answer) => answer !== null).length, [answers]);
  const selected = answers[current];

  const startTest = async (event: FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setGateError("请输入测试密码");
      return;
    }
    setLoading(true);
    setGateError("");
    try {
      const response = await apiFetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: password }),
      });
      const data = (await response.json()) as { sessionToken?: string; remainingUses?: number; expiresAt?: string; error?: string };
      if (!response.ok || !data.sessionToken || !data.expiresAt) {
        throw new Error(data.error ?? "密码验证失败");
      }
      setSessionToken(data.sessionToken);
      setExpiresAt(data.expiresAt);
      setRemainingUses(data.remainingUses ?? 0);
      setAnswers(Array(questions.length).fill(null));
      setCurrent(0);
      setPassword("");
      setScreen("quiz");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setGateError(error instanceof Error ? error.message : "暂时无法开始测试");
    } finally {
      setLoading(false);
    }
  };

  const choose = (value: number) => {
    setAnswers((existing) => {
      const next = [...existing];
      next[current] = value;
      return next;
    });
  };

  const goNext = () => {
    if (selected === null) return;
    if (current < questions.length - 1) {
      setCurrent((index) => index + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    void submitAnswers();
  };

  const submitAnswers = async () => {
    if (answers.some((answer) => answer === null)) {
      const missing = answers.findIndex((answer) => answer === null);
      setCurrent(missing);
      return;
    }
    setScreen("submitting");
    try {
      const response = await apiFetch("/api/results", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionToken, answers }),
      });
      const data = (await response.json()) as (AssessmentOutcome & { resultId?: string; createdAt?: string; error?: string });
      if (!response.ok || !data.resultId || !data.createdAt) throw new Error(data.error ?? "生成结果失败");
      sessionStorage.removeItem("store-supabase-draft-v1");
      setResult({
        resultId: data.resultId,
        createdAt: data.createdAt,
        primaryId: data.primaryId,
        secondaryId: data.secondaryId,
        scores: data.scores,
      });
      setScreen("result");
      window.history.replaceState({}, "", pageUrl(`/result/${data.resultId}`));
      window.scrollTo({ top: 0 });
    } catch (error) {
      setGateError(error instanceof Error ? error.message : "生成结果失败，请稍后重试");
      setScreen("quiz");
    }
  };

  if (screen === "result" && result) {
    return <ResultView result={result} content={content} />;
  }

  if (screen === "submitting") {
    return (
      <main className="loading-page">
        <div className="loading-mark"><span /><span /><span /></div>
        <p className="eyebrow">正在为你选址</p>
        <h1>你的店铺正在亮灯</h1>
        <p>我们正在分析六个维度，并寻找与你最接近的店铺人格。</p>
      </main>
    );
  }

  if (screen === "quiz") {
    const question = questions[current];
    return (
      <main className="quiz-page">
        <header className="quiz-header">
          <a className="brand" href={pageUrl()} aria-label="返回首页">
            <span className="brand-mark">店</span>
            <span>如果你是一家店</span>
          </a>
          <div className="quiz-status">已答 {answeredCount}/{questions.length}</div>
        </header>

        <div className="progress-track" aria-label={`测试进度 ${current + 1}/${questions.length}`}>
          <span style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        <section className="question-shell">
          <div className="question-number">
            <span>{String(current + 1).padStart(2, "0")}</span>
            <small>/ {questions.length}</small>
          </div>
          <p className="scenario-label">请按过去六个月的真实状态回答</p>
          <h1>{question.text}</h1>

          <div className="choice-list" role="radiogroup" aria-label="请选择符合程度">
            {choices.map((choice) => (
              <button
                key={choice.value}
                className={selected === choice.value ? "choice selected" : "choice"}
                type="button"
                role="radio"
                aria-checked={selected === choice.value}
                onClick={() => choose(choice.value)}
              >
                <span className="choice-dot">{choice.value}</span>
                <span>{choice.label}</span>
                <i aria-hidden="true">✓</i>
              </button>
            ))}
          </div>

          {gateError && <p className="form-error" role="alert">{gateError}</p>}

          <div className="quiz-nav">
            <button
              className="ghost-button"
              type="button"
              disabled={current === 0}
              onClick={() => { setGateError(""); setCurrent((index) => Math.max(0, index - 1)); }}
            >
              ← 上一题
            </button>
            <button className="primary-button" type="button" disabled={selected === null} onClick={goNext}>
              {current === questions.length - 1 ? "查看我的店铺" : "下一题 →"}
            </button>
          </div>
          {remainingUses !== null && <p className="remaining-note">本次开始后，这个密码还可使用 {remainingUses} 次</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="landing-page">
      <div className="grain" aria-hidden="true" />
      <header className="landing-header">
        <div className="brand">
          <span className="brand-mark">店</span>
          <span>店铺人格研究所</span>
        </div>
        <span className="header-note">36道真实情境题</span>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">STORE PERSONALITY TEST</p>
          <h1>如果你是<br />一家店，<br /><em>会是什么店？</em></h1>
          <p className="hero-lead">你为世界提供的，或许从来不只是商品，而是一种让人愿意停留的氛围。</p>

          <form className="password-card" onSubmit={startTest}>
            <label htmlFor="test-code">输入测试密码</label>
            <div className="password-row">
              <input
                id="test-code"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setGateError(""); }}
                placeholder="请输入体验密码"
                autoComplete="one-time-code"
                autoCapitalize="characters"
              />
              <button className="primary-button" disabled={loading} type="submit">
                {loading ? "验证中…" : "开始测试"}
              </button>
            </div>
            {gateError && <p className="form-error" role="alert">{gateError}</p>}
            <p className="password-help">每个密码默认可开始3次测试，请妥善保存。</p>
          </form>
        </div>

        <div className="store-scene" aria-label="不同风格的店铺插画">
          <div className="sun-orbit" />
          <div className="store-building">
            <div className="awning"><span /><span /><span /><span /><span /></div>
            <div className="store-sign">今天，也欢迎成为你自己</div>
            <div className="shop-window left-window"><span>BOOKS</span><i>⌑</i></div>
            <div className="shop-door"><b>OPEN</b><span /></div>
            <div className="shop-window right-window"><span>FLOWERS</span><i>✿</i></div>
          </div>
          <div className="scene-caption">
            <strong>12种店铺人格</strong>
            <span>另设平衡型，不强行给你贴标签</span>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <article><span>01</span><strong>真实情境</strong><p>不问抽象口号，只问你在生活中会怎么做。</p></article>
        <article><span>02</span><strong>六维分析</strong><p>从联结、探索、秩序、温度、边界与节奏理解自己。</p></article>
        <article><span>03</span><strong>完整报告</strong><p>获得主店型、副店型、优势、误解与今日店规。</p></article>
      </section>

      <footer className="landing-footer">非商业趣味测评演示 · 不提供在线购买或收款 · 不构成心理诊断</footer>
    </main>
  );
}
