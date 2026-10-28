import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const PAGE = 1000;

export function createSupabaseAdapter({ url, anonKey, pin }) {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-app-pin': pin } },
  });

  const check = ({ error, data }) => {
    if (error) {
      const msg = /row-level security/i.test(error.message) ? 'รหัสไม่ถูกต้อง หรือถูกเปลี่ยนแล้ว' : error.message;
      throw new Error(msg);
    }
    return data;
  };

  return {
    name: 'supabase',

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
