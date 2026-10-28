// เตรียมไว้สำหรับย้ายไป Supabase (ยังไม่ได้ใช้งาน)
// วิธีเปิดใช้: ดูหัวข้อ "ย้ายไป Supabase" ใน README.md
// เมธอดเหมือน adapter-local.js ทุกตัว หน้าจอจึงไม่ต้องแก้อะไร
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export function createSupabaseAdapter({ url, anonKey }) {
  const sb = createClient(url, anonKey);

  const check = ({ error, data }) => {
    if (error) throw error;
    return data;
  };

  return {
    name: 'supabase',
    client: sb,

    // ใช้บัญชีเดียวร่วมกัน: ล็อกอินครั้งเดียวต่อเครื่อง แล้ว Supabase จะจำไว้เอง
    async init() {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        const err = new Error('ต้องล็อกอินก่อน');
        err.code = 'AUTH_REQUIRED';
        throw err;
      }
    },

    async signIn(email, password) {
      return check(await sb.auth.signInWithPassword({ email, password }));
    },

    async select(t) {
      return check(await sb.from(t).select('*'));
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

    // ใช้ตอนนำเข้าไฟล์สำรอง: ลบทุกตารางจากล่างขึ้นบน แล้วใส่ใหม่จากบนลงล่าง
    async replaceAll(tables) {
      const order = Object.keys(tables);
      for (const t of [...order].reverse()) {
        check(await sb.from(t).delete().neq('id', ''));
      }
      for (const t of order) {
        const rows = tables[t] || [];
        for (let i = 0; i < rows.length; i += 500) {
          check(await sb.from(t).insert(rows.slice(i, i + 500)));
        }
      }
    },
  };
}
