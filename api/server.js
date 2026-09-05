// API de gestion de taches - support de cours Git & deploiement
const express = require("express");

const app = express();
app.use(express.json());

// Le port est configurable via l'environnement (utile en Docker / CI)
const PORT = process.env.PORT || 3000;

// Base de donnees en memoire : un simple tableau, remis a zero a chaque redemarrage
let todos = [];
let prochainId = 1;

// Verification de sante, utilisee par le pipeline et par Docker
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/shows", async (req, res) => {
  const query = req.query.q;
  
  if (!query) {
    return res.json([]);
  }

  try {
    const response = await fetch(`https://api.tvmaze.com/search/shows?q=${query}`);
    const data = await response.json();

    // Filtrage : id, titre, année, image
    const filteredShows = data.map(item => {
      const show = item.show;
      return {
        id: show.id,
        title: show.name,
        year: show.premiered ? show.premiered.substring(0, 4) : null,
        image: show.image ? show.image.medium : null
      };
    });

    res.json(filteredShows);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des séries" });
  }
});

app.get("/watchlist", (req, res) => {
  res.json([]);
});

// Demarrage du serveur (ignore quand le fichier est importe par les tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`api-todo demarre sur le port ${PORT}`);
  });
}

module.exports = app;
