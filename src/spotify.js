const axios = require('axios');
const querystring = require('querystring');

class SpotifyClient {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  /**
   * Obtenir un token d'accès valide (accédé automatiquement si expiré)
   */
  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    console.log('⏳ Renouvellement du token d\'accès...');
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Expirer 5 minutes avant la durée réelle (marge de sécurité)
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 300) * 1000;
      console.log(`✅ Token renouvelé (expire dans ${Math.round((this.tokenExpiresAt - Date.now()) / 1000 / 60)} min)`);

      return this.accessToken;
    } catch (error) {
      console.error('❌ Erreur lors du renouvellement du token :', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Faire une requête GET à l'API Spotify
   */
  async get(endpoint, params = {}) {
    const token = await this.getAccessToken();
    try {
      const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur GET ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Faire une requête POST à l'API Spotify
   */
  async post(endpoint, data = {}) {
    const token = await this.getAccessToken();
    try {
      const response = await axios.post(`https://api.spotify.com/v1${endpoint}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur POST ${endpoint}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Paginer sur un endpoint et retourner tous les résultats
   */
  async paginate(endpoint, params = {}, itemsKey = 'items') {
    const allItems = [];
    let offset = 0;
    const limit = 50; // Max par page

    while (true) {
      try {
        const response = await this.get(endpoint, { ...params, offset, limit });
        const items = response[itemsKey] || [];
        allItems.push(...items);

        // Vérifier s'il y a plus de résultats
        if (!response.next || items.length < limit) {
          break;
        }

        offset += limit;
      } catch (error) {
        console.error(`❌ Erreur lors de la pagination ${endpoint}:`, error.message);
        throw error;
      }
    }

    return allItems;
  }
}

module.exports = SpotifyClient;
