import os
import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Q

from .models import MediaItem
from .serializers import MediaItemSerializer

TMDB_BASE_URL = "https://api.themoviedb.org/3"

# Mock data to help test the search page before configuring TMDB API key
MOCK_MEDIA = [
    {
        "tmdb_id": 27205,
        "title": "Inception (Mock)",
        "media_type": "movie",
        "poster_path": "/o0OkiMKH3464LISp5NsGyeypYm4.jpg",
        "release_date": "2010-07-15",
        "overview": "Dom Cobb est un voleur expérimenté dans l'art de s'approprier les secrets enfouis dans le subconscient pendant que l'on rêve. (Configurez votre clé TMDB dans le fichier .env pour de vrais résultats !)"
    },
    {
        "tmdb_id": 1396,
        "title": "Breaking Bad (Mock)",
        "media_type": "tv",
        "poster_path": "/ztkUQILnqrDDNPCFV2Vlw4bE92Z.jpg",
        "release_date": "2008-01-20",
        "overview": "Walter White, 50 ans, est professeur de chimie dans un lycée. Risquant d'être renvoyé et apprenant qu'il a un cancer en phase terminale, il s'associe à un ancien élève pour fabriquer de la méthamphétamine. (Configurez votre clé TMDB dans le fichier .env pour de vrais résultats !)",
        "total_seasons": 5,
        "total_episodes": 62,
        "seasons_data": [
            {"season_number": 1, "episode_count": 7},
            {"season_number": 2, "episode_count": 13},
            {"season_number": 3, "episode_count": 13},
            {"season_number": 4, "episode_count": 13},
            {"season_number": 5, "episode_count": 16}
        ]
    },
    {
        "tmdb_id": 603,
        "title": "The Matrix (Mock)",
        "media_type": "movie",
        "poster_path": "/dX4Uki1j41bgU2n67E2d244i4FB.jpg",
        "release_date": "1999-03-30",
        "overview": "Dans un avenir proche, un pirate informatique nommé Neo découvre que la réalité telle que nous la connaissons est une simulation créée par des machines. (Configurez votre clé TMDB dans le fichier .env pour de vrais résultats !)"
    },
    {
        "tmdb_id": 157336,
        "title": "Interstellar (Mock)",
        "media_type": "movie",
        "poster_path": "/gEU2QvIPwcwqUysrOfhjVjcl0jK.jpg",
        "release_date": "2014-11-05",
        "overview": "Un groupe d'explorateurs utilise un tunnel cosmique pour dépasser les limites humaines et voyager à travers les étoiles à la recherche d'une nouvelle planète habitable. (Configurez votre clé TMDB dans le fichier .env pour de vrais résultats !)"
    },
    {
        "tmdb_id": 1402,
        "title": "The Walking Dead (Mock)",
        "media_type": "tv",
        "poster_path": "/xf95Z6q6vLeuf6eH0sh4OYJ468Y.jpg",
        "release_date": "2010-10-31",
        "overview": "Après une apocalypse zombie, un groupe de survivants dirigé par Rick Grimes cherche un abri et tente de survivre dans un monde hostile. (Configurez votre clé TMDB dans le fichier .env pour de vrais résultats !)",
        "total_seasons": 11,
        "total_episodes": 177,
        "seasons_data": [
            {"season_number": 1, "episode_count": 6},
            {"season_number": 2, "episode_count": 13},
            {"season_number": 3, "episode_count": 16},
            {"season_number": 4, "episode_count": 16},
            {"season_number": 5, "episode_count": 16},
            {"season_number": 6, "episode_count": 16},
            {"season_number": 7, "episode_count": 16},
            {"season_number": 8, "episode_count": 16},
            {"season_number": 9, "episode_count": 16},
            {"season_number": 10, "episode_count": 22},
            {"season_number": 11, "episode_count": 24}
        ]
    }
]

def query_tmdb(endpoint, params=None):
    """
    Helper function to query TMDB API.
    """
    if params is None:
        params = {}
    
    api_key = getattr(settings, 'TMDB_API_KEY', '')
    read_token = getattr(settings, 'TMDB_API_READ_ACCESS_TOKEN', '')
    
    # Use Read Access Token (v4 auth) if present
    if read_token:
        headers = {
            "Authorization": f"Bearer {read_token}",
            "accept": "application/json",
            "Content-Type": "application/json;charset=utf-8"
        }
        url = f"{TMDB_BASE_URL}/{endpoint}"
        try:
            response = requests.get(url, headers=headers, params=params, timeout=5)
            if response.status_code == 200:
                return response.json()
        except requests.exceptions.RequestException:
            pass
            
    # Fallback to API Key (v3 auth) if present
    elif api_key:
        params['api_key'] = api_key
        url = f"{TMDB_BASE_URL}/{endpoint}"
        try:
            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                return response.json()
        except requests.exceptions.RequestException:
            pass
            
    return None

