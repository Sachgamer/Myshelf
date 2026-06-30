import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MediaItem, Episode } from '../app/types';
import { getEpisodes } from '../app/api';

interface MediaCardProps {
  item: MediaItem;
  onUpdate: (id: number, data: Partial<MediaItem>) => void;
  onDelete: (id: number) => void;
  readOnly?: boolean;
}

export default function MediaCard({ item, onUpdate, onDelete, readOnly = false }: MediaCardProps) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [showRatingSelector, setShowRatingSelector] = useState(false);
  const [showEpisodesModal, setShowEpisodesModal] = useState(false);
  const [selectedSeasonInModal, setSelectedSeasonInModal] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  // Charger les épisodes d'une saison spécifique via l'API
  const loadEpisodes = async (seasonNum: number) => {
    setLoadingEpisodes(true);
    try {
      const data = await getEpisodes(item.id, seasonNum);
      setEpisodes(data);
    } catch (err) {
      console.error("Échec lors du chargement des épisodes", err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  const handleOpenEpisodesModal = () => {
    const initialSeason = item.current_season || 1;
    setSelectedSeasonInModal(initialSeason);
    setShowEpisodesModal(true);
    loadEpisodes(initialSeason);
  };

  const handleSeasonSelectInModal = (seasonNum: number) => {
    setSelectedSeasonInModal(seasonNum);
    loadEpisodes(seasonNum);
  };

  const handleSelectEpisode = (seasonNum: number, episodeNum: number) => {
    onUpdate(item.id, {
      current_season: seasonNum,
      current_episode: episodeNum,
      watching: true
    });
  };

  const currentSeasonNum = item.current_season || 1;
  const currentSeasonData = item.seasons_data?.find(s => s.season_number === currentSeasonNum);
  const maxEpisodesForCurrentSeason = currentSeasonData ? currentSeasonData.episode_count : item.total_episodes;

  const handleSeasonChange = (newSeason: number) => {
    const nextSeasonData = item.seasons_data?.find(s => s.season_number === newSeason);
    const maxEp = nextSeasonData ? nextSeasonData.episode_count : null;
    
    const updateData: Partial<MediaItem> = { current_season: newSeason };
    if (maxEp !== null && (item.current_episode || 0) > maxEp) {
      updateData.current_episode = maxEp;
    }
    onUpdate(item.id, updateData);
  };

  const releaseYear = item.release_date ? new Date(item.release_date).getFullYear() : 'N/A';
  const posterUrl = item.poster_path 
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : null;

  const handleRatingChange = (rating: number) => {
    onUpdate(item.id, { rating, watched: true, watching: false });
    setShowRatingSelector(false);
  };

  const toggleWatched = () => {
    if (item.watched) {
      // Retirer le statut "vu" et la note
      onUpdate(item.id, { watched: false, rating: null });
    } else {
      // Afficher le sélecteur de note lorsqu'on marque le média comme vu
      setShowRatingSelector(!showRatingSelector);
    }
  };

  const toggleDvdOwned = () => {
    const nextState = !item.dvd_owned;
    onUpdate(item.id, { 
      dvd_owned: nextState,
      // Si ajouté aux DVD possédés, on le retire des souhaits
      dvd_wishlist: nextState ? false : item.dvd_wishlist 
    });
  };

  const toggleDvdWishlist = () => {
    const nextState = !item.dvd_wishlist;
    onUpdate(item.id, { 
      dvd_wishlist: nextState,
      // Si ajouté aux souhaits, on le retire des DVD possédés
      dvd_owned: nextState ? false : item.dvd_owned
    });
  };

  const toggleWatching = () => {
    const nextState = !item.watching;
    onUpdate(item.id, { 
      watching: nextState,
      // Si configuré comme "En cours", on retire le statut "Déjà vu" et la watchlist
      watched: nextState ? false : item.watched,
      watchlist: nextState ? false : item.watchlist,
      rating: nextState ? null : item.rating
    });
  };

  const toggleWatchlist = () => {
    const nextState = !item.watchlist;
    onUpdate(item.id, {
      watchlist: nextState,
      watched: nextState ? false : item.watched,
      watching: nextState ? false : item.watching,
      rating: nextState ? null : item.rating
    });
  };

  // Déterminer la classe de statut pour appliquer les styles néons définis dans globals.css
  let statusClass = '';
  if (item.watching) statusClass = 'card-watching';
  else if (item.watchlist) statusClass = 'card-watchlist';
  else if (item.watched) statusClass = 'card-watched';
  else if (item.dvd_owned) statusClass = 'card-dvd_owned';
  else if (item.dvd_wishlist) statusClass = 'card-dvd_wishlist';

  return (
    <div 
      className={`media-card glass-panel ${statusClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowRatingSelector(false);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        minHeight: '380px'
      }}
    >
      {/* Conteneur de l'affiche de film/série */}
      <div style={{ position: 'relative', flexGrow: 1, backgroundColor: '#0f0e15', overflow: 'hidden', minHeight: '260px' }}>
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={posterUrl} 
            alt={item.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              transform: hovered ? 'scale(1.06)' : 'scale(1)'
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

        {/* Badge de Type de média (Film / Série) */}
        <span style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          padding: '0.25rem 0.6rem',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          background: item.media_type === 'movie' ? 'rgba(139, 92, 246, 0.9)' : 'rgba(236, 72, 153, 0.9)',
          backdropFilter: 'blur(4px)',
          color: '#fff',
          zIndex: 2
        }}>
          {item.media_type === 'movie' ? 'Film' : 'Série'}
        </span>

        {/* Volet de Synopsis au survol */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(9, 9, 14, 0.92)',
          padding: '1.25rem',
          opacity: hovered && !showRatingSelector ? 1 : 0,
          visibility: hovered && !showRatingSelector ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          zIndex: 3,
          overflowY: 'auto'
        }}>
          <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: '#fff' }}>Synopsis</h4>
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 10,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {item.overview || "Aucun synopsis disponible."}
          </p>
        </div>

        {/* Sélecteur de Note (Overlay) */}
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
          opacity: showRatingSelector ? 1 : 0,
          visibility: showRatingSelector ? 'visible' : 'hidden',
          transition: 'all 0.3s ease',
          zIndex: 4
        }}>
          <span style={{ fontSize: '1.25rem', marginBottom: '0.75rem', fontWeight: 600 }}>Noter ce titre (1 - 10)</span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            width: '100%',
            maxWidth: '200px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => handleRatingChange(num)}
                style={{
                  padding: '0.4rem',
                  borderRadius: '6px',
                  background: item.rating === num ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                  border: item.rating === num ? '1px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                className="rating-num-btn"
              >
                {num}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowRatingSelector(false)}
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
      </div>

      {/* Zone des informations principales */}
      <div style={{ padding: '1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3 
            onClick={item.media_type === 'tv' ? handleOpenEpisodesModal : undefined}
            style={{ 
              fontSize: '1rem', 
              fontWeight: 600, 
              color: '#fff', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis', 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              height: '2.4em',
              lineHeight: '1.2em',
              flexGrow: 1,
              cursor: item.media_type === 'tv' ? 'pointer' : 'default',
              transition: 'color 0.2s'
            }} 
            title={item.media_type === 'tv' ? "Cliquez pour voir les épisodes" : item.title}
            className={item.media_type === 'tv' ? "clickable-title" : undefined}
          >
            {item.title}
          </h3>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {releaseYear}
          </span>
        </div>

        {/* Suivi et contrôle de progression pour les séries télévisées */}
        {item.media_type === 'tv' && (
          readOnly ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.55rem 0.75rem',
              margin: '0.4rem 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                📺 PROGRESSION
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                  S{item.current_season || 1} • Ép {item.current_episode || 0}
                </span>
                <button
                  onClick={handleOpenEpisodesModal}
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  title="Voir les épisodes"
                >
                  Détails ℹ️
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              background: item.watching ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
              border: item.watching ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '0.4rem 0.5rem',
              margin: '0.4rem 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.watching ? '#60a5fa' : 'var(--text-secondary)' }}>
                  {item.watching ? '📺 EN COURS' : '📺 SUIVRE LA SÉRIE'}
                </span>
                {item.watching && (
                  <button
                    onClick={() => {
                      const nextEpisode = (item.current_episode || 0) + 1;
                      if (maxEpisodesForCurrentSeason === null || maxEpisodesForCurrentSeason === undefined || nextEpisode <= maxEpisodesForCurrentSeason) {
                        onUpdate(item.id, { current_episode: nextEpisode });
                      }
                    }}
                    disabled={maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      borderRadius: '4px',
                      color: '#60a5fa',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      cursor: (maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason) ? 'not-allowed' : 'pointer',
                      opacity: (maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason) ? 0.4 : 1,
                      transition: 'all 0.2s'
                    }}
                    title="Incrémenter l'épisode"
                  >
                    +1 Ep.
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Contrôle des Saisons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sais.</span>
                  <button
                    onClick={() => {
                      const prevSeason = Math.max(1, (item.current_season || 1) - 1);
                      handleSeasonChange(prevSeason);
                    }}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '12px', textAlign: 'center', color: '#fff' }}>
                    {item.current_season || 1}
                    {item.total_seasons ? `/${item.total_seasons}` : ''}
                  </span>
                  <button
                    onClick={() => {
                      const nextSeason = (item.current_season || 1) + 1;
                      if (item.total_seasons === null || item.total_seasons === undefined || nextSeason <= item.total_seasons) {
                        handleSeasonChange(nextSeason);
                      }
                    }}
                    disabled={item.total_seasons !== null && item.total_seasons !== undefined && (item.current_season || 1) >= item.total_seasons}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (item.total_seasons !== null && item.total_seasons !== undefined && (item.current_season || 1) >= item.total_seasons) ? 'not-allowed' : 'pointer',
                      opacity: (item.total_seasons !== null && item.total_seasons !== undefined && (item.current_season || 1) >= item.total_seasons) ? 0.3 : 1,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Contrôle des Épisodes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ép.</span>
                  <button
                    onClick={() => onUpdate(item.id, { current_episode: Math.max(0, (item.current_episode || 0) - 1) })}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '12px', textAlign: 'center', color: '#fff' }}>
                    {item.current_episode !== null && item.current_episode !== undefined ? item.current_episode : 0}
                    {maxEpisodesForCurrentSeason ? `/${maxEpisodesForCurrentSeason}` : ''}
                  </span>
                  <button
                    onClick={() => {
                      const nextEpisode = (item.current_episode || 0) + 1;
                      if (maxEpisodesForCurrentSeason === null || maxEpisodesForCurrentSeason === undefined || nextEpisode <= maxEpisodesForCurrentSeason) {
                        onUpdate(item.id, { current_episode: nextEpisode });
                      }
                    }}
                    disabled={maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason}
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: (maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason) ? 'not-allowed' : 'pointer',
                      opacity: (maxEpisodesForCurrentSeason !== null && maxEpisodesForCurrentSeason !== undefined && (item.current_episode || 0) >= maxEpisodesForCurrentSeason) ? 0.3 : 1,
                      fontSize: '0.75rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.75rem', color: item.watched ? 'var(--rating-color)' : 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={item.watched}
                    onChange={() => {
                      if (!item.watched) {
                        setShowRatingSelector(true);
                      } else {
                        onUpdate(item.id, { watched: false, rating: null });
                      }
                    }}
                    style={{ cursor: 'pointer', width: '13px', height: '13px' }}
                  />
                  <span>Terminé 🏁</span>
                </label>

                <button
                  onClick={handleOpenEpisodesModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  ℹ️ Épisodes
                </button>
              </div>
            </div>
          )
        )}

        {/* Affichage de la Note décernée */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '0.5rem 0', minHeight: '20px' }}>
          {item.watched ? (
            <>
              <span style={{ color: 'var(--rating-color)', fontSize: '1rem' }}>★</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--rating-color)' }}>
                {item.rating}/10
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                (Vu)
              </span>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non noté</span>
          )}
        </div>

        {/* Conteneur des Badges de Statut */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          {item.watching && (
            <span style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#60a5fa'
            }}>
              📺 En cours (S{item.current_season || 1}{item.total_seasons ? `/${item.total_seasons}` : ''} E{item.current_episode || 0}{maxEpisodesForCurrentSeason ? `/${maxEpisodesForCurrentSeason}` : ''})
            </span>
          )}
          {item.watchlist && (
            <span style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.25)',
              color: '#f97316'
            }}>
              🍿 À regarder
            </span>
          )}
          {item.dvd_owned && (
            <span style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: 'rgba(6, 182, 212, 0.12)',
              border: '1px solid rgba(6, 182, 212, 0.25)',
              color: 'var(--dvd-color)'
            }}>
              📀 DVD Acheté
            </span>
          )}
          {item.dvd_wishlist && (
            <span style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 600,
              background: 'rgba(236, 72, 153, 0.12)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              color: 'var(--wishlist-color)'
            }}>
              💖 Souhait DVD
            </span>
          )}
        </div>

        {/* Ligne d'actions rapides */}
        {!readOnly && (
          <div className="card-actions-row">
            {/* Boutons d'activation de statuts */}
            <div className="card-status-btns">
              {/* Icône de visionnage (Vu / Noter) */}
              <button
                onClick={toggleWatched}
                className="card-action-btn"
                style={{
                  background: item.watched ? 'var(--primary)' : undefined,
                  color: item.watched ? '#fff' : undefined
                }}
                title={item.watched ? "Marquer comme non vu" : "Marquer comme vu et noter"}
              >
                👁️
              </button>

              {/* Suivi de série télévisée */}
              {item.media_type === 'tv' && (
                <button
                  onClick={toggleWatching}
                  className="card-action-btn"
                  style={{
                    background: item.watching ? '#3b82f6' : undefined,
                    color: item.watching ? '#fff' : undefined
                  }}
                  title={item.watching ? "Arrêter de suivre cette série" : "Suivre la série en cours de visionnage"}
                >
                  📺
                </button>
              )}

              {/* Watchlist toggle button */}
              <button
                onClick={toggleWatchlist}
                className="card-action-btn"
                style={{
                  background: item.watchlist ? '#f97316' : undefined,
                  color: item.watchlist ? '#fff' : undefined
                }}
                title={item.watchlist ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
              >
                🍿
              </button>

              {/* DVD possédé */}
              <button
                onClick={toggleDvdOwned}
                className="card-action-btn"
                style={{
                  background: item.dvd_owned ? 'var(--dvd-color)' : undefined,
                  color: item.dvd_owned ? '#fff' : undefined
                }}
                title={item.dvd_owned ? "Retirer des DVD possédés" : "Ajouter aux DVD possédés"}
              >
                📀
              </button>

              {/* Liste de souhaits de DVD */}
              <button
                onClick={toggleDvdWishlist}
                className="card-action-btn"
                style={{
                  background: item.dvd_wishlist ? 'var(--wishlist-color)' : undefined,
                  color: item.dvd_wishlist ? '#fff' : undefined
                }}
                title={item.dvd_wishlist ? "Retirer de la liste d'achats DVD" : "Ajouter à la liste d'achats DVD"}
              >
                💖
              </button>
            </div>

            {/* Bouton supprimer */}
            <button
              onClick={() => {
                if (confirm(`Voulez-vous vraiment retirer "${item.title}" de votre bibliothèque ?`)) {
                  onDelete(item.id);
                }
              }}
              style={{
                background: 'transparent'
              }}
              className="card-action-btn delete-btn"
              title="Retirer complètement de MyShelf"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Fenêtre Modal de la liste d'épisodes (Django + TMDB) */}
      {mounted && showEpisodesModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 5, 8, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
          animation: 'fadeIn 0.25s ease-out'
        }}
        onClick={() => setShowEpisodesModal(false)}
        >
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête de la Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
                  {item.title}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Liste des épisodes & résumés
                </p>
              </div>
              <button 
                onClick={() => setShowEpisodesModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#fff',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                ✕
              </button>
            </div>

            {/* Onglets de sélection des saisons */}
            {item.seasons_data && item.seasons_data.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                gap: '8px',
                padding: '0.75rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none'
              }} className="season-tabs">
                {[...(item.seasons_data || [])]
                  .sort((a, b) => a.season_number - b.season_number)
                  .map((s) => {
                    const isSelected = selectedSeasonInModal === s.season_number;
                    return (
                      <button
                        key={s.season_number}
                        onClick={() => handleSeasonSelectInModal(s.season_number)}
                        style={{
                          padding: '0.45rem 0.95rem',
                          borderRadius: '20px',
                          background: isSelected ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'inline-block',
                          flexShrink: 0,
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        Saison {s.season_number} ({s.episode_count} Ép.)
                      </button>
                    );
                  })}
              </div>
            )}

            {/* Liste des épisodes */}
            <div style={{
              flexGrow: 1,
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}>
              {loadingEpisodes ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chargement des épisodes...</span>
                </div>
              ) : episodes.length > 0 ? (
                episodes.map((ep) => {
                  const isLastWatched = item.current_season === selectedSeasonInModal && item.current_episode === ep.episode_number;
                  const epStillUrl = ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null;
                  
                  return (
                    <div 
                      key={ep.episode_number}
                      style={{
                        background: 'rgba(255, 255, 255, 0.015)',
                        border: isLastWatched ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'flex',
                        gap: '16px',
                        position: 'relative',
                        transition: 'all 0.2s',
                        boxShadow: isLastWatched ? '0 4px 12px rgba(59, 130, 246, 0.05)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                        if (!isLastWatched) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                        if (!isLastWatched) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                    >
                      {/* Vignette de l'épisode */}
                      <div style={{
                        width: '100px',
                        height: '65px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        background: '#141419',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {epStillUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={epStillUrl} 
                            alt={ep.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ fontSize: '1.25rem' }}>📺</span>
                        )}
                      </div>

                      {/* Contenu et synopsis de l'épisode */}
                      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>
                            {ep.episode_number}. {ep.name}
                          </h4>
                          {ep.air_date && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {new Date(ep.air_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        
                        <p style={{ 
                          fontSize: '0.8rem', 
                          color: 'var(--text-secondary)', 
                          lineHeight: 1.45,
                          margin: '2px 0 8px 0',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {ep.overview || "Aucun synopsis disponible pour cet épisode."}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleSelectEpisode(selectedSeasonInModal, ep.episode_number)}
                            disabled={isLastWatched}
                            style={{
                              background: isLastWatched ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                              border: isLastWatched ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                              color: isLastWatched ? '#60a5fa' : 'var(--text-secondary)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isLastWatched ? 'default' : 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseEnter={(e) => {
                              if (!isLastWatched) {
                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                e.currentTarget.style.color = '#60a5fa';
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isLastWatched) {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                              }
                            }}
                          >
                            {isLastWatched ? '✓ Dernier vu' : '👁️ Marquer comme vu'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                  <span>Aucun épisode trouvé.</span>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
