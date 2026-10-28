// ข้อมูลตั้งต้นตอนเปิดแอพครั้งแรก (แก้ได้ทั้งหมดในแอพ)
// น้ำหนักในแผนเป็นค่าตัวอย่าง ปรับให้ตรงกับที่เล่นจริงได้ในหน้า "แผนของเรา"
import { uid } from './store.js';

const ME = 'p-me';
const FAN = 'p-fan';

// [id, ชื่อ, กล้ามเนื้อที่โดน, อุปกรณ์, หมวด, ชนิด, หน่วยเวลา]
// ชนิด: weight = น้ำหนัก × ครั้ง, reps = นับครั้ง, time = จับเวลา
const EXERCISES = [
  ['lat-pulldown', 'Lat Pulldown', 'หลัง · ปีก', 'เครื่อง', ['หลัง']],
  ['seated-cable-row', 'Seated Cable Row', 'หลัง · กลางหลัง', 'เคเบิล', ['หลัง']],
  ['machine-row', 'Machine Row', 'หลัง · กลางหลัง', 'เครื่อง', ['หลัง']],
  ['db-row', 'One-arm Dumbbell Row', 'หลัง · ปีก', 'ดัมเบล', ['หลัง']],
  ['assisted-pullup', 'Assisted Pull-up', 'หลัง · แขนหน้า', 'เครื่อง', ['หลัง', 'แขน']],
  ['pullup', 'Pull-up', 'หลัง · แขนหน้า', 'บาร์โหน', ['หลัง', 'แขน'], 'reps'],
  ['straight-arm-pulldown', 'Straight-arm Pulldown', 'หลัง · ปีก', 'เคเบิล', ['หลัง']],
  ['back-extension', 'Back Extension', 'หลังล่าง · ก้น', 'ม้านั่ง', ['หลัง', 'ก้น'], 'reps'],
  ['chest-press', 'Chest Press Machine', 'อก · แขนหลัง', 'เครื่อง', ['อก']],
  ['bench-press', 'Bench Press', 'อก · แขนหลัง · ไหล่หน้า', 'บาร์เบล', ['อก']],
  ['incline-db-press', 'Incline Dumbbell Press', 'อกบน · ไหล่หน้า', 'ดัมเบล', ['อก']],
  ['pec-deck', 'Pec Deck', 'อก', 'เครื่อง', ['อก']],
  ['cable-crossover', 'Cable Crossover', 'อก', 'เคเบิล', ['อก']],
  ['push-up', 'Push-up', 'อก · แขนหลัง', 'บอดี้เวท', ['อก'], 'reps'],
  ['shoulder-press', 'Shoulder Press Machine', 'ไหล่', 'เครื่อง', ['ไหล่']],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'ไหล่ · แขนหลัง', 'ดัมเบล', ['ไหล่']],
  ['lateral-raise', 'Lateral Raise', 'ไหล่ข้าง', 'ดัมเบล', ['ไหล่']],
  ['front-raise', 'Front Raise', 'ไหล่หน้า', 'ดัมเบล', ['ไหล่']],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'ไหล่หลัง · หลังบน', 'เครื่อง', ['ไหล่', 'หลัง']],
  ['face-pull', 'Face Pull', 'ไหล่หลัง · หลังบน', 'เคเบิล', ['ไหล่', 'หลัง']],
  ['db-curl', 'Dumbbell Curl', 'แขนหน้า', 'ดัมเบล', ['แขน']],
  ['hammer-curl', 'Hammer Curl', 'แขนหน้า · ปลายแขน', 'ดัมเบล', ['แขน']],
  ['cable-curl', 'Cable Curl', 'แขนหน้า', 'เคเบิล', ['แขน']],
  ['preacher-curl', 'Preacher Curl', 'แขนหน้า', 'เครื่อง / ดัมเบล', ['แขน']],
  ['triceps-pushdown', 'Triceps Pushdown', 'แขนหลัง', 'เคเบิล', ['แขน']],
  ['overhead-triceps', 'Overhead Triceps Extension', 'แขนหลัง', 'ดัมเบล / เคเบิล', ['แขน']],
  ['skull-crusher', 'Skull Crusher', 'แขนหลัง', 'บาร์ EZ / ดัมเบล', ['แขน']],
  ['assisted-dips', 'Assisted Dips', 'แขนหลัง · อก', 'เครื่อง', ['แขน', 'อก']],
  ['leg-press', 'Leg Press', 'ขาหน้า · ก้น', 'เครื่อง', ['ขา', 'ก้น']],
  ['squat', 'Barbell Squat', 'ขาหน้า · ก้น', 'บาร์เบล', ['ขา', 'ก้น']],
  ['goblet-squat', 'Goblet Squat', 'ขาหน้า · ก้น', 'ดัมเบล', ['ขา', 'ก้น']],
  ['hack-squat', 'Hack Squat', 'ขาหน้า · ก้น', 'เครื่อง', ['ขา', 'ก้น']],
  ['leg-extension', 'Leg Extension', 'ขาหน้า', 'เครื่อง', ['ขา']],
  ['seated-leg-curl', 'Seated Leg Curl', 'ขาหลัง', 'เครื่อง', ['ขา']],
  ['lying-leg-curl', 'Lying Leg Curl', 'ขาหลัง', 'เครื่อง', ['ขา']],
  ['rdl', 'Romanian Deadlift', 'ขาหลัง · ก้น · หลังล่าง', 'บาร์เบล / ดัมเบล', ['ขา', 'ก้น']],
  ['bulgarian', 'Bulgarian Split Squat', 'ขาหน้า · ก้น', 'ดัมเบล', ['ขา', 'ก้น']],
  ['walking-lunge', 'Walking Lunge', 'ขาหน้า · ก้น', 'ดัมเบล', ['ขา', 'ก้น']],
  ['standing-calf', 'Standing Calf Raise', 'น่อง', 'เครื่อง', ['ขา']],
  ['seated-calf', 'Seated Calf Raise', 'น่อง', 'เครื่อง', ['ขา']],
  ['hip-thrust', 'Hip Thrust', 'ก้น', 'บาร์เบล / เครื่อง', ['ก้น']],
  ['glute-bridge', 'Glute Bridge', 'ก้น', 'บอดี้เวท / บาร์เบล', ['ก้น']],
  ['hip-abduction', 'Hip Abduction Machine', 'ก้นด้านข้าง', 'เครื่อง', ['ก้น']],
  ['cable-kickback', 'Cable Kickback', 'ก้น', 'เคเบิล', ['ก้น']],
  ['glute-kickback-machine', 'Glute Kickback Machine', 'ก้น', 'เครื่อง', ['ก้น']],
  ['sumo-squat', 'Sumo Squat', 'ก้น · ขาด้านใน', 'ดัมเบล', ['ก้น', 'ขา']],
  ['step-up', 'Step-up', 'ก้น · ขาหน้า', 'ดัมเบล + กล่อง', ['ก้น', 'ขา']],
  ['plank', 'Plank', 'ท้อง · แกนกลาง', 'บอดี้เวท', ['ท้อง'], 'time', 'วิ'],
  ['crunch', 'Crunch', 'ท้อง', 'บอดี้เวท', ['ท้อง'], 'reps'],
  ['cable-crunch', 'Cable Crunch', 'ท้อง', 'เคเบิล', ['ท้อง']],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'ท้องล่าง', 'บาร์โหน', ['ท้อง'], 'reps'],
  ['russian-twist', 'Russian Twist', 'ท้องข้าง', 'บอดี้เวท / ดัมเบล', ['ท้อง'], 'reps'],
  ['treadmill', 'Treadmill', 'คาร์ดิโอ', 'ลู่วิ่ง', ['คาร์ดิโอ'], 'time', 'นาที'],
  ['bike', 'Stationary Bike', 'คาร์ดิโอ · ขา', 'จักรยาน', ['คาร์ดิโอ'], 'time', 'นาที'],
  ['elliptical', 'Elliptical', 'คาร์ดิโอ', 'เครื่อง', ['คาร์ดิโอ'], 'time', 'นาที'],
  ['stair-climber', 'Stair Climber', 'คาร์ดิโอ · ก้น', 'เครื่อง', ['คาร์ดิโอ', 'ก้น'], 'time', 'นาที'],
];

