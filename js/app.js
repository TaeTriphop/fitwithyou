import { store } from './data/store.js';
import { buildSeed } from './data/seed.js';
import { setRenderer } from './core.js';
import { esc, toast } from './ui.js';
import * as weekView from './views/week.js';
import * as planView from './views/plan.js';
import * as workoutView from './views/workout.js';
import * as libraryView from './views/library.js';
import * as progressView from './views/progress.js';
import * as settingsView from './views/settings.js';

// [รูปแบบ hash, หน้าจอ, แท็บที่ไฮไลต์ (null = ซ่อนแถบล่าง), ตัวแปลงพารามิเตอร์]
const ROUTES = [
  [/^#\/week(?:\/(\d{4}-\d{2}-\d{2}))?$/, weekView, 'week', (m) => ({ date: m[1] || null })],
  [/^#\/plan$/, planView, 'week', () => ({})],
  [/^#\/workout\/(\d{4}-\d{2}-\d{2})$/, workoutView, null, (m) => ({ date: m[1] })],
  [/^#\/library(?:\/day\/(\d))?$/, libraryView, 'library', (m) => ({ day: m[1] != null ? +m[1] : null })],
  [/^#\/progress(?:\/ex\/([\w-]+))?$/, progressView, 'progress', (m) => ({ ex: m[1] || null })],
  [/^#\/settings$/, settingsView, 'settings', () => ({})],
];

const viewEl = document.getElementById('view');
const tabbar = document.getElementById('tabbar');
let current = null;

function resolve() {
  const hash = location.hash || '#/week';
  for (const [re, view, tab, params] of ROUTES) {
    const m = hash.match(re);
    if (m) return { view, tab, params: params(m), hash };
  }
  return { view: weekView, tab: 'week', params: { date: null }, hash: '#/week' };
}

function render() {
  if (!current) return;
  viewEl.innerHTML = current.view.render(current.params);
  tabbar.hidden = !current.tab;
  document.body.classList.toggle('no-tabbar', !current.tab);
  tabbar.querySelectorAll('a').forEach((a) => {
    const on = a.dataset.tab === current.tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  current.view.after?.(viewEl, current.params);
}

function route() {
  const next = resolve();
  const changed = !current || current.hash !== next.hash;
  if (current && current.view !== next.view) current.view.leave?.();
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
});

// ---------- เริ่มแอพ ----------
store.setErrorHandler((e) => {
  console.error(e);
  toast('บันทึกข้อมูลไม่สำเร็จ ลองอีกครั้ง');
});
setRenderer(render);
store.subscribe(render);

(async () => {
  try {
    await store.init(buildSeed);
  } catch (e) {
    console.error(e);
    viewEl.innerHTML = `<div class="empty"><h2>เปิดข้อมูลไม่ได้</h2><p class="muted">${esc(e.message)}</p></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  route();
})();
