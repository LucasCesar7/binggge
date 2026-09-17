// API de gestion de séries - Projet binggge


const express = require("express");
const { Pool } = require("pg"); // Ajout du client PostgreSQL

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Connexion à la base de données
const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "binggge",
  password: "binggge",
  port: 5432,
});

// Middleware : le garde des routes privées
const verifierUtilisateur = (req, res, next) => {
  const utilisateur = req.get('X-User');
  if (utilisateur) {
    next();
  } else {
    res.status(401).json({ erreur: 'non authentifié' });
  }
};

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/shows", async (req, res) => {
  const recherche = req.query.q;
  if (!recherche) return res.json([]);

  try {
    const reponse = await fetch(`https://api.tvmaze.com/search/shows?q=${recherche}`);
    const donneesBrutes = await reponse.json();
    const seriesFiltrees = donneesBrutes.map(element => ({
      id: element.show.id,
      titre: element.show.name,
      annee: element.show.premiered ? element.show.premiered.substring(0, 4) : null,
      image: element.show.image ? element.show.image.medium : null
    }));
    res.json(seriesFiltrees);
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la récupération des séries" });
  }
});

// POST /register : Inscription d'un utilisateur
app.post("/register", async (req, res) => {
  try {
    await db.query('INSERT INTO users (login) VALUES($1)', [req.body.login]);
    res.status(201).json({ message: "Utilisateur créé" });
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de l'inscription ou utilisateur existant" });
  }
});

// POST /watchlist : Ajoute une série (protégée)
app.post("/watchlist", verifierUtilisateur, (req, res) => {
  res.status(201).json({ message: "Série ajoutée (simulation avant base de données)" });
});

// GET /watchlist : Liste les séries (protégée)
app.get("/watchlist", verifierUtilisateur, (req, res) => {
  res.json([]);
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`API binggge démarrée sur le port ${PORT}`));
}
module.exports = app;