
// Local Version

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
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InZlbm50dXJlZ2F0ZXdheSIsInJvbGVzIjpbIkpvYlNlYXJjaCJdLCJuYmYiOjE3NTk1MDI4NzUsImV4cCI6MTc1OTUxNzMzNSwiaWF0IjoxNzU5NTAyOTM1LCJpc3MiOiJ2ZW5udHVyZWdhdGV3YXkiLCJhdWQiOiJ2ZW5udHVyZWdhdGV3YXkifQ.4qVxxoAxg5qELz85_ODbC1xRKcwl5-pRYuSKFmy8Fl0";

let cachedToken: string | undefined = TEST_JWT_TOKEN;

async function getJwtToken(): Promise<string> {
  if (cachedToken !== undefined) return cachedToken;

  const currentOrigin = window.location.origin;

  const res = await fetch(`${API_BASE.replace("/content-generation", "")}/auth`, {
    method: "GET",
    headers: { Referer: currentOrigin },
  });

  if (!res.ok) throw new Error("Failed to fetch JWT token");

  const json = await res.json();
  if (!json.token) throw new Error("JWT token not found in response");

  cachedToken = json.token;
  if (cachedToken === undefined) throw new Error("JWT token is undefined");
  return cachedToken;
}

// -------------------------
// Mock images for local testing
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
// Search Images
// -------------------------
export async function searchImages(
  query: string,
  retries = 20,
  delayMs = 1500
): Promise<UnsplashSearchResponseSetDto> {
  try {
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

    // Retry if 202 = accepted but not ready
    if (res.status === 202) {
      if (retries <= 0) return { data: mockImages };
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return searchImages(query, retries - 1, delayMs);
    }

    if (!res.ok) return { data: mockImages };

    const json = await res.json();
    const items = json.data ?? json.Data ?? [];

    const mappedItems: UnsplashSearchResponseItemDto[] = items.map((item: any) => ({
      DownloadLocation: item.DownloadLocation,
      ThumbnailImageUrl: item.ThumbnailImageUrl,
      AuthorAttributionName: item.AuthorAttributionName,
      AuthorAttributionUrl: item.AuthorAttributionUrl,
    }));

    return mappedItems.length > 0 ? { data: mappedItems } : { data: mockImages };
  } catch (err) {
    console.warn("Search failed, using mock images", err);
    return { data: mockImages };
  }
}

// -------------------------
// Mock register/download
// -------------------------
export async function registerDownload(url: string) {
  console.log("Mock register download for:", url);
  // Simulate a small delay
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { success: true, url };
}




// Gateway version 

// // -------------------------
// // DTOs
// // -------------------------
// export interface UnsplashSearchResponseItemDto {
//   DownloadLocation: string;
//   ThumbnailImageUrl: string;
//   AuthorAttributionName: string;
//   AuthorAttributionUrl: string;
// }

// export interface UnsplashSearchResponseSetDto {
//   data: UnsplashSearchResponseItemDto[];
// }

// // -------------------------
// // Gateway API config
// // -------------------------
// const API_BASE = "https://gateway.dev.wearevennture.co.uk/content-generation";

// // -------------------------
// // JWT token config
// // -------------------------
// let cachedToken: string | undefined;

// /**
//  * Fetches JWT token.
//  * Returns a string or throws an error.
//  */
// async function getJwtToken(): Promise<string> {
//   if (cachedToken) return cachedToken;

//   const currentOrigin = window.location.origin;

//   const res = await fetch(`${API_BASE.replace("/content-generation", "")}/auth`, {
//     method: "GET",
//     headers: { Referer: currentOrigin },
//   });

//   if (!res.ok) throw new Error("Failed to fetch JWT token");

//   const json = await res.json();
//   if (!json.token) throw new Error("JWT token not found");

//   cachedToken = json.token;
//   return cachedToken;
// }

// // -------------------------
// // Mock images for fallback/testing
// // -------------------------
// const mockImages: UnsplashSearchResponseItemDto[] = [
//   {
//     DownloadLocation: "mock-abc123",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=400&h=300&fit=crop",
//     AuthorAttributionName: "John Doe",
//     AuthorAttributionUrl: "https://unsplash.com/@3tnik",
//   },
//   {
//     DownloadLocation: "mock-def456",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=400&h=300&fit=crop",
//     AuthorAttributionName: "Jane Smith",
//     AuthorAttributionUrl: "https://unsplash.com/@jorainternet",
//   },
//   {
//     DownloadLocation: "mock-ghi789",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1499084732479-de2c02d45fc4?w=400&h=300&fit=crop",
//     AuthorAttributionName: "Alice Johnson",
//     AuthorAttributionUrl: "https://unsplash.com/@alexmachado",
//   },
//   {
//     DownloadLocation: "mock-jkl012",
//     ThumbnailImageUrl: "https://images.unsplash.com/photo-1517817748495-63c1028a1de5?w=400&h=300&fit=crop",
//     AuthorAttributionName: "Mark Wilson",
//     AuthorAttributionUrl: "https://unsplash.com/@markwilson",
//   },
// ];

// // -------------------------
// // Search Images (gateway + fallback)
// // -------------------------
// export async function searchImages(
//   query: string,
//   retries = 20,
//   delayMs = 1500
// ): Promise<UnsplashSearchResponseSetDto> {
//   try {
//     const JWT_TOKEN = await getJwtToken();

//     const res = await fetch(`${API_BASE}/search-unsplash`, {
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${JWT_TOKEN}`,
//       },
//       body: JSON.stringify({ prompt: query }),
//     });

//     if (res.status === 202) {
//       if (retries <= 0) return { data: mockImages };
//       await new Promise((resolve) => setTimeout(resolve, delayMs));
//       return searchImages(query, retries - 1, delayMs);
//     }

//     if (!res.ok) return { data: mockImages };

//     const json = await res.json();
//     const items = json.data ?? json.Data ?? [];

//     const mappedItems: UnsplashSearchResponseItemDto[] = items.map((item: any) => ({
//       DownloadLocation: item.DownloadLocation,
//       ThumbnailImageUrl: item.ThumbnailImageUrl,
//       AuthorAttributionName: item.AuthorAttributionName,
//       AuthorAttributionUrl: item.AuthorAttributionUrl,
//     }));

//     return mappedItems.length > 0 ? { data: mappedItems } : { data: mockImages };
//   } catch (err) {
//     console.warn("Search failed, returning mock images", err);
//     return { data: mockImages };
//   }
// }

// // -------------------------
// // Register / Download image
// // -------------------------
// export async function registerDownload(url: string) {
//   try {
//     const JWT_TOKEN = await getJwtToken();
//     const res = await fetch(`${API_BASE}/download-unsplash`, {
//       method: "POST",
//       headers: {
//         accept: "application/json",
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${JWT_TOKEN}`,
//       },
//       body: JSON.stringify({ url }),
//     });

//     if (!res.ok) throw new Error("Failed to register download");

//     return await res.json();
//   } catch (err) {
//     console.warn("Register download failed, mock response used", err);
//     return { success: true, url }; // fallback
//   }
// }
