// แท็บ "คลังท่า": ค้นหา กรองหมวด ใส่ลงวันในแผน และเพิ่ม/แก้ท่าเอง
import { store, uid } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, dot, thumb, sheet, toast, imageUrlProblem, IMAGE_HINT } from '../ui.js';
import * as D from '../domain.js';

const KINDS = [
  ['weight', 'น้ำหนัก × ครั้ง'],
  ['reps', 'นับครั้ง'],
  ['time', 'จับเวลา'],
];

// sheet: null | { type: 'assign', id, days: number[], who: 'all' | profileId } | { type: 'form', form }
const st = { q: '', cat: 'ทั้งหมด', day: null, sheet: null };

export function enter(p) {
  st.day = p.day;
  st.sheet = null;
}

function results() {
  const list = D.searchExercises(st.q, st.cat);
  const items = store.all('plan_items');
  const rows = list
    .map((e) => {
      const days = [...new Set(items.filter((i) => i.exercise_id === e.id).map((i) => i.weekday))].sort();
      const inTarget = st.day != null && days.includes(st.day);
      return `<button type="button" class="lib-row ${inTarget ? 'is-in' : ''}" data-act="open" data-id="${e.id}">
        ${thumb(e, 'sm')}
        <span class="stack-0 grow">
          <strong>${esc(e.name)}</strong>
          <span class="muted">${esc(e.muscles)} · ${esc(e.equipment)}</span>
          ${days.length ? `<span class="in-days">อยู่ในวัน ${days.map((i) => D.DAY_SHORT[i]).join(', ')}</span>` : ''}
        </span>
        <span class="add-ic">${inTarget ? icon('check') : icon('plus')}</span>
      </button>`;
    })
    .join('');
  return `<p class="muted" aria-live="polite">พบ ${list.length} ท่า</p>
    ${rows || '<div class="empty"><p>ไม่เจอท่าที่ค้นหา ลองคำอื่น หรือเพิ่มท่าใหม่เอง</p><button type="button" class="btn-ghost" data-act="openCreate">' + icon('plus', 18) + 'เพิ่มท่าใหม่</button></div>'}`;
}

export function render() {
  const cats = ['ทั้งหมด', ...D.CATEGORIES]
    .map((c) => `<button type="button" class="chip ${st.cat === c ? 'on' : ''}" data-act="cat" data-c="${c}" aria-pressed="${st.cat === c}">${c}</button>`)
    .join('');
  const banner =
    st.day != null
      ? `<div class="notice accent"><p>กำลังเพิ่มท่าลงวัน${D.DAY_FULL[st.day]} แตะท่าที่ต้องการ</p><a class="btn-link" href="#/plan">เสร็จ</a></div>`
      : '';
  return `
    <header class="page-head">
      <h1>คลังท่า</h1>
      <button type="button" class="btn-sm" data-act="openCreate">${icon('plus', 16)}ท่าใหม่</button>
    </header>
    ${banner}
    <label class="search">
      ${icon('search')}
      <span class="sr-only">ค้นหาท่า</span>
      <input id="lib-q" type="search" data-input="q" value="${esc(st.q)}" placeholder="ค้นหา เช่น ก้น, glute, ดัมเบล" autocomplete="off">
    </label>
    <div class="chips" role="group" aria-label="กรองตามหมวด">${cats}</div>
    <div id="lib-results" class="stack-8">${results()}</div>
    ${renderSheet()}
  `;
}

function renderSheet() {
  if (!st.sheet) return '';
  return st.sheet.type === 'form' ? formSheet() : assignSheet();
}

