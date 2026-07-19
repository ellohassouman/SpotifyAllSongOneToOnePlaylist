require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const SpotifyClient = require('./spotify');

const CACHE_FILE = path.join(__dirname, '..', '.albumCandidates.json');

function loadCandidates() {
  if (!fs.existsSync(CACHE_FILE)) {
    console.error('❌ Erreur: .albumCandidates.json introuvable.');
    console.log('\n📝 Exécutez d\'abord: npm run albums:list\n');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
}

function saveCandidates(candidates) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(candidates, null, 2));
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  if (!process.env.SPOTIFY_REFRESH_TOKEN || !process.env.SPOTIFY_USER_ID) {
    console.error('❌ Erreur: SPOTIFY_REFRESH_TOKEN ou SPOTIFY_USER_ID non trouvé dans .env');
    console.log('\n📝 Exécutez d\'abord: npm run auth\n');
    process.exit(1);
  }

  const candidates = loadCandidates();
  const spotify = new SpotifyClient();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  let deleted = 0;
  let kept = 0;

  console.log(`
================================================================================
💿 Revue des albums candidats
================================================================================
`);

  try {
    for (const album of candidates) {
      if (album.decision) continue;

      const year = album.releaseDate ? album.releaseDate.slice(0, 4) : '????';
      console.log(`\n💿 ${album.artist} — ${album.name} (${album.totalTracks} titres, ${year})`);
      console.log(`   ${album.spotifyUrl}`);

      const answer = (await ask(rl, '[s] supprimer  [g] garder  [q] quitter : ')).trim().toLowerCase();

      if (answer === 'q') {
        console.log('\n⏹️  Revue interrompue, progression sauvegardée.');
        break;
      } else if (answer === 's') {
        try {
          await spotify.delete('/me/albums', { ids: album.id });
          album.decision = 'deleted';
          deleted++;
          console.log('   🗑️  Supprimé.');
        } catch (error) {
          console.log('   ❌ Échec de la suppression, album laissé en attente.');
        }
      } else if (answer === 'g') {
        album.decision = 'kept';
        kept++;
        console.log('   ✅ Gardé.');
      } else {
        console.log('   ⚠️  Réponse non reconnue, album laissé en attente.');
        continue;
      }

      saveCandidates(candidates);
    }
  } finally {
    rl.close();
  }

  const remaining = candidates.filter((a) => !a.decision).length;
  console.log(`
================================================================================
📊 Résumé : ${deleted} supprimé(s), ${kept} gardé(s), ${remaining} restant(s)
================================================================================
`);
}

main();
