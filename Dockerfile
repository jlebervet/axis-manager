# =============================================================================
# DOCKERFILE MULTI-STAGE POUR AXIS MANAGER
# =============================================================================
# Ce Dockerfile construit une image de production contenant :
# - Le frontend React (servi par Nginx)
# - Le backend FastAPI (exécuté par Uvicorn)
# - Nginx comme reverse proxy
#
# Architecture multi-stage :
# 1. frontend-builder : Compile l'application React
# 2. backend-builder  : Prépare l'environnement Python
# 3. production       : Image finale optimisée
# =============================================================================

# =============================================================================
# STAGE 1 : CONSTRUCTION DU FRONTEND REACT
# =============================================================================
# On utilise Node.js 20 pour compiler l'application React avec Yarn et CRACO
# Note : Node 20+ est requis pour react-router-dom@7
FROM node:20-alpine AS frontend-builder

# Définir le répertoire de travail pour le frontend
WORKDIR /frontend

# Copier les fichiers de dépendances en premier
# Cela permet de profiter du cache Docker : si package.json ne change pas,
# les dépendances ne seront pas réinstallées lors des prochains builds
COPY frontend/package.json frontend/yarn.lock ./

# Installer les dépendances Node.js
# --frozen-lockfile : Assure que les versions sont exactement celles du yarn.lock
# --network-timeout : Augmente le timeout pour éviter les erreurs réseau
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copier tout le code source du frontend
# NOTE: Les fichiers .env sont exclus via .dockerignore pour éviter d'embarquer des secrets
# Le frontend utilise des URLs relatives (/api) qui fonctionnent via le proxy nginx
COPY frontend/ ./

# Construire l'application React pour la production
# Cela génère les fichiers optimisés (minifiés, bundlés) dans le dossier /frontend/build
# CRACO est utilisé pour personnaliser la configuration de Create React App
RUN yarn build

# À ce stade, nous avons :
# - /frontend/build/ contenant les fichiers statiques HTML/CSS/JS prêts à être servis


# =============================================================================
# STAGE 2 : PRÉPARATION DE L'ENVIRONNEMENT BACKEND PYTHON
# =============================================================================
# On utilise Python 3.11 pour installer les dépendances du backend FastAPI
FROM python:3.11-slim AS backend-builder

# Définir le répertoire de travail pour le backend
WORKDIR /backend

# Copier le fichier requirements.txt qui liste toutes les dépendances Python
COPY backend/requirements.txt .

# Installer les dépendances Python
# --no-cache-dir : N'utilise pas de cache pip local (réduit la taille de l'image)
# --user : Installe les packages dans ~/.local (pratique pour copier plus tard)
RUN pip install --no-cache-dir --user -r requirements.txt

# À ce stade, nous avons :
# - /root/.local/lib/python3.11/site-packages/ contenant toutes les dépendances


# =============================================================================
# STAGE 3 : IMAGE DE PRODUCTION FINALE
# =============================================================================
# On repart d'une image Python slim propre pour l'environnement de production
FROM python:3.11-slim

# Installer Nginx et Supervisor
# Nginx : Serveur web pour servir les fichiers statiques React et proxy vers l'API
# Supervisor : Gestionnaire de processus pour lancer Nginx ET Uvicorn ensemble
# curl : Utile pour les health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        nginx \
        supervisor \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Créer un utilisateur non-root pour plus de sécurité
# En production, il ne faut jamais exécuter les applications en tant que root
RUN useradd -m -u 1000 appuser && \
    mkdir -p /var/log/supervisor /var/run && \
    chown -R appuser:appuser /var/log/supervisor /var/run

# Copier les dépendances Python depuis le stage backend-builder
# Cela évite de réinstaller toutes les dépendances dans l'image finale
COPY --from=backend-builder /root/.local /home/appuser/.local

# Ajouter les binaires Python installés au PATH
# Cela permet d'exécuter uvicorn et autres commandes Python installées
ENV PATH=/home/appuser/.local/bin:$PATH

# Configurer PYTHONPATH pour que Python trouve les modules installés
ENV PYTHONPATH=/home/appuser/.local/lib/python3.11/site-packages:$PYTHONPATH

# Définir le répertoire de travail
WORKDIR /app

# Copier le code backend Python
# NOTE: Les fichiers .env sont exclus via .dockerignore
# Les variables d'environnement doivent être fournies au runtime via Docker Compose ou Portainer
COPY backend/ ./backend/

# Copier les fichiers statiques du frontend depuis le stage frontend-builder
# Ces fichiers seront servis par Nginx
COPY --from=frontend-builder /frontend/build ./frontend/build

# Copier la configuration Nginx personnalisée
# Ce fichier définit comment Nginx sert le frontend et proxy vers l'API
COPY nginx.conf /etc/nginx/nginx.conf

# Créer la configuration Supervisor
# Supervisor va lancer et surveiller deux processus :
# 1. Nginx (serveur web sur port 80)
# 2. Uvicorn (serveur API FastAPI sur port 8001)
RUN echo '[supervisord]\n\
nodaemon=true\n\
user=root\n\
logfile=/var/log/supervisor/supervisord.log\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:nginx]\n\
command=nginx -g "daemon off;"\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
autorestart=true\n\
\n\
[program:uvicorn]\n\
command=/home/appuser/.local/bin/uvicorn server:app --host 0.0.0.0 --port 8001\n\
directory=/app/backend\n\
user=appuser\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
autorestart=true' > /etc/supervisor/conf.d/supervisord.conf

# Ajuster les permissions pour l'utilisateur non-root
RUN chown -R appuser:appuser /app && \
    chown -R appuser:appuser /home/appuser/.local && \
    chmod -R 755 /var/log/nginx /var/lib/nginx && \
    touch /var/run/nginx.pid && \
    chown appuser:appuser /var/run/nginx.pid

# Exposer le port 80 (HTTP)
# Nginx écoute sur ce port et sert le frontend + proxy vers le backend
EXPOSE 80

# Health check pour vérifier que l'application est en bonne santé
# Docker/Portainer utilisera cette commande pour vérifier l'état du conteneur
# On teste l'endpoint /api/health du backend
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://127.0.0.1/api/health || exit 1

# Commande de démarrage : lancer Supervisor
# Supervisor va automatiquement démarrer Nginx et Uvicorn
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
