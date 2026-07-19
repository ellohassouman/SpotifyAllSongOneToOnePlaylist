/**
 * Détection des albums sauvegardés candidats au nettoyage :
 * >3 titres et aucun titre présent dans les Liked Songs.
 */

async function findCandidateAlbums(spotifyClient) {
  const savedAlbums = await spotifyClient.paginate('/me/albums', {}, 'items');
  const bigAlbums = savedAlbums
    .map((item) => item.album)
    .filter((album) => album.total_tracks > 3);

  const savedTracks = await spotifyClient.paginate('/me/tracks', {}, 'items');
  const likedTrackIds = new Set(savedTracks.map((item) => item.track.id));

  const candidates = [];

  for (const album of bigAlbums) {
    const albumTracks = await spotifyClient.paginate(`/albums/${album.id}/tracks`, {}, 'items');
    const hasLikedTrack = albumTracks.some((track) => likedTrackIds.has(track.id));

    if (!hasLikedTrack) {
      candidates.push({
        id: album.id,
        name: album.name,
        artist: album.artists[0]?.name || 'Unknown',
        totalTracks: album.total_tracks,
        releaseDate: album.release_date,
        spotifyUrl: `https://open.spotify.com/album/${album.id}`,
      });
    }
  }

  return candidates;
}

module.exports = { findCandidateAlbums };
