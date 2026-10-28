// ตรรกะของแอพ: วันที่, แผน, ผลการเล่น, การเปรียบเทียบ, ท่าทดแทน, การค้นหา
import { store } from './data/store.js';

export const DAY_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
export const DAY_FULL = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
export const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const CATEGORIES = ['หลัง', 'อก', 'ไหล่', 'แขน', 'ขา', 'ก้น', 'ท้อง', 'คาร์ดิโอ'];

const SYNONYMS = {
  หลัง: 'back lat ปีก หลังบน หลังล่าง',
  อก: 'chest หน้าอก pec',
  ไหล่: 'shoulder delt บ่า',
  แขน: 'arm biceps triceps ไบเซ็ป ไตรเซ็ป แขนหน้า แขนหลัง ปลายแขน',
  ขา: 'leg legs quad hamstring ต้นขา ขาหน้า ขาหลัง น่อง calf',
  ก้น: 'glute glutes บั้นท้าย สะโพก booty butt',
  ท้อง: 'abs core แกนกลาง พุง หน้าท้อง',
  คาร์ดิโอ: 'cardio วิ่ง เผาผลาญ แอโรบิก',
};

// ---------- วันที่ (YYYY-MM-DD ตามเวลาเครื่อง, จันทร์ = 0) ----------
export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const todayISO = () => iso(new Date());
export const weekdayOf = (s) => (parseISO(s).getDay() + 6) % 7;
export const weekStartOf = (s) => addDays(s, -weekdayOf(s));
export function fmtShortDate(s) {
  const d = parseISO(s);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}
export const fmtDayDate = (s) => `${DAY_FULL[weekdayOf(s)]} ${fmtShortDate(s)}`;
export const fmtNum = (n) => String(Math.round((+n || 0) * 100) / 100);

// ---------- ข้อมูลพื้นฐาน ----------
export const profiles = () => [...store.all('profiles')].sort((a, b) => a.sort - b.sort);
export const profileById = (id) => store.all('profiles').find((p) => p.id === id);
export const exerciseById = (id) => store.all('exercises').find((e) => e.id === id);
export const isWeighted = (ex) => ex.kind === 'weight';
export const unitOf = (ex) => (ex.kind === 'time' ? ex.unit || 'วิ' : 'ครั้ง');
export const amountStep = (ex) => (ex.kind === 'time' ? (ex.unit === 'นาที' ? 1 : 5) : 1);

// ---------- เป้าหมายรายคน (ใช้กับท่านั้นทุกวัน) ----------
export function defaultTarget(ex) {
  if (ex?.kind === 'time') return ex.unit === 'นาที' ? { weight: 0, sets: 1, reps: 20 } : { weight: 0, sets: 3, reps: 30 };
  return { weight: 0, sets: 3, reps: ex?.kind === 'reps' ? 10 : 12 };
}
export function getTarget(pid, exId) {
  return store.all('targets').find((t) => t.profile_id === pid && t.exercise_id === exId);
}
export function targetOrDefault(pid, exId) {
  return getTarget(pid, exId) || { ...defaultTarget(exerciseById(exId)), profile_id: pid, exercise_id: exId };
}
export async function ensureTarget(pid, exId, base) {
  const t = getTarget(pid, exId);
  if (t) return t;
  return store.insert('targets', { profile_id: pid, exercise_id: exId, ...(base || defaultTarget(exerciseById(exId))) });
}
export function targetText(ex, t) {
  const u = unitOf(ex);
  const sets = ex.kind === 'time' && t.sets === 1 ? `${t.reps} ${u}` : `${t.sets} เซ็ท × ${t.reps} ${u}`;
  return isWeighted(ex) ? `${fmtNum(t.weight)} kg · ${sets}` : sets;
}

// ---------- โน้ตรายคนต่อท่า ----------
export function noteOf(pid, exId) {
  return store.all('exercise_notes').find((n) => n.profile_id === pid && n.exercise_id === exId)?.note || '';
}
export async function saveNote(pid, exId, note) {
  const row = store.all('exercise_notes').find((n) => n.profile_id === pid && n.exercise_id === exId);
  const value = note.trim();
  if (row) await store.update('exercise_notes', row.id, { note: value }, { silent: true });
  else if (value) await store.insert('exercise_notes', { profile_id: pid, exercise_id: exId, note: value }, { silent: true });
}

// ---------- แผนประจำสัปดาห์ ----------
export const planItemsOf = (wd) =>
  store
    .all('plan_items')
    .filter((i) => i.weekday === wd && exerciseById(i.exercise_id))
    .sort((a, b) => a.sort - b.sort || (a.created_at < b.created_at ? -1 : 1));

export function autoTitle(items) {
  const cats = [];
  for (const it of items) for (const c of exerciseById(it.exercise_id)?.categories || []) if (!cats.includes(c)) cats.push(c);
  return cats.slice(0, 3).join(' + ');
}
export const dayTitle = (wd) => autoTitle(planItemsOf(wd));

// ---------- วันที่เล่นจริง ----------
export const sessionOf = (date) => store.all('sessions').find((s) => s.date === date);
export const resultsOfSession = (sid) => store.all('results').filter((r) => r.session_id === sid);

// วันนี้ใช้แผนของวันไหน (เลือกเล่นแผนวันอื่นได้)
export function planWeekdayFor(date, override) {
  const s = sessionOf(date);
  if (s && s.plan_weekday != null) return s.plan_weekday;
  return override ?? weekdayOf(date);
}

