/**
 * Module pour récupérer tous les tracks de l'utilisateur
 * - Saved tracks (liked songs)
 * - Tous les tracks de toutes les playlists
 */

class TrackFetcher {
  constructor(spotifyClient) {
    this.spotify = spotifyClient;
  }

  /**
   * Récupérer tous les saved tracks (Your Liked Songs)
   */
  async getAllSavedTracks() {
    console.log('📥 Récupération des saved tracks (Your Liked Songs)...');
    try {
      const tracks = await this.spotify.paginate('/me/tracks', {}, 'items');
      console.log(`✅ ${tracks.length} saved tracks trouvés`);
      return tracks.map((item) => ({
        id: item.track.id,
        uri: item.track.uri,
        name: item.track.name,
        artist: item.track.artists[0].name,
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des saved tracks:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer tous les tracks de toutes les playlists de l'utilisateur
   */
  async getAllPlaylistTracks() {
    console.log('📥 Récupération de toutes les playlists...');
    try {
      // Récupérer toutes les playlists de l'utilisateur
      const playlists = await this.spotify.paginate('/me/playlists', {}, 'items');
      console.log(`✅ ${playlists.length} playlists trouvées`);

      const allTracks = [];
      const processedIds = new Set();

      for (let i = 0; i < playlists.length; i++) {
        const playlist = playlists[i];
        console.log(`  📋 Playlist ${i + 1}/${playlists.length}: ${playlist.name}`);

        try {
          const tracks = await this.spotify.paginate(
            `/playlists/${playlist.id}/tracks`,
            {},
            'items'
          );

          for (const item of tracks) {
            if (item.track && item.track.id && !processedIds.has(item.track.id)) {
              allTracks.push({
                id: item.track.id,
                uri: item.track.uri,
                name: item.track.name,
                artist: item.track.artists[0]?.name || 'Unknown',
              });
              processedIds.add(item.track.id);
            }
          }

          console.log(`     └─ ${tracks.length} tracks (${processedIds.size} uniques globales)`);
        } catch (error) {
          console.error(`  ❌ Erreur pour la playlist ${playlist.name}:`, error.message);
        }
      }

      console.log(`✅ ${allTracks.length} tracks uniques de playlists trouvés`);
      return allTracks;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des playlists:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer tous les tracks de tous les albums sauvegardés de l'utilisateur
   */
  async getAllSavedAlbumTracks() {
    console.log('📥 Récupération de tous les albums sauvegardés...');
    try {
      // Récupérer tous les albums sauvegardés de l'utilisateur
      const albums = await this.spotify.paginate('/me/albums', {}, 'items');
      console.log(`✅ ${albums.length} albums sauvegardés trouvés`);

      const allTracks = [];
      const processedIds = new Set();

      for (let i = 0; i < albums.length; i++) {
        const album = albums[i].album;
        console.log(`  💿 Album ${i + 1}/${albums.length}: ${album.name}`);

        try {
          // Récupérer tous les tracks de l'album
          const tracks = await this.spotify.paginate(
            `/albums/${album.id}/tracks`,
            {},
            'items'
          );

          for (const track of tracks) {
            if (track && track.id && !processedIds.has(track.id)) {
              allTracks.push({
                id: track.id,
                uri: track.uri,
                name: track.name,
                artist: track.artists[0]?.name || 'Unknown',
              });
              processedIds.add(track.id);
            }
          }

          console.log(`     └─ ${tracks.length} tracks (${processedIds.size} uniques globales)`);
        } catch (error) {
          console.error(`  ❌ Erreur pour l'album ${album.name}:`, error.message);
        }
      }

      console.log(`✅ ${allTracks.length} tracks uniques d'albums trouvés`);
      return allTracks;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des albums sauvegardés:', error.message);
      throw error;
    }
  }

  /**
   * Récupérer tous les tracks (saved + playlists + albums) avec déduplication
   */
  async getAllTracks() {
    console.log('\n🎵 Récupération de TOUS les tracks...\n');

    try {
      const savedTracks = await this.getAllSavedTracks();
      const playlistTracks = await this.getAllPlaylistTracks();
      const albumTracks = await this.getAllSavedAlbumTracks();

      // Dédupliquer par ID
      const trackMap = new Map();
      for (const track of savedTracks) {
        trackMap.set(track.id, track);
      }
      for (const track of playlistTracks) {
        trackMap.set(track.id, track);
      }
      for (const track of albumTracks) {
        trackMap.set(track.id, track);
      }

      const allTracks = Array.from(trackMap.values());

      console.log(`\n📊 Résumé :`);
      console.log(`   • Saved tracks: ${savedTracks.length}`);
      console.log(`   • Playlist tracks: ${playlistTracks.length}`);
      console.log(`   • Album tracks: ${albumTracks.length}`);
      console.log(`   • Total unique: ${allTracks.length}`);

      return allTracks;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des tracks:', error.message);
      throw error;
    }
  }
}

module.exports = TrackFetcher;
