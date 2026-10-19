export class AdminError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function parseCodeBatch(input: Record<string, unknown>) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AdminError("生成参数不完整");
  const count = Number(input.count);
  const maxUses = Number(input.maxUses);
  const label = typeof input.label === "string" ? input.label.trim() : "";
  const prefix = typeof input.prefix === "string" ? input.prefix.trim().toUpperCase() : "SHOP";
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new AdminError("每批可生成1至200个密码");
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) throw new AdminError("每个密码可使用1至100次");
  if (!label || label.length > 80) throw new AdminError("请填写80字以内的批次备注");
  if (!/^[A-Z0-9]{2,8}$/.test(prefix)) throw new AdminError("密码前缀请使用2至8位英文字母或数字");
  return { count, maxUses, label, prefix };
}

export function codeFilters(url: URL) {
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const status = url.searchParams.get("status") ?? "all";
  const batchId = (url.searchParams.get("batch") ?? "").slice(0, 80);
  const where: string[] = [];
  const values: Array<string | number> = [];
  if (q) { where.push("(label LIKE ? ESCAPE '\\' OR batch_id LIKE ? ESCAPE '\\' OR CAST(id AS TEXT) = ?)"); const pattern = "%" + q.replace(/[\\%_]/g, "\\$&") + "%"; values.push(pattern, pattern, q); }
  if (status === "available") where.push("active = 1 AND used_count < max_uses");
  else if (status === "exhausted") where.push("used_count >= max_uses");
  else if (status === "disabled") where.push("active = 0");
  else if (status !== "all") throw new AdminError("无效的密码状态筛选");
  if (batchId) { where.push("batch_id = ?"); values.push(batchId); }
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 100_000) : 1;
  return { clause: where.length ? " WHERE " + where.join(" AND ") : "", values, page };
}

export function normalizeEmail(email: string) { return email.trim().toLowerCase(); }

export function isOwnerEmail(email: string, configured: string | undefined) {
  return !!configured && normalizeEmail(email) === normalizeEmail(configured);
}
