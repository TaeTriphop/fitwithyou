// แท็บ "ความคืบหน้า": ความสม่ำเสมอ ภาพรวมรายท่า และกราฟรายท่า
import { rerender } from '../core.js';
import { esc, icon, dot } from '../ui.js';
import * as D from '../domain.js';
import { store } from '../data/store.js';

const RANGES = [
  ['4w', '4 สัปดาห์'],
  ['3m', '3 เดือน'],
  ['all', 'ทั้งหมด'],
];

const st = { who: 'all', range: '3m', month: null };

export function enter() {
  if (!st.month) st.month = D.todayISO().slice(0, 8) + '01';
  if (st.who !== 'all' && !D.profileById(st.who)) st.who = 'all';
}

const rangeStart = () => (st.range === '4w' ? D.addDays(D.todayISO(), -28) : st.range === '3m' ? D.addDays(D.todayISO(), -91) : null);
const shownPeople = () => (st.who === 'all' ? D.profiles() : D.profiles().filter((p) => p.id === st.who));

function whoSeg() {
  const opts = [['all', 'ทั้งคู่'], ...D.profiles().map((p) => [p.id, p.name])];
  return `<div class="seg seg-btns" role="group" aria-label="ดูของใคร">${opts
    .map(([k, l]) => `<button type="button" class="${st.who === k ? 'on' : ''}" data-act="who" data-k="${k}" aria-pressed="${st.who === k}">${esc(l)}</button>`)
    .join('')}</div>`;
}

function rangeChips() {
  return `<div class="chips" role="group" aria-label="ช่วงเวลา">${RANGES.map(
    ([k, l]) => `<button type="button" class="chip ${st.range === k ? 'on' : ''}" data-act="range" data-k="${k}" aria-pressed="${st.range === k}">${l}</button>`,
  ).join('')}</div>`;
}

function changeText(ex, h) {
  const first = D.metric(ex, h[0]);
  const last = D.metric(ex, h[h.length - 1]);
  if (h.length === 1) return `${D.metricText(ex, last)} (ครั้งแรก)`;
  if (first === last) return `${D.metricText(ex, last)} เท่าเดิม`;
  const pct = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  return `${D.metricText(ex, first)} → ${D.metricText(ex, last)}${pct !== null ? ` (${pct > 0 ? '+' : ''}${pct}%)` : ''}`;
}

// ---------- ปฏิทินเดือน ----------
function calendar() {
  const m = D.parseISO(st.month);
  const year = m.getFullYear();
  const mon = m.getMonth();
  const pad = (new Date(year, mon, 1).getDay() + 6) % 7;
  const nDays = new Date(year, mon + 1, 0).getDate();
  const played = D.playedMap();
  const people = shownPeople();
  const ids = new Set(people.map((p) => p.id));
  const today = D.todayISO();
  let count = 0;
  let cells = '<span></span>'.repeat(pad);
  for (let d = 1; d <= nDays; d++) {
    const date = D.iso(new Date(year, mon, d));
    const who = people.filter((p) => played.get(date)?.has(p.id));
    if (who.length) count++;
    let cls = '';
    let style = '';
    let label = `${d}`;
    if (who.length && who.length === people.length && people.length > 1) {
      cls = 'both';
      label += ' ไปด้วยกัน';
    } else if (who.length === 1) {
      cls = people.length > 1 ? 'one' : 'solo';
      style = `style="--pc:${esc(who[0].color)}"`;
      label += ` ${who[0].name}ไป`;
    }
    cells += `<span class="cal-cell ${cls} ${date === today ? 'today' : ''}" ${style} aria-label="${esc(label)}">${d}</span>`;
  }
  const legend =
    people.length > 1
      ? `<div class="row wrap legend"><span class="row tight"><span class="cal-key both"></span>ไปด้วยกัน</span>${people
          .map((p) => `<span class="row tight">${dot(p)}${esc(p.name)}ไปคนเดียว</span>`)
          .join('')}</div>`
      : '';
  return { count, html: `
    <div class="row between">
      <button type="button" class="icon-btn" data-act="month" data-d="-1" aria-label="เดือนก่อน">${icon('back')}</button>
      <strong>${D.MONTH_FULL[mon]} ${year + 543}</strong>
      <button type="button" class="icon-btn" data-act="month" data-d="1" aria-label="เดือนถัดไป">${icon('next')}</button>
    </div>
    <div class="cal">${D.DAY_SHORT.map((x) => `<span class="cal-h">${x}</span>`).join('')}${cells}</div>
    ${legend}` };
}

