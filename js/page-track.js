/* ============================================
   PAGE: TRACK — track.html?id=...
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  const id = UI.getIdFromURL();
  renderTrack(id);
});

function renderTrack(id) {
  const page = document.getElementById('page');
  const t = DB.findTrack(id);

  if (!t) {
    page.innerHTML = '<div class="empty">Трек не найден</div>';
    return;
  }

  const user = Auth.user();
  if (t.status !== 'approved' && (!user || t.ownerId !== user.id)) {
    page.innerHTML = '<div class="empty">Трек не найден</div>';
    return;
  }

  const album = t.albumId ? DB.findAlbum(t.albumId) : null;

  page.innerHTML = `
    <a class="back-link" href="artist.html?id=${t.ownerId}">
      <span data-icon="back"></span>${UI.escapeHTML(t.artistName || 'Артист')}
    </a>

    <div class="track-hero">
      <div class="cover-xl"
        ${t.cover ? `style="background-image:url(${t.cover})"` : ''}>
      </div>

      <div class="info">
        <div class="eyebrow" style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);font-weight:700">
          ${t.status === 'pending' ? 'На модерации' : t.status === 'rejected' ? 'Отклонён' : 'Трек'}
        </div>
        <h1>${UI.escapeHTML(t.title || 'Без названия')}</h1>

        <a class="artist-link" href="artist.html?id=${t.ownerId}">
          ${UI.escapeHTML(t.artistName || '')}
        </a>

        ${album ? `
          <a class="artist-link" href="album.html?id=${album.id}">
            Альбом: ${UI.escapeHTML(album.title)}
          </a>
        ` : ''}

        ${t.description ? `
          <div class="description">${UI.escapeHTML(t.description)}</div>
        ` : ''}
      </div>
    </div>

    <!-- ПЛЕЕР НА СТРАНИЦЕ ТРЕКА -->
    <div class="track-player glass">

      <div class="tp-progress">
        <span class="tp-time" id="tpTimeCur">0:00</span>
        <input type="range" id="tpSeek" min="0" max="100" value="0" step="0.1">
        <span class="tp-time" id="tpTimeDur">0:00</span>
      </div>

      <div class="tp-controls">
        <button class="icon-btn" id="tpShuffle" title="Перемешать">
          <span data-icon="shuffle"></span>
        </button>
        <button class="icon-btn" id="tpPrev" title="Предыдущий">
          <span data-icon="prev"></span>
        </button>
        <button class="icon-btn play" id="tpPlay" title="Играть">
          <span data-icon="play"></span>
        </button>
        <button class="icon-btn" id="tpNext" title="Следующий">
          <span data-icon="next"></span>
        </button>
        <button class="icon-btn" id="tpRepeat" title="Повтор">
          <span data-icon="repeat"></span>
        </button>
      </div>

      <div class="tp-extras">
        <button class="icon-btn" id="tpLike" title="В избранное">
          <span data-icon="heart"></span>
        </button>

        <div class="tp-volume">
          <span data-icon="volume"></span>
          <input type="range" id="tpVolume" min="0" max="1" step="0.01" value="0.8">
        </div>

        <button class="tp-speed-btn" id="tpSpeedBtn" title="Скорость воспроизведения">
          <span data-icon="settings" class="icon-sm"></span>
          <span id="tpSpeedLabel">1×</span>
        </button>
      </div>
    </div>

    ${t.lyrics ? `
      <div class="lyrics-block">
        <h3>Текст песни</h3>
        <div class="lyrics">${UI.escapeHTML(t.lyrics)}</div>
      </div>
    ` : ''}

    ${t.video ? `
      <div class="clip-block">
        <h3>Клип</h3>
        <video src="${t.video}" controls preload="metadata"></video>
      </div>
    ` : ''}
  `;

  hydrateIcons(page);
  bindTrackPlayer(t);
}

/* ============================================
   Плеер на странице трека
   ============================================ */
