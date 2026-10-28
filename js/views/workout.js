// หน้าวันนี้: รายการท่าของวัน เลือกเล่นท่าไหนก่อนก็ได้ แตะท่าเพื่อบันทึก
import { store, uid } from '../data/store.js';
import { rerender, go } from '../core.js';
import { esc, icon, dot, avatar, thumb, sheet, toast } from '../ui.js';
import * as D from '../domain.js';

// open = ท่าที่เปิดบันทึกอยู่ ; panel = 'add' | 'plan' | null
const st = { date: null, override: null, open: null, panel: null, pickQ: '', pickCat: 'ทั้งหมด' };

export function enter(p) {
  st.date = p.date;
  st.override = p.plan ?? null;
  st.open = null;
  st.panel = null;
  st.pickQ = '';
  st.pickCat = 'ทั้งหมด';
}

const items = () => D.workoutItems(st.date, st.override);
const openItem = () => items().find((x) => x.exercise_id === st.open);

async function ensureSession() {
  return (
    D.sessionOf(st.date) ||
    store.insert('sessions', {
      date: st.date,
      plan_weekday: D.planWeekdayFor(st.date, st.override),
      extra_items: [],
      finished_at: null,
    })
  );
}

// บันทึกผล: ทำได้กี่เซ็ท (toggle = แตะซ้ำเพื่อยกเลิก)
async function saveResult(exId, pid, setsDone, toggle) {
  const t = await D.ensureTarget(pid, exId);
  const s = await ensureSession();
  const r = D.resultOf(s.id, exId, pid);
  if (r && toggle && r.sets_done === setsDone) return store.remove('results', r.id);
  const row = { weight: +t.weight || 0, sets_done: setsDone, target_sets: t.sets, target_reps: t.reps };
  if (r) return store.update('results', r.id, row);
  return store.insert('results', { session_id: s.id, exercise_id: exId, profile_id: pid, ...row });
}

// ---------- การ์ดในรายการ ----------
function card(it, session, people) {
  const ex = D.exerciseById(it.exercise_id);
  const who = people.filter((p) => it.who.includes(p.id));
  const rows = who
    .map((p) => {
      const r = session && D.resultOf(session.id, ex.id, p.id);
      const text = r ? D.resultText(ex, r) : D.targetText(ex, D.targetOrDefault(p.id, ex.id));
      const status = r ? (D.isComplete(r) ? '<span class="st-ok">ครบ</span>' : '<span class="st-warn">ไม่ครบ</span>') : '';
      return `<span class="person-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">${esc(text)}</span>${status}</span>`;
    })
    .join('');
  const tags = [
    who.length && who.length < people.length ? `<span class="tag">เฉพาะ${esc(who[0].name)}</span>` : '',
    it.extra ? '<span class="tag">เฉพาะวันนี้</span>' : '',
  ].join('');
  return `<button type="button" class="card ex-card is-btn" data-act="open" data-ex="${ex.id}">
    <span class="row top">${thumb(ex)}<span class="stack-0 grow"><strong class="ex-name">${esc(ex.name)}</strong><span class="muted">${esc(ex.muscles || ex.categories.join(' · '))}</span></span></span>
    ${tags ? `<span class="row wrap">${tags}</span>` : ''}
    <span class="stack-6">${rows}</span>
  </button>`;
}

