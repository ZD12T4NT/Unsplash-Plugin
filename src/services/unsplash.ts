export interface UnsplashSearchResponseItemDto {
  DownloadLocation: string;
  ThumbnailImageUrl: string;
  AuthorAttributionName: string;
  AuthorAttributionUrl: string;
}

export interface UnsplashSearchResponseSetDto {
  Data: UnsplashSearchResponseItemDto[];
}

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;

export async function searchImages(query: string): Promise<UnsplashSearchResponseSetDto> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${UNSPLASH_ACCESS_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch images');

  const json = await res.json();

  return {
    Data: json.results.map((item: any) => ({
      DownloadLocation: item.links.download_location,
      ThumbnailImageUrl: item.urls.thumb,
      AuthorAttributionName: item.user.name,
      AuthorAttributionUrl: item.user.links.html + '?utm_source=Vennture&utm_medium=referral',
    })),
  };
}

export async function registerDownload(url: string) {
  const res = await fetch(`${url}?client_id=${UNSPLASH_ACCESS_KEY}`);
  if (!res.ok) throw new Error('Failed to register download');
  return await res.json();
}