class TMDBSearchView(APIView):
    """
    Proxy view to search for movies/TV shows using TMDB API.
    Returns mock results if TMDB API is not configured.
    """
    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response([])

        # Try to query TMDB API
        tmdb_data = query_tmdb('search/multi', {'query': query, 'language': 'fr-FR'})
        
        if tmdb_data and 'results' in tmdb_data:
            formatted_results = []
            for item in tmdb_data['results']:
                media_type = item.get('media_type')
                if media_type not in ['movie', 'tv']:
                    continue
                
                # Format response fields
                tmdb_id = item.get('id')
                title = item.get('title') if media_type == 'movie' else item.get('name')
                release_date = item.get('release_date') if media_type == 'movie' else item.get('first_air_date')
                
                formatted_results.append({
                    "tmdb_id": tmdb_id,
                    "title": title,
                    "media_type": media_type,
                    "poster_path": item.get('poster_path'),
                    "release_date": release_date,
                    "overview": item.get('overview', '')
                })
            return Response(formatted_results)
            
        # Fallback to mock search results if TMDB isn't configured
        q_lower = query.lower()
        mock_results = [
            item for item in MOCK_MEDIA
            if q_lower in item['title'].lower() or q_lower in item['overview'].lower()
        ]
        return Response(mock_results)

class MediaItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage the user's shelf items.
    """
    queryset = MediaItem.objects.all()
    serializer_class = MediaItemSerializer

    def get_queryset(self):
        queryset = MediaItem.objects.all()
        
        # Filtering by status flags
        watched = self.request.query_params.get('watched')
        watching = self.request.query_params.get('watching')
        dvd_owned = self.request.query_params.get('dvd_owned')
        dvd_wishlist = self.request.query_params.get('dvd_wishlist')
        
        if watched is not None:
            queryset = queryset.filter(watched=(watched.lower() == 'true'))
        if watching is not None:
            queryset = queryset.filter(watching=(watching.lower() == 'true'))
        if dvd_owned is not None:
            queryset = queryset.filter(dvd_owned=(dvd_owned.lower() == 'true'))
        if dvd_wishlist is not None:
            queryset = queryset.filter(dvd_wishlist=(dvd_wishlist.lower() == 'true'))
            
        return queryset

    def create(self, request, *args, **kwargs):
        tmdb_id = request.data.get('tmdb_id')
        media_type = request.data.get('media_type')
        category = request.data.get('category')  # 'watched', 'watching', 'dvd_owned', or 'dvd_wishlist'
        rating = request.data.get('rating')

        if not tmdb_id or not media_type or not category:
            return Response(
                {"error": "Les paramètres tmdb_id, media_type et category sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            tmdb_id = int(tmdb_id)
        except ValueError:
            return Response({"error": "L'identifiant tmdb_id doit être un entier."}, status=status.HTTP_400_BAD_REQUEST)

        # Check if item already exists in the database
        try:
            item = MediaItem.objects.get(tmdb_id=tmdb_id, media_type=media_type)
            
            # Retrieve total seasons, episodes and seasons_data mapping for TV show if missing
            if item.media_type == 'tv' and (item.total_seasons is None or item.total_episodes is None or item.seasons_data is None):
                endpoint = f"tv/{tmdb_id}"
                details = query_tmdb(endpoint, {'language': 'fr-FR'})
                if details:
                    item.total_seasons = details.get('number_of_seasons')
                    item.total_episodes = details.get('number_of_episodes')
                    seasons_raw = details.get('seasons', [])
                    item.seasons_data = [
                        {
                            "season_number": s.get('season_number'),
                            "episode_count": s.get('episode_count')
                        }
                        for s in seasons_raw if s.get('season_number', 0) > 0
                    ]
                else:
                    mock_match = next((m for m in MOCK_MEDIA if m['tmdb_id'] == tmdb_id and m['media_type'] == media_type), None)
                    if mock_match:
                        item.total_seasons = mock_match.get('total_seasons')
                        item.total_episodes = mock_match.get('total_episodes')
                        item.seasons_data = mock_match.get('seasons_data')

            # Update existing flags
            if category == 'watched':
                item.watched = True
                item.watching = False
                if rating is not None:
                    item.rating = int(rating)
            elif category == 'watching':
                item.watching = True
                item.watched = False
                item.rating = None
            elif category == 'dvd_owned':
                item.dvd_owned = True
                item.dvd_wishlist = False  # Moved from wishlist to owned
            elif category == 'dvd_wishlist':
                item.dvd_wishlist = True
                item.dvd_owned = False  # Moved from owned to wishlist (or reset)
                
            item.save()
            serializer = self.get_serializer(item)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except MediaItem.DoesNotExist:
            # Item does not exist, retrieve details from TMDB or fallback to mock
            details = None
            total_seasons = None
            total_episodes = None
            seasons_data = None
            
            # Fetch from TMDB
            endpoint = f"{media_type}/{tmdb_id}"
            details = query_tmdb(endpoint, {'language': 'fr-FR'})
            
            if details:
                title = details.get('title') if media_type == 'movie' else details.get('name')
                release_date = details.get('release_date') if media_type == 'movie' else details.get('first_air_date')
                if not release_date:
                    release_date = None
                overview = details.get('overview', '')
                poster_path = details.get('poster_path')
                if media_type == 'tv':
                    total_seasons = details.get('number_of_seasons')
                    total_episodes = details.get('number_of_episodes')
                    seasons_raw = details.get('seasons', [])
                    seasons_data = [
                        {
                            "season_number": s.get('season_number'),
                            "episode_count": s.get('episode_count')
                        }
                        for s in seasons_raw if s.get('season_number', 0) > 0
                    ]
            else:
                # Fallback to mock search
                mock_match = next((m for m in MOCK_MEDIA if m['tmdb_id'] == tmdb_id and m['media_type'] == media_type), None)
                if mock_match:
                    title = mock_match['title']
                    release_date = mock_match['release_date']
                    overview = mock_match['overview']
                    poster_path = mock_match['poster_path']
                    if media_type == 'tv':
                        total_seasons = mock_match.get('total_seasons')
                        total_episodes = mock_match.get('total_episodes')
                        seasons_data = mock_match.get('seasons_data')
                else:
                    # Generic fallback if not mock and TMDB failed
                    title = f"Unknown {media_type.capitalize()} (ID {tmdb_id})"
                    release_date = None
                    overview = "Détails non trouvés de TMDB."
                    poster_path = None

            # Create media item
            item = MediaItem(
                tmdb_id=tmdb_id,
                media_type=media_type,
                title=title,
                poster_path=poster_path,
                release_date=release_date,
                overview=overview,
                total_seasons=total_seasons,
                total_episodes=total_episodes,
                seasons_data=seasons_data
            )
            
            if category == 'watched':
                item.watched = True
                if rating is not None:
                    item.rating = int(rating)
            elif category == 'watching':
                item.watching = True
            elif category == 'dvd_owned':
                item.dvd_owned = True
            elif category == 'dvd_wishlist':
                item.dvd_wishlist = True

            item.save()
            serializer = self.get_serializer(item)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def episodes(self, request, pk=None):
        """
        Action to retrieve the list of episodes for a specific season.
        """
        item = self.get_object()
        if item.media_type != 'tv':
            return Response({"error": "Cet item n'est pas une série TV."}, status=status.HTTP_400_BAD_REQUEST)
        
        season_number = request.query_params.get('season')
        if not season_number:
            return Response({"error": "Le paramètre 'season' est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            season_number = int(season_number)
        except ValueError:
            return Response({"error": "Le paramètre 'season' doit être un entier."}, status=status.HTTP_400_BAD_REQUEST)

        # Try to query TMDB API for the season episodes
        endpoint = f"tv/{item.tmdb_id}/season/{season_number}"
        tmdb_data = query_tmdb(endpoint, {'language': 'fr-FR'})
        
        if tmdb_data and 'episodes' in tmdb_data:
            formatted_episodes = []
            for ep in tmdb_data['episodes']:
                formatted_episodes.append({
                    "episode_number": ep.get('episode_number'),
                    "name": ep.get('name'),
                    "overview": ep.get('overview', ''),
                    "still_path": ep.get('still_path'),
                    "air_date": ep.get('air_date')
                })
            formatted_episodes.sort(key=lambda x: x.get('episode_number', 0))
            return Response(formatted_episodes)
            
        # Fallback to mock episodes if TMDB is not available
        mock_episodes = []
        
        # Determine number of episodes in this season
        ep_count = 10  # default fallback
        if item.seasons_data:
            for s in item.seasons_data:
                if s.get('season_number') == season_number:
                    ep_count = s.get('episode_count', 10)
                    break
        
        for i in range(1, ep_count + 1):
            mock_episodes.append({
                "episode_number": i,
                "name": f"Épisode {i} (Mock)",
                "overview": f"Ceci est un synopsis factif pour l'épisode {i} de la saison {season_number} de la série {item.title}.",
                "still_path": None,
                "air_date": "2026-01-01"
            })
        return Response(mock_episodes)
