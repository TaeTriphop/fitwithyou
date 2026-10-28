// เก็บข้อมูลใน localStorage ของเบราว์เซอร์ (เครื่องใครเครื่องมัน)
// ทุก adapter ต้องมีเมธอดชุดเดียวกัน: select, insert, update, remove, replaceAll
const KEY = 'fitduo:v1';

export function createLocalAdapter() {
  let data = read();

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
      return {};
    }
  }

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  const table = (t) => (data[t] ||= []);

  return {
    name: 'local',

    async select(t) {
      return structuredClone(table(t));
    },

    async insert(t, rows) {
      table(t).push(...structuredClone(rows));
      persist();
    },

    async update(t, id, patch) {
      data[t] = table(t).map((r) => (r.id === id ? { ...r, ...structuredClone(patch) } : r));
      persist();
    },

    async remove(t, ids) {
      const set = new Set(ids);
      data[t] = table(t).filter((r) => !set.has(r.id));
      persist();
    },

    async replaceAll(tables) {
      data = structuredClone(tables);
      persist();
    },
  };
}
