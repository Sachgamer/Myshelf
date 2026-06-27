import React, { useState, useEffect } from 'react';
import { RecommendationItem, MediaItem } from '../app/types';
import { getRecommendations, addItem, getItems } from '../app/api';

interface DiscoverySectionProps {
  onItemAdded: () => void;
}

export default function DiscoverySection({ onItemAdded }: DiscoverySectionProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryItems, setLibraryItems] = useState<MediaItem[]>([]);
  
  // Rating overlay state
  const [activeRatingSelector, setActiveRatingSelector] = useState<number | null>(null);
  // Track adding item progress (to show loading spinners on buttons)
  const [addingId, setAddingId] = useState<string | null>(null);
  // Hovered card track
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const fetchLibrary = async () => {
    const items = await getItems();
    setLibraryItems(items);
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    await fetchLibrary();
    const data = await getRecommendations();
    setRecommendations(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getLibraryStatus = (tmdbId: number, mediaType: 'movie' | 'tv') => {
    return libraryItems.find(item => item.tmdb_id === tmdbId && item.media_type === mediaType);
  };

  const handleAdd = async (
    tmdbId: number, 
    mediaType: 'movie' | 'tv', 
    category: 'watched' | 'watching' | 'dvd_owned' | 'dvd_wishlist',
    rating?: number
  ) => {
    const addStateKey = `${tmdbId}-${category}`;
    setAddingId(addStateKey);
    
    const newItem = await addItem(tmdbId, mediaType, category, rating);
    
    if (newItem) {
      await fetchLibrary();
      onItemAdded();
      setActiveRatingSelector(null);
    }
    setAddingId(null);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '15px' }}>
        <div style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Recommandations personnalisées
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Suggestions basées sur vos coups de cœur et les films/séries les plus populaires du moment.
          </p>
        </div>
        
        <button 
          onClick={fetchRecommendations} 
          className="btn btn-secondary" 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '10px', fontWeight: 700 }}
        >
          {loading ? 'Mise à jour...' : '🔄 Actualiser'}
        </button>
      </div>

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

      {/* Empty recommendations message */}
      {!loading && recommendations.length === 0 && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🍿</span>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Aucune recommandation disponible</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Configurez votre clé API TMDB ou ajoutez des titres à votre bibliothèque avec des notes élevées pour recevoir des suggestions personnalisées.
          </p>
        </div>
      )}

      {/* Recommendations grid */}
      {!loading && recommendations.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {recommendations.map((media) => {
            const libraryItem = getLibraryStatus(media.tmdb_id, media.media_type);
            const releaseYear = media.release_date ? new Date(media.release_date).getFullYear() : 'N/A';
            const posterUrl = media.poster_path 
              ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
              : null;
            const isRatingOpen = activeRatingSelector === media.tmdb_id;

            const idKey = `${media.media_type}-${media.tmdb_id}`;
            const isHovered = hoveredId === idKey;

            // Class based on item category
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
                    background: media.media_type === 'movie' ? 'rgba(139, 92, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    zIndex: 2
                  }}>
                    {media.media_type === 'movie' ? 'Film' : 'Série'}
                  </span>

                  {/* Seed / Recommendation Reason Badge */}
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: media.seed_title ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.9)',
                    backdropFilter: 'blur(4px)',
                    color: '#fff',
                    zIndex: 2,
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={media.seed_title ? `Recommandé car vous avez aimé ${media.seed_title}` : 'Populaire cette semaine'}>
                    {media.seed_title ? `🎬 Pour ${media.seed_title}` : '🔥 Populaire'}
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

                    {/* Add to wishlist DVD button */}
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