export function render() {
  const list = items();
  const session = D.sessionOf(st.date);
  const results = session ? D.resultsOfSession(session.id) : [];
  const people = D.profiles();
  const wd = D.planWeekdayFor(st.date, st.override);
  const started = results.length > 0;
  const title = D.dayTitle(wd);

  const isDone = (it) => results.some((r) => r.exercise_id === it.exercise_id);
  const todo = list.filter((it) => !isDone(it));
  const done = list.filter(isDone);

  return `
    <header class="wk-top">
      <a class="icon-btn" href="#/schedule" aria-label="กลับไปตาราง">${icon('back', 22)}</a>
      <div class="stack-0 grow"><span class="muted">วัน${D.DAY_FULL[D.weekdayOf(st.date)]}</span><strong>${st.date === D.todayISO() ? 'วันนี้' : D.fmtDayDate(st.date)}</strong></div>
    </header>
    <div class="notice">
      <p>เล่นแผนวัน${D.DAY_FULL[wd]}${title ? ` · ${esc(title)}` : ''}</p>
      ${started ? '' : '<button type="button" class="btn-link" data-act="choosePlan">เปลี่ยนแผน</button>'}
    </div>
    ${list.length
      ? `<section class="today-sum"><strong>${list.length} ท่า</strong><span class="muted">${done.length ? `เล่นแล้ว ${done.length} · เหลือ ${todo.length}` : 'แตะท่าที่จะเล่น เลือกเล่นท่าไหนก่อนก็ได้'}</span></section>`
      : `<div class="card center"><h3>แผนวันนี้ยังไม่มีท่า</h3><p class="muted">เลือกเล่นแผนของวันอื่น หรือเพิ่มท่าเองได้เลย</p>
          <button type="button" class="btn-ghost" data-act="choosePlan">เลือกแผนวันอื่น</button></div>`}
    ${todo.map((it) => card(it, session, people)).join('')}
    ${done.length ? `<h3 class="label section-label">เล่นแล้ว</h3>${done.map((it) => card(it, session, people)).join('')}` : ''}
    <button type="button" class="btn-dashed" data-act="openAdd">${icon('plus', 18)}เพิ่มท่าเฉพาะวันนี้</button>
    <div class="bottombar"><button type="button" class="btn grow" data-act="finish">จบวันนี้</button></div>
    ${st.open ? logSheet(list, people) : ''}
    ${st.panel === 'add' ? addSheet(list) : ''}
    ${st.panel === 'plan' ? planSheet() : ''}`;
}

// ---------- แผ่นบันทึกของท่า ----------
function logSheet(list, people) {
  const it = list.find((x) => x.exercise_id === st.open);
  const ex = it && D.exerciseById(it.exercise_id);
  if (!ex) {
    st.open = null;
    return '';
  }
  const session = D.sessionOf(st.date);
  const who = people.filter((p) => it.who.includes(p.id));

  const blocks = who
    .map((p) => {
      const t = D.targetOrDefault(p.id, ex.id);
      const r = session && D.resultOf(session.id, ex.id, p.id);
      const prev = D.lastBefore(ex.id, p.id, st.date);
      const a = `data-pid="${p.id}"`;

      const weight = D.isWeighted(ex)
        ? `<div class="field"><span class="label">น้ำหนัก (kg)</span>
            <div class="stepper neutral">
              <button type="button" data-act="w" ${a} data-d="-2.5" aria-label="ลดน้ำหนัก ${esc(p.name)}">−</button>
              <button type="button" class="stepper-val" data-act="wType" ${a} aria-label="พิมพ์น้ำหนัก ${esc(p.name)}">${D.fmtNum(t.weight)}</button>
              <button type="button" data-act="w" ${a} data-d="2.5" aria-label="เพิ่มน้ำหนัก ${esc(p.name)}">+</button>
            </div></div>`
        : '';

      const pick = Array.from({ length: t.sets }, (_, i) => i + 1)
        .map((n) => {
          const on = r && r.sets_done === n;
          const full = n === t.sets;
          return `<button type="button" class="${on ? (full ? 'on ok' : 'on warn') : ''} ${full ? 'full' : ''}" data-act="sets" ${a} data-n="${n}" aria-pressed="${!!on}">${full ? `ครบ ${n} เซ็ท` : n}</button>`;
        })
        .join('');

      let after = '';
      if (r) {
        const c = D.compare(ex, prev, { ...r, weight: +r.weight || 0 });
        after += `<span class="tag ${c.kind === 'up' ? 'ok' : c.kind === 'down' ? 'warn' : ''}">${esc(c.text)}</span>`;
        const h = D.history(ex.id, p.id).filter((e) => e.date <= st.date);
        const s = D.suggest(ex, h);
        if (s && Math.abs(s.weight - t.weight) > 0.01) after += `<button type="button" class="btn-sm" data-act="applyW" ${a} data-v="${s.weight}">${esc(s.text)}</button>`;
      }

      return `<div class="person-block">
        <div class="row">${avatar(p, 'sm')}<div class="stack-0 grow"><strong>${esc(p.name)}</strong><span class="muted">เป้า ${esc(D.targetText(ex, { ...t, weight: t.weight }).replace(/^.* kg · /, ''))}</span></div></div>
        <p class="muted">${prev ? `ครั้งก่อน ${D.fmtShortDate(prev.date)}: ${esc(D.resultText(ex, prev))}` : 'ยังไม่เคยเล่นท่านี้'}</p>
        ${weight}
        <div class="field"><span class="label">ทำได้กี่เซ็ท</span><div class="sets-pick">${pick}</div></div>
        ${after ? `<div class="row wrap">${after}</div>` : ''}
        <input class="input" data-change="note" data-pid="${p.id}" data-ex="${ex.id}" value="${esc(D.noteOf(p.id, ex.id))}" placeholder="โน้ตของ${esc(p.name)} เช่น เบาะระดับ 4" maxlength="80" aria-label="โน้ตของ${esc(p.name)}">
      </div>`;
    })
    .join('');

  return sheet({
    title: ex.name,
    sub: ex.muscles || ex.categories.join(' · '),
    body: `
      ${ex.image_url ? `<div class="hero">${thumb(ex, 'lg')}</div>` : ''}
      ${ex.video_url ? `<a class="btn-sm self-start" href="${esc(ex.video_url)}" target="_blank" rel="noopener">${icon('play', 14)}ดูคลิปตัวอย่าง</a>` : ''}
      ${who.length > 1 ? `<button type="button" class="btn-ghost" data-act="allDone">${icon('check', 18)}ทั้งคู่ครบทุกเซ็ท</button>` : ''}
      ${blocks}
      ${it.extra ? `<button type="button" class="btn-danger" data-act="removeExtra">${icon('trash', 18)}เอาท่านี้ออกจากวันนี้</button>` : ''}`,
    footer: '<button type="button" class="btn grow" data-act="closeSheet">เสร็จ</button>',
  });
}

