/* ============================================
   PAGE: ARTIST — artist.html?id=...
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  const id = UI.getIdFromURL();
  renderArtist(id);
});

function renderArtist(id) {
  const page = document.getElementById('page');
  const artist = DB.findUser(id);

  if (!artist) {
    page.innerHTML = '<div class="empty">Артист не найден</div>';
    return;
  }

  const me = Auth.user();
  const isMe = me && me.id === artist.id;

  const allTracks = DB.tracksByOwner(id);
  const tracks = isMe ? allTracks : allTracks.filter(t => t.status === 'approved');

  const albums = DB.albums().filter(a => a.ownerId === id);
  const approvedCount = allTracks.filter(t => t.status === 'approved').length;

  const bannerStyle = artist.banner
    ? `style="background-image:url(${artist.banner})"`
    : '';
  const avatarStyle = artist.avatar
    ? `style="background-image:url(${artist.avatar})"`
    : '';
  const avatarContent = artist.avatar
    ? ''
    : UI.escapeHTML(artist.username[0].toUpperCase());

  page.innerHTML = `
    <div class="profile-banner ${artist.banner ? 'has-image' : ''}" ${bannerStyle}></div>

    <div class="profile-header">
      <div class="avatar-xl ${artist.avatar ? 'has-image' : ''}" ${avatarStyle}>
        ${avatarContent}
      </div>
      <div class="info">
        <h1>${UI.escapeHTML(artist.username)}</h1>
        <span class="role-badge">${artist.role === 'artist' ? 'Исполнитель' : 'Слушатель'}</span>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${approvedCount}</div>
            <div class="stat-label">Треков</div>
          </div>
          <div class="stat">
            <div class="stat-value">${albums.length}</div>
            <div class="stat-label">Альбомов</div>
          </div>
        </div>
        ${isMe ? `
          <div class="actions" style="margin-top:8px">
            <a class="btn-ghost" href="settings.html">
              <span data-icon="settings"></span>Настройки
            </a>
          </div>
        ` : ''}
      </div>
    </div>

    ${albums.length ? `
      <h3>Альбомы</h3>
      <div class="card-grid">
        ${albums.map(a => `
          <a class="card glass" href="album.html?id=${a.id}">
            <div class="card-cover"
              ${a.cover ? `style="background-image:url(${a.cover})"` : ''}>
            </div>
            <div class="card-title">${UI.escapeHTML(a.title)}</div>
            <div class="card-sub">${Playlists.tracksInAlbum(a.id).length} треков</div>
          </a>
        `).join('')}
      </div>
    ` : ''}

    <h3>Треки</h3>
    ${tracks.length ? listHTML(tracks, isMe) : '<div class="empty">Треков пока нет</div>'}
  `;

  hydrateIcons(page);
  bindEvents(page, tracks);
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
      <div class="row-actions">
        <button class="icon-btn" data-add="${t.id}" title="В плейлист">
          <span data-icon="plus"></span>
        </button>
      </div>
    </div>
  `).join('')}</div>`;
}

function bindEvents(page, tracks) {
  page.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.row-actions')) return;
      if (e.target.closest('a')) return;

      const idx = tracks.findIndex(x => x.id === row.dataset.track);
      Player.loadQueue(tracks, idx < 0 ? 0 : idx);
    });
  });

  page.querySelectorAll('[data-add]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      openAddToPlaylist(btn.dataset.add);
    };
  });
}

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