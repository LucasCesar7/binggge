import { useState, useEffect } from "react";

export default function App() {
  // Détection de l'URL selon l'environnement
  const getApiUrl = () => {
    if (typeof window === "undefined") return "http://localhost:3000";
    // 1. En prod sur le serveur de l'IUT
    if (window.location.hostname.includes("iut.cafeclaudie.fr")) {
      return "/LucasCesar7";
    }
    // 2. En dev avec Vite sur le port 5173
    if (window.location.port === "5173") {
      return "http://localhost:3000";
    }
    // 3. Servi directement par Express sur localhost:3000
    return "";
  };

  const [apiUrl, setApiUrl] = useState(getApiUrl());
  const [currentUser, setCurrentUser] = useState("lucas");
  const [userInput, setUserInput] = useState("");

  // Recherche
  const [query, setQuery] = useState("");
  const [shows, setShows] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Watchlist
  const [watchlist, setWatchlist] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    chargerWatchlist();
  }, [currentUser, apiUrl]);

  const notifier = (texte, erreur = false) => {
    setNotification({ texte, erreur });
    setTimeout(() => setNotification(null), 3000);
  };

  // GET /watchlist
  const chargerWatchlist = async () => {
    try {
      const res = await fetch(`${apiUrl}/watchlist`, {
        headers: { "X-User": currentUser },
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlist(data);
      }
    } catch {
      console.warn("Impossible de joindre l'API pour charger la watchlist.");
    }
  };

  // POST /register
  const handleRegister = async (e) => {
    e.preventDefault();
    const login = userInput.trim();
    if (!login) return;

    try {
      await fetch(`${apiUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login }),
      });
      setCurrentUser(login);
      setUserInput("");
      notifier(`Utilisateur actif : ${login}`);
    } catch {
      notifier("Erreur lors de la connexion/inscription", true);
    }
  };

  // GET /shows?q=
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoadingSearch(true);
    try {
      const res = await fetch(`${apiUrl}/shows?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setShows(data);
    } catch {
      notifier("Erreur lors de la recherche", true);
    } finally {
      setLoadingSearch(false);
    }
  };

  // POST /watchlist
  const ajouterSerie = async (show) => {
    try {
      const res = await fetch(`${apiUrl}/watchlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User": currentUser,
        },
        body: JSON.stringify({
          show_id: show.id,
          title: show.titre,
        }),
      });

      if (res.ok) {
        notifier(`"${show.titre}" ajouté !`);
        chargerWatchlist();
      } else {
        const err = await res.json();
        notifier(err.erreur || "Erreur d'ajout", true);
      }
    } catch {
      notifier("API injoignable", true);
    }
  };

  // PATCH /watchlist/:id
  const toggleVue = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/watchlist/${id}`, {
        method: "PATCH",
        headers: { "X-User": currentUser },
      });
      if (res.ok) {
        chargerWatchlist();
      }
    } catch {
      notifier("Impossible de modifier le statut", true);
    }
  };

  // DELETE /watchlist/:id
  const supprimerSerie = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/watchlist/${id}`, {
        method: "DELETE",
        headers: { "X-User": currentUser },
      });
      if (res.ok) {
        setWatchlist(watchlist.filter((item) => item.id !== id));
        notifier("Série retirée de la liste");
      }
    } catch {
      notifier("Erreur de suppression", true);
    }
  };

  return (
    <div className="app-container">
      {/* Barre supérieure */}
      <header className="top-bar">
        <div>
          <h1 className="brand">binggge</h1>
        </div>

        <div className="controls">
          <div className="env-selector">
            <label>Cible API :</label>
            <select value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}>
              <option value="http://localhost:3000">Local (localhost:3000)</option>
              <option value="https://iut.cafeclaudie.fr/LucasCesar7">Serveur IUT (Prod)</option>
            </select>
          </div>

          <div className="user-box">
            <span className="user-label">
              X-User : <strong>{currentUser}</strong>
            </span>
            <form onSubmit={handleRegister} className="user-form">
              <input
                type="text"
                placeholder="Nouveau login..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button type="submit">Changer</button>
            </form>
          </div>
        </div>
      </header>

      {/* Notifications */}
      {notification && (
        <div className={`toast ${notification.erreur ? "error" : "success"}`}>
          {notification.texte}
        </div>
      )}

      {/* Grille principale */}
      <main className="content-grid">
        {/* Colonne Recherche */}
        <section className="panel search-panel">
          <h2>Rechercher des séries</h2>
          <form onSubmit={handleSearch} className="search-bar">
            <input
              type="text"
              placeholder="Titre de série (ex: Severance, Dark)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" disabled={loadingSearch}>
              {loadingSearch ? "Recherche..." : "Chercher"}
            </button>
          </form>

          <div className="results-grid">
            {shows.map((show) => (
              <div key={show.id} className="serie-card">
                <div className="poster-wrap">
                  {show.image ? (
                    <img src={show.image} alt={show.titre} />
                  ) : (
                    <div className="empty-poster">Pas d'image</div>
                  )}
                </div>
                <div className="card-details">
                  <h3>{show.titre}</h3>
                  <span className="year">{show.annee || "N/C"}</span>
                  <button className="btn-add" onClick={() => ajouterSerie(show)}>
                    + Ajouter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Colonne Watchlist */}
        <section className="panel watchlist-panel">
          <h2>
            Watchlist de {currentUser} <span>({watchlist.length})</span>
          </h2>

          {watchlist.length === 0 ? (
            <p className="empty-notice">Aucune série enregistrée pour le moment.</p>
          ) : (
            <ul className="watchlist">
              {watchlist.map((item) => (
                <li key={item.id} className={`watch-item ${item.seen ? "is-seen" : ""}`}>
                  <label className="checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={item.seen}
                      onChange={() => toggleVue(item.id)}
                    />
                    <span className="title">{item.title}</span>
                  </label>
                  <button
                    className="btn-del"
                    title="Supprimer"
                    onClick={() => supprimerSerie(item.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}