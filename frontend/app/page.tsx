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

  // Fetch all items on mount
  const fetchItems = async () => {
    setLoading(true);
    const data = await getItems();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpdateItem = async (id: number, data: Partial<MediaItem>) => {
    // Optimistic update for UI responsiveness
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...data };
          // If a status was turned to true, handle toggles (e.g. owned vs wishlist)
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

    // Sync with backend
    const updatedResult = await updateItem(id, data);
    
    // If backend returns data, refresh just in case, or if it fails, rollback
    if (!updatedResult) {
      // Rollback on failure (refetch all)
      fetchItems();
    } else {
      // Update with exact data from backend (includes server timestamps, etc.)
      setItems((prevItems) =>
        prevItems.map((item) => (item.id === id ? updatedResult : item))
      );
    }
  };

  const handleDeleteItem = async (id: number) => {
    // Optimistic delete
    const previousItems = [...items];
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));

    const success = await deleteItem(id);
    if (!success) {
      // Rollback on failure
      setItems(previousItems);
      alert("Erreur lors de la suppression de l'élément.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sticky Header Nav */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(9, 9, 14, 0.8)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '1rem 0'
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          
          {/* Logo */}
          <div 
            onClick={() => setActiveTab('all')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <span style={{ fontSize: '1.75rem', filter: 'drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))' }}>🎬</span>
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 800, 
              background: 'linear-gradient(to right, #ffffff, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              MyShelf
            </h1>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setActiveTab('all')}
              className="btn"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
                border: activeTab === 'all' ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
              }}
            >
              📚 Bibliothèque
            </button>
            <button 
              onClick={() => setActiveTab('watching')}
              className="btn"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                background: activeTab === 'watching' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: activeTab === 'watching' ? '#60a5fa' : 'var(--text-secondary)',
                border: activeTab === 'watching' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
              }}
            >
              📺 En cours
            </button>
            <button 
              onClick={() => setActiveTab('watched')}
              className="btn"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                background: activeTab === 'watched' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                color: activeTab === 'watched' ? 'var(--primary-hover)' : 'var(--text-secondary)',
                border: activeTab === 'watched' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid transparent'
              }}
            >
              👁️ Vus & Notés
            </button>
            <button 
              onClick={() => setActiveTab('dvd_owned')}
              className="btn"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                background: activeTab === 'dvd_owned' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                color: activeTab === 'dvd_owned' ? 'var(--dvd-color)' : 'var(--text-secondary)',
                border: activeTab === 'dvd_owned' ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid transparent'
              }}
            >
              📀 DVD Achetés
            </button>
            <button 
              onClick={() => setActiveTab('dvd_wishlist')}
              className="btn"
              style={{
                padding: '0.5rem 0.9rem',
                fontSize: '0.9rem',
                background: activeTab === 'dvd_wishlist' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                color: activeTab === 'dvd_wishlist' ? 'var(--wishlist-color)' : 'var(--text-secondary)',
                border: activeTab === 'dvd_wishlist' ? '1px solid rgba(236, 72, 153, 0.3)' : '1px solid transparent'
              }}
            >
              💖 Souhait DVD
            </button>
            
            {/* Search Tab */}
            <button 
              onClick={() => setActiveTab('search')}
              className="btn btn-primary"
              style={{
                padding: '0.5rem 1.1rem',
                fontSize: '0.9rem',
                boxShadow: activeTab === 'search' ? '0 0 15px var(--primary)' : 'none',
                background: activeTab === 'search' ? 'var(--primary-hover)' : 'var(--primary)'
              }}
            >
              🔍 Rechercher
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ flexGrow: 1, padding: '2.5rem 1.5rem' }}>
        {loading ? (
          // Loader while page loads
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid rgba(255, 255, 255, 0.05)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'pulseGlow 1s infinite ease-in-out'
            }}></div>
          </div>
        ) : activeTab === 'search' ? (
          // Search component
          <SearchSection onItemAdded={fetchItems} />
        ) : (
          // Library shelves component
          <ShelfSection 
            items={items} 
            activeTab={activeTab} 
            onUpdate={handleUpdateItem} 
            onDelete={handleDeleteItem} 
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: '2rem 0',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem'
      }}>
        <div className="container">
          <p>© 2026 MyShelf — Votre bibliothèque personnelle de cinéma.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
            Alimenté par l'API TMDB.
          </p>
        </div>
      </footer>
    </div>
  );
}
