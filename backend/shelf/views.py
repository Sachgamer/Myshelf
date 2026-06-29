import os
import random
import requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Q
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle

from .models import MediaItem, UserProfile
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


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')

        if not username or not password:
            return Response(
                {"error": "Le nom d'utilisateur et le mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Ce nom d'utilisateur est déjà pris."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        user = User.objects.create_user(username=username, password=password, email=email)
        token, _ = Token.objects.get_or_create(user=user)

        # Check for orphan media items (user=None) and associate them with this first user
        # This prevents losing existing local library data
        orphans = MediaItem.objects.filter(user__isnull=True)
        orphan_count = orphans.count()
        if orphan_count > 0:
            orphans.update(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            },
            "associated_orphans": orphan_count
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Le nom d'utilisateur et le mot de passe sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)
        if not user:
            return Response(
                {"error": "Identifiants invalides."},
                status=status.HTTP_400_BAD_REQUEST
            )

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            # Delete token to invalidate session
            request.user.auth_token.delete()
        except (AttributeError, Token.DoesNotExist):
            pass
        return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email
        })


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            "is_public": profile.is_public
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        is_public = request.data.get('is_public')
        if is_public is not None:
            profile.is_public = bool(is_public)
            profile.save()
        return Response({
            "is_public": profile.is_public
        })


class PublicShelfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, username):
        try:
            target_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = UserProfile.objects.get_or_create(user=target_user)
        if not profile.is_public:
            return Response({"error": "Cette bibliothèque est privée."}, status=status.HTTP_404_NOT_FOUND)

        # Retrieve target user's media items
        queryset = MediaItem.objects.filter(user=target_user)
        
        # Apply same filters
        watched = request.query_params.get('watched')
        watching = request.query_params.get('watching')
        dvd_owned = request.query_params.get('dvd_owned')
        dvd_wishlist = request.query_params.get('dvd_wishlist')
        
        if watched is not None:
            queryset = queryset.filter(watched=(watched.lower() == 'true'))
        if watching is not None:
            queryset = queryset.filter(watching=(watching.lower() == 'true'))
        if dvd_owned is not None:
            queryset = queryset.filter(dvd_owned=(dvd_owned.lower() == 'true'))
        if dvd_wishlist is not None:
            queryset = queryset.filter(dvd_wishlist=(dvd_wishlist.lower() == 'true'))

        serializer = MediaItemSerializer(queryset, many=True)
        return Response(serializer.data)


class MediaItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet to manage the user's shelf items.
    """
    queryset = MediaItem.objects.all()
    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = MediaItem.objects.filter(user=self.request.user)
        
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

        # Check if item already exists in the database for this user
        try:
            item = MediaItem.objects.get(tmdb_id=tmdb_id, media_type=media_type, user=request.user)
            
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
                user=request.user,
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


class RecommendationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_items = MediaItem.objects.filter(user=request.user)
        user_tmdb_ids = set(user_items.values_list('tmdb_id', flat=True))
        
        page = request.query_params.get('page', '1')
        try:
            page = int(page)
            if page < 1:
                page = 1
        except ValueError:
            page = 1

        # Sélectionner jusqu'à 3 graines de recommandations de manière aléatoire
        # Préférer les éléments notés >= 6, ou n'importe quel élément si aucun n'est bien noté
        seed_candidates = []
        high_rated = user_items.filter(rating__gte=6)
        if not high_rated.exists():
            high_rated = user_items
            
        candidate_list = list(high_rated)
        if len(candidate_list) > 3:
            seed_candidates = random.sample(candidate_list, 3)
        else:
            seed_candidates = candidate_list
        
        recommendations = []
        seen_recommendations = set()
        
        api_configured = bool(getattr(settings, 'TMDB_API_KEY', '') or getattr(settings, 'TMDB_API_READ_ACCESS_TOKEN', ''))
        
        if api_configured and seed_candidates:
            for seed in seed_candidates:
                endpoint = f"{seed.media_type}/{seed.tmdb_id}/recommendations"
                tmdb_data = query_tmdb(endpoint, {'language': 'fr-FR', 'page': page})
                
                if tmdb_data and 'results' in tmdb_data:
                    count = 0
                    for item in tmdb_data['results']:
                        if count >= 6:
                            break
                        tmdb_id = item.get('id')
                        media_type = item.get('media_type', 'movie')
                        if not media_type or media_type not in ['movie', 'tv']:
                            media_type = seed.media_type
                            
                        if (tmdb_id, media_type) in seen_recommendations or tmdb_id in user_tmdb_ids:
                            continue
                            
                        title = item.get('title') if media_type == 'movie' else item.get('name')
                        release_date = item.get('release_date') if media_type == 'movie' else item.get('first_air_date')
                        
                        recommendations.append({
                            "tmdb_id": tmdb_id,
                            "title": title,
                            "media_type": media_type,
                            "poster_path": item.get('poster_path'),
                            "release_date": release_date,
                            "overview": item.get('overview', ''),
                            "seed_title": seed.title,
                            "recommendation_type": "personalized"
                        })
                        seen_recommendations.add((tmdb_id, media_type))
                        count += 1
                        
        if len(recommendations) < 10:
            trending_movies = query_tmdb('trending/movie/week', {'language': 'fr-FR', 'page': page})
            trending_tv = query_tmdb('trending/tv/week', {'language': 'fr-FR', 'page': page})
            
            items_to_add = []
            if trending_movies and 'results' in trending_movies:
                items_to_add.extend([(item, 'movie') for item in trending_movies['results']])
            if trending_tv and 'results' in trending_tv:
                items_to_add.extend([(item, 'tv') for item in trending_tv['results']])
                
            random.shuffle(items_to_add)
            
            for item, media_type in items_to_add:
                if len(recommendations) >= 15:
                    break
                tmdb_id = item.get('id')
                if (tmdb_id, media_type) in seen_recommendations or tmdb_id in user_tmdb_ids:
                    continue
                    
                title = item.get('title') if media_type == 'movie' else item.get('name')
                release_date = item.get('release_date') if media_type == 'movie' else item.get('first_air_date')
                
                recommendations.append({
                    "tmdb_id": tmdb_id,
                    "title": title,
                    "media_type": media_type,
                    "poster_path": item.get('poster_path'),
                    "release_date": release_date,
                    "overview": item.get('overview', ''),
                    "seed_title": None,
                    "recommendation_type": "trending"
                })
                seen_recommendations.add((tmdb_id, media_type))

        if not recommendations:
            start_index = ((page - 1) * 3) % len(MOCK_MEDIA)
            cycled_mock = MOCK_MEDIA[start_index:] + MOCK_MEDIA[:start_index]
            for item in cycled_mock:
                tmdb_id = item['tmdb_id']
                media_type = item['media_type']
                if tmdb_id in user_tmdb_ids:
                    continue
                seed_title = random.choice([s.title for s in seed_candidates]) if seed_candidates else None
                recommendations.append({
                    "tmdb_id": tmdb_id,
                    "title": item['title'],
                    "media_type": media_type,
                    "poster_path": item['poster_path'],
                    "release_date": item['release_date'],
                    "overview": item['overview'],
                    "seed_title": seed_title,
                    "recommendation_type": "personalized" if seed_title else "trending"
                })

        return Response(recommendations)


class TMDBExploreView(APIView):
    """
    View to explore media from TMDB by genre, director, or popular list.
    Supports mock data fallback if API is not configured.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        explore_type = request.query_params.get('type', 'genres')
        media_type = request.query_params.get('media_type', 'movie')
        if media_type not in ['movie', 'tv']:
            media_type = 'movie'
            
        page = request.query_params.get('page', '1')
        try:
            page = int(page)
            if page < 1:
                page = 1
        except ValueError:
            page = 1

        api_configured = bool(getattr(settings, 'TMDB_API_KEY', '') or getattr(settings, 'TMDB_API_READ_ACCESS_TOKEN', ''))

        # 1. Fetch genre list
        if explore_type == 'genres':
            if api_configured:
                endpoint = f"genre/{media_type}/list"
                tmdb_data = query_tmdb(endpoint, {'language': 'fr-FR'})
                if tmdb_data and 'genres' in tmdb_data:
                    return Response(tmdb_data)
            
            # Mock fallback for genres
            mock_genres = [
                {"id": 28, "name": "Action"},
                {"id": 12, "name": "Aventure"},
                {"id": 16, "name": "Animation"},
                {"id": 35, "name": "Comédie"},
                {"id": 80, "name": "Crime / Polar"},
                {"id": 99, "name": "Documentaire"},
                {"id": 18, "name": "Drame"},
                {"id": 10751, "name": "Famille"},
                {"id": 14, "name": "Fantastique"},
                {"id": 36, "name": "Histoire"},
                {"id": 27, "name": "Horreur"},
                {"id": 10402, "name": "Musique"},
                {"id": 9648, "name": "Mystère"},
                {"id": 10749, "name": "Romance"},
                {"id": 878, "name": "Science-Fiction"},
                {"id": 10770, "name": "Téléfilm"},
                {"id": 53, "name": "Thriller / Suspense"},
                {"id": 10752, "name": "Guerre"},
                {"id": 37, "name": "Western"}
            ]
            return Response({"genres": mock_genres})

        # 2. Discover by genre ID
        elif explore_type == 'discover':
            genre_id = request.query_params.get('genre_id')
            if not genre_id:
                return Response({"error": "Le paramètre genre_id est obligatoire pour le type 'discover'."}, status=status.HTTP_400_BAD_REQUEST)
            
            if api_configured:
                endpoint = f"discover/{media_type}"
                params = {
                    'language': 'fr-FR',
                    'with_genres': genre_id,
                    'sort_by': 'popularity.desc',
                    'page': page
                }
                tmdb_data = query_tmdb(endpoint, params)
                if tmdb_data and 'results' in tmdb_data:
                    formatted_results = []
                    for item in tmdb_data['results']:
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

            try:
                gid = int(genre_id)
            except ValueError:
                gid = 28

            results = []
            if gid == 878:
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] in [27205, 157336, 603]]
            elif gid in [28, 12]:
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] in [603, 1402]]
            else:
                start = ((page - 1) * 2) % len(MOCK_MEDIA)
                results = MOCK_MEDIA[start:start+3]
            return Response(results)

        # 3. Discover by director/actor (person) name / id
        elif explore_type == 'director':
            director_name = request.query_params.get('director_name', '').strip()
            director_id = request.query_params.get('director_id')
            role = request.query_params.get('role', 'crew') # 'crew' pour réalisateurs, 'cast' pour acteurs
            if role not in ['crew', 'cast']:
                role = 'crew'
            
            if not director_name and not director_id:
                return Response({"error": "Le paramètre director_name ou director_id est obligatoire pour le type 'director'."}, status=status.HTTP_400_BAD_REQUEST)

            if api_configured:
                person_id = director_id
                if not person_id and director_name:
                    search_data = query_tmdb('search/person', {'query': director_name, 'language': 'fr-FR'})
                    if search_data and search_data.get('results'):
                        person_id = search_data['results'][0].get('id')

                if person_id:
                    endpoint = "discover/movie"
                    params = {
                        'language': 'fr-FR',
                        'sort_by': 'popularity.desc',
                        'page': page
                    }
                    if role == 'cast':
                        params['with_cast'] = person_id
                    else:
                        params['with_crew'] = person_id

                    tmdb_data = query_tmdb(endpoint, params)
                    if tmdb_data and 'results' in tmdb_data:
                        formatted_results = []
                        for item in tmdb_data['results']:
                            formatted_results.append({
                                "tmdb_id": item.get('id'),
                                "title": item.get('title'),
                                "media_type": "movie",
                                "poster_path": item.get('poster_path'),
                                "release_date": item.get('release_date'),
                                "overview": item.get('overview', '')
                            })
                        return Response(formatted_results)

            results = []
            lower_name = director_name.lower()
            if "nolan" in lower_name or director_id == '525':
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] in [27205, 157336]]
            elif "di caprio" in lower_name or "dicaprio" in lower_name or director_id == '6193':
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] in [27205, 157336]]
            elif "pitt" in lower_name or director_id == '287':
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] == 27205]
            elif "wachowski" in lower_name or "matrix" in lower_name:
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] == 603]
            elif "gilligan" in lower_name or "breaking" in lower_name:
                results = [m for m in MOCK_MEDIA if m['tmdb_id'] == 1396]
            else:
                start = ((page - 1) * 2) % len(MOCK_MEDIA)
                results = MOCK_MEDIA[start:start+2]
            return Response(results)

        return Response({"error": "Type d'exploration non pris en charge."}, status=status.HTTP_400_BAD_REQUEST)

