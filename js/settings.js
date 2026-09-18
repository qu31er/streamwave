/* ============================================
   PAGE: SETTINGS — settings.html
   ============================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireLoginOrGuest()) return;

  spawnBubbles();
  await UI.init();

  Player.loadLikes();
  Player.init();

  Settings.apply(DB.settings());

  renderSettings();
});

const Settings = {

  apply(s) {
    const root = document.documentElement;
    root.style.setProperty('--accent-r', s.r);
    root.style.setProperty('--accent-g', s.g);
    root.style.setProperty('--accent-b', s.b);
  }
};

function renderSettings() {
  const page = document.getElementById('page');
  const s = DB.settings();
  const isGuest = Auth.isGuest();
  const user = Auth.user();

  page.innerHTML = `
    <h2>Настройки</h2>

    ${!isGuest ? `
      <div class="glass settings-card">
        <h3>Профиль</h3>
        <div class="settings-profile-row">
          <div class="avatar-lg" id="setAvatar"
            ${user.avatar ? `style="background-image:url(${user.avatar})"` : ''}>
            ${user.avatar ? '' : UI.escapeHTML(user.username[0].toUpperCase())}
          </div>
          <div class="settings-profile-info">
            <div class="settings-profile-name">${UI.escapeHTML(user.username)}</div>
            <div class="settings-profile-role">${user.role === 'artist' ? 'Исполнитель' : 'Слушатель'}</div>
          </div>
        </div>

        <div class="form-row" style="margin-top:14px">
          <label>Аватарка</label>
          <input type="file" id="setAvatarFile" accept="image/*">
        </div>

        <div class="form-row">
          <label>Шапка профиля</label>
          <input type="file" id="setBannerFile" accept="image/*">
        </div>

        <div class="row" style="margin-top:4px">
          <button class="btn-primary" id="saveProfile" style="flex:1;min-width:140px">Сохранить профиль</button>
        </div>
      </div>
    ` : ''}

    <div class="glass settings-card">
      <h3>Цвет интерфейса</h3>

      <div class="setting-row">
        <label>Красный</label>
        <input type="range" id="cR" min="0" max="255" value="${s.r}">
        <span id="vR">${s.r}</span>
      </div>
      <div class="setting-row">
        <label>Зелёный</label>
        <input type="range" id="cG" min="0" max="255" value="${s.g}">
        <span id="vG">${s.g}</span>
      </div>
      <div class="setting-row">
        <label>Синий</label>
        <input type="range" id="cB" min="0" max="255" value="${s.b}">
        <span id="vB">${s.b}</span>
      </div>

      <div class="color-preview" id="cPrev"></div>

      <div class="row">
        <button class="btn-primary" id="saveTheme" style="flex:1;min-width:140px">Сохранить</button>
        <button class="btn-ghost" id="resetTheme">Сбросить</button>
      </div>
    </div>

    <div class="glass settings-card">
      <h3>Политика конфиденциальности</h3>
      <div class="policy-text">
        <p>Все данные хранятся локально в браузере и не передаются на сторонние серверы.</p>

        <h4>Какие данные мы сохраняем</h4>
        <p>Логин, пароль, роль, аватар, шапка профиля, треки, обложки, тексты, клипы, альбомы, плейлисты, настройки цвета.</p>

        <h4>Как удалить данные</h4>
        <p>Очистите данные сайта в браузере.</p>

        <h4>Cookies</h4>
        <p>Не используются.</p>
      </div>
    </div>

    <div class="glass settings-card">
      <h3>${isGuest ? 'Режим гостя' : 'Аккаунт'}</h3>
      ${isGuest ? `
        <div class="policy-text">
          <p>Вы слушаете как гость. Войдите, чтобы сохранять профиль, аватар и плейлисты.</p>
        </div>
        <a class="btn-primary" href="index.html"
           style="display:inline-block;text-align:center;text-decoration:none;color:#0a0710;margin-top:8px">
          Войти или зарегистрироваться
        </a>
      ` : `
        <button class="btn-ghost logout-btn" id="logoutBtnSettings">
          <span data-icon="logout"></span>
          Выйти из аккаунта
        </button>
      `}
    </div>
  `;

  hydrateIcons(page);

  /* ---------- Профиль: аватар + баннер ---------- */
  if (!isGuest) {
    const avatarFile = document.getElementById('setAvatarFile');
    const bannerFile = document.getElementById('setBannerFile');
    const avatarPrev = document.getElementById('setAvatar');

    let newAvatar = user.avatar || null;
    let newBanner = user.banner || null;

    if (avatarFile) {
      avatarFile.onchange = async () => {
        const f = avatarFile.files[0];
        if (!f) return;
        try {
          newAvatar = await fileToDataURL(f);
          avatarPrev.style.backgroundImage = `url(${newAvatar})`;
          avatarPrev.textContent = '';
        } catch (e) {
          UI.toast('Аватар: ' + e.message);
        }
      };
    }

    if (bannerFile) {
      bannerFile.onchange = async () => {
        const f = bannerFile.files[0];
        if (!f) return;
        try {
          newBanner = await fileToDataURL(f);
          UI.toast('Шапка выбрана');
        } catch (e) {
          UI.toast('Шапка: ' + e.message);
        }
      };
    }

    const saveProfileBtn = document.getElementById('saveProfile');
    if (saveProfileBtn) {
      saveProfileBtn.onclick = () => {
        const users = DB.users();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx < 0) return;
        users[idx].avatar = newAvatar;
        users[idx].banner = newBanner;
        DB.saveUsers(users);

        /* Обновить UI в текущей сессии */
        App.refreshUser?.();

        UI.toast('Профиль обновлён');
        setTimeout(() => location.reload(), 700);
      };
    }

    const logoutBtn = document.getElementById('logoutBtnSettings');
    if (logoutBtn) logoutBtn.onclick = () => Auth.logout();
  }

  /* ---------- Цвет ---------- */
  const cR = document.getElementById('cR');
  const cG = document.getElementById('cG');
  const cB = document.getElementById('cB');
  const vR = document.getElementById('vR');
  const vG = document.getElementById('vG');
  const vB = document.getElementById('vB');
  const cPrev = document.getElementById('cPrev');

  const liveUpdate = () => {
    const r = +cR.value, g = +cG.value, b = +cB.value;
    vR.textContent = r;
    vG.textContent = g;
    vB.textContent = b;
    cPrev.style.background = `rgb(${r},${g},${b})`;
    Settings.apply({ r, g, b });
  };

  [cR, cG, cB].forEach(el => el.addEventListener('input', liveUpdate));
  liveUpdate();

  document.getElementById('saveTheme').onclick = () => {
    DB.saveSettings({
      r: +cR.value,
      g: +cG.value,
      b: +cB.value
    });
    UI.toast('Цвета сохранены');
  };

  document.getElementById('resetTheme').onclick = () => {
    cR.value = 168; cG.value = 85; cB.value = 247;
    liveUpdate();
  };
}

/* ---------- File → base64 ---------- */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error('Файл больше 5 МБ'));
    }
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}