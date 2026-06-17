import { MediaItem, SearchResult, Episode } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export async function searchMedia(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Erreur de recherche");
    return await res.json();
  } catch (error) {
    console.error("API Error searchMedia:", error);
    return [];
  }
}

export async function getItems(filters?: {
  watched?: boolean;
  watching?: boolean;
  dvd_owned?: boolean;
  dvd_wishlist?: boolean;
}): Promise<MediaItem[]> {
  try {
    let url = `${API_BASE_URL}/items/`;
    const params = new URLSearchParams();
    if (filters) {
      if (filters.watched !== undefined) params.append('watched', String(filters.watched));
      if (filters.watching !== undefined) params.append('watching', String(filters.watching));
      if (filters.dvd_owned !== undefined) params.append('dvd_owned', String(filters.dvd_owned));
      if (filters.dvd_wishlist !== undefined) params.append('dvd_wishlist', String(filters.dvd_wishlist));
    }
    
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error("Erreur de récupération des items");
    return await res.json();
  } catch (error) {
    console.error("API Error getItems:", error);
    return [];
  }
}

export async function addItem(
  tmdbId: number,
  mediaType: 'movie' | 'tv',
  category: 'watched' | 'watching' | 'dvd_owned' | 'dvd_wishlist',
  rating?: number
): Promise<MediaItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/items/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tmdb_id: tmdbId,
        media_type: mediaType,
        category,
        rating,
      }),
    });
    if (!res.ok) throw new Error("Erreur lors de l'ajout");
    return await res.json();
  } catch (error) {
    console.error("API Error addItem:", error);
    return null;
  }
}

export async function updateItem(
  id: number,
  data: Partial<MediaItem>
): Promise<MediaItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/items/${id}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur de mise à jour");
    return await res.json();
  } catch (error) {
    console.error("API Error updateItem:", error);
    return null;
  }
}

export async function deleteItem(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/items/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error("Erreur de suppression");
    return true;
  } catch (error) {
    console.error("API Error deleteItem:", error);
    return false;
  }
}

export async function getEpisodes(itemId: number, season: number): Promise<Episode[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/items/${itemId}/episodes/?season=${season}`);
    if (!res.ok) throw new Error("Erreur de récupération des épisodes");
    return await res.json();
  } catch (error) {
    console.error("API Error getEpisodes:", error);
    return [];
  }
}
