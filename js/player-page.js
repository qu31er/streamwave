/* ============================================
   PAGE: PLAYER — player.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  renderFullPlayer();
});

function renderFullPlayer() {
  const page = document.getElementById('page');
  if (!page) return;

  if (!Player.current()) {
    page.innerHTML = `
      <div class="full-player">
        <div class="empty-state">
          <div class="icon-big">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h2>Ничего не играет</h2>
          <p>Выберите трек из каталога</p>
          <a class="btn-primary" href="app.html"
             style="display:inline-block;max-width:220px;text-decoration:none;color:#0a0710">
            Открыть каталог
          </a>
        </div>
      </div>
    `;
    return;
  }

  page.innerHTML = `
    <div class="full-player">

      <div class="artwork">
        <div class="cover-xl" id="fullCover"></div>
      </div>

      <div class="side">

        <div class="title-block">
          <div class="eyebrow">Сейчас играет</div>
          <h1 id="fullTitle">—</h1>
          <a class="artist-link" id="fullArtist" href="#">—</a>
        </div>

        <div class="progress-block">
          <span class="time" id="fullTimeCur">0:00</span>
          <input type="range" id="fullSeek" min="0" max="100" value="0" step="0.1">
          <span class="time" id="fullTimeDur">0:00</span>
        </div>

        <div class="controls-lg">
          <button class="icon-btn" id="fullShuffle" title="Перемешать">
            <span data-icon="shuffle"></span>
          </button>
          <button class="icon-btn" id="fullPrev" title="Предыдущий">
            <span data-icon="prev"></span>
          </button>
          <button class="icon-btn play" id="fullPlay" title="Играть">
            <span data-icon="play"></span>
          </button>
          <button class="icon-btn" id="fullNext" title="Следующий">
            <span data-icon="next"></span>
          </button>
          <button class="icon-btn" id="fullRepeat" title="Повтор">
            <span data-icon="repeat"></span>
          </button>
        </div>

        <div class="bottom-row">
          <div class="volume-lg">
            <span data-icon="volume"></span>
            <input type="range" id="fullVolume" min="0" max="1" step="0.01" value="0.8">
          </div>
          <button class="icon-btn" id="fullLike" title="В избранное">
            <span data-icon="heart"></span>
          </button>
        </div>

        <div id="fullLyricsWrap"></div>
        <div id="fullClipWrap"></div>

        <div>
          <h3>Очередь</h3>
          <div class="queue" id="fullQueue"></div>
        </div>

      </div>
    </div>
  `;

  hydrateIcons(page);
  bindFullPlayer();

  Player.refreshUI();
  renderQueue();
  renderLyricsAndClip();
}

function bindFullPlayer() {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };

  bind('fullPlay',    () => Player.toggle());
  bind('fullNext',    () => Player.next(true));
  bind('fullPrev',    () => Player.prev());
  bind('fullShuffle', () => Player.toggleShuffle());
  bind('fullRepeat',  () => Player.cycleRepeat());
  bind('fullLike',    () => Player.toggleLike());

  const seek = document.getElementById('fullSeek');
  if (seek) {
    seek.addEventListener('input', e => {
      if (Player.audio.duration) {
        Player.audio.currentTime = (e.target.value / 100) * Player.audio.duration;
      }
    });
  }

  const vol = document.getElementById('fullVolume');
  if (vol) {
    vol.value = Player.audio.volume;
    vol.addEventListener('input', e => {
      Player.audio.volume = +e.target.value;
      Player.saveVolume(+e.target.value);
    });
  }

  Player.audio.addEventListener('play', () => {
    renderLyricsAndClip();
    renderQueue();
    updateArtistLink();
  });
}

function updateArtistLink() {
  const t = Player.current();
  const link = document.getElementById('fullArtist');
  if (!link) return;

  if (t) {
    link.textContent = t.artistName || '';
    link.href = `artist.html?id=${t.ownerId}`;
    link.style.display = '';
  } else {
    link.textContent = '—';
    link.removeAttribute('href');
  }
}

function renderQueue() {
  const wrap = document.getElementById('fullQueue');
  if (!wrap) return;

  if (!Player.queue.length) {
    wrap.innerHTML = '<div class="empty">Очередь пуста</div>';
    return;
  }

  wrap.innerHTML = Player.queue.map((t, i) => `
    <div class="track-row${i === Player.index ? ' playing' : ''}" data-qi="${i}">
      <div class="num">${i + 1}</div>
      <div class="row-main">
        <div class="row-title">${UI.escapeHTML(t.title || 'Без названия')}</div>
        <div class="row-artist">${UI.escapeHTML(t.artistName || '')}</div>
      </div>
    </div>
  `).join('');

  wrap.querySelectorAll('[data-qi]').forEach(row => {
    row.onclick = () => {
      Player.index = +row.dataset.qi;
      Player.playCurrent();
      renderQueue();
    };
  });
}

function renderLyricsAndClip() {
  const t = Player.current();

  const lyricsWrap = document.getElementById('fullLyricsWrap');
  const clipWrap = document.getElementById('fullClipWrap');
  if (!lyricsWrap || !clipWrap) return;

  if (t && t.lyrics) {
    lyricsWrap.innerHTML = `
      <h3>Текст песни</h3>
      <div class="lyrics-drawer">${UI.escapeHTML(t.lyrics)}</div>
    `;
  } else {
    lyricsWrap.innerHTML = '';
  }

  if (t && t.video) {
    clipWrap.innerHTML = `
      <h3>Клип</h3>
      <div class="clip-wrap">
        <video src="${t.video}" controls preload="metadata"></video>
      </div>
    `;
  } else {
    clipWrap.innerHTML = '';
  }

  updateArtistLink();
}