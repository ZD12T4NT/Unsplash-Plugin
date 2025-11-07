// -------------------------
// Imports
// -------------------------
import { jwtDecode } from "jwt-decode";

// -------------------------
// DTOs
// -------------------------
export interface UnsplashSearchResponseItemDto {
  DownloadLocation: string;
  ThumbnailImageUrl: string;
  AuthorAttributionName: string;
  AuthorAttributionUrl: string;
}

export interface UnsplashSearchResponseSetDto {
  data: UnsplashSearchResponseItemDto[];
}

// -------------------------
// Config
// -------------------------
// All API calls go through backend in production.
// Localhost can still hit the gateway directly for dev testing.
const GATEWAY_BASE = "https://gateway.dev.wearevennture.co.uk/content-generation";
// Your deployed API base (adjust if you want to use relative /api instead)
const VERCEL_API_BASE = "https://unsplash-plugin.vercel.app/api";

// -------------------------
// CMS field mapping (hashed names)
// -------------------------
// Default to the field you showed in your payload.
// You can override these at runtime with setCmsImageFieldNames().
let CMS_IMAGE_FIELD_NAME = "XQr7szjAUik=";
let CMS_IMAGE_TAG_FIELD_NAME = "XQr7szjAUik=tag";

export function setCmsImageFieldNames(opts: { image: string; tag?: string }) {
  CMS_IMAGE_FIELD_NAME = opts.image;
  if (opts.tag) CMS_IMAGE_TAG_FIELD_NAME = opts.tag;
}

// -------------------------
// Helpers
// -------------------------
// Robust client origin resolver.
// Priority: data-attr > meta tag > "staging link" > (last resort) window.location.origin
function getClientOrigin(): string {
  // 1) Explicit data attribute on your widget root
  const dataAttr = (document.querySelector("[data-venn-client-origin]") as HTMLElement | null)
    ?.getAttribute("data-venn-client-origin");
  if (dataAttr) return dataAttr;

  // 2) <meta name="venn-client-origin" content="https://venn-eb.devstaging.wearevennture.co.uk">
  const meta = document.querySelector('meta[name="venn-client-origin"]') as HTMLMetaElement | null;
  if (meta?.content) return meta.content;

  // 3) Existing "staging link" element
  const href = (document.querySelector('.staging-link a') as HTMLAnchorElement | null)?.href;
  if (href) {
    try { return new URL(href).origin; } catch { /* ignore */ }
  }

  // 4) Fallback (will cause 401 at gateway if it's the CMS origin)
  return window.location.origin;
}


function commonApiHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    accept: "application/json",
    "X-Venn-Client-Origin": getClientOrigin(),
    ...extra,
  };
}

// Write to CMS form field and fire events so the form state updates.
function writeField(name: string, value: unknown): boolean {
  const el = document.querySelector<HTMLInputElement>(`[name="${CSS.escape(name)}"]`);
  if (!el) {
    console.warn("[CMS] Field not found:", name);
    return false;
  }
  (el as HTMLInputElement).value = typeof value === "string" ? value : JSON.stringify(value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

// -------------------------
// JWT Handling
// -------------------------
interface JwtPayload {
  exp: number;
  [key: string]: any;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Securely fetch a new JWT.
 * - Local dev → Gateway direct (for testing)
 * - Production → Your backend proxy (/api/get-venn-jwt)
 */
async function fetchNewToken(): Promise<string> {
  const isLocal = window.location.hostname === "localhost";
  const currentOrigin = window.location.origin;

  const authUrl = isLocal
    ? `${GATEWAY_BASE.replace("/content-generation", "")}/auth`
    : "/api/get-venn-jwt";

  console.log(`[JWT] Fetching new token from: ${authUrl}`);

  const res = await fetch(authUrl, {
    method: "GET",
    headers: isLocal
      ? { Referer: currentOrigin, Origin: currentOrigin } // local direct → send both
      : { "X-Venn-Client-Origin": getClientOrigin() },   // prod/staging → proxy forwards this
  });

  if (!res.ok) throw new Error(`[JWT] Failed to fetch token: ${res.status} ${res.statusText}`);

  const json = await res.json();
  const token = json.token || json.Token || json.jwt || json.JWT;
  if (!token) throw new Error("[JWT] Invalid token response");

  cachedToken = token;

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    tokenExpiry = decoded.exp * 1000;
    console.log("[JWT] Token expires at:", new Date(tokenExpiry).toLocaleString());
  } catch (err) {
    console.warn("[JWT] Could not decode expiry; caching indefinitely", err);
    tokenExpiry = null;
  }

  return token;
}

/**
 * Get JWT from cache, refresh if expired.
 */
export async function getJwtToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && (!tokenExpiry || tokenExpiry - now > 5000))
    return cachedToken;

  // optional local .env fallback
  if (import.meta.env.VITE_TEST_JWT_TOKEN && window.location.hostname === "localhost") {
    cachedToken = import.meta.env.VITE_TEST_JWT_TOKEN;
    tokenExpiry = null;
    console.log("[JWT] Using local .env test token");
    return cachedToken as string;
  }

  return fetchNewToken();
}

