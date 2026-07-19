require('dotenv').config();
const SpotifyClient = require('./spotify');
const TrackFetcher = require('./trackFetcher');
const PlaylistManager = require('./playlistManager');

/**
 * Script principal pour synchroniser tous les tracks Spotify
 */
async function main() {
  console.log(`
================================================================================
🎵 Spotify All Songs Playlist Sync
================================================================================
`);

  // Vérifier que les credentials sont configurés
  if (!process.env.SPOTIFY_REFRESH_TOKEN) {
    console.error(`❌ Erreur: SPOTIFY_REFRESH_TOKEN non trouvé dans .env`);
    console.log(`
📝 Première utilisation? Exécutez:
   npm run auth

Cela ouvrira une fenêtre de navigateur pour configurer votre authentification.
`);
    process.exit(1);
  }

  if (!process.env.SPOTIFY_USER_ID) {
    console.error(`❌ Erreur: SPOTIFY_USER_ID non trouvé dans .env`);
    console.log(`
📝 Exécutez'd'abord le setup d'authentification:
   npm run auth
`);
    process.exit(1);
  }

  try {
    // Initialiser le client Spotify
    const spotify = new SpotifyClient();

    // Récupérer tous les tracks
    const trackFetcher = new TrackFetcher(spotify);
    const allTracks = await trackFetcher.getAllTracks();

    // Gérer la playlist cible
    const playlistManager = new PlaylistManager(spotify, process.env.SPOTIFY_USER_ID);
    await playlistManager.findOrCreatePlaylist();

    // Ajouter les tracks
    const result = await playlistManager.addTracks(allTracks);

    // Résumé final
    console.log(`
================================================================================
✨ Synchronisation terminée avec succès !
================================================================================
📊 Résumé final :
   • Tracks synchronisés: ${result.added}
   • Tracks ignorés (déjà présents): ${result.skipped}
   • Tracks ignorés (exclusion permanente): ${result.excluded}
   • Erreurs: ${result.failed}
   • Total: ${result.added + result.skipped + result.excluded + result.failed}

🎉 Rendez-vous sur Spotify pour voir votre nouvel playlist "All My Songs" !
================================================================================
`);

    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Erreur fatale:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
