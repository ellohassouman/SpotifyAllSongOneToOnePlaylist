/**
 * Module pour gérer la playlist cible
 * - Créer ou récupérer la playlist "All My Songs"
 * - Ajouter les tracks avec déduplication
 */

const PLAYLIST_NAME = 'All My Songs';

class PlaylistManager {
  constructor(spotifyClient, userId) {
    this.spotify = spotifyClient;
    this.userId = userId;
    this.playlistId = null;
    this.existingTrackUris = new Set();
  }

  /**
   * Trouver ou créer la playlist cible
   */
  async findOrCreatePlaylist() {
    console.log(`\n🎯 Recherche ou création de la playlist "${PLAYLIST_NAME}"...\n`);

    try {
      // Récupérer toutes les playlists de l'utilisateur
      const playlists = await this.spotify.paginate('/me/playlists', {}, 'items');

      // Chercher la playlist par nom
      let targetPlaylist = playlists.find((p) => p.name === PLAYLIST_NAME);

      if (targetPlaylist) {
        console.log(`✅ Playlist "${PLAYLIST_NAME}" trouvée (ID: ${targetPlaylist.id})`);
        this.playlistId = targetPlaylist.id;
      } else {
        console.log(`📝 Playlist "${PLAYLIST_NAME}" non trouvée, création...`);
        const newPlaylist = await this.spotify.post(`/users/${this.userId}/playlists`, {
          name: PLAYLIST_NAME,
          description:
            'Playlist contenant TOUS les tracks de votre bibliothèque (saved songs + toutes les playlists) - Créée automatiquement',
          public: false,
        });
        console.log(`✅ Playlist "{PLAYLIST_NAME}" créée (ID: ${newPlaylist.id})`);
        this.playlistId = newPlaylist.id;
      }

      // Récupérer les tracks existants dans la playlist
      await this.loadExistingTracks();

      return this.playlistId;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la gestion de la playlist "${PLAYLIST_NAME}":`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Charger les tracks existants dans la playlist
   */
  async loadExistingTracks() {
    try {
      const tracks = await this.spotify.paginate(
        `/playlists/${this.playlistId}/tracks`,
        {},
        'items'
      );

      for (const item of tracks) {
        if (item.track && item.track.uri) {
          this.existingTrackUris.add(item.track.uri);
        }
      }

      console.log(`📊 La playlist contient actuellement ${tracks.length} tracks`);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des tracks existants:', error.message);
      throw error;
    }
  }

  /**
   * Ajouter les tracks à la playlist (par batch de 100)
   */
  async addTracks(tracks) {
    console.log(`\n📤 Ajout des tracks à la playlist...\n`);

    if (!this.playlistId) {
      throw new Error('Playlist ID non défini. Appelez findOrCreatePlaylist() d\'abord.');
    }

    // Filtrer les tracks qui ne sont pas déjà dans la playlist
    const tracksToAdd = tracks.filter((track) => !this.existingTrackUris.has(track.uri));

    console.log(`📊 Résumé :`);
    console.log(`   • Tracks au total: ${tracks.length}`);
    console.log(`   • Déjà dans la playlist: ${tracks.length - tracksToAdd.length}`);
    console.log(`   • À ajouter: ${tracksToAdd.length}`);

    if (tracksToAdd.length === 0) {
      console.log('✅ Tous les tracks sont déjà dans la playlist !');
      return { added: 0, skipped: tracks.length - tracksToAdd.length, failed: 0 };
    }

    let added = 0;
    let failed = 0;
    const batchSize = 100; // Limite de Spotify

    for (let i = 0; i < tracksToAdd.length; i += batchSize) {
      const batch = tracksToAdd.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tracksToAdd.length / batchSize);

      console.log(
        `⏳ Batch ${batchNumber}/${totalBatches} (${batch.length} tracks)...`
      );

      try {
        const uris = batch.map((track) => track.uri);
        await this.spotify.post(`/playlists/${this.playlistId}/tracks`, {
          uris,
        });

        added += batch.length;
        console.log(`   ✅ ${batch.length} tracks ajoutés`);
      } catch (error) {
        console.error(`   ❌ Erreur lors de l'ajout du batch:`, error.message);
        failed += batch.length;
      }
    }

    console.log(`\n📊 Résumé d'ajout :`);
    console.log(`   • Ajoutés: ${added}`);
    console.log(`   • Échoués: ${failed}`);
    console.log(`   • Ignorés: ${tracks.length - tracksToAdd.length}`);

    return {
      added,
      skipped: tracks.length - tracksToAdd.length,
      failed,
    };
  }
}

module.exports = PlaylistManager;