// -------------------------
// Search Images
// -------------------------
export async function searchImages(query: string): Promise<UnsplashSearchResponseSetDto> {
  if (!query) throw new Error("[Search] Missing query");

  const res = await fetch(`${VERCEL_API_BASE}/search-unsplash`, {
    method: "POST",
    headers: commonApiHeaders(),
    body: JSON.stringify({ prompt: query }),
  });

  if (!res.ok) {
    console.error("[Search] Failed request:", res.status, res.statusText);
    return { data: [] };
  }

  const json = await res.json();
  const items = json.data ?? [];
  return {
    data: items.map((item: any) => ({
      DownloadLocation: item.downloadLocation ?? "",
      ThumbnailImageUrl: item.thumbnailImageUrl ?? "",
      AuthorAttributionName: item.authorAttributionName ?? "",
      AuthorAttributionUrl: item.authorAttributionUrl ?? "",
    })),
  };
}

// -------------------------
// Register Download (import to media/CDN)
// -------------------------
export async function registerDownload(url: string) {
  if (!url) throw new Error("[Download] Missing URL");

  const res = await fetch(`${VERCEL_API_BASE}/download-unsplash`, {
    method: "POST",
    headers: commonApiHeaders(),
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error("Failed to register download");
  return res.json();
}

// -------------------------
// Select image → import → write to CMS field
// -------------------------
function pickAssetId(reg: any): string | null {
  const obj = reg?.data ?? reg ?? {};
  return obj.id || obj.Id || obj.mediaId || obj.MediaId || obj.assetId || obj.AssetId || null;
}

/**
 * Call this when an Unsplash card is selected.
 * Ensures we save the *asset ID* into the CMS field (NOT the Unsplash URL).
 */
export async function selectUnsplashImage(item: UnsplashSearchResponseItemDto): Promise<void> {
  // 1) Import to your media/CDN
  const reg = await registerDownload(item.DownloadLocation);
  const assetId = pickAssetId(reg);

  if (!assetId) {
    console.error("[CMS] registerDownload did not return an asset id:", reg);
    throw new Error("Import succeeded but no asset id returned");
  }

  // 2) Write the ID to your CMS field
  const ok = writeField(CMS_IMAGE_FIELD_NAME, String(assetId));
  if (!ok) throw new Error(`[CMS] Field '${CMS_IMAGE_FIELD_NAME}' not found`);

  // 3) Optional: write a nice tag/label
  writeField(CMS_IMAGE_TAG_FIELD_NAME, `Photo by ${item.AuthorAttributionName} (Unsplash)`);

  console.debug("[CMS] Saved image asset id to form", { field: CMS_IMAGE_FIELD_NAME, assetId });
}

/**
 * Utility: quickly scan likely media fields (run once if mapping changes).
 */
export function debugListMediaFieldNames() {
  return [...document.querySelectorAll<HTMLInputElement>('form [name]')]
    .map((el) => el.name)
    .filter((n) => /image|media|asset|tag|XQr7szjAUik=/.test(n));
}
