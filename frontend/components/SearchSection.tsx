import React, { useState, useEffect } from 'react';
import { SearchResult, MediaItem } from '../app/types';
import { searchMedia, addItem, getItems } from '../app/api';

interface SearchSectionProps {
  onItemAdded: () => void;
}

export default function SearchSection({ onItemAdded }: SearchSectionProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [blurTimeout, setBlurTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Suivi des éléments affichant les sélecteurs de note
  const [activeRatingSelector, setActiveRatingSelector] = useState<number | null>(null);
  // Suivi de l'état d'ajout pour afficher les indicateurs de chargement sur les boutons
  const [addingId, setAddingId] = useState<string | null>(null); // ex: "tmdbId-category"
  // Suivi de l'élément survolé pour l'affichage du synopsis en superposition
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Récupérer la bibliothèque actuelle pour vérifier si les éléments sont déjà présents
  const fetchLibrary = async () => {
    const items = await getItems();
    setLibraryItems(items);
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  // Logique d'autocomplétion (debounce) lors de la frappe
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length >= 2) {
        const searchResults = await searchMedia(query);
        setSuggestions(searchResults.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setShowSuggestions(false);
    // Rafraîchir la bibliothèque pour que les statuts "déjà possédé" soient exacts
    await fetchLibrary();
    const searchResults = await searchMedia(query);
    setResults(searchResults);
    setLoading(false);
  };

  const handleSuggestionClick = async (searchTitle: string) => {
    setQuery(searchTitle);
    setSuggestions([]);
    setShowSuggestions(false);
    
    setLoading(true);
    await fetchLibrary();
    const searchResults = await searchMedia(searchTitle);
    setResults(searchResults);
    setLoading(false);
  };

  // Déterminer si un média de la recherche est déjà présent dans la bibliothèque
  const getLibraryStatus = (tmdbId: number, mediaType: 'movie' | 'tv') => {
    return libraryItems.find(item => item.tmdb_id === tmdbId && item.media_type === mediaType);
  };

  const handleAdd = async (
    tmdbId: number, 
    mediaType: 'movie' | 'tv', 
    category: 'watched' | 'watching' | 'dvd_owned' | 'dvd_wishlist' | 'watchlist',
    rating?: number
  ) => {
    const addStateKey = `${tmdbId}-${category}`;
    setAddingId(addStateKey);
    
    const newItem = await addItem(tmdbId, mediaType, category, rating);
    
    if (newItem) {
      // Rafraîchir le cache de la bibliothèque locale
      await fetchLibrary();
      onItemAdded();
      setActiveRatingSelector(null);
    }
    setAddingId(null);
  };

  const handleBlur = () => {
    const timeout = setTimeout(() => {
      setShowSuggestions(false);
    }, 250);
    setBlurTimeout(timeout);
  };

  const handleFocus = () => {
    if (blurTimeout) clearTimeout(blurTimeout);
    if (suggestions.length > 0) setShowSuggestions(true);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
      
      {/* Barre de saisie de recherche */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px', margin: '0 auto 2.5rem', position: 'relative' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input 
            type="text" 
            placeholder="Rechercher un film ou une série (ex: Inception, Breaking Bad...)" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className="form-input"
            style={{ width: '100%' }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="glass-panel"
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '100%',
                background: 'rgba(15, 12, 25, 0.98)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                marginTop: '6px',
                zIndex: 1000,
                boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                maxHeight: '320px',
                overflowY: 'auto',
                padding: '0.4rem 0'
              }}
            >
              {suggestions.map((item) => (
                <div
                  key={`${item.media_type}-${item.tmdb_id}`}
                  onClick={() => handleSuggestionClick(item.title)}
                  style={{
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.2s'
                  }}
                  className="suggestion-item"
                >
                  <span style={{ fontSize: '1.25rem' }}>
                    {item.media_type === 'movie' ? '🎬' : '📺'}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {item.media_type === 'movie' ? 'Film' : 'Série'} {item.release_date ? `(${new Date(item.release_date).getFullYear()})` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ flexShrink: 0 }}>
          {loading ? 'Recherche...' : '🔍 Chercher'}
        </button>
      </form>

      {/* Indicateur de chargement */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '3rem 0' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            display: 'inline-block'
          }}></div>
        </div>
      )}

      {/* Message en cas de recherche infructueuse */}
      {!loading && query && results.length === 0 && (
        <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Aucun résultat trouvé 🎬</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Essayez de vérifier l'orthographe ou configurez votre clé API TMDB dans le fichier `.env` du backend.
          </p>
        </div>
      )}

      {/* Grille d'affichage des résultats de recherche */}
      {!loading && results.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {results.map((media) => {
            const libraryItem = getLibraryStatus(media.tmdb_id, media.media_type);
            const releaseYear = media.release_date ? new Date(media.release_date).getFullYear() : 'N/A';
            const posterUrl = media.poster_path 
              ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
              : null;
            const isRatingOpen = activeRatingSelector === media.tmdb_id;

            const idKey = `${media.media_type}-${media.tmdb_id}`;
            const isHovered = hoveredId === idKey;

            // Déterminer la classe de statut si déjà présent dans la bibliothèque
            let statusClass = '';
            if (libraryItem) {
              if (libraryItem.watching) statusClass = 'card-watching';
              else if (libraryItem.watchlist) statusClass = 'card-watchlist';
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
                  minHeight: '380px'
                }}
              >
                {/* Conteneur de l'affiche */}
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

                  {/* Volet de Synopsis au survol */}
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

                  {/* Badge du Type de média */}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background: media.media_type === 'movie' ? 'rgba(139, 92, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    zIndex: 2
                  }}>
                    {media.media_type === 'movie' ? 'Film' : 'Série'}
                  </span>

                  {/* Sélecteur de Note (Overlay) */}
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
                            onClick={() => handleAdd(media.tmdb_id, media.media_type, 'watched', num)}
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

                {/* Bloc d'informations */}
                <div style={{ padding: '1rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }} title={media.title}>
                      {media.title}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {releaseYear}
                    </span>
                  </div>

                  {/* Badges de statut dans la bibliothèque */}
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
                        {libraryItem.watchlist && (
                          <span style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 600 }}>
                            🍿 À regarder
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

                  {/* Boutons d'action */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {/* Bouton de suivi de progression de série */}
                    {media.media_type === 'tv' && (
                      <button
                        onClick={() => handleAdd(media.tmdb_id, media.media_type, 'watching')}
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

                    {/* Bouton ajouter à la watchlist */}
                    <button
                      onClick={() => handleAdd(media.tmdb_id, media.media_type, 'watchlist')}
                      disabled={addingId !== null || libraryItem?.watchlist || libraryItem?.watched || libraryItem?.watching}
                      className="btn"
                      style={{
                        padding: '0.45rem',
                        fontSize: '0.8rem',
                        background: libraryItem?.watchlist ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: libraryItem?.watchlist ? '#f97316' : '#fff',
                        border: libraryItem?.watchlist ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                        justifyContent: 'flex-start',
                        cursor: (libraryItem?.watchlist || libraryItem?.watched || libraryItem?.watching) ? 'default' : 'pointer'
                      }}
                    >
                      {addingId === `${media.tmdb_id}-watchlist` 
                        ? 'Ajout...' 
                        : libraryItem?.watchlist 
                          ? '✓ Dans la Watchlist' 
                          : '🍿 Ajouter à la Watchlist'}
                    </button>

                    {/* Bouton marquer comme vu */}
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

                    {/* Bouton ajouter aux DVD achetés */}
                    <button
                      onClick={() => handleAdd(media.tmdb_id, media.media_type, 'dvd_owned')}
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

                    {/* Bouton ajouter aux souhaits DVD */}
                    <button
                      onClick={() => handleAdd(media.tmdb_id, media.media_type, 'dvd_wishlist')}
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
      )}
    </div>
  );
}
