// ตรรกะของแอพ: วันที่, แผน, การประเมินผล, คำแนะนำ, การค้นหา
// ไฟล์นี้อ่านข้อมูลผ่าน store เท่านั้น จึงใช้ได้เหมือนเดิมเมื่อย้ายไป Supabase
import { store } from './data/store.js';

export const DAY_SHORT = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
export const DAY_FULL = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์'];
export const MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export const MONTH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
export const CATEGORIES = ['หลัง', 'อก', 'ไหล่', 'แขน', 'ขา', 'ก้น', 'ท้อง', 'คาร์ดิโอ'];

// คำพ้องความหมาย: พิมพ์คำไหนก็ค้นเจอหมวดนั้น
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

// ---------- วันที่ (ใช้รูปแบบ YYYY-MM-DD ตามเวลาเครื่อง, จันทร์ = 0) ----------
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

export function unitOf(ex) {
  return ex.kind === 'time' ? ex.unit || 'วิ' : 'ครั้ง';
}
export function amountStep(ex) {
  if (ex.kind === 'time') return ex.unit === 'นาที' ? 1 : 5;
  return 1;
}

// ---------- เป้าหมายรายคน (ใช้กับท่านั้นทุกวัน) ----------
export function defaultTarget(ex) {
  if (ex?.kind === 'time') return ex.unit === 'นาที' ? { weight: 0, sets: 1, reps: 20 } : { weight: 0, sets: 3, reps: 45 };
  if (ex?.kind === 'reps') return { weight: 0, sets: 3, reps: 10 };
  return { weight: 0, sets: 3, reps: 12 };
}
export function getTarget(pid, exId) {
  return store.all('targets').find((t) => t.profile_id === pid && t.exercise_id === exId);
}
export function targetOrDefault(pid, exId) {
  return getTarget(pid, exId) || { ...defaultTarget(exerciseById(exId)), profile_id: pid, exercise_id: exId };
}
export async function ensureTarget(pid, exId) {
  const t = getTarget(pid, exId);
  if (t) return t;
  return store.insert('targets', { profile_id: pid, exercise_id: exId, ...defaultTarget(exerciseById(exId)) });
}
export function targetText(ex, t) {
  const u = unitOf(ex);
  if (ex.kind === 'weight') return `${fmtNum(t.weight)} kg · ${t.sets}×${t.reps}`;
  if (ex.kind === 'time') return t.sets === 1 ? `${t.reps} ${u}` : `${t.sets} × ${t.reps} ${u}`;
  return `${t.sets}×${t.reps} ครั้ง`;
}

// ---------- โน้ตรายคนต่อท่า (เช่น ระดับเบาะ) ----------
export function noteOf(pid, exId) {
  return store.all('exercise_notes').find((n) => n.profile_id === pid && n.exercise_id === exId)?.note || '';
}
export async function saveNote(pid, exId, note) {
  const row = store.all('exercise_notes').find((n) => n.profile_id === pid && n.exercise_id === exId);
  const value = note.trim();
  if (row) await store.update('exercise_notes', row.id, { note: value }, { silent: true });
  else if (value) await store.insert('exercise_notes', { profile_id: pid, exercise_id: exId, note: value }, { silent: true });
}

// ---------- แผนประจำสัปดาห์ + การย้ายวันเฉพาะสัปดาห์ ----------
export const planDay = (wd) => store.all('plan_days').find((d) => d.weekday === wd);
export const planItemsOf = (wd) =>
  store.all('plan_items').filter((i) => i.weekday === wd).sort((a, b) => a.sort - b.sort);
export const movesOfWeek = (ws) => store.all('day_moves').filter((m) => m.week_start === ws);

export function autoTitle(items) {
  const cats = [];
  for (const it of items) {
    for (const c of exerciseById(it.exercise_id)?.categories || []) if (!cats.includes(c)) cats.push(c);
  }
  return cats.slice(0, 3).join(' + ');
}

export function effectiveDay(date) {
  const ws = weekStartOf(date);
  const wd = weekdayOf(date);
  const moves = movesOfWeek(ws);
  const movedOut = moves.find((m) => m.from_weekday === wd) || null;
  const movedIn = moves.filter((m) => m.to_weekday === wd);
  const sources = [];
  if (!movedOut) sources.push(wd);
  movedIn.forEach((m) => sources.push(m.from_weekday));
  const items = sources.flatMap((s) => planItemsOf(s).map((i) => ({ ...i, source: s })));
  const title = sources.map((s) => planDay(s)?.title).filter(Boolean).join(' / ');
  return { date, weekday: wd, weekStart: ws, sources, items, title, movedOut, movedIn };
}

