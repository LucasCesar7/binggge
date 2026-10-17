# binggge

Petite application de suivi de séries développée dans le cadre du cours d'Automatisation de la chaîne de production (BUT Informatique). Elle permet de rechercher des séries, de les ajouter à sa liste personnelle et à terme de suivre l'avancement des épisodes vus.

Le projet est composé d'une API en Node.js (Express), d'une base de données PostgreSQL conteneurisée, et accueillera une interface web en React.

---

## URL de production

L'API est déployée et accessible en ligne sur le serveur de cours :
* **Healthcheck :** `https://iut.cafeclaudie.fr/LucasCesar7/health`

1. Créer un fichier `.env` à la racine (non versionné) :
```env
DB_PASS=binggge
```

2. Lancer la base de données et l'API avec Docker :
```bash
docker compose up -d --build
```
L'API est alors joignable sur `http://localhost:3000`.

3. Ou lancer l'API directement avec Node en local :
```bash
cd api
npm install
npm run dev
```

L'API est accessible sur `http://localhost:3000`.

### Configuration des ports (Local vs Production)
- **Sur le serveur (Prod)** : aucun port n'est exposé vers l'extérieur dans `docker-compose.yml` ; Traefik et les conteneurs communiquent directement sur le réseau interne Docker.
- **En local** : un fichier non versionné `docker-compose.override.yml` expose les ports `5432:5432` et `3000:3000` pour permettre le développement et les tests hors conteneur :
```yaml
services:
  api:
    ports:
      - "3000:3000"
  db:
    ports:
      - "5432:5432"
```

---

## Base de données & persistance

La base de données PostgreSQL (version 16) tourne dans un conteneur géré par `docker-compose.yml`.

- **Schéma initial** : défini dans `api/db/schema.sql` (tables `users` et `watchlist`). Pour l'appliquer :
```bash
docker compose exec -T db psql -U postgres binggge < api/db/schema.sql
```
- **Persistance** : les données sont stockées dans le volume Docker `pgdata`. Cela garantit que les utilisateurs et les listes ne sont pas perdus lors d'un `docker compose down` suivi d'un `docker compose up`.

---

## Authentification

> **Pas d'authentification réelle, l'en-tête X-User tient lieu d'identité.**

**Pourquoi ce choix ?**  
Le but de ces séances est de mettre en place la chaîne de production, la conteneurisation et les tests automatisés, sans s'encombrer de la complexité d'un vrai système d'authentification (mots de passe hachés, JWT ou sessions).

L'en-tête `X-User` permet simplement de savoir qui appelle l'API et de tester les cas de refus d'accès (`401 Unauthorized`) quand l'en-tête est absent.

---

## Routes de l'API

| Méthode | Route | En-tête requis | Description |
|---|---|---|---|
| `GET` | `/health` | Aucun | Vérifie que l'API est en ligne (renvoie `{"status":"ok"}`). |
| `GET` | `/shows?q=<recherche>` | Aucun | Recherche des séries via l'API TVMaze (`id`, `titre`, `annee`, `image`). |
| `POST` | `/register` | Aucun | Crée un nouvel utilisateur en base avec `{ "login": "nom" }`. |
| `GET` | `/watchlist` | `X-User: <login>` | Renvoie la liste des séries de l'utilisateur depuis PostgreSQL (401 si absent). |
| `POST` | `/watchlist` | `X-User: <login>` | Ajoute une série en base avec `{ "show_id": 1, "title": "Nom" }`. Refuse les titres vides (400). |
| `PATCH` | `/watchlist/:id` | `X-User: <login>` | Bascule l'état vu / non vu (`seen`) d'une série de la watchlist. |
| `DELETE` | `/watchlist/:id` | `X-User: <login>` | Supprime une série de la watchlist de l'utilisateur. |

### Exemples d'appels

```bash
# Vérification de santé
curl http://localhost:3000/health

# Recherche de séries
curl "http://localhost:3000/shows?q=severance"

# Inscription d'un utilisateur
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{"login":"olivia"}'

# Ajout à la watchlist
curl -X POST http://localhost:3000/watchlist \
  -H "Content-Type: application/json" \
  -H "X-User: olivia" \
  -d '{"show_id":44778,"title":"Severance"}'

# Accès refusé (sans en-tête X-User -> 401)
curl http://localhost:3000/watchlist
```

---

## Interface Web (React)

Une interface minimale en React (Vite) est disponible dans le dossier `web/` :
- Recherche de séries via l'API.
- Ajout dans la base de données PostgreSQL.
- Affichage de la watchlist avec case à cocher pour marquer les séries vues (`seen`) et suppression.
- Sélecteur d'environnement permettant de basculer les requêtes entre le serveur local (`http://localhost:3000`) et l'API déployée sur `https://iut.cafeclaudie.fr/LucasCesar7`.

### Lancement du front :
```bash
cd web
npm install
npm run dev
```

Accessible sur : `http://localhost:5173`

---

## Tests automatisés

Les tests sont écrits avec le module natif de Node.js (`node:test`) et `supertest`.

Pour les exécuter :
```bash
cd api
npm test
```

### Cas testés :
1. `GET /health` répond un statut 200.
2. L'inscription via `POST /register` crée bien l'utilisateur en base.
3. L'ajout d'une série via `POST /watchlist` avec l'en-tête `X-User` fonctionne (201).
4. L'accès à `GET /watchlist` sans en-tête renvoie une erreur 401.
5. L'ajout d'une série avec un titre vide est rejeté avec une erreur 400.

Les captures du test rouge/vert du TP2 (`TEST_WATCHLIST_NOK.png` et `TEST_WATCHLIST_OK.png`) sont présentes à la racine.

---

## Pipeline CI/CD

Le pipeline GitHub Actions (`.github/workflows/pipeline.yml`) s'exécute automatiquement sur chaque Pull Request et lors d'un push sur `main` :
1. **test** : lance un service PostgreSQL de test, applique `api/db/schema.sql`, installe les dépendances (`npm ci`) et exécute `npm test`.
2. **build** : vérifie la construction de l'image Docker de l'API avec le tag du commit.
3. **deploy** : uniquement sur `main`, se connecte en SSH au serveur `iut.cafeclaudie.fr`, met à jour le dépôt (`git pull`) et relance les conteneurs via `sudo binggge up -d --build`.

La branche `main` est protégée : aucun push direct n'est autorisé et le pipeline doit être vert pour pouvoir merger une Pull Request.

---

## Définition de « Fini »

Un ticket est considéré comme terminé uniquement si :
1. Le pipeline est vert.
2. L'URL répond depuis une autre machine que la mienne.
3. Le README dit comment la joindre.
4. Le ticket est fermé par une Pull Request.
