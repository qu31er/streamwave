/* ============================================
   PAGE: ALBUM — album.html?id=...
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  const id = UI.getIdFromURL();
  renderAlbum(id);
});

function renderAlbum(id) {
  const page = document.getElementById('page');
  const album = DB.findAlbum(id);

  if (!album) {
    page.innerHTML = '<div class="empty">Альбом не найден</div>';
    return;
  }

  const owner = DB.findUser(album.ownerId);
  const user = Auth.user();
  const isOwner = user && album.ownerId === user.id;

  const tracks = Playlists.tracksInAlbum(id);

  page.innerHTML = `
    <a class="back-link" href="artist.html?id=${album.ownerId}">
      <span data-icon="back"></span>${UI.escapeHTML(owner?.username || 'Артист')}
    </a>

    <div class="page-header">
      <div class="cover-lg"
        ${album.cover ? `style="background-image:url(${album.cover})"` : ''}>
      </div>
      <div class="meta">
        <div class="eyebrow">Альбом</div>
        <h1>${UI.escapeHTML(album.title)}</h1>
        <div class="sub">${UI.escapeHTML(owner?.username || '')} · ${tracks.length} треков</div>
        <div class="actions">
          ${tracks.length ? `
            <button class="btn-ghost" id="playAll">
              <span data-icon="play"></span>Играть всё
            </button>
          ` : ''}
          ${isOwner ? `
            <button class="btn-ghost" id="renameBtn">
              <span data-icon="edit"></span>Переименовать
            </button>
            <button class="btn-ghost" id="delBtn">
              <span data-icon="trash"></span>Удалить
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    ${tracks.length ? listHTML(tracks) : '<div class="empty">В альбоме пусто</div>'}
  `;

  hydrateIcons(page);
  bindEvents(page, id, tracks, isOwner);
}

function listHTML(tracks) {
  return `<div class="track-list">${tracks.map((t, i) => `
    <div class="track-row" data-track="${t.id}">
      <div class="num">${i + 1}</div>
      <a class="row-main" href="track.html?id=${t.id}" style="color:inherit;text-decoration:none">
        <div class="row-title">${UI.escapeHTML(t.title || 'Без названия')}</div>
        <div class="row-artist">${UI.escapeHTML(t.artistName || '')}</div>
      </a>
      <div class="row-actions">
        <button class="icon-btn" data-add="${t.id}" title="В плейлист">
          <span data-icon="plus"></span>
        </button>
      </div>
    </div>
  `).join('')}</div>`;
}

function bindEvents(page, albumId, tracks, isOwner) {
  const playAll = document.getElementById('playAll');
  if (playAll) {
    playAll.onclick = () => {
      if (tracks.length) Player.loadQueue(tracks, 0);
    };
  }

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

  if (isOwner) {
    const renameBtn = document.getElementById('renameBtn');
    const delBtn = document.getElementById('delBtn');

    if (renameBtn) {
      renameBtn.onclick = () => {
        UI.openModal(`
          <h2>Переименовать</h2>
          <div class="form-row">
            <label>Название</label>
            <input id="newName" value="${UI.escapeHTML(DB.findAlbum(albumId).title)}">
          </div>
          <div class="modal-actions">
            <button class="btn-primary" id="saveName">Сохранить</button>
            <button class="btn-ghost" id="closeM">Отмена</button>
          </div>
        `);
        document.getElementById('closeM').onclick = () => UI.closeModal();
        document.getElementById('saveName').onclick = () => {
          const v = document.getElementById('newName').value.trim();
          if (!v) return;
          Playlists.renameAlbum(albumId, v);
          UI.closeModal();
          UI.toast('Переименовано');
          renderAlbum(albumId);
        };
      };
    }

    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm('Удалить альбом? Треки останутся, но отвяжутся от альбома.')) return;
        Playlists.deleteAlbum(albumId);
        location.href = 'albums.html';
      };
    }
  }
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