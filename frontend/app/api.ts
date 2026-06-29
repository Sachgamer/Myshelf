import { MediaItem, SearchResult, Episode, User, RecommendationItem } from './types';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    // Si on utilise le serveur de dev sur le port 3000 standard de Next.js, on vise localhost
    if (window.location.port === '3000') {
      return 'http://localhost:8000/api';
    }

    // Si on est sur l'émulateur Android (via Capacitor), l'hôte 10.0.2.2 permet d'accéder au localhost de la machine de dev.
    // Dans Capacitor Android, l'hostname est 'localhost' et le port est vide (ou protocole 'http:' / 'capacitor:')
    const isCapacitor = !!(window as any).Capacitor;
    const isAndroid = /android/i.test(navigator.userAgent);
    if ((isCapacitor || isAndroid) && window.location.hostname === 'localhost') {
      return 'http://10.0.2.2:8000/api';
    }
  }

  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

function getHeaders(includeContentType = true): HeadersInit {
  const headers: HeadersInit = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('myshelf_token');
    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }
  }
  return headers;
}

export async function searchMedia(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/search/?q=${encodeURIComponent(query)}`, {
      headers: getHeaders(false)
    });
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
    
    const res = await fetch(url, {
      headers: getHeaders(false)
    });
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
      headers: getHeaders(),
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
      headers: getHeaders(),
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
      headers: getHeaders(false)
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
    const res = await fetch(`${API_BASE_URL}/items/${itemId}/episodes/?season=${season}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur de récupération des épisodes");
    return await res.json();
  } catch (error) {
    console.error("API Error getEpisodes:", error);
    return [];
  }
}

// Authentication API calls

export interface AuthResponse {
  token: string;
  user: User;
  associated_orphans?: number;
}

export async function login(username: string, password: string): Promise<AuthResponse | null> {
  const res = await fetch(`${API_BASE_URL}/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Erreur de connexion");
  }
  return await res.json();
}

export async function register(username: string, password: string, email?: string): Promise<AuthResponse | null> {
  const res = await fetch(`${API_BASE_URL}/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, email })
  });
  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || "Erreur d'inscription");
  }
  return await res.json();
}

export async function logout(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/logout/`, {
      method: 'POST',
      headers: getHeaders(false)
    });
    return res.ok;
  } catch (error) {
    return false;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('myshelf_token') : null;
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}/me/`, {
      headers: getHeaders(false)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function getProfile(): Promise<{ is_public: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/me/profile/`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur profile");
    return await res.json();
  } catch (error) {
    console.error("API Error getProfile:", error);
    return null;
  }
}

export async function updateProfile(data: { is_public: boolean }): Promise<{ is_public: boolean } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/me/profile/`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Erreur update profile");
    return await res.json();
  } catch (error) {
    console.error("API Error updateProfile:", error);
    return null;
  }
}

export async function getPublicItems(username: string): Promise<MediaItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/public/shelf/${encodeURIComponent(username)}/`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur de chargement public");
    }
    return await res.json();
  } catch (error: any) {
    console.error("API Error getPublicItems:", error);
    throw error;
  }
}

export async function getRecommendations(page = 1): Promise<RecommendationItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/recommendations/?page=${page}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur de récupération des recommandations");
    return await res.json();
  } catch (error) {
    console.error("API Error getRecommendations:", error);
    return [];
  }
}

export async function getExploreGenres(mediaType: 'movie' | 'tv'): Promise<Array<{ id: number; name: string }>> {
  try {
    const res = await fetch(`${API_BASE_URL}/explore/?type=genres&media_type=${mediaType}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur de récupération des genres");
    const data = await res.json();
    return data.genres || [];
  } catch (error) {
    console.error("API Error getExploreGenres:", error);
    return [];
  }
}

export async function discoverMedia(mediaType: 'movie' | 'tv', genreId: number, page = 1): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/explore/?type=discover&media_type=${mediaType}&genre_id=${genreId}&page=${page}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur de découverte");
    return await res.json();
  } catch (error) {
    console.error("API Error discoverMedia:", error);
    return [];
  }
}

export async function discoverByDirector(name: string, page = 1): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/explore/?type=director&director_name=${encodeURIComponent(name)}&page=${page}`, {
      headers: getHeaders(false)
    });
    if (!res.ok) throw new Error("Erreur de découverte par réalisateur");
    return await res.json();
  } catch (error) {
    console.error("API Error discoverByDirector:", error);
    return [];
  }
}
