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
// Mock Images (for local testing)
// -------------------------
const mockImages: UnsplashSearchResponseItemDto[] = [
  {
    DownloadLocation: "mock-abc123",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=300&fit=crop",
    AuthorAttributionName: "John Doe",
    AuthorAttributionUrl: "https://unsplash.com/@3tnik",
  },
  {
    DownloadLocation: "mock-def456",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=400&h=300&fit=crop",
    AuthorAttributionName: "Jane Smith",
    AuthorAttributionUrl: "https://unsplash.com/@jorainternet",
  },
  {
    DownloadLocation: "mock-ghi789",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?w=400&h=300&fit=crop",
    AuthorAttributionName: "Alice Johnson",
    AuthorAttributionUrl: "https://unsplash.com/@alexmachado",
  },
  {
    DownloadLocation: "mock-jkl012",
    ThumbnailImageUrl:
      "https://images.unsplash.com/photo-1517817748495-63c1028a1de5?w=400&h=300&fit=crop",
    AuthorAttributionName: "Mark Wilson",
    AuthorAttributionUrl: "https://unsplash.com/@markwilson",
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
    console.log("⚠️ Using mock Unsplash images (gateway disabled)");
    return { data: mockImages };
  }

  const JWT_TOKEN = await getJwtToken();
  const res = await fetch(`${API_BASE}/search-unsplash`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    body: JSON.stringify({ prompt: query }),
  });

  if (res.status === 202) {
    if (retries <= 0) return { data: mockImages };
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return searchImages(query, retries - 1, delayMs);
  }

  if (!res.ok) {
    console.warn("Gateway fetch failed, using mock data");
    return { data: mockImages };
  }

  const json = await res.json();
  const items = json.data ?? json.Data ?? [];
  const mappedItems = items.map((item: any) => ({
    DownloadLocation: item.DownloadLocation,
    ThumbnailImageUrl: item.ThumbnailImageUrl,
    AuthorAttributionName: item.AuthorAttributionName,
    AuthorAttributionUrl: item.AuthorAttributionUrl,
  }));

  return { data: mappedItems.length ? mappedItems : mockImages };
}

// -------------------------
// Download/Register Image
// -------------------------
export async function registerDownload(url: string) {
  if (!USE_GATEWAY) {
    console.log("💡 Mock register download:", url);
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
