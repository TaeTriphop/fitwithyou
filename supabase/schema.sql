-- FitWithYou: สร้างตารางบน Supabase
-- วิธีใช้: Supabase Dashboard > SQL Editor > New query > วางทั้งไฟล์ > Run
-- ถ้าเคยรันเวอร์ชันเก่าไว้แล้ว บรรทัด drop ด้านล่างจะล้างของเก่าออกก่อน (ข้อมูลเดิมจะหายทั้งหมด)

drop table if exists set_logs, results, exercise_notes, targets, plan_items, plan_days, day_moves, sessions, exercises, profiles cascade;

create table profiles (
  id text primary key,
  name text not null,
  color text not null,
  avatar_url text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table exercises (
  id text primary key,
  name text not null,
  muscles text not null default '',
  equipment text not null default '',
  categories text[] not null default '{}',
  kind text not null default 'weight' check (kind in ('weight', 'reps', 'time')),
  unit text,
  video_url text not null default '',
  image_url text not null default '',
  created_at timestamptz not null default now()
);

-- ท่าไหนอยู่ในแผนวันไหน (0 = จันทร์ ... 6 = อาทิตย์) และใครเล่น
create table plan_items (
  id text primary key,
  weekday smallint not null check (weekday between 0 and 6),
  exercise_id text not null references exercises(id) on delete cascade,
  sort int not null default 0,
  who text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- เป้าหมายและน้ำหนักปัจจุบันของแต่ละคนต่อท่า
create table targets (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  weight numeric not null default 0,
  sets int not null default 3,
  reps int not null default 12,
  created_at timestamptz not null default now(),
  unique (profile_id, exercise_id)
);

-- วันที่ไปเล่นจริง ใช้แผนของวันไหน + ท่าที่เปลี่ยน/เพิ่มเฉพาะวันนั้น
create table sessions (
  id text primary key,
  date date not null unique,
  plan_weekday smallint check (plan_weekday between 0 and 6),
  extra_items jsonb not null default '[]',
  substitutions jsonb not null default '[]',
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

-- ผลการเล่น: 1 แถว ต่อ คน ต่อ ท่า ต่อ วัน
create table results (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  profile_id text not null references profiles(id) on delete cascade,
  weight numeric not null default 0,
  sets_done int not null,
  target_sets int not null,
  target_reps int not null,
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, profile_id)
);

create table exercise_notes (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (profile_id, exercise_id)
);

-- ความปลอดภัย: เข้าถึงได้เฉพาะคนที่เข้าสู่ระบบแล้วเท่านั้น
do $$
declare t text;
begin
  foreach t in array array['profiles','exercises','plan_items','targets','sessions','results','exercise_notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "signed-in full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- คุณกับแฟน (แก้ชื่อและใส่รูปได้ในแอพ)
insert into profiles (id, name, color, sort) values
  ('p-me', 'ฉัน', '#2251CC', 0),
  ('p-fan', 'แฟน', '#C2580F', 1);
