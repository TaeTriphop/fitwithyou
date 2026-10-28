// แท็บ "แผนของเรา": แผนที่วนซ้ำทุกสัปดาห์ จันทร์ถึงอาทิตย์ (ไม่มีวันที่)
import { store } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, dot, sheet, toast, stepper, scheduleTabs } from '../ui.js';
import * as D from '../domain.js';

// sheet: null | { type: 'item', id } | { type: 'title', wd }
const st = { sheet: null };

export function enter() {
  st.sheet = null;
}

export function render() {
  const people = D.profiles();
  const days = D.DAY_FULL.map((name, wd) => {
    const items = D.planItemsOf(wd);
    const title = D.planDay(wd)?.title || '';
    const rows = items
      .map((it) => {
        const ex = D.exerciseById(it.exercise_id);
        if (!ex) return '';
        const who = people.filter((p) => it.who.includes(p.id));
        const lines = who
          .map((p) => `<span class="person-line">${dot(p)}${esc(p.name)} ${esc(D.targetText(ex, D.targetOrDefault(p.id, ex.id)))}</span>`)
          .join('');
        return `<button type="button" class="plan-row" data-act="editItem" data-id="${it.id}">
          <span class="stack-0 grow"><strong>${esc(ex.name)}</strong>${lines}</span>
          ${icon('next', 18)}
        </button>`;
      })
      .join('');
    const titleEl = items.length
      ? `<button type="button" class="btn-link left" data-act="editTitle" data-wd="${wd}">${title ? esc(title) : 'ตั้งชื่อวัน'}</button>`
      : '<span class="muted">วันพัก</span>';
    return `<section class="card plan-day">
      <div class="row between">
        <div class="stack-0"><h2 class="h-day">${name}</h2>${titleEl}</div>
        <a class="btn-sm" href="#/library/day/${wd}">${icon('plus', 16)}เพิ่มท่า</a>
      </div>
      ${rows ? `<div class="plan-rows">${rows}</div>` : ''}
    </section>`;
  }).join('');

  return `
    <header class="page-head"><h1>ตาราง</h1></header>
    ${scheduleTabs('plan')}
    <p class="muted">แผนนี้ใช้ซ้ำทุกสัปดาห์ แก้ตรงนี้แล้วทุกสัปดาห์เปลี่ยนตาม ถ้าอยากย้ายแค่สัปดาห์เดียว ไปที่แท็บสัปดาห์นี้</p>
    ${days}
    ${renderSheet()}
  `;
}

function renderSheet() {
  if (!st.sheet) return '';
  if (st.sheet.type === 'title') {
    const wd = st.sheet.wd;
    return sheet({
      title: 'ชื่อวัน',
      sub: `วัน${D.DAY_FULL[wd]}`,
      body: `<label class="field"><span class="label">ชื่อที่จะแสดง</span>
        <input id="title-input" class="input" value="${esc(D.planDay(wd)?.title || '')}" placeholder="เช่น ขา + ก้น" maxlength="40"></label>
        <p class="muted">เว้นว่างไว้ แอพจะตั้งชื่อจากกล้ามเนื้อของท่าให้</p>`,
      footer: `<button type="button" class="btn-ghost" data-act="closeSheet">ยกเลิก</button><button type="button" class="btn grow" data-act="saveTitle">บันทึก</button>`,
    });
  }

  const it = store.all('plan_items').find((x) => x.id === st.sheet.id);
  const ex = it && D.exerciseById(it.exercise_id);
  if (!ex) {
    st.sheet = null;
    return '';
  }
  const people = D.profiles();
  const u = D.unitOf(ex);
  const amountLabel = ex.kind === 'time' ? `${u}ต่อเซ็ท` : 'ครั้งต่อเซ็ท';
  const step = D.amountStep(ex);

  const whoBtns = people
    .map((p) => {
      const on = it.who.includes(p.id);
      return `<button type="button" class="toggle ${on ? 'on' : ''}" data-act="toggleWho" data-pid="${p.id}" aria-pressed="${on}">${dot(p)}${esc(p.name)}</button>`;
    })
    .join('');

  const blocks = people
    .filter((p) => it.who.includes(p.id))
    .map((p) => {
      const t = D.targetOrDefault(p.id, ex.id);
      const a = (f, d) => `data-act="adj" data-pid="${p.id}" data-f="${f}" data-d="${d}"`;
      return `<div class="target-block">
        <div class="row">${dot(p)}<strong>${esc(p.name)}</strong></div>
        <div class="target-grid">
          ${ex.kind === 'weight' ? `<div class="field"><span class="label">น้ำหนัก (kg)</span>${stepper({ value: D.fmtNum(t.weight), dec: a('weight', -2.5), inc: a('weight', 2.5), label: `น้ำหนัก ${p.name}` })}</div>` : ''}
          <div class="field"><span class="label">เซ็ท</span>${stepper({ value: t.sets, dec: a('sets', -1), inc: a('sets', 1), label: `จำนวนเซ็ท ${p.name}` })}</div>
          <div class="field"><span class="label">${amountLabel}</span>${stepper({ value: t.reps, dec: a('reps', -step), inc: a('reps', step), label: `${amountLabel} ${p.name}` })}</div>
        </div>
        <label class="field"><span class="label">โน้ต</span>
          <input class="input" data-change="note" data-pid="${p.id}" data-ex="${ex.id}" value="${esc(D.noteOf(p.id, ex.id))}" placeholder="เช่น เบาะระดับ 4" maxlength="80"></label>
      </div>`;
    })
    .join('');

  const dayBtns = D.DAY_SHORT.map((d, i) => {
    const on = i === it.weekday;
    return `<button type="button" class="daypick ${on ? 'on' : ''}" data-act="moveItem" data-wd="${i}" aria-pressed="${on}" aria-label="วัน${D.DAY_FULL[i]}">${d}</button>`;
  }).join('');

  return sheet({
    title: ex.name,
    sub: `วัน${D.DAY_FULL[it.weekday]}`,
    body: `
      <div class="field"><span class="label">ใครเล่น</span><div class="row wrap">${whoBtns}</div></div>
      ${blocks}
      <p class="muted">เป้าหมายกับโน้ตใช้กับท่านี้ทุกวันที่อยู่ในแผน</p>
      <div class="field"><span class="label">อยู่วันไหน</span><div class="daypicks">${dayBtns}</div></div>
      <div class="row">
        <button type="button" class="btn-ghost grow" data-act="order" data-d="-1">${icon('up', 18)}เลื่อนขึ้น</button>
        <button type="button" class="btn-ghost grow" data-act="order" data-d="1">${icon('down', 18)}เลื่อนลง</button>
      </div>
      <button type="button" class="btn-danger" data-act="removeItem">${icon('trash', 18)}เอาออกจากวัน${D.DAY_FULL[it.weekday]}</button>`,
    footer: `<button type="button" class="btn grow" data-act="closeSheet">เสร็จ</button>`,
  });
}

