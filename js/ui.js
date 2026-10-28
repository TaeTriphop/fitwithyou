// ตัวช่วยสร้าง HTML ที่ใช้ซ้ำหลายหน้า

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const ICONS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  move: '<path d="M5 12h14M15 8l4 4-4 4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  del: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M13 9l5 6M18 9l-5 6"/>',
  warn: '<path d="M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
};

export function icon(name, size = 20) {
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

export function dot(p) {
  return `<span class="dot" style="--pc:${esc(p.color)}" aria-hidden="true"></span>`;
}

// รูปจากลิงก์: ถ้าโหลดไม่ขึ้น รูปจะหายไปเอง เหลือตัวอักษร/ข้อความเหมือนเดิม
function img(url, onerror) {
  return `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="${onerror}">`;
}

export function avatar(p, cls = '') {
  const first = Array.from(p.name || '?')[0];
  return `<span class="avatar ${cls}" style="--pc:${esc(p.color)}" title="${esc(p.name)}">${esc(first)}${p.avatar_url ? img(p.avatar_url, 'this.remove()') : ''}</span>`;
}

export function thumb(ex, cls = '') {
  return ex?.image_url ? `<span class="thumb ${cls}">${img(ex.image_url, 'this.parentNode.remove()')}</span>` : '';
}

// ตรวจลิงก์รูป: คืนข้อความเตือน หรือ null ถ้าใช้ได้
export function imageUrlProblem(url) {
  const u = (url || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return 'ลิงก์รูปต้องขึ้นต้นด้วย https://';
  if (/pin\.it\/|pinterest\.[a-z.]+\/pin\/|instagram\.com\/(p|reel)\/|tiktok\.com\/|youtube\.com\/|youtu\.be\//i.test(u)) {
    return 'ลิงก์นี้เป็นหน้าโพสต์ ไม่ใช่ตัวรูป ให้กดค้างที่รูปแล้วเลือก "คัดลอกที่อยู่รูปภาพ"';
  }
  return null;
}

export const IMAGE_HINT =
  'ใช้รูปจากเว็บไหนก็ได้ เช่น Pinterest หรือ Google รูปภาพ: กดค้างที่รูป แล้วเลือก "คัดลอกที่อยู่รูปภาพ" มาวาง (ลิงก์โพสต์ IG/TikTok ใช้เป็นรูปไม่ได้)';

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// แผ่นเด้งจากด้านล่าง ปิดได้ด้วยปุ่ม X, แตะพื้นหลัง หรือกด Esc (action "closeSheet")
export function sheet({ title, sub = '', body, footer = '' }) {
  return `<div class="sheet-layer">
    <button type="button" class="sheet-scrim" data-act="closeSheet" aria-label="ปิด" tabindex="-1"></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-head">
        <div class="stack-0">${sub ? `<span class="muted">${esc(sub)}</span>` : ''}<h2>${esc(title)}</h2></div>
        <button type="button" class="icon-btn" data-act="closeSheet" aria-label="ปิด">${icon('x')}</button>
      </div>
      <div class="sheet-body">${body}</div>
      ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
    </div>
  </div>`;
}

// ปุ่ม − ค่า + ; dec/inc คือ attribute ของปุ่ม (เช่น data-act="..." data-d="-1")
export function stepper({ value, dec, inc, label, cls = '' }) {
  return `<div class="stepper ${cls}">
    <button type="button" ${dec} aria-label="ลด${esc(label)}">−</button>
    <span class="stepper-val">${esc(value)}</span>
    <button type="button" ${inc} aria-label="เพิ่ม${esc(label)}">+</button>
  </div>`;
}
