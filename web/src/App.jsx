import { useState, useEffect } from 'react';

// En local on tape sur le port 3000, ou via la variable d'env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const [currentUser, setCurrentUser] = useState('olivia');
  const [userInput, setUserInput] = useState('');
  
  // Recherche
  const [query, setQuery] = useState('');
  const [shows, setShows] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Watchlist
  const [watchlist, setWatchlist] = useState([]);
  const [message, setMessage] = useState(null);

  // Charger la watchlist quand l'utilisateur change
  useEffect(() => {
    if (currentUser) {
      fetchWatchlist();
    }
  }, [currentUser]);

  // Récupération de la watchlist
  const fetchWatchlist = async () => {
    try {
      const res = await fetch(`${API_URL}/watchlist`, {
        headers: { 'X-User': currentUser }
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data);
      }
    } catch (err) {
      console.error('Erreur chargement watchlist', err);
    }
  };

  // Création / Inscription d'un utilisateur
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: userInput.trim() })
      });

      if (res.ok) {
        setCurrentUser(userInput.trim());
        setUserInput('');
        flashMessage(`Connecté en tant que "${userInput.trim()}"`);
      } else {
        // Si l'utilisateur existe déjà, on bascule simplement dessus
        setCurrentUser(userInput.trim());
        setUserInput('');
        flashMessage(`Bascule sur le compte "${userInput.trim()}"`);
      }
    } catch (err) {
      flashMessage("Erreur lors de l'enregistrement", true);
    }
  };

  // Recherche de séries via l'API
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`${API_URL}/shows?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setShows(data);
    } catch (err) {
      flashMessage("Erreur lors de la recherche", true);
    } finally {
      setIsSearching(false);
    }
  };

  // Ajout d'une série à la watchlist
  const addToWatchlist = async (show) => {
    try {
      const res = await fetch(`${API_URL}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User': currentUser
        },
        body: JSON.stringify({
          show_id: show.id,
          title: show.titre
        })
      });

      if (res.ok) {
        flashMessage(`"${show.titre}" ajouté à la watchlist !`);
        // Mise à jour optimiste dans l'interface
        setWatchlist((prev) => [...prev, { show_id: show.id, title: show.titre }]);
      } else {
        const errData = await res.json();
        flashMessage(errData.erreur || "Erreur lors de l'ajout", true);
      }
    } catch (err) {
      flashMessage("Impossible de joindre l'API", true);
    }
  };

  const flashMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 3500);
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo-section">
          <h1>binggge <span>🍿</span></h1>
          <p className="subtitle">Suivi de séries minimaliste</p>
        </div>

        {/* Section Identité / Auth simplifiée */}
        <div className="user-card">
          <div className="user-badge">
            <span className="dot"></span>
            Utilisateur actif (X-User) : <strong>{currentUser}</strong>
          </div>
          <form onSubmit={handleRegister} className="user-form">
            <input
              type="text"
              placeholder="Changer de login..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <button type="submit">Valider</button>
          </form>
        </div>
      </header>

      {message && (
        <div className={`notification ${message.isError ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <main className="main-content">
        {/* Section Recherche */}
        <section className="search-section">
          <h2>Rechercher une série</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Ex: Severance, Breaking Bad, Dark..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? 'Recherche...' : 'Chercher'}
            </button>
          </form>

          <div className="shows-grid">
            {shows.map((show) => (
              <div key={show.id} className="show-card">
                <div className="poster-container">
                  {show.image ? (
                    <img src={show.image} alt={show.titre} />
                  ) : (
                    <div className="no-poster">Pas d'image</div>
                  )}
                </div>
                <div className="show-info">
                  <h3>{show.titre}</h3>
                  <p className="show-year">{show.annee || 'Année inconnue'}</p>
                  <button onClick={() => addToWatchlist(show)} className="btn-add">
                    + Watchlist
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section Watchlist */}
        <section className="watchlist-section">
          <h2>Ma Watchlist ({watchlist.length})</h2>
          {watchlist.length === 0 ? (
            <div className="empty-state">
              <p>Aucune série dans la watchlist de <strong>{currentUser}</strong>.</p>
              <small>Faites une recherche pour en ajouter !</small>
            </div>
          ) : (
            <ul className="watchlist-list">
              {watchlist.map((item, index) => (
                <li key={index} className="watchlist-item">
                  <span className="item-title">{item.title}</span>
                  <span className="badge-tag">À voir</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}