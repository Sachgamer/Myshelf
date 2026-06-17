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
  // 1. Calculer les statistiques générales pour toute la bibliothèque
  const totalCount = items.length;
  const watchingCount = items.filter(i => i.watching).length;
  const watchedItems = items.filter(i => i.watched);
  const watchedCount = watchedItems.length;
  const dvdOwnedCount = items.filter(i => i.dvd_owned).length;
  const dvdWishlistCount = items.filter(i => i.dvd_wishlist).length;

  const averageRating = watchedCount > 0 
    ? (watchedItems.reduce((acc, i) => acc + (i.rating || 0), 0) / watchedCount).toFixed(1)
    : 'N/A';

  // 2. États locaux pour la recherche interne, le filtre de type et le tri
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');

  // Filtrer les éléments selon l'onglet actif
  let filteredItems = items.filter(item => {
    if (activeTab === 'watching') return item.watching;
    if (activeTab === 'watched') return item.watched;
    if (activeTab === 'dvd_owned') return item.dvd_owned;
    if (activeTab === 'dvd_wishlist') return item.dvd_wishlist;
    return true; // toutes les catégories
  });

  // Appliquer le filtre de recherche par titre ou synopsis
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredItems = filteredItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.overview && item.overview.toLowerCase().includes(q))
    );
  }

  // Appliquer le filtre de type de média (film vs série)
  if (typeFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.media_type === typeFilter);
  }

  // Appliquer le tri configuré
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
      
      {/* Tableau de bord des statistiques avec un style néon épuré */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {/* Stat 1: Total Bibliothèque */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          borderBottom: '3px solid rgba(255, 255, 255, 0.3)',
        }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📚</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Titres</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>{totalCount}</span>
        </div>

        {/* Stat 2: Séries en cours */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          borderBottom: '3px solid #3b82f6',
          boxShadow: '0 8px 25px rgba(59, 130, 246, 0.05)'
        }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📺</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>En cours</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#60a5fa', marginTop: '0.25rem' }}>{watchingCount}</span>
        </div>

        {/* Stat 3: Titres Vus */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          borderBottom: '3px solid var(--primary)',
          boxShadow: '0 8px 25px rgba(139, 92, 246, 0.05)'
        }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>👁️</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Vus & Notés</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--primary-hover)', marginTop: '0.25rem' }}>
            {watchedCount} <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '2px' }}>({averageRating} ★)</span>
          </span>
        </div>

        {/* Stat 4: DVD Achetés */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          borderBottom: '3px solid var(--dvd-color)',
          boxShadow: '0 8px 25px rgba(6, 182, 212, 0.05)'
        }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📀</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>DVD Possédés</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--dvd-color)', marginTop: '0.25rem' }}>{dvdOwnedCount}</span>
        </div>

        {/* Stat 5: DVD Souhaités */}
        <div className="glass-panel" style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center',
          borderBottom: '3px solid var(--wishlist-color)',
          boxShadow: '0 8px 25px rgba(236, 72, 153, 0.05)'
        }}>
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>💖</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Souhaités</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--wishlist-color)', marginTop: '0.25rem' }}>{dvdWishlistCount}</span>
        </div>
      </div>

      {/* Section des éléments de la bibliothèque */}
      <div>
        <h2 style={{ 
          fontSize: '1.35rem', 
          fontWeight: 800, 
          color: '#fff', 
          marginBottom: '1.5rem', 
          borderBottom: '1px solid rgba(255,255,255,0.06)', 
          paddingBottom: '0.6rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px' 
        }}>
          {activeTab === 'all' && '📚 Toute ma bibliothèque'}
          {activeTab === 'watching' && '📺 Mes séries en cours'}
          {activeTab === 'watched' && '👁️ Mes films & séries vus'}
          {activeTab === 'dvd_owned' && '📀 Mes DVD achetés'}
          {activeTab === 'dvd_wishlist' && '💖 Mes souhaits d\'achats DVD'}
          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
            {filteredItems.length}
          </span>
        </h2>

        {/* Barre de contrôle et de filtrage unifiée en verre dépoli */}
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
          {/* Recherche interne */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '260px', flexGrow: 1 }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '0.9rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Rechercher sur mes étagères..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{
                paddingLeft: '36px',
                fontSize: '0.9rem',
                borderRadius: '10px',
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
                  fontSize: '0.95rem'
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtres secondaires et Tri */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Filtre par Type de média */}
            <div style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '10px', 
              padding: '3px', 
              border: '1px solid rgba(255,255,255,0.06)' 
            }}>
              {(['all', 'movie', 'tv'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: typeFilter === type ? 'var(--primary)' : 'transparent',
                    color: typeFilter === type ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {type === 'all' && 'Tous'}
                  {type === 'movie' && '🎬 Films'}
                  {type === 'tv' && '📺 Séries'}
                </button>
              ))}
            </div>

            {/* Tri */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Trier par :</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'rgba(12, 10, 18, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '10px',
                  color: '#fff',
                  padding: '0.45rem 1.75rem 0.45rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                  fontFamily: 'var(--font-outfit)',
                  transition: 'var(--transition-smooth)'
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

        {/* Grille de cartes ou message d'étagère vide */}
        {filteredItems.length === 0 ? (
          <div className="glass-panel animate-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Étagère vide 🎬</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
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
