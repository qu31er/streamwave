/* ============================================
   PAGE: UPLOAD — upload.html (только artist)
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireArtist()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderUpload();
});

function renderUpload() {
  const page = document.getElementById('page');
  const user = Auth.user();
  const albums = DB.albums().filter(a => a.ownerId === user.id);

  page.innerHTML = `
    <h2>Загрузить трек</h2>

    <div class="glass settings-card">
      <div class="form-row">
        <label>Обложка (изображение)</label>
        <input type="file" id="upCover" accept="image/*">
      </div>

      <div class="form-row">
        <label>Название</label>
        <input id="upTitle" placeholder="Название трека" maxlength="120">
      </div>

      <div class="form-row">
        <label>Описание</label>
        <textarea id="upDesc" placeholder="О чём этот трек" maxlength="500"></textarea>
      </div>

      <div class="form-row">
        <label>Текст песни</label>
        <textarea id="upLyrics" class="lyrics" placeholder="Текст..." maxlength="5000"></textarea>
      </div>

      <div class="form-row">
        <label>Аудио файл</label>
        <input type="file" id="upAudio" accept="audio/*">
      </div>

      <div class="form-row">
        <label>Клип (видео, опционально)</label>
        <input type="file" id="upVideo" accept="video/*">
      </div>

      <div class="form-row">
        <label>Альбом</label>
        <select id="upAlbum">
          <option value="">— Без альбома —</option>
          ${albums.map(a => `<option value="${a.id}">${UI.escapeHTML(a.title)}</option>`).join('')}
        </select>
      </div>

      <button class="btn-primary" id="upSubmit">Отправить на модерацию</button>
      <p id="upNote" style="margin-top:12px;font-size:13px;color:var(--text-dim)"></p>
    </div>
  `;

  hydrateIcons(page);

  document.getElementById('upSubmit').onclick = submitUpload;
}

async function submitUpload() {
  const note = document.getElementById('upNote');
  const title = document.getElementById('upTitle').value.trim();

  if (!title) {
    note.textContent = 'Укажите название';
    note.style.color = 'var(--error)';
    return;
  }

  const audioFile = document.getElementById('upAudio').files[0];
  if (!audioFile) {
    note.textContent = 'Загрузите аудио-файл';
    note.style.color = 'var(--error)';
    return;
  }

  note.textContent = 'Обработка файлов...';
  note.style.color = 'var(--text-dim)';

  try {
    const cover = await fileToDataURL(document.getElementById('upCover').files[0]);
    const audio = await fileToDataURL(audioFile);
    const video = await fileToDataURL(document.getElementById('upVideo').files[0]);

    const user = Auth.user();

    const track = {
      id: DB.uid(),
      ownerId: user.id,
      artistName: user.username,
      title,
      description: document.getElementById('upDesc').value.trim(),
      lyrics: document.getElementById('upLyrics').value.trim(),
      albumId: document.getElementById('upAlbum').value || null,
      cover,
      audio,
      video,
      status: 'approved',
      createdAt: Date.now()
    };

    const all = DB.tracks();
    all.push(track);
    DB.saveTracks(all);

    note.textContent = 'Трек загружен.';
    note.style.color = 'var(--ok)';

    setTimeout(() => location.href = 'app.html', 1200);
  } catch (e) {
    console.error(e);
    note.textContent = 'Ошибка: ' + (e.message || 'проверьте размер файлов');
    note.style.color = 'var(--error)';
  }
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 20 * 1024 * 1024) {
      return reject(new Error('Файл больше 20 МБ'));
    }
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

