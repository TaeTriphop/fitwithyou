// แท็บ "ภาพรวม": เห็นว่าคุณกับแฟนพัฒนาขึ้นแค่ไหน (เน้นเทียบกับตอนเริ่ม)
import { store } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, dot, avatar, thumb } from '../ui.js';
import * as D from '../domain.js';

const st = { base: 'first', range: 'all' }; // base: first | prev
const BADGE = { up: 'ok', down: 'warn', same: '' };
const RANGES = [
  ['1m', '1 เดือน'],
  ['3m', '3 เดือน'],
  ['all', 'ทั้งหมด'],
];

function seg(name, options, value) {
  return `<div class="seg seg-btns" role="group">${options
    .map(([k, l]) => `<button type="button" class="${value === k ? 'on' : ''}" data-act="${name}" data-k="${k}" aria-pressed="${value === k}">${l}</button>`)
    .join('')}</div>`;
}

// ---------- การ์ดของแต่ละคน ----------
function personCard(p) {
  const s = D.personSummary(p.id);
  const big = s.avg == null ? '—' : `${s.avg > 0 ? '+' : ''}${s.avg}%`;
  const tone = s.avg == null ? '' : s.avg > 0 ? 'ok' : s.avg < 0 ? 'warn' : '';
  const label = s.avg == null ? 'เล่นแต่ละท่า 2 ครั้งขึ้นไป จะเห็นตัวเลข' : s.avg >= 0 ? 'แข็งแรงขึ้นตั้งแต่เริ่ม' : 'เทียบกับตอนเริ่ม';
  const w = (n) => (s.total ? (n / s.total) * 100 : 0);
  return `<section class="person-card">
    <div class="row">${avatar(p, 'sm')}<strong class="grow ellipsis">${esc(p.name)}</strong></div>
    <strong class="big ${tone}">${big}</strong>
    <span class="muted">${label}</span>
    <div class="stackbar" role="img" aria-label="พัฒนา ${s.tally.up} เท่าเดิม ${s.tally.same} ลดลง ${s.tally.down} ท่า">
      <span class="up" style="width:${w(s.tally.up)}%"></span><span class="same" style="width:${w(s.tally.same)}%"></span><span class="down" style="width:${w(s.tally.down)}%"></span>
    </div>
    <span class="muted small">${s.total ? [['พัฒนา', s.tally.up], ['เท่าเดิม', s.tally.same], ['ลดลง', s.tally.down]].filter(([, n]) => n).map(([l, n]) => `${l} ${n}`).join(' · ') + ' ท่า' : 'ยังไม่มีท่าที่เทียบได้'}</span>
  </section>`;
}

// ---------- สรุปเดือนนี้ ----------
function monthCard() {
  const today = D.todayISO();
  const monthStart = today.slice(0, 8) + '01';
  const days = D.daysPlayedBetween(monthStart, today);
  const prs = D.personalRecords();
  const monthPrs = prs.filter((r) => r.date >= monthStart).length;
  const latest = prs
    .slice(0, 3)
    .map(
      (r) => `<div class="pr-row">${avatar(r.p, 'sm')}
        <span class="stack-0 grow"><strong>${esc(r.ex.name)} ${esc(D.metricText(r.ex, r.value))}</strong>
        <span class="muted">${D.isWeighted(r.ex) ? 'หนักที่สุดที่เคยยก' : 'มากที่สุดที่เคยทำ'} · ${esc(r.p.name)} · ${D.fmtShortDate(r.date)}</span></span>
        <span class="pr-star" aria-hidden="true">★</span></div>`,
    )
    .join('');
  return `<section class="card">
    <h3 class="label">เดือน${D.MONTH_FULL[D.parseISO(today).getMonth()]}</h3>
    <div class="stats">
      <div class="stat"><strong>${days}</strong><span class="muted">วันที่ไปยิม</span></div>
      <div class="stat"><strong>${monthPrs}</strong><span class="muted">สถิติใหม่</span></div>
    </div>
    ${latest ? `<h3 class="label">สถิติใหม่ล่าสุด</h3><div class="stack-8">${latest}</div>` : ''}
  </section>`;
}