function assignSheet() {
  const s = st.sheet;
  const ex = D.exerciseById(s.id);
  if (!ex) {
    st.sheet = null;
    return '';
  }
  const people = D.profiles();
  const dayBtns = D.DAY_SHORT.map((d, i) => {
    const on = s.days.includes(i);
    return `<button type="button" class="daypick ${on ? 'on' : ''}" data-act="toggleDay" data-i="${i}" aria-pressed="${on}" aria-label="วัน${D.DAY_FULL[i]}">${d}</button>`;
  }).join('');
  const whoOpts = [['all', 'ทั้งคู่'], ...people.map((p) => [p.id, p.name])]
    .map(([k, label]) => `<button type="button" class="${s.who === k ? 'on' : ''}" data-act="who" data-k="${k}" aria-pressed="${s.who === k}">${esc(label)}</button>`)
    .join('');

  const history = people
    .map((p) => {
      const h = D.history(ex.id, p.id).slice(-3).reverse();
      if (!h.length) return '';
      return h
        .map(
          (e) => `<div class="person-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">${esc(D.resultText(ex, e))}</span>
            <span class="${e.ev.complete ? 'st-ok' : 'st-warn'}">${e.ev.complete ? 'ครบ' : `${e.ev.total}/${e.ev.goal}`}</span>
            <span class="muted nowrap">${D.fmtShortDate(e.date)}</span></div>`,
        )
        .join('');
    })
    .join('');

  const subs = D.substitutesFor(ex, new Set(), 5)
    .map(
      (e) => `<button type="button" class="sub-row as-btn" data-act="open" data-id="${e.id}">${thumb(e, 'sm')}
        <span class="stack-0 grow"><strong>${esc(e.name)}</strong><span class="muted">${esc(e.muscles)} · ${esc(e.equipment)}</span></span>${icon('next', 18)}</button>`,
    )
    .join('');

  const n = s.days.length;
  const inPlan = store.all('plan_items').some((i) => i.exercise_id === ex.id);
  return sheet({
    title: ex.name,
    sub: `${ex.muscles} · ${ex.equipment}`,
    body: `
      ${ex.image_url ? `<div class="hero">${thumb(ex, 'lg')}</div>` : ''}
      <div class="row wrap">
        ${ex.video_url
          ? `<a class="btn-sm" href="${esc(ex.video_url)}" target="_blank" rel="noopener">${icon('play', 14)}ดูคลิปตัวอย่าง</a>`
          : `<button type="button" class="btn-sm" data-act="openEdit" data-id="${ex.id}">${icon('plus', 14)}เพิ่มคลิปตัวอย่าง</button>`}
        <button type="button" class="btn-sm" data-act="openEdit" data-id="${ex.id}">${icon('edit', 14)}แก้ไขท่า</button>
      </div>
      <div class="field"><span class="label">เล่นวันไหนบ้าง (เลือกได้หลายวัน)</span><div class="daypicks">${dayBtns}</div></div>
      <div class="field"><span class="label">ใครเล่น</span><div class="seg seg-btns">${whoOpts}</div></div>
      <section class="stack-8"><h3 class="label">เล่นครั้งล่าสุด</h3>${history || '<p class="muted">ยังไม่เคยบันทึกท่านี้</p>'}</section>
      <section class="stack-8"><h3 class="label">ท่าทดแทน</h3>${subs || '<p class="muted">ยังไม่มีท่าที่คล้ายกันในคลัง</p>'}</section>`,
    footer: `<button type="button" class="btn-ghost" data-act="closeSheet">ปิด</button>
      <button type="button" class="btn grow" data-act="saveAssign" ${!n && !inPlan ? 'disabled' : ''}>${n ? `บันทึกลงแผน ${n} วัน` : inPlan ? 'เอาออกจากแผน' : 'เลือกวันก่อน'}</button>`,
  });
}

