"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DIMENSIONS,
  balancedProfile,
  dimensionMeta,
  getDominantDimensions,
  type AssessmentOutcome,
  type Dimension,
} from "@/lib/assessment";
import { RadarChart } from "@/components/radar-chart";
import { defaultSiteContent, resolveProfile, type SiteContent } from "@/lib/site-content";
import { resultUrl, pageUrl } from "@/lib/client";
import { shopIllustrations } from "@/lib/store-art";
import "@/styles/shop-art.css";

export type SavedResult = AssessmentOutcome & {
  resultId: string;
  createdAt: string;
};

type ResultViewProps = {
  result: SavedResult;
  shareUrl?: string;
  content?: SiteContent;
};

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const chars = Array.from(text);
  let line = "";
  let cursorY = y;
  for (const char of chars) {
    const candidate = line + char;
    if (context.measureText(candidate).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = char;
      cursorY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) context.fillText(line, x, cursorY);
  return cursorY + lineHeight;
}

function drawRadar(
  context: CanvasRenderingContext2D,
  scores: Record<Dimension, number>,
  centerX: number,
  centerY: number,
  radius: number,
  color: string,
) {
  const pointFor = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / DIMENSIONS.length;
    const r = radius * (value / 100);
    return [centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r] as const;
  };

  context.lineWidth = 2;
  [20, 40, 60, 80, 100].forEach((level) => {
    context.beginPath();
    DIMENSIONS.forEach((_, index) => {
      const [x, y] = pointFor(index, level);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.strokeStyle = "rgba(37, 39, 48, .12)";
    context.stroke();
  });

  context.beginPath();
  DIMENSIONS.forEach((dimension, index) => {
    const [x, y] = pointFor(index, scores[dimension]);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.closePath();
  context.fillStyle = `${color}38`;
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.stroke();

  context.font = "26px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
  context.textAlign = "center";
  DIMENSIONS.forEach((dimension, index) => {
    const [x, y] = pointFor(index, 122);
    context.fillStyle = "#5b5b63";
    context.fillText(`${dimensionMeta[dimension].short} ${scores[dimension]}`, x, y + 8);
  });
  context.textAlign = "left";
}

export function ResultView({ result, shareUrl, content = defaultSiteContent }: ResultViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [exportImage, setExportImage] = useState<{ url: string; file: File } | null>(null);
  useEffect(() => () => { if (exportImage) URL.revokeObjectURL(exportImage.url); }, [exportImage]);
  const profile = useMemo(() => resolveProfile(result.primaryId, content), [result.primaryId, content]);
  const secondary = useMemo(() => resolveProfile(result.secondaryId, content), [result.secondaryId, content]);
  const isBalanced = profile.id === balancedProfile.id;
  const artwork = shopIllustrations[profile.id];
  const secondaryName = isBalanced ? "暂无明显副店型" : secondary.name;
  const dominant = useMemo(() => getDominantDimensions(result.scores), [result.scores]);
  const resolvedShareUrl = shareUrl ?? resultUrl(result.resultId);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resolvedShareUrl);
      showNotice("结果链接已复制");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = resolvedShareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showNotice("结果链接已复制");
    }
  };

  const saveLongImage = async () => {
    setBusy(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const illustrated = Boolean(artwork);
      const illustration = illustrated ? await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("店铺插画加载失败"));
        image.src = artwork;
      }) : null;
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = Math.max(3600, 3400 + Math.ceil(profile.analysis.join("").length / 24) * 49) + (illustrated ? 650 : 0);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");

      const gradient = context.createLinearGradient(0, 0, 1080, canvas.height);
      gradient.addColorStop(0, profile.palette[2]);
      gradient.addColorStop(0.48, "#fffaf2");
      gradient.addColorStop(1, "#f1e5d7");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1080, canvas.height);

      if (illustration) {
        context.fillStyle = "#fbf5e9";
        context.fillRect(0, 0, 1080, canvas.height);
        context.drawImage(illustration, -50, 0, 1180, 1180);
        // Fade only the illustration layer into the surrounding ivory paper.
        const bottomFade = context.createLinearGradient(0, 940, 0, 1180);
        bottomFade.addColorStop(0, "rgba(251,245,233,0)");
        bottomFade.addColorStop(1, "#fbf5e9");
        context.fillStyle = bottomFade;
        context.fillRect(0, 940, 1080, 240);
        const titleLayer = document.createElement("canvas");
        titleLayer.width = 1080;
        titleLayer.height = 1180;
        const titleContext = titleLayer.getContext("2d")!;
        const titleFade = titleContext.createLinearGradient(280, 0, 1080, 0);
        titleFade.addColorStop(0, "rgba(251,245,233,0)");
        titleFade.addColorStop(.5, "rgba(251,245,233,.9)");
        titleFade.addColorStop(1, "rgba(251,245,233,.99)");
        titleContext.fillStyle = titleFade;
        titleContext.fillRect(0, 0, 1080, 1180);
        const titleBottomFade = titleContext.createLinearGradient(0, 610, 0, 880);
        titleBottomFade.addColorStop(0, "rgba(255,255,255,0)");
        titleBottomFade.addColorStop(1, "#fff");
        titleContext.globalCompositeOperation = "destination-in";
        titleContext.fillStyle = titleBottomFade;
        titleContext.fillRect(0, 0, 1080, 1180);
        context.drawImage(titleLayer, 0, 0);
      }

      if (!illustrated) {
      context.fillStyle = "rgba(255,255,255,.72)";
      roundRect(context, 64, 70, 952, 540, 42);
      }
      context.fillStyle = profile.palette[0];
      context.font = "700 30px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      context.letterSpacing = "3px";
      context.textAlign = illustrated ? "right" : "left";
      context.fillText("你的店铺人格", illustrated ? 1016 : 112, illustrated ? 740 : 140);
      context.font = `${illustrated ? 100 : 140}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
      context.fillText(profile.emoji, illustrated ? 1016 : 112, illustrated ? 840 : 300);
      let nameSize = illustrated ? 78 : 82;
      do {
        context.font = `800 ${nameSize}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
        if (context.measureText(profile.name).width <= (illustrated ? 620 : 850)) break;
        nameSize -= 2;
      } while (nameSize > 36);
      context.fillText(profile.name, illustrated ? 1016 : 112, illustrated ? 935 : 405);
      context.font = "32px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      context.fillStyle = "#6c625b";
      wrapText(context, profile.kicker, illustrated ? 1016 : 116, illustrated ? 994 : 464, illustrated ? 650 : 850, 40);
      context.font = `600 ${illustrated ? 28 : 30}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
      context.fillStyle = profile.palette[0];
      wrapText(context, profile.tags.join(" · "), illustrated ? 1016 : 116, illustrated ? 1055 : 535, illustrated ? 650 : 850, 40);
      context.textAlign = "left";

      context.fillStyle = profile.palette[0];
      context.font = `700 ${illustrated ? 38 : 42}px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif`;
      let y = wrapText(context, `“${profile.quote}”`, 100, illustrated ? 1250 : 700, 880, 62);

      context.fillStyle = "rgba(255,255,255,.78)";
      roundRect(context, 64, y + 18, 952, 600, 42);
      drawRadar(context, result.scores, 540, y + 320, 188, profile.palette[1]);
      y += 680;

      context.fillStyle = profile.palette[0];
      context.font = "800 42px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      context.fillText("为什么你像这家店", 96, y);
      y += 65;
      context.fillStyle = "#4c4845";
      context.font = "30px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      for (const paragraph of profile.analysis) {
        y = wrapText(context, paragraph, 96, y, 888, 49) + 26;
      }

      context.fillStyle = "rgba(255,255,255,.82)";
      roundRect(context, 64, y + 5, 952, 540, 42);
      const rows = [
        ["招牌能力", profile.strength],
        ["容易被误解", profile.misunderstood],
        ["隐藏课题", profile.lesson],
        ["你的副店型", secondaryName],
      ];
      let rowY = y + 82;
      for (const [label, value] of rows) {
        context.fillStyle = profile.palette[1];
        context.font = "700 26px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
        context.fillText(label, 112, rowY);
        context.fillStyle = "#2f3036";
        context.font = "600 31px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
        wrapText(context, value, 320, rowY, 650, 42);
        rowY += 105;
      }
      y += 630;

      context.fillStyle = profile.palette[0];
      const ruleHeight = Math.max(250, 180 + Math.ceil(profile.rule.length / 20) * 55);
      roundRect(context, 64, y, 952, ruleHeight, 42);
      context.fillStyle = "rgba(255,255,255,.68)";
      context.font = "700 25px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      context.fillText("今日店规", 112, y + 68);
      context.fillStyle = "#fffaf2";
      context.font = "700 38px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      wrapText(context, profile.rule, 112, y + 135, 820, 55);

      context.fillStyle = "#746d68";
      context.font = "25px -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif";
      const footerY = y + ruleHeight + 80;
      context.fillText("如果你是一家店，会是什么店？ · 36题店铺人格测评", 86, footerY);

      // The analysis length varies by profile. Crop after layout rather than
      // clipping longer reports to a fixed 2820px image.
      const output = document.createElement("canvas");
      output.width = canvas.width;
      output.height = footerY + 80;
      const outputContext = output.getContext("2d");
      if (!outputContext) throw new Error("Canvas unavailable");
      outputContext.drawImage(canvas, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png", 0.96));
      if (!blob) throw new Error("Image generation failed");
      const file = new File([blob], `${profile.name}-店铺人格测试.png`, { type: "image/png" });
      setExportImage({ url: URL.createObjectURL(blob), file });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      showNotice("生成长图失败，请稍后再试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="result-page" style={{ "--profile": profile.palette[0], "--profile-soft": profile.palette[2] } as React.CSSProperties}>
      <div className="result-shell">
        <section className="result-card" id="result-card">
          <div className={artwork ? "result-hero illustrated-hero" : "result-hero"}>
            {artwork && <img className="shop-hero-art" src={artwork} alt={`${profile.name}店铺插画`} />}
            <div className={artwork ? "shop-hero-copy" : undefined}>
              <p className="eyebrow">你的店铺人格</p>
              <div className="result-symbol" aria-hidden="true">{profile.emoji}</div>
              <h1>{profile.name}</h1>
              <p className="result-kicker">{profile.kicker}</p>
              {artwork && <div className="tag-list">{profile.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
            </div>
            {!artwork && <div className="tag-list">
              {profile.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>}
          </div>

          <blockquote>{profile.quote}</blockquote>

          <section className="result-section profile-grid">
            <div className="radar-wrap">
              <RadarChart scores={result.scores} color={profile.palette[1]} />
            </div>
            <div className="profile-notes">
              <p className="eyebrow">你的六维轮廓</p>
              <h2>{isBalanced ? "目前更接近平衡区间" : "你最鲜明的两种气质"}</h2>
              {dominant.map(({ dimension, score }) => (
                <div className="dominant-row" key={dimension}>
                  <div>
                    <strong>{dimensionMeta[dimension].name}</strong>
                    <span>{Math.abs(score - 50) <= 8 ? "两端偏好接近" : score > 50 ? dimensionMeta[dimension].high : dimensionMeta[dimension].low}</span>
                  </div>
                  <b>{score}</b>
                </div>
              ))}
              <p className="method-note">{isBalanced ? "本次六项分数整体接近中间，暂不强行区分主副店型。分数反映这次的自我描述，并非能力高低。" : "人格更像连续的调音台，而不是非黑即白的格子。店铺类型根据六项偏好的方向组合匹配；分数并非人群百分位或能力等级。"}</p>
            </div>
          </section>

          <section className="result-section reading-section">
            <p className="eyebrow">为什么你像这家店</p>
            <h2>你为世界提供的，是这种氛围</h2>
            {profile.analysis.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>

          <section className="result-section insight-grid">
            <article><span>招牌能力</span><strong>{profile.strength}</strong></article>
            <article><span>容易被误解</span><strong>{profile.misunderstood}</strong></article>
            <article><span>隐藏课题</span><strong>{profile.lesson}</strong></article>
            <article><span>你的副店型</span><strong>{secondaryName}</strong></article>
          </section>

          <section className="today-rule">
            <span>今日店规</span>
            <strong>{profile.rule}</strong>
          </section>

          <p className="result-footnote">本测评基于人格特质、心理需要与环境偏好设计，用于趣味自我探索，不构成心理诊断。</p>
        </section>

        <section className="result-actions" aria-label="结果操作">
          <button className="primary-button" onClick={saveLongImage} disabled={busy}>
            {busy ? "正在生成长图…" : "保存结果长图"}
          </button>
          <button className="secondary-button" onClick={copyLink}>复制结果链接</button>
          <div className="action-row">
            <button className="ghost-button" onClick={() => { sessionStorage.removeItem("store-supabase-draft-v1"); window.location.href = pageUrl("/?retest=1"); window.location.reload(); }}>再测一次</button>
            <button className="gift-button" onClick={() => setModalOpen(true)}>{content.giftButtonLabel}</button>
          </div>
        </section>
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}

      {exportImage && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if(event.target===event.currentTarget) setExportImage(null); }}>
        <section className="gift-modal export-modal" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <button className="modal-close" aria-label="关闭长图预览" onClick={() => setExportImage(null)}>×</button>
          <h2 id="export-title">你的店铺长图已生成</h2>
          <p>电脑可下载 PNG；苹果手机可长按下方图片保存，或打开系统分享菜单选择“存储图像”。浏览器不能直接替你写入手机相册。</p>
          <div className="export-image-scroll"><img src={exportImage.url} alt={`${profile.name}的完整测评结果长图`} /></div>
          <a className="primary-button" href={exportImage.url} download={exportImage.file.name}>下载 PNG 长图</a>
          <button className="secondary-button" onClick={async () => {
            try {
              if(navigator.share && navigator.canShare?.({files:[exportImage.file]})) await navigator.share({files:[exportImage.file],title:`我的店铺人格：${profile.name}`});
              else showNotice("当前浏览器不支持系统分享，请下载或长按图片保存");
            } catch(error) { if(!(error instanceof DOMException && error.name==="AbortError")) showNotice("请下载或长按图片保存"); }
          }}>打开系统分享</button>
        </section>
      </div>}

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <section className="gift-modal" role="dialog" aria-modal="true" aria-labelledby="gift-title">
            <button className="modal-close" aria-label="关闭" onClick={() => setModalOpen(false)}>×</button>
            <div className="gift-icon">¥1</div>
            <p className="eyebrow">好评有礼</p>
            <h2 id="gift-title">{content.giftTitle}</h2>
            <p>{content.giftMessage}</p>
            <small className="demo-note">当前为非商业演示，奖励提示仅展示功能，不提供真实购买或返现活动。</small>
            <button className="primary-button" onClick={() => setModalOpen(false)}>我知道了</button>
          </section>
        </div>
      )}
    </main>
  );
}
