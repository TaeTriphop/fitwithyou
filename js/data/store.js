// ชั้นข้อมูลกลาง: หน้าจอทุกหน้าอ่าน/เขียนข้อมูลผ่านไฟล์นี้เท่านั้น
// อยากย้ายไป Supabase ให้เปลี่ยนแค่บรรทัด adapter ด้านล่าง (ดู README.md)
import { createLocalAdapter } from './adapter-local.js';
// import { createSupabaseAdapter } from './adapter-supabase.js';

// ลำดับนี้สำคัญ: ตารางที่ถูกอ้างอิง (foreign key) ต้องมาก่อน
export const TABLES = [
  'profiles',
  'exercises',
  'plan_days',
  'plan_items',
  'targets',
  'day_moves',
  'sessions',
  'set_logs',
  'exercise_notes',
];

const adapter = createLocalAdapter();
// const adapter = createSupabaseAdapter({ url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' });

const cache = Object.fromEntries(TABLES.map((t) => [t, []]));
const listeners = new Set();
let onError = (e) => console.error(e);

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function emit() {
  listeners.forEach((fn) => fn());
}

async function guard(promise) {
  try {
    await promise;
  } catch (e) {
    onError(e);
  }
}

async function loadAll() {
  for (const t of TABLES) cache[t] = (await adapter.select(t)) || [];
}

export const store = {
  get adapterName() {
    return adapter.name;
  },

  async init(buildSeed) {
    await adapter.init?.();
    await loadAll();
    if (!cache.profiles.length) {
      await adapter.replaceAll(buildSeed());
      await loadAll();
    }
  },

  all(table) {
    return cache[table];
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  setErrorHandler(fn) {
    onError = fn;
  },

  // ทุกการเขียนอัปเดต cache ก่อน (หน้าจอตอบสนองทันที) แล้วค่อยบันทึกลง adapter
  // opts.silent = ไม่ต้องวาดหน้าจอใหม่ (ใช้กับช่องพิมพ์ เพื่อไม่ให้เคอร์เซอร์หลุด)
  async insert(table, row, opts = {}) {
    const r = { id: uid(), created_at: new Date().toISOString(), ...row };
    cache[table] = [...cache[table], r];
    if (!opts.silent) emit();
    await guard(adapter.insert(table, [r]));
    return r;
  },

  async update(table, id, patch, opts = {}) {
    cache[table] = cache[table].map((r) => (r.id === id ? { ...r, ...patch } : r));
    if (!opts.silent) emit();
    await guard(adapter.update(table, id, patch));
  },

  async remove(table, id) {
    cache[table] = cache[table].filter((r) => r.id !== id);
    emit();
    await guard(adapter.remove(table, [id]));
  },

  async removeWhere(table, predicate) {
    const ids = cache[table].filter(predicate).map((r) => r.id);
    if (!ids.length) return;
    const set = new Set(ids);
    cache[table] = cache[table].filter((r) => !set.has(r.id));
    emit();
    await guard(adapter.remove(table, ids));
  },

  exportAll() {
    return {
      app: 'fitduo',
      version: 1,
      exported_at: new Date().toISOString(),
      tables: structuredClone(cache),
    };
  },

  async importAll(data) {
    if (!data || data.app !== 'fitduo' || typeof data.tables !== 'object') {
      throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของแอพนี้');
    }
    const tables = Object.fromEntries(TABLES.map((t) => [t, Array.isArray(data.tables[t]) ? data.tables[t] : []]));
    await adapter.replaceAll(tables);
    await loadAll();
    emit();
  },

  async reset(buildSeed) {
    await adapter.replaceAll(buildSeed());
    await loadAll();
    emit();
  },
};