// ---------- แผ่นเลือกแผน ----------
function planSheet() {
  const cur = D.planWeekdayFor(st.date, st.override);
  const rows = D.DAY_FULL.map((name, i) => {
    const n = D.planItemsOf(i).length;
    if (!n) return '';
    return `<button type="button" class="list-btn ${i === cur ? 'is-on' : ''}" data-act="setPlan" data-wd="${i}" aria-pressed="${i === cur}">
      <span class="stack-0 grow"><strong>แผนวัน${name}</strong><span class="muted">${esc(D.dayTitle(i))} · ${n} ท่า</span></span>
      ${i === cur ? icon('check', 18) : icon('next', 18)}</button>`;
  }).join('');
  return sheet({
    title: 'วันนี้เล่นแผนวันไหน',
    sub: 'เช่น เมื่อวานไม่ได้ไป อยากเล่นแผนของเมื่อวานแทน',
    body: rows || '<p class="muted">ยังไม่มีแผนเลย เพิ่มท่าได้ที่หน้าตาราง</p>',
  });
}

// ---------- แผ่นเพิ่มท่าเฉพาะวันนี้ ----------
function pickResults(list) {
  const inDay = new Set(list.map((i) => i.exercise_id));
  const found = D.searchExercises(st.pickQ, st.pickCat).filter((e) => !inDay.has(e.id)).slice(0, 60);
  if (!found.length) return `<p class="muted">${store.all('exercises').length ? 'ไม่มีท่าอื่นในหมวดนี้' : 'คลังท่ายังว่าง เพิ่มท่าได้ที่แท็บคลังท่า'}</p>`;
  return found
    .map(
      (e) => `<button type="button" class="lib-row" data-act="addExtra" data-id="${e.id}">${thumb(e, 'sm')}
        <span class="stack-0 grow"><strong>${esc(e.name)}</strong><span class="muted">${esc(e.muscles || e.categories.join(' · '))}</span></span>
        <span class="add-ic">${icon('plus')}</span></button>`,
    )
    .join('');
}

function addSheet(list) {
  const chips = ['ทั้งหมด', ...D.CATEGORIES]
    .map((c) => `<button type="button" class="chip ${st.pickCat === c ? 'on' : ''}" data-act="pickCat" data-c="${c}" aria-pressed="${st.pickCat === c}">${c}</button>`)
    .join('');
  return sheet({
    title: 'เพิ่มท่าเฉพาะวันนี้',
    sub: 'ไม่กระทบแผนหลัก',
    body: `<div class="chips in-sheet" role="group" aria-label="หมวด">${chips}</div>
      <label class="search">${icon('search')}<span class="sr-only">ค้นหาท่า</span>
        <input id="pick-q" type="search" data-input="pick" value="${esc(st.pickQ)}" placeholder="หรือพิมพ์ชื่อท่า" autocomplete="off"></label>
      <div id="pick-results" class="stack-8">${pickResults(list)}</div>`,
  });
}

