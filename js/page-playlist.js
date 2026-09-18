/* ============================================
   PAGE: PLAYLIST — playlist.html?id=...
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLogin()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  const id = UI.getIdFromURL();
  renderPlaylist(id);
});

function renderPlaylist(id) {
  const page = document.getElementById('page');
  const pl = DB.findPlaylist(id);

  if (!pl) {
    page.innerHTML = '<div class="empty">Плейлист не найден</div>';
    return;
  }

  const user = Auth.user();
  const isOwner = user && pl.ownerId === user.id;

  const tracks = Playlists.tracksOf(id);

  page.innerHTML = `
    <a class="back-link" href="library.html">
      <span data-icon="back"></span>Моя музыка
    </a>

    <div class="page-header">
      <div class="cover-lg"></div>
      <div class="meta">
        <div class="eyebrow">Плейлист</div>
        <h1>${UI.escapeHTML(pl.name)}</h1>
        <div class="sub">${tracks.length} треков</div>
        <div class="actions">
          ${tracks.length ? `
            <button class="btn-ghost" id="playAll">
              <span data-icon="play"></span>Играть всё
            </button>
          ` : ''}
          ${isOwner ? `
            <button class="btn-ghost" id="renamePlBtn">
              <span data-icon="edit"></span>Переименовать
            </button>
            <button class="btn-ghost" id="delPlBtn">
              <span data-icon="trash"></span>Удалить
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    ${tracks.length ? listHTML(tracks, isOwner) : '<div class="empty">В плейлисте пусто</div>'}
  `;

  hydrateIcons(page);
  bindEvents(page, id, tracks, isOwner);
}

function listHTML(tracks, isOwner) {
  return `<div class="track-list">${tracks.map((t, i) => `
    <div class="track-row" data-track="${t.id}">
      <div class="num">${i + 1}</div>
      <a class="row-main" href="track.html?id=${t.id}" style="color:inherit;text-decoration:none">
        <div class="row-title">${UI.escapeHTML(t.title || 'Без названия')}</div>
        <div class="row-artist">${UI.escapeHTML(t.artistName || '')}</div>
      </a>
      <div class="row-actions">
        ${isOwner ? `
          <button class="icon-btn" data-remove="${t.id}" title="Убрать из плейлиста">
            <span data-icon="trash"></span>
          </button>
        ` : ''}
      </div>
    </div>
  `).join('')}</div>`;
}

function bindEvents(page, playlistId, tracks, isOwner) {
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

  page.querySelectorAll('[data-remove]').forEach(btn => {
    btn.onclick = e => {
      e.preventDefault();
      e.stopPropagation();
      Playlists.removeTrack(playlistId, btn.dataset.remove);
      UI.toast('Убрано из плейлиста');
      renderPlaylist(playlistId);
    };
  });

  if (isOwner) {
    const renameBtn = document.getElementById('renamePlBtn');
    const delBtn = document.getElementById('delPlBtn');

    if (renameBtn) {
      renameBtn.onclick = () => {
        UI.openModal(`
          <h2>Переименовать</h2>
          <div class="form-row">
            <label>Название</label>
            <input id="newName" value="${UI.escapeHTML(DB.findPlaylist(playlistId).name)}">
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
          Playlists.rename(playlistId, v);
          UI.closeModal();
          UI.toast('Переименовано');
          renderPlaylist(playlistId);
        };
      };
    }

    if (delBtn) {
      delBtn.onclick = () => {
        if (!confirm('Удалить плейлист?')) return;
        Playlists.delete(playlistId);
        location.href = 'library.html';
      };
    }
  }
}

