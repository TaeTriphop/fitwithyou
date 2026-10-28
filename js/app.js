import { store } from './data/store.js';
import { buildSeed } from './data/seed.js';
import { setRenderer } from './core.js';
import { esc, toast } from './ui.js';
import * as scheduleView from './views/schedule.js';
import * as workoutView from './views/workout.js';
import * as overviewView from './views/overview.js';
import * as libraryView from './views/library.js';
import * as settingsView from './views/settings.js';
import * as loginView from './views/login.js';

// [รูปแบบ hash, หน้าจอ, แท็บที่ไฮไลต์ (null = ซ่อนแถบล่าง), พารามิเตอร์]
const ROUTES = [
  [/^#\/schedule(?:\/day\/(\d))?$/, scheduleView, 'schedule', (m) => ({ day: m[1] != null ? +m[1] : null })],
  [/^#\/workout\/(\d{4}-\d{2}-\d{2})(?:\/plan\/(\d))?$/, workoutView, null, (m) => ({ date: m[1], plan: m[2] != null ? +m[2] : null })],
  [/^#\/overview(?:\/ex\/([\w-]+))?$/, overviewView, 'overview', (m) => ({ ex: m[1] || null })],
  [/^#\/library(?:\/day\/(\d))?$/, libraryView, 'library', (m) => ({ day: m[1] != null ? +m[1] : null })],
  [/^#\/settings$/, settingsView, 'settings', () => ({})],
];

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let current = null;
let ready = false;

function resolve() {
  const hash = location.hash || '#/schedule';
  for (const [re, view, tab, params] of ROUTES) {
    const m = hash.match(re);
    if (m) return { view, tab, params: params(m), hash };
  }
  return { view: scheduleView, tab: 'schedule', params: { day: null }, hash: '#/schedule' };
}

function render() {
  if (!current) return;
  // จำตำแหน่งเลื่อนในแผ่นเด้งไว้ ไม่ให้เด้งกลับขึ้นบนทุกครั้งที่กดบันทึก
  const prevBody = viewEl.querySelector('.sheet-body');
  const prevKey = viewEl.querySelector('.sheet')?.getAttribute('aria-label');
  const scroll = prevBody ? prevBody.scrollTop : 0;
  viewEl.innerHTML = current.view.render(current.params);
  const nextBody = viewEl.querySelector('.sheet-body');
  if (nextBody && prevBody && viewEl.querySelector('.sheet')?.getAttribute('aria-label') === prevKey) nextBody.scrollTop = scroll;

  tabbar.hidden = !current.tab;
  document.body.classList.toggle('no-tabbar', !current.tab);
  tabbar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === current.tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

function route() {
  const next = resolve();
  const changed = !current || current.hash !== next.hash;
  current = next;
  if (changed) {
    current.view.enter?.(current.params);
    window.scrollTo(0, 0);
  }
  render();
}

// ---------- event delegation: data-act (คลิก), data-input (พิมพ์), data-change (เปลี่ยนค่า) ----------
function run(fn, ...args) {
  Promise.resolve()
    .then(() => fn(...args))
    .catch((err) => {
      console.error(err);
      toast(err?.message ? `ทำไม่สำเร็จ: ${err.message}` : 'ทำไม่สำเร็จ ลองอีกครั้ง');
    });
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || !current || el.disabled) return;
  const fn = current.view.actions?.[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  run(fn, el.dataset, el, e);
});

document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-input]');
  const fn = el && current?.view.inputs?.[el.dataset.input];
  if (fn) run(fn, el.value, el.dataset, el);
});

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-change]');
  const fn = el && current?.view.changes?.[el.dataset.change];
  if (fn) run(fn, el.value, el.dataset, el);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.querySelector('.sheet-layer')) current?.view.actions?.closeSheet?.({});
  if (e.key === 'Enter' && current?.view === loginView && e.target.closest('.login')) run(loginView.actions.login);
});

// กลับมาเปิดแอพอีกครั้ง: ดึงข้อมูลล่าสุด (เผื่อแฟนบันทึกจากอีกเครื่อง)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ready && store.isRemote && !document.querySelector('.sheet-layer')) store.reload().catch(() => {});
});

// ---------- เริ่มแอพ ----------
store.setErrorHandler((e) => {
  console.error(e);
  toast(`บันทึกไม่สำเร็จ: ${e.message || 'ลองอีกครั้ง'}`);
});
setRenderer(render);
store.subscribe(render);
loginView.setOnSuccess(boot);

async function boot() {
  try {
    await store.init(buildSeed);
  } catch (e) {
    if (e.code === 'AUTH_REQUIRED') {
      current = { view: loginView, tab: null, params: {}, hash: '#login' };
      render();
      return;
    }
    console.error(e);
    tabbar.hidden = true;
    viewEl.innerHTML = `<div class="empty"><h2>เปิดข้อมูลไม่ได้</h2><p class="muted">${esc(e.message)}</p><button type="button" class="btn" onclick="location.reload()">ลองใหม่</button></div>`;
    return;
  }
  if (!ready) window.addEventListener('hashchange', route);
  ready = true;
  current = null;
  route();
}

boot();