// [วัน (0 = จันทร์), ท่า, ฉัน [kg, เซ็ท, ครั้ง] หรือ null, แฟน [...] หรือ null]
const PLAN = [
  [0, 'lat-pulldown', [30, 3, 15], [20, 3, 15]],
  [0, 'seated-cable-row', [35, 3, 12], [20, 3, 12]],
  [0, 'db-row', [14, 3, 10], [8, 3, 10]],
  [0, 'hammer-curl', [10, 3, 12], [5, 3, 12]],
  [2, 'leg-press', [100, 3, 12], [60, 3, 12]],
  [2, 'rdl', [40, 3, 10], [25, 3, 10]],
  [2, 'hip-thrust', [60, 3, 10], [40, 3, 12]],
  [2, 'seated-leg-curl', [35, 3, 12], [20, 3, 12]],
  [2, 'hip-abduction', null, [35, 3, 15]],
  [4, 'chest-press', [40, 3, 12], [20, 3, 12]],
  [4, 'shoulder-press', [30, 3, 10], [15, 3, 10]],
  [4, 'lateral-raise', [6, 3, 15], [3, 3, 15]],
  [4, 'triceps-pushdown', [25, 3, 12], null],
  [5, 'plank', [0, 3, 60], [0, 3, 45]],
  [5, 'treadmill', [0, 1, 20], [0, 1, 20]],
];

