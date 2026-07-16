# Grack_Trade

เว็บแอปคำนวณเกรด / GPA / เกียรตินิยม สำหรับหลักสูตร **Digital Design (133 หน่วยกิต)**
ดีไซน์สไตล์ Warm / Organic Modern · รองรับโหมดมืด · ส่งงานให้อาจารย์ด้วยลิงก์เดียว

> **หน้าเว็บ (index) เป็น HTML ไฟล์เดียว** เปิดได้เลยโดยไม่ต้องติดตั้งอะไร — ตามข้อกำหนดของรายวิชา

---

## ✨ ฟีเจอร์

- **แดชบอร์ดภาพรวม** — GPAX, สถานะเกียรตินิยม, สถานภาพนักศึกษา, ความคืบหน้าหลักสูตร, เช็คลิสต์หมวดวิชา
- **สลับมุมมองแนวโน้ม** (ใหม่) — ในหน้าภาพรวมสลับดูได้ 2 มุมมอง:
  - **แนวโน้ม GPA** — กราฟเส้น GPA รายเทอม + เส้นสะสม
  - **แนวโน้มสายอาชีพ** — ประเมินคร่าว ๆ จากรายวิชาที่ลงเรียน จับ "แทร็กทักษะ" (UX/UI, Visual & Motion,
    Front-end, Research/Data, Brand) คิด GPA เฉลี่ยต่อแทร็ก แล้วแนะนำแนวอาชีพที่เกรดสนับสนุน
    _(เป็นแนวทางเบื้องต้นเท่านั้น ไม่ใช่คำแนะนำอาชีพระดับมืออาชีพ)_
    - **ปุ่ม ✨ ให้ AI ช่วยวิเคราะห์** (ไม่บังคับ) — ถ้าตั้งค่า Gemini key จะมีปุ่มส่งสรุปแทร็กไปให้
      Gemini เขียนคำแนะนำเชิงลึกเพิ่ม (ดูหัวข้อ "ตั้งค่า Gemini" ด้านล่าง)
- **วิชาเรียน** — เพิ่ม/แก้/ลบวิชา, กรองตามปี/เทอม/หมวด, ค้นหา
- **สถิติ** — กราฟแนวโน้ม + ตรวจขั้นต่ำแต่ละกลุ่มย่อย
- **ตั้งค่า** — ข้อมูลนักศึกษา, โหมดมืด, เลือกสีธีม, จัดการข้อมูล, สร้างลิงก์ส่งอาจารย์
- **ส่งงานด้วยลิงก์สั้น** (ใหม่) — ผ่าน Supabase เช่น `https://<domain>/?s=ab3xz9k1`

---

## 🏗️ สถาปัตยกรรม (ทำไมถึงเป็นไฟล์เดียว)

เครื่องที่พัฒนาไม่มี Node/npm และอาจารย์กำหนดให้ index เป็น HTML → เราจึงเลือกแนวทาง **ไม่มี build tool**:

- `index.html` โหลด **React + ReactDOM + Babel + Supabase จาก CDN** และฝัง JSX ไว้ในไฟล์เดียว
- `GradeCalculatorApp.jsx` = ซอร์สที่อ่านง่าย (แก้ที่นี่)
- `build.py` = สคริปต์เล็ก ๆ (ใช้ Python ที่มากับ macOS อยู่แล้ว) แปลง `.jsx` → `index.html`

```bash
# แก้โค้ดที่ GradeCalculatorApp.jsx แล้วสร้าง index.html ใหม่:
python3 build.py
```

> จะแก้ที่ `index.html` ตรง ๆ ก็ได้ แต่แนะนำให้แก้ที่ `.jsx` เพื่อความเป็นระเบียบ
> ข้อแลกเปลี่ยน: หน้าเว็บต้องมีอินเทอร์เน็ตเพื่อโหลดไลบรารีจาก CDN (และเพื่อใช้ Supabase อยู่แล้ว)

---

## 🔌 ตั้งค่า Supabase (ทำครั้งเดียว)

ถ้ายังไม่ตั้งค่า แอปจะทำงานได้ปกติแบบ **ออฟไลน์** (เก็บใน localStorage + ลิงก์ฝังข้อมูลแบบเดิม)
เมื่อตั้งค่าแล้วจะได้ **ลิงก์สั้นจริง** ที่ชี้ไปยังข้อมูลบน backend

