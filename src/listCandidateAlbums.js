require('dotenv').config();
const fs = require('fs');
const path = require('path');
const SpotifyClient = require('./spotify');
const { findCandidateAlbums } = require('./albumCleaner');

const CACHE_FILE = path.join(__dirname, '..', '.albumCandidates.json');

async function main() {
  console.log(`
================================================================================
💿 Recherche des albums candidats (>3 titres, aucun titre liké)
================================================================================
`);

  if (!process.env.SPOTIFY_REFRESH_TOKEN || !process.env.SPOTIFY_USER_ID) {
    console.error('❌ Erreur: SPOTIFY_REFRESH_TOKEN ou SPOTIFY_USER_ID non trouvé dans .env');
    console.log('\n📝 Exécutez d\'abord: npm run auth\n');
    process.exit(1);
  }

  try {
    const spotify = new SpotifyClient();
    const candidates = await findCandidateAlbums(spotify);

    if (candidates.length === 0) {
      console.log('✅ Aucun album candidat trouvé.');
    } else {
      console.log(`📋 ${candidates.length} album(s) candidat(s) :\n`);
      for (const album of candidates) {
        const year = album.releaseDate ? album.releaseDate.slice(0, 4) : '????';
        console.log(`  💿 ${album.artist} — ${album.name} (${album.totalTracks} titres, ${year})`);
      }
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(candidates, null, 2));
    console.log(`\n💾 Sauvegardé dans ${path.basename(CACHE_FILE)}`);
    console.log(`\n📝 Prochaine étape: npm run albums:delete\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  }
}

main();