// ---------- กราฟเส้น (SVG) ----------
function chart(ex, series) {
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  if (!dates.length) return '';
  const W = 340, H = 200, L = 44, R = 14, T = 14, B = 30;
  const vals = series.flatMap((s) => s.points.map((p) => p.v));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min = Math.max(0, min - 1);
    max += 1;
  }
  const padV = (max - min) * 0.12;
  min = Math.max(0, min - padV);
  max += padV;
  const x = (d) => (dates.length === 1 ? L + (W - L - R) / 2 : L + (dates.indexOf(d) * (W - L - R)) / (dates.length - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const fmt = (v) => (ex.kind === 'weight' ? D.fmtNum(Math.round(v * 2) / 2) : Math.round(v));
  const grid = [min, (min + max) / 2, max]
    .map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`)
    .join('');
  const lines = series
    .map((s) => {
      const pts = s.points.map((p) => `${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
      const circles = s.points
        .map((p) => `<circle cx="${x(p.date).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="5" stroke="${esc(s.p.color)}" fill="${p.complete ? esc(s.p.color) : 'var(--surface)'}" stroke-width="2.5"/>`)
        .join('');
      return `<polyline points="${pts}" fill="none" stroke="${esc(s.p.color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${circles}`;
    })
    .join('');
  const xl = `<text x="${L}" y="${H - 8}" class="axis">${D.fmtShortDate(dates[0])}</text>${
    dates.length > 1 ? `<text x="${W - R}" y="${H - 8}" text-anchor="end" class="axis">${D.fmtShortDate(dates[dates.length - 1])}</text>` : ''
  }`;
  const unit = ex.kind === 'weight' ? 'น้ำหนัก (kg)' : `สูงสุดต่อเซ็ท (${D.unitOf(ex)})`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟ${unit}ของ ${esc(ex.name)}">${grid}${lines}${xl}</svg>
    <div class="row wrap legend">
      ${series.map((s) => `<span class="row tight">${dot(s.p)}${esc(s.p.name)}</span>`).join('')}
      <span class="row tight"><span class="pt full"></span>ครบ</span>
      <span class="row tight"><span class="pt hollow"></span>ไม่ครบ</span>
      <span class="muted">แกนตั้ง: ${unit}</span>
    </div>`;
}

// ---------- หน้ารวม ----------
function overview() {
  const since = rangeStart();
  const people = shownPeople();
  const cal = calendar();
  const streak = D.weekStreak();
  const rows = [];
  for (const ex of store.all('exercises')) {
    const lines = [];
    let latest = '';
    for (const p of people) {
      const h = D.history(ex.id, p.id).filter((e) => !since || e.date >= since);
      if (!h.length) continue;
      const stuck = D.trailingIncomplete(h);
      if (h[h.length - 1].date > latest) latest = h[h.length - 1].date;
      lines.push(`<span class="person-line">${dot(p)}<span>${esc(p.name)} ${esc(changeText(ex, h))}</span>${
        stuck >= 2 ? `<span class="tag warn">${icon('warn', 13)}ไม่ครบ ${stuck} ครั้งติด</span>` : ''
      }</span>`);
    }
    if (lines.length) rows.push({ latest, html: `<a class="plan-row" href="#/progress/ex/${ex.id}"><span class="stack-0 grow"><strong>${esc(ex.name)}</strong>${lines.join('')}</span>${icon('next', 18)}</a>` });
  }
  rows.sort((a, b) => (a.latest < b.latest ? 1 : -1));
  const monthName = D.MONTH_FULL[D.parseISO(st.month).getMonth()];

  return `
    <header class="page-head"><h1>ความคืบหน้า</h1></header>
    ${whoSeg()}
    <section class="card">${cal.html}</section>
    <div class="stats">
      <div class="stat"><strong>${cal.count} วัน</strong><span class="muted">ไปยิมเดือน${monthName}</span></div>
      <div class="stat"><strong>${streak} สัปดาห์</strong><span class="muted">ไปครบตามแผนติดต่อกัน</span></div>
    </div>
    <div class="row between bottom"><h2>รายท่า</h2></div>
    ${rangeChips()}
    ${rows.length
      ? `<section class="card plan-rows flush">${rows.map((r) => r.html).join('')}</section>`
      : `<div class="empty"><p>ยังไม่มีประวัติในช่วงนี้ เริ่มเล่นจากหน้าตาราง แล้วผลจะขึ้นที่นี่</p><a class="btn-ghost" href="#/week">ไปหน้าตาราง</a></div>`}
  `;
}

// ---------- หน้ารายท่า ----------
function detail(exId) {
  const ex = D.exerciseById(exId);
  if (!ex) return `<header class="page-head"><a class="icon-btn" href="#/progress" aria-label="กลับ">${icon('back', 22)}</a></header><div class="empty"><p>ไม่พบท่านี้</p></div>`;
  const since = rangeStart();
  const people = shownPeople();
  const series = people
    .map((p) => ({
      p,
      h: D.history(ex.id, p.id).filter((e) => !since || e.date >= since),
    }))
    .filter((s) => s.h.length)
    .map((s) => ({ ...s, points: s.h.map((e) => ({ date: e.date, v: D.metric(ex, e), complete: e.ev.complete })) }));

  const dates = [...new Set(series.flatMap((s) => s.h.map((e) => e.date)))].sort().reverse();
  const hist = dates
    .map((date) => {
      const lines = series
        .map((s) => {
          const e = s.h.find((x) => x.date === date);
          if (!e) return '';
          return `<div class="person-row">${dot(s.p)}<span class="who">${esc(s.p.name)}</span><span class="grow">${esc(D.resultText(ex, e))}</span>
            <span class="${e.ev.complete ? 'st-ok' : 'st-warn'}">${e.ev.complete ? 'ครบ' : `${e.ev.total}/${e.ev.goal}`}</span></div>`;
        })
        .join('');
      return `<div class="hist-item"><span class="muted">${D.fmtDayDate(date)}</span>${lines}</div>`;
    })
    .join('');

  const summary = series
    .map((s) => {
      const stuck = D.trailingIncomplete(s.h);
      return `<div class="person-row">${dot(s.p)}<span class="who">${esc(s.p.name)}</span><span class="grow">${esc(changeText(ex, s.h))}</span>${
        stuck >= 2 ? `<span class="tag warn">ไม่ครบ ${stuck} ครั้งติด</span>` : ''
      }</div>`;
    })
    .join('');

  return `
    <header class="page-head start">
      <a class="icon-btn" href="#/progress" aria-label="กลับไปความคืบหน้า">${icon('back', 22)}</a>
      <div class="stack-0 grow"><span class="muted">${esc(ex.muscles)}</span><h1 class="h-md">${esc(ex.name)}</h1></div>
    </header>
    ${whoSeg()}
    ${rangeChips()}
    ${series.length
      ? `<section class="card">${chart(ex, series)}</section>
         <section class="card"><h3 class="label">สรุปช่วงนี้</h3><div class="stack-6">${summary}</div></section>
         <section class="card"><h3 class="label">ประวัติ</h3><div class="hist">${hist}</div></section>`
      : '<div class="empty"><p>ยังไม่มีประวัติของท่านี้ในช่วงนี้</p></div>'}
  `;
}

export function render(p) {
  return p.ex ? detail(p.ex) : overview();
}

export const actions = {
  who(d) {
    st.who = d.k;
    rerender();
  },
  range(d) {
    st.range = d.k;
    rerender();
  },
  month(d) {
    const m = D.parseISO(st.month);
    m.setMonth(m.getMonth() + +d.d);
    st.month = D.iso(m);
    rerender();
  },
};
