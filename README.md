# 🎵 Spotify All Songs Playlist

Créer automatiquement une playlist Spotify contenant **TOUS** vos tracks (saved songs + toutes vos playlists).

## ✨ Fonctionnalités

- ✅ Récupère tous vos **saved tracks** (Your Liked Songs)
- ✅ Récupère tous les **tracks de toutes vos playlists**
- ✅ Récupère tous les **tracks de tous vos albums sauvegardés**
- ✅ Déduplique automatiquement
- ✅ Crée ou réutilise la playlist "All My Songs"
- ✅ Ajoute les tracks par batch de 100 (limite Spotify)
- ✅ Gère les erreurs réseau et le renouvellement des tokens
- ✅ Peut être exécuté plusieurs fois pour synchroniser les nouveaux tracks
- ✅ Détecte les albums sauvegardés sans aucun titre liké (`npm run albums:list`) et permet de les désaimer après revue interactive (`npm run albums:delete`)

## 📋 Prérequis

- **Node.js** >= 18.0.0
- **npm** ou **yarn**
- Un compte **Spotify** (même un compte gratuit fonctionne)
- Une application Spotify enregistrée sur le [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## 🚀 Installation & Configuration

### 1. Cloner ou créer le projet

```bash
cd d:\Websites\SpotifyAllSongToOnePlaylist
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. S'enregistrer sur Spotify Developer

1. Allez sur https://developer.spotify.com/dashboard
2. Connectez-vous ou créez un compte
3. Créez une nouvelle application (acceptez les conditions)
4. Vous recevrez un **Client ID** et **Client Secret**

### 4. Configurer les variables d'environnement

Dupliquez le fichier `.env.example` en `.env` :

```bash
cp .env.example .env
```

Ouvrez `.env` et remplissez les variables (au minimum):

```env
SPOTIFY_CLIENT_ID=YOUR_CLIENT_ID_HERE
SPOTIFY_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
```

### 5. Configuration et synchronisation initiale (une commande)

**Option simplifiée (recommandée)** : Lancez une seule commande qui gère l'authentification ET la synchronisation :

```bash
npm run setup
```

Cela va :
1. ✅ Ouvrir **automatiquement** votre navigateur pour l'authentification Spotify
2. ✅ Vous demander les permissions (playlist modification, lecture library)
3. ✅ Sauvegarder automatiquement vos tokens dans `.env`
4. ✅ Lancer directement la synchronisation de tous vos tracks
5. ✅ Créer la playlist "All My Songs" et ajouter les tracks

**Note** : Cette étape ne doit être faite qu'une seule fois. Les tokens sont réutilisables.

**Alternative** : Si vous avez besoin de vous authentifier séparément :

```bash
npm run auth
```

## 🎯 Utilisation

### Première synchronisation (une seule commande)

Une fois les dépendances installées et l'environnement configuré :

```bash
npm run setup
```

Cette commande enchaîne automatiquement :
1. ✅ L'authentification (ouvre votre navigateur)
2. ✅ La synchronisation de tous vos tracks
3. ✅ La création/mise à jour de la playlist "All My Songs"

### Synchronisations ultérieures

Après la première synchronisation, lancez simplement :

```bash
npm run sync
```

ou

```bash
npm start
```

Le script va :
1. Récupérer tous vos saved tracks
2. Récupérer tous les tracks de vos playlists
3. Dédupliquer
4. Créer ou réutiliser la playlist "All My Songs"
5. Ajouter les nouveaux tracks
6. Afficher un rapport

## 📊 Exemple de sortie

```
================================================================================
🎵 Spotify All Songs Playlist Sync
================================================================================

📥 Récupération des saved tracks (Your Liked Songs)...
✅ 342 saved tracks trouvés

📥 Récupération de toutes les playlists...
✅ 12 playlists trouvées
  📋 Playlist 1/12: Favorites
     └─ 85 tracks (85 uniques globales)
  📋 Playlist 2/12: Party Mix
     └─ 120 tracks (187 uniques globales)
  ...

✅ 1234 tracks uniques de playlists trouvés

📊 Résumé :
   • Saved tracks: 342
   • Playlist tracks: 1234
   • Total unique: 1456

🎯 Recherche ou création de la playlist "All My Songs"...
✅ Playlist "All My Songs" créée (ID: xxxxx...)

📤 Ajout des tracks à la playlist...
📊 Résumé :
   • Tracks au total: 1456
   • Déjà dans la playlist: 0
   • À ajouter: 1456

⏳ Batch 1/15 (100 tracks)...
   ✅ 100 tracks ajoutés
... (plus de batches)

📊 Résumé d'ajout :
   • Ajoutés: 1456
   • Échoués: 0
   • Ignorés: 0

================================================================================
✨ Synchronisation terminée avec succès !
================================================================================
```

## 🔄 Ré-exécution (Synchronisation ultérieure)

Vous pouvez réexécuter le script **autant de fois que vous voulez** :

```bash
npm run sync
```

À chaque exécution :
- Les nouveaux tracks sont ajoutés
- Les tracks existants sont ignorés (pas de doublons)
- Les credentials sont renouvelés automatiquement

**Deux stratégies possibles** :

1. **Ajouter incrémentalement** (défaut) :
   - Récupère les tracks existants, ignore les doublons
   - Plus rapide si peu de nouveaux tracks
   
2. **Supprimer et recréer** (optionnel) :
   - Supprimer la playlist existante
   - Recréer avec tous les tracks
   - Plus sûr si vous soupçonnez des problèmes de cohérence

Pour l'instant, le script utilise l'approche 1 (incrémentale). La stratégie 2 peut être ajoutée en option.

## 🧹 Nettoyer les albums sans titre liké

Repère les albums de ta bibliothèque (>3 titres) dont aucun titre n'est dans tes Liked Songs — souvent des albums sauvegardés par erreur ou jamais écoutés.

```bash
npm run albums:list     # liste les albums candidats, sauvegarde dans .albumCandidates.json
npm run albums:delete   # revue interactive : garder ou désaimer chaque album
```

**Note** : la suppression (`DELETE /me/albums`) nécessite le scope OAuth `user-library-modify`. Si ton token a été généré avant l'ajout de cette fonctionnalité, relance `npm run auth` avant d'utiliser `albums:delete`.

## 📚 Quels tracks sont synchronisés ?

Le script récupère **TOUS les tracks de votre bibliothèque Spotify** :

✅ **Inclus** :
- Tous vos **saved tracks** (♥ Your Liked Songs)
- Tous les **tracks de TOUTES vos playlists** (celles que vous possédez)
- Tous les **tracks de TOUS vos albums sauvegardés**

❌ **Exclus** (pour le moment) :
- L'historique d'écoute (recently played)
- Les playlists que vous suivez mais ne possédez pas

En résumé : **Si un track est dans vos saved songs OU dans l'une de vos playlists OU dans l'un de vos albums, il sera ajouté à "All My Songs"** ✨

## ⚙️ Configuration avancée

Vous pouvez adapter le script à vos besoins :

### Changer le nom de la playlist

Modifiez `PLAYLIST_NAME` dans [src/playlistManager.js](src/playlistManager.js#L5) :

```javascript
const PLAYLIST_NAME = 'Mon Playlist Personnalisée';
```

### Ajouter une description personnalisée

Modifiez la description dans [src/playlistManager.js](src/playlistManager.js#L43) :

```javascript
description: 'Ma playlist personnalisée avec tous mes tracks...'
```

### Rendre la playlist publique

Dans [src/playlistManager.js](src/playlistManager.js#L38), changez `public: false` à `public: true` :

```javascript
public: true,
```

## 🔐 Sécurité

- Vos **credentials** (Client ID, Secret) et **tokens** sont stockés **localement** dans `.env`
- Le fichier `.env` est ignomiré par `.gitignore` (jamais commité)
- **Jamais** partager votre `.env` ou ses contents
- Le **refresh token** ne peut pas être utilisé par quelqu'un d'autre sans le Client Secret

## 🐛 Dépannage

### "SPOTIFY_REFRESH_TOKEN non trouvé"

✅ Solution : Exécutez `npm run auth` pour vous authentifier

### "Playlist contient trop de tracks et pas tous affichés"

✅ Spotify affiche les playlists avec pagination. Utilisez l'API pour voir tous les tracks.

### "Erreur lors de l'authentification"

✅ Vérifiez que :
- Votre `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` sont corrects
- Votre `SPOTIFY_REDIRECT_URI` correspond exactement à celle enregistrée sur le Dashboard

### "Certains tracks ne s'ajoutent pas"

Possible raisons :
- Track supprimé de Spotify
- Track indisponible dans votre région
- Erreur temporaire (réseau)

Le script affiche les erreurs. Vous pouvez réexécuter pour renvoyer.

### "Erreur lors de la pagination"

✅ Généralement une erreur temporaire. Relancez `npm run sync`.

## 📚 Structure du projet

```
spotify-all-songs-playlist/
├── src/
│   ├── auth.js              # Script d'authentification OAuth
│   ├── spotify.js           # Client Spotify réutilisable
│   ├── trackFetcher.js      # Récupération des tracks
│   ├── playlistManager.js   # Gestion de la playlist
│   └── index.js             # Script principal d'orchestration
├── package.json             # Dépendances
├── .env.example             # Template des variables
├── .env                     # Variables d'environnement (local, non commité)
├── .gitignore               # Fichiers ignorés par git
└── README.md                # Cette documentation
```

## 📝 Logs et Debugging

Le script affiche des logs détaillés :
- `✅` : Succès
- `❌` : Erreur
- `⏳` : En attente / Traitement
- `📥` : Récupération de données
- `📤` : Envoi de données

Pour une debugging plus avancée, vous pouvez modifier les niveaux de log dans le code.

## 🎓 Comment ça marche

1. **Authentification OAuth**
   - Vous vous connectez via Spotify
   - Vous autorisez l'application à accéder à votre library
   - Un token de rafraîchissement est stocké en local

2. **Récupération des tracks**
   - L'API retourne 50 tracks par page
   - Le script pagine automatiquement jusqu'au dernier
   - Les doublons sont supprimés par ID unique

3. **Gestion de la playlist**
   - Cherche si "All My Songs" existe
   - La crée si elle n'existe pas
   - Charge les tracks existants pour éviter les doublons

4. **Ajout des tracks**
   - Identifie les nouveaux tracks
   - Les ajoute par batch de 100 (limite Spotify)
   - Affiche un rapport

## 🤝 Contribution

Des améliorations possibles :
- [ ] CLI avec options (--public, --name, --dry-run)
- [ ] Mode watch (synchronisation automatique)
- [ ] Export/Import de playlists
- [ ] Gestion des listes d'exclusion
- [ ] UI web simple

## 📄 Licence

MIT

## 📞 Support

Si vous avez des problèmes :
1. Vérifiez les logs
2. Consultez la section Dépannage
3. Assurez-vous que votre `.env` est bien configuré
4. Essayez de relancer `npm run auth`

---

**Bon sync !** 🎉
