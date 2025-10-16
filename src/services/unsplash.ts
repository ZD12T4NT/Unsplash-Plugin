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
// Gateway API config
// -------------------------
const API_BASE = "https://gateway.dev.wearevennture.co.uk/content-generation";

// -------------------------
// JWT token config
// -------------------------
interface JwtPayload {
  exp: number;
  [key: string]: any;
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

// Fetch a new JWT token from the gateway
async function fetchNewToken(): Promise<string> {
  const authUrl = `${API_BASE.replace("/content-generation", "")}/auth`;
  const currentOrigin = window.location.origin;

  console.log("[JWT] Fetching new token from gateway...");
  const res = await fetch(authUrl, {
    method: "GET",
    headers: { Referer: currentOrigin },
  });

  if (!res.ok) {
    throw new Error(`[JWT] Failed to fetch token: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  console.log("[JWT] Raw JSON from auth endpoint:", json);

  if (!json.token || typeof json.token !== "string") {
    throw new Error("[JWT] Token not found in response");
  }

  cachedToken = json.token;

  // runtime null check before decoding
  if (!cachedToken) {
    throw new Error("[JWT] No token available to decode");
  }

  try {
    const decoded = jwtDecode<JwtPayload>(cachedToken);
    tokenExpiry = decoded.exp * 1000; // convert to milliseconds
    console.log("[JWT] Token expires at:", new Date(tokenExpiry).toLocaleString());
  } catch {
    tokenExpiry = null;
    console.warn("[JWT] Failed to decode token expiry, using indefinite cache");
  }

  return cachedToken;
}

// Get JWT token with caching and expiration handling
export async function getJwtToken(): Promise<string> {
  const now = Date.now();

  // Use cached token if still valid
  if (cachedToken && (!tokenExpiry || tokenExpiry - now > 5000)) {
    console.log("[JWT] Returning cached token");
    return cachedToken;
  }

  // Local dev token fallback from .env
  if (import.meta.env.VITE_TEST_JWT_TOKEN) {
    cachedToken = import.meta.env.VITE_TEST_JWT_TOKEN;
    tokenExpiry = null;
    console.log("[JWT] Using local dev token fallback");
    return cachedToken as string;
  }

  // Fetch new token
  return fetchNewToken();
}

// -------------------------
// Mock Images (for local testing)
// -------------------------
// const mockImages: UnsplashSearchResponseItemDto[] = [
//   {
//     DownloadLocation: "mock-abc123",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=300&fit=crop",
//     AuthorAttributionName: "A C",
//     AuthorAttributionUrl: "https://unsplash.com/@3tnik",
//   },
//   {
//     DownloadLocation: "mock-1",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1751161749900-990bf22bb2ad?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0",
//     AuthorAttributionName: "George",
//     AuthorAttributionUrl: "https://unsplash.com/@dagerotip",
//   },
//   {
//     DownloadLocation: "mock-2",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1750836054429-4cfdf40b32f1?q=80&w=394&auto=format&fit=crop&ixlib=rb-4.1.0",
//     AuthorAttributionName: "Chris",
//     AuthorAttributionUrl: "https://unsplash.com/@chrisvomradio",
//   },
//   {
//     DownloadLocation: "mock-3",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=352&auto=format&fit=crop&ixlib=rb-4.1.0",
//     AuthorAttributionName: "Johannes",
//     AuthorAttributionUrl: "https://unsplash.com/@thejoltjoker",
//   },
//   {
//     DownloadLocation: "mock-4",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1530908295418-a12e326966ba?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0",
//     AuthorAttributionName: "Kenrick",
//     AuthorAttributionUrl: "https://unsplash.com/@kenrickmills",
//   },
// ];

// -------------------------
// Config: toggle for gateway mode
// -------------------------
const USE_GATEWAY = true; // set to true for real gateway

// -------------------------
// Search Images (robust + mock fallback)
// -------------------------
export async function searchImages(
  query: string,
  retries = 10,
  delayMs = 1500
): Promise<UnsplashSearchResponseSetDto> {
  console.log(`[Search] Starting search for prompt: "${query}"`);

  // if (!USE_GATEWAY) {
  //   console.log("[Search] Using mock images (gateway disabled)");
  //   return { data: mockImages };
  // }

  const JWT_TOKEN = await getJwtToken();
  // console.log("[Search] Using JWT token:", JWT_TOKEN.slice(0, 10) + "...");
console.log("[Search] Sending request to gateway:", {
  url: `${API_BASE}/search-unsplash`,
  body: { prompt: query },
});

  const res = await fetch(`${API_BASE}/search-unsplash`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({ prompt: query }),
  });

  console.log("[Search] Response status:", res.status);

  if (res.status === 202) {
    console.log("[Search] Gateway returned 202 (processing), retrying...");
    if (retries <= 0) {
      console.warn("[Search] Max retries reached, returning mock images");
      return { data: [] };
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return searchImages(query, retries - 1, delayMs);
  }

  if (!res.ok) {
    console.warn("[Search] Fetch failed, returning mock images");
    const text = await res.text();
    console.log("[Search] Raw response text:", text);
    return { data: [] };
  }

  const json = await res.json();
  // console.log("[Search] Raw JSON from gateway:", json);
console.log("[Search] Raw JSON from gateway:", JSON.stringify(json, null, 2));

  const items = json.data ?? json.Data ?? [];
  console.log("[Search] Items array length:", items.length);

const mappedItems = items.map((item: any) => ({
  DownloadLocation: item.downloadLocation ?? item.DownloadLocation ?? "",
  ThumbnailImageUrl: item.thumbnailImageUrl ?? item.ThumbnailImageUrl ?? "",
  AuthorAttributionName: item.authorAttributionName ?? item.AuthorAttributionName ?? "",
  AuthorAttributionUrl: item.authorAttributionUrl ?? item.AuthorAttributionUrl ?? "",
}));


  console.log("[Search] Mapped items ready for UI:", mappedItems.length);
  return { data: mappedItems.length ? mappedItems : [] };
}

// -------------------------
// Download/Register Image
// -------------------------
export async function registerDownload(url: string) {
  console.log("[Download] Registering download for:", url);

  if (!USE_GATEWAY) {
    console.log("[Download] Gateway disabled, returning success");
    return { success: true };
  }

  const JWT_TOKEN = await getJwtToken();
  const res = await fetch(`${API_BASE}/download-unsplash`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    console.error("[Download] Failed to download image", res.status, res.statusText);
    throw new Error("Failed to download image");
  }

  const json = await res.json();
  console.log("[Download] Download registered successfully:", json);
  return json;
}