const currentItem = () => store.all('plan_items').find((x) => x.id === st.sheet?.id);

async function renumber(wd, ordered) {
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].sort !== i) await store.update('plan_items', ordered[i].id, { sort: i });
  }
}

export const actions = {
  editItem(d) {
    st.sheet = { type: 'item', id: d.id };
    rerender();
  },
  editTitle(d) {
    st.sheet = { type: 'title', wd: +d.wd };
    rerender();
    document.getElementById('title-input')?.focus();
  },
  closeSheet() {
    st.sheet = null;
    rerender();
  },
  async saveTitle() {
    const wd = st.sheet.wd;
    const value = document.getElementById('title-input')?.value.trim() || '';
    const row = D.planDay(wd);
    st.sheet = null;
    if (row) await store.update('plan_days', row.id, { title: value });
    else await store.insert('plan_days', { weekday: wd, title: value });
    rerender();
  },
  async toggleWho(d) {
    const it = currentItem();
    const has = it.who.includes(d.pid);
    if (has && it.who.length === 1) {
      toast('ต้องมีคนเล่นอย่างน้อย 1 คน');
      return;
    }
    const who = has ? it.who.filter((x) => x !== d.pid) : [...it.who, d.pid];
    if (!has) await D.ensureTarget(d.pid, it.exercise_id);
    await store.update('plan_items', it.id, { who });
  },
  async adj(d) {
    const it = currentItem();
    const t = await D.ensureTarget(d.pid, it.exercise_id);
    const f = d.f;
    let v = (+t[f] || 0) + +d.d;
    v = f === 'weight' ? Math.max(0, Math.round(v * 100) / 100) : Math.max(1, v);
    await store.update('targets', t.id, { [f]: v });
  },
  async moveItem(d) {
    const it = currentItem();
    const wd = +d.wd;
    if (wd === it.weekday) return;
    if (D.planItemsOf(wd).some((x) => x.exercise_id === it.exercise_id)) {
      toast(`วัน${D.DAY_FULL[wd]}มีท่านี้อยู่แล้ว`);
      return;
    }
    const sort = D.planItemsOf(wd).length;
    const from = it.weekday;
    await store.update('plan_items', it.id, { weekday: wd, sort });
    await renumber(from, D.planItemsOf(from));
    toast(`ย้ายไปวัน${D.DAY_FULL[wd]}แล้ว`);
  },
  async order(d) {
    const it = currentItem();
    const list = D.planItemsOf(it.weekday);
    const i = list.findIndex((x) => x.id === it.id);
    const j = i + +d.d;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await renumber(it.weekday, list);
  },
  async removeItem() {
    const it = currentItem();
    st.sheet = null;
    await store.remove('plan_items', it.id);
    await renumber(it.weekday, D.planItemsOf(it.weekday));
    toast('เอาออกจากแผนแล้ว');
  },
};

export const changes = {
  async note(value, d) {
    await D.saveNote(d.pid, d.ex, value);
  },
};
