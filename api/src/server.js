// API de gestion de séries - Projet binggge
const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();

//Évite le problème dedépendances au niveau du pipeline
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-User");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.json());

const PORT = process.env.PORT || 3000;

// Connexion PostgreSQL (Docker Compose, CI/CD ou local)
const db = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:binggge@localhost:5432/binggge",
});

// Middleware : vérification de l'en-tête X-User
const verifierUtilisateur = (req, res, next) => {
  const utilisateur = req.get("X-User");
  if (utilisateur && utilisateur.trim() !== "") {
    next();
  } else {
    res.status(401).json({ erreur: "non authentifié" });
  }
};

// GET /health : sonde de santé
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// GET /shows?q= : recherche TVMaze
app.get("/shows", async (req, res) => {
  const recherche = req.query.q;
  if (!recherche) return res.json([]);

  try {
    const reponse = await fetch(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(recherche)}`);
    const donneesBrutes = await reponse.json();
    const seriesFiltrees = donneesBrutes.map((element) => ({
      id: element.show.id,
      titre: element.show.name,
      annee: element.show.premiered ? element.show.premiered.substring(0, 4) : null,
      image: element.show.image ? element.show.image.medium : null,
    }));
    res.json(seriesFiltrees);
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la récupération des séries" });
  }
});

// POST /register : inscription d'un utilisateur
app.post("/register", async (req, res) => {
  const { login } = req.body;
  if (!login || login.trim() === "") {
    return res.status(400).json({ erreur: "Le login est obligatoire" });
  }

  try {
    await db.query("INSERT INTO users (login) VALUES(\$1)", [login.trim()]);
    res.status(201).json({ message: "Utilisateur créé" });
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de l'inscription ou utilisateur existant" });
  }
});

// GET /watchlist : liste les séries de l'utilisateur en base
app.get("/watchlist", verifierUtilisateur, async (req, res) => {
  const login = req.get("X-User");

  try {
    const { rows } = await db.query(
      `SELECT w.id, w.show_id, w.title, w.seen 
       FROM watchlist w
       JOIN users u ON w.user_id = u.id
       WHERE u.login = $1
       ORDER BY w.id DESC`,
      [login]
    );
    res.json(rows);
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la récupération de la watchlist" });
  }
});

// POST /watchlist : enregistre une série en base
app.post("/watchlist", verifierUtilisateur, async (req, res) => {
  const { show_id, title } = req.body;
  const login = req.get("X-User");

  if (!title || title.trim() === "") {
    return res.status(400).json({ erreur: "Le titre est obligatoire" });
  }

  try {
    // Récupération de l'ID utilisateur (création automatique s'il n'existe pas encore)
    let userResult = await db.query("SELECT id FROM users WHERE login = \$1", [login]);
    let userId;

    if (userResult.rows.length === 0) {
      const newUser = await db.query(
        "INSERT INTO users (login) VALUES (\$1) ON CONFLICT (login) DO UPDATE SET login = EXCLUDED.login RETURNING id",
        [login]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    const insertResult = await db.query(
      "INSERT INTO watchlist (user_id, show_id, title, seen) VALUES (\$1, \$2, \$3, false) RETURNING id, show_id, title, seen",
      [userId, show_id || 0, title.trim()]
    );

    res.status(201).json({
      message: "Série ajoutée à la watchlist",
      serie: insertResult.rows[0],
    });
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de l'enregistrement en base" });
  }
});

// PATCH /watchlist/:id : coche / décoche une série vue
app.patch("/watchlist/:id", verifierUtilisateur, async (req, res) => {
  const { id } = req.params;
  const login = req.get("X-User");

  try {
    const { rows } = await db.query(
      `UPDATE watchlist w
       SET seen = NOT w.seen
       FROM users u
       WHERE w.user_id = u.id AND w.id = $1 AND u.login = $2
       RETURNING w.id, w.show_id, w.title, w.seen`,
      [id, login]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erreur: "Série introuvable" });
    }

    res.json(rows[0]);
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la mise à jour" });
  }
});

// DELETE /watchlist/:id : supprime une série de la watchlist
app.delete("/watchlist/:id", verifierUtilisateur, async (req, res) => {
  const { id } = req.params;
  const login = req.get("X-User");

  try {
    await db.query(
      `DELETE FROM watchlist w
       USING users u
       WHERE w.user_id = u.id AND w.id = $1 AND u.login = $2`,
      [id, login]
    );
    res.json({ message: "Série retirée" });
  } catch (erreur) {
    res.status(500).json({ erreur: "Erreur lors de la suppression" });
  }
});

// Servir le front React compilé
app.use(express.static(path.join(__dirname, "../public")));
app.use("/LucasCesar7", express.static(path.join(__dirname, "../public")));

app.get(["/", "/LucasCesar7"], (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`API binggge démarrée sur le port ${PORT}`));
}

module.exports = app;