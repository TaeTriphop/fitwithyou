// แท็บ "สัปดาห์นี้": ดูตามวันที่จริง สถานะการเล่น และย้ายวันเฉพาะสัปดาห์
import { store } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, avatar, sheet, toast, scheduleTabs } from '../ui.js';
import * as D from '../domain.js';
import { exerciseCard } from './shared.js';

const st = { ws: null, sel: 0, sheet: false };

const STATUS = {
  rest: ['พัก', 'st-muted'],
  done: ['ครบ', 'st-ok'],
  partial: ['เล่นแล้ว', 'st-warn'],
  missed: ['ไม่ได้ไป', 'st-muted'],
};

export function enter(p) {
  const base = p.date || D.todayISO();
  st.ws = D.weekStartOf(base);
  st.sel = D.weekdayOf(base);
  st.sheet = false;
}

function dayTitle(d) {
  return d.title || D.autoTitle(d.items) || (d.items.length ? 'ไม่มีชื่อวัน' : 'วันพัก');
}

export function render() {
  const today = D.todayISO();
  const isThisWeek = st.ws === D.weekStartOf(today);
  const people = D.profiles();
  const days = Array.from({ length: 7 }, (_, i) => D.dayInfo(D.addDays(st.ws, i)));
  const sel = days[st.sel];

  const strip = days
    .map((d, i) => {
      const s = STATUS[d.status];
      const sub = s ? s[0] : `${d.items.length} ท่า`;
      const cls = ['day', i === st.sel && 'is-sel', d.date === today && 'is-today', d.status === 'rest' && 'is-rest'].filter(Boolean).join(' ');
      return `<button type="button" class="${cls}" data-act="pick" data-i="${i}" aria-pressed="${i === st.sel}" aria-label="${D.DAY_FULL[i]} ${D.fmtShortDate(d.date)} ${esc(sub)}">
        <span class="day-name">${D.DAY_SHORT[i]}</span>
        <span class="day-num">${D.parseISO(d.date).getDate()}</span>
        <span class="day-sub ${s ? s[1] : ''}">${esc(sub)}</span>
      </button>`;
    })
    .join('');

  const cov = D.weekCoverage(st.ws);
  const coverage = cov.length
    ? `<section class="card">
        <h3 class="label">กล้ามเนื้อสัปดาห์นี้</h3>
        <div class="row wrap">${cov.map((c) => `<span class="chip-static ${c.done ? 'done' : ''}">${c.done ? icon('check', 14) : ''}${esc(c.label)}</span>`).join('')}</div>
      </section>`
    : '';

  let notices = '';
  if (sel.movedOut) {
    notices += `<div class="notice"><p>แผนวัน${D.DAY_FULL[st.sel]} ย้ายไปเล่นวัน${D.DAY_FULL[sel.movedOut.to_weekday]} เฉพาะสัปดาห์นี้</p>
      <button type="button" class="btn-link" data-act="cancelMove" data-id="${sel.movedOut.id}">ยกเลิกการย้าย</button></div>`;
  }
  for (const m of sel.movedIn) {
    notices += `<div class="notice"><p>ย้ายแผนวัน${D.DAY_FULL[m.from_weekday]} มาเล่นวันนี้ เฉพาะสัปดาห์นี้</p>
      <button type="button" class="btn-link" data-act="cancelMove" data-id="${m.id}">ยกเลิกการย้าย</button></div>`;
  }

  const hasStuff = sel.items.length || sel.logs.length;
  let body;
  if (!hasStuff) {
    body = `<div class="card center">
      ${icon('moon', 30)}
      <h3>วันพัก</h3>
      <p class="muted">ไม่มีท่าในวันนี้ ถ้าอยากไปเล่นก็เริ่มได้เลย</p>
      <div class="row wrap center-row">
        <a class="btn-ghost" href="#/workout/${sel.date}">เล่นนอกแผน</a>
        <a class="btn-ghost" href="#/plan">จัดแผน</a>
      </div>
    </div>`;
  } else {
    const label = sel.logs.length ? (sel.date === today ? 'บันทึกต่อ' : 'ดูและแก้ผลการเล่น') : 'เริ่มเล่น';
    const canMove = !sel.movedOut && D.planItemsOf(st.sel).length && !sel.logs.length;
    body = `${sel.items.map((it) => exerciseCard(it, sel, people)).join('')}
      <a class="btn" href="#/workout/${sel.date}">${label}</a>
      ${canMove ? `<button type="button" class="btn-ghost" data-act="openMove">${icon('move', 18)}ย้ายไปวันอื่น (เฉพาะสัปดาห์นี้)</button>` : ''}`;
  }

  return `
    <header class="page-head">
      <h1>ตาราง</h1>
      <div class="avatars">${people.map(avatar).join('')}</div>
    </header>
    ${scheduleTabs('week')}
    <div class="weeknav">
      <button type="button" class="icon-btn" data-act="prev" aria-label="สัปดาห์ก่อน">${icon('back')}</button>
      <div class="weeknav-label">
        <strong>${D.fmtShortDate(st.ws)} – ${D.fmtShortDate(D.addDays(st.ws, 6))}</strong>
        ${isThisWeek ? '<span class="muted">สัปดาห์นี้</span>' : '<button type="button" class="btn-link" data-act="thisWeek">กลับไปสัปดาห์นี้</button>'}
      </div>
      <button type="button" class="icon-btn" data-act="next" aria-label="สัปดาห์ถัดไป">${icon('next')}</button>
    </div>
    <div class="days">${strip}</div>
    ${coverage}
    <div class="row between bottom">
      <div class="stack-0">
        <span class="muted">${sel.date === today ? 'วันนี้ · ' : ''}${D.fmtDayDate(sel.date)}</span>
        <h2>${esc(hasStuff ? dayTitle(sel) : 'วันพัก')}</h2>
      </div>
      ${sel.items.length ? `<span class="muted nowrap">${sel.items.length} ท่า</span>` : ''}
    </div>
    ${notices}
    ${body}
    ${st.sheet ? moveSheet(days) : ''}
  `;
}

