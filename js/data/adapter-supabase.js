// เก็บข้อมูลบน Supabase: ทั้งคุณและแฟนเห็นข้อมูลชุดเดียวกันทุกเครื่อง
// ใช้บัญชีเดียวร่วมกัน ล็อกอินครั้งเดียวต่อเครื่อง แล้ว Supabase จะจำไว้เอง
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const PAGE = 1000;

export function createSupabaseAdapter({ url, anonKey }) {
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });

  const check = ({ error, data }) => {
    if (error) throw new Error(error.message);
    return data;
  };

  return {
    name: 'supabase',

    async init() {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        const err = new Error('ต้องเข้าสู่ระบบก่อน');
        err.code = 'AUTH_REQUIRED';
        throw err;
      }
    },

    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message);
    },

    async signOut() {
      await sb.auth.signOut();
    },

    // อ่านทีละ 1,000 แถว (Supabase จำกัดต่อครั้ง) จนครบ
    async select(t) {
      const out = [];
      for (let from = 0; ; from += PAGE) {
        const rows = check(await sb.from(t).select('*').order('id').range(from, from + PAGE - 1));
        out.push(...rows);
        if (rows.length < PAGE) return out;
      }
    },

    async insert(t, rows) {
      check(await sb.from(t).insert(rows));
    },

    async update(t, id, patch) {
      check(await sb.from(t).update(patch).eq('id', id));
    },

    async remove(t, ids) {
      check(await sb.from(t).delete().in('id', ids));
    },

    // ใช้ตอนนำเข้าไฟล์สำรอง/ล้างข้อมูล: ลบจากล่างขึ้นบน แล้วใส่ใหม่จากบนลงล่าง
    async replaceAll(tables) {
      const order = Object.keys(tables);
      for (const t of [...order].reverse()) check(await sb.from(t).delete().neq('id', ''));
      for (const t of order) {
        const rows = tables[t] || [];
        for (let i = 0; i < rows.length; i += 500) check(await sb.from(t).insert(rows.slice(i, i + 500)));
      }
    },
  };
}
