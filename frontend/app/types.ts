export interface MediaItem {
  id: number;
  tmdb_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  watched: boolean;
  watching: boolean;
  current_season: number | null;
  current_episode: number | null;
  total_seasons: number | null;
  total_episodes: number | null;
  seasons_data: Array<{ season_number: number; episode_count: number }> | null;
  rating: number | null;
  dvd_owned: boolean;
  dvd_wishlist: boolean;
  watchlist: boolean;
  user: number | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
}

export interface Episode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
}

export interface SearchResult {
  tmdb_id: number;
  title: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
}

export interface RecommendationItem {
  tmdb_id: number;
  title: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date: string | null;
  overview: string | null;
  seed_title: string | null;
  recommendation_type: 'personalized' | 'trending';
}

