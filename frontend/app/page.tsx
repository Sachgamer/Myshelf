'use client';

import React, { useState, useEffect } from 'react';
import { MediaItem } from './types';
import { getItems, updateItem, deleteItem } from './api';
import ShelfSection from '../components/ShelfSection';
import SearchSection from '../components/SearchSection';

type TabType = 'all' | 'watching' | 'watched' | 'dvd_owned' | 'dvd_wishlist' | 'search';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Récupérer tous les éléments au montage du composant
  const fetchItems = async (showGlobalLoader = false) => {
    if (showGlobalLoader) setLoading(true);
    const data = await getItems();
    setItems(data);
    if (showGlobalLoader) setLoading(false);
  };

  useEffect(() => {
    fetchItems(true);
  }, []);

  const handleUpdateItem = async (id: number, data: Partial<MediaItem>) => {
    // Mise à jour optimiste de l'interface pour une réactivité maximale
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...data };
          // Si un statut est activé, on gère les bascules exclusives (ex: DVD possédé vs souhaité)
          if (data.dvd_owned === true) updated.dvd_wishlist = false;
          if (data.dvd_wishlist === true) updated.dvd_owned = false;
          if (data.watching === true) {
            updated.watched = false;
            updated.rating = null;
          }
          if (data.watched === true) updated.watching = false;
          return updated;
        }
        return item;
      })
    );

    // Synchronisation avec le backend
    const updatedResult = await updateItem(id, data);
    
    // Si la mise à jour échoue sur le serveur, on annule les modifications
    if (!updatedResult) {
      // Annulation en rechargeant les données d'origine
      fetchItems();
    } else {
      // Mise à jour avec les données exactes du serveur (dates, etc.)
      setItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? updatedResult : item))
      );
    }
  };

  const handleDeleteItem = async (id: number) => {
    // Suppression optimiste pour une action instantanée à l'écran
    const previousItems = [...items];
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));

    const success = await deleteItem(id);
    if (!success) {
      // Annulation en cas d'échec de la suppression sur le serveur
      setItems(previousItems);
      alert("Erreur lors de la suppression de l'élément.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Barre de navigation collante en verre dépoli */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8, 7, 13, 0.75)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '0.85rem 0',
        transition: 'var(--transition-smooth)'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          {/* Logo cinématique */}
          <div 
            onClick={() => setActiveTab('all')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '1.85rem', filter: 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.6))' }}>🎬</span>
            <h1 style={{ 
              fontSize: '1.6rem', 
              fontWeight: 900, 
              background: 'linear-gradient(135deg, #ffffff 30%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em'
            }}>
              MyShelf
            </h1>
          </div>

          {/* Navigation unifiée sous forme de contrôle segmenté haut de gamme */}
          <nav className="nav-segmented-control">
            <button 
              onClick={() => setActiveTab('all')}
              className={`nav-segment-btn ${activeTab === 'all' ? 'active-all' : ''}`}
            >
              📚 Bibliothèque
            </button>
            <button 
              onClick={() => setActiveTab('watching')}
              className={`nav-segment-btn ${activeTab === 'watching' ? 'active-watching' : ''}`}
            >
              📺 En cours
            </button>
            <button 
              onClick={() => setActiveTab('watched')}
              className={`nav-segment-btn ${activeTab === 'watched' ? 'active-watched' : ''}`}
            >
              👁️ Vus & Notés
            </button>
            <button 
              onClick={() => setActiveTab('dvd_owned')}
              className={`nav-segment-btn ${activeTab === 'dvd_owned' ? 'active-dvd_owned' : ''}`}
            >
              📀 DVD
            </button>
            <button 
              onClick={() => setActiveTab('dvd_wishlist')}
              className={`nav-segment-btn ${activeTab === 'dvd_wishlist' ? 'active-dvd_wishlist' : ''}`}
            >
              💖 Souhaits
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className="btn btn-primary"
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                marginLeft: '4px'
              }}
            >
              🔍 Rechercher
            </button>
          </nav>
        </div>
      </header>

      {/* Zone de contenu principal */}
      <main className="container" style={{ flexGrow: 1, padding: '2rem 2rem 4rem' }}>
        
        {/* Bannière Hero cinématique d'introduction */}
        {activeTab !== 'search' && (
          <div className="hero-banner animate-fade-in">
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
              <span style={{ 
                fontSize: '0.8rem', 
                fontWeight: 800, 
                color: 'var(--primary-hover)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.15em',
                background: 'rgba(139, 92, 246, 0.12)',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                border: '1px solid rgba(139, 92, 246, 0.2)',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                Collection Personnelle
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                Mon cinéma à portée de main
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Répertoriez vos films et séries, suivez la progression de vos épisodes en cours de visionnage et gérez votre collection de DVD physiques ou liste d'envies.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          // Indicateur de chargement stylisé
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
            <div style={{
              width: '45px',
              height: '45px',
              border: '4px solid rgba(255, 255, 255, 0.05)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
          </div>
        ) : activeTab === 'search' ? (
          // Section de recherche TMDB
          <SearchSection onItemAdded={() => fetchItems(false)} />
        ) : (
          // Grille des étagères de la bibliothèque
          <ShelfSection 
            items={items} 
            activeTab={activeTab} 
            onUpdate={handleUpdateItem} 
            onDelete={handleDeleteItem} 
          />
        )}
      </main>

      {/* Pied de page */}
      <footer style={{
        padding: '2.5rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
        background: 'rgba(8, 7, 13, 0.4)'
      }}>
        <div className="container">
          <p>© 2026 MyShelf — Votre bibliothèque personnelle de cinéma.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', opacity: 0.8 }}>
            Alimenté par l'API de données de cinéma TMDB.
          </p>
        </div>
      </footer>
    </div>
  );
}