function moveSheet(days) {
  const opts = days
    .map((d, i) => {
      if (i === st.sel) return '';
      const n = d.items.length;
      const desc = n ? `${esc(dayTitle(d))} (${n} ท่า) เล่นรวมกันวันนั้น` : 'วันพัก';
      return `<button type="button" class="list-btn" data-act="doMove" data-to="${i}">
        <span class="stack-0 grow"><strong>${D.DAY_FULL[i]} ${D.fmtShortDate(d.date)}</strong><span class="muted">${desc}</span></span>
        ${icon('next', 18)}
      </button>`;
    })
    .join('');
  return sheet({
    title: 'ย้ายไปวันไหน',
    sub: `แผนวัน${D.DAY_FULL[st.sel]} · เฉพาะสัปดาห์นี้`,
    body: `<p class="muted">แผนหลักไม่เปลี่ยน สัปดาห์หน้ากลับมาเป็นเหมือนเดิม</p><div class="stack-6">${opts}</div>`,
  });
}

export const actions = {
  pick(d) {
    st.sel = +d.i;
    rerender();
  },
  prev() {
    st.ws = D.addDays(st.ws, -7);
    rerender();
  },
  next() {
    st.ws = D.addDays(st.ws, 7);
    rerender();
  },
  thisWeek() {
    const t = D.todayISO();
    st.ws = D.weekStartOf(t);
    st.sel = D.weekdayOf(t);
    rerender();
  },
  openMove() {
    st.sheet = true;
    rerender();
  },
  closeSheet() {
    st.sheet = false;
    rerender();
  },
  async doMove(d) {
    const to = +d.to;
    const from = st.sel;
    await store.removeWhere('day_moves', (m) => m.week_start === st.ws && m.from_weekday === from);
    await store.insert('day_moves', { week_start: st.ws, from_weekday: from, to_weekday: to });
    st.sheet = false;
    st.sel = to;
    rerender();
    toast(`ย้ายไปวัน${D.DAY_FULL[to]}แล้ว`);
  },
  async cancelMove(d) {
    await store.remove('day_moves', d.id);
    toast('ยกเลิกการย้ายแล้ว');
  },
};