export const sessionOf = (date) => store.all('sessions').find((s) => s.date === date);

// ท่าที่จะเล่นในวันนั้นจริงๆ = แผน (รวมที่ย้ายมา) + ท่าที่เพิ่มเฉพาะวันนี้
export function workoutItems(date) {
  const day = effectiveDay(date);
  const s = sessionOf(date);
  const extras = (s?.extra_items || []).map((x) => ({ ...x, extra: true }));
  const seen = new Set();
  const valid = new Set(store.all('profiles').map((p) => p.id));
  return [...day.items, ...extras]
    .filter((it) => {
      if (seen.has(it.exercise_id) || !exerciseById(it.exercise_id)) return false;
      seen.add(it.exercise_id);
      return true;
    })
    .map((it) => ({ ...it, who: (it.who || []).filter((id) => valid.has(id)) }));
}

// ---------- ผลการเล่น ----------
export function logsOf(sessionId, exId, pid) {
  return store
    .all('set_logs')
    .filter((l) => l.session_id === sessionId && l.exercise_id === exId && l.profile_id === pid)
    .sort((a, b) => a.set_index - b.set_index);
}

export function evaluate(logs, target) {
  const goal = target.sets * target.reps;
  let total = 0;
  let complete = target.sets > 0;
  for (let i = 0; i < target.sets; i++) {
    const r = logs.find((x) => x.set_index === i)?.reps ?? 0;
    total += Math.min(r, target.reps);
    if (r < target.reps) complete = false;
  }
  return { total, goal, complete, pct: goal ? Math.round((total / goal) * 100) : 0, count: logs.length };
}

export function targetFromLogs(logs) {
  return {
    sets: logs[0]?.target_sets ?? logs.length,
    reps: logs[0]?.target_reps ?? Math.max(0, ...logs.map((l) => l.reps)),
  };
}

function entryFrom(date, logs) {
  const target = targetFromLogs(logs);
  return {
    date,
    logs,
    target,
    weight: Math.max(0, ...logs.map((l) => +l.weight || 0)),
    best: Math.max(0, ...logs.map((l) => l.reps)),
    ev: evaluate(logs, target),
  };
}

export function resultFor(dayLogs, exId, pid, date) {
  const logs = dayLogs.filter((l) => l.exercise_id === exId && l.profile_id === pid).sort((a, b) => a.set_index - b.set_index);
  return logs.length ? entryFrom(date, logs) : null;
}

