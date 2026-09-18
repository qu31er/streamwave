/* ============================================
   AUTH GUARD — проверка сессии
   ============================================ */

const Auth = {

  session() { return DB.session(); },

  isGuest() {
    const s = DB.session();
    return !!(s && s.guest);
  },

  user() {
    const s = DB.session();
    if (!s || s.guest) return null;
    return DB.findUser(s.userId);
  },

  /* Гость ИЛИ залогиненный — оба пускаются. Никогда не редиректит. */
  requireLoginOrGuest() {
    const s = DB.session();
    if (!s) {
      DB.setSession({ guest: true, userId: null });
      return true;
    }
    if (s.guest) return true;
    if (!DB.findUser(s.userId)) {
      DB.setSession({ guest: true, userId: null });
      return true;
    }
    return true;
  },

  /* Только залогиненный (не гость). Гостя отправляет в app.html. */
  requireLogin() {
    const u = this.user();
    if (!u) {
      if (!DB.session()) DB.setSession({ guest: true, userId: null });
      location.replace('app.html');
      return false;
    }
    return true;
  },

  /* Только artist. Иначе → app.html */
  requireArtist() {
    const u = this.user();
    if (!u || u.role !== 'artist') {
      if (!DB.session()) DB.setSession({ guest: true, userId: null });
      location.replace('app.html');
      return false;
    }
    return true;
  },

  logout() {
    DB.clearSession();
    location.replace('index.html');
  }
};