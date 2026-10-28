// หน้าเข้าสู่ระบบ (ใช้เฉพาะตอนเชื่อม Supabase) ใช้บัญชีเดียวร่วมกันทั้งคุณและแฟน
import { store } from '../data/store.js';
import { esc } from '../ui.js';

const st = { error: '', busy: false };
let onSuccess = () => {};

export function setOnSuccess(fn) {
  onSuccess = fn;
}

export function render() {
  return `
    <div class="login">
      <img src="icons/icon.svg" alt="" width="72" height="72">
      <h1>FitWithYou</h1>
      <p class="muted">เข้าสู่ระบบครั้งเดียวในเครื่องนี้ ใช้บัญชีเดียวกันทั้งคุณและแฟน</p>
      <label class="field"><span class="label">อีเมล</span>
        <input id="login-email" class="input" type="email" autocomplete="username" inputmode="email"></label>
      <label class="field"><span class="label">รหัสผ่าน</span>
        <input id="login-pass" class="input" type="password" autocomplete="current-password"></label>
      ${st.error ? `<p class="st-warn" role="alert">${esc(st.error)}</p>` : ''}
      <button type="button" class="btn" data-act="login" ${st.busy ? 'disabled' : ''}>${st.busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
    </div>`;
}

export const actions = {
  async login() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    if (!email || !pass) {
      st.error = 'ใส่อีเมลและรหัสผ่านก่อน';
      return refresh(email);
    }
    st.busy = true;
    st.error = '';
    refresh(email);
    try {
      await store.signIn(email, pass);
      st.busy = false;
      onSuccess();
    } catch (e) {
      st.busy = false;
      st.error = e.message || 'เข้าสู่ระบบไม่สำเร็จ';
      refresh(email);
    }
  },
};

function refresh(email) {
  document.getElementById('view').innerHTML = render();
  const el = document.getElementById('login-email');
  if (el) el.value = email || '';
}
