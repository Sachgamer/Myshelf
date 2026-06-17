import React, { useState } from 'react';
import { MediaItem } from '../app/types';
import MediaCard from './MediaCard';

interface ShelfSectionProps {
  items: MediaItem[];
  activeTab: 'all' | 'watching' | 'watched' | 'dvd_owned' | 'dvd_wishlist';
  onUpdate: (id: number, data: Partial<MediaItem>) => void;
  onDelete: (id: number) => void;
}

export default function ShelfSection({ items, activeTab, onUpdate, onDelete }: ShelfSectionProps) {
  // 1. Calculate general stats across ALL items in the library
  const totalCount = items.length;
  const watchingCount = items.filter(i => i.watching).length;
  const watchedItems = items.filter(i => i.watched);
  const watchedCount = watchedItems.length;
  const dvdOwnedCount = items.filter(i => i.dvd_owned).length;
  const dvdWishlistCount = items.filter(i => i.dvd_wishlist).length;

  const averageRating = watchedCount > 0 
    ? (watchedItems.reduce((acc, i) => acc + (i.rating || 0), 0) / watchedCount).toFixed(1)
    : 'N/A';

  // 2. Local states for search, media type filter, and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Filter items for the active shelf view
  let filteredItems = items.filter(item => {
    if (activeTab === 'watching') return item.watching;
    if (activeTab === 'watched') return item.watched;
    if (activeTab === 'dvd_owned') return item.dvd_owned;
    if (activeTab === 'dvd_wishlist') return item.dvd_wishlist;
    return true; // 'all'
  });

  // Apply search query filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.overview && item.overview.toLowerCase().includes(q))
    );
  }

  // Apply media type filter
  if (typeFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.media_type === typeFilter);
  }

  // Apply sorting
  filteredItems.sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    }
    if (sortBy === 'date_asc') {
      return new Date(a.updated_at || a.created_at).getTime() - new Date(b.updated_at || b.created_at).getTime();
    }
    if (sortBy === 'title_asc') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'title_desc') {
      return b.title.localeCompare(a.title);
    }
    if (sortBy === 'rating_desc') {
      return (b.rating || 0) - (a.rating || 0);
    }
    if (sortBy === 'rating_asc') {
      return (a.rating || 999) - (b.rating || 999);
    }
    return 0;
  });

  const getEmptyMessage = () => {
    switch(activeTab) {
      case 'watching':
        return "Aucune série n'est en cours de visionnage. Recherchez des séries et cliquez sur 'Suivre la série' pour commencer à suivre votre progression !";
      case 'watched':
        return "Vous n'avez pas encore noté de films ou séries. Allez dans l'onglet 'Rechercher' pour marquer vos premiers titres comme vus !";
      case 'dvd_owned':
        return "Votre collection de DVD physiques est vide. Ajoutez des DVD possédés depuis vos titres ou faites une recherche.";
      case 'dvd_wishlist':
        return "Votre liste de souhaits de DVD est vide. Ajoutez des titres que vous prévoyez d'acheter !";
      default:
        return "Votre bibliothèque est vide. Commencez par rechercher et ajouter des films ou des séries !";
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Stats Dashboard */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {/* Stat 1: Total Titles */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🎬</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titres</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>{totalCount}</span>
        </div>

        {/* Stat 1.5: Watching */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📺</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>En cours</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>{watchingCount}</span>
        </div>

        {/* Stat 2: Watched & Rating */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>👁️</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vus & Notés</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-hover)', marginTop: '0.25rem' }}>
            {watchedCount} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>({averageRating} ★)</span>
          </span>
        </div>

        {/* Stat 3: DVD Owned */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📀</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DVD Possédés</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--dvd-color)', marginTop: '0.25rem' }}>{dvdOwnedCount}</span>
        </div>

        {/* Stat 4: DVD Wishlist */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💖</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Souhaits DVD</span>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--wishlist-color)', marginTop: '0.25rem' }}>{dvdWishlistCount}</span>
        </div>
      </div>

      {/* Media Items Section */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab === 'all' && '📚 Toute ma bibliothèque'}
          {activeTab === 'watching' && '📺 Mes séries en cours'}
          {activeTab === 'watched' && '👁️ Mes films & séries vus'}
          {activeTab === 'dvd_owned' && '📀 Mes DVD achetés'}
          {activeTab === 'dvd_wishlist' && '💖 Mes souhaits d\'achats DVD'}
          <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
            ({filteredItems.length})
          </span>
        </h2>

        {/* Controls and Search Bar */}
        <div style={{
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '0.75rem 1rem'
        }}>
          {/* Internal search input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '240px', flexGrow: 1 }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher sur mes étagères..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '32px',
                fontSize: '0.9rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters buttons */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Media type filters */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['all', 'movie', 'tv'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: typeFilter === type ? 'var(--primary)' : 'transparent',
                    color: '#fff',
                    transition: 'all 0.2s'
                  }}
                >
                  {type === 'all' && 'Tous'}
                  {type === 'movie' && '🎬 Films'}
                  {type === 'tv' && '📺 Séries'}
                </button>
              ))}
            </div>

            {/* Sorting select */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'rgba(15, 12, 25, 0.9)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0.45rem 1.5rem 0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="date_desc">Ajoutés (Récents)</option>
                <option value="date_asc">Ajoutés (Anciens)</option>
                <option value="title_asc">Titre (A-Z)</option>
                <option value="title_desc">Titre (Z-A)</option>
                <option value="rating_desc">Note (Meilleure)</option>
                <option value="rating_asc">Note (Pire)</option>
              </select>
            </div>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Étagère vide</p>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
              {getEmptyMessage()}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '24px'
          }}>
            {filteredItems.map(item => (
              <MediaCard 
                key={item.id} 
                item={item} 
                onUpdate={onUpdate} 
                onDelete={onDelete} 
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
