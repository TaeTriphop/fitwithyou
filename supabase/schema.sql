-- โครงสร้างตารางบน Supabase ให้ตรงกับข้อมูลในแอพ (ชื่อคอลัมน์เหมือนกันทุกตัว)
-- วิธีใช้: Supabase Dashboard > SQL Editor > วางทั้งไฟล์ > Run

create table profiles (
  id text primary key,
  name text not null,
  color text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table exercises (
  id text primary key,
  name text not null,
  muscles text,
  equipment text,
  categories text[] not null default '{}',
  kind text not null default 'weight' check (kind in ('weight', 'reps', 'time')),
  unit text,
  video_url text default '',
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

create table plan_days (
  id text primary key,
  weekday smallint not null unique check (weekday between 0 and 6),
  title text not null default '',
  created_at timestamptz not null default now()
);

create table plan_items (
  id text primary key,
  weekday smallint not null check (weekday between 0 and 6),
  exercise_id text not null references exercises(id) on delete cascade,
  sort int not null default 0,
  who text[] not null default '{}',
  created_at timestamptz not null default now()
);

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

create table day_moves (
  id text primary key,
  week_start date not null,
  from_weekday smallint not null check (from_weekday between 0 and 6),
  to_weekday smallint not null check (to_weekday between 0 and 6),
  created_at timestamptz not null default now(),
  unique (week_start, from_weekday)
);

create table sessions (
  id text primary key,
  date date not null unique,
  extra_items jsonb not null default '[]',
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table set_logs (
  id text primary key,
  session_id text not null references sessions(id) on delete cascade,
  exercise_id text not null references exercises(id),
  profile_id text not null references profiles(id),
  set_index int not null,
  weight numeric not null default 0,
  reps int not null,
  target_sets int,
  target_reps int,
  created_at timestamptz not null default now(),
  unique (session_id, exercise_id, profile_id, set_index)
);

create table exercise_notes (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (profile_id, exercise_id)
);

-- ความปลอดภัย: เปิด RLS ทุกตาราง ให้เข้าถึงได้เฉพาะคนที่ล็อกอินแล้ว (บัญชีที่ใช้ร่วมกัน)
-- คนที่มีแค่ลิงก์เว็บแต่ไม่ได้ล็อกอิน จะอ่านหรือแก้ข้อมูลไม่ได้
do $$
declare t text;
begin
  foreach t in array array['profiles','exercises','plan_days','plan_items','targets','day_moves','sessions','set_logs','exercise_notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "signed-in full access" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
