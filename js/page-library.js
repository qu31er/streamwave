/* ============================================
   PAGE: LIBRARY — library.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLogin()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderLibrary();
});

function renderLibrary() {
  const page = document.getElementById('page');
  const pls = Playlists.myPlaylists();

  page.innerHTML = `
    <h2>Моя музыка</h2>

    <button class="btn-ghost" id="newPlBtn">
      <span data-icon="plus"></span>Новый плейлист
    </button>

    ${pls.length ? `
      <div class="card-grid mt-16">
        ${pls.map(p => `
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
    ` : '<div class="empty mt-16">Плейлистов пока нет</div>'}
  `;

  hydrateIcons(page);

  document.getElementById('newPlBtn').onclick = () => {
    UI.openModal(`
      <h2>Новый плейлист</h2>
      <div class="form-row">
        <label>Название</label>
        <input id="plName" placeholder="Например: Для дороги" autofocus>
      </div>
      <div class="modal-actions">
        <button class="btn-primary" id="createPl">Создать</button>
        <button class="btn-ghost" id="closeM">Отмена</button>
      </div>
    `);
    document.getElementById('closeM').onclick = () => UI.closeModal();
    document.getElementById('createPl').onclick = () => {
      const name = document.getElementById('plName').value.trim();
      if (!name) return;
      Playlists.create(name);
      UI.closeModal();
      UI.toast('Плейлист создан');
      renderLibrary();
    };
  };
}

