// การ์ดท่าที่ใช้ทั้งหน้าตารางและหน้าวันนี้
import { esc, dot, thumb } from '../ui.js';
import * as D from '../domain.js';

// day = { date, logs } ; asButton = แตะเพื่อเปิดบันทึก
export function exerciseCard(it, day, people, { asButton = false } = {}) {
  const ex = D.exerciseById(it.exercise_id);
  if (!ex) return '';
  const who = people.filter((p) => it.who.includes(p.id));
  const rows = who
    .map((p) => {
      const r = day.logs.length ? D.resultFor(day.logs, ex.id, p.id, day.date) : null;
      let status = '';
      if (r) status = r.ev.complete ? '<span class="st-ok">ครบ</span>' : `<span class="st-warn">ไม่ครบ ${r.ev.total}/${r.ev.goal}</span>`;
      else if (day.logs.length && !asButton) status = '<span class="st-muted">ไม่ได้เล่น</span>';
      const text = r ? D.resultText(ex, r) : D.targetText(ex, D.targetOrDefault(p.id, ex.id));
      return `<span class="person-row">${dot(p)}<span class="who">${esc(p.name)}</span><span class="grow">${esc(text)}</span>${status}</span>`;
    })
    .join('');
  const from = it.replaces ? D.exerciseById(it.replaces) : null;
  const tags = [
    from ? `<span class="tag accent">แทน ${esc(from.name)}</span>` : '',
    who.length && who.length < people.length ? `<span class="tag">เฉพาะ${esc(who[0].name)}</span>` : '',
    it.extra ? '<span class="tag">เฉพาะวันนี้</span>' : '',
  ].join('');
  const inner = `
    <span class="row top">
      ${thumb(ex)}
      <span class="stack-0 grow"><strong class="ex-name">${esc(ex.name)}</strong><span class="muted">${esc(ex.muscles)}</span></span>
    </span>
    ${tags ? `<span class="row wrap">${tags}</span>` : ''}
    <span class="stack-6">${rows}</span>`;
  return asButton
    ? `<button type="button" class="card ex-card is-btn" data-act="open" data-ex="${ex.id}">${inner}</button>`
    : `<article class="card ex-card">${inner}</article>`;
}
