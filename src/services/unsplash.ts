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
const GATEWAY_BASE = "https://gateway.wearevennture.co.uk/content-generation";
// const API_BASE = ""; relative => /api/* routes

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

  const authUrl = isLocal ? `${GATEWAY_BASE.replace("/content-generation", "")}/auth` : "/api/get-venn-jwt";
  console.log(`[JWT] Fetching new token from: ${authUrl}`);

  const res = await fetch(authUrl, {
    method: "GET",
    headers: isLocal ? { Referer: currentOrigin } : {},
  });

  if (!res.ok) throw new Error(`[JWT] Failed to fetch token: ${res.status} ${res.statusText}`);

  const json = await res.json();
  const token = json.token || json.Token;
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

  if (cachedToken && (!tokenExpiry || tokenExpiry - now > 5000)) return cachedToken;

  // optional local .env fallback
  if (import.meta.env.VITE_TEST_JWT_TOKEN && window.location.hostname === "localhost") {
    console.log("[JWT] Using .env test token");
    cachedToken = import.meta.env.VITE_TEST_JWT_TOKEN;
    tokenExpiry = null;
    return cachedToken as string;
  }

  return fetchNewToken();
}

// -------------------------
// Search Images
// -------------------------
export async function searchImages(query: string, retries = 10, delayMs = 1500): Promise<UnsplashSearchResponseSetDto> {
  if (!query) throw new Error("[Search] Missing query");
  console.log(`[Search] Searching for: "${query}"`);

  const isLocal = window.location.hostname === "localhost";
  const endpoint = isLocal ? `${GATEWAY_BASE}/search-unsplash` : "/api/search-unsplash";

  const headers: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
  };

  if (isLocal) {
    const token = await getJwtToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: query }),
  });

  if (res.status === 202) {
    if (retries <= 0) throw new Error("[Search] Max retries reached");
    console.log("[Search] Still processing, retrying...");
    await new Promise((r) => setTimeout(r, delayMs));
    return searchImages(query, retries - 1, delayMs);
  }

  if (!res.ok) {
    console.error("[Search] Failed request:", res.status, res.statusText);
    return { data: [] };
  }

  const json = await res.json();
  const items = json.data ?? json.Data ?? [];

  const mapped = items.map((item: any) => ({
    DownloadLocation: item.downloadLocation ?? item.DownloadLocation ?? "",
    ThumbnailImageUrl: item.thumbnailImageUrl ?? item.ThumbnailImageUrl ?? "",
    AuthorAttributionName: item.authorAttributionName ?? item.AuthorAttributionName ?? "",
    AuthorAttributionUrl: item.authorAttributionUrl ?? item.AuthorAttributionUrl ?? "",
  }));

  console.log(`[Search] Found ${mapped.length} images`);
  return { data: mapped };
}

// -------------------------
// Register Download
// -------------------------
export async function registerDownload(url: string) {
  if (!url) throw new Error("[Download] Missing URL");
  console.log("[Download] Registering:", url);

  const isLocal = window.location.hostname === "localhost";
  const endpoint = isLocal ? `${GATEWAY_BASE}/download-unsplash` : "/api/download-unsplash";

  const headers: Record<string, string> = {
    accept: "application/json",
    "Content-Type": "application/json",
  };

  if (isLocal) {
    const token = await getJwtToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    console.error("[Download] Failed:", res.statusText);
    throw new Error("Failed to register download");
  }

  const json = await res.json();
  console.log("[Download] Success:", json);
  return json;
}
