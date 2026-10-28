// หน้าใส่รหัสวันครบรอบ (ใส่ครั้งเดียวต่อเครื่อง) จุดแต่ละหลักเป็นรูปหัวใจ
import { pinStore } from '../data/store.js';
import { icon } from '../ui.js';

const LENGTH = 8;
const st = { digits: '', status: 'idle', message: '' }; // status: idle | checking | wrong | ok
let tryPin = async () => {};

// fn(pin) ต้องคืน true ถ้ารหัสถูก, false ถ้าผิด หรือ throw ถ้าเชื่อมต่อไม่ได้
export function setVerifier(fn) {
  tryPin = fn;
}

const HEART = '<path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z"/>';

function heart(filled, i) {
  return `<svg class="pin-heart ${filled ? 'on' : ''}" style="--i:${i}" width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">${HEART}</svg>`;
}

export function render() {
  const hearts = Array.from({ length: LENGTH }, (_, i) => heart(i < st.digits.length, i)).join('');
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']
    .map((k) => {
      if (!k) return '<span></span>';
      if (k === 'del') return `<button type="button" class="pin-key ghost" data-act="del" aria-label="ลบ">${icon('del', 26)}</button>`;
      return `<button type="button" class="pin-key" data-act="digit" data-k="${k}">${k}</button>`;
    })
    .join('');
  const msg =
    st.status === 'wrong'
      ? `<p class="pin-msg warn" role="alert">${st.message || 'ยังไม่ใช่นะ ลองใหม่อีกที'}</p>`
      : st.status === 'checking'
        ? '<p class="pin-msg" role="status">กำลังเปิด…</p>'
        : st.status === 'ok'
          ? '<p class="pin-msg ok" role="status">ยินดีต้อนรับกลับมา ♥</p>'
          : '<p class="pin-msg muted">ใส่ครั้งเดียว เครื่องนี้จะจำไว้ให้</p>';
  return `
    <div class="pin ${st.status}">
      <div class="pin-logo" aria-hidden="true"><span class="c1"></span><span class="c2"></span></div>
      <h1>FitWithYou</h1>
      <p class="pin-title">ใส่วันครบรอบของเรา</p>
      <div class="pin-hearts" role="img" aria-label="ใส่แล้ว ${st.digits.length} จาก ${LENGTH} หลัก">${hearts}</div>
      ${msg}
      <div class="pin-pad">${keys}</div>
    </div>`;
}

function refresh() {
  const el = document.getElementById('view');
  if (el) el.innerHTML = render();
}

async function submit() {
  st.status = 'checking';
  refresh();
  const pin = st.digits;
  try {
    const ok = await tryPin(pin);
    if (ok) {
      st.status = 'ok';
      refresh();
      return;
    }
    st.message = '';
  } catch (e) {
    st.message = 'เชื่อมต่อไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วใส่ใหม่';
    console.error(e);
  }
  pinStore.clear();
  st.status = 'wrong';
  st.digits = '';
  refresh();
}

export const actions = {
  digit(d) {
    if (st.status === 'checking' || st.status === 'ok') return;
    if (st.status === 'wrong') st.status = 'idle';
    if (st.digits.length >= LENGTH) return;
    st.digits += d.k;
    refresh();
    if (st.digits.length === LENGTH) setTimeout(submit, 150);
  },
  del() {
    if (st.status === 'checking' || st.status === 'ok') return;
    st.status = 'idle';
    st.digits = st.digits.slice(0, -1);
    refresh();
  },
};

// พิมพ์จากคีย์บอร์ดได้ด้วย (ตอนเปิดบนคอม)
export function onKey(e) {
  if (/^\d$/.test(e.key)) actions.digit({ k: e.key });
  else if (e.key === 'Backspace') actions.del();
}
