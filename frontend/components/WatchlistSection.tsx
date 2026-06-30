import React, { useState, useEffect } from 'react';
import { MediaItem } from '../app/types';
import MediaCard from './MediaCard';

interface WatchlistSectionProps {
  items: MediaItem[];
  onUpdateItem: (id: number, data: Partial<MediaItem>) => void;
  onDeleteItem: (id: number) => void;
}

export default function WatchlistSection({ items, onUpdateItem, onDeleteItem }: WatchlistSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'watchlist' | 'watching'>('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Autocomplete suggestions states for watchlist internal search
  const [suggestions, setSuggestions] = useState<MediaItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [blurTimeout, setBlurTimeout] = useState<NodeJS.Timeout | null>(null);

  // Reset page when sub-tab or query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab, searchQuery]);

  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const q = searchQuery.toLowerCase();
      const matches = items.filter(item => 
        item.title.toLowerCase().includes(q) &&
        ((activeSubTab === 'watchlist' && item.watchlist) ||
         (activeSubTab === 'watching' && item.watching))
      );
      setSuggestions(matches.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, items, activeSubTab]);

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

  // Filter items according to sub-tab
  let filtered = items.filter(item => {
    if (activeSubTab === 'watchlist') return item.watchlist;
    if (activeSubTab === 'watching') return item.watching;
    return false;
  });

  // Filter by search query
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.overview && item.overview.toLowerCase().includes(q))
    );
  }

  // Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="animate-fade-in" style={{ padding: '1rem 0' }}>
      
      {/* Top Header Filter & Search controls */}
      <div style={{
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        marginBottom: '2rem',
        background: 'rgba(20, 18, 30, 0.4)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '0.85rem 1.25rem',
        backdropFilter: 'var(--glass-blur)'
      }}>
        {/* Search input with autocomplete */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '260px', flexGrow: 1 }}>
          <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Rechercher dans ma watchlist..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className="form-input"
            style={{
              paddingLeft: '36px',
              fontSize: '0.9rem',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.02)',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSuggestions([]);
                setShowSuggestions(false);
              }}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.95rem',
                zIndex: 10
              }}
            >
              ✕
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="glass-panel animate-fade-in"
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
                  key={item.id}
                  onClick={() => {
                    setSearchQuery(item.title);
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  style={{
                    padding: '0.6rem 1.25rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#fff',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  className="suggestion-item"
                >
                  <span>{item.media_type === 'movie' ? '🎥' : '📺'}</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sub-tabs segment switcher */}
        <div className="nav-segmented-control">
          <button
            onClick={() => setActiveSubTab('watchlist')}
            className={`nav-segment-btn ${activeSubTab === 'watchlist' ? 'active-dvd_wishlist' : ''}`}
            style={{
              background: activeSubTab === 'watchlist' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: activeSubTab === 'watchlist' ? '#f97316' : 'var(--text-secondary)',
              border: activeSubTab === 'watchlist' ? '1px solid rgba(249, 115, 22, 0.3)' : 'none',
              padding: '0.45rem 1.1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            🍿 À Regarder ({items.filter(i => i.watchlist).length})
          </button>
          <button
            onClick={() => setActiveSubTab('watching')}
            className={`nav-segment-btn ${activeSubTab === 'watching' ? 'active-watching' : ''}`}
            style={{
              background: activeSubTab === 'watching' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: activeSubTab === 'watching' ? '#60a5fa' : 'var(--text-secondary)',
              border: activeSubTab === 'watching' ? '1px solid rgba(59, 130, 246, 0.3)' : 'none',
              padding: '0.45rem 1.1rem',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700
            }}
          >
            📺 Séries En Cours ({items.filter(i => i.watching).length})
          </button>
        </div>
      </div>

      {/* Grid of cards */}
      {paginatedItems.length > 0 ? (
        <>
          <div className="media-grid">
            {paginatedItems.map((item) => (
              <div key={item.id}>
                <MediaCard 
                  item={item}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                />
              </div>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '3.5rem' }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage <= 1}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.2rem', borderRadius: '10px', fontWeight: 'bold' }}
              >
                ⬅️ Précédent
              </button>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', background: 'rgba(255,255,255,0.04)', padding: '0.45rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                Page {currentPage} sur {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage >= totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.2rem', borderRadius: '10px', fontWeight: 'bold' }}
              >
                Suivant ➡️
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', maxWidth: '550px', margin: '3rem auto' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1.25rem' }}>🍿</span>
          <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
            Votre Watchlist est vide
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {activeSubTab === 'watchlist'
              ? "Ajoutez des films et séries à regarder depuis l'onglet de Recherche ou d'Exploration pour les retrouver ici."
              : "Suivez des séries TV pour afficher votre progression d'épisodes en cours ici."}
          </p>
        </div>
      )}
    </div>
  );
}
