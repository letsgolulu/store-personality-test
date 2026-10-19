import { questions, storeProfiles, balancedProfile, type StoreProfile } from "./assessment.ts";

export type ProfileCopy = Pick<StoreProfile, "id" | "name" | "kicker" | "quote" | "tags" | "analysis" | "strength" | "misunderstood" | "lesson" | "rule">;
export type SiteContent = {
  revision: number;
  updatedAt: string | null;
  questionTexts: string[];
  profiles: ProfileCopy[];
  giftMessage: string;
  giftTitle: string;
  giftButtonLabel: string;
};

export const defaultSiteContent: SiteContent = {
  revision: 0,
  updatedAt: null,
  questionTexts: questions.map((question) => question.text),
  profiles: [...storeProfiles, balancedProfile].map(({ id, name, kicker, quote, tags, analysis, strength, misunderstood, lesson, rule }) => ({ id, name, kicker, quote, tags, analysis, strength, misunderstood, lesson, rule })),
  giftMessage: "店铺好评后，请联系客服并发送好评截图，即可获得1元返现。",
  giftTitle: "谢谢你的认真体验",
  giftButtonLabel: "好评有礼 · 返1元",
};

function boundedText(value: unknown, label: string, max: number) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new Error(`${label}请填写1至${max}字`);
  return value.trim();
}

export function validateSiteContent(value: unknown): SiteContent {
  if (!value || typeof value !== "object") throw new Error("文案数据不完整");
  const input = value as Record<string, unknown>;
  if (!Number.isSafeInteger(input.revision) || Number(input.revision) < 0) throw new Error("文案版本无效");
  if (!Array.isArray(input.questionTexts) || input.questionTexts.length !== questions.length) throw new Error("请保留完整的36道题目");
  if (!Array.isArray(input.profiles) || input.profiles.length !== defaultSiteContent.profiles.length) throw new Error("店型文案不完整");
  const profiles = defaultSiteContent.profiles.map((original) => {
    const matching = (input.profiles as Record<string, unknown>[]).filter((item) => item?.id === original.id);
    if (matching.length !== 1) throw new Error("店型编号重复或缺失");
    const row = matching[0];
    if (!Array.isArray(row.tags) || row.tags.length !== 3 || !Array.isArray(row.analysis) || row.analysis.length !== 2) throw new Error("每个店型需保留3个标签和2段解析");
    return {
      id: original.id,
      name: boundedText(row.name, "店型名称", 12),
      kicker: boundedText(row.kicker, "店型副标题", 30),
      quote: boundedText(row.quote, "分享金句", 80),
      tags: row.tags.map((text) => boundedText(text, "标签", 10)) as [string, string, string],
      analysis: row.analysis.map((text) => boundedText(text, "结果解析", 300)),
      strength: boundedText(row.strength, "招牌能力", 32),
      misunderstood: boundedText(row.misunderstood, "容易被误解", 32),
      lesson: boundedText(row.lesson, "隐藏课题", 40),
      rule: boundedText(row.rule, "今日店规", 60),
    };
  });
  return {
    revision: Number(input.revision),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : null,
    questionTexts: input.questionTexts.map((text) => boundedText(text, "题目", 180)),
    profiles,
    giftMessage: boundedText(input.giftMessage, "好评提示", 300),
    giftTitle: boundedText(input.giftTitle, "弹窗标题", 30),
    giftButtonLabel: boundedText(input.giftButtonLabel, "好评按钮文字", 24),
  };
}

export function resolveProfile(id: string, content: SiteContent) {
  const original = [...storeProfiles, balancedProfile].find((profile) => profile.id === id) ?? balancedProfile;
  const copy = content.profiles.find((profile) => profile.id === original.id);
  return { ...original, ...copy };
}
