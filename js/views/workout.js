// หน้าระหว่างเล่น: บันทึกทีละท่า สองคนบนการ์ดเดียว
import { store, uid } from '../data/store.js';
import { rerender, go } from '../core.js';
import { esc, icon, dot, sheet, toast, stepper } from '../ui.js';
import * as D from '../domain.js';

const st = { date: null, idx: 0, sheet: false, pickQ: '' };
const timer = { dur: 90, end: 0, iv: null };

export function enter(p) {
  st.date = p.date;
  st.idx = 0;
  st.sheet = false;
  st.pickQ = '';
}

export function leave() {
  stopTimer(true);
}

// ---------- ตัวจับเวลาพัก ----------
function timerLabel() {
  if (!timer.end) return `พัก ${timer.dur} วิ`;
  const s = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function startTimer() {
  timer.end = Date.now() + timer.dur * 1000;
  clearInterval(timer.iv);
  timer.iv = setInterval(() => {
    if (Date.now() >= timer.end) {
      stopTimer();
      navigator.vibrate?.([200, 100, 200]);
      toast('หมดเวลาพัก ไปเซ็ทต่อไปได้');
      return;
    }
    const el = document.getElementById('timer-label');
    if (el) el.textContent = timerLabel();
  }, 250);
  rerender();
}
function stopTimer(silent) {
  clearInterval(timer.iv);
  timer.iv = null;
  timer.end = 0;
  if (!silent) rerender();
}

// ---------- ข้อมูลของท่าปัจจุบัน ----------
function context() {
  const items = D.workoutItems(st.date);
  if (st.idx >= items.length) st.idx = Math.max(0, items.length - 1);
  const it = items[st.idx];
  const ex = it && D.exerciseById(it.exercise_id);
  const session = D.sessionOf(st.date);
  const people = D.profiles();
  const who = it ? people.filter((p) => it.who.includes(p.id)) : [];
  return { items, it, ex, session, people, who };
}

async function ensureSession() {
  return D.sessionOf(st.date) || store.insert('sessions', { date: st.date, extra_items: [], finished_at: null });
}

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

// ---------- หน้าจอ ----------
export function render() {
  const { items, it, ex, session, people, who } = context();
  const day = D.effectiveDay(st.date);
  const title = day.title || D.autoTitle(items) || 'เล่นนอกแผน';
  const logsAll = session ? store.all('set_logs').filter((l) => l.session_id === session.id) : [];

  const bars = items
    .map((x, i) => {
      const exi = D.exerciseById(x.exercise_id);
      const any = logsAll.some((l) => l.exercise_id === x.exercise_id);
      const done =
        any &&
        x.who.every((pid) => D.evaluate(logsAll.filter((l) => l.exercise_id === x.exercise_id && l.profile_id === pid), D.targetOrDefault(pid, x.exercise_id)).complete);
      return `<button type="button" class="seg-bar ${i === st.idx ? 'cur' : ''} ${done ? 'done' : any ? 'some' : ''}" data-act="jump" data-i="${i}" aria-label="ท่าที่ ${i + 1} ${esc(exi?.name)}" ${i === st.idx ? 'aria-current="step"' : ''}></button>`;
    })
    .join('');

  const top = `
    <header class="wk-top">
      <a class="icon-btn" href="#/week/${st.date}" aria-label="กลับไปตาราง">${icon('back', 22)}</a>
      <div class="stack-0 grow"><span class="muted">${D.fmtDayDate(st.date)}</span><strong>${esc(title)}</strong></div>
      ${items.length ? `<span class="wk-count">ท่า ${st.idx + 1}/${items.length}</span>` : ''}
    </header>
    ${items.length ? `<div class="seg-bars" style="grid-template-columns:repeat(${items.length},minmax(0,1fr))">${bars}</div>` : ''}`;

  if (!it) {
    return `${top}
      <div class="card center">
        <h3>ยังไม่มีท่าในวันนี้</h3>
        <p class="muted">เพิ่มท่าที่จะเล่นวันนี้ได้เลย ไม่กระทบแผนหลัก</p>
        <button type="button" class="btn" data-act="openAdd">${icon('plus', 18)}เพิ่มท่าวันนี้</button>
      </div>
      ${st.sheet ? addSheet(items) : ''}`;
  }

  const u = D.unitOf(ex);
  const step = D.amountStep(ex);
  const T = Object.fromEntries(who.map((p) => [p.id, D.targetOrDefault(p.id, ex.id)]));
  const L = Object.fromEntries(who.map((p) => [p.id, session ? D.logsOf(session.id, ex.id, p.id) : []]));

  // ครั้งที่แล้ว
  const last = who
    .map((p) => {
      const prev = D.lastBefore(ex.id, p.id, st.date);
      return `<div class="person-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">${prev ? esc(D.resultText(ex, prev)) : '<span class="muted">ยังไม่เคยเล่น</span>'}</span>${prev ? `<span class="muted nowrap">${D.fmtShortDate(prev.date)}</span>` : ''}</div>`;
    })
    .join('');

  // ตารางบันทึก
  const cols = `grid-template-columns:52px repeat(${who.length},minmax(0,1fr))`;
  let grid = `<span></span>${who
    .map(
      (p) => `<div class="log-head">
        <span class="row tight">${dot(p)}<strong>${esc(p.name)}</strong></span>
        <span class="muted">เป้า ${T[p.id].sets} × ${T[p.id].reps}${ex.kind === 'time' ? ` ${u}` : ''}</span>
      </div>`,
    )
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

  // คำแนะนำครั้งหน้า
  const tips = who
    .map((p) => {
      if (!L[p.id].length) return '';
      const ev = D.evaluate(L[p.id], T[p.id]);
      const s = D.suggest(ex, T[p.id], ev, D.lastBefore(ex.id, p.id, st.date));
      if (!s) return '';
      return `<div class="tip">${dot(p)}<div class="stack-6 grow"><p><strong>${esc(p.name)}</strong> ${esc(s.text)}</p>
        ${s.apply ? `<button type="button" class="btn-sm self-start" data-act="apply" data-pid="${p.id}" data-f="${s.apply.field}" data-v="${s.apply.value}">${esc(s.apply.label)}</button>` : ''}</div></div>`;
    })
    .join('');

  const notes = who
    .map(
      (p) => `<label class="field"><span class="label row tight">${dot(p)}โน้ตของ${esc(p.name)}</span>
        <input class="input" data-change="note" data-pid="${p.id}" data-ex="${ex.id}" value="${esc(D.noteOf(p.id, ex.id))}" placeholder="เช่น เบาะระดับ 4" maxlength="80"></label>`,
    )
    .join('');

  const video = ex.video_url
    ? `<a class="btn-sm" href="${esc(ex.video_url)}" target="_blank" rel="noopener">${icon('play', 14)}ดูคลิปท่า</a>`
    : `<a class="btn-sm" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise')}" target="_blank" rel="noopener">${icon('search', 14)}ค้นคลิป</a>`;

  const isLast = st.idx === items.length - 1;
  const nextName = items[st.idx + 1] ? D.exerciseById(items[st.idx + 1].exercise_id)?.name : '';

  return `${top}
    <section class="stack-8">
      <h1>${esc(ex.name)}</h1>
      <div class="row wrap">
        ${ex.categories.map((c, i) => `<span class="chip-static ${i === 0 ? 'strong' : ''}">${esc(c)}</span>`).join('')}
        <span class="muted">${esc(ex.muscles)}</span>
        <span class="push">${video}</span>
      </div>
    </section>

    <section class="card soft">
      <h3 class="label">ครั้งที่แล้ว</h3>
      <div class="stack-6">${last}</div>
    </section>

    <section class="card log-card" aria-label="บันทึกเซ็ท">
      <div class="log-grid" style="${cols}">${grid}</div>
      <p class="muted">แตะตัวเลขเมื่อทำได้ตามเป้า ถ้าทำได้ไม่ถึง กด − ให้ตรงกับที่ทำได้</p>
    </section>

    ${tips ? `<section class="card"><h3 class="label">ครั้งหน้าแนะนำ</h3><div class="stack-8">${tips}</div></section>` : ''}

    <section class="card">${notes}</section>

    <div class="row wrap">
      <button type="button" class="btn-dashed grow" data-act="openAdd">${icon('plus', 18)}เพิ่มท่าเฉพาะวันนี้</button>
      ${it.extra ? `<button type="button" class="btn-ghost" data-act="removeExtra">${icon('trash', 18)}เอาท่านี้ออก</button>` : ''}
    </div>

    <div class="bottombar">
      <button type="button" class="icon-btn bordered" data-act="prev" ${st.idx === 0 ? 'disabled' : ''} aria-label="ท่าก่อนหน้า">${icon('back')}</button>
      <button type="button" class="btn-ghost timer ${timer.end ? 'running' : ''}" data-act="timer" aria-label="${timer.end ? 'หยุดจับเวลาพัก' : 'เริ่มจับเวลาพัก'}">${icon('timer', 18)}<span id="timer-label">${timerLabel()}</span></button>
      ${isLast
        ? '<button type="button" class="btn grow" data-act="finish">จบการเล่น</button>'
        : `<button type="button" class="btn grow" data-act="next"><span class="ellipsis">ถัดไป: ${esc(nextName)}</span></button>`}
    </div>
    ${st.sheet ? addSheet(items) : ''}`;
}

function pickResults(items) {
  const inDay = new Set(items.map((i) => i.exercise_id));
  const list = D.searchExercises(st.pickQ, null).filter((e) => !inDay.has(e.id)).slice(0, 40);
  if (!list.length) return '<p class="muted">ไม่เจอท่าที่ค้นหา</p>';
  return list
    .map(
      (e) => `<button type="button" class="lib-row" data-act="addExtra" data-id="${e.id}">
        <span class="stack-0 grow"><strong>${esc(e.name)}</strong><span class="muted">${esc(e.muscles)} · ${esc(e.equipment)}</span></span>
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
  jump(d) {
    st.idx = +d.i;
    rerender();
    window.scrollTo(0, 0);
  },
  prev() {
    st.idx = Math.max(0, st.idx - 1);
    rerender();
    window.scrollTo(0, 0);
  },
  next() {
    st.idx++;
    rerender();
    window.scrollTo(0, 0);
  },
  timer() {
    if (timer.end) stopTimer();
    else startTimer();
  },
  async tap(d) {
    const { ex } = context();
    const s = await ensureSession();
    const i = +d.i;
    const log = D.logsOf(s.id, ex.id, d.pid).find((l) => l.set_index === i);
    if (log) await store.remove('set_logs', log.id);
    else await writeSet(ex, d.pid, i, D.targetOrDefault(d.pid, ex.id).reps);
  },
  async rep(d) {
    const { ex, session } = context();
    const i = +d.i;
    const log = session && D.logsOf(session.id, ex.id, d.pid).find((l) => l.set_index === i);
    const base = log ? log.reps : D.targetOrDefault(d.pid, ex.id).reps;
    await writeSet(ex, d.pid, i, Math.max(0, base + +d.d));
  },
  // เปลี่ยนน้ำหนัก = เปลี่ยนน้ำหนักที่ใช้ท่านี้ (ครั้งหน้าจะเริ่มจากค่านี้) และแก้เซ็ทที่บันทึกวันนี้ให้ตรงกัน
  async w(d) {
    const { ex, session } = context();
    const t = await D.ensureTarget(d.pid, ex.id);
    const weight = Math.max(0, Math.round(((+t.weight || 0) + +d.d) * 100) / 100);
    await store.update('targets', t.id, { weight });
    if (session) for (const l of D.logsOf(session.id, ex.id, d.pid)) await store.update('set_logs', l.id, { weight });
  },
  async apply(d) {
    const { ex } = context();
    const t = await D.ensureTarget(d.pid, ex.id);
    await store.update('targets', t.id, { [d.f]: +d.v });
    toast('ตั้งไว้สำหรับครั้งหน้าแล้ว');
  },
  openAdd() {
    st.sheet = true;
    st.pickQ = '';
    rerender();
    document.getElementById('pick-q')?.focus();
  },
  closeSheet() {
    st.sheet = false;
    rerender();
  },
  async addExtra(d) {
    const people = D.profiles();
    const s = await ensureSession();
    const extra = { id: uid(), exercise_id: d.id, who: people.map((p) => p.id) };
    for (const p of people) await D.ensureTarget(p.id, d.id);
    st.sheet = false;
    await store.update('sessions', s.id, { extra_items: [...(s.extra_items || []), extra] });
    const items = D.workoutItems(st.date);
    st.idx = Math.max(0, items.findIndex((x) => x.exercise_id === d.id));
    rerender();
    window.scrollTo(0, 0);
  },
  async removeExtra() {
    const { it, session } = context();
    if (!session || !it?.extra) return;
    const hasLogs = store.all('set_logs').some((l) => l.session_id === session.id && l.exercise_id === it.exercise_id);
    if (hasLogs && !confirm('ท่านี้มีเซ็ทที่บันทึกแล้ว เอาออกพร้อมผลการเล่นเลยไหม?')) return;
    await store.removeWhere('set_logs', (l) => l.session_id === session.id && l.exercise_id === it.exercise_id);
    await store.update('sessions', session.id, { extra_items: (session.extra_items || []).filter((x) => x.id !== it.id) });
    st.idx = Math.max(0, st.idx - 1);
    rerender();
  },
  async finish() {
    const s = D.sessionOf(st.date);
    stopTimer(true);
    if (s) await store.update('sessions', s.id, { finished_at: new Date().toISOString() });
    toast(s ? 'บันทึกการเล่นแล้ว' : 'ยังไม่มีเซ็ทที่บันทึกในวันนี้');
    go(`#/week/${st.date}`);
  },
};
