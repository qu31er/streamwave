/* ============================================
   PAGE: HOME — app.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderHome();
});

function renderHome() {
  const user = Auth.user();
  const guest = Auth.isGuest();
  const page = document.getElementById('page');
  if (!page) return;

  const approved = DB.approvedTracks();
  const mine = user ? DB.tracksByOwner(user.id) : [];
  const topArtists = getTopArtists(8);

  page.innerHTML = `
    <h1 class="page-title">Stream<span>Wave</span></h1>
    <p class="page-sub">
      ${guest
        ? 'Режим гостя · Слушайте, ищите, открывайте новое'
        : 'Слушайте, собирайте, открывайте новое'}
    </p>

    ${guest ? `
      <div class="glass guest-banner">
        <span>Вы слушаете как гость. </span>
        <a href="index.html">Войти или зарегистрироваться</a>
      </div>
    ` : ''}

    ${topArtists.length ? `
      <h3>Топ исполнителей</h3>
      <div class="artists-carousel-wrap">
        <div class="artists-carousel" id="artistsCarousel">
          ${topArtists.map(a => `
            <a class="artist-card" href="artist.html?id=${a.id}">
              <div class="artist-avatar">${UI.escapeHTML(a.username[0].toUpperCase())}</div>
              <div class="artist-name">${UI.escapeHTML(a.username)}</div>
              <div class="artist-tracks">${a.count} ${plural(a.count, 'трек', 'трека', 'треков')}</div>
            </a>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <h3>Каталог</h3>
    ${approved.length
      ? cardsHTML(approved)
      : '<div class="empty">Пока нет одобренных треков</div>'}

    ${user && user.role === 'artist' && mine.length ? `
      <h3>Мои треки</h3>
      ${listHTML(mine, { showStatus: true })}
    ` : ''}
  `;

  hydrateIcons(page);
  bindTrackEvents(page);

  if (topArtists.length) startArtistsCarousel();
}

/* ============================================
   Топ исполнителей
   ============================================ */
