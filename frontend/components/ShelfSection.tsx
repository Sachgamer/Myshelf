import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MediaItem } from '../app/types';
import MediaCard from './MediaCard';

interface ShelfSectionProps {
  items: MediaItem[];
  activeTab: 'all' | 'watching' | 'watched' | 'dvd_owned' | 'dvd_wishlist';
  onUpdate: (id: number, data: Partial<MediaItem>) => void;
  onDelete: (id: number) => void;
  readOnly?: boolean;
}

export default function ShelfSection({ items, activeTab, onUpdate, onDelete, readOnly = false }: ShelfSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Calculs détaillés pour les graphiques de statistiques
  const stats = useMemo(() => {
    const total = items.length;
    const movies = items.filter(i => i.media_type === 'movie');
    const tvs = items.filter(i => i.media_type === 'tv');
    
    const moviesCount = movies.length;
    const tvCount = tvs.length;
    
    const moviesRatio = total > 0 ? moviesCount / total : 0;
    const tvRatio = total > 0 ? tvCount / total : 0;
    const moviePct = Math.round(moviesRatio * 100);
    const tvPct = Math.round(tvRatio * 100);
    
    // Donut chart stroke math (radius 70, circumference C = 439.82)
    const C = 439.82;
    const moviesStroke = moviesRatio * C;
    const tvStroke = tvRatio * C;
    
    // Ratings (1 to 10)
    const ratedItems = items.filter(i => i.watched && i.rating !== null && i.rating >= 1 && i.rating <= 10);
    const ratingCounts = Array(10).fill(0);
    ratedItems.forEach(i => {
      ratingCounts[i.rating! - 1]++;
    });
    const maxRatingCount = Math.max(...ratingCounts, 1);
    
    // Decades
    const decadeKeys = ['Avant 1980', '1980s', '1990s', '2000s', '2010s', '2020s'];
    const decadeCounts = Array(6).fill(0);
    items.forEach(i => {
      if (!i.release_date) return;
      const year = new Date(i.release_date).getFullYear();
      if (isNaN(year)) return;
      if (year < 1980) {
        decadeCounts[0]++;
      } else if (year < 1990) {
        decadeCounts[1]++;
      } else if (year < 2000) {
        decadeCounts[2]++;
      } else if (year < 2010) {
        decadeCounts[3]++;
      } else if (year < 2020) {
        decadeCounts[4]++;
      } else {
        decadeCounts[5]++;
      }
    });
    const maxDecadeCount = Math.max(...decadeCounts, 1);
    
    // Activity (last 6 months)
    const last6Months: { year: number; month: number; label: string; count: number }[] = [];
    const now = new Date();
    for (let j = 5; j >= 0; j--) {
      const d = new Date(now.getFullYear(), now.getMonth() - j, 1);
      last6Months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
        count: 0
      });
    }
    
    items.forEach(i => {
      if (!i.created_at) return;
      const date = new Date(i.created_at);
      if (isNaN(date.getTime())) return;
      const itemYear = date.getFullYear();
      const itemMonth = date.getMonth();
      const match = last6Months.find(m => m.year === itemYear && m.month === itemMonth);
      if (match) {
        match.count++;
      }
    });
    const maxActivityCount = Math.max(...last6Months.map(m => m.count), 1);
    
    return {
      total,
      moviesCount,
      tvCount,
      moviePct,
      tvPct,
      moviesStroke,
      tvStroke,
      ratingCounts,
      maxRatingCount,
      decadeKeys,
      decadeCounts,
      maxDecadeCount,
      last6Months,
      maxActivityCount
    };
  }, [items]);

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
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
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

        {/* Stat 6: Statistiques Détaillées */}
        <div 
          onClick={() => setShowStatsModal(true)}
          className="glass-panel" 
          style={{ 
            padding: '1.25rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            textAlign: 'center',
            borderBottom: '3px solid var(--primary)',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.05))',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(139, 92, 246, 0.08)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(139, 92, 246, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--card-border)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.08)';
          }}
        >
          <span style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📊</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Analyses</span>
          <span style={{ fontSize: '1.85rem', fontWeight: 800, color: '#fff', marginTop: '0.25rem' }}>Détails →</span>
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
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </div>

      {/* Fenêtre Modal des Analyses Statistiques */}
      {mounted && showStatsModal && createPortal(
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
        onClick={() => setShowStatsModal(false)}
        >
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📊 Analyses de la Bibliothèque
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Indicateurs de progression, notes et répartition par genre & époque
                </p>
              </div>
              <button 
                onClick={() => setShowStatsModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                ✕
              </button>
            </div>

            {/* Contenu */}
            <div style={{ padding: '1.75rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📈</span>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>Données insuffisantes</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Ajoutez des films et séries à vos étagères pour voir apparaître vos statistiques.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '24px'
                }}>
                  
                  {/* 1. Genre (Donut Chart SVG) */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🎥 Répartition Films vs Séries
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', height: '180px' }}>
                      {/* SVG Donut */}
                      <svg width="140" height="140" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="70" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="18" />
                        {stats.moviesCount > 0 && (
                          <circle 
                            cx="100" 
                            cy="100" 
                            r="70" 
                            fill="transparent" 
                            stroke="var(--primary)" 
                            strokeWidth="18" 
                            strokeDasharray={`${stats.moviesStroke} ${439.82 - stats.moviesStroke}`} 
                            strokeDashoffset="0" 
                            transform="rotate(-90 100 100)"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                          />
                        )}
                        {stats.tvCount > 0 && (
                          <circle 
                            cx="100" 
                            cy="100" 
                            r="70" 
                            fill="transparent" 
                            stroke="var(--wishlist-color)" 
                            strokeWidth="18" 
                            strokeDasharray={`${stats.tvStroke} ${439.82 - stats.tvStroke}`} 
                            strokeDashoffset={-stats.moviesStroke} 
                            transform="rotate(-90 100 100)"
                            style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                          />
                        )}
                        <text x="100" y="98" textAnchor="middle" fill="#fff" fontSize="1.8rem" fontWeight="900">
                          {stats.total}
                        </text>
                        <text x="100" y="120" textAnchor="middle" fill="var(--text-secondary)" fontSize="0.7rem" fontWeight="800" letterSpacing="0.08em">
                          TITRES
                        </text>
                      </svg>

                      {/* Légende */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Films</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '20px' }}>
                            {stats.moviesCount} ({stats.moviePct}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--wishlist-color)' }}></span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Séries</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '20px' }}>
                            {stats.tvCount} ({stats.tvPct}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Époque (Decade Horizontal Bars) */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      ⏳ Répartition par Décennie
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', flexGrow: 1 }}>
                      {stats.decadeKeys.map((decade, idx) => {
                        const count = stats.decadeCounts[idx];
                        const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                        const barWidth = stats.maxDecadeCount > 0 ? (count / stats.maxDecadeCount) * 100 : 0;
                        return (
                          <div key={decade} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', width: '80px', flexShrink: 0 }}>
                              {decade}
                            </span>
                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', height: '8px', borderRadius: '4px', flexGrow: 1, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <div style={{ 
                                background: 'linear-gradient(to right, var(--dvd-color), #0891b2)', 
                                height: '100%', 
                                width: `${barWidth}%`, 
                                borderRadius: '4px',
                                transition: 'width 0.4s ease-out',
                                boxShadow: '0 0 8px rgba(6, 182, 212, 0.3)'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fff', width: '50px', textAlign: 'right', flexShrink: 0 }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Notes (Histogram Bar Chart) */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>⭐ Distribution des Notes (1 - 10)</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--rating-color)', fontWeight: 800 }}>
                        Moyenne: {averageRating} ★
                      </span>
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, justifyContent: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '130px', padding: '0 10px', gap: '6px' }}>
                        {stats.ratingCounts.map((count, index) => {
                          const rating = index + 1;
                          const barHeight = (count / stats.maxRatingCount) * 100;
                          return (
                            <div key={rating} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'flex-end', position: 'relative' }} title={`${count} titre(s)`}>
                                {count > 0 && (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff', marginBottom: '2px', position: 'absolute', bottom: `${Math.max(barHeight, 5)}%`, transform: 'translateY(-14px)' }}>
                                    {count}
                                  </span>
                                )}
                                <div style={{
                                  width: '100%',
                                  minWidth: '8px',
                                  maxWidth: '24px',
                                  height: count > 0 ? `${barHeight}%` : '4px',
                                  borderRadius: '4px 4px 0 0',
                                  background: count > 0 
                                    ? 'linear-gradient(to top, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.8))'
                                    : 'rgba(255,255,255,0.03)',
                                  border: count > 0 ? '1px solid rgba(236, 72, 153, 0.2)' : 'none',
                                  boxShadow: count > 0 ? '0 0 10px rgba(236, 72, 153, 0.2)' : 'none',
                                  transition: 'height 0.4s ease-out'
                                }}></div>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {rating}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 4. Timeline d'Activité (Line/Area SVG Chart) */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <h3 style={{ fontSize: '1rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📈 Activité d'Ajout (Derniers 6 mois)
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, padding: '0 10px', height: '130px' }}>
                      <svg width="100%" height="120" viewBox="0 0 450 120" style={{ overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--dvd-color)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--dvd-color)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        
                        {/* Horizontal grid lines */}
                        <line x1="30" y1="15" x2="420" y2="15" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                        <line x1="30" y1="60" x2="420" y2="60" stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                        <line x1="30" y1="105" x2="420" y2="105" stroke="rgba(255,255,255,0.08)" />

                        {/* Area and Line path */}
                        {(() => {
                          const paddingLeft = 40;
                          const width = 360;
                          const stepX = width / 5;
                          const points = stats.last6Months.map((m, idx) => {
                            const x = paddingLeft + idx * stepX;
                            const y = 105 - (stats.maxActivityCount > 0 ? (m.count / stats.maxActivityCount) : 0) * 80;
                            return { x, y, count: m.count, label: m.label };
                          });

                          const areaPath = `M ${points[0].x} 105 ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${points[points.length-1].x} 105 Z`;
                          const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                          return (
                            <>
                              <path d={areaPath} fill="url(#activityGradient)" />
                              <path d={linePath} fill="none" stroke="var(--dvd-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              {points.map((p, idx) => (
                                <g key={idx}>
                                  <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="var(--dvd-color)" strokeWidth="2.5" />
                                  {p.count > 0 && (
                                    <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#fff" fontSize="0.7rem" fontWeight="800">
                                      {p.count}
                                    </text>
                                  )}
                                  <text x={p.x} y="122" textAnchor="middle" fill="var(--text-secondary)" fontSize="0.7rem" fontWeight="600">
                                    {p.label}
                                  </text>
                                </g>
                              ))}
                            </>
                          );
                        })()}
                      </svg>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Pied de page */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'rgba(5, 5, 8, 0.2)'
            }}>
              <button 
                onClick={() => setShowStatsModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', fontSize: '0.85rem' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
