# Guide de Déploiement Docker - Axis Manager

Ce guide vous accompagne pas-à-pas pour déployer Axis Manager en utilisant Docker. Que vous soyez débutant ou expérimenté, suivez simplement les instructions ci-dessous.

## Table des Matières

- [Qu'est-ce que Docker ?](#quest-ce-que-docker-)
- [Prérequis](#prérequis)
- [Architecture du Projet](#architecture-du-projet)
- [Configuration Initiale](#configuration-initiale)
- [Déploiement Local (Développement)](#déploiement-local-développement)
- [Déploiement Production avec Portainer](#déploiement-production-avec-portainer)
- [CI/CD Automatique avec GitHub Actions](#cicd-automatique-avec-github-actions)
- [Commandes Utiles](#commandes-utiles)
- [Troubleshooting](#troubleshooting)
- [Variables d'Environnement](#variables-denvironnement)

---

## Qu'est-ce que Docker ?

**Docker** est une technologie qui permet de "conteneuriser" des applications. Cela signifie :
- **Portabilité** : Votre application fonctionne de la même manière partout (Windows, Mac, Linux, serveur)
- **Isolation** : Chaque application tourne dans son propre environnement, sans conflits
- **Facilité** : Plus besoin d'installer Python, Node.js, etc. Tout est dans le conteneur !

**Docker Compose** est un outil intégré à Docker (depuis la V2) pour gérer plusieurs conteneurs ensemble (ici : application + base de données).

**Portainer** est une interface graphique web pour gérer vos conteneurs Docker facilement.

---

## Prérequis

### Pour déployer localement (développement/test)

1. **Docker** installé sur votre machine
   - Windows/Mac : [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Linux : [Docker Engine](https://docs.docker.com/engine/install/)

2. **Docker Compose V2** (intégré à Docker depuis 2021)
   ```bash
   docker compose version
   ```

   **Note importante** : Ce projet utilise la commande moderne `docker compose` (V2, intégrée à Docker CLI) et non l'ancienne commande standalone `docker-compose` (V1). Si vous avez encore l'ancienne version, mettez à jour Docker ou utilisez `docker compose` au lieu de `docker-compose`.

3. **Un éditeur de texte** (VS Code, Sublime Text, Notepad++, etc.)

### Pour déployer en production (avec Portainer)

1. **Un serveur** (Linux de préférence)
   - Ubuntu 20.04+ recommandé
   - Au minimum 2 Go de RAM

2. **Docker** installé sur le serveur

3. **Portainer** installé sur le serveur
   ```bash
   docker run -d -p 9000:9000 --name=portainer --restart=always \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v portainer_data:/data \
     portainer/portainer-ce:latest
   ```
   Accédez ensuite à Portainer via : `http://ip-du-serveur:9000`

4. **Un compte Docker Hub** (gratuit)
   - Créez un compte sur [Docker Hub](https://hub.docker.com/)

---

## Architecture du Projet

Le projet utilise une **architecture monolithique conteneurisée** :

```
┌─────────────────────────────────────┐
│   Conteneur : axis-manager-app      │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Nginx (port 80)              │ │  ← Serveur web
│  │  - Sert le frontend React     │ │
│  │  - Proxy les /api vers backend│ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Uvicorn (port 8001)          │ │  ← Backend FastAPI
│  │  - API REST                   │ │
│  │  - Logique métier             │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
              ↓ Connexion réseau
┌─────────────────────────────────────┐
│   Conteneur : mongodb               │
│   - Base de données MongoDB         │
│   - Port 27017                      │
└─────────────────────────────────────┘
```

**Fichiers importants :**
- `Dockerfile` : Instructions pour construire l'image de l'application
- `compose.yaml` : Configuration production (utilise l'image depuis Docker Hub)
- `compose.dev.yaml` : Configuration développement (hot-reload)
- `nginx.conf` : Configuration du serveur web Nginx
- `.env` : Variables d'environnement (à créer depuis `.env.example`)

---

## Configuration Initiale

### 1. Créer le fichier de configuration `.env`

Le fichier `.env` contient toutes les informations sensibles (mots de passe, URLs, etc.).

```bash
# Dans le dossier du projet
cp .env.example .env
```

### 2. Éditer le fichier `.env`

Ouvrez le fichier `.env` avec votre éditeur de texte et remplissez les valeurs :

```env
# Configuration MongoDB (laissez par défaut pour Docker Compose)
MONGO_URL=mongodb://mongodb:27017
DB_NAME=axis_audio_dashboard

# Configuration Axis Audio Manager Pro (⚠️ À REMPLIR)
AXIS_API_BASE_URL=https://192.168.1.100  # Remplacez par l'IP de votre Axis Manager
AXIS_API_USERNAME=admin                  # Votre nom d'utilisateur Axis
AXIS_API_PASSWORD=votre_mot_de_passe     # Votre mot de passe Axis
AXIS_API_TIMEOUT=30

# Soundtrackyourbrand (optionnel)
STYB_CLIENT_ID=
STYB_CLIENT_SECRET=
```

**⚠️ Important :** Ne committez JAMAIS ce fichier `.env` sur Git ! Il contient des secrets.

**⚠️ Sécurité :** Si vous avez cloné ce projet depuis un repository qui contient des fichiers `.env` commités (erreur de sécurité), changez immédiatement tous les mots de passe exposés !

---

## Déploiement Local (Développement)

Le mode développement permet de modifier le code et voir les changements **immédiatement** sans rebuild.

### 1. Lancer l'environnement de développement

```bash
# Dans le dossier du projet
docker compose -f compose.dev.yaml up
```

**Ce que fait cette commande :**
- Télécharge les images nécessaires (Node.js, Python, MongoDB)
- Lance 3 conteneurs :
  - `frontend` : Serveur dev React sur port **3000**
  - `backend` : Serveur dev FastAPI sur port **8001**
  - `mongodb-dev` : Base de données sur port **27017**
- Monte vos dossiers locaux dans les conteneurs (hot-reload activé)

### 2. Accéder à l'application

- **Frontend React** : [http://localhost:3000](http://localhost:3000)
- **Backend API** : [http://localhost:8001/api/health](http://localhost:8001/api/health)
- **MongoDB** : `mongodb://localhost:27017` (pour MongoDB Compass)

### 3. Voir les logs en temps réel

```bash
# Tous les logs
docker compose -f compose.dev.yaml logs -f

# Logs du frontend uniquement
docker compose -f compose.dev.yaml logs -f frontend

# Logs du backend uniquement
docker compose -f compose.dev.yaml logs -f backend
```

### 4. Arrêter l'environnement

```bash
# Arrêter les conteneurs (mais garder les données)
docker compose -f compose.dev.yaml down

# Arrêter ET supprimer les données
docker compose -f compose.dev.yaml down -v
```

---

## Déploiement Production avec Portainer

Le déploiement production utilise l'image Docker pré-construite depuis Docker Hub.

### Méthode 1 : Utiliser l'image depuis Docker Hub (Recommandé)

Cette méthode est la plus simple : l'image est déjà construite et disponible sur Docker Hub grâce au CI/CD GitHub Actions.

#### Étape 1 : Se connecter à Portainer

1. Ouvrez votre navigateur : `http://ip-du-serveur:9000`
2. Connectez-vous avec vos identifiants Portainer

#### Étape 2 : Créer un nouveau Stack

1. Dans Portainer, allez dans **Stacks** (menu de gauche)
2. Cliquez sur **+ Add stack**
3. Donnez un nom : `axis-manager`

#### Étape 3 : Coller la configuration

Dans l'éditeur "Web editor", collez le contenu de `compose.yaml` :

```yaml
services:
  app:
    container_name: axis-manager-app
    image: jlebervet/axis-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
    environment:
      MONGO_URL: mongodb://mongodb:27017
      DB_NAME: axis_audio_dashboard
      AXIS_API_BASE_URL: ${AXIS_API_BASE_URL}
      AXIS_API_USERNAME: ${AXIS_API_USERNAME}
      AXIS_API_PASSWORD: ${AXIS_API_PASSWORD}
      AXIS_API_TIMEOUT: ${AXIS_API_TIMEOUT:-30}
      STYB_CLIENT_ID: ${STYB_CLIENT_ID:-}
      STYB_CLIENT_SECRET: ${STYB_CLIENT_SECRET:-}
    depends_on:
      - mongodb
    networks:
      - axis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    container_name: axis-manager-mongodb
    image: mongo:7
    restart: unless-stopped
    environment:
      MONGO_INITDB_DATABASE: axis_audio_dashboard
    volumes:
      - mongodb_data:/data/db
    networks:
      - axis-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

volumes:
  mongodb_data:
    driver: local

networks:
  axis-network:
    driver: bridge
```

#### Étape 4 : Configurer les variables d'environnement

Scrollez vers le bas jusqu'à la section **Environment variables**.

Cliquez sur **+ Add environment variable** et ajoutez :

| Nom | Valeur | Exemple |
|-----|--------|---------|
| `AXIS_API_BASE_URL` | URL complète de votre Axis Manager (HTTPS + port) | `https://192.168.1.100:443` |
| `AXIS_API_USERNAME` | Nom d'utilisateur Axis | `Dashboard` |
| `AXIS_API_PASSWORD` | Mot de passe Axis | `votre_mot_de_passe` |
| `AXIS_API_TIMEOUT` | Timeout en secondes (optionnel) | `30` |
| `STYB_CLIENT_ID` | (Optionnel) Client ID STYB | _(vide si non utilisé)_ |
| `STYB_CLIENT_SECRET` | (Optionnel) Secret STYB | _(vide si non utilisé)_ |

**Variables préconfigurées (pas besoin de les définir)** :
- `MONGO_URL` : Configurée automatiquement pour utiliser le service MongoDB interne (`mongodb://mongodb:27017`)
- `DB_NAME` : Base de données par défaut (`axis_audio_dashboard`)

**Note importante :** Le frontend utilise maintenant des URLs relatives (`/api`), donc il n'y a plus besoin de configurer `REACT_APP_BACKEND_URL`. Nginx s'occupe automatiquement du proxy.

#### Étape 5 : Déployer le stack

1. Cliquez sur **Deploy the stack** en bas de page
2. Attendez quelques secondes/minutes (téléchargement des images)
3. Vérifiez que les 2 conteneurs sont en **running** (icône verte)

#### Étape 6 : Vérifier le déploiement

1. Dans Portainer, vérifiez que les conteneurs sont **healthy** (icône verte)
   - Si le status est "starting", patientez 30-40 secondes

2. Vérifiez les logs en cas de problème :
   - Cliquez sur le conteneur → **Logs**

3. Ouvrez votre navigateur : `http://ip-du-serveur`

✅ Votre application Axis Manager est maintenant en ligne !

**Troubleshooting Healthcheck :**
Si le container reste "unhealthy" :
- Vérifiez que toutes les variables d'environnement sont bien configurées
- Vérifiez que MongoDB a démarré (peut prendre 20-30 secondes)
- Test manuel : `docker exec axis-manager-app curl http://localhost/api/health`
- Consultez la section Troubleshooting ci-dessous pour plus de détails

---

### Méthode 2 : Builder l'image localement sur le serveur

Si vous ne voulez pas utiliser Docker Hub (ou pour tester des modifications), vous pouvez builder l'image directement sur le serveur.

#### Étape 1 : Transférer le code sur le serveur

```bash
# Depuis votre machine locale
scp -r /chemin/vers/axis-manager user@ip-du-serveur:/home/user/
```

Ou cloner depuis Git :

```bash
# Sur le serveur
git clone https://github.com/votre-compte/axis-manager.git
cd axis-manager
```

#### Étape 2 : Créer le fichier `.env`

```bash
cp .env.example .env
nano .env  # Éditez avec vos vraies valeurs
```

#### Étape 3 : Builder et lancer

```bash
# Builder l'image localement
docker compose build

# Lancer les services
docker compose up -d
```

#### Étape 4 : Vérifier le déploiement

```bash
# Vérifier que les conteneurs tournent
docker compose ps

# Voir les logs
docker compose logs -f
```

---

## CI/CD Automatique avec GitHub Actions

Le projet est configuré pour **construire et publier automatiquement** une nouvelle image Docker à chaque commit sur la branche `main`.

### Comment ça fonctionne ?

1. Vous faites des modifications dans le code
2. Vous committez et pushez sur GitHub (branche `main`)
3. **GitHub Actions** détecte le push et lance automatiquement :
   - Build de l'image Docker multi-architecture (amd64 + arm64)
   - Push de l'image vers Docker Hub : `jlebervet/axis-manager:latest`
4. Dans Portainer, vous pouvez **Re-pull & redeploy** pour mettre à jour

### Configuration requise (une seule fois)

#### 1. Créer un Access Token Docker Hub

1. Connectez-vous sur [Docker Hub](https://hub.docker.com/)
2. Allez dans **Account Settings** → **Security** → **New Access Token**
3. Nom du token : `github-actions`
4. Permissions : **Read, Write, Delete**
5. Copiez le token (vous ne le verrez qu'une fois !)

#### 2. Ajouter les secrets dans GitHub

1. Allez sur votre repository GitHub
2. **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **New repository secret**
4. Ajoutez deux secrets :

   - **Nom** : `DOCKERHUB_USERNAME`
     - **Valeur** : `jlebervet` (votre nom d'utilisateur Docker Hub)

   - **Nom** : `DOCKERHUB_TOKEN`
     - **Valeur** : Le token copié à l'étape 1

#### 3. Vérifier le workflow

Le fichier `.github/workflows/dockerhub.yml` est déjà configuré. Chaque push sur `main` déclenchera automatiquement le build.

### Mettre à jour l'application en production

#### Dans Portainer :

1. Allez dans **Stacks** → Sélectionnez `axis-manager`
2. Cliquez sur **Editor**
3. En bas, cliquez sur **Pull and redeploy**
4. Patientez pendant le téléchargement de la nouvelle image
5. ✅ Votre application est mise à jour !

#### En ligne de commande :

```bash
# Pull la nouvelle image
docker pull jlebervet/axis-manager:latest

# Redémarrer le stack
docker compose pull
docker compose up -d
```

---

## Commandes Utiles

### Gestion des conteneurs

```bash
# Voir les conteneurs en cours d'exécution
docker ps

# Voir tous les conteneurs (même arrêtés)
docker ps -a

# Arrêter un conteneur
docker stop axis-manager-app

# Démarrer un conteneur
docker start axis-manager-app

# Redémarrer un conteneur
docker restart axis-manager-app

# Supprimer un conteneur (doit être arrêté avant)
docker rm axis-manager-app
```

### Logs et débogage

```bash
# Voir les logs d'un conteneur
docker logs axis-manager-app

# Suivre les logs en temps réel
docker logs -f axis-manager-app

# Voir les 100 dernières lignes
docker logs --tail 100 axis-manager-app

# Entrer dans un conteneur en cours d'exécution (pour déboguer)
docker exec -it axis-manager-app /bin/sh
```

### Gestion des images

```bash
# Lister les images
docker images

# Supprimer une image
docker rmi jlebervet/axis-manager:latest

# Supprimer les images non utilisées (nettoyer)
docker image prune -a

# Télécharger une image depuis Docker Hub
docker pull jlebervet/axis-manager:latest
```

### Docker Compose

```bash
# Démarrer les services (mode détaché)
docker compose up -d

# Démarrer les services (mode interactif, voir les logs)
docker compose up

# Arrêter les services
docker compose down

# Arrêter ET supprimer les volumes (⚠️ perte de données !)
docker compose down -v

# Reconstruire les images
docker compose build

# Reconstruire SANS cache
docker compose build --no-cache

# Voir les logs de tous les services
docker compose logs -f

# Redémarrer un service spécifique
docker compose restart app
```

### Vérification de la santé

```bash
# Vérifier la santé de l'API backend
curl http://localhost/api/health

# Vérifier que MongoDB répond
docker exec axis-manager-mongodb mongosh --eval "db.adminCommand('ping')"

# Voir l'utilisation des ressources
docker stats
```

---

## Troubleshooting

### Problème : Les conteneurs ne démarrent pas

**Solution :**

1. Vérifiez les logs pour identifier l'erreur :
   ```bash
   docker compose logs
   ```

2. Vérifiez que les ports ne sont pas déjà utilisés :
   ```bash
   # Sur Linux/Mac
   lsof -i :80
   lsof -i :8001
   lsof -i :27017

   # Sur Windows (PowerShell)
   netstat -ano | findstr :80
   ```

3. Vérifiez que le fichier `.env` est bien configuré et présent

---

### Problème : L'application ne se connecte pas à l'API Axis

**Symptômes :**
- Erreur "Connection refused" dans les logs
- Les speakers ne s'affichent pas

**Solutions :**

1. Vérifiez l'URL de l'API Axis dans `.env` :
   ```env
   AXIS_API_BASE_URL=https://192.168.1.100  # ← Vérifiez l'IP
   ```

2. Testez la connexion depuis le serveur :
   ```bash
   curl -k https://192.168.1.100/api/speakers \
     -u "admin:mot_de_passe"
   ```

3. Vérifiez que le firewall autorise les connexions HTTPS (port 443)

4. Augmentez le timeout si le serveur Axis est lent :
   ```env
   AXIS_API_TIMEOUT=60
   ```

---

### Problème : MongoDB ne démarre pas

**Symptômes :**
- Erreur "MongoServerError" dans les logs
- Le conteneur `mongodb` redémarre en boucle

**Solutions :**

1. Vérifiez l'espace disque disponible :
   ```bash
   df -h
   ```

2. Supprimez et recréez le volume MongoDB :
   ```bash
   docker compose down -v
   docker compose up -d
   ```
   ⚠️ **Attention** : Cela supprime toutes les données MongoDB !

3. Vérifiez les permissions du volume :
   ```bash
   docker volume inspect axis-manager_mongodb_data
   ```

---

### Problème : Le frontend affiche "Cannot connect to backend"

**Symptômes :**
- Le frontend React s'affiche mais ne récupère pas les données
- Erreur réseau ou CORS dans la console navigateur
- Erreur 404 sur les appels `/api/*`

**Solutions :**

1. Vérifiez que le backend est accessible :
   ```bash
   curl http://localhost/api/health
   ```

2. **Si vous utilisez une ancienne image** : Le problème vient probablement d'un frontend avec URL hardcodée. Solution :
   - Dans Portainer → Stacks → **Pull and redeploy** pour obtenir la dernière image
   - La nouvelle image utilise des URLs relatives via nginx proxy

3. Vérifiez la configuration Nginx :
   ```bash
   docker exec axis-manager-app nginx -t
   ```

4. En mode développement, assurez-vous que le proxy est configuré dans `frontend/package.json` :
   ```json
   "proxy": "http://localhost:8001"
   ```

---

### Problème : L'image Docker est très lente à builder

**Solutions :**

1. Utilisez le cache de build :
   ```bash
   docker compose build
   # Ne pas utiliser --no-cache sauf nécessaire
   ```

2. Vérifiez que `.dockerignore` est présent et configuré

3. Utilisez l'image depuis Docker Hub au lieu de builder localement :
   ```yaml
   # Dans compose.yaml
   image: jlebervet/axis-manager:latest
   # Commentez la section "build:"
   ```

---

### Problème : Erreur "no space left on device"

**Solutions :**

1. Nettoyez les images et conteneurs inutilisés :
   ```bash
   docker system prune -a
   ```

2. Supprimez les volumes non utilisés :
   ```bash
   docker volume prune
   ```

3. Vérifiez l'espace disque :
   ```bash
   df -h
   docker system df
   ```

---

### Problème : GitHub Actions échoue lors du build

**Symptômes :**
- Le workflow GitHub Actions est en erreur
- L'image n'est pas poussée sur Docker Hub

**Solutions :**

1. Vérifiez les secrets GitHub (`DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN`)
   - Settings → Secrets and variables → Actions

2. Vérifiez que le token Docker Hub a les bonnes permissions (Read, Write)

3. Consultez les logs du workflow :
   - GitHub → Actions → Cliquez sur le workflow en échec → Logs détaillés

4. Testez le build localement :
   ```bash
   docker build -t test-image .
   ```

---

## Variables d'Environnement

Voici la liste complète des variables d'environnement disponibles :

### Backend (API FastAPI)

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|--------|
| `MONGO_URL` | URL de connexion à MongoDB | `mongodb://mongodb:27017` | ✅ Oui |
| `DB_NAME` | Nom de la base de données MongoDB | `axis_audio_dashboard` | ✅ Oui |
| `AXIS_API_BASE_URL` | URL de base de l'API Axis Manager Pro | - | ✅ Oui |
| `AXIS_API_USERNAME` | Nom d'utilisateur pour l'API Axis | - | ✅ Oui |
| `AXIS_API_PASSWORD` | Mot de passe pour l'API Axis | - | ✅ Oui |
| `AXIS_API_TIMEOUT` | Timeout des requêtes Axis (secondes) | `30` | ❌ Non |
| `STYB_CLIENT_ID` | Client ID Soundtrackyourbrand | - | ❌ Non |
| `STYB_CLIENT_SECRET` | Client Secret Soundtrackyourbrand | - | ❌ Non |

### Frontend (React)

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|--------|
| `DISABLE_HOT_RELOAD` | Désactiver le hot-reload (dev) | `false` | ❌ Non |

**Note :** Le frontend utilise maintenant des URLs relatives (`/api`) en production. En développement, le proxy est configuré dans `package.json`. Plus besoin de `REACT_APP_BACKEND_URL` !

### MongoDB

| Variable | Description | Valeur par défaut | Requis |
|----------|-------------|-------------------|--------|
| `MONGO_INITDB_DATABASE` | Nom de la base créée au démarrage | `axis_audio_dashboard` | ❌ Non |

---

## Ressources et Support

- **Documentation Docker** : https://docs.docker.com/
- **Documentation Portainer** : https://docs.portainer.io/
- **FastAPI Docs** : https://fastapi.tiangolo.com/
- **React Docs** : https://react.dev/
- **Nginx Docs** : https://nginx.org/en/docs/

---

## Résumé des Commandes Principales

```bash
# Développement local avec hot-reload
docker compose -f compose.dev.yaml up

# Production locale (builder l'image)
docker compose build
docker compose up -d

# Production avec image Docker Hub (recommandé)
docker compose up -d

# Voir les logs
docker compose logs -f

# Arrêter tout
docker compose down

# Mettre à jour l'image depuis Docker Hub
docker compose pull
docker compose up -d

# Nettoyer Docker
docker system prune -a
```

---

## Évolutions Futures

### HTTPS et Let's Encrypt

Pour sécuriser l'application en production, deux options sont envisagées :

**Option 1 : Traefik (recommandé)**
- Reverse proxy avec gestion automatique des certificats SSL
- Renouvellement automatique Let's Encrypt
- Configuration via labels Docker

**Option 2 : Nginx + Certbot**
- Intégration de Certbot dans le container existant
- Configuration plus simple mais renouvellement manuel

**Prérequis pour HTTPS :**
- Nom de domaine pointant vers votre serveur
- Ports 80 et 443 ouverts sur le firewall

Cette fonctionnalité sera ajoutée dans une future version.

---

**Vous êtes maintenant prêt à déployer Axis Manager avec Docker !** 🎉

Si vous rencontrez des problèmes non couverts par ce guide, consultez les logs et la section Troubleshooting.
