import React, { useState, useEffect } from 'react';
import { SearchResult, MediaItem } from '../app/types';
import { getExploreGenres, discoverMedia, discoverByDirector, searchPeople, addItem, getItems } from '../app/api';

interface ExploreSectionProps {
  onItemAdded: () => void;
}

// Popular directors list
const FAMOUS_DIRECTORS = [
  { name: 'Christopher Nolan', id: 525, icon: '🛸' },
  { name: 'Quentin Tarantino', id: 138, icon: '🩸' },
  { name: 'Martin Scorsese', id: 1032, icon: '🚬' },
  { name: 'Steven Spielberg', id: 488, icon: '🦖' },
  { name: 'Denis Villeneuve', id: 13742, icon: '🏜️' },
  { name: 'Hayao Miyazaki', id: 608, icon: '🧸' }
];

// Popular actors list
const FAMOUS_ACTORS = [
  { name: 'Leonardo DiCaprio', id: 6193, icon: '❄️' },
  { name: 'Brad Pitt', id: 287, icon: '🕶️' },
  { name: 'Johnny Depp', id: 85, icon: '🏴‍☠️' },
  { name: 'Scarlett Johansson', id: 1245, icon: '🕷️' },
  { name: 'Margot Robbie', id: 234352, icon: '💖' },
  { name: 'Christian Bale', id: 3896, icon: '🦇' }
];

