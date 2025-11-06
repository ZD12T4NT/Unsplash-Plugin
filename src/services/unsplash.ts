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
// jQuery -> $('.staging-link a').prop('href')
// Vanilla:
function getClientOrigin(): string {
  const href = (document.querySelector('.staging-link a') as HTMLAnchorElement | null)?.href;
  if (href) {
    try { return new URL(href).origin; } catch { /* fall through */ }
  }
  // fallback to current page (CMS) if staging link not present
  return window.location.origin;
}

function commonApiHeaders(extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    accept: "application/json",
    "X-Venn-Client-Origin": getClientOrigin(),   // <--- IMPORTANT
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
      // Local → hitting gateway directly: send BOTH Referer and Origin
      ? { Referer: currentOrigin, Origin: currentOrigin }
      // Prod/staging → hit your backend: send the explicit client origin so the server can forward it
      : { "X-Venn-Client-Origin": getClientOrigin() },
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
/**
 * Call this when a user clicks/selects an Unsplash result.
 * It will:
 *  - register the download (imports into your media library)
 *  - write the returned asset ID into the CMS image field
 *  - write a helpful tag/label next to it
 */
export async function selectUnsplashImage(item: UnsplashSearchResponseItemDto): Promise<void> {
  // 1) Import & register
  const reg = await registerDownload(item.DownloadLocation);
  const asset = (reg && (reg.data ?? reg)) || {};
  // tolerate a few common shapes for ID/URL
  const assetId =
    asset.id || asset.Id || asset.mediaId || asset.MediaId || asset.assetId || asset.AssetId;
  const assetUrl = asset.url || asset.Url || asset.src || asset.sourceUrl;

  if (!assetId) {
    console.error("[CMS] No asset id in registerDownload response:", reg);
    throw new Error("[CMS] Missing asset id after import");
  }

  // 2) Write the value the backend actually persists (ID, not Unsplash URL)
  const ok = writeField(CMS_IMAGE_FIELD_NAME, String(assetId));
  if (!ok) {
    // If field name changes per module, allow overriding via setCmsImageFieldNames()
    throw new Error(`[CMS] Image field '${CMS_IMAGE_FIELD_NAME}' not found in the form`);
  }

  // 3) Optional label/tag (purely for UI/readability)
  const label = `Photo by ${item.AuthorAttributionName} (Unsplash)`;
  writeField(CMS_IMAGE_TAG_FIELD_NAME, label);

  // (Optional) If your CMS wants alt text in a separate field, add another writeField here.

  // Dev aid:
  console.debug("[CMS] Wrote asset", { assetId, assetUrl, field: CMS_IMAGE_FIELD_NAME });
}

/**
 * Utility: quickly scan likely media fields (run once if mapping changes).
 */
export function debugListMediaFieldNames() {
  return [...document.querySelectorAll<HTMLInputElement>('form [name]')]
    .map((el) => el.name)
    .filter((n) => /image|media|asset|tag|XQr7szjAUik=/.test(n));
}
