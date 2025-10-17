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

const VERCEL_API_BASE = "https://unsplash-plugin.vercel.app/api";

export async function searchImages(query: string): Promise<UnsplashSearchResponseSetDto> {
  if (!query) throw new Error("[Search] Missing query");

  const res = await fetch(`${VERCEL_API_BASE}/search-unsplash`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
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
// Register Download
// -------------------------
export async function registerDownload(url: string) {
  if (!url) throw new Error("[Download] Missing URL");

  const res = await fetch(`${VERCEL_API_BASE}/download-unsplash`, {
    method: "POST",
    headers: { "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) throw new Error("Failed to register download");

  return res.json();
}

