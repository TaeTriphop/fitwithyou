// หน้าวันนี้: รายการท่าทั้งหมดของวัน เลือกเล่นท่าไหนก่อนก็ได้ แตะท่าเพื่อบันทึก
import { store, uid } from '../data/store.js';
import { rerender, go } from '../core.js';
import { esc, icon, dot, avatar, thumb, sheet, toast, stepper } from '../ui.js';
import * as D from '../domain.js';
import { exerciseCard } from './shared.js';

// open = id ของท่าที่เปิดบันทึกอยู่ ; adding = เปิดแผ่นเพิ่มท่าเฉพาะวันนี้
const st = { date: null, open: null, adding: false, pickQ: '' };

export function enter(p) {
  st.date = p.date;
  st.open = null;
  st.adding = false;
  st.pickQ = '';
}

async function ensureSession() {
  return D.sessionOf(st.date) || store.insert('sessions', { date: st.date, extra_items: [], substitutions: [], finished_at: null });
}

const openItem = () => D.workoutItems(st.date).find((x) => x.exercise_id === st.open);

async function writeSet(ex, pid, index, reps) {
  const s = await ensureSession();
  const t = D.targetOrDefault(pid, ex.id);
  const log = D.logsOf(s.id, ex.id, pid).find((l) => l.set_index === index);
  if (log) return store.update('set_logs', log.id, { reps });
  return store.insert('set_logs', {
    session_id: s.id,
    exercise_id: ex.id,
    profile_id: pid,
    set_index: index,
    weight: t.weight,
    reps,
    target_sets: t.sets,
    target_reps: t.reps,
  });
}

// ---------- หน้ารายการ ----------
export function render() {
  const items = D.workoutItems(st.date);
  const session = D.sessionOf(st.date);
  const logs = session ? store.all('set_logs').filter((l) => l.session_id === session.id) : [];
  const people = D.profiles();
  const day = D.effectiveDay(st.date);
  const title = day.title || D.autoTitle(items) || 'เล่นนอกแผน';
  const isToday = st.date === D.todayISO();

  const played = (it) => logs.some((l) => l.exercise_id === it.exercise_id);
  const todo = items.filter((it) => !played(it));
  const done = items.filter(played);
  const ctx = { date: st.date, logs };

  const summary = items.length
    ? `<section class="today-sum">
        <strong>${isToday ? 'วันนี้' : 'วันนี้มี'} ${items.length} ท่า</strong>
        <span class="muted">${done.length ? `เล่นแล้ว ${done.length} · เหลือ ${todo.length}` : 'เลือกเล่นท่าไหนก่อนก็ได้'}</span>
      </section>`
    : `<div class="card center"><h3>ยังไม่มีท่าในวันนี้</h3><p class="muted">เพิ่มท่าที่จะเล่นได้เลย ไม่กระทบแผนหลัก</p></div>`;

  return `
    <header class="wk-top">
      <a class="icon-btn" href="#/week/${st.date}" aria-label="กลับไปตาราง">${icon('back', 22)}</a>
      <div class="stack-0 grow"><span class="muted">${D.fmtDayDate(st.date)}</span><strong>${esc(title)}</strong></div>
    </header>
    ${summary}
    ${todo.map((it) => exerciseCard(it, ctx, people, { asButton: true })).join('')}
    ${done.length ? `<h3 class="label section-label">เล่นแล้ว</h3>${done.map((it) => exerciseCard(it, ctx, people, { asButton: true })).join('')}` : ''}
    <button type="button" class="btn-dashed" data-act="openAdd">${icon('plus', 18)}เพิ่มท่าเฉพาะวันนี้</button>
    <div class="bottombar">
      <button type="button" class="btn grow" data-act="finish">จบวันนี้</button>
    </div>
    ${st.open ? logSheet(items, people) : ''}
    ${st.adding ? addSheet(items) : ''}`;
}

