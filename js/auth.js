/* ============================================
   AUTH — вход, регистрация, гость (index.html)
   ============================================ */

console.log('[auth.js] загружен');

function $(id) { return document.getElementById(id); }

function note(text, cls) {
  const n = $('authNote');
  if (!n) return;
  n.textContent = text;
  n.className = 'auth-note' + (cls ? ' ' + cls : '');
}

/* ============================================
   ГОСТЬ
   ============================================ */
function markGuest() {
  try {
    if (typeof DB !== 'undefined') {
      DB.setSession({ guest: true, userId: null });
    }
  } catch (e) {}
}

/* ============================================
   ВХОД
   ============================================ */
function doLogin() {
  console.log('[auth] doLogin');

  const u = ($('loginUser')?.value || '').trim();
  const p = $('loginPass')?.value || '';

  if (!u || !p) return note('Заполните все поля', 'error');

  if (typeof DB === 'undefined') return note('Ошибка: DB не загружена', 'error');

  const user = DB.findUserByUsername(u);
  if (!user || user.password !== p) {
    return note('Неверный логин или пароль', 'error');
  }

  DB.setSession({ userId: user.id });
  note('Добро пожаловать!', 'ok');
  setTimeout(function() { window.location.href = 'app.html'; }, 300);
}

/* ============================================
   РЕГИСТРАЦИЯ
   ============================================ */
function doRegister() {
  console.log('[auth] doRegister');

  const u  = ($('regUser')?.value || '').trim();
  const p1 = $('regPass')?.value || '';
  const p2 = $('regPass2')?.value || '';
  const roleEl = document.querySelector('input[name="role"]:checked');
  const role = roleEl ? roleEl.value : 'listener';

  if (u.length < 3)   return note('Логин не короче 3 символов', 'error');
  if (p1.length < 4)  return note('Пароль не короче 4 символов', 'error');
  if (p1 !== p2)      return note('Пароли не совпадают', 'error');

  if (typeof DB === 'undefined') return note('Ошибка: DB не загружена', 'error');

  if (DB.findUserByUsername(u)) {
    return note('Такой логин уже занят', 'error');
  }

  const user = {
    id: DB.uid(),
    username: u,
    password: p1,
    role: role,
    avatar: null,
    banner: null,
    createdAt: Date.now()
  };

  const users = DB.users();
  users.push(user);
  DB.saveUsers(users);
  DB.setSession({ userId: user.id });

  note('Аккаунт создан. Переходим...', 'ok');
  setTimeout(function() { window.location.href = 'app.html'; }, 400);
}

/* ============================================
   Табы + пузырьки + применение цветов
   ============================================ */
(function() {
  function boot() {
    /* Применяем сохранённые цвета и на странице входа */
    try {
      const s = DB.settings();
      const root = document.documentElement;
      root.style.setProperty('--accent-r', s.r);
      root.style.setProperty('--accent-g', s.g);
      root.style.setProperty('--accent-b', s.b);
    } catch (e) { /* ignore */ }

    if (typeof hydrateIcons === 'function') hydrateIcons();

    var wrap = $('bubbles');
    if (wrap) {
      var n = window.innerWidth < 640 ? 10 : 18;
      for (var i = 0; i < n; i++) {
        var b = document.createElement('div');
        b.className = 'bubble';
        var s = 20 + Math.random() * 90;
        b.style.width = s + 'px';
        b.style.height = s + 'px';
        b.style.left = Math.random() * 100 + '%';
        b.style.animationDuration = (12 + Math.random() * 18) + 's';
        b.style.animationDelay = (-Math.random() * 20) + 's';
        wrap.appendChild(b);
      }
    }

    var tl = $('tabLogin');
    var tr = $('tabRegister');
    var lf = $('loginForm');
    var rf = $('registerForm');

    if (tl && tr && lf && rf) {
      tl.onclick = function() {
        tl.classList.add('active');
        tr.classList.remove('active');
        lf.classList.remove('hidden');
        rf.classList.add('hidden');
        note('', '');
      };
      tr.onclick = function() {
        tr.classList.add('active');
        tl.classList.remove('active');
        rf.classList.remove('hidden');
        lf.classList.add('hidden');
        note('', '');
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();