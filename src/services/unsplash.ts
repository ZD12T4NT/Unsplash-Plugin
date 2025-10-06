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
const TEST_JWT_TOKEN: string | undefined =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InZlbm50dXJlZ2F0ZXdheSIsInJvbGVzIjpbIkpvYlNlYXJjaCJdLCJuYmYiOjE3NTk3NDA4NzAsImV4cCI6MTc1OTc1NTMzMCwiaWF0IjoxNzU5NzQwOTMwLCJpc3MiOiJ2ZW5udHVyZWdhdGV3YXkiLCJhdWQiOiJ2ZW5udHVyZWdhdGV3YXkifQ.JtK6f0HJZpSo1LQ3qri5x-gC8qXCRVTl-Y0FWSG7vq8";

let cachedToken: string = TEST_JWT_TOKEN ?? "";

async function getJwtToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const currentOrigin = window.location.origin;
  const res = await fetch(`${API_BASE.replace("/content-generation", "")}/auth`, {
    method: "GET",
    headers: { Referer: currentOrigin },
  });

  if (!res.ok) throw new Error("Failed to fetch JWT token");
  const json = await res.json();
  if (!json.token) throw new Error("JWT token not found in response");

  cachedToken = json.token as string;
  return cachedToken;
}


// -------------------------
// Mock Images (for local testing) Remove when ready
// -------------------------
const mockImages: UnsplashSearchResponseItemDto[] = [
  {
    DownloadLocation: "mock-abc123",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=300&fit=crop",
    AuthorAttributionName: "A C",
    AuthorAttributionUrl: "https://unsplash.com/@3tnik",
  },
  {
    DownloadLocation: "mock-1",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1751161749900-990bf22bb2ad?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    AuthorAttributionName: "George",
    AuthorAttributionUrl: "https://unsplash.com/@dagerotip",
  },
  {
    DownloadLocation: "mock-2",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1750836054429-4cfdf40b32f1?q=80&w=394&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    AuthorAttributionName: "Chris",
    AuthorAttributionUrl: "https://unsplash.com/@chrisvomradio",
  },
  {
    DownloadLocation: "mock-3",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1472396961693-142e6e269027?q=80&w=352&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    AuthorAttributionName: "Johannes",
    AuthorAttributionUrl: "https://unsplash.com/@thejoltjoker",
  },
  {
    DownloadLocation: "mock-4",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1530908295418-a12e326966ba?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    AuthorAttributionName: "Kenrick",
    AuthorAttributionUrl: "https://unsplash.com/@kenrickmills",
  },
];




// -------------------------
// Config: toggle for gateway mode
// -------------------------
// const USE_GATEWAY = false;

// Gateway Usage
const USE_GATEWAY = true;

// -------------------------
// Search Images (robust + mock fallback)
// -------------------------
export async function searchImages(
  query: string,
  retries = 10,
  delayMs = 1500
): Promise<UnsplashSearchResponseSetDto> {
  if (!USE_GATEWAY) {
    console.log("Using mock Unsplash images (gateway disabled)");
    return { data: mockImages };
  }

  const JWT_TOKEN = await getJwtToken();
  console.log("JWT Token:", JWT_TOKEN);

  const res = await fetch(`${API_BASE}/search-unsplash`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({ prompt: query }),
  });

  console.log(`Request sent to gateway with prompt: "${query}"`);
  console.log("Response status:", res.status);

  if (res.status === 202) {
    console.log("Gateway returned 202 (processing), retrying...");
    if (retries <= 0) {
      console.warn("Max retries reached, returning mock images");
      return { data: mockImages };
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return searchImages(query, retries - 1, delayMs);
  }

  if (!res.ok) {
    console.warn("Gateway fetch failed, returning mock images");
    const text = await res.text();
    console.log("Raw response:", text);
    return { data: mockImages };
  }

  const json = await res.json();
  console.log("Raw JSON from gateway:", json);

  const items = json.data ?? json.Data ?? [];
  console.log("Parsed items array:", items);

  const mappedItems = items.map((item: any) => ({
    DownloadLocation: item.DownloadLocation,
    ThumbnailImageUrl: item.ThumbnailImageUrl,
    AuthorAttributionName: item.AuthorAttributionName,
    AuthorAttributionUrl: item.AuthorAttributionUrl,
  }));

  console.log("Mapped items ready for UI:", mappedItems);

  return { data: mappedItems.length ? mappedItems : mockImages };
}


// -------------------------
// Download/Register Image
// -------------------------
export async function registerDownload(url: string) {
  if (!USE_GATEWAY) {
    console.log("Mock register download:", url);
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

  if (!res.ok) throw new Error("Failed to download image");
  return await res.json();
}
