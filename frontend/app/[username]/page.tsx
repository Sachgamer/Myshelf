'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MediaItem } from '../types';
import { getPublicItems } from '../api';
import ShelfSection from '../../components/ShelfSection';

export default function PublicShelfPage() {
  const params = useParams();
  const username = params.username as string;
  const router = useRouter();
  
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    const loadPublicShelf = async () => {
      try {
        const data = await getPublicItems(username);
        setItems(data);
      } catch (err: any) {
        setError(err.message || "Cette bibliothèque est privée ou n'existe pas.");
      } finally {
        setLoading(false);
      }
    };
    loadPublicShelf();
  }, [username]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#08070d' }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid rgba(255, 255, 255, 0.05)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '2rem',
        backgroundColor: '#08070d',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }}></div>
        <div className="glass-panel animate-fade-in" style={{
          maxWidth: '460px',
          width: '100%',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          zIndex: 1,
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🔒</span>
          <h2 style={{ fontSize: '1.6rem', color: '#fff', marginBottom: '0.75rem' }}>Bibliothèque indisponible</h2>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            La bibliothèque de <strong>{username}</strong> est privée ou n'existe pas dans nos registres.
          </p>
          <button onClick={() => router.push('/')} className="btn btn-primary" style={{ width: '100%' }}>
            Aller sur mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Barre de navigation collante en verre dépoli (lecture seule) */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(8, 7, 13, 0.75)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        padding: '0.85rem 0',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Logo cinématique */}
          <div 
            onClick={() => router.push('/')}
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

          <div style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            fontWeight: 700
          }}>
            📖 Bibliothèque publique de {username}
          </div>
        </div>
      </header>

      {/* Zone de contenu principal */}
      <main className="container" style={{ flexGrow: 1, padding: '2rem 2rem 4rem' }}>
        
        {/* Bannière d'accueil public */}
        <div className="hero-banner animate-fade-in" style={{ padding: '2.5rem 2rem' }}>
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              color: 'var(--primary-hover)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.12em',
              background: 'rgba(139, 92, 246, 0.12)',
              padding: '0.2rem 0.5rem',
              borderRadius: '6px',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'inline-block',
              marginBottom: '0.75rem'
            }}>
              Mode Invité 🍿
            </span>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem' }}>
              Collection cinéma de {username}
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Découvrez les films vus, les séries en cours et la collection de DVD physiques partagée par {username}.
            </p>
          </div>
        </div>

        {/* Grille des étagères en lecture seule */}
        <ShelfSection 
          items={items} 
          activeTab="all" 
          onUpdate={() => {}} 
          onDelete={() => {}} 
          readOnly={true}
        />
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
        </div>
      </footer>
    </div>
  );
}
