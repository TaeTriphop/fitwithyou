// แท็บ "ตาราง": แผนประจำสัปดาห์ จันทร์–อาทิตย์ (ใช้ซ้ำทุกสัปดาห์)
import { store } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, dot, avatar, thumb, sheet, toast, stepper } from '../ui.js';
import * as D from '../domain.js';

const st = { sel: null, sheet: null };

export function enter(p) {
  st.sel = p.day ?? D.weekdayOf(D.todayISO());
  st.sheet = null;
}

function played(date) {
  const s = D.sessionOf(date);
  return !!s && D.resultsOfSession(s.id).length > 0;
}

export function render() {
  const today = D.todayISO();
  const ws = D.weekStartOf(today);
  const people = D.profiles();

  const strip = D.DAY_SHORT.map((short, i) => {
    const date = D.addDays(ws, i);
    const n = D.planItemsOf(i).length;
    const isPlayed = played(date);
    const sub = isPlayed ? 'เล่นแล้ว' : n ? `${n} ท่า` : 'พัก';
    const cls = ['day', i === st.sel && 'is-sel', date === today && 'is-today', !n && 'is-rest'].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}" data-act="pick" data-i="${i}" aria-pressed="${i === st.sel}" aria-label="${D.DAY_FULL[i]} ${esc(sub)}">
      <span class="day-name">${short}</span>
      <span class="day-num">${D.parseISO(date).getDate()}</span>
      <span class="day-sub ${isPlayed ? 'st-ok' : ''}">${sub}</span>
    </button>`;
  }).join('');

  const date = D.addDays(ws, st.sel);
  const isToday = date === today;
  const items = D.planItemsOf(st.sel);
  const rows = items
    .map((it) => {
      const ex = D.exerciseById(it.exercise_id);
      const who = people.filter((p) => it.who.includes(p.id));
      return `<button type="button" class="card ex-card is-btn" data-act="editItem" data-id="${it.id}">
        <span class="row top">${thumb(ex)}
          <span class="stack-0 grow"><strong class="ex-name">${esc(ex.name)}</strong>
          ${who.map((p) => `<span class="person-line">${dot(p)}${esc(p.name)} · ${esc(D.targetText(ex, D.targetOrDefault(p.id, ex.id)))}</span>`).join('')}</span>
          ${icon('edit', 18)}
        </span>
      </button>`;
    })
    .join('');

  const todaySession = D.sessionOf(today);
  const todayStarted = todaySession && D.resultsOfSession(todaySession.id).length > 0;
  let cta = '';
  if (isToday) {
    cta = `<a class="btn" href="#/workout/${today}">${todayStarted ? 'บันทึกต่อ' : 'เริ่มเล่นวันนี้'}</a>`;
  } else {
    if (played(date)) cta += `<a class="btn-ghost" href="#/workout/${date}">ดูผลวัน${D.DAY_FULL[st.sel]}</a>`;
    if (items.length && !todayStarted) cta += `<a class="btn-ghost" href="#/workout/${today}/plan/${st.sel}">เล่นแผนนี้วันนี้</a>`;
  }

  return `
    <header class="page-head">
      <h1>ตาราง</h1>
      <div class="avatars">${people.map((p) => avatar(p)).join('')}</div>
    </header>
    <p class="muted">แผนนี้ใช้ซ้ำทุกสัปดาห์ แตะวันเพื่อดูหรือแก้ท่า</p>
    <div class="days">${strip}</div>
    <div class="row between bottom">
      <div class="stack-0">
        <span class="muted">${D.DAY_FULL[st.sel]} ${D.fmtShortDate(date)}${isToday ? ' · วันนี้' : ''}</span>
        <h2>${esc(D.dayTitle(st.sel) || 'วันพัก')}</h2>
      </div>
      ${items.length ? `<span class="muted nowrap">${items.length} ท่า</span>` : ''}
    </div>
    ${rows || '<p class="muted">ยังไม่มีท่าในวันนี้</p>'}
    <a class="btn-dashed" href="#/library/day/${st.sel}">${icon('plus', 18)}เพิ่มท่าวัน${D.DAY_FULL[st.sel]}</a>
    ${cta}
    ${renderSheet()}
  `;
}

function renderSheet() {
  if (!st.sheet) return '';
  const it = store.all('plan_items').find((x) => x.id === st.sheet.id);
  const ex = it && D.exerciseById(it.exercise_id);
  if (!ex) {
    st.sheet = null;
    return '';
  }
  const people = D.profiles();
  const u = D.unitOf(ex);
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
        <div class="row">${avatar(p, 'sm')}<strong>${esc(p.name)}</strong></div>
        <div class="target-grid">
          ${D.isWeighted(ex) ? `<div class="field"><span class="label">น้ำหนัก (kg)</span>${stepper({ value: D.fmtNum(t.weight), dec: a('weight', -2.5), inc: a('weight', 2.5), label: `น้ำหนัก ${p.name}` })}</div>` : ''}
          <div class="field"><span class="label">กี่เซ็ท</span>${stepper({ value: t.sets, dec: a('sets', -1), inc: a('sets', 1), label: `จำนวนเซ็ท ${p.name}` })}</div>
          <div class="field"><span class="label">${u}ต่อเซ็ท</span>${stepper({ value: t.reps, dec: a('reps', -step), inc: a('reps', step), label: `${u}ต่อเซ็ท ${p.name}` })}</div>
        </div>
      </div>`;
    })
    .join('');

  const dayBtns = D.DAY_SHORT.map((d, i) => {
    const on = i === it.weekday;
    return `<button type="button" class="daypick ${on ? 'on' : ''}" data-act="moveItem" data-wd="${i}" aria-pressed="${on}" aria-label="วัน${D.DAY_FULL[i]}">${d}</button>`;
  }).join('');

  return sheet({
    title: ex.name,
    sub: `ในแผนวัน${D.DAY_FULL[it.weekday]}`,
    body: `
      <div class="field"><span class="label">ใครเล่น</span><div class="row wrap">${whoBtns}</div></div>
      ${blocks}
      <p class="muted">น้ำหนักจะขยับตามที่บันทึกตอนเล่นจริงด้วย</p>
      <div class="field"><span class="label">อยู่ในแผนวันไหน</span><div class="daypicks">${dayBtns}</div></div>
      <button type="button" class="btn-danger" data-act="removeItem">${icon('trash', 18)}เอาออกจากวัน${D.DAY_FULL[it.weekday]}</button>`,
    footer: '<button type="button" class="btn grow" data-act="closeSheet">เสร็จ</button>',
  });
}

