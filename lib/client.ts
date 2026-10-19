import { createClient } from "@supabase/supabase-js";

// Publishable keys identify a project; they are not administrator credentials.
export const supabaseUrl = "https://htqouphoskplwzkiwcra.supabase.co";
export const publishableKey = "sb_publishable_baiTgVGfvpBLGPtzQdg-cw_HOISnQWS";
export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "store-admin-auth" }
});
export function pageUrl(route = "/") { return `${import.meta.env.BASE_URL}#${route}`; }
export function resultUrl(id: string) { return `${location.origin}${pageUrl(`/result/${id}`)}`; }

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", publishableKey);
  if (path.startsWith("/api/admin/")) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    return await fetch(`${supabaseUrl}/functions/v1/store-api${path}`, { ...options, headers, signal: controller.signal });
  } finally { clearTimeout(timer); }
}
