/* ============================================
   PAGE: PROFILE — profile.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLogin()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderProfile();
});

function renderProfile() {
  const page = document.getElementById('page');
  const user = Auth.user();

  const myTracks = DB.tracksByOwner(user.id);
  const approved = myTracks.filter(t => t.status === 'approved');
  const pending  = myTracks.filter(t => t.status === 'pending');
  const playlists = Playlists.myPlaylists();

  const bannerStyle = user.banner
    ? `style="background-image:url(${user.banner})"`
    : '';

  const avatarContent = user.avatar
    ? ''
    : UI.escapeHTML(user.username[0].toUpperCase());

  const avatarStyle = user.avatar
    ? `style="background-image:url(${user.avatar})"`
    : '';

  page.innerHTML = `
    <div class="profile-banner ${user.banner ? 'has-image' : ''}" ${bannerStyle}></div>

    <div class="profile-header">
      <div class="avatar-xl ${user.avatar ? 'has-image' : ''}" ${avatarStyle}>
        ${avatarContent}
      </div>
      <div class="info">
        <h1>${UI.escapeHTML(user.username)}</h1>
        <span class="role-badge">${user.role === 'artist' ? 'Исполнитель' : 'Слушатель'}</span>
        <div class="email">${UI.escapeHTML(user.email || '')}</div>
        <div class="stats">
          ${user.role === 'artist' ? `
            <div class="stat">
              <div class="stat-value">${approved.length}</div>
              <div class="stat-label">Опубликовано</div>
            </div>
            <div class="stat">
              <div class="stat-value">${pending.length}</div>
              <div class="stat-label">На модерации</div>
            </div>
          ` : ''}
          <div class="stat">
            <div class="stat-value">${playlists.length}</div>
            <div class="stat-label">Плейлистов</div>
          </div>
        </div>

        <div class="actions" style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
          <a class="btn-ghost" href="library.html">
            <span data-icon="library"></span>Моя музыка
          </a>
          ${user.role === 'artist' ? `
            <a class="btn-ghost" href="upload.html">
              <span data-icon="upload"></span>Загрузить трек
            </a>
          ` : ''}
          <a class="btn-ghost" href="settings.html">
            <span data-icon="settings"></span>Настройки
          </a>
          <button class="btn-ghost" id="logoutBtn">
            <span data-icon="logout"></span>Выйти
          </button>
        </div>
      </div>
    </div>

    ${user.role === 'artist' && myTracks.length ? `
      <h3>Мои треки</h3>
      ${listHTML(myTracks, true)}
    ` : ''}

    ${playlists.length ? `
      <h3>Мои плейлисты</h3>
      <div class="card-grid">
        ${playlists.map(p => `
          <a class="card glass" href="playlist.html?id=${p.id}">
            <div class="card-cover">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="4" height="18"/>
                <rect x="9" y="3" width="4" height="18"/>
                <path d="M16 5l4 1-3 15-4-1 3-15z"/>
              </svg>
            </div>
            <div class="card-title">${UI.escapeHTML(p.name)}</div>
            <div class="card-sub">${p.trackIds.length} треков</div>
          </a>
        `).join('')}
      </div>
    ` : ''}
  `;

  hydrateIcons(page);

  document.getElementById('logoutBtn').onclick = () => Auth.logout();

  page.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.row-actions')) return;
      if (e.target.closest('a')) return;

      const idx = myTracks.findIndex(x => x.id === row.dataset.track);
      Player.loadQueue(myTracks, idx < 0 ? 0 : idx);
    });
  });
}

function listHTML(tracks, showStatus) {
  return `<div class="track-list">${tracks.map((t, i) => `
    <div class="track-row" data-track="${t.id}">
      <div class="num">${i + 1}</div>
      <a class="row-main" href="track.html?id=${t.id}" style="color:inherit;text-decoration:none">
        <div class="row-title">${UI.escapeHTML(t.title || 'Без названия')}</div>
        <div class="row-artist">${UI.escapeHTML(t.artistName || '')}</div>
      </a>
      ${showStatus ? `<span class="row-status ${t.status}">${
        t.status === 'pending' ? 'На модерации' :
        t.status === 'approved' ? 'Опубликован' :
        t.status === 'rejected' ? 'Отклонён' : t.status
      }</span>` : ''}
    </div>
  `).join('')}</div>`;
}