1. สร้างโปรเจกต์ฟรีที่ [supabase.com](https://supabase.com) → New project
2. เปิดเมนู **SQL Editor** → วางไฟล์ [`supabase_schema.sql`](supabase_schema.sql) → กด **Run**
   (สร้างตาราง `submissions` + เปิดสิทธิ์ public read/write เพราะไม่มีระบบล็อกอิน)
3. ไปที่ **Project Settings → API** คัดลอก **Project URL** และ **anon public key**
4. วางค่าทั้งสองในบล็อก `[SUPABASE CONFIG]` บนสุดของ `GradeCalculatorApp.jsx`:
   ```js
   const SUPABASE_URL = "https://xxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGci...";
   ```
5. รัน `python3 build.py` เพื่ออัปเดต `index.html` → commit → deploy

รายละเอียดค่าดูที่ [`.env.example`](.env.example)

### ⚠️ ข้อควรรู้เรื่องความปลอดภัย
ระบบนี้ **ไม่มีล็อกอิน** (anyone-with-link เหมือน Google Docs แบบเปิดแก้ไข):
ใครก็ตามที่รู้ `id` (สุ่ม 8 ตัวอักษร) สามารถเปิด/แก้ข้อมูลได้ · anon key ใส่ในหน้าเว็บได้ปลอดภัย
เหมาะกับ **งานส่งอาจารย์** ไม่เหมาะกับข้อมูลอ่อนไหว

---

## 🤖 AI ผ่าน Supabase Edge Function (ไม่บังคับ — ปุ่ม "ให้ AI ช่วยวิเคราะห์" + แชทถามอาชีพ)

ฟีเจอร์ AI เรียก Gemini **ผ่าน Supabase Edge Function** เพื่อให้ **คีย์อยู่ฝั่ง server** (ไม่โผล่ในหน้าเว็บ ·
GitHub ไม่บล็อก · ไม่ต้องจำกัด referrer) แอปจะเปิดฟีเจอร์ AI อัตโนมัติเมื่อ Supabase ถูกตั้งค่าแล้ว
ถ้ายังไม่ deploy function การกดจะขึ้น error สุภาพ ส่วนวิเคราะห์แบบ heuristic ใช้ได้ตามปกติ

**ขั้นตอน (ทำครั้งเดียว):**

1. **ได้คีย์ Gemini ที่มีโควตา** — [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
   ด้วย **บัญชี Gmail ส่วนตัว** (❗ไม่ใช่บัญชีมหาวิทยาลัย/องค์กร ซึ่งมักปิด free tier)
   ถ้าได้คีย์แต่ยัง `429 limit:0` ต้องเปิด billing ในโปรเจกต์ Google Cloud
2. **Deploy function** ชื่อ `career-ai` (โค้ดอยู่ที่ [`supabase/functions/career-ai/index.ts`](supabase/functions/career-ai/index.ts)):
   - **แบบ Dashboard (ง่ายสุด):** Supabase → เมนู **Edge Functions** → **Deploy a new function** →
     ตั้งชื่อ `career-ai` → วางโค้ดจากไฟล์ข้างบน → Deploy
   - **แบบ CLI:** `supabase functions deploy career-ai --project-ref tlrkdkepqudrzleaahyz`
3. **ตั้ง secret** (คีย์อยู่ตรงนี้ ไม่อยู่ในโค้ด):
   - Dashboard: **Edge Functions → Secrets** (หรือ Project Settings → Edge Functions) →
     เพิ่ม `GEMINI_API_KEY` = คีย์ของคุณ · (ไม่บังคับ) `GEMINI_MODEL` = `gemini-2.0-flash`
   - CLI: `supabase secrets set GEMINI_API_KEY=xxxx GEMINI_MODEL=gemini-2.0-flash`
4. เสร็จ — แอปเรียก `${SUPABASE_URL}/functions/v1/career-ai` ให้อัตโนมัติ (ไม่ต้อง rebuild)

> คีย์ในโหมดนี้เป็นความลับฝั่ง server จึง **ไม่ต้องจำกัด referrer** และ **ไม่หลุดขึ้น repo**

### แก้ปัญหาที่พบบ่อย
- **`429 · free_tier ... limit: 0`** = โปรเจกต์ของคีย์นี้ไม่มีโควตา → ใช้คีย์จาก **บัญชี Gmail ส่วนตัว**
  หรือเปิด **billing** (โมเดล flash ถูกมาก ~เศษสตางค์ต่อครั้ง)
- **`404 · model no longer available to new users`** = โมเดลตกรุ่น → ตั้ง secret `GEMINI_MODEL=gemini-2.0-flash`
- **`Failed to fetch` / `AI 404`** = ยังไม่ได้ deploy function `career-ai` หรือตั้งชื่อไม่ตรง
- คีย์ Gemini ใช้ได้ทั้งแบบ `AIzaSy...` และ `AQ.Ab8...` (แต่แบบ `AQ.` มักผูก service account = ต้องมี billing)

---

## 🚀 Deploy

ไฟล์เดียวจึง deploy ที่ไหนก็ได้ที่ให้บริการ static hosting:

- **GitHub Pages** (ง่ายสุดสำหรับ repo นี้): Settings → Pages → Source = `main` / root → เปิดใช้
  จะได้ URL `https://<user>.github.io/Grack_Trade/`
- หรือ **Netlify / Vercel** (ฟรี tier): ลากโฟลเดอร์ไปวาง / เชื่อม repo แล้ว deploy ได้เลย

เนื่องจากค่า Supabase ถูกฝังใน `index.html` แล้ว (anon key เป็น public) จึงไม่ต้องตั้ง env var ที่ฝั่ง host

---

## 📁 โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | แอปพร้อมใช้ (ไฟล์เดียว · สร้างจาก build.py) |
| `GradeCalculatorApp.jsx` | ซอร์ส React ที่อ่าน/แก้ง่าย |
| `build.py` | สร้าง `index.html` จาก `.jsx` |
| `supabase_schema.sql` | สคีมา + RLS สำหรับ Supabase |
| `supabase/functions/career-ai/index.ts` | Edge Function พร็อกซี Gemini (คีย์อยู่ฝั่ง server) |
| `.env.example` | อธิบายค่า Supabase + secret ของ Edge Function |