function formSheet() {
  const f = st.sheet.form;
  const isEdit = !!f.id;
  const ex = isEdit ? D.exerciseById(f.id) : null;
  const hasLogs = isEdit && store.all('set_logs').some((l) => l.exercise_id === f.id);
  const catBtns = D.CATEGORIES.map((c) => {
    const on = f.categories.includes(c);
    return `<button type="button" class="chip ${on ? 'on' : ''}" data-act="formCat" data-c="${c}" aria-pressed="${on}">${c}</button>`;
  }).join('');
  const kindBtns = KINDS.map(([k, label]) => `<button type="button" class="${f.kind === k ? 'on' : ''}" data-act="formKind" data-k="${k}" aria-pressed="${f.kind === k}">${label}</button>`).join('');
  const unitBtns = [['วิ', 'วินาที'], ['นาที', 'นาที']]
    .map(([u, label]) => `<button type="button" class="${f.unit === u ? 'on' : ''}" data-act="formUnit" data-u="${u}" aria-pressed="${f.unit === u}">${label}</button>`)
    .join('');
  const input = (field, label, ph, type = 'text') =>
    `<label class="field"><span class="label">${label}</span><input class="input" type="${type}" data-input="form" data-f="${field}" value="${esc(f[field])}" placeholder="${ph}" ${type === 'url' ? 'inputmode="url"' : ''}></label>`;
  const canDelete = isEdit && ex?.is_custom && !hasLogs;
  return sheet({
    title: isEdit ? 'แก้ไขท่า' : 'เพิ่มท่าใหม่',
    sub: isEdit ? ex?.name : '',
    body: `
      ${input('name', 'ชื่อท่า', 'เช่น Smith Machine Squat')}
      ${input('muscles', 'กล้ามเนื้อที่โดน', 'เช่น ขาหน้า · ก้น')}
      <div class="field"><span class="label">หมวด (ใช้ค้นหา เลือกได้หลายหมวด)</span><div class="row wrap">${catBtns}</div></div>
      ${input('equipment', 'อุปกรณ์', 'เช่น เครื่อง, ดัมเบล, เคเบิล')}
      <div class="field"><span class="label">บันทึกแบบไหน</span><div class="seg seg-btns">${kindBtns}</div></div>
      ${f.kind === 'time' ? `<div class="field"><span class="label">หน่วยเวลา</span><div class="seg seg-btns">${unitBtns}</div></div>` : ''}
      ${input('video_url', 'คลิปตัวอย่าง (ไม่ใส่ก็ได้)', 'ลิงก์จาก YouTube, Instagram หรือ TikTok', 'url')}
      ${input('image_url', 'รูป (ไม่ใส่ก็ได้)', 'https://i.pinimg.com/...', 'url')}
      <p class="muted">${IMAGE_HINT}</p>
      <div id="img-preview" class="hero">${f.image_url ? thumb({ image_url: f.image_url }, 'lg') : ''}</div>
      ${canDelete ? `<button type="button" class="btn-danger" data-act="deleteEx">${icon('trash', 18)}ลบท่านี้</button>` : ''}
      ${isEdit && hasLogs && ex?.is_custom ? '<p class="muted">ท่านี้มีประวัติการเล่นแล้ว จึงลบไม่ได้ แต่แก้ไขได้</p>' : ''}`,
    footer: `<button type="button" class="btn-ghost" data-act="closeSheet">ยกเลิก</button>
      <button type="button" class="btn grow" data-act="saveForm">${isEdit ? 'บันทึก' : 'เพิ่มท่า'}</button>`,
  });
}

function refreshResults() {
  const el = document.getElementById('lib-results');
  if (el) el.innerHTML = results();
}

export const inputs = {
  q(value) {
    st.q = value;
    refreshResults();
  },
  form(value, d) {
    if (st.sheet?.type !== 'form') return;
    st.sheet.form[d.f] = value;
    if (d.f === 'image_url') {
      const el = document.getElementById('img-preview');
      const ok = value.trim() && !imageUrlProblem(value);
      if (el) el.innerHTML = ok ? thumb({ image_url: value.trim() }, 'lg') : '';
    }
  },
};

