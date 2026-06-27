'use client';

import React, { useState, useEffect } from 'react';
import { MediaItem, User } from './types';
import { getItems, updateItem, deleteItem, login, register, logout, getCurrentUser, getProfile, updateProfile } from './api';
import ShelfSection from '../components/ShelfSection';
import SearchSection from '../components/SearchSection';
import DiscoverySection from '../components/DiscoverySection';

type TabType = 'all' | 'watching' | 'watched' | 'dvd_owned' | 'dvd_wishlist' | 'search' | 'discover';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);

  // Récupérer tous les éléments au montage du composant
  const fetchItems = async (showGlobalLoader = false) => {
    if (!localStorage.getItem('myshelf_token')) return;
    if (showGlobalLoader) setLoading(true);
    const data = await getItems();
    setItems(data);
    if (showGlobalLoader) setLoading(false);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('myshelf_token');
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            const data = await getItems();
            setItems(data);
            const profile = await getProfile();
            if (profile) {
              setIsPublic(profile.is_public);
            }
          } else {
            localStorage.removeItem('myshelf_token');
          }
        } catch (err) {
          localStorage.removeItem('myshelf_token');
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  const handleTogglePublic = async () => {
    const nextState = !isPublic;
    setIsPublic(nextState);
    const result = await updateProfile({ is_public: nextState });
    if (!result) {
      setIsPublic(isPublic);
      alert("Erreur lors de la mise à jour des paramètres de visibilité.");
    }
  };

  const handleCopyLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/${user.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!username.trim() || !password.trim()) {
      setAuthError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const data = await login(username, password);
      if (data && data.token) {
        localStorage.setItem('myshelf_token', data.token);
        setUser(data.user);
        setUsername('');
        setPassword('');
        
        // Charger les items
        setLoading(true);
        const userItems = await getItems();
        setItems(userItems);
        // Charger le profil
        const profile = await getProfile();
        if (profile) setIsPublic(profile.is_public);
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Identifiants incorrects.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!username.trim() || !password.trim()) {
      setAuthError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const data = await register(username, password, email || undefined);
      if (data && data.token) {
        localStorage.setItem('myshelf_token', data.token);
        setUser(data.user);
        setUsername('');
        setPassword('');
        setEmail('');
        
        if (data.associated_orphans && data.associated_orphans > 0) {
          setAuthSuccess(`Compte créé avec succès ! Vos ${data.associated_orphans} films/séries existants ont été associés à votre compte.`);
        }
        
        // Charger les items
        setLoading(true);
        const userItems = await getItems();
        setItems(userItems);
        // Charger le profil
        const profile = await getProfile();
        if (profile) setIsPublic(profile.is_public);
        setLoading(false);
      }
    } catch (err: any) {
      setAuthError(err.message || "Erreur lors de l'inscription.");
    }
  };

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('myshelf_token');
    setUser(null);
    setItems([]);
    setAuthSuccess('');
    setAuthError('');
    setActiveTab('all');
  };

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

  if (authLoading) {
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

  // Écran d'authentification cinématique haut de gamme si non connecté
  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Glows d'arrière-plan */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '30%',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '20%',
          right: '30%',
          width: '40vw',
          height: '40vw',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }}></div>

        <div className="glass-panel animate-fade-in" style={{
          width: '100%',
          maxWidth: '440px',
          padding: '2.5rem 2rem',
          zIndex: 1,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {/* Logo cinématique */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.5))', animation: 'pulseGlow 2.5s infinite' }}>🎬</span>
            <h1 style={{ 
              fontSize: '2.2rem', 
              fontWeight: 900, 
              background: 'linear-gradient(135deg, #ffffff 30%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em'
            }}>
              MyShelf
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
              Votre collection de cinéma et DVD physiques
            </p>
          </div>

          {/* Onglets segmented control */}
          <div className="nav-segmented-control" style={{ marginBottom: '1.75rem', width: '100%', justifyContent: 'center' }}>
            <button 
              onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccess(''); }}
              className={`nav-segment-btn ${authMode === 'login' ? 'active-all' : ''}`}
              style={{ flexGrow: 1, justifyContent: 'center', padding: '0.6rem 0' }}
            >
              🔑 Connexion
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccess(''); }}
              className={`nav-segment-btn ${authMode === 'register' ? 'active-watched' : ''}`}
              style={{ flexGrow: 1, justifyContent: 'center', padding: '0.6rem 0' }}
            >
              📝 Inscription
            </button>
          </div>

          {authError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: 500
            }}>
              ⚠️ {authError}
            </div>
          )}

          {authSuccess && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              fontWeight: 500
            }}>
              ✨ {authSuccess}
            </div>
          )}

          <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Nom d'utilisateur
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ex: sacha"
                className="form-input"
                required
              />
            </div>

            {authMode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Adresse Email (Optionnelle)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: sacha@example.com"
                  className="form-input"
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem 0', marginTop: '0.5rem' }}>
              {authMode === 'login' ? 'Se connecter' : "S'inscrire"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Contenu principal de l'application (Une fois connecté)
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
              onClick={() => setActiveTab('discover')}
              className={`nav-segment-btn ${activeTab === 'discover' ? 'active-watching' : ''}`}
              style={{
                background: activeTab === 'discover' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: activeTab === 'discover' ? '#34d399' : 'var(--text-secondary)'
              }}
            >
              ✨ Découverte
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

          {/* Profil utilisateur & Déconnexion */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👤 <strong style={{ color: '#fff' }}>{user.username}</strong>
            </span>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.35rem 0.65rem', borderRadius: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', userSelect: 'none', fontWeight: 600 }}>
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={handleTogglePublic} 
                  style={{ cursor: 'pointer', width: '13px', height: '13px' }}
                />
                <span>🌐 Profil Public</span>
              </label>
              {isPublic && (
                <button 
                  onClick={handleCopyLink} 
                  className="btn"
                  style={{ 
                    padding: '2px 8px', 
                    fontSize: '0.7rem', 
                    borderRadius: '6px',
                    background: copied ? 'var(--dvd-color)' : 'var(--primary)',
                    color: '#fff',
                    marginLeft: '4px',
                    transition: 'all 0.2s',
                    height: '22px'
                  }}
                >
                  {copied ? 'Copié !' : 'Partager 🔗'}
                </button>
              )}
            </div>

            <button 
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '10px',
                fontSize: '0.8rem',
                fontWeight: 700
              }}
            >
              🚪 Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Zone de contenu principal */}
      <main className="container" style={{ flexGrow: 1, padding: '2rem 2rem 4rem' }}>
        
        {/* Bannière Hero cinématique d'introduction */}
        {activeTab !== 'search' && activeTab !== 'discover' && (
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
        ) : activeTab === 'discover' ? (
          // Section de découverte et recommandations
          <DiscoverySection onItemAdded={() => fetchItems(false)} />
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
