/* ============================================
   PLAYER — единая логика для мини и полного плеера
   Состояние сохраняется в localStorage
   ============================================ */

const Player = {

  audio: null,
  queue: [],
  index: -1,
  shuffle: false,
  repeat: 'off',
  liked: new Set(),

  /* ---------- Инициализация ---------- */
  init() {
    this.audio = document.getElementById('audioEl');
    if (!this.audio) return;

    this.audio.volume = this.loadVolume();
    this.audio.playbackRate = this.loadSpeed();

    this.restoreState();

    /* Кнопки мини-плеера */
    this.bind('miniPlay',    () => this.toggle());
    this.bind('miniNext',    () => this.next(true));
    this.bind('miniPrev',    () => this.prev());
    this.bind('miniShuffle', e => this.toggleShuffle(e.currentTarget));
    this.bind('miniRepeat',  e => this.cycleRepeat(e.currentTarget));
    this.bind('miniLike',    e => this.toggleLike(e.currentTarget));

    /* Кнопки полного плеера */
    this.bind('fullPlay',    () => this.toggle());
    this.bind('fullNext',    () => this.next(true));
    this.bind('fullPrev',    () => this.prev());
    this.bind('fullShuffle', e => this.toggleShuffle(e.currentTarget));
    this.bind('fullRepeat',  e => this.cycleRepeat(e.currentTarget));

    /* Клик по треку в мини-плеере → полный плеер */
    const miniInfo = document.querySelector('.miniplayer .track-info');
    if (miniInfo) {
      miniInfo.onclick = (e) => {
        if (e.target.closest('#miniLike')) return;
        if (!this.current()) return;
        location.href = 'player.html';
      };
    }

    /* Прогресс */
    ['miniSeek', 'fullSeek'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', e => {
        if (this.audio.duration) {
          this.audio.currentTime = (e.target.value / 100) * this.audio.duration;
        }
      });
    });

    /* Громкость */
    ['miniVolume', 'fullVolume'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = this.audio.volume;
      el.addEventListener('input', e => {
        this.audio.volume = +e.target.value;
        this.saveVolume(+e.target.value);
      });
    });

    /* События аудио */
    this.audio.addEventListener('timeupdate',     () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
    this.audio.addEventListener('ended',          () => this.onEnded());
    this.audio.addEventListener('play',           () => this.setPlayIcon(true));
    this.audio.addEventListener('pause',          () => this.setPlayIcon(false));

    this.refreshUI();
  },

  bind(id, fn) {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  },

  /* ---------- Состояние ---------- */
  saveState() {
    try {
      localStorage.setItem('sw_player_state', JSON.stringify({
        queue: this.queue.map(t => t.id),
        index: this.index,
        shuffle: this.shuffle,
        repeat: this.repeat,
        time: this.audio ? this.audio.currentTime : 0
      }));
    } catch (e) { /* ignore */ }
  },

  restoreState() {
    try {
      const raw = localStorage.getItem('sw_player_state');
      if (!raw) return;
      const s = JSON.parse(raw);

      this.shuffle = !!s.shuffle;
      this.repeat = s.repeat || 'off';

      if (Array.isArray(s.queue) && s.queue.length) {
        const all = DB.tracks();
        this.queue = s.queue.map(id => all.find(t => t.id === id)).filter(Boolean);
        this.index = Math.max(0, Math.min(s.index || 0, this.queue.length - 1));

        const cur = this.current();
        if (cur && cur.audio) {
          this.audio.src = cur.audio;
          this.audio.addEventListener('loadedmetadata', () => {
            if (s.time && s.time < this.audio.duration) {
              this.audio.currentTime = s.time;
            }
          }, { once: true });
        }
      }
    } catch (e) { /* ignore */ }
  },

  /* ---------- Громкость ---------- */
  loadVolume() {
    const v = parseFloat(localStorage.getItem('sw_volume'));
    return isNaN(v) ? 0.8 : v;
  },

  saveVolume(v) {
    localStorage.setItem('sw_volume', String(v));
  },

  /* ---------- Скорость воспроизведения ---------- */
  loadSpeed() {
    const v = parseFloat(localStorage.getItem('sw_speed'));
    return isNaN(v) ? 1 : v;
  },

  saveSpeed(v) {
    localStorage.setItem('sw_speed', String(v));
  },

  setSpeed(v) {
    if (this.audio) this.audio.playbackRate = v;
    this.saveSpeed(v);
    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === v);
    });
  },

  /* ---------- Лайки ---------- */
  loadLikes() {
    const u = Auth.user();
    if (!u) { this.liked = new Set(); return; }
    try {
      this.liked = new Set(JSON.parse(localStorage.getItem('sw_likes_' + u.id) || '[]'));
    } catch (e) { this.liked = new Set(); }
  },

  saveLikes() {
    const u = Auth.user();
    if (!u) return;
    localStorage.setItem('sw_likes_' + u.id, JSON.stringify([...this.liked]));
  },

  toggleLike(btn) {
    if (Auth.isGuest()) {
      UI.toast('Войдите, чтобы лайкать');
      return;
    }

    const t = this.current();
    if (!t) return;

    if (this.liked.has(t.id)) this.liked.delete(t.id);
    else                      this.liked.add(t.id);

    this.saveLikes();

    document.querySelectorAll('#miniLike, #fullLike, #tpLike').forEach(b => {
      if (b) b.classList.toggle('active', this.liked.has(t.id));
    });

    if (btn) btn.classList.toggle('active', this.liked.has(t.id));
  },

  /* ---------- Очередь ---------- */
  loadQueue(tracks, startIndex = 0) {
    this.queue = [...tracks];
    this.index = startIndex;
    this.playCurrent();
    this.saveState();
  },

  current() {
    return this.queue[this.index] || null;
  },

  /* ---------- Воспроизведение ---------- */
  playCurrent() {
    const t = this.current();
    if (!t) return;

    this.audio.src = t.audio || '';
    this.audio.playbackRate = this.loadSpeed();

    if (t.audio) {
      this.audio.play().catch(() => {});
    }

    this.refreshUI();
    this.setPlayIcon(true);
    this.saveState();

    document.querySelectorAll('[data-track]').forEach(el => {
      el.classList.toggle('playing', el.dataset.track === t.id);
    });
  },

  toggle() {
    if (!this.current()) return;
    if (this.audio.paused) this.audio.play();
    else                   this.audio.pause();
  },

  next(auto = false) {
    if (!this.queue.length) return;

    if (this.shuffle) {
      let n;
      do { n = Math.floor(Math.random() * this.queue.length); }
      while (n === this.index && this.queue.length > 1);
      this.index = n;
    } else {
      this.index++;
      if (this.index >= this.queue.length) {
        if (this.repeat === 'all') {
          this.index = 0;
        } else {
          this.index = this.queue.length - 1;
          this.audio.pause();
          return;
        }
      }
    }
    this.playCurrent();
  },

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (!this.queue.length) return;

    this.index = this.index <= 0 ? this.queue.length - 1 : this.index - 1;
    this.playCurrent();
  },

  onEnded() {
    if (this.repeat === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.next(true);
    }
  },

  /* ---------- Кнопки режимов ---------- */
  toggleShuffle(btn) {
    this.shuffle = !this.shuffle;
    document.querySelectorAll('#miniShuffle, #fullShuffle, #tpShuffle').forEach(b => {
      if (b) b.classList.toggle('active', this.shuffle);
    });
    this.saveState();
  },

  cycleRepeat(btn) {
    this.repeat = this.repeat === 'off'
      ? 'all'
      : this.repeat === 'all'
        ? 'one'
        : 'off';

    document.querySelectorAll('#miniRepeat, #fullRepeat, #tpRepeat').forEach(b => {
      if (b) {
        b.classList.toggle('active', this.repeat !== 'off');
        b.dataset.mode = this.repeat;
      }
    });
    this.saveState();
  },

  /* ---------- UI ---------- */
  refreshUI() {
    const t = this.current();

    const title    = t ? (t.title || 'Без названия') : 'Ничего не играет';
    const artist   = t ? (t.artistName || '') : '—';
    const coverURL = t && t.cover ? `url(${t.cover})` : '';

    document.body.classList.toggle('has-track', !!t);

    /* Мини-плеер */
    const miniTitle  = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniCover  = document.getElementById('miniCover');

    if (miniTitle)  miniTitle.textContent = title;
    if (miniArtist) miniArtist.textContent = artist;
    if (miniCover)  miniCover.style.backgroundImage = coverURL;

    /* Полный плеер */
    const fullTitle  = document.getElementById('fullTitle');
    const fullArtist = document.getElementById('fullArtist');
    const fullCover  = document.getElementById('fullCover');

    if (fullTitle)  fullTitle.textContent = title;
    if (fullArtist) fullArtist.textContent = artist;
    if (fullCover)  fullCover.style.backgroundImage = coverURL;

    /* Лайк */
    if (t) {
      document.querySelectorAll('#miniLike, #fullLike, #tpLike').forEach(b => {
        if (b) b.classList.toggle('active', this.liked.has(t.id));
      });
    }

    /* Shuffle / repeat */
    document.querySelectorAll('#miniShuffle, #fullShuffle, #tpShuffle').forEach(b =>
      b && b.classList.toggle('active', this.shuffle));
    document.querySelectorAll('#miniRepeat, #fullRepeat, #tpRepeat').forEach(b => {
      if (!b) return;
      b.classList.toggle('active', this.repeat !== 'off');
      b.dataset.mode = this.repeat;
    });
  },

  setPlayIcon(playing) {
    const svgHTML = playing ? Icons.pause : Icons.play;

    ['miniPlay', 'fullPlay', 'tpPlay'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.innerHTML = svgHTML;
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.classList.add('icon');
        svg.setAttribute('fill', 'currentColor');
        svg.setAttribute('stroke', 'none');
      }
    });
  },

  updateProgress() {
    const a = this.audio;
    if (!a.duration) return;

    const pct = (a.currentTime / a.duration) * 100;

    ['miniSeek', 'fullSeek', 'tpSeek'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = pct;
    });

    const cur = UI.fmtTime(a.currentTime);
    ['miniTimeCur', 'fullTimeCur', 'tpTimeCur'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = cur;
    });
  },

  updateDuration() {
    const a = this.audio;
    if (!a.duration) return;
    const dur = UI.fmtTime(a.duration);

    ['miniTimeDur', 'fullTimeDur', 'tpTimeDur'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = dur;
    });
  }
};

/* ============================================
   Автосохранение при уходе со страницы
   ============================================ */
window.addEventListener('beforeunload', () => {
  if (typeof Player !== 'undefined' && Player.audio) Player.saveState();
});