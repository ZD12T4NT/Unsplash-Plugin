// Define TypeScript interface for a single image item returned from Unsplash
export interface UnsplashSearchResponseItemDto {
  DownloadLocation: string; // URL to register the download (required by Unsplash)
  ThumbnailImageUrl: string; // Thumbnail image URL
  AuthorAttributionName: string; // Photographer's name
  AuthorAttributionUrl: string; // Link to photographer's Unsplash profile (with attribution params)
}

// Define interface for the overall search result set
export interface UnsplashSearchResponseSetDto {
  Data: UnsplashSearchResponseItemDto[]; // Array of normalized image items
}

// Get Unsplash API key from environment variables
const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

// Search images from Unsplash API
export async function searchImages(query: string): Promise<UnsplashSearchResponseSetDto> {

  // Build Unsplash API search endpoint
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${UNSPLASH_ACCESS_KEY}`;

  // Make request
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch images');

  // Parse JSON response
  const json = await res.json();

  // Map Unsplash response to your DTO format
  return {
    Data: json.results.map((item: any) => ({
      DownloadLocation: item.links.download_location,
      ThumbnailImageUrl: item.urls.thumb,
      AuthorAttributionName: item.user.name,
      AuthorAttributionUrl: item.user.links.html + '?utm_source=Vennture&utm_medium=referral',
    })),
  };
}

// Register a download with Unsplash 
export async function registerDownload(url: string) {
  // Append API key for authentication
  const res = await fetch(`${url}?client_id=${UNSPLASH_ACCESS_KEY}`);
  if (!res.ok) throw new Error('Failed to register download');
  return await res.json();
}
