// API de gestion de séries - Projet binggge
const express = require("express");

const app = express();
app.use(express.json());

// Le port est configurable via l'environnement (utile en Docker / CI)
const PORT = process.env.PORT || 3000;

// Verification de sante, utilisee par le pipeline et par Docker
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Route de recherche de séries qui appelle l'API TVMaze
app.get("/shows", async (req, res) => {
  const recherche = req.query.q;
  
  // Si aucune recherche n'est fournie dans l'URL, on renvoie un tableau vide
  if (!recherche) {
    return res.json([]);
  }

  try {
    const reponse = await fetch(`https://api.tvmaze.com/search/shows?q=${recherche}`);
    const donneesBrutes = await reponse.json();

    // Filtrage
    const seriesFiltrees = donneesBrutes.map(element => {
      const serie = element.show;
      return {
        id: serie.id,
        titre: serie.name,
        annee: serie.premiered ? serie.premiered.substring(0, 4) : null,
        image: serie.image ? serie.image.medium : null
      };
    });

    //Renvoi de la liste au front end
    res.json(seriesFiltrees);
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la communication avec l'API TVMaze" });
  }
});

// Route de la watchlist (renvoie un tableau vide)
app.get("/watchlist", (req, res) => {
  res.json([]);
});

// Démarrage du serveur (ignoré quand le fichier est importé par les tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`API binggge démarrée sur le port ${PORT}`);
  });
}

module.exports = app;