export const inputs = {
  pick(value) {
    st.pickQ = value;
    const el = document.getElementById('pick-results');
    if (el) el.innerHTML = pickResults(items());
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
    st.panel = null;
    rerender();
  },
  async sets(d) {
    await saveResult(st.open, d.pid, +d.n, true);
  },
  async allDone() {
    const it = openItem();
    for (const pid of it.who) await saveResult(it.exercise_id, pid, D.targetOrDefault(pid, it.exercise_id).sets, false);
    toast('บันทึกว่าทั้งคู่ครบแล้ว');
  },
  // น้ำหนักที่ปรับ = น้ำหนักที่ใช้ครั้งหน้าด้วย และแก้ผลวันนี้ให้ตรง
  async w(d) {
    const t = await D.ensureTarget(d.pid, st.open);
    await setWeight(d.pid, (+t.weight || 0) + +d.d);
  },
  async wType(d) {
    const t = D.targetOrDefault(d.pid, st.open);
    const v = prompt('น้ำหนัก (kg)', D.fmtNum(t.weight));
    if (v == null) return;
    const n = parseFloat(v.replace(',', '.'));
    if (Number.isNaN(n) || n < 0) return toast('ใส่เป็นตัวเลข เช่น 32.5');
    await setWeight(d.pid, n);
  },
  async applyW(d) {
    await setWeight(d.pid, +d.v, true);
    toast('ตั้งน้ำหนักครั้งหน้าแล้ว');
  },
  choosePlan() {
    st.panel = 'plan';
    st.open = null;
    rerender();
  },
  async setPlan(d) {
    const wd = +d.wd;
    const s = D.sessionOf(st.date);
    st.panel = null;
    if (s) await store.update('sessions', s.id, { plan_weekday: wd });
    else {
      st.override = wd;
      rerender();
    }
  },
  pickCat(d) {
    st.pickCat = d.c;
    rerender();
  },
  openAdd() {
    st.panel = 'add';
    st.open = null;
    st.pickQ = '';
    rerender();
  },
  async addExtra(d) {
    const people = D.profiles();
    const s = await ensureSession();
    for (const p of people) await D.ensureTarget(p.id, d.id);
    await store.update('sessions', s.id, { extra_items: [...(s.extra_items || []), { id: uid(), exercise_id: d.id, who: people.map((p) => p.id) }] });
    st.panel = null;
    st.open = d.id;
    rerender();
  },
  async removeExtra() {
    const it = openItem();
    const s = D.sessionOf(st.date);
    if (!s || !it?.extra) return;
    const has = D.resultsOfSession(s.id).some((r) => r.exercise_id === it.exercise_id);
    if (has && !confirm('ท่านี้บันทึกผลแล้ว เอาออกพร้อมผลเลยไหม?')) return;
    await store.removeWhere('results', (r) => r.session_id === s.id && r.exercise_id === it.exercise_id);
    st.open = null;
    await store.update('sessions', s.id, { extra_items: (s.extra_items || []).filter((x) => x.id !== it.id) });
  },
  async finish() {
    const s = D.sessionOf(st.date);
    const has = s && D.resultsOfSession(s.id).length > 0;
    if (has) await store.update('sessions', s.id, { finished_at: new Date().toISOString() });
    toast(has ? 'บันทึกการเล่นแล้ว ดูการพัฒนาได้ที่แท็บภาพรวม' : 'วันนี้ยังไม่ได้บันทึกท่าไหน');
    go('#/schedule');
  },
};

async function setWeight(pid, value, nextOnly = false) {
  const weight = Math.max(0, Math.round(value * 100) / 100);
  const t = await D.ensureTarget(pid, st.open);
  await store.update('targets', t.id, { weight });
  if (nextOnly) return;
  const s = D.sessionOf(st.date);
  const r = s && D.resultOf(s.id, st.open, pid);
  if (r) await store.update('results', r.id, { weight });
}