export default function ExploreSection({ onItemAdded }: ExploreSectionProps) {
  const [activeTab, setActiveTab] = useState<'genre' | 'director'>('genre');
  
  // State for Genres Exploration
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie');
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  
  // State for Artist Exploration
  const [directorQuery, setDirectorQuery] = useState('');
  const [artistRole, setArtistRole] = useState<'crew' | 'cast'>('crew');
  const [suggestedArtists, setSuggestedArtists] = useState<Array<{ id: number; name: string; known_for_department: string }>>([]);
  const [selectedArtist, setSelectedArtist] = useState<{ id: number; name: string } | null>(null);
  
  // Results & Loading
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Library cache
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  
  // UI states for cards
  const [activeRatingSelector, setActiveRatingSelector] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    const items = await getItems();
    setLibraryItems(items);
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Fetch genres when tab is 'genre' or mediaType changes
  useEffect(() => {
    if (activeTab === 'genre') {
      const loadGenres = async () => {
        setLoading(true);
        const genreList = await getExploreGenres(mediaType);
        setGenres(genreList);
        if (genreList.length > 0) {
          setSelectedGenreId(genreList[0].id);
        } else {
          setSelectedGenreId(null);
        }
        setResults([]);
        setLoading(false);
      };
      loadGenres();
    } else {
      setResults([]);
      setSuggestedArtists([]);
      setSelectedArtist(null);
      setPage(1);
    }
  }, [activeTab, mediaType]);

  // Load results when selected genre or page changes
  useEffect(() => {
    if (activeTab === 'genre' && selectedGenreId !== null) {
      const loadGenreData = async () => {
        setLoading(true);
        await fetchLibrary();
        const data = await discoverMedia(mediaType, selectedGenreId, page);
        setResults(data);
        setHasMore(data.length >= 6);
        setLoading(false);
      };
      loadGenreData();
    }
  }, [selectedGenreId, page, mediaType, activeTab]);

  // Handle artist search submit (First searches for person matches)
  const handleDirectorSearch = async (e?: React.FormEvent, queryText: string = directorQuery) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    setLoading(true);
    setResults([]);
    setSelectedArtist(null);
    setPage(1);
    
    // Search for people first to resolve spelling/fuzzy matching
    const people = await searchPeople(queryText);
    setSuggestedArtists(people);

    if (people.length > 0) {
      // Auto-load first match
      const firstArtist = people[0];
      setSelectedArtist({ id: firstArtist.id, name: firstArtist.name });
      const data = await discoverByDirector(firstArtist.name, 1, artistRole, firstArtist.id);
      setResults(data);
      setHasMore(data.length >= 4);
    } else {
      setSuggestedArtists([]);
      setResults([]);
    }
    setLoading(false);
  };

  // Quick select an artist (from pre-selected cult lists)
  const handleArtistSelect = async (name: string, id: number, role: 'crew' | 'cast') => {
    setDirectorQuery(name);
    setArtistRole(role);
    setLoading(true);
    setPage(1);
    setSelectedArtist({ id, name });
    setSuggestedArtists([]);
    
    await fetchLibrary();
    const data = await discoverByDirector(name, 1, role, id);
    setResults(data);
    setHasMore(data.length >= 4);
    setLoading(false);
  };

  // Select a suggested artist from fuzzy matches list
  const handleSelectSuggestedArtist = async (artist: { id: number; name: string }) => {
    setSelectedArtist(artist);
    setLoading(true);
    setPage(1);
    await fetchLibrary();
    const data = await discoverByDirector(artist.name, 1, artistRole, artist.id);
    setResults(data);
    setHasMore(data.length >= 4);
    setLoading(false);
  };

  // Change page
  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    if (activeTab === 'director' && selectedArtist) {
      const loadPageData = async () => {
        setLoading(true);
        await fetchLibrary();
        const data = await discoverByDirector(selectedArtist.name, newPage, artistRole, selectedArtist.id);
        setResults(data);
        setHasMore(data.length >= 4);
        setLoading(false);
      };
      loadPageData();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getLibraryStatus = (tmdbId: number, itemMediaType: 'movie' | 'tv') => {
    return libraryItems.find(item => item.tmdb_id === tmdbId && item.media_type === itemMediaType);
  };

  const handleAdd = async (
    tmdbId: number, 
    itemMediaType: 'movie' | 'tv', 
    category: 'watched' | 'watching' | 'dvd_owned' | 'dvd_wishlist',
    rating?: number
  ) => {
    const addStateKey = `${tmdbId}-${category}`;
    setAddingId(addStateKey);
    
    const newItem = await addItem(tmdbId, itemMediaType, category, rating);
    
    if (newItem) {
      await fetchLibrary();
      onItemAdded();
      setActiveRatingSelector(null);
    }
    setAddingId(null);
  };

  const getGenreEmoji = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('action')) return '🎬';
    if (lower.includes('aventure')) return '🗺️';
    if (lower.includes('animation')) return '🧸';
    if (lower.includes('comédie') || lower.includes('comedy')) return '😂';
    if (lower.includes('crime') || lower.includes('polar')) return '🕵️';
    if (lower.includes('documentaire')) return '📜';
    if (lower.includes('drame')) return '🎭';
    if (lower.includes('famille')) return '🏡';
    if (lower.includes('fantastique') || lower.includes('fantasy')) return '🦄';
    if (lower.includes('histoire')) return '🏺';
    if (lower.includes('horreur')) return '👻';
    if (lower.includes('musique')) return '🎵';
    if (lower.includes('mystère')) return '🔍';
    if (lower.includes('romance')) return '💖';
    if (lower.includes('science-fiction') || lower.includes('fiction')) return '🛸';
    if (lower.includes('thriller')) return '🔪';
    if (lower.includes('guerre')) return '🎖️';
    if (lower.includes('western')) return '🤠';
    return '🎞️';
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
      
      {/* Page Title & Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Explorer le Catalogue
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Découvrez des pépites par genre ou en recherchant des réalisateurs et acteurs.
          </p>
        </div>

        {/* Explore Sub-Tabs */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '4px',
          borderRadius: '12px',
          gap: '4px'
        }}>
          <button
            onClick={() => {
              setActiveTab('genre');
              setPage(1);
            }}
            className={`btn ${activeTab === 'genre' ? 'btn-primary' : ''}`}
            style={{
              padding: '0.45rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'genre' ? 'var(--primary)' : 'transparent',
              border: 'none',
              boxShadow: activeTab === 'genre' ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
            }}
          >
            🎭 Par Genre
          </button>
          <button
            onClick={() => {
              setActiveTab('director');
              setPage(1);
            }}
            className={`btn ${activeTab === 'director' ? 'btn-primary' : ''}`}
            style={{
              padding: '0.45rem 1.2rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: activeTab === 'director' ? 'var(--primary)' : 'transparent',
              border: 'none',
              boxShadow: activeTab === 'director' ? '0 4px 15px rgba(139, 92, 246, 0.4)' : 'none'
            }}
          >
            🎬 Par Artiste
          </button>
        </div>
      </div>

      {/* GENRE EXPLORATION HEADER FILTERS */}
      {activeTab === 'genre' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          {/* Media type toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>Type :</span>
            <button
              onClick={() => {
                setMediaType('movie');
                setPage(1);
              }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: mediaType === 'movie' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                border: mediaType === 'movie' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: mediaType === 'movie' ? '#c084fc' : '#fff'
              }}
            >
              🎥 Films
            </button>
            <button
              onClick={() => {
                setMediaType('tv');
                setPage(1);
              }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: mediaType === 'tv' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                border: mediaType === 'tv' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: mediaType === 'tv' ? '#f472b6' : '#fff'
              }}
            >
              📺 Séries TV
            </button>
          </div>

          {/* Genre list grid */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            background: 'rgba(5, 5, 8, 0.2)',
            padding: '1rem',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.03)'
          }}>
            {genres.map((genre) => {
              const isSelected = selectedGenreId === genre.id;
              return (
                <button
                  key={genre.id}
                  onClick={() => {
                    setSelectedGenreId(genre.id);
                    setPage(1);
                  }}
                  style={{
                    padding: '0.45rem 0.9rem',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  className="genre-tag-btn"
                >
                  <span>{getGenreEmoji(genre.name)}</span>
                  <span>{genre.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ARTIST EXPLORATION HEADER FILTERS */}
      {activeTab === 'director' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
          
          {/* Artist Role Toggle */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '8px' }}>Rechercher par :</span>
            <button
              onClick={() => {
                setArtistRole('crew');
                setResults([]);
                setSuggestedArtists([]);
                setSelectedArtist(null);
                setPage(1);
              }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: artistRole === 'crew' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                border: artistRole === 'crew' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: artistRole === 'crew' ? '#c084fc' : '#fff'
              }}
            >
              🎬 Réalisateur
            </button>
            <button
              onClick={() => {
                setArtistRole('cast');
                setResults([]);
                setSuggestedArtists([]);
                setSelectedArtist(null);
                setPage(1);
              }}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: artistRole === 'cast' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                border: artistRole === 'cast' ? '1px solid rgba(236, 72, 153, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                color: artistRole === 'cast' ? '#f472b6' : '#fff'
              }}
            >
              🎭 Acteur / Actrice
            </button>
          </div>

          {/* Artist search form */}
          <form onSubmit={(e) => handleDirectorSearch(e, directorQuery)} style={{ display: 'flex', gap: '10px', maxWidth: '600px', width: '100%', margin: '0.5rem auto' }}>
            <input
              type="text"
              placeholder={artistRole === 'crew' ? "Rechercher un réalisateur (ex: Christopher Nolan...)" : "Rechercher un acteur (ex: Leonardo DiCaprio...)"}
              value={directorQuery}
              onChange={(e) => setDirectorQuery(e.target.value)}
              className="form-input"
              style={{ flexGrow: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '0 1.5rem', borderRadius: '10px', fontWeight: 700 }}>
              Rechercher
            </button>
          </form>

          {/* Quick select tags for cult directors / actors */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Suggestions :</span>
            {artistRole === 'crew' ? (
              FAMOUS_DIRECTORS.map((director) => (
                <button
                  key={director.id}
                  onClick={() => handleArtistSelect(director.name, director.id, 'crew')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  className="director-tag-btn"
                >
                  <span>{director.icon}</span>
                  <span>{director.name}</span>
                </button>
              ))
            ) : (
              FAMOUS_ACTORS.map((actor) => (
                <button
                  key={actor.id}
                  onClick={() => handleArtistSelect(actor.name, actor.id, 'cast')}
                  style={{
                    padding: '0.35rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  className="director-tag-btn"
                >
                  <span>{actor.icon}</span>
                  <span>{actor.name}</span>
                </button>
              ))
            )}
          </div>

          {/* FUZZY MATCHES / DID YOU MEAN BOX */}
          {suggestedArtists.length > 0 && (
            <div className="glass-panel" style={{
              padding: '1.25rem',
              maxWidth: '600px',
              width: '100%',
              margin: '0.5rem auto 0',
              border: '1px dashed var(--primary)',
              borderRadius: '16px',
              textAlign: 'center',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.15)'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary-hover)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🤔 Voulez-vous dire ?
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {suggestedArtists.slice(0, 5).map((artist) => {
                  const isSelected = selectedArtist?.id === artist.id;
                  const deptInfo = artist.known_for_department === 'Directing' ? 'Réal.' : 'Acteur';
                  return (
                    <button
                      key={artist.id}
                      onClick={() => handleSelectSuggestedArtist({ id: artist.id, name: artist.name })}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        transition: 'all 0.2s ease'
                      }}
                      className="suggested-artist-btn"
                    >
                      👤 {artist.name} <span style={{ opacity: 0.6, fontSize: '0.72rem', fontWeight: 500 }}>({deptInfo})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6rem 0' }}>
          <div style={{
            width: '45px',
            height: '45px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            display: 'inline-block'
          }}></div>
        </div>
      )}

      {/* Empty exploration results message */}
      {!loading && results.length === 0 && (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '500px', margin: '2rem auto' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🗺️</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Prêt à explorer !</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {activeTab === 'genre' 
              ? "Sélectionnez un genre de films ou séries ci-dessus pour découvrir le catalogue de titres."
              : artistRole === 'crew' 
                ? "Tapez le nom d'un réalisateur ci-dessus ou cliquez sur un des réalisateurs cultes suggérés pour explorer son œuvre."
                : "Tapez le nom d'un acteur ou d'une actrice ci-dessus ou cliquez sur une suggestion pour explorer sa filmographie."}
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <>
          {/* Matched artist title banner */}
          {activeTab === 'director' && selectedArtist && (
            <div style={{ margin: '0 0 1.5rem 0.25rem', textAlign: 'left' }}>
              <h3 style={{ fontSize: '1.15rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎬 Résultats pour : <span style={{ color: 'var(--primary-hover)', background: 'rgba(139, 92, 246, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>{selectedArtist.name}</span>
              </h3>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            {results.map((media) => {
              const itemMediaType = media.media_type || (activeTab === 'genre' ? mediaType : 'movie');
              const libraryItem = getLibraryStatus(media.tmdb_id, itemMediaType);
              const releaseYear = media.release_date ? new Date(media.release_date).getFullYear() : 'N/A';
              const posterUrl = media.poster_path 
                ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
                : null;
              const isRatingOpen = activeRatingSelector === media.tmdb_id;

              const idKey = `${itemMediaType}-${media.tmdb_id}`;
              const isHovered = hoveredId === idKey;

              let statusClass = '';
              if (libraryItem) {
                if (libraryItem.watching) statusClass = 'card-watching';
                else if (libraryItem.watched) statusClass = 'card-watched';
                else if (libraryItem.dvd_owned) statusClass = 'card-dvd_owned';
                else if (libraryItem.dvd_wishlist) statusClass = 'card-dvd_wishlist';
              }

              return (
                <div 
                  key={idKey}
                  className={`glass-panel ${statusClass}`}
                  onMouseEnter={() => setHoveredId(idKey)}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setActiveRatingSelector(null);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: '380px',
                    transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                  }}
                >
                  {/* Poster container */}
                  <div style={{ position: 'relative', flexGrow: 1, backgroundColor: '#0f0e15', minHeight: '260px', overflow: 'hidden' }}>
                    {posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={posterUrl} 
                        alt={media.title}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                          transform: isHovered ? 'scale(1.06)' : 'scale(1)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        padding: '2rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                      }}>
                        <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎬</span>
                        <span style={{ fontWeight: 600 }}>Pas d'affiche</span>
                      </div>
                    )}

                    {/* Synopsis overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(9, 9, 14, 0.92)',
                      padding: '1.25rem',
                      opacity: isHovered && !isRatingOpen ? 1 : 0,
                      visibility: isHovered && !isRatingOpen ? 'visible' : 'hidden',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      zIndex: 3,
                      overflowY: 'auto'
                    }}>
                      <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fff', textAlign: 'left' }}>Synopsis</h4>
                      <p style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-secondary)', 
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 10,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textAlign: 'left'
                      }}>
                        {media.overview || "Aucun synopsis disponible."}
                      </p>
                    </div>

                    {/* Media Type Badge */}
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: itemMediaType === 'movie' ? 'rgba(139, 92, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      zIndex: 2
                    }}>
                      {itemMediaType === 'movie' ? 'Film' : 'Série'}
                    </span>

                    {/* Rating Selector Overlay */}
                    {isRatingOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(15, 12, 25, 0.96)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        zIndex: 4
                      }}>
                        <span style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Noter (1 - 10)</span>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: '6px',
                          width: '100%',
                          maxWidth: '200px'
                        }}>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              onClick={() => handleAdd(media.tmdb_id, itemMediaType, 'watched', num)}
                              disabled={addingId !== null}
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                              }}
                              className="rating-num-btn"
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        <button 
                          onClick={() => setActiveRatingSelector(null)}
                          style={{
                            marginTop: '1rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info Block */}
                  <div style={{ padding: '1rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }} title={media.title}>
                        {media.title}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {releaseYear}
                      </span>
                    </div>

                    {/* Status Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0.5rem 0', minHeight: '22px' }}>
                      {libraryItem ? (
                        <>
                          {libraryItem.watched && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--rating-color)', fontWeight: 600 }}>
                              ★ {libraryItem.rating}/10 (Vu)
                            </span>
                          )}
                          {libraryItem.watching && (
                            <span style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
                              📺 En cours (S{libraryItem.current_season}{libraryItem.total_seasons ? `/${libraryItem.total_seasons}` : ''} E{libraryItem.current_episode}{(() => {
                                const sData = libraryItem.seasons_data?.find(s => s.season_number === libraryItem.current_season);
                                const maxEp = sData ? sData.episode_count : libraryItem.total_episodes;
                                return maxEp ? `/${maxEp}` : '';
                              })()})
                            </span>
                          )}
                          {libraryItem.dvd_owned && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--dvd-color)', fontWeight: 600 }}>
                              📀 DVD
                            </span>
                          )}
                          {libraryItem.dvd_wishlist && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--wishlist-color)', fontWeight: 600 }}>
                              💖 Souhait DVD
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non présent sur votre étagère</span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      paddingTop: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {/* TV progression button */}
                      {itemMediaType === 'tv' && (
                        <button
                          onClick={() => handleAdd(media.tmdb_id, itemMediaType, 'watching')}
                          disabled={addingId !== null || libraryItem?.watching}
                          className="btn"
                          style={{
                            padding: '0.45rem',
                            fontSize: '0.8rem',
                            background: libraryItem?.watching ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: libraryItem?.watching ? '#60a5fa' : '#fff',
                            border: libraryItem?.watching ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            justifyContent: 'flex-start',
                            cursor: libraryItem?.watching ? 'default' : 'pointer'
                          }}
                        >
                          {addingId === `${media.tmdb_id}-watching` 
                            ? 'Ajout...' 
                            : libraryItem?.watching 
                              ? '✓ En cours de visionnage' 
                              : '📺 Suivre la série'}
                        </button>
                      )}

                      {/* Mark as watched button */}
                      <button
                        onClick={() => setActiveRatingSelector(media.tmdb_id)}
                        disabled={addingId !== null || libraryItem?.watched}
                        className="btn"
                        style={{
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          background: libraryItem?.watched ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: libraryItem?.watched ? 'var(--primary)' : '#fff',
                          border: libraryItem?.watched ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          justifyContent: 'flex-start',
                          cursor: libraryItem?.watched ? 'default' : 'pointer'
                        }}
                      >
                        {libraryItem?.watched ? '✓ Déjà vu' : '👁️ Marquer comme vu'}
                      </button>

                      {/* Add to DVD owned button */}
                      <button
                        onClick={() => handleAdd(media.tmdb_id, itemMediaType, 'dvd_owned')}
                        disabled={addingId !== null || libraryItem?.dvd_owned}
                        className="btn"
                        style={{
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          background: libraryItem?.dvd_owned ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: libraryItem?.dvd_owned ? 'var(--dvd-color)' : '#fff',
                          border: libraryItem?.dvd_owned ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          justifyContent: 'flex-start',
                          cursor: libraryItem?.dvd_owned ? 'default' : 'pointer'
                        }}
                      >
                        {addingId === `${media.tmdb_id}-dvd_owned` 
                          ? 'Ajout...' 
                          : libraryItem?.dvd_owned 
                            ? '✓ DVD Possédé' 
                            : '📀 Ajouter aux DVD achetés'}
                      </button>

                      {/* Add to wishlist DVD button */}
                      <button
                        onClick={() => handleAdd(media.tmdb_id, itemMediaType, 'dvd_wishlist')}
                        disabled={addingId !== null || libraryItem?.dvd_wishlist}
                        className="btn"
                        style={{
                          padding: '0.45rem',
                          fontSize: '0.8rem',
                          background: libraryItem?.dvd_wishlist ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                          color: libraryItem?.dvd_wishlist ? 'var(--wishlist-color)' : '#fff',
                          border: libraryItem?.dvd_wishlist ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          justifyContent: 'flex-start',
                          cursor: libraryItem?.dvd_wishlist ? 'default' : 'pointer'
                        }}
                      >
                        {addingId === `${media.tmdb_id}-dvd_wishlist` 
                          ? 'Ajout...' 
                          : libraryItem?.dvd_wishlist 
                            ? '✓ Dans la liste de souhaits' 
                            : '💖 Ajouter aux souhaits DVD'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '3.5rem' }}>
            <button 
              onClick={() => handlePageChange(page - 1)} 
              disabled={page <= 1 || loading}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.2rem', borderRadius: '10px', fontWeight: 'bold' }}
            >
              ⬅️ Précédent
            </button>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', background: 'rgba(255,255,255,0.04)', padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              Page {page}
            </span>
            <button 
              onClick={() => handlePageChange(page + 1)} 
              disabled={loading || !hasMore}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.2rem', borderRadius: '10px', fontWeight: 'bold' }}
            >
              Suivant ➡️
            </button>
          </div>
        </>
      )}
    </div>
  );
}
