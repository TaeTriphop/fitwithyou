// ชั้นข้อมูลกลาง: หน้าจอทุกหน้าอ่าน/เขียนข้อมูลผ่านไฟล์นี้เท่านั้น
// ถ้าตั้งค่า Supabase ไว้ใน js/config.js จะใช้ Supabase ไม่อย่างนั้นใช้ localStorage
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';
import { createLocalAdapter } from './adapter-local.js';

// ลำดับนี้สำคัญ: ตารางที่ถูกอ้างอิงต้องมาก่อน
export const TABLES = ['profiles', 'exercises', 'plan_items', 'targets', 'sessions', 'results', 'exercise_notes'];

let adapter = null;
const cache = Object.fromEntries(TABLES.map((t) => [t, []]));
const listeners = new Set();
let onError = (e) => console.error(e);

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

async function getAdapter() {
  if (adapter) return adapter;
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createSupabaseAdapter } = await import('./adapter-supabase.js');
    adapter = createSupabaseAdapter({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
  } else {
    adapter = createLocalAdapter();
  }
  return adapter;
}

function emit() {
  listeners.forEach((fn) => fn());
}

async function loadAll() {
  const next = {};
  for (const t of TABLES) next[t] = (await adapter.select(t)) || [];
  Object.assign(cache, next);
}

// ถ้าบันทึกไม่สำเร็จ ให้แจ้ง แล้วโหลดข้อมูลจริงกลับมา เพื่อไม่ให้หน้าจอกับข้อมูลไม่ตรงกัน
async function guard(promise) {
  try {
    await promise;
  } catch (e) {
    onError(e);
    try {
      await loadAll();
      emit();
    } catch {}
  }
}

export const store = {
  get isRemote() {
    return adapter?.name === 'supabase';
  },
  get configured() {
    return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
  },

  async init(buildSeed) {
    await getAdapter();
    await adapter.init?.();
    await loadAll();
    if (!cache.profiles.length) {
      const seed = buildSeed();
      await adapter.insert('profiles', seed.profiles);
      await loadAll();
    }
  },

  async signIn(email, password) {
    await getAdapter();
    await adapter.signIn(email, password);
  },

  async signOut() {
    await adapter?.signOut?.();
  },

  async reload() {
    await loadAll();
    emit();
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

  // ทุกการเขียนอัปเดตหน้าจอทันที แล้วค่อยบันทึกจริง
  // opts.silent = ไม่วาดหน้าจอใหม่ (ใช้กับช่องพิมพ์ ไม่ให้เคอร์เซอร์หลุด)
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
    return { app: 'fitwithyou', version: 2, exported_at: new Date().toISOString(), tables: structuredClone(cache) };
  },

  async importAll(data) {
    if (!data || data.app !== 'fitwithyou' || data.version !== 2 || typeof data.tables !== 'object') {
      throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของ FitWithYou เวอร์ชันนี้');
    }
    const tables = Object.fromEntries(TABLES.map((t) => [t, Array.isArray(data.tables[t]) ? data.tables[t] : []]));
    await adapter.replaceAll(tables);
    await loadAll();
    emit();
  },

  // ล้างทุกอย่าง แต่เก็บชื่อและรูปของคุณสองคนไว้
  async reset(buildSeed) {
    const seed = buildSeed();
    if (cache.profiles.length) seed.profiles = structuredClone(cache.profiles);
    await adapter.replaceAll(seed);
    await loadAll();
    emit();
  },
};
