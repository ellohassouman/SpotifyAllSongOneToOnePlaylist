require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const querystring = require('querystring');

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  SPOTIFY_REDIRECT_URI,
} = process.env;

if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error('❌ Erreur : SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET et SPOTIFY_REDIRECT_URI doivent être définis dans .env');
  process.exit(1);
}

// Générer un code de vérification aléatoire pour PKCE (sécurité)
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const state = generateRandomString(16);
const authorizationUrl = `https://accounts.spotify.com/authorize?${querystring.stringify({
  client_id: SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: SPOTIFY_REDIRECT_URI,
  state,
  scope: [
    'playlist-modify-private',
    'playlist-modify-public',
    'user-library-read',
    'user-read-private',
    'user-read-email',
  ].join(' '),
})}`;

console.log(`
================================================================================
🎵 Authentification Spotify - Setup Initial
================================================================================

1️⃣  Cliquez sur ce lien pour vous authentifier auprès de Spotify :

   ${authorizationUrl}

2️⃣  Vous serez redirigé vers une page de callback après l'authentification.

3️⃣  L'authentification se complètera automatiquement.

Attente du callback...
================================================================================
`);

// Créer un mini serveur pour capturer le callback
const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback')) {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const code = urlParams.get('code');
    const returnedState = urlParams.get('state');

    if (!code || returnedState !== state) {
      res.writeHead(400);
      res.end('Erreur d\'authentification : code ou state invalide');
      console.error('❌ Erreur d\'authentification : code ou state invalide');
      server.close();
      process.exit(1);
    }

    try {
      // Échanger le code pour un access token et refresh token
      console.log('\n⏳ Échange du code pour les tokens...');
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        querystring.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          client_id: SPOTIFY_CLIENT_ID,
          client_secret: SPOTIFY_CLIENT_SECRET,
        }),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = response.data;

      // Récupérer l'user ID
      console.log('⏳ Récupération de votre ID utilisateur...');
      const userResponse = await axios.get('https://api.spotify.com/v1/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const userId = userResponse.data.id;
      const userEmail = userResponse.data.email;

      // Sauvegarder dans .env
      const envPath = path.join(__dirname, '../.env');
      let envContent = '';

      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }

      // Mettre à jour ou ajouter les variables
      const updateEnv = (content, key, value) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(content)) {
          return content.replace(regex, `${key}=${value}`);
        }
        return content + (content ? '\n' : '') + `${key}=${value}`;
      };

      envContent = updateEnv(envContent, 'SPOTIFY_REFRESH_TOKEN', refresh_token);
      envContent = updateEnv(envContent, 'SPOTIFY_USER_ID', userId);

      fs.writeFileSync(envPath, envContent, 'utf-8');

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0f0f0; }
              .container { background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
              h1 { color: #1DB954; }
              .success { color: #1DB954; font-size: 18px; }
              .info { color: #555; margin: 10px 0; }
              code { background-color: #f5f5f5; padding: 10px; display: block; margin: 10px 0; border-radius: 4px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ Authentification réussie !</h1>
              <p class="success">Vous êtes maintenant authentifié auprès de Spotify.</p>
              <p class="info">
                <strong>Utilisateur :</strong> ${userEmail}<br>
                <strong>User ID :</strong> ${userId}
              </p>
              <p class="info">Vos tokens ont été sauvegardés dans <code>.env</code></p>
              <p class="info">Vous pouvez maintenant fermer cette fenêtre et exécuter :</p>
              <code>npm run sync</code>
            </div>
          </body>
        </html>
      `);

      console.log(`
✅ Authentification réussie !
   Email: ${userEmail}
   User ID: ${userId}
   
✨ Les credentials ont été sauvegardés dans .env

📝 Prochaine étape: Exécutez "npm run sync" pour synchroniser vos tracks
      `);

      server.close();
    } catch (error) {
      console.error('❌ Erreur lors de l\'échange du token :', error.response?.data || error.message);
      res.writeHead(500);
      res.end('Erreur lors de l\'authentification');
      server.close();
      process.exit(1);
    }
  }
});

server.listen(3000, () => {
  console.log('Serveur d\'authentification lancé sur http://localhost:3000');
});