// ---------- แผ่นบันทึกของท่า ----------
function logSheet(items, people) {
  const it = items.find((x) => x.exercise_id === st.open);
  const ex = it && D.exerciseById(it.exercise_id);
  if (!ex) {
    st.open = null;
    return '';
  }
  const session = D.sessionOf(st.date);
  const who = people.filter((p) => it.who.includes(p.id));
  const u = D.unitOf(ex);
  const step = D.amountStep(ex);
  const T = Object.fromEntries(who.map((p) => [p.id, D.targetOrDefault(p.id, ex.id)]));
  const L = Object.fromEntries(who.map((p) => [p.id, session ? D.logsOf(session.id, ex.id, p.id) : []]));
  const from = it.replaces ? D.exerciseById(it.replaces) : null;

  const last = who
    .map((p) => {
      const prev = D.lastBefore(ex.id, p.id, st.date);
      return `<div class="person-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">${prev ? esc(D.resultText(ex, prev)) : '<span class="muted">ยังไม่เคยเล่น</span>'}</span>${prev ? `<span class="muted nowrap">${D.fmtShortDate(prev.date)}</span>` : ''}</div>`;
    })
    .join('');

  let grid = `<span></span>${who
    .map((p) => `<div class="log-head">${avatar(p, 'sm')}<strong>${esc(p.name)}</strong><span class="muted">เป้า ${T[p.id].sets} × ${T[p.id].reps}${ex.kind === 'time' ? ` ${u}` : ''}</span></div>`)
    .join('')}`;
  if (ex.kind === 'weight') {
    grid += `<span class="log-label">น้ำหนัก kg</span>${who
      .map((p) =>
        stepper({
          value: D.fmtNum(T[p.id].weight),
          dec: `data-act="w" data-pid="${p.id}" data-d="-2.5"`,
          inc: `data-act="w" data-pid="${p.id}" data-d="2.5"`,
          label: `น้ำหนัก ${p.name}`,
          cls: 'neutral',
        }),
      )
      .join('')}`;
  }
  const maxSets = Math.max(...who.map((p) => T[p.id].sets));
  for (let i = 0; i < maxSets; i++) {
    grid += `<span class="log-label">เซ็ท ${i + 1}</span>`;
    grid += who
      .map((p) => {
        if (i >= T[p.id].sets) return '<span class="cell-empty" aria-hidden="true">–</span>';
        const log = L[p.id].find((l) => l.set_index === i);
        const val = log ? log.reps : T[p.id].reps;
        const cls = log ? (log.reps >= T[p.id].reps ? 'ok' : 'warn') : 'pending';
        const a = `data-pid="${p.id}" data-i="${i}"`;
        return `<div class="stepper ${cls}">
          <button type="button" data-act="rep" ${a} data-d="${-step}" aria-label="ลด เซ็ท ${i + 1} ${esc(p.name)}">−</button>
          <button type="button" class="stepper-val" data-act="tap" ${a} aria-label="${log ? 'ยกเลิกบันทึก' : 'บันทึก'} ${val} ${u} เซ็ท ${i + 1} ${esc(p.name)}">${val}</button>
          <button type="button" data-act="rep" ${a} data-d="${step}" aria-label="เพิ่ม เซ็ท ${i + 1} ${esc(p.name)}">+</button>
        </div>`;
      })
      .join('');
  }
  grid += `<span class="log-label">รวม</span>${who
    .map((p) => {
      if (!L[p.id].length) return '<div class="log-total"><span class="muted">ยังไม่บันทึก</span></div>';
      const ev = D.evaluate(L[p.id], T[p.id]);
      return `<div class="log-total"><strong>${ev.total}/${ev.goal}</strong><span class="${ev.complete ? 'st-ok' : 'st-warn'}">${ev.complete ? 'ครบ' : `ไม่ครบ ${ev.pct}%`}</span></div>`;
    })
    .join('')}`;

  const tips = who
    .map((p) => {
      if (!L[p.id].length) return '';
      const s = D.suggest(ex, T[p.id], D.evaluate(L[p.id], T[p.id]), D.lastBefore(ex.id, p.id, st.date));
      if (!s) return '';
      return `<div class="tip">${dot(p)}<div class="row wrap grow"><p class="grow"><strong>${esc(p.name)}</strong> ${esc(s.text)}</p>
        ${s.apply ? `<button type="button" class="btn-sm" data-act="apply" data-pid="${p.id}" data-f="${s.apply.field}" data-v="${s.apply.value}">${esc(s.apply.label)}</button>` : ''}</div></div>`;
    })
    .join('');

  const notes = who
    .map(
      (p) => `<label class="field"><span class="label row tight">${dot(p)}โน้ตของ${esc(p.name)}</span>
        <input class="input" data-change="note" data-pid="${p.id}" data-ex="${ex.id}" value="${esc(D.noteOf(p.id, ex.id))}" placeholder="เช่น เบาะระดับ 4" maxlength="80"></label>`,
    )
    .join('');

  // ท่าทดแทน (ไม่เสนอท่าที่อยู่ในวันนี้แล้ว)
  const exclude = new Set(items.map((x) => x.exercise_id));
  if (from) exclude.add(from.id);
  const subs = D.substitutesFor(from || ex, exclude, 5);
  const subList = subs
    .map(
      (e) => `<div class="sub-row">${thumb(e, 'sm')}<span class="stack-0 grow"><strong>${esc(e.name)}</strong><span class="muted">${esc(e.muscles)} · ${esc(e.equipment)}</span></span>
        <button type="button" class="btn-sm" data-act="swap" data-to="${e.id}">เล่นแทน</button></div>`,
    )
    .join('');

  return sheet({
    title: ex.name,
    sub: from ? `เล่นแทน ${from.name} วันนี้` : ex.muscles,
    body: `
      ${ex.image_url ? `<div class="hero">${thumb(ex, 'lg')}</div>` : ''}
      ${ex.video_url ? `<a class="btn-sm self-start" href="${esc(ex.video_url)}" target="_blank" rel="noopener">${icon('play', 14)}ดูคลิปตัวอย่าง</a>` : ''}
      <section class="card soft"><h3 class="label">ครั้งที่แล้ว</h3><div class="stack-6">${last}</div></section>
      <section class="log-wrap" aria-label="บันทึกเซ็ท">
        <div class="log-grid" style="grid-template-columns:52px repeat(${who.length},minmax(0,1fr))">${grid}</div>
        <p class="muted">แตะตัวเลขเมื่อทำได้ตามเป้า ถ้าทำได้ไม่ถึง กด − ให้ตรงกับที่ทำได้</p>
      </section>
      ${tips ? `<section class="stack-8">${tips}</section>` : ''}
      <section class="stack-8">${notes}</section>
      <section class="stack-8">
        <h3 class="label">${from ? 'เปลี่ยนเป็นท่าอื่น' : 'เครื่องไม่ว่าง? เล่นท่านี้แทนได้'}</h3>
        ${from ? `<button type="button" class="btn-ghost" data-act="unswap">กลับไปเล่น ${esc(from.name)}</button>` : ''}
        ${subList || '<p class="muted">ยังไม่มีท่าที่คล้ายกันในคลัง</p>'}
      </section>
      ${it.extra ? `<button type="button" class="btn-danger" data-act="removeExtra">${icon('trash', 18)}เอาท่านี้ออกจากวันนี้</button>` : ''}`,
    footer: '<button type="button" class="btn grow" data-act="closeSheet">เสร็จ</button>',
  });
}

