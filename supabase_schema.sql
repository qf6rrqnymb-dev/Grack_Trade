-- ============================================================
-- Grack_Trade · Supabase schema
-- วิธีใช้: เปิด Supabase project → เมนู "SQL Editor" → วางทั้งไฟล์นี้ → กด Run
-- ============================================================

-- ตารางเก็บงานของนักศึกษา 1 แถว = 1 ลิงก์ที่แชร์ได้
create table if not exists submissions (
  id           text primary key default substr(md5(random()::text), 1, 8), -- short id เช่น "ab3xz9k1"
  student_name text,
  student_id   text,
  courses      jsonb       not null default '[]',
  theme        text        default 'light',
  accent       text        default '#3F6E64',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- โจทย์นี้ "ไม่มีระบบล็อกอิน" (anyone-with-link เหมือน Google Docs)
-- จึงเปิดสิทธิ์ public ทั้ง read / insert / update
--   ⚠️ Trade-off: ใครก็ตามที่รู้ id (8 ตัวอักษร) เปิด/แก้ข้อมูลได้
--   เหมาะกับงานส่งอาจารย์ · ไม่เหมาะเก็บข้อมูลอ่อนไหว
-- ============================================================
alter table submissions enable row level security;

drop policy if exists "public read"   on submissions;
drop policy if exists "public insert" on submissions;
drop policy if exists "public update" on submissions;

create policy "public read"   on submissions for select using (true);
create policy "public insert" on submissions for insert with check (true);
create policy "public update" on submissions for update using (true);

-- (ตั้งใจไม่เปิด delete แบบ public เพื่อลดความเสี่ยงข้อมูลถูกลบทิ้ง)
