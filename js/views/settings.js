// แท็บ "ตั้งค่า": ชื่อ, สำรอง/นำเข้าข้อมูล, ล้างข้อมูล
import { store } from '../data/store.js';
import { buildSeed } from '../data/seed.js';
import { esc, icon, avatar, toast, imageUrlProblem, IMAGE_HINT } from '../ui.js';
import * as D from '../domain.js';

export function render() {
  const people = D.profiles();
  const nSessions = new Set(store.all('set_logs').map((l) => l.session_id)).size;
  const where =
    store.adapterName === 'local'
      ? 'ข้อมูลทั้งหมดเก็บอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์ ใช้โหมดไม่ระบุตัวตน หรือเปลี่ยนเครื่อง ข้อมูลจะไม่ตามไปด้วย ควรสำรองเก็บไว้เป็นระยะ'
      : 'ข้อมูลเก็บอยู่บน Supabase และซิงก์ทุกเครื่องที่ล็อกอินบัญชีเดียวกัน';

  return `
    <header class="page-head"><h1>ตั้งค่า</h1></header>

    <section class="card">
      <h3 class="label">คุณกับแฟน</h3>
      ${people
        .map(
          (p) => `<div class="profile-block">
            ${avatar(p, 'lg')}
            <div class="stack-8 grow">
              <label class="field"><span class="label">ชื่อ</span>
                <input class="input" data-change="name" data-id="${p.id}" value="${esc(p.name)}" maxlength="20"></label>
              <label class="field"><span class="label">รูปโปรไฟล์ (ลิงก์รูป ไม่ใส่ก็ได้)</span>
                <input class="input" type="url" inputmode="url" data-change="avatar" data-id="${p.id}" value="${esc(p.avatar_url || '')}" placeholder="https://i.pinimg.com/..."></label>
            </div>
          </div>`,
        )
        .join('')}
      <p class="muted">${IMAGE_HINT} ถ้าไม่ใส่รูป หรือรูปโหลดไม่ขึ้น จะแสดงตัวอักษรแรกของชื่อแทน</p>
    </section>

    <section class="card">
      <h3 class="label">ข้อมูล</h3>
      <p>${where}</p>
      <p class="muted">ตอนนี้มี ${store.all('exercises').length} ท่าในคลัง และบันทึกการเล่นไว้ ${nSessions} วัน</p>
      <button type="button" class="btn" data-act="export">${icon('download', 18)}สำรองข้อมูลเป็นไฟล์</button>
      <label class="btn-ghost file-btn">${icon('upload', 18)}นำเข้าจากไฟล์สำรอง
        <input type="file" accept="application/json,.json" data-change="import" class="sr-only">
      </label>
      <p class="muted">การนำเข้าจะแทนที่ข้อมูลทั้งหมดในเครื่องนี้ด้วยข้อมูลในไฟล์</p>
    </section>

    <section class="card">
      <h3 class="label">เริ่มใหม่</h3>
      <p class="muted">ลบประวัติการเล่นทั้งหมด แล้วกลับไปใช้คลังท่าและแผนตั้งต้น</p>
      <button type="button" class="btn-danger" data-act="reset">${icon('trash', 18)}ล้างข้อมูลทั้งหมด</button>
    </section>
  `;
}

export const changes = {
  async name(value, d) {
    const name = value.trim();
    if (!name) {
      toast('ชื่อห้ามว่าง');
      return;
    }
    await store.update('profiles', d.id, { name });
    toast('บันทึกชื่อแล้ว');
  },
  async avatar(value, d) {
    const problem = imageUrlProblem(value);
    if (problem) {
      toast(problem);
      return;
    }
    await store.update('profiles', d.id, { avatar_url: value.trim() });
    toast(value.trim() ? 'บันทึกรูปแล้ว' : 'เอารูปออกแล้ว');
  },
  async import(_, d, el) {
    const file = el.files?.[0];
    el.value = '';
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('อ่านไฟล์ไม่ได้ ต้องเป็นไฟล์ .json ที่สำรองจากแอพนี้');
    }
    if (!confirm('แทนที่ข้อมูลทั้งหมดในเครื่องนี้ด้วยข้อมูลจากไฟล์?')) return;
    await store.importAll(data);
    toast('นำเข้าข้อมูลแล้ว');
  },
};

export const actions = {
  export() {
    const data = store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fitwithyou-backup-${D.todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('สร้างไฟล์สำรองแล้ว');
  },
  async reset() {
    if (!confirm('ล้างข้อมูลทั้งหมด รวมประวัติการเล่น? แนะนำให้สำรองข้อมูลก่อน')) return;
    await store.reset(buildSeed);
    toast('ล้างข้อมูลแล้ว');
  },
};
