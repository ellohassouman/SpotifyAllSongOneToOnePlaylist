# Nettoyage des albums sauvegardés sans titre liké

## Contexte

L'utilisateur a une bibliothèque Spotify avec des albums sauvegardés (`/me/albums`) dont certains, gros (>3 titres), n'ont aucun titre présent dans les Liked Songs (`/me/tracks`). Ce sont probablement des albums sauvegardés par accident ou plus jamais écoutés. Le but : les identifier, les passer en revue, et désaimer ceux qui ne valent pas la peine d'être gardés.

## Périmètre

Deux commandes CLI indépendantes, dans le même style que `auth.js`/`index.js` :

1. **`npm run albums:list`** — scanne et affiche/exporte les albums candidats (lecture seule)
2. **`npm run albums:delete`** — revue interactive des candidats, désaime ceux choisis

Un album est **candidat** si :
- `total_tracks > 3`
- aucun de ses titres n'est présent dans les Liked Songs de l'utilisateur

## Architecture

### `src/albumCleaner.js` (nouveau)

Module métier, réutilise `SpotifyClient.paginate()` :

```js
async function findCandidateAlbums(spotifyClient) {
  // 1. saved albums via paginate('/me/albums'), filtre total_tracks > 3
  // 2. liked track IDs via paginate('/me/tracks') -> Set
  // 3. pour chaque album filtré : paginate(`/albums/${id}/tracks`)
  //    -> candidat si intersection avec liked track IDs est vide
  // 4. retourne [{ id, name, artist, totalTracks, releaseDate, spotifyUrl }]
}
```

### `src/spotify.js` (modifié)

Ajoute une méthode `delete(endpoint, params)`, symétrique à `get()`/`post()`, pour appeler `DELETE /me/albums?ids=...`.

### `src/auth.js` (modifié)

Ajoute le scope OAuth `user-library-modify` à la liste des scopes demandés (nécessaire pour désaimer un album — absent actuellement, le refresh token existant ne l'aura pas). **Implique de relancer `npm run auth` une fois après ce changement.**

### `src/listCandidateAlbums.js` (nouveau, point d'entrée commande 1)

- Appelle `findCandidateAlbums()`
- Affiche chaque candidat (nom, artiste, nb titres, année de sortie)
- Affiche un résumé (nb candidats / nb albums scannés au total)
- Sauvegarde le résultat dans `.albumCandidates.json` (racine projet, gitignored, même convention que `.trackSnapshot.json`)

Format du cache :
```json
[
  { "id": "...", "name": "OK Computer", "artist": "Radiohead", "totalTracks": 12, "releaseDate": "1997-05-21", "spotifyUrl": "https://open.spotify.com/album/..." }
]
```

### `src/deleteCandidateAlbums.js` (nouveau, point d'entrée commande 2)

- Lit `.albumCandidates.json`. Si absent → message d'erreur clair invitant à lancer `npm run albums:list` d'abord, puis exit.
- Boucle sur les entrées sans champ `decision` (ignore celles déjà `deleted`/`kept` d'une session précédente)
- Pour chaque candidat, via `readline` natif (aucune nouvelle dépendance) :
  ```
  💿 Radiohead — OK Computer (12 titres, 1997)
     https://open.spotify.com/album/xxx
  [s] supprimer  [g] garder  [q] quitter
  ```
  - `s` → `spotify.delete('/me/albums', { ids: album.id })`, marque `decision: 'deleted'`
  - `g` → marque `decision: 'kept'`, ne sera plus reproposé tant que `.albumCandidates.json` n'est pas régénéré par `albums:list`
  - `q` → arrête la boucle, la progression déjà sauvegardée est conservée
- Sauvegarde `.albumCandidates.json` après **chaque** décision individuelle (résiste à une interruption/Ctrl+C)
- En cas d'échec API sur `s` (réseau, etc.) : log l'erreur, laisse l'entrée sans `decision` (sera reproposée), continue au suivant
- Résumé final : nb supprimés / nb gardés / nb restants (si `q` prématuré)

### `package.json` (modifié)

```json
"albums:list": "node src/listCandidateAlbums.js",
"albums:delete": "node src/deleteCandidateAlbums.js"
```

### `.gitignore`

Ajoute `.albumCandidates.json` (comme les autres fichiers d'état locaux).

## Gestion d'erreurs

- Pas de `SPOTIFY_REFRESH_TOKEN` / `SPOTIFY_USER_ID` → même check qu'`index.js`, message clair
- Scope OAuth manquant (ancien refresh token sans `user-library-modify`) → l'appel `DELETE /me/albums` échouera avec 403 ; message d'erreur Spotify loggé tel quel par `spotify.delete()`, pas de détection proactive du scope (pas d'endpoint Spotify pour l'introspecter simplement)
- Erreur réseau pendant le scan (`albums:list`) → même pattern que `trackFetcher.js` : log et `throw`, le script s'arrête (pas de sauvegarde partielle du cache)

## Hors périmètre (explicitement exclu)

- Pas d'undo automatique (re-sauvegarder un album désaimé par erreur = le refaire manuellement sur Spotify ou re-lancer une future commande d'ajout, non prévue ici)
- Pas de suppression en masse sans revue (toujours interactif, un album à la fois)
- Pas de prise en compte des playlists dans le critère "liké" — uniquement Liked Songs (`/me/tracks`)
- Pas de retrait des tracks de la playlist "All My Songs" — la désaimer via `/me/albums` uniquement