const DAY_TITLES = ['หลัง + แขนหน้า', '', 'ขา + ก้น', '', 'อก + ไหล่ + แขนหลัง', 'ท้อง + คาร์ดิโอ', ''];

export function buildSeed() {
  const now = new Date().toISOString();
  const row = (r) => ({ id: uid(), created_at: now, ...r });

  const profiles = [
    { id: ME, name: 'ฉัน', color: '#2251CC', avatar_url: '', sort: 0, created_at: now },
    { id: FAN, name: 'แฟน', color: '#C2580F', avatar_url: '', sort: 1, created_at: now },
  ];

  const exercises = EXERCISES.map(([id, name, muscles, equipment, categories, kind = 'weight', unit = null]) => ({
    id: 'ex-' + id,
    name,
    muscles,
    equipment,
    categories,
    kind,
    unit,
    video_url: '',
    image_url: '',
    is_custom: false,
    created_at: now,
  }));

  const plan_days = DAY_TITLES.map((title, weekday) => row({ weekday, title }));

  const plan_items = [];
  const targets = [];
  const sortByDay = {};
  for (const [weekday, exId, me, fan] of PLAN) {
    const exercise_id = 'ex-' + exId;
    const who = [me && ME, fan && FAN].filter(Boolean);
    sortByDay[weekday] = (sortByDay[weekday] ?? -1) + 1;
    plan_items.push(row({ weekday, exercise_id, sort: sortByDay[weekday], who }));
    for (const [pid, t] of [[ME, me], [FAN, fan]]) {
      if (t) targets.push(row({ profile_id: pid, exercise_id, weight: t[0], sets: t[1], reps: t[2] }));
    }
  }

  return {
    profiles,
    exercises,
    plan_days,
    plan_items,
    targets,
    day_moves: [],
    sessions: [],
    set_logs: [],
    exercise_notes: [],
  };
}
