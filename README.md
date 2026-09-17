# binggge

Petite application de suivi de séries développée dans le cadre du cours d'Automatisation de la chaîne de production. Elle permet de rechercher des séries, de les ajouter à sa liste personnelle et à terme de suivre l'avancement des épisodes vus.

Le projet est composé d'une API en Node.js (Express), d'une base de données PostgreSQL sous Docker, et accueillera une interface web en React.

---

## Démarrage rapide

Pour faire tourner le projet en local :

1. Lancer la base de données :
```bash
docker compose up -d
```

2. Installer les dépendances et démarrer l'API :
```bash
npm install
npm start
```

L'API est accessible sur `http://localhost:3000`.

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
Le but de ces premières séances est de mettre en place la chaîne de production, la conteneurisation et les tests automatisés, sans s'encombrer de la complexité d'un vrai système d'authentification (mots de passe hachés, JWT ou sessions).

L'en-tête `X-User` suffit pour identifier l'utilisateur qui effectue la requête et permet à l'API de refuser l'accès avec un code `401 Unauthorized` lorsque l'en-tête est manquant. Cela permet d'écrire et de valider des tests sur les cas de refus d'accès.

---

## Routes de l'API

| Méthode | Route | En-tête requis | Description |
|---|---|---|---|
| `GET` | `/health` | Aucun | Vérifie que l'API est en ligne (renvoie `{"status":"ok"}`). Utilisé pour les sondes de santé et le déploiement. |
| `GET` | `/shows?q=<recherche>` | Aucun | Recherche des séries via l'API publique TVMaze. Renvoie une liste allégée (`id`, `titre`, `annee`, `image`). |
| `POST` | `/register` | Aucun | Crée un nouvel utilisateur en base avec `{ "login": "nom" }`. |
| `GET` | `/watchlist` | `X-User: <login>` | Renvoie la liste des séries de l'utilisateur (renvoie 401 si en-tête absent). |
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

Pour exécuter la suite de tests :
```bash
npm test
```

### Cas testés :
1. `/health` répond un statut 200.
2. L'inscription via `/register` crée bien l'utilisateur.
3. L'ajout d'une série via `/watchlist` avec l'en-tête `X-User` fonctionne (201).
4. L'accès à `/watchlist` sans en-tête renvoie une erreur 401.
5. L'ajout d'une série avec un titre vide est rejeté avec une erreur 400.

### Défi test rouge / vert
Conformément à la consigne, le refus d'un titre vide a d'abord été validé par un test rouge (`TEST_WATCHLIST_NOK.png`), puis corrigé dans l'API pour passer au vert (`TEST_WATCHLIST_OK.png`). Les deux captures sont disponibles à la racine du dépôt.

---

## Ce qui n'existe pas encore

- **Interface utilisateur** : l'application frontend en React (`web/`) sera ajoutée dans les séances suivantes.
- **Persistance complète de la watchlist** : la liaison directe en base entre l'utilisateur et les séries ajoutées dans `/watchlist` est simulée et sera finalisée avec les tables SQL.
- **Gestion des épisodes** : le suivi individuel des épisodes vus / non vus.
- **Pipeline CI/CD** : automatisation de l'exécution des tests et du déploiement via GitLab CI (prévu en séance 3).