// ---------- แผ่นเพิ่มท่าเฉพาะวันนี้ ----------
function pickResults(items) {
  const inDay = new Set(items.map((i) => i.exercise_id));
  const list = D.searchExercises(st.pickQ, null).filter((e) => !inDay.has(e.id)).slice(0, 40);
  if (!list.length) return '<p class="muted">ไม่เจอท่าที่ค้นหา</p>';
  return list
    .map(
      (e) => `<button type="button" class="lib-row" data-act="addExtra" data-id="${e.id}">
        ${thumb(e, 'sm')}<span class="stack-0 grow"><strong>${esc(e.name)}</strong><span class="muted">${esc(e.muscles)} · ${esc(e.equipment)}</span></span>
        <span class="add-ic">${icon('plus')}</span></button>`,
    )
    .join('');
}

function addSheet(items) {
  return sheet({
    title: 'เพิ่มท่าเฉพาะวันนี้',
    sub: 'ไม่กระทบแผนหลัก',
    body: `<label class="search">${icon('search')}<span class="sr-only">ค้นหาท่า</span>
        <input id="pick-q" type="search" data-input="pick" value="${esc(st.pickQ)}" placeholder="ค้นหา เช่น ก้น, เคเบิล" autocomplete="off"></label>
      <div id="pick-results" class="stack-8">${pickResults(items)}</div>`,
  });
}

export const inputs = {
  pick(value) {
    st.pickQ = value;
    const el = document.getElementById('pick-results');
    if (el) el.innerHTML = pickResults(D.workoutItems(st.date));
  },
};

export const changes = {
  async note(value, d) {
    await D.saveNote(d.pid, d.ex, value);
  },
};

