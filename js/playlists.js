/* ============================================
   PLAYLISTS — плейлисты и альбомы
   ============================================ */

const Playlists = {

  /* ---------- Плейлисты ---------- */

  myPlaylists() {
    const u = Auth.user();
    if (!u) return [];
    return DB.playlists().filter(p => p.ownerId === u.id);
  },

  create(name) {
    const u = Auth.user();
    const p = {
      id: DB.uid(),
      ownerId: u.id,
      name,
      trackIds: [],
      createdAt: Date.now()
    };
    const all = DB.playlists();
    all.push(p);
    DB.savePlaylists(all);
    return p;
  },

  rename(id, newName) {
    const all = DB.playlists();
    const p = all.find(x => x.id === id);
    if (!p) return;
    p.name = newName;
    DB.savePlaylists(all);
  },

  delete(id) {
    DB.savePlaylists(DB.playlists().filter(p => p.id !== id));
  },

  addTrack(playlistId, trackId) {
    const all = DB.playlists();
    const p = all.find(x => x.id === playlistId);
    if (!p) return false;
    if (p.trackIds.includes(trackId)) return false;
    p.trackIds.push(trackId);
    DB.savePlaylists(all);
    return true;
  },

  removeTrack(playlistId, trackId) {
    const all = DB.playlists();
    const p = all.find(x => x.id === playlistId);
    if (!p) return;
    p.trackIds = p.trackIds.filter(id => id !== trackId);
    DB.savePlaylists(all);
  },

  tracksOf(playlistId) {
    const p = DB.playlists().find(x => x.id === playlistId);
    if (!p) return [];
    const all = DB.tracks();
    return p.trackIds.map(id => all.find(t => t.id === id)).filter(Boolean);
  },

  /* ---------- Альбомы ---------- */

  myAlbums() {
    const u = Auth.user();
    if (!u) return [];
    return DB.albums().filter(a => a.ownerId === u.id);
  },

  createAlbum(title, cover = null) {
    const u = Auth.user();
    const a = {
      id: DB.uid(),
      ownerId: u.id,
      title,
      cover,
      createdAt: Date.now()
    };
    const all = DB.albums();
    all.push(a);
    DB.saveAlbums(all);
    return a;
  },

  renameAlbum(id, newTitle) {
    const all = DB.albums();
    const a = all.find(x => x.id === id);
    if (!a) return;
    a.title = newTitle;
    DB.saveAlbums(all);
  },

  deleteAlbum(id) {
    /* Отвязываем треки от альбома */
    const tracks = DB.tracks();
    tracks.forEach(t => {
      if (t.albumId === id) t.albumId = null;
    });
    DB.saveTracks(tracks);
    DB.saveAlbums(DB.albums().filter(a => a.id !== id));
  },

  tracksInAlbum(albumId) {
    return DB.tracks().filter(t =>
      t.albumId === albumId && t.status === 'approved'
    );
  }
};

