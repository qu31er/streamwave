/* ============================================
   PAGE: SEARCH — search.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  const q = UI.getQueryFromURL();
  const searchInput = document.getElementById('globalSearch');
  if (searchInput && q) searchInput.value = q;

  renderSearch(q);

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      renderSearch(e.target.value);
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.preventDefault();
    });
  }
});

function renderSearch(q) {
  const page = document.getElementById('page');
  const query = (q || '').toLowerCase().trim();
  const all = DB.approvedTracks();

  const filtered = query
    ? all.filter(t =>
        (t.title || '').toLowerCase().includes(query) ||
        (t.artistName || '').toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query))
    : all;

  page.innerHTML = `
    <h2>Поиск</h2>
    ${filtered.length
      ? listHTML(filtered)
      : '<div class="empty">Ничего не найдено</div>'}
  `;

  hydrateIcons(page);
  bindEvents(page);
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

function bindEvents(container) {
  container.querySelectorAll('.track-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('.row-actions')) return;
      if (e.target.closest('a')) return;

      const ids = [...container.querySelectorAll('.track-row')].map(x => x.dataset.track);
      const list = ids.map(i => DB.findTrack(i)).filter(Boolean);
      const idx = list.findIndex(x => x.id === row.dataset.track);
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