export const actions = {
  open(d) {
    st.open = d.ex;
    rerender();
  },
  closeSheet() {
    st.open = null;
    st.adding = false;
    rerender();
  },
  async tap(d) {
    const ex = D.exerciseById(st.open);
    const s = await ensureSession();
    const i = +d.i;
    const log = D.logsOf(s.id, ex.id, d.pid).find((l) => l.set_index === i);
    if (log) await store.remove('set_logs', log.id);
    else await writeSet(ex, d.pid, i, D.targetOrDefault(d.pid, ex.id).reps);
  },
  async rep(d) {
    const ex = D.exerciseById(st.open);
    const session = D.sessionOf(st.date);
    const i = +d.i;
    const log = session && D.logsOf(session.id, ex.id, d.pid).find((l) => l.set_index === i);
    const base = log ? log.reps : D.targetOrDefault(d.pid, ex.id).reps;
    await writeSet(ex, d.pid, i, Math.max(0, base + +d.d));
  },
  // เปลี่ยนน้ำหนัก = น้ำหนักที่ใช้ท่านี้ (ครั้งหน้าเริ่มจากค่านี้) และแก้เซ็ทที่บันทึกวันนี้ให้ตรงกัน
  async w(d) {
    const ex = D.exerciseById(st.open);
    const session = D.sessionOf(st.date);
    const t = await D.ensureTarget(d.pid, ex.id);
    const weight = Math.max(0, Math.round(((+t.weight || 0) + +d.d) * 100) / 100);
    await store.update('targets', t.id, { weight });
    if (session) for (const l of D.logsOf(session.id, ex.id, d.pid)) await store.update('set_logs', l.id, { weight });
  },
  async apply(d) {
    const t = await D.ensureTarget(d.pid, st.open);
    await store.update('targets', t.id, { [d.f]: +d.v });
    toast('ตั้งไว้สำหรับครั้งหน้าแล้ว');
  },
  // เล่นท่าอื่นแทนเฉพาะวันนี้
  async swap(d) {
    const it = openItem();
    const s = await ensureSession();
    if (store.all('set_logs').some((l) => l.session_id === s.id && l.exercise_id === it.exercise_id)) {
      toast('ท่านี้บันทึกไปแล้ว ถ้าจะเปลี่ยน ให้ยกเลิกเซ็ทที่บันทึกก่อน');
      return;
    }
    // ท่าใหม่ยังไม่เคยตั้งเป้า: ใช้เซ็ท/ครั้งเดียวกับท่าเดิม ส่วนน้ำหนักให้ปรับเองตอนเล่น
    for (const pid of it.who) {
      if (D.getTarget(pid, d.to)) continue;
      const old = D.targetOrDefault(pid, it.exercise_id);
      await store.insert('targets', { profile_id: pid, exercise_id: d.to, weight: 0, sets: old.sets, reps: old.reps });
    }
    if (it.extra) {
      await store.update('sessions', s.id, { extra_items: (s.extra_items || []).map((x) => (x.id === it.id ? { ...x, exercise_id: d.to } : x)) });
    } else {
      const original = it.replaces || it.exercise_id;
      const subs = (s.substitutions || []).filter((x) => x.from !== original);
      await store.update('sessions', s.id, { substitutions: [...subs, { from: original, to: d.to }] });
    }
    st.open = d.to;
    rerender();
    toast(`เปลี่ยนเป็น ${D.exerciseById(d.to)?.name} แล้ว`);
  },
  async unswap() {
    const it = openItem();
    const s = D.sessionOf(st.date);
    if (!s || !it?.replaces) return;
    const hasLogs = store.all('set_logs').some((l) => l.session_id === s.id && l.exercise_id === it.exercise_id);
    if (hasLogs && !confirm('ท่าที่เล่นแทนมีเซ็ทที่บันทึกแล้ว ลบเซ็ทเหล่านั้นแล้วกลับไปท่าเดิมไหม?')) return;
    await store.removeWhere('set_logs', (l) => l.session_id === s.id && l.exercise_id === it.exercise_id);
    await store.update('sessions', s.id, { substitutions: (s.substitutions || []).filter((x) => x.from !== it.replaces) });
    st.open = it.replaces;
    rerender();
  },
  openAdd() {
    st.adding = true;
    st.open = null;
    st.pickQ = '';
    rerender();
    document.getElementById('pick-q')?.focus();
  },
  async addExtra(d) {
    const people = D.profiles();
    const s = await ensureSession();
    for (const p of people) await D.ensureTarget(p.id, d.id);
    await store.update('sessions', s.id, { extra_items: [...(s.extra_items || []), { id: uid(), exercise_id: d.id, who: people.map((p) => p.id) }] });
    st.adding = false;
    st.open = d.id;
    rerender();
  },
  async removeExtra() {
    const it = openItem();
    const s = D.sessionOf(st.date);
    if (!s || !it?.extra) return;
    const hasLogs = store.all('set_logs').some((l) => l.session_id === s.id && l.exercise_id === it.exercise_id);
    if (hasLogs && !confirm('ท่านี้มีเซ็ทที่บันทึกแล้ว เอาออกพร้อมผลการเล่นเลยไหม?')) return;
    await store.removeWhere('set_logs', (l) => l.session_id === s.id && l.exercise_id === it.exercise_id);
    st.open = null;
    await store.update('sessions', s.id, { extra_items: (s.extra_items || []).filter((x) => x.id !== it.id) });
  },
  async finish() {
    const s = D.sessionOf(st.date);
    const hasLogs = s && store.all('set_logs').some((l) => l.session_id === s.id);
    if (hasLogs) await store.update('sessions', s.id, { finished_at: new Date().toISOString() });
    toast(hasLogs ? 'บันทึกการเล่นแล้ว' : 'วันนี้ยังไม่มีเซ็ทที่บันทึก');
    go(`#/week/${st.date}`);
  },
};
