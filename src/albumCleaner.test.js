const test = require('node:test');
const assert = require('node:assert/strict');
const { findCandidateAlbums } = require('./albumCleaner');

function makeFakeSpotify({ albums = [], likedTracks = [], albumTracksMap = {} }) {
  return {
    paginate: async (endpoint) => {
      if (endpoint === '/me/albums') return albums;
      if (endpoint === '/me/tracks') return likedTracks;
      const match = endpoint.match(/^\/albums\/([^/]+)\/tracks$/);
      if (match) return albumTracksMap[match[1]] || [];
      throw new Error(`unexpected endpoint: ${endpoint}`);
    },
  };
}

test('exclut les albums avec 3 titres ou moins', async () => {
  const spotify = makeFakeSpotify({
    albums: [
      { album: { id: 'a1', name: 'EP Court', artists: [{ name: 'Artiste A' }], total_tracks: 3, release_date: '2020-01-01' } },
    ],
    likedTracks: [],
    albumTracksMap: { a1: [{ id: 't1' }, { id: 't2' }, { id: 't3' }] },
  });

  const result = await findCandidateAlbums(spotify);
  assert.deepEqual(result, []);
});

test('exclut les albums ayant au moins un titre liké', async () => {
  const spotify = makeFakeSpotify({
    albums: [
      { album: { id: 'a2', name: 'Album Aimé', artists: [{ name: 'Artiste B' }], total_tracks: 5, release_date: '2019-06-15' } },
    ],
    likedTracks: [{ track: { id: 't10' } }],
    albumTracksMap: { a2: [{ id: 't9' }, { id: 't10' }, { id: 't11' }, { id: 't12' }, { id: 't13' }] },
  });

  const result = await findCandidateAlbums(spotify);
  assert.deepEqual(result, []);
});

test('retient un album >3 titres sans aucun titre liké, avec la bonne forme', async () => {
  const spotify = makeFakeSpotify({
    albums: [
      { album: { id: 'a3', name: 'OK Computer', artists: [{ name: 'Radiohead' }], total_tracks: 12, release_date: '1997-05-21' } },
    ],
    likedTracks: [{ track: { id: 'other-track' } }],
    albumTracksMap: { a3: [{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }, { id: 'x4' }] },
  });

  const result = await findCandidateAlbums(spotify);
  assert.deepEqual(result, [
    {
      id: 'a3',
      name: 'OK Computer',
      artist: 'Radiohead',
      totalTracks: 12,
      releaseDate: '1997-05-21',
      spotifyUrl: 'https://open.spotify.com/album/a3',
    },
  ]);
});