export const actions = {
  cat(d) {
    st.cat = d.c;
    rerender();
  },
  open(d) {
    st.sheet = { type: 'assign', ...assignStateFor(d.id) };
    rerender();
  },
  closeSheet() {
    st.sheet = null;
    rerender();
  },
  toggleDay(d) {
    const i = +d.i;
    const days = st.sheet.days;
    st.sheet.days = days.includes(i) ? days.filter((x) => x !== i) : [...days, i];
    rerender();
  },
  who(d) {
    st.sheet.who = d.k;
    rerender();
  },
  async saveAssign() {
    const { id, days, who: whoKey } = st.sheet;
    const people = D.profiles();
    const who = whoKey === 'all' ? people.map((p) => p.id) : [whoKey];
    const existing = store.all('plan_items').filter((i) => i.exercise_id === id);
    st.sheet = null;
    for (const it of existing) {
      if (!days.includes(it.weekday)) await store.remove('plan_items', it.id);
      else if (it.who.join() !== who.join()) await store.update('plan_items', it.id, { who });
    }
    for (const wd of days) {
      if (existing.some((i) => i.weekday === wd)) continue;
      await store.insert('plan_items', { weekday: wd, exercise_id: id, sort: D.planItemsOf(wd).length, who });
    }
    for (const pid of who) await D.ensureTarget(pid, id);
    rerender();
    toast(days.length ? 'บันทึกลงแผนแล้ว' : 'เอาออกจากแผนแล้ว');
  },
  openCreate() {
    st.sheet = {
      type: 'form',
      form: { id: null, name: st.q.trim(), muscles: '', equipment: '', categories: st.cat !== 'ทั้งหมด' ? [st.cat] : [], kind: 'weight', unit: 'วิ', video_url: '', image_url: '' },
    };
    rerender();
  },
  openEdit(d) {
    const e = D.exerciseById(d.id);
    st.sheet = {
      type: 'form',
      form: { id: e.id, name: e.name, muscles: e.muscles || '', equipment: e.equipment || '', categories: [...e.categories], kind: e.kind, unit: e.unit || 'วิ', video_url: e.video_url || '', image_url: e.image_url || '' },
    };
    rerender();
  },
  formCat(d) {
    const f = st.sheet.form;
    f.categories = f.categories.includes(d.c) ? f.categories.filter((c) => c !== d.c) : [...f.categories, d.c];
    rerender();
  },
  formKind(d) {
    st.sheet.form.kind = d.k;
    rerender();
  },
  formUnit(d) {
    st.sheet.form.unit = d.u;
    rerender();
  },
  async saveForm() {
    const f = st.sheet.form;
    const name = f.name.trim();
    if (!name) return toast('ใส่ชื่อท่าก่อน');
    if (!f.categories.length) return toast('เลือกหมวดอย่างน้อย 1 หมวด');
    const dup = store.all('exercises').find((e) => e.name.toLowerCase() === name.toLowerCase() && e.id !== f.id);
    if (dup) return toast('มีท่าชื่อนี้อยู่แล้ว');
    const url = f.video_url.trim();
    if (url && !/^https?:\/\//i.test(url)) return toast('ลิงก์คลิปต้องขึ้นต้นด้วย https://');
    const imgProblem = imageUrlProblem(f.image_url);
    if (imgProblem) return toast(imgProblem);
    const row = {
      name,
      muscles: f.muscles.trim() || f.categories.join(' · '),
      equipment: f.equipment.trim() || '-',
      categories: f.categories,
      kind: f.kind,
      unit: f.kind === 'time' ? f.unit : null,
      video_url: url,
      image_url: f.image_url.trim(),
    };
    if (f.id) {
      await store.update('exercises', f.id, row);
      st.sheet = { type: 'assign', ...assignStateFor(f.id) };
      toast('บันทึกแล้ว');
    } else {
      const created = await store.insert('exercises', { id: 'ex-' + uid(), is_custom: true, ...row });
      st.q = '';
      st.sheet = { type: 'assign', ...assignStateFor(created.id) };
      toast('เพิ่มท่าแล้ว เลือกวันที่จะเล่นได้เลย');
    }
    rerender();
  },
  async deleteEx() {
    const id = st.sheet.form.id;
    if (!confirm('ลบท่านี้ออกจากคลังและแผน?')) return;
    st.sheet = null;
    await store.removeWhere('plan_items', (i) => i.exercise_id === id);
    await store.removeWhere('targets', (t) => t.exercise_id === id);
    await store.removeWhere('exercise_notes', (n) => n.exercise_id === id);
    await store.remove('exercises', id);
    toast('ลบท่าแล้ว');
  },
};

function assignStateFor(id) {
  const people = D.profiles();
  const items = store.all('plan_items').filter((i) => i.exercise_id === id);
  const days = [...new Set(items.map((i) => i.weekday))];
  if (st.day != null && !days.includes(st.day)) days.push(st.day);
  const who0 = items[0]?.who || people.map((p) => p.id);
  return { id, days, who: who0.length >= people.length ? 'all' : who0[0] };
}
