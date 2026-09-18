/* ============================================
   STORAGE — эмуляция БД в localStorage
   Все данные хранятся локально в браузере.
   Ключи с префиксом "sw_" (StreamWave).
   ============================================ */

const DB = {

  KEYS: {
    users:     'sw_users',
    session:   'sw_session',
    tracks:    'sw_tracks',
    albums:    'sw_albums',
    playlists: 'sw_playlists',
    settings:  'sw_settings'
  },

  /* ---------- Низкоуровневые операции ---------- */

  _get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn('[DB] Ошибка чтения', key, e);
      return fallback;
    }
  },

  _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[DB] Ошибка записи', key, e);
      // Скорее всего переполнение localStorage (квота ~5 МБ)
      alert('Хранилище переполнено. Удалите старые треки.');
    }
  },

  _remove(key) {
    localStorage.removeItem(key);
  },

  /* ---------- Пользователи ---------- */

  users() {
    return this._get(this.KEYS.users, []);
  },

  saveUsers(list) {
    this._set(this.KEYS.users, list);
  },

  findUser(id) {
    return this.users().find(u => u.id === id) || null;
  },

  findUserByUsername(username) {
    const lc = String(username || '').toLowerCase();
    return this.users().find(u => u.username.toLowerCase() === lc) || null;
  },

  /* ---------- Сессия ---------- */

  session() {
    return this._get(this.KEYS.session, null);
  },

  setSession(session) {
    this._set(this.KEYS.session, session);
  },

  clearSession() {
    this._remove(this.KEYS.session);
  },

  /* ---------- Треки ---------- */

  tracks() {
    return this._get(this.KEYS.tracks, []);
  },

  saveTracks(list) {
    this._set(this.KEYS.tracks, list);
  },

  findTrack(id) {
    return this.tracks().find(t => t.id === id) || null;
  },

  /* Только одобренные треки — для каталога */
  approvedTracks() {
    return this.tracks().filter(t => t.status === 'approved');
  },

  /* Треки конкретного исполнителя */
  tracksByOwner(ownerId) {
    return this.tracks().filter(t => t.ownerId === ownerId);
  },

  /* ---------- Альбомы ---------- */

  albums() {
    return this._get(this.KEYS.albums, []);
  },

  saveAlbums(list) {
    this._set(this.KEYS.albums, list);
  },

  findAlbum(id) {
    return this.albums().find(a => a.id === id) || null;
  },

  /* ---------- Плейлисты ---------- */

  playlists() {
    return this._get(this.KEYS.playlists, []);
  },

  savePlaylists(list) {
    this._set(this.KEYS.playlists, list);
  },

  findPlaylist(id) {
    return this.playlists().find(p => p.id === id) || null;
  },

  /* ---------- Настройки интерфейса ---------- */

  settings() {
    return this._get(this.KEYS.settings, {
      r: 168,
      g: 85,
      b: 247
    });
  },

  saveSettings(s) {
    this._set(this.KEYS.settings, s);
  },

  /* ---------- Утилиты ---------- */

  /* Генерация уникального ID (короткий, читаемый) */
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  /* Полный сброс (для отладки) */
  reset() {
    Object.values(this.KEYS).forEach(k => this._remove(k));
    console.warn('[DB] Все данные сброшены');
  },

  /* Экспорт всех данных в объект (бэкап) */
  export() {
    return {
      users:     this.users(),
      tracks:    this.tracks(),
      albums:    this.albums(),
      playlists: this.playlists(),
      settings:  this.settings(),
      exportedAt: Date.now()
    };
  },

  /* Импорт из объекта (восстановление) */
  import(data) {
    if (!data || typeof data !== 'object') return false;
    if (Array.isArray(data.users))     this.saveUsers(data.users);
    if (Array.isArray(data.tracks))    this.saveTracks(data.tracks);
    if (Array.isArray(data.albums))    this.saveAlbums(data.albums);
    if (Array.isArray(data.playlists)) this.savePlaylists(data.playlists);
    if (data.settings)                 this.saveSettings(data.settings);
    return true;
  }
};