// ท่าที่จะเล่นจริง = แผนของวันที่เลือก (หลังเปลี่ยนท่าทดแทน) + ท่าที่เพิ่มเฉพาะวันนี้
export function workoutItems(date, override) {
  const wd = planWeekdayFor(date, override);
  const s = sessionOf(date);
  const subs = s?.substitutions || [];
  const valid = new Set(store.all('profiles').map((p) => p.id));
  const planned = planItemsOf(wd).map((it) => {
    const sub = subs.find((x) => x.from === it.exercise_id);
    return sub ? { ...it, exercise_id: sub.to, replaces: it.exercise_id } : it;
  });
  const extras = (s?.extra_items || []).map((x) => ({ ...x, extra: true }));
  const seen = new Set();
  return [...planned, ...extras]
    .filter((it) => {
      if (seen.has(it.exercise_id) || !exerciseById(it.exercise_id)) return false;
      seen.add(it.exercise_id);
      return true;
    })
    .map((it) => ({ ...it, who: (it.who || []).filter((id) => valid.has(id)) }));
}

// ---------- ผลการเล่น (1 แถว ต่อ คน ต่อ ท่า ต่อ วัน) ----------
export function resultOf(sessionId, exId, pid) {
  return store.all('results').find((r) => r.session_id === sessionId && r.exercise_id === exId && r.profile_id === pid);
}
export const isComplete = (r) => r.sets_done >= r.target_sets;

export function resultText(ex, r) {
  const sets = `${r.sets_done}/${r.target_sets} เซ็ท`;
  if (isWeighted(ex)) return `${fmtNum(r.weight)} kg · ${sets}`;
  return `${sets} × ${r.target_reps} ${unitOf(ex)}`;
}

// ประวัติของคนหนึ่งในท่าหนึ่ง เรียงจากเก่าไปใหม่
export function history(exId, pid) {
  const dates = new Map(store.all('sessions').map((s) => [s.id, s.date]));
  return store
    .all('results')
    .filter((r) => r.exercise_id === exId && r.profile_id === pid && dates.has(r.session_id))
    .map((r) => ({ ...r, weight: +r.weight || 0, date: dates.get(r.session_id) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
export function lastBefore(exId, pid, date) {
  const h = history(exId, pid).filter((e) => e.date < date);
  return h[h.length - 1] || null;
}

// เทียบครั้งนี้กับครั้งก่อน
export function compare(ex, prev, cur) {
  if (!prev) return { kind: 'first', text: 'ครั้งแรก' };
  if (isWeighted(ex)) {
    const diff = Math.round((cur.weight - prev.weight) * 100) / 100;
    if (diff > 0) return { kind: 'up', text: `พัฒนา +${fmtNum(diff)} kg` };
    if (diff < 0) return { kind: 'down', text: `ลดลง ${fmtNum(diff)} kg` };
  } else {
    if (cur.target_reps > prev.target_reps) return { kind: 'up', text: `พัฒนา +${cur.target_reps - prev.target_reps} ${unitOf(ex)}` };
    if (cur.target_reps < prev.target_reps) return { kind: 'down', text: `ลดลง ${cur.target_reps - prev.target_reps} ${unitOf(ex)}` };
  }
  if (cur.sets_done > prev.sets_done) return { kind: 'up', text: 'ครบมากขึ้น' };
  if (cur.sets_done < prev.sets_done) return { kind: 'down', text: 'ทำได้น้อยลง' };
  return { kind: 'same', text: 'เท่าเดิม' };
}

// คำแนะนำครั้งหน้า: ดูจาก 2 ครั้งล่าสุด
export function suggest(ex, h) {
  if (!isWeighted(ex) || h.length < 2) return null;
  const [a, b] = h.slice(-2);
  if (a.weight !== b.weight) return null;
  if (isComplete(a) && isComplete(b)) return { text: `ครบ 2 ครั้งติดแล้ว ลองเพิ่มเป็น ${fmtNum(b.weight + 2.5)} kg`, weight: b.weight + 2.5 };
  if (!isComplete(a) && !isComplete(b) && b.weight >= 2.5) return { text: `ไม่ครบ 2 ครั้งติด ลองลดเป็น ${fmtNum(b.weight - 2.5)} kg`, weight: b.weight - 2.5 };
  return null;
}

// ---------- ท่าทดแทน ----------
export function substitutesFor(ex, exclude = new Set(), limit = 6) {
  const words = (m) => (m || '').split('·').map((w) => w.trim()).filter(Boolean);
  const mine = new Set(words(ex.muscles));
  return store
    .all('exercises')
    .filter((e) => e.id !== ex.id && !exclude.has(e.id))
    .map((e) => {
      let score = e.categories[0] === ex.categories[0] ? 2 : 0;
      score += e.categories.filter((c) => ex.categories.includes(c)).length;
      score += words(e.muscles).filter((w) => mine.has(w)).length * 2;
      return { e, score };
    })
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((x) => x.e);
}

// ---------- ค้นหาท่า ----------
export function searchExercises(q, cat) {
  const words = (q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rank = (e) => {
    const i = CATEGORIES.indexOf(e.categories[0]);
    return i < 0 ? 99 : i;
  };
  return store
    .all('exercises')
    .filter((e) => {
      if (cat && cat !== 'ทั้งหมด' && !e.categories.includes(cat)) return false;
      if (!words.length) return true;
      const hay = [e.name, e.muscles, e.equipment, ...e.categories.map((c) => `${c} ${SYNONYMS[c] || ''}`)].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    })
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
