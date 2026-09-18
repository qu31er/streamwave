/* ============================================
   UI — общие блоки: сайдбар, топбар, мини-плеер
   ============================================ */

const UI = {

  /* ---------- Загрузка партиала ---------- */
  async loadPartial(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Не удалось загрузить ' + url);
    return await res.text();
  },

  /* ---------- Инициализация общих блоков ---------- */
  async init() {
    const user = Auth.user();
    const guest = Auth.isGuest();

    /* Применяем сохранённые цвета интерфейса на любой странице */
    try {
      const s = DB.settings();
      const root = document.documentElement;
      root.style.setProperty('--accent-r', s.r);
      root.style.setProperty('--accent-g', s.g);
      root.style.setProperty('--accent-b', s.b);
    } catch (e) { /* ignore */ }

    let sidebarHTML = '';
    let topbarHTML = '';
    let miniplayerHTML = '';

    try {
      [sidebarHTML, topbarHTML, miniplayerHTML] = await Promise.all([
        this.loadPartial('partials/sidebar.html'),
        this.loadPartial('partials/topbar.html'),
        this.loadPartial('partials/miniplayer.html')
      ]);
    } catch (e) {
      console.warn('[UI] fetch не сработал, используем встроенную разметку:', e);
      sidebarHTML = this.fallbackSidebar();
      topbarHTML = this.fallbackTopbar();
      miniplayerHTML = this.fallbackMiniplayer();
    }

    const sidebarSlot    = document.getElementById('sidebarSlot');
    const topbarSlot     = document.getElementById('topbarSlot');
    const miniplayerSlot = document.getElementById('miniplayerSlot');

    if (sidebarSlot)    sidebarSlot.innerHTML    = sidebarHTML    || this.fallbackSidebar();
    if (topbarSlot)     topbarSlot.innerHTML     = topbarHTML     || this.fallbackTopbar();
    if (miniplayerSlot) miniplayerSlot.innerHTML = miniplayerHTML || this.fallbackMiniplayer();

    hydrateIcons();

    if (user)       this.fillUserInfo(user);
    else if (guest) this.fillGuestInfo();

    /* Проверяем, есть ли сохранённый трек — если да, показываем плеер */
    try {
      const state = JSON.parse(localStorage.getItem('sw_player_state') || 'null');
      if (state && state.queue && state.queue.length) {
        document.body.classList.add('has-track');
      }
    } catch (e) { /* ignore */ }

    this.initBurger();
    this.initSearch();
    this.markActiveNav();
  },

  /* ============================================
     РЕЗЕРВНЫЕ РАЗМЕТКИ
     ============================================ */

  fallbackSidebar() {
    return `
      <div class="logo"><a href="app.html">Stream<span>Wave</span></a></div>
      <nav class="nav">
        <a class="nav-btn" data-view="home" href="app.html">
          <span data-icon="home"></span>Главная
        </a>
        <a class="nav-btn" data-view="search" href="search.html">
          <span data-icon="search"></span>Поиск
        </a>
        <a class="nav-btn" data-view="library" href="library.html">
          <span data-icon="library"></span>Моя музыка
        </a>
        <a class="nav-btn artist-only" data-view="upload" href="upload.html">
          <span data-icon="upload"></span>Загрузить трек
        </a>
        <a class="nav-btn artist-only" data-view="albums" href="albums.html">
          <span data-icon="album"></span>Альбомы
        </a>
        <a class="nav-btn" data-view="settings" href="settings.html">
          <span data-icon="settings"></span>Настройки
        </a>
      </nav>
      <a class="user-box glass-sm" href="profile.html">
        <div class="avatar" id="sidebarAvatar"></div>
        <div class="user-meta">
          <div class="user-name" id="sidebarName">—</div>
          <div class="user-role" id="sidebarRole">—</div>
        </div>
      </a>
    `;
  },

  fallbackTopbar() {
    return `
      <div class="search-wrap">
        <span data-icon="search"></span>
        <input type="search" name="q" id="globalSearch" placeholder="Что послушаем?" autocomplete="off">
      </div>
      <a class="icon-btn" href="player.html" title="Открыть плеер">
        <span data-icon="play"></span>
      </a>
    `;
  },

  fallbackMiniplayer() {
    return `
      <div class="track-info" id="miniInfo">
        <div class="cover" id="miniCover"></div>
        <div class="track-meta">
          <div class="track-title" id="miniTitle">Ничего не играет</div>
          <div class="track-artist" id="miniArtist">—</div>
        </div>
        <button class="icon-btn" id="miniLike" title="В избранное">
          <span data-icon="heart"></span>
        </button>
      </div>

      <div class="controls">
        <button class="icon-btn" id="miniShuffle" title="Перемешать">
          <span data-icon="shuffle"></span>
        </button>
        <button class="icon-btn" id="miniPrev" title="Предыдущий">
          <span data-icon="prev"></span>
        </button>
        <button class="icon-btn play" id="miniPlay" title="Играть">
          <span data-icon="play"></span>
        </button>
        <button class="icon-btn" id="miniNext" title="Следующий">
          <span data-icon="next"></span>
        </button>
        <button class="icon-btn" id="miniRepeat" title="Повтор">
          <span data-icon="repeat"></span>
        </button>
      </div>

      <div class="progress-wrap">
        <span class="time" id="miniTimeCur">0:00</span>
        <input type="range" id="miniSeek" min="0" max="100" value="0" step="0.1">
        <span class="time" id="miniTimeDur">0:00</span>
        <div class="volume">
          <span data-icon="volume"></span>
          <input type="range" id="miniVolume" min="0" max="1" step="0.01" value="0.8">
        </div>
      </div>

      <audio id="audioEl"></audio>
    `;
  },

  /* ---------- Данные пользователя в сайдбаре ---------- */
  fillUserInfo(user) {
    const avatar = document.getElementById('sidebarAvatar');
    const name   = document.getElementById('sidebarName');
    const role   = document.getElementById('sidebarRole');

    if (avatar) {
      if (user.avatar) {
        avatar.textContent = '';
        avatar.style.backgroundImage = `url(${user.avatar})`;
        avatar.style.backgroundSize = 'cover';
        avatar.style.backgroundPosition = 'center';
        avatar.classList.add('has-image');
      } else {
        avatar.textContent = user.username[0].toUpperCase();
        avatar.style.backgroundImage = '';
        avatar.classList.remove('has-image');
      }
    }

    if (name) name.textContent = user.username;
    if (role) role.textContent = user.role === 'artist' ? 'Исполнитель' : 'Слушатель';

    if (user.role !== 'artist') {
      document.querySelectorAll('.artist-only').forEach(el => el.classList.add('hidden'));
    }
  },

  fillGuestInfo() {
    const avatar = document.getElementById('sidebarAvatar');
    const name   = document.getElementById('sidebarName');
    const role   = document.getElementById('sidebarRole');

    if (avatar) {
      avatar.textContent = '?';
      avatar.style.backgroundImage = '';
      avatar.classList.remove('has-image');
    }
    if (name)   name.textContent = 'Гость';
    if (role)   role.textContent = 'Режим прослушивания';

    document.querySelectorAll('.artist-only').forEach(el => el.classList.add('hidden'));
  },

  /* ---------- Активная вкладка ---------- */
  markActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === page);
    });
  },

  /* ---------- Мобильный бургер ---------- */
  initBurger() {
    const burger   = document.getElementById('burgerBtn');
    const sidebar  = document.querySelector('.sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!burger || !sidebar || !backdrop) return;

    const open = () => {
      sidebar.classList.add('open');
      backdrop.classList.add('show');
      document.body.classList.add('sidebar-open');
    };

    const close = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
      document.body.classList.remove('sidebar-open');
    };

    burger.onclick = () => {
      if (sidebar.classList.contains('open')) close();
      else open();
    };

    backdrop.onclick = close;

    sidebar.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', close));
  },

  /* ---------- Поиск в топбаре ---------- */
  initSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;

    if (document.body.dataset.page === 'search') return;

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        location.href = 'search.html?q=' + encodeURIComponent(q);
      }
    });
  },

  /* ---------- Тост ---------- */
  toast(msg) {
    const t = document.createElement('div');
    t.className = 'glass toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  },

  /* ---------- Модалка ---------- */
  openModal(html) {
    const backdrop = document.getElementById('modalBackdrop');
    const content  = document.getElementById('modalContent');
    if (!backdrop || !content) return;

    content.innerHTML = html;
    backdrop.classList.remove('hidden');
    hydrateIcons(content);
  },

  closeModal() {
    const backdrop = document.getElementById('modalBackdrop');
    const content  = document.getElementById('modalContent');
    if (!backdrop) return;
    backdrop.classList.add('hidden');
    if (content) content.innerHTML = '';
  },

  /* ---------- Утилиты ---------- */
  escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g,
      m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  },

  getIdFromURL() {
    return new URLSearchParams(location.search).get('id');
  },

  getQueryFromURL() {
    return new URLSearchParams(location.search).get('q') || '';
  },

  fmtTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${r < 10 ? '0' : ''}${r}`;
  }
};

/* ============================================
   Пузырьки
   ============================================ */
function spawnBubbles() {
  const wrap = document.getElementById('bubbles');
  if (!wrap) return;

  const count = window.innerWidth < 640 ? 10 : 18;

  for (let i = 0; i < count; i++) {
    const b = document.createElement('div');
    b.className = 'bubble';
    const size = 20 + Math.random() * 90;
    b.style.width = size + 'px';
    b.style.height = size + 'px';
    b.style.left = Math.random() * 100 + '%';
    b.style.animationDuration = (12 + Math.random() * 18) + 's';
    b.style.animationDelay = (-Math.random() * 20) + 's';
    wrap.appendChild(b);
  }
}