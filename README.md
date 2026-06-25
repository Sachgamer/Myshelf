# MyShelf 🎬 - Gestionnaire de Films, Séries et DVD

MyShelf est une application web moderne pour répertorier et noter les films et séries que vous avez vus, et gérer votre collection de DVD physiques (achetés ou en liste de souhaits).
L'application se connecte à l'API TMDB pour récupérer automatiquement toutes les informations (titre, affiche, date de sortie, synopsis).

## Architecture du projet

* **Backend** : Django (Python) et Django REST Framework avec base de données SQLite.
* **Frontend** : Next.js (React) avec TypeScript et CSS Vanille haut de gamme.
* **Environnement portable** : Un dossier `node-env/` local contient Node.js pour exécuter l'application sans installation globale sur votre système.

---

## Configuration initiale

### 1. Clé API TMDB (Indispensable pour de vrais résultats)
Pour que la recherche automatique fonctionne :
1. Créez un compte gratuit sur [The Movie Database (TMDB)](https://www.themoviedb.org/).
2. Allez dans vos **Paramètres** de compte -> section **API**.
3. Demandez une clé API (catégorie Usage personnel / Développeur).
4. Copiez le **Jeton d'accès en lecture de l'API (JWT)** ou la **Clé API (v3 auth)**.
5. Ouvrez le fichier `backend/.env` et collez votre jeton :
   ```env
   TMDB_API_READ_ACCESS_TOKEN=votre_jeton_jwt_ici
   # ou
   TMDB_API_KEY=votre_cle_v3_ici
   ```
*(Note : Si vous ne configurez pas de clé API, le site utilisera des données fictives / mockées pour vous permettre de le tester immédiatement avec des films comme Inception, Breaking Bad, The Matrix, Interstellar...)*

---

## Démarrage des serveurs de développement

Pour lancer l'application en local, vous devez démarrer le backend et le frontend simultanément. Ouvrez deux terminaux séparés dans ce dossier :

### Terminal 1 : Lancer le Backend Django
1. Allez dans le dossier `backend` :
   ```bash
   cd backend
   ```
2. Lancez le serveur de développement Django :
   ```bash
   python3 manage.py runserver
   ```
Le backend sera disponible sur [http://localhost:8000/](http://localhost:8000/).

### Terminal 2 : Lancer le Frontend Next.js
1. Allez dans le dossier `frontend` :
   ```bash
   cd frontend
   ```
2. Démarrez le serveur de développement Next.js en chargeant le Node.js local :
   ```bash
   export PATH="$(pwd)/../node-env/bin:$PATH"
   npm run dev
   ```
Le frontend sera accessible sur [http://localhost:3000/](http://localhost:3000/).

---

## Version Android 📱

Le projet est maintenant configuré avec **Capacitor** pour être utilisé comme une application Android native.

### Pré-requis
* Android Studio installé.
* SDK Android configuré.

### Démarrage de l'app Android
1. **Générer le build statique du frontend** :
   ```bash
   cd frontend
   export PATH="$(pwd)/../node-env/bin:$PATH"
   npm run build
   ```
2. **Synchroniser avec le projet Android** :
   ```bash
   npx cap sync android
   ```
3. **Ouvrir dans Android Studio** :
   ```bash
   npx cap open android
   ```
   Ou ouvrez directement le dossier `frontend/android` dans Android Studio.

4. **Lancer sur l'émulateur** :
   L'application est configurée pour pointer vers `http://10.0.2.2:8000/api` (l'IP par défaut pour accéder à votre machine hôte depuis l'émulateur Android).

---

## Fonctionnalités incluses

* **Tableau de bord de statistiques** : Suivi du nombre de titres, moyenne des notes, nombre de DVD achetés et souhaités.
* **Recherche & Ajout instantané** : Recherche de films/séries avec détection si le titre est déjà dans votre bibliothèque.
* **Fiches médias interactives** :
  * Affiche officielle et synopsis au survol.
  * Marquage comme "Vu" avec sélecteur de note interactif de 1 à 10.
  * Ajout/Retrait aux "DVD Achetés" (📀) ou aux "Souhaits DVD" (💖).
  * Suppression en un clic de la bibliothèque.