const currentItem = () => store.all('plan_items').find((x) => x.id === st.sheet?.id);

export const actions = {
  pick(d) {
    st.sel = +d.i;
    rerender();
  },
  editItem(d) {
    st.sheet = { id: d.id };
    rerender();
  },
  closeSheet() {
    st.sheet = null;
    rerender();
  },
  async toggleWho(d) {
    const it = currentItem();
    const has = it.who.includes(d.pid);
    if (has && it.who.length === 1) return toast('ต้องมีคนเล่นอย่างน้อย 1 คน');
    if (!has) await D.ensureTarget(d.pid, it.exercise_id);
    await store.update('plan_items', it.id, { who: has ? it.who.filter((x) => x !== d.pid) : [...it.who, d.pid] });
  },
  async adj(d) {
    const it = currentItem();
    const t = await D.ensureTarget(d.pid, it.exercise_id);
    let v = (+t[d.f] || 0) + +d.d;
    v = d.f === 'weight' ? Math.max(0, Math.round(v * 100) / 100) : Math.max(1, v);
    await store.update('targets', t.id, { [d.f]: v });
  },
  async moveItem(d) {
    const it = currentItem();
    const wd = +d.wd;
    if (wd === it.weekday) return;
    if (D.planItemsOf(wd).some((x) => x.exercise_id === it.exercise_id)) return toast(`วัน${D.DAY_FULL[wd]}มีท่านี้อยู่แล้ว`);
    await store.update('plan_items', it.id, { weekday: wd, sort: D.planItemsOf(wd).length });
    toast(`ย้ายไปวัน${D.DAY_FULL[wd]}แล้ว`);
  },
  async removeItem() {
    const it = currentItem();
    st.sheet = null;
    await store.remove('plan_items', it.id);
    toast('เอาออกจากแผนแล้ว');
  },
};
