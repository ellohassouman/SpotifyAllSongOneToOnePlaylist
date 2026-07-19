/**
 * Module pour gérer la playlist cible
 * - Créer ou récupérer la playlist "All My Songs"
 * - Ajouter les tracks avec déduplication
 * - Détecter les suppressions manuelles et les exclure des synchos futures
 */

const fs = require('fs');
const path = require('path');

const PLAYLIST_NAME = 'All My Songs';
const CACHE_FILE = path.join(__dirname, '..', '.playlistCache.json');
const SNAPSHOT_FILE = path.join(__dirname, '..', '.trackSnapshot.json');
const EXCLUDED_FILE = path.join(__dirname, '..', '.excludedTracks.json');

function loadPlaylistCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.log('⚠️ Attention: impossible de lire le cache playlist');
  }
  return { playlistId: null, createdAt: null };
}

function savePlaylistCache(playlistId) {
  try {
    const existing = loadPlaylistCache();
    fs.writeFileSync(
      CACHE_FILE,
      JSON.stringify(
        {
          playlistId,
          createdAt: existing.createdAt || new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch (error) {
    console.log('⚠️ Attention: impossible de sauvegarder le cache playlist');
  }
}

function loadSnapshot() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const data = fs.readFileSync(SNAPSHOT_FILE, 'utf8');
      return JSON.parse(data); // array of { uri, name, artist }
    }
  } catch (error) {
    console.log('⚠️ Impossible de lire le snapshot');
  }
  return null;
}

function saveSnapshot(tracks) {
  try {
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(tracks, null, 2));
  } catch (error) {
    console.log('⚠️ Impossible de sauvegarder le snapshot');
  }
}

function loadExcluded() {
  try {
    if (fs.existsSync(EXCLUDED_FILE)) {
      const data = fs.readFileSync(EXCLUDED_FILE, 'utf8');
      return JSON.parse(data); // array of { uri, name, artist, excludedAt }
    }
  } catch (error) {
    console.log('⚠️ Impossible de lire la liste d\'exclusion');
  }
  return [];
}

function saveExcluded(excluded) {
  try {
    fs.writeFileSync(EXCLUDED_FILE, JSON.stringify(excluded, null, 2));
  } catch (error) {
    console.log('⚠️ Impossible de sauvegarder la liste d\'exclusion');
  }
}

class PlaylistManager {
  constructor(spotifyClient, userId) {
    this.spotify = spotifyClient;
    this.userId = userId;
    this.playlistId = null;
    this.existingTrackUris = new Set();
    this.currentTracks = []; // { uri, name, artist } — état actuel de la playlist
    this.excluded = loadExcluded();
    this.excludedUris = new Set(this.excluded.map((e) => e.uri));
  }

