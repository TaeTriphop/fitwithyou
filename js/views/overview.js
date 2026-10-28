// แท็บ "ภาพรวม": เทียบครั้งล่าสุดกับครั้งก่อน ว่าแต่ละท่าพัฒนาไหม
import { store } from '../data/store.js';
import { rerender } from '../core.js';
import { esc, icon, dot, avatar, thumb } from '../ui.js';
import * as D from '../domain.js';

const st = { who: 'all' };

const BADGE = { up: 'ok', down: 'warn', same: '', first: '' };

function shownPeople() {
  const all = D.profiles();
  return st.who === 'all' ? all : all.filter((p) => p.id === st.who);
}

function whoSeg() {
  const opts = [['all', 'ทั้งคู่'], ...D.profiles().map((p) => [p.id, p.name])];
  return `<div class="seg seg-btns" role="group" aria-label="ดูของใคร">${opts
    .map(([k, l]) => `<button type="button" class="${st.who === k ? 'on' : ''}" data-act="who" data-k="${k}" aria-pressed="${st.who === k}">${esc(l)}</button>`)
    .join('')}</div>`;
}

// ครั้งล่าสุด vs ครั้งก่อน ของคนหนึ่งในท่าหนึ่ง
function latestPair(ex, p) {
  const h = D.history(ex.id, p.id);
  if (!h.length) return null;
  const cur = h[h.length - 1];
  const prev = h[h.length - 2] || null;
  return { cur, prev, cmp: D.compare(ex, prev, cur) };
}

function overview() {
  const people = shownPeople();
  const today = D.todayISO();
  const ws = D.weekStartOf(today);
  const daysThisWeek = new Set(
    store
      .all('sessions')
      .filter((s) => s.date >= ws && s.date <= today && D.resultsOfSession(s.id).some((r) => people.some((p) => p.id === r.profile_id)))
      .map((s) => s.date),
  ).size;

  const tally = Object.fromEntries(people.map((p) => [p.id, { up: 0, same: 0, down: 0 }]));
  const cards = [];
  for (const ex of store.all('exercises')) {
    let latest = '';
    const rows = people
      .map((p) => {
        const pair = latestPair(ex, p);
        if (!pair) return '';
        if (pair.cmp.kind in tally[p.id]) tally[p.id][pair.cmp.kind]++;
        if (pair.cur.date > latest) latest = pair.cur.date;
        return `<span class="cmp">
          <span class="row">${dot(p)}<strong class="grow">${esc(p.name)}</strong><span class="tag ${BADGE[pair.cmp.kind]}">${esc(pair.cmp.text)}</span></span>
          <span class="cmp-line">
            ${pair.prev ? `<span><span class="muted">${D.fmtShortDate(pair.prev.date)}</span> ${esc(D.resultText(ex, pair.prev))}</span><span class="muted" aria-hidden="true">→</span>` : ''}
            <span><span class="muted">${D.fmtShortDate(pair.cur.date)}</span> <strong>${esc(D.resultText(ex, pair.cur))}</strong></span>
          </span>
        </span>`;
      })
      .join('');
    if (rows) {
      cards.push({
        latest,
        html: `<a class="card ex-card is-btn" href="#/overview/ex/${ex.id}">
          <span class="row top">${thumb(ex, 'sm')}<span class="stack-0 grow"><strong class="ex-name">${esc(ex.name)}</strong><span class="muted">${esc(ex.muscles || ex.categories.join(' · '))}</span></span>${icon('next', 18)}</span>
          <span class="stack-10">${rows}</span>
        </a>`,
      });
    }
  }
  cards.sort((a, b) => (a.latest < b.latest ? 1 : -1));

  const summary = people
    .map((p) => {
      const t = tally[p.id];
      return `<div class="row">${avatar(p, 'sm')}<span class="grow"><strong>${esc(p.name)}</strong></span>
        <span class="tag ok">พัฒนา ${t.up}</span><span class="tag">เท่าเดิม ${t.same}</span><span class="tag warn">ลดลง ${t.down}</span></div>`;
    })
    .join('');

  return `
    <header class="page-head"><h1>ภาพรวม</h1></header>
    ${whoSeg()}
    ${cards.length
      ? `<section class="card">
          <h3 class="label">ครั้งล่าสุดของแต่ละท่า เทียบกับครั้งก่อน</h3>
          ${summary}
          <p class="muted">สัปดาห์นี้ไปยิมแล้ว ${daysThisWeek} วัน</p>
        </section>
        ${cards.map((c) => c.html).join('')}`
      : `<div class="empty"><p>ยังไม่มีผลการเล่น พอบันทึกครั้งแรก ที่นี่จะบอกว่าแต่ละท่าพัฒนาขึ้นไหม</p><a class="btn-ghost" href="#/schedule">ไปหน้าตาราง</a></div>`}
  `;
}

function detail(exId) {
  const ex = D.exerciseById(exId);
  const back = `<a class="icon-btn" href="#/overview" aria-label="กลับไปภาพรวม">${icon('back', 22)}</a>`;
  if (!ex) return `<header class="page-head start">${back}</header><div class="empty"><p>ไม่พบท่านี้</p></div>`;
  const people = shownPeople();
  const blocks = people
    .map((p) => {
      const h = D.history(ex.id, p.id);
      if (!h.length) return '';
      const rows = h
        .map((e, i) => {
          const c = D.compare(ex, h[i - 1] || null, e);
          return `<div class="hist-row"><span class="muted hist-date">${D.fmtShortDate(e.date)}</span><span class="grow">${esc(D.resultText(ex, e))}</span><span class="tag ${BADGE[c.kind]}">${esc(c.text)}</span></div>`;
        })
        .reverse()
        .join('');
      return `<section class="card"><div class="row">${avatar(p, 'sm')}<strong>${esc(p.name)}</strong><span class="muted">เล่นไป ${h.length} ครั้ง</span></div><div class="hist">${rows}</div></section>`;
    })
    .join('');
  return `
    <header class="page-head start">${back}
      <div class="stack-0 grow"><span class="muted">${esc(ex.muscles || ex.categories.join(' · '))}</span><h1 class="h-md">${esc(ex.name)}</h1></div>
    </header>
    ${whoSeg()}
    ${blocks || '<div class="empty"><p>ยังไม่มีผลของท่านี้</p></div>'}
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
};
