// ข้อมูลตั้งต้น: มีแค่ 2 คน คลังท่าและแผนว่างเปล่า เพิ่มเองได้ในแอพ
export function buildSeed() {
  const now = new Date().toISOString();
  return {
    profiles: [
      { id: 'p-me', name: 'ฉัน', color: '#2251CC', avatar_url: '', sort: 0, created_at: now },
      { id: 'p-fan', name: 'แฟน', color: '#C2580F', avatar_url: '', sort: 1, created_at: now },
    ],
    exercises: [],
    plan_items: [],
    targets: [],
    sessions: [],
    results: [],
    exercise_notes: [],
  };
}