export function history(exId, pid) {
  const bySession = new Map();
  for (const l of store.all('set_logs')) {
    if (l.exercise_id !== exId || l.profile_id !== pid) continue;
    if (!bySession.has(l.session_id)) bySession.set(l.session_id, []);
    bySession.get(l.session_id).push(l);
  }
  const sessions = new Map(store.all('sessions').map((s) => [s.id, s]));
  const out = [];
  for (const [sid, logs] of bySession) {
    const s = sessions.get(sid);
    if (!s) continue;
    logs.sort((a, b) => a.set_index - b.set_index);
    out.push(entryFrom(s.date, logs));
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function lastBefore(exId, pid, date) {
  const h = history(exId, pid).filter((e) => e.date < date);
  return h[h.length - 1] || null;
}

export function trailingIncomplete(h) {
  let n = 0;
  for (let i = h.length - 1; i >= 0 && !h[i].ev.complete; i--) n++;
  return n;
}

export const metric = (ex, entry) => (ex.kind === 'weight' ? entry.weight : entry.best);
export const metricText = (ex, v) => (ex.kind === 'weight' ? `${fmtNum(v)} kg` : `${v} ${unitOf(ex)}`);
export const amountsText = (entry) => entry.logs.map((l) => l.reps).join(' / ');
export function resultText(ex, entry) {
  return ex.kind === 'weight' ? `${fmtNum(entry.weight)} kg · ${amountsText(entry)}` : `${amountsText(entry)} ${unitOf(ex)}`;
}

// คำแนะนำครั้งหน้า (เทียบกับครั้งก่อนหน้าด้วย)
export function suggest(ex, target, ev, prev) {
  if (!ev.count) return null;
  const isWeight = ex.kind === 'weight';
  const u = unitOf(ex);
  const step = isWeight ? 2.5 : amountStep(ex);
  const prevComplete = prev?.ev.complete;
  const prevIncomplete = prev && !prev.ev.complete;

  if (ev.complete) {
    if (isWeight) {
      const next = target.weight + step;
      return prevComplete
        ? { text: `ครบ 2 ครั้งติดแล้ว ขยับเป็น ${fmtNum(next)} kg ได้เลย`, apply: { field: 'weight', value: next, label: `ใช้ ${fmtNum(next)} kg ครั้งหน้า` } }
        : { text: `ครบทุกเซ็ท ถ้าครั้งหน้าครบอีก ค่อยขยับเป็น ${fmtNum(next)} kg`, apply: null };
    }
    const next = target.reps + step;
    return prevComplete
      ? { text: `ครบ 2 ครั้งติดแล้ว เพิ่มเป้าเป็น ${next} ${u} ได้เลย`, apply: { field: 'reps', value: next, label: `ตั้งเป้า ${next} ${u}` } }
      : { text: `ครบทุกเซ็ท ถ้าครั้งหน้าครบอีก ค่อยเพิ่มเป้าเป็น ${next} ${u}`, apply: null };
  }

  if (ev.pct >= 80) {
    return { text: `ได้ ${ev.pct}% ${isWeight ? `ใช้ ${fmtNum(target.weight)} kg เท่าเดิม` : 'เป้าเท่าเดิม'} ลองให้ครบทุกเซ็ท`, apply: null };
  }

  if (isWeight) {
    const lower = Math.max(0, target.weight - step);
    return prevIncomplete
      ? { text: `ไม่ครบ 2 ครั้งติด ลองลดเป็น ${fmtNum(lower)} kg ให้ครบก่อน`, apply: { field: 'weight', value: lower, label: `ใช้ ${fmtNum(lower)} kg ครั้งหน้า` } }
      : { text: `ได้ ${ev.pct}% ถ้าครั้งหน้ายังไม่ถึง ลองลดเป็น ${fmtNum(lower)} kg`, apply: null };
  }
  const lower = Math.max(step, target.reps - step);
  return prevIncomplete
    ? { text: `ไม่ครบ 2 ครั้งติด ลองลดเป้าเป็น ${lower} ${u}`, apply: { field: 'reps', value: lower, label: `ตั้งเป้า ${lower} ${u}` } }
    : { text: `ได้ ${ev.pct}% ถ้าครั้งหน้ายังไม่ถึง ลองลดเป้าเป็น ${lower} ${u}`, apply: null };
}

// ---------- สรุปรายวัน / รายสัปดาห์ ----------
export function dayInfo(date) {
  const day = effectiveDay(date);
  const session = sessionOf(date);
  const items = workoutItems(date);
  const logs = session ? store.all('set_logs').filter((l) => l.session_id === session.id) : [];
  let status;
  if (logs.length) {
    let all = true;
    for (const it of items) {
      for (const pid of it.who) {
        const r = resultFor(logs, it.exercise_id, pid, date);
        if (!r || !r.ev.complete) all = false;
      }
    }
    status = all ? 'done' : 'partial';
  } else if (!items.length) status = 'rest';
  else if (date < todayISO()) status = 'missed';
  else status = 'planned';
  return { ...day, items, session, logs, status };
}

export function weekCoverage(ws) {
  const planned = new Set();
  const done = new Set();
  const logs = store.all('set_logs');
  for (let i = 0; i < 7; i++) {
    const date = addDays(ws, i);
    for (const it of workoutItems(date)) exerciseById(it.exercise_id)?.categories.forEach((c) => planned.add(c));
    const s = sessionOf(date);
    if (!s) continue;
    for (const l of logs) if (l.session_id === s.id) exerciseById(l.exercise_id)?.categories.forEach((c) => done.add(c));
  }
  return CATEGORIES.filter((c) => planned.has(c) || done.has(c)).map((c) => ({ label: c, done: done.has(c) }));
}

// วันที่ -> Set ของคนที่เล่นวันนั้น
export function playedMap() {
  const dates = new Map(store.all('sessions').map((s) => [s.id, s.date]));
  const m = new Map();
  for (const l of store.all('set_logs')) {
    const d = dates.get(l.session_id);
    if (!d) continue;
    if (!m.has(d)) m.set(d, new Set());
    m.get(d).add(l.profile_id);
  }
  return m;
}

// จำนวนสัปดาห์ติดต่อกันที่ไปยิมครบจำนวนวันตามแผน
export function weekStreak() {
  const plannedDays = [0, 1, 2, 3, 4, 5, 6].filter((wd) => planItemsOf(wd).length).length;
  if (!plannedDays) return 0;
  const played = playedMap();
  const countWeek = (ws) => [0, 1, 2, 3, 4, 5, 6].filter((i) => played.has(addDays(ws, i))).length;
  let ws = weekStartOf(todayISO());
  let n = countWeek(ws) >= plannedDays ? 1 : 0;
  ws = addDays(ws, -7);
  while (countWeek(ws) >= plannedDays && n < 520) {
    n++;
    ws = addDays(ws, -7);
  }
  return n;
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
