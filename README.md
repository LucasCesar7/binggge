# binggge

Petite application de suivi de séries développée dans le cadre du cours d'Automatisation de la chaîne de production (BUT Informatique). Elle permet de rechercher des séries, de les ajouter à sa liste personnelle et à terme de suivre l'avancement des épisodes vus.

Le projet est composé d'une API en Node.js (Express), d'une base de données PostgreSQL conteneurisée, et accueillera une interface web en React.

---

## URL de production

L'API est déployée et accessible en ligne sur le serveur de cours :
* **Healthcheck :** `https://iut.cafeclaudie.fr/LucasCesar7/health`

---

## Démarrage rapide en local

### Avec Docker Compose (API + Base)
1. Créer un fichier `.env` à la racine (non versionné) avec le mot de passe de la base :
```env
DB_PASS=votre_mot_de_passe
```

2. Construire et lancer les conteneurs :
```bash
docker compose up -d --build
```
L'API est alors joignable sur `http://localhost:3000`.

### En mode dev local (Node hors conteneur)
Si vous voulez lancer l'API directement avec Node pour le dev :
```bash
docker compose up -d db
cd api
npm install
npm run dev
```

---

## Base de données & persistance

La base de données PostgreSQL (version 16) tourne dans un conteneur géré par `docker-compose.yml`.

- **Schéma initial** : défini dans `api/db/schema.sql` (tables `users` et `watchlist`). Pour l'appliquer :
  ```bash
  docker compose exec -T db psql -U postgres binggge < api/db/schema.sql
  ```
- **Persistance** : assurée par le volume nommé `pgdata`. Les utilisateurs et listes sont conservés même après un `docker compose down` suivi d'un `up`.
- **Sécurité** : le mot de passe n'est plus codé en dur, il est injecté via la variable `${DB_PASS}` depuis le fichier `.env`.

---

## Authentification

> **Pas d'authentification réelle, l'en-tête X-User tient lieu d'identité.**

**Pourquoi ce choix ?**  
Le but de ces séances est de mettre en place l'infrastructure, l'orchestration Docker, les tests et le pipeline CI/CD sans s'encombrer d'un système complet de sessions ou de tokens JWT.

L'en-tête `X-User` permet simplement de savoir qui appelle l'API et de tester les cas de refus d'accès (`401 Unauthorized`) quand l'en-tête est absent.

---

## Routes de l'API

| Méthode | Route | En-tête requis | Description |
|---|---|---|---|
| `GET` | `/health` | Aucun | Vérifie que l'API est en ligne (renvoie `{"status":"ok"}`). Utilisé pour les sondes de santé et le déploiement. |
| `GET` | `/shows?q=<recherche>` | Aucun | Recherche des séries via l'API TVMaze. Renvoie une liste allégée (`id`, `titre`, `annee`, `image`). |
| `POST` | `/register` | Aucun | Crée un nouvel utilisateur en base avec `{ "login": "nom" }`. |
| `GET` | `/watchlist` | `X-User: <login>` | Renvoie la liste des séries de l'utilisateur (renvoie 401 si absent). |
| `POST` | `/watchlist` | `X-User: <login>` | Ajoute une série avec `{ "show_id": 1, "title": "Nom" }`. Refuse les titres vides (400) et les requêtes sans utilisateur (401). |

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

Le fichier `.github/workflows/pipeline.yml` gère l'automatisation à chaque Pull Request et lors d'un merge sur `main` :

1. **test** : Démarre un conteneur PostgreSQL de service, applique `api/db/schema.sql`, installe les dépendances avec `npm ci` et lance `npm test`.
2. **build** : Construit l'image Docker de l'API avec un tag basé sur le SHA court du commit (`binggge-api:<sha>`).
3. **deploy** : S'exécute uniquement après fusion sur `main`. Se connecte par SSH au serveur `iut.cafeclaudie.fr` avec les secrets du dépôt (`SSH_DEPLOY_KEY` et `LOGIN`), récupère le code (`git pull`) et redémarre les services avec `sudo binggge up -d --build`.

La branche `main` est protégée : aucun push direct n'est autorisé et une Pull Request ne peut pas être mergée si le job de test échoue.

---

## Définition de « Fini »

Une tâche ou un ticket est considéré comme terminé uniquement si :
1. Le pipeline CI/CD est vert.
2. L'URL répond depuis une autre machine que la mienne.
3. Le README indique comment la joindre.
4. Le ticket est fermé automatiquement par le merge de sa Pull Request.

---

## Reste à faire (Séance 4)

- **Interface utilisateur** : intégration du frontend React dans le dossier `web/`.
- **Persistance complète de la watchlist** : brancher les requêtes SQL réelles sur la table `watchlist` (actuellement simulée).
- **Gestion des épisodes** : suivi des épisodes vus / non vus (`seen`).