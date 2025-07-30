# Dashboard Audio Axis - Multiroom Audio Control System

## 📋 Description

Dashboard Audio Axis est une application complète de gestion audio multiroom conçue pour contrôler des enceintes Axis via Axis Audio Manager Pro. L'application permet de créer des zones multiroom, gérer des sources audio variées (fichiers locaux et streaming Soundtrackyourbrand), et contrôler la diffusion audio en temps réel.

## ✨ Fonctionnalités principales

### 🔊 Gestion des enceintes
- **Découverte automatique** des enceintes Axis sur le réseau
- **Contrôle de volume** individuel pour chaque enceinte
- **Monitoring en temps réel** du statut (en ligne/hors ligne)
- **Informations détaillées** (IP, modèle, firmware)

### 🏠 Zones multiroom
- **Création de zones** avec groupement d'enceintes
- **Diffusion synchronisée** sur plusieurs enceintes
- **Gestion flexible** des zones (ajout/suppression d'enceintes)
- **Contrôle de volume** par zone

### 🎵 Sources audio
- **Fichiers locaux** (.mp3, .wav, etc.)
- **Streaming Soundtrackyourbrand** 
- **Radio en ligne**
- **Métadonnées complètes** (artiste, genre, durée)

### 🎧 Sessions audio
- **Création de sessions** avec liaison zone/source
- **Contrôles de lecture** : play, pause, stop
- **Monitoring temps réel** des sessions actives
- **Gestion des playlists**

### 📊 Dashboard central
- **Vue d'ensemble** avec statistiques
- **Sessions actives** avec contrôles rapides
- **Navigation intuitive** entre les sections
- **Interface responsive** adaptée mobile/desktop

## 🏗️ Architecture technique

### Backend (FastAPI)
```
/app/backend/
├── server.py              # Application principale FastAPI
├── requirements.txt       # Dépendances Python
└── .env                   # Configuration environnement
```

**Technologies utilisées :**
- **FastAPI** : API REST performante
- **MongoDB** : Base de données NoSQL
- **Motor** : Driver MongoDB asynchrone  
- **HTTPX** : Client HTTP pour Axis Audio Manager Pro
- **Pydantic** : Validation des données

### Frontend (React)
```
/app/frontend/
├── src/
│   ├── App.js            # Composant principal
│   ├── App.css           # Styles personnalisés
│   └── index.js          # Point d'entrée
├── package.json          # Dépendances Node.js
└── .env                  # Configuration environnement
```

**Technologies utilisées :**
- **React 19** : Framework frontend moderne
- **Tailwind CSS** : Framework CSS utilitaire
- **Axios** : Client HTTP pour API
- **React Router** : Navigation SPA

### Intégration Axis Audio Manager Pro
- **Authentication Basic** avec credentials fournis
- **API REST** sur HTTPS port 443
- **Découverte automatique** des équipements
- **Contrôles temps réel** des sessions audio
- **Fallback avec données simulées** pour développement

## 🚀 Installation et configuration

### Prérequis
- Node.js 18+ et Yarn
- Python 3.9+ 
- MongoDB
- Accès réseau aux enceintes Axis

### Configuration backend
1. **Variables d'environnement** (`/app/backend/.env`):
```bash
# Base de données
MONGO_URL="mongodb://localhost:27017"
DB_NAME="axis_audio_dashboard"

# Axis Audio Manager Pro
AXIS_API_USERNAME="Dashboard"
AXIS_API_PASSWORD="cUiS&#n-v5mBz6"
AXIS_API_BASE_URL="https://YOUR_AXIS_SERVER:443"
AXIS_API_TIMEOUT=30

# Soundtrackyourbrand (optionnel)
STYB_CLIENT_ID="your_client_id"
STYB_CLIENT_SECRET="your_client_secret"
```

2. **Installation des dépendances** :
```bash
cd /app/backend
pip install -r requirements.txt
```

### Configuration frontend
1. **Variables d'environnement** (`/app/frontend/.env`):
```bash
REACT_APP_BACKEND_URL=https://your-domain.com
```

2. **Installation des dépendances** :
```bash
cd /app/frontend
yarn install
```

### Démarrage
```bash
# Backend
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd /app/frontend
yarn start
```

## 📚 Guide d'utilisation

### 1. Découverte des enceintes
- Accéder à l'onglet **Enceintes**
- Cliquer sur **"Découvrir les enceintes"**
- Les enceintes Axis disponibles apparaissent automatiquement
- Ajuster le volume individuellement avec les curseurs

### 2. Création de zones multiroom
- Aller dans l'onglet **Zones**
- Remplir le formulaire **"Créer une nouvelle zone"**
- Sélectionner les enceintes à inclure dans la zone
- Valider pour créer la zone

### 3. Ajout de sources audio
- Dans l'onglet **Sources Audio**
- Choisir le type de source :
  - **Fichier local** : spécifier le chemin du fichier
  - **Streaming** : URL Soundtrackyourbrand
  - **Radio** : URL du flux radio
- Ajouter des métadonnées (optionnel)

### 4. Lancement de sessions
- Onglet **Sessions**
- Formulaire **"Démarrer une nouvelle session"**
- Sélectionner une zone et une source audio
- La session démarre automatiquement
- Utiliser les contrôles play/pause/stop

### 5. Monitoring
- Le **Dashboard** affiche les statistiques globales
- **Sessions actives** avec contrôles rapides
- Rafraîchissement automatique toutes les 10 secondes

## 🔧 API Endpoints

### Enceintes
- `GET /api/speakers` - Liste des enceintes
- `GET /api/speakers/discover` - Découverte automatique
- `PUT /api/speakers/{id}/volume` - Contrôle de volume

### Zones  
- `GET /api/zones` - Liste des zones
- `POST /api/zones` - Créer une zone
- `PUT /api/zones/{id}` - Modifier une zone
- `DELETE /api/zones/{id}` - Supprimer une zone

### Sources audio
- `GET /api/sources` - Liste des sources
- `POST /api/sources` - Ajouter une source
- `DELETE /api/sources/{id}` - Supprimer une source

### Sessions
- `GET /api/sessions` - Liste des sessions
- `POST /api/sessions` - Créer une session
- `PUT /api/sessions/{id}/control` - Contrôles de lecture
- `DELETE /api/sessions/{id}` - Arrêter une session

## 🧪 Tests

### Tests automatisés
L'application a été entièrement testée avec **24/24 tests backend** réussis et tous les **tests frontend** validés.

**Exécution des tests** :
```bash
cd /app
python backend_test.py
```

### Fonctionnalités testées
- ✅ Tous les endpoints API
- ✅ Interface utilisateur complète  
- ✅ Workflow multiroom complet
- ✅ Contrôles de lecture temps réel
- ✅ Synchronisation frontend/backend
- ✅ Gestion d'erreurs

## 🛠️ Maintenance

### Logs
- **Backend** : `/var/log/supervisor/backend.*.log`
- **Frontend** : Console navigateur (F12)

### Base de données
Collections MongoDB :
- `speakers` : Enceintes découvertes
- `zones` : Zones multiroom
- `audio_sources` : Sources audio
- `audio_sessions` : Sessions actives

### Monitoring
- Health check : `GET /api/health`
- Statistiques : Disponibles dans le dashboard

## 🎯 Fonctionnalités avancées possibles

### Améliorations futures
- [ ] **Équaliseur graphique** par zone
- [ ] **Planificateur** de diffusion automatique
- [ ] **Streaming Spotify/Apple Music** 
- [ ] **Contrôle vocal** (intégration assistant)
- [ ] **API mobile** pour application native
- [ ] **Analytics** d'usage et reporting
- [ ] **Backup/restore** des configurations
- [ ] **Multi-utilisateurs** avec permissions

## 📞 Support technique

### Dépannage courant
1. **Enceintes non découvertes** : Vérifier la connectivité réseau
2. **Sessions ne démarrent pas** : Contrôler les credentials Axis
3. **Interface ne charge pas** : Vérifier le backend sur port 8001

### Configuration de production
- Utiliser HTTPS pour toutes les communications
- Configurer un reverse proxy (Nginx/Apache)
- Mettre en place une surveillance (Prometheus/Grafana)
- Effectuer des backups réguliers de MongoDB

---

**Développé pour un contrôle audio multiroom professionnel avec enceintes Axis**