  /**
   * Trouver ou créer la playlist cible
   */
  async findOrCreatePlaylist() {
    console.log(`\n🎯 Recherche ou création de la playlist "${PLAYLIST_NAME}"...\n`);

    try {
      const cache = loadPlaylistCache();
      if (cache.playlistId) {
        console.log(`📦 Vérification du cache playlist...`);
        try {
          await this.spotify.get(`/playlists/${cache.playlistId}`, { fields: 'id,name' });
          console.log(`✅ Playlist trouvée dans le cache (ID: ${cache.playlistId})`);
          this.playlistId = cache.playlistId;
          await this.loadExistingTracks();
          return this.playlistId;
        } catch (error) {
          console.log(`⚠️ Playlist en cache introuvable (API), relance la recherche...`);
        }
      }

      console.log(`🔍 Recherche dans vos playlists...`);
      const playlists = await this.spotify.paginate('/me/playlists', {}, 'items');
      console.log(`   Trouvé ${playlists.length} playlists`);

      let targetPlaylist = playlists.find(
        (p) => p.name && p.name.trim().toLowerCase() === PLAYLIST_NAME.toLowerCase()
      );

      if (targetPlaylist) {
        console.log(`✅ Playlist "${PLAYLIST_NAME}" trouvée (ID: ${targetPlaylist.id})`);
        this.playlistId = targetPlaylist.id;
        savePlaylistCache(this.playlistId);
        console.log(`💾 Playlist ID sauvegardé en cache`);
      } else {
        console.log(`📝 Playlist "${PLAYLIST_NAME}" non trouvée, création en cours...`);
        const newPlaylist = await this.spotify.post(`/users/${this.userId}/playlists`, {
          name: PLAYLIST_NAME,
          description:
            'Playlist contenant TOUS les tracks de votre bibliothèque (saved songs + toutes les playlists) - Créée automatiquement',
          public: false,
        });
        console.log(`✅ Playlist "${PLAYLIST_NAME}" créée (ID: ${newPlaylist.id})`);
        this.playlistId = newPlaylist.id;
        savePlaylistCache(this.playlistId);
        console.log(`💾 ID de la nouvelle playlist sauvegardé`);
        return this.playlistId;
      }

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
   * Charger les tracks existants et détecter les suppressions manuelles
   */
  async loadExistingTracks() {
    try {
      const tracks = await this.spotify.paginate(
        `/playlists/${this.playlistId}/tracks`,
        {},
        'items'
      );

      this.currentTracks = [];
      for (const item of tracks) {
        if (item.track && item.track.uri) {
          this.existingTrackUris.add(item.track.uri);
          this.currentTracks.push({
            uri: item.track.uri,
            name: item.track.name,
            artist: item.track.artists?.[0]?.name || 'Unknown',
          });
        }
      }

      console.log(`📊 La playlist contient actuellement ${this.currentTracks.length} tracks`);

      // Détecter les suppressions manuelles depuis le dernier snapshot
      const snapshot = loadSnapshot();
      if (snapshot) {
        const currentUriSet = new Set(this.currentTracks.map((t) => t.uri));
        const newlyRemoved = snapshot.filter(
          (t) => !currentUriSet.has(t.uri) && !this.excludedUris.has(t.uri)
        );

        if (newlyRemoved.length > 0) {
          console.log(
            `\n🚫 ${newlyRemoved.length} track(s) supprimés manuellement détectés :`
          );
          for (const track of newlyRemoved) {
            console.log(`   • ${track.name} — ${track.artist}`);
            this.excluded.push({ ...track, excludedAt: new Date().toISOString() });
            this.excludedUris.add(track.uri);
          }
          saveExcluded(this.excluded);
          console.log(`   💾 Ajoutés à la liste d'exclusion permanente\n`);
        }
      } else {
        console.log(
          `ℹ️  Première synchro avec snapshot — les suppressions futures seront détectées automatiquement`
        );
      }

      if (this.excluded.length > 0) {
        console.log(`🚫 ${this.excluded.length} track(s) en liste d'exclusion permanente`);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des tracks existants:', error.message);
      throw error;
    }
  }

  /**
   * Ajouter les tracks à la playlist (par batch de 100), en excluant les tracks bannis
   */
  async addTracks(tracks) {
    console.log(`\n📤 Ajout des tracks à la playlist...\n`);

    if (!this.playlistId) {
      throw new Error('Playlist ID non défini. Appelez findOrCreatePlaylist() d\'abord.');
    }

    // Filtrer les tracks exclus et ceux déjà présents
    const excludedInBatch = tracks.filter((t) => this.excludedUris.has(t.uri));
    const eligible = tracks.filter((t) => !this.excludedUris.has(t.uri));
    const tracksToAdd = eligible.filter((t) => !this.existingTrackUris.has(t.uri));

    console.log(`📊 Résumé :`);
    console.log(`   • Tracks au total: ${tracks.length}`);
    console.log(`   • Exclus (liste permanente): ${excludedInBatch.length}`);
    console.log(`   • Déjà dans la playlist: ${eligible.length - tracksToAdd.length}`);
    console.log(`   • À ajouter: ${tracksToAdd.length}`);

    let added = 0;
    let failed = 0;
    const successfullyAdded = [];
    const batchSize = 100;

    if (tracksToAdd.length === 0) {
      console.log('✅ Tous les tracks éligibles sont déjà dans la playlist !');
    } else {
      for (let i = 0; i < tracksToAdd.length; i += batchSize) {
        const batch = tracksToAdd.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(tracksToAdd.length / batchSize);

        console.log(`⏳ Batch ${batchNumber}/${totalBatches} (${batch.length} tracks)...`);

        try {
          const uris = batch.map((track) => track.uri);
          await this.spotify.post(`/playlists/${this.playlistId}/tracks`, { uris });
          successfullyAdded.push(...batch);
          added += batch.length;
          console.log(`   ✅ ${batch.length} tracks ajoutés`);
        } catch (error) {
          console.error(`   ❌ Erreur lors de l'ajout du batch:`, error.message);
          failed += batch.length;
        }
      }
    }

    // Sauvegarder le snapshot = état complet de la playlist après synchro
    const snapshotTracks = [...this.currentTracks, ...successfullyAdded];
    saveSnapshot(snapshotTracks);
    savePlaylistCache(this.playlistId);
    console.log(`\n💾 Snapshot sauvegardé (${snapshotTracks.length} tracks)`);

    console.log(`\n📊 Résumé d'ajout :`);
    console.log(`   • Ajoutés: ${added}`);
    console.log(`   • Échoués: ${failed}`);
    console.log(`   • Ignorés (déjà présents): ${eligible.length - tracksToAdd.length}`);
    console.log(`   • Ignorés (exclusion permanente): ${excludedInBatch.length}`);

    return {
      added,
      skipped: eligible.length - tracksToAdd.length,
      excluded: excludedInBatch.length,
      failed,
    };
  }
}

module.exports = PlaylistManager;