// ---------- รายท่า ----------
function exerciseRows(people) {
  const cards = [];
  for (const ex of store.all('exercises')) {
    let latest = '';
    const lines = people
      .map((p) => {
        const h = D.history(ex.id, p.id);
        if (!h.length) return '';
        const cur = h[h.length - 1];
        if (cur.date > latest) latest = cur.date;
        if (h.length === 1) {
          return `<div class="cmp-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">ครั้งแรก ${esc(D.metricText(ex, D.metricOf(ex, cur)))}</span><span class="tag">เริ่มแล้ว</span></div>`;
        }
        const base = st.base === 'first' ? h[0] : h[h.length - 2];
        const c = D.change(ex, base, cur);
        return `<div class="cmp-row">${dot(p)}<span class="who">${esc(p.name)}</span>
          <span class="grow">${esc(D.metricText(ex, D.metricOf(ex, base)))} <span class="muted">→</span> <strong>${esc(D.metricText(ex, D.metricOf(ex, cur)))}</strong></span>
          <span class="tag ${BADGE[c.kind]}">${esc(c.text)}</span></div>`;
      })
      .join('');
    if (lines) {
      cards.push({
        latest,
        html: `<a class="card ex-card is-btn" href="#/overview/ex/${ex.id}">
          <span class="row">${thumb(ex, 'sm')}<strong class="ex-name grow">${esc(ex.name)}</strong>${icon('next', 18)}</span>
          <span class="stack-6">${lines}</span></a>`,
      });
    }
  }
  return cards.sort((a, b) => (a.latest < b.latest ? 1 : -1)).map((c) => c.html).join('');
}

function overview() {
  const people = D.profiles();
  if (!store.all('results').length) {
    return `<header class="page-head"><h1>ภาพรวม</h1></header>
      <div class="empty"><p>ยังไม่มีผลการเล่น พอบันทึกครั้งแรก ที่นี่จะบอกว่าคุณกับแฟนแข็งแรงขึ้นแค่ไหน</p><a class="btn-ghost" href="#/schedule">ไปหน้าตาราง</a></div>`;
  }
  return `
    <header class="page-head"><h1>ภาพรวม</h1></header>
    <div class="person-cards">${people.map(personCard).join('')}</div>
    ${monthCard()}
    <div class="row between bottom"><h2>รายท่า</h2></div>
    ${seg('base', [['first', 'เทียบครั้งแรก'], ['prev', 'เทียบครั้งก่อน']], st.base)}
    ${exerciseRows(people)}
  `;
}