function bindTrackPlayer(t) {
  const approved = DB.approvedTracks();
  const idx = approved.findIndex(x => x.id === t.id);
  const queue = idx >= 0 ? approved : [t];

  document.getElementById('tpPlay').onclick = () => {
    if (Player.current() && Player.current().id === t.id) {
      Player.toggle();
    } else {
      Player.loadQueue(queue, idx < 0 ? 0 : idx);
    }
  };

  document.getElementById('tpPrev').onclick    = () => Player.prev();
  document.getElementById('tpNext').onclick    = () => Player.next(true);
  document.getElementById('tpShuffle').onclick = () => Player.toggleShuffle();
  document.getElementById('tpRepeat').onclick  = () => Player.cycleRepeat();
  document.getElementById('tpLike').onclick    = () => Player.toggleLike();

  const seek = document.getElementById('tpSeek');
  seek.addEventListener('input', e => {
    if (Player.audio.duration) {
      Player.audio.currentTime = (e.target.value / 100) * Player.audio.duration;
    }
  });

  const vol = document.getElementById('tpVolume');
  vol.value = Player.audio.volume;
  vol.addEventListener('input', e => {
    Player.audio.volume = +e.target.value;
    Player.saveVolume(+e.target.value);
  });

  /* Кнопка скорости → модалка */
  updateSpeedLabel();

  document.getElementById('tpSpeedBtn').onclick = () => openSpeedModal();

  const syncUI = () => {
    const cur = Player.current();
    const isThis = cur && cur.id === t.id;

    const playBtn = document.getElementById('tpPlay');
    if (playBtn) {
      const playing = isThis && !Player.audio.paused;
      playBtn.innerHTML = playing ? Icons.pause : Icons.play;
      const svg = playBtn.querySelector('svg');
      if (svg) {
        svg.classList.add('icon');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('stroke', 'none');
      }
    }

    const shuf = document.getElementById('tpShuffle');
    const rep  = document.getElementById('tpRepeat');
    if (shuf) shuf.classList.toggle('active', Player.shuffle);
    if (rep) {
      rep.classList.toggle('active', Player.repeat !== 'off');
      rep.dataset.mode = Player.repeat;
    }

    const like = document.getElementById('tpLike');
    if (like && cur) like.classList.toggle('active', Player.liked.has(cur.id));

    if (isThis && Player.audio.duration) {
      document.getElementById('tpSeek').value =
        (Player.audio.currentTime / Player.audio.duration) * 100;
      document.getElementById('tpTimeCur').textContent = UI.fmtTime(Player.audio.currentTime);
      document.getElementById('tpTimeDur').textContent = UI.fmtTime(Player.audio.duration);
    }
  };

  Player.audio.addEventListener('timeupdate', syncUI);
  Player.audio.addEventListener('play',  syncUI);
  Player.audio.addEventListener('pause', syncUI);
  Player.audio.addEventListener('loadedmetadata', syncUI);

  syncUI();
}

/* ============================================
   Модалка скорости
   ============================================ */
function openSpeedModal() {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const current = Player.loadSpeed();

  UI.openModal(`
    <h2>Скорость воспроизведения</h2>
    <div class="speed-list">
      ${speeds.map(s => `
        <button class="speed-option ${s === current ? 'active' : ''}" data-speed="${s}">
          <span>${s}×</span>
          ${s === current ? '<span data-icon="check" class="icon-sm"></span>' : ''}
        </button>
      `).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn-ghost" id="closeM">Закрыть</button>
    </div>
  `);

  hydrateIcons(document.getElementById('modalContent'));

  document.getElementById('closeM').onclick = () => UI.closeModal();

  document.querySelectorAll('#modalContent [data-speed]').forEach(btn => {
    btn.onclick = () => {
      Player.setSpeed(parseFloat(btn.dataset.speed));
      updateSpeedLabel();
      UI.closeModal();
      UI.toast('Скорость ' + btn.dataset.speed + '×');
    };
  });
}

function updateSpeedLabel() {
  const el = document.getElementById('tpSpeedLabel');
  if (!el) return;
  el.textContent = Player.loadSpeed() + '×';
}