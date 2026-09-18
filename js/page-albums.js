/* ============================================
   PAGE: ALBUMS — albums.html (только artist)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireArtist()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderAlbums();
});

function renderAlbums() {
  const page = document.getElementById('page');
  const albums = Playlists.myAlbums();

  page.innerHTML = `
    <h2>Мои альбомы</h2>

    <button class="btn-ghost" id="newAlbBtn">
      <span data-icon="plus"></span>Новый альбом
    </button>

    ${albums.length ? `
      <div class="card-grid mt-16">
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
    ` : '<div class="empty mt-16">Альбомов пока нет</div>'}
  `;

  hydrateIcons(page);

  document.getElementById('newAlbBtn').onclick = () => {
    UI.openModal(`
      <h2>Новый альбом</h2>
      <div class="form-row">
        <label>Название</label>
        <input id="albTitle" placeholder="Название альбома" autofocus>
      </div>
      <div class="form-row">
        <label>Обложка (опционально)</label>
        <input type="file" id="albCover" accept="image/*">
      </div>
      <div class="modal-actions">
        <button class="btn-primary" id="createAlb">Создать</button>
        <button class="btn-ghost" id="closeM">Отмена</button>
      </div>
    `);
    document.getElementById('closeM').onclick = () => UI.closeModal();
    document.getElementById('createAlb').onclick = async () => {
      const title = document.getElementById('albTitle').value.trim();
      if (!title) return;

      const coverFile = document.getElementById('albCover').files[0];
      const cover = coverFile ? await fileToDataURL(coverFile) : null;

      Playlists.createAlbum(title, cover);
      UI.closeModal();
      UI.toast('Альбом создан');
      renderAlbums();
    };
  };
}