function getTopArtists(limit = 8) {
  const approved = DB.approvedTracks();
  const counts = {};

  approved.forEach(t => {
    if (!t.ownerId) return;
    counts[t.ownerId] = (counts[t.ownerId] || 0) + 1;
  });

  return Object.keys(counts)
    .map(id => {
      const u = DB.findUser(id);
      if (!u) return null;
      return { id, username: u.username, count: counts[id] };
    })
    .filter(Boolean)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/* ============================================
   Автокарусель: скролл каждые 3 секунды
   ============================================ */
let carouselTimer = null;

function startArtistsCarousel() {
  const el = document.getElementById('artistsCarousel');
  if (!el) return;

  if (carouselTimer) clearInterval(carouselTimer);

  carouselTimer = setInterval(() => {
    if (!document.body.contains(el)) {
      clearInterval(carouselTimer);
      carouselTimer = null;
      return;
    }

    const first = el.firstElementChild;
    if (!first) return;

    const cardWidth = first.offsetWidth + 12;
    const maxScroll = el.scrollWidth - el.clientWidth;

    if (el.scrollLeft >= maxScroll - 4) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      el.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  }, 3000);
}

/* ============================================
   Русские склонения
   ============================================ */
function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* ============================================
   Карточки треков
   ============================================ */
function cardsHTML(tracks) {
  return `<div class="card-grid">${tracks.map(t => `
    <div class="card glass" data-track="${t.id}">
      <a href="track.html?id=${t.id}" class="card-cover"
         ${t.cover ? `style="background-image:url(${t.cover})"` : ''}>
      </a>
      <a href="track.html?id=${t.id}" class="card-title">${UI.escapeHTML(t.title || 'Без названия')}</a>
      <a href="artist.html?id=${t.ownerId}" class="card-sub">${UI.escapeHTML(t.artistName || '')}</a>
      <button class="play-fab" data-play="${t.id}">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path d="M6 4l14 8-14 8V4z"/>
        </svg>
      </button>
    </div>
  `).join('')}</div>`;
}

/* ============================================
   Список треков
   ============================================ */
function listHTML(tracks, opts = {}) {
  return `<div class="track-list">${tracks.map((t, i) => `
    <div class="track-row" data-track="${t.id}">
      <div class="num">${i + 1}</div>
      <a class="row-main" href="track.html?id=${t.id}" style="color:inherit;text-decoration:none">
        <div class="row-title">${UI.escapeHTML(t.title || 'Без названия')}</div>
        <div class="row-artist">${UI.escapeHTML(t.artistName || '')}</div>
      </a>
      ${opts.showStatus ? `<span class="row-status ${t.status}">${
        t.status === 'pending' ? 'На модерации' :
        t.status === 'approved' ? 'Опубликован' :
        t.status === 'rejected' ? 'Отклонён' : t.status
      }</span>` : ''}
      <div class="row-actions">
        <button class="icon-btn" title="Добавить в плейлист" data-add="${t.id}">
          <span data-icon="plus"></span>
        </button>
      </div>
    </div>
  `).join('')}</div>`;
}

/* ============================================
   События на треках
   ============================================ */
function bindTrackEvents(container) {
  container.querySelectorAll('[data-play]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.play;
      const approved = DB.approvedTracks();
      const idx = approved.findIndex(x => x.id === id);
      if (idx >= 0) Player.loadQueue(approved, idx);
    };
  });

  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.row-actions')) return;
      if (e.target.closest('a')) return;

      const id = row.dataset.track;
      const t = DB.findTrack(id);
      if (!t || !t.audio) return;

      const ids = [...container.querySelectorAll('.track-row')].map(x => x.dataset.track);
      const list = ids.map(i => DB.findTrack(i)).filter(Boolean);
      const idx = list.findIndex(x => x.id === id);
      Player.loadQueue(list, idx < 0 ? 0 : idx);
    });
  });

  container.querySelectorAll('[data-add]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openAddToPlaylist(btn.dataset.add);
    };
  });
}

/* ============================================
   Модалка «Добавить в плейлист»
   ============================================ */
function openAddToPlaylist(trackId) {
  if (Auth.isGuest()) {
    UI.toast('Войдите, чтобы создавать плейлисты');
    return;
  }

  const pls = Playlists.myPlaylists();

  if (!pls.length) {
    UI.openModal(`
      <h2>Нет плейлистов</h2>
      <div class="form-row">
        <label>Создать новый</label>
        <input id="newPlName" placeholder="Название">
      </div>
      <div class="modal-actions">
        <button class="btn-primary" id="createAndAdd">Создать и добавить</button>
        <button class="btn-ghost" id="closeM">Отмена</button>
      </div>
    `);
    document.getElementById('closeM').onclick = () => UI.closeModal();
    document.getElementById('createAndAdd').onclick = () => {
      const name = document.getElementById('newPlName').value.trim();
      if (!name) return;
      const p = Playlists.create(name);
      Playlists.addTrack(p.id, trackId);
      UI.closeModal();
      UI.toast('Добавлено в плейлист');
    };
    return;
  }

  UI.openModal(`
    <h2>Добавить в плейлист</h2>
    <div class="track-list">
      ${pls.map(p => `
        <div class="track-row" data-target="${p.id}" style="grid-template-columns:1fr auto">
          <div class="row-main">
            <div class="row-title">${UI.escapeHTML(p.name)}</div>
            <div class="row-artist">${p.trackIds.length} треков</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="closeM">Закрыть</button>
    </div>
  `);

  document.getElementById('closeM').onclick = () => UI.closeModal();
  document.querySelectorAll('[data-target]').forEach(el => {
    el.onclick = () => {
      Playlists.addTrack(el.dataset.target, trackId);
      UI.closeModal();
      UI.toast('Добавлено в плейлист');
    };
  });
}