// ---------- กราฟเส้น ----------
function chart(ex, series) {
  const dates = [...new Set(series.flatMap((s) => s.h.map((e) => e.date)))].sort();
  if (!dates.length) return '';
  const W = 340, H = 190, L = 40, R = 14, T = 14, B = 28;
  const vals = series.flatMap((s) => s.h.map((e) => D.metricOf(ex, e)));
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) {
    min = Math.max(0, min - 1);
    max += 1;
  }
  const pad = (max - min) * 0.15;
  min = Math.max(0, min - pad);
  max += pad;
  const x = (d) => (dates.length === 1 ? (L + W - R) / 2 : L + (dates.indexOf(d) * (W - L - R)) / (dates.length - 1));
  const y = (v) => T + (H - T - B) * (1 - (v - min) / (max - min));
  const fmt = (v) => D.fmtNum(Math.round(v * 2) / 2);
  const grid = [min, (min + max) / 2, max]
    .map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" class="axis">${fmt(v)}</text>`)
    .join('');
  const lines = series
    .map(({ p, h }) => {
      const pts = h.map((e) => `${x(e.date).toFixed(1)},${y(D.metricOf(ex, e)).toFixed(1)}`).join(' ');
      const dots = h
        .map((e) => `<circle cx="${x(e.date).toFixed(1)}" cy="${y(D.metricOf(ex, e)).toFixed(1)}" r="5" stroke="${esc(p.color)}" stroke-width="2.5" fill="${D.isComplete(e) ? esc(p.color) : 'var(--surface)'}"/>`)
        .join('');
      return `<polyline points="${pts}" fill="none" stroke="${esc(p.color)}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
    })
    .join('');
  const xl = `<text x="${L}" y="${H - 6}" class="axis">${D.fmtShortDate(dates[0])}</text>${dates.length > 1 ? `<text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${D.fmtShortDate(dates[dates.length - 1])}</text>` : ''}`;
  const unit = D.isWeighted(ex) ? 'น้ำหนัก (kg)' : `${D.unitOf(ex)}ต่อเซ็ท`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟ${unit} ${esc(ex.name)}">${grid}${lines}${xl}</svg>
    <div class="row wrap legend">
      ${series.map(({ p }) => `<span class="row tight">${dot(p)}${esc(p.name)}</span>`).join('')}
      <span class="row tight"><span class="pt full"></span>ครบเซ็ท</span>
      <span class="row tight"><span class="pt"></span>ไม่ครบ</span>
      <span class="muted">${unit}</span>
    </div>`;
}

function detail(exId) {
  const ex = D.exerciseById(exId);
  const back = `<a class="icon-btn" href="#/overview" aria-label="กลับไปภาพรวม">${icon('back', 22)}</a>`;
  if (!ex) return `<header class="page-head start">${back}</header><div class="empty"><p>ไม่พบท่านี้</p></div>`;
  const today = D.todayISO();
  const since = st.range === '1m' ? D.addDays(today, -31) : st.range === '3m' ? D.addDays(today, -92) : '';
  const series = D.profiles()
    .map((p) => ({ p, h: D.history(ex.id, p.id).filter((e) => e.date >= since) }))
    .filter((s) => s.h.length);

  const summary = series
    .map(({ p, h }) => {
      const cur = h[h.length - 1];
      const best = Math.max(...h.map((e) => D.metricOf(ex, e)));
      const c = h.length > 1 ? D.change(ex, h[0], cur) : null;
      return `<div class="cmp-row">${dot(p)}<span class="who">${esc(p.name)}</span>
        <span class="grow">${h.length > 1 ? `${esc(D.metricText(ex, D.metricOf(ex, h[0])))} <span class="muted">→</span> ` : ''}<strong>${esc(D.metricText(ex, D.metricOf(ex, cur)))}</strong>
        <span class="muted"> · สูงสุด ${esc(D.metricText(ex, best))}</span></span>
        ${c ? `<span class="tag ${BADGE[c.kind]}">${esc(c.text)}</span>` : '<span class="tag">เริ่มแล้ว</span>'}</div>`;
    })
    .join('');

  const hist = series
    .map(({ p, h }) => {
      const rows = h
        .map((e, i) => {
          const c = i ? D.change(ex, h[i - 1], e) : null;
          return `<div class="hist-row"><span class="muted hist-date">${D.fmtShortDate(e.date)}</span><span class="grow">${esc(D.resultText(ex, e))}</span>${c ? `<span class="tag ${BADGE[c.kind]}">${esc(c.text)}</span>` : '<span class="tag">ครั้งแรก</span>'}</div>`;
        })
        .reverse()
        .join('');
      return `<section class="card"><div class="row">${avatar(p, 'sm')}<strong class="grow">${esc(p.name)}</strong><span class="muted">${h.length} ครั้ง</span></div><div class="hist">${rows}</div></section>`;
    })
    .join('');

  return `
    <header class="page-head start">${back}
      <div class="stack-0 grow"><span class="muted">${esc(ex.muscles || ex.categories.join(' · '))}</span><h1 class="h-md">${esc(ex.name)}</h1></div>
    </header>
    ${seg('range', RANGES, st.range)}
    ${series.length
      ? `<section class="card">${chart(ex, series)}<div class="stack-6">${summary}</div></section>${hist}`
      : '<div class="empty"><p>ยังไม่มีผลของท่านี้ในช่วงนี้</p></div>'}
  `;
}

export function render(p) {
  return p.ex ? detail(p.ex) : overview();
}

export const actions = {
  base(d) {
    st.base = d.k;
    rerender();
  },
  range(d) {
    st.range = d.k;
    rerender();
  },
};
