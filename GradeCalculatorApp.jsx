import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   GPA / เกียรตินิยม Calculator — Digital Design (133 หน่วยกิต)
   ------------------------------------------------------------
   เขียนใหม่แบบ self-contained: ฝัง CSS เองทั้งหมดผ่าน <style>
   (ไม่พึ่ง Tailwind arbitrary values ที่ทำให้ preview พังในเวอร์ชันเดิม)
   ============================================================ */

/* ============================================================
   [SUPABASE CONFIG] — วางค่าจาก Supabase project ของคุณที่นี่
   ------------------------------------------------------------
   1) สร้าง project ฟรีที่ https://supabase.com
   2) เปิด SQL Editor แล้วรันไฟล์ supabase_schema.sql (อยู่ใน repo)
   3) ไปที่ Project Settings → API แล้วคัดลอก URL + anon key มาวางด้านล่าง
   ปล่อยว่างไว้ได้ = แอปจะทำงานแบบออฟไลน์ (เก็บใน localStorage + ลิงก์ฝังข้อมูลแบบเดิม)
   anon key เป็น public key ใส่ในหน้าเว็บได้ (ไม่มีระบบล็อกอิน RLS เปิด public อยู่แล้ว)
   ============================================================ */
const SUPABASE_URL = "https://tlrkdkepqudrzleaahyz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscmtka2VwcXVkcnpsZWFhaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MzA4MDQsImV4cCI6MjA5OTQwNjgwNH0.I0nX8gESTmmRkpcmjJnUDKnF-2GckrieQdO-HQJtyJ0";

// สร้าง client เฉพาะเมื่อ config ครบ + ไลบรารี supabase โหลดสำเร็จ (มาจาก CDN ใน index.html)
const sb =
  SUPABASE_URL && SUPABASE_ANON_KEY && typeof window !== "undefined" && window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

/* ---------- 1. โครงสร้างหลักสูตร + ตารางเกรด (Source of Truth) ---------- */

const GRADE_POINTS = {
  A: 4.0, "B+": 3.5, B: 3.0, "C+": 2.5, C: 2.0,
  "D+": 1.5, D: 1.0, F: 0.0, W: null, S: null, U: null,
};
const GRADE_ORDER = ["A", "B+", "B", "C+", "C", "D+", "D", "F", "W", "S", "U"];

const TOTAL_REQUIRED = 133;
const CURRICULUM = [
  {
    id: "1", name: "หมวดวิชาศึกษาทั่วไป", required: 33,
    subcategories: [
      { id: "1.1", name: "กลุ่มวิชาภาษาไทย", required: 3 },
      { id: "1.2", name: "กลุ่มวิชาภาษาต่างประเทศ", required: 6 },
      { id: "1.3", name: "กลุ่มวิชาวิทยาศาสตร์", required: 3 },
      { id: "1.4", name: "กลุ่มวิชาคณิตศาสตร์", required: 3 },
      { id: "1.5", name: "กลุ่มวิชาสังคมศาสตร์", required: 3 },
      { id: "1.6", name: "กลุ่มวิชามนุษยศาสตร์", required: 3 },
    ],
  },
  { id: "2", name: "กลุ่มวิชาแกน", required: 27 },
  {
    id: "3", name: "กลุ่มวิชาเฉพาะ", required: 67,
    subcategories: [
      { id: "3.1", name: "กลุ่มวิชาชีพบังคับ", required: 52 },
      { id: "3.2", name: "กลุ่มวิชาชีพเลือก", required: 15 },
    ],
  },
  { id: "4", name: "หมวดวิชาเลือกเสรี", required: 6 },
];

const SELECTABLE = CURRICULUM.flatMap((cat) =>
  cat.subcategories
    ? cat.subcategories.map((s) => ({ ...s, parent: cat.name }))
    : [{ id: cat.id, name: cat.name, required: cat.required, parent: null }]
);

const MOCK = [
  { id: "m1", code: "TH101", name: "การใช้ภาษาไทยเพื่อการสื่อสาร", credits: 3, grade: "A", categoryId: "1.1", year: 1, term: "1" },
  { id: "m2", code: "EN101", name: "English for Communication I", credits: 3, grade: "B+", categoryId: "1.2", year: 1, term: "1" },
  { id: "m3", code: "SC101", name: "วิทยาศาสตร์เพื่อชีวิต", credits: 3, grade: "A", categoryId: "1.3", year: 1, term: "1" },
  { id: "m4", code: "DD101", name: "Introduction to Digital Design", credits: 3, grade: "A", categoryId: "2", year: 1, term: "1" },
  { id: "m5", code: "SO101", name: "มนุษย์กับสังคม", credits: 3, grade: "B", categoryId: "1.5", year: 1, term: "1" },
  { id: "m6", code: "EN102", name: "English for Communication II", credits: 3, grade: "B", categoryId: "1.2", year: 1, term: "2" },
  { id: "m7", code: "MA101", name: "คณิตศาสตร์สำหรับการออกแบบ", credits: 3, grade: "C+", categoryId: "1.4", year: 1, term: "2" },
  { id: "m8", code: "DD102", name: "Design Principles", credits: 3, grade: "A", categoryId: "2", year: 1, term: "2" },
  { id: "m9", code: "HU101", name: "สุนทรียศาสตร์", credits: 3, grade: "A", categoryId: "1.6", year: 1, term: "2" },
  { id: "m10", code: "DD201", name: "Typography", credits: 3, grade: "A", categoryId: "3.1", year: 2, term: "1" },
  { id: "m11", code: "DD202", name: "UI/UX Fundamentals", credits: 3, grade: "B+", categoryId: "3.1", year: 2, term: "1" },
  { id: "m12", code: "DD203", name: "Motion Graphics", credits: 3, grade: "A", categoryId: "3.2", year: 2, term: "1" },
];

/* ---------- 2. Data Layer (Supabase ถ้าตั้งค่าไว้ · ไม่งั้น degrade เป็น localStorage) ---------- */
const STORE_KEY = "gradecalc_state_v2";
const LAST_ID_KEY = "gradecalc_last_id";

function normalizeState(s) {
  return {
    courses: s.courses || [],
    theme: s.theme || "light",
    accent: s.accent || "#3F6E64",
    profile: s.profile || { name: "", sid: "" },
  };
}
// อ่าน id ของ submission จากลิงก์ (?s=xxxx)
function getSubmissionId() {
  try { return new URLSearchParams(window.location.search).get("s") || null; }
  catch { return null; }
}
// ใส่ id ลง URL ให้เห็นลิงก์สั้นทันที + ล้าง #d=... แบบเดิมทิ้ง
function setSubmissionIdInUrl(id) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.set("s", id);
    u.hash = "";
    window.history.replaceState(null, "", u.pathname + u.search);
  } catch { /* บาง sandbox เขียน URL ไม่ได้ — ข้ามไป */ }
}
function shortShareUrl(id) {
  try {
    const u = new URL(window.location.href);
    return u.origin + u.pathname + "?s=" + id;
  } catch { return "?s=" + id; }
}
// แปลงระหว่าง state ของแอป กับ row ในตาราง submissions
function rowToState(row) {
  return {
    courses: Array.isArray(row.courses) ? row.courses : [],
    theme: row.theme || "light",
    accent: row.accent || "#3F6E64",
    profile: { name: row.student_name || "", sid: row.student_id || "" },
  };
}
function stateToRow(state) {
  return {
    student_name: state.profile?.name || "",
    student_id: state.profile?.sid || "",
    courses: state.courses || [],
    theme: state.theme || "light",
    accent: state.accent || "#3F6E64",
    updated_at: new Date().toISOString(),
  };
}

const DataLayer = {
  hasBackend() { return !!sb; },

  // localStorage — ใช้เป็น fallback และ safety net เสมอ
  getState() {
    try { const d = window.localStorage.getItem(STORE_KEY); return d ? JSON.parse(d) : null; }
    catch { return null; }
  },
  saveState(state) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* in-memory only */ }
  },

  // โหลดครั้งแรก → { state, id, mode, fromLink }
  async init() {
    // ไม่มี backend: พฤติกรรมเดิม (ลิงก์ฝังข้อมูล > localStorage > ข้อมูลตัวอย่าง)
    if (!sb) {
      const shared = readHashState();
      if (shared) return { state: normalizeState(shared), id: null, mode: "local", fromLink: true };
      const s = this.getState();
      if (s) return { state: normalizeState(s), id: null, mode: "local", fromLink: false };
      return { state: { courses: MOCK, theme: "light", accent: "#3F6E64", profile: { name: "", sid: "" } }, id: null, mode: "local", fromLink: false };
    }

    try {
      const urlId = getSubmissionId();
      let id = urlId;
      if (!id) { try { id = window.localStorage.getItem(LAST_ID_KEY); } catch { id = null; } }

      if (id) {
        const { data, error } = await sb.from("submissions").select("*").eq("id", id).maybeSingle();
        if (!error && data) {
          setSubmissionIdInUrl(id);
          try { window.localStorage.setItem(LAST_ID_KEY, id); } catch {}
          return { state: rowToState(data), id, mode: "supabase", fromLink: !!urlId };
        }
        // ไม่พบ record → ตกไปสร้างใหม่
      }

      // สร้าง record ใหม่ (seed จาก localStorage ถ้ามี ไม่งั้นเริ่มว่าง) แล้ว replace URL เป็นลิงก์สั้น
      const seed = normalizeState(this.getState() || { courses: [], theme: "light", accent: "#3F6E64", profile: { name: "", sid: "" } });
      const { data, error } = await sb.from("submissions").insert(stateToRow(seed)).select("*").single();
      if (error || !data) throw error || new Error("insert failed");
      setSubmissionIdInUrl(data.id);
      try { window.localStorage.setItem(LAST_ID_KEY, data.id); } catch {}
      return { state: rowToState(data), id: data.id, mode: "supabase", fromLink: false };
    } catch (e) {
      // Supabase ล่ม/เน็ตหลุด → fallback localStorage โดยไม่ทำให้แอปพัง
      console.warn("[Supabase] init failed, fallback to localStorage:", (e && e.message) || e);
      const s = this.getState();
      const state = s ? normalizeState(s) : { courses: MOCK, theme: "light", accent: "#3F6E64", profile: { name: "", sid: "" } };
      return { state, id: null, mode: "local", fromLink: false };
    }
  },

  // บันทึก (App เรียกแบบ debounce)
  async save(state, id, mode) {
    this.saveState(state); // safety net เสมอ
    if (mode === "supabase" && sb && id) {
      try {
        const { error } = await sb.from("submissions").update(stateToRow(state)).eq("id", id);
        if (error) throw error;
      } catch (e) {
        console.warn("[Supabase] save failed (เก็บใน localStorage แทน):", (e && e.message) || e);
      }
    } else {
      writeHashState(state); // โหมด local: อัปเดตลิงก์ฝังข้อมูลแบบเดิม
    }
  },
};

/* ---------- 3. Core Logic (คำนวณให้ถูกตามหลักสูตร) ---------- */

function calcMetrics(courses) {
  let gpaCredits = 0, earned = 0, points = 0;
  for (const c of courses) {
    const p = GRADE_POINTS[c.grade];
    if (p !== null && p !== undefined) { gpaCredits += c.credits; points += c.credits * p; }
    if (c.grade !== "F" && c.grade !== "W" && c.grade !== "U") earned += c.credits; // นับหน่วยกิตสะสมเฉพาะที่ผ่าน
  }
  const gpa = gpaCredits > 0 ? points / gpaCredits : 0;
  return { gpa, earned, gpaCredits, points };
}

function checkHonors(courses, gpa) {
  const hasF = courses.some((c) => c.grade === "F");
  const overTime = courses.some((c) => c.year > 4); // จบใน 4 ปีหลัก
  const codes = courses.map((c) => c.code.trim().toUpperCase()).filter(Boolean);
  const hasRetake = new Set(codes).size !== codes.length;

  const checks = [
    { key: "noF", label: "ไม่เคยได้เกรด F", ok: !hasF },
    { key: "onTime", label: "เรียนจบภายใน 4 ปี", ok: !overTime },
    { key: "noRetake", label: "ไม่มีวิชาเรียนซ้ำ", ok: !hasRetake },
  ];
  const eligible = checks.every((c) => c.ok);

  let level = 0; // 0 = ไม่ได้, 1 = อันดับ 1, 2 = อันดับ 2
  if (eligible) {
    if (gpa >= 3.75) level = 1;
    else if (gpa >= 3.25) level = 2;
  }
  return { level, eligible, checks, gpa };
}

/* สถานภาพนักศึกษาจาก GPAX (ใช้เกณฑ์มาตรฐานทั่วไป — ปรับตัวเลขได้ตามระเบียบคณะ)
   ปกติ: GPAX ≥ 2.00 | วิทยาทัณฑ์: 1.50–1.99 | เสี่ยงพ้นสภาพ: < 1.50           */
function checkStanding(gpa, hasGraded) {
  if (!hasGraded) return { code: "none", label: "ยังไม่มีข้อมูล", tone: "neutral", note: "เพิ่มวิชาที่มีเกรดเพื่อประเมินสถานภาพ" };
  if (gpa >= 2.0) return { code: "normal", label: "สภาพปกติ", tone: "ok", note: "GPAX ตั้งแต่ 2.00 ขึ้นไป" };
  if (gpa >= 1.5) return { code: "probation", label: "วิทยาทัณฑ์ (Probation)", tone: "warn", note: "GPAX 1.50–1.99 · ต้องทำเกรดให้ถึง 2.00" };
  return { code: "dismissed", label: "เสี่ยงพ้นสภาพ", tone: "danger", note: "GPAX ต่ำกว่า 1.50 · ตรวจสอบระเบียบคณะ" };
}

const TERM_ORDER = { "1": 1, "2": 2, Summer: 3 };
function groupByTerm(courses) {
  const g = {};
  for (const c of courses) {
    const k = `Y${c.year}-T${c.term}`;
    if (!g[k]) g[k] = { key: k, year: c.year, term: c.term, courses: [] };
    g[k].courses.push(c);
  }
  return Object.values(g).sort((a, b) =>
    a.year !== b.year ? a.year - b.year : TERM_ORDER[a.term] - TERM_ORDER[b.term]
  );
}
const round2 = (n) => (Math.round(n * 100) / 100).toFixed(2);
const termLabel = (t) => (t === "Summer" ? "ฤดูร้อน" : t);

// จัดรูปแบบรหัสวิชาเป็น ###-#### (ใส่ขีดอัตโนมัติหลัง 3 ตัวแรก) เช่น 9411106 -> 941-1106
function formatCourseCode(raw) {
  const clean = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
  return clean.length > 3 ? `${clean.slice(0, 3)}-${clean.slice(3)}` : clean;
}

/* ---------- Career-track heuristic (ประเมินแนวโน้มสายอาชีพจากรายวิชา) ----------
   จับ "แทร็กทักษะ" จากคำในชื่อ/รหัสวิชา แล้วคิด GPA เฉลี่ยต่อแทร็ก (ใช้สูตร GPA เดิม)
   เป็นการประเมินคร่าวๆ เท่านั้น ไม่ใช่คำแนะนำอาชีพระดับมืออาชีพ                     */
const CAREER_TRACKS = [
  { id: "uxui", name: "UX/UI Design",
    keywords: ["ux", "ui", "design thinking", "usability", "user experience"],
    advice: "เหมาะกับสาย UX/UI Designer · Product Designer — ออกแบบประสบการณ์และหน้าจอผลิตภัณฑ์ดิจิทัล" },
  { id: "visual", name: "Visual & Motion Design",
    keywords: ["typography", "motion", "visual", "graphic", "illustration"],
    advice: "เหมาะกับสาย Visual/Motion Designer · Graphic Designer — งานภาพ ตัวอักษร และแอนิเมชัน" },
  { id: "frontend", name: "Creative Technologist / Front-end",
    keywords: ["front-end", "frontend", "web", "interactive", "code", "coding", "programming"],
    advice: "เหมาะกับสาย Front-end Developer · Creative Technologist — เชื่อมงานออกแบบเข้ากับการเขียนโค้ด" },
  { id: "research", name: "UX Research / Design Data Analyst",
    keywords: ["data", "research", "analytics", "statistics", "analysis"],
    advice: "เหมาะกับสาย UX Researcher · Design Data Analyst — วิจัยผู้ใช้และวิเคราะห์ข้อมูลเพื่อการออกแบบ" },
  { id: "brand", name: "Brand & Creative Strategy",
    keywords: ["brand", "strategy", "marketing", "business"],
    advice: "เหมาะกับสาย Brand Designer · Creative Strategist — วางกลยุทธ์แบรนด์และการสื่อสาร" },
];
const GENERAL_TRACK = {
  id: "general", name: "งานออกแบบทั่วไป",
  advice: "พื้นฐานงานออกแบบดิจิทัลรอบด้าน — เหมาะกับ Designer สายทั่วไป ลองเพิ่มวิชาเฉพาะทางเพื่อเจาะแนวที่ชอบ",
};
const MIN_TRACK_COURSES = 3; // ต้องมีอย่างน้อย 3 วิชาต่อแทร็กจึงจะนับว่าประเมินได้

function matchTracks(course) {
  const hay = `${course.code} ${course.name}`.toLowerCase();
  return CAREER_TRACKS.filter((t) =>
    t.keywords.some((kw) => {
      const esc = kw.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
      return new RegExp("\\b" + esc + "\\b", "i").test(hay);
    })
  );
}

function analyzeCareer(courses) {
  const buckets = {};
  const ensure = (t) => (buckets[t.id] || (buckets[t.id] = { ...t, courses: [] }));
  for (const c of courses) {
    const hits = matchTracks(c);
    if (hits.length) {
      hits.forEach((t) => ensure(t).courses.push(c)); // วิชาหนึ่งเป็นหลักฐานได้หลายแทร็ก
    } else if (c.categoryId === "3" || String(c.categoryId).startsWith("3.")) {
      ensure(GENERAL_TRACK).courses.push(c); // fallback: วิชาชีพที่จับคำไม่ได้
    }
  }
  const tracks = Object.values(buckets).map((b) => {
    const m = calcMetrics(b.courses);
    return { id: b.id, name: b.name, advice: b.advice, courses: b.courses, count: b.courses.length, gpa: m.gpa, gpaCredits: m.gpaCredits };
  });
  const qualified = tracks.filter((t) => t.count >= MIN_TRACK_COURSES).sort((a, b) => b.gpa - a.gpa);
  return { top: qualified.slice(0, 3), hasEnough: qualified.length > 0 };
}

/* ---------- URL share state (ฝังข้อมูลลงในลิงก์ เพื่อส่งให้อาจารย์) ---------- */
// เข้ารหัสเป็น compact array ลดขนาด URL + รองรับภาษาไทย (encodeURIComponent)
function encodeState(state) {
  try {
    const compact = {
      c: (state.courses || []).map((c) => [c.code, c.name, c.credits, c.grade, c.categoryId, c.year, c.term]),
      t: state.theme,
      a: state.accent,
      p: state.profile || { name: "", sid: "" },
    };
    return encodeURIComponent(JSON.stringify(compact));
  } catch { return ""; }
}
function decodeState(str) {
  try {
    const o = JSON.parse(decodeURIComponent(str));
    if (!o || !Array.isArray(o.c)) return null;
    return {
      courses: o.c.map((a, i) => ({
        id: "u" + i + "_" + Math.random().toString(36).slice(2, 6),
        code: a[0] || "", name: a[1] || "", credits: a[2] || 0, grade: a[3] || "A",
        categoryId: a[4] || "3.1", year: a[5] || 1, term: a[6] || "1",
      })),
      theme: o.t || "light",
      accent: o.a || "#3F6E64",
      profile: o.p || { name: "", sid: "" },
    };
  } catch { return null; }
}
function readHashState() {
  try {
    const m = (window.location.hash || "").match(/^#d=(.+)$/);
    return m ? decodeState(m[1]) : null;
  } catch { return null; }
}
function writeHashState(state) {
  try {
    const url = window.location.pathname + window.location.search + "#d=" + encodeState(state);
    window.history.replaceState(null, "", url);
  } catch { /* บาง sandbox เขียน URL ไม่ได้ — ข้ามไป */ }
}
function currentShareUrl() {
  try { return window.location.href; } catch { return ""; }
}

/* ---------- 4. Theme tokens ---------- */
const ACCENTS = [
  { id: "sage", name: "Sage", color: "#3F6E64" },
  { id: "terracotta", name: "Terracotta", color: "#C0592F" },
  { id: "amber", name: "Amber", color: "#C0862B" },
  { id: "ocean", name: "Ocean", color: "#356B79" },
  { id: "plum", name: "Plum", color: "#7C4A63" },
];

/* ============================================================
   MAIN APP
   ============================================================ */
export default function App() {
  const [courses, setCourses] = useState([]);
  const [theme, setTheme] = useState("light");
  const [accent, setAccent] = useState("#3F6E64");
  const [profile, setProfile] = useState({ name: "", sid: "" });
  const [tab, setTab] = useState("dashboard");
  const [loaded, setLoaded] = useState(false);
  const [fromLink, setFromLink] = useState(false); // เปิดมาจากลิงก์ที่แชร์
  const [subId, setSubId] = useState(null);   // id ของ submission บน Supabase (ถ้ามี)
  const [mode, setMode] = useState("local");  // "supabase" | "local"
  const saveTimer = React.useRef(null);
  const skipNextSave = React.useRef(true);    // กันเซฟทับทันทีหลังโหลดเสร็จ

  // toast + confirm (แทน alert/confirm ที่ถูกบล็อกใน sandbox)
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);
  const askConfirm = useCallback((opts) => setConfirmState(opts), []);

  useEffect(() => {
    // โหลดข้อมูล: Supabase (ถ้าตั้งค่าไว้) > ลิงก์ฝังข้อมูล > localStorage > ข้อมูลตัวอย่าง
    let alive = true;
    (async () => {
      const res = await DataLayer.init();
      if (!alive) return;
      setCourses(res.state.courses || []);
      setTheme(res.state.theme || "light");
      setAccent(res.state.accent || "#3F6E64");
      setProfile(res.state.profile || { name: "", sid: "" });
      setSubId(res.id);
      setMode(res.mode);
      setFromLink(res.fromLink);
      skipNextSave.current = true;
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    const state = { courses, theme, accent, profile };
    clearTimeout(saveTimer.current);
    // debounce 600ms: ไม่บันทึกทุก keystroke — รอให้พิมพ์เสร็จก่อน
    saveTimer.current = setTimeout(() => { DataLayer.save(state, subId, mode); }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [courses, theme, accent, profile, loaded, subId, mode]);

  if (!loaded) return null;

  return (
    <div className="gc-root" data-theme={theme} style={{ "--primary": accent }}>
      <style>{CSS}</style>

      <div className="gc-frame">
        <main className="gc-main">
          {tab === "dashboard" && <Dashboard courses={courses} profile={profile} onGoto={setTab} />}
          {tab === "courses" && (
            <Courses courses={courses} setCourses={setCourses} showToast={showToast} askConfirm={askConfirm} />
          )}
          {tab === "stats" && <Stats courses={courses} />}
          {tab === "settings" && (
            <Settings
              theme={theme} setTheme={setTheme}
              accent={accent} setAccent={setAccent}
              profile={profile} setProfile={setProfile}
              setCourses={setCourses} showToast={showToast} askConfirm={askConfirm}
              count={courses.length}
            />
          )}
        </main>

        <nav className="gc-nav">
          {[
            { id: "dashboard", label: "ภาพรวม", icon: Ic.home },
            { id: "courses", label: "วิชาเรียน", icon: Ic.book },
            { id: "stats", label: "สถิติ", icon: Ic.chart },
            { id: "settings", label: "ตั้งค่า", icon: Ic.gear },
          ].map((t) => (
            <button
              key={t.id}
              className={`gc-navbtn ${tab === t.id ? "is-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="gc-navicon">{t.icon}</span>
              <span className="gc-navlabel">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {toast && <div className="gc-toast">{toast}</div>}
      {confirmState && (
        <ConfirmDialog
          {...confirmState}
          onCancel={() => setConfirmState(null)}
          onOk={() => { confirmState.onOk?.(); setConfirmState(null); }}
        />
      )}
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ courses, profile, onGoto }) {
  const { gpa, earned, gpaCredits } = useMemo(() => calcMetrics(courses), [courses]);
  const honors = useMemo(() => checkHonors(courses, gpa), [courses, gpa]);
  const standing = useMemo(() => checkStanding(gpa, gpaCredits > 0), [gpa, gpaCredits]);
  const terms = useMemo(() => groupByTerm(courses), [courses]);

  const [trendView, setTrendView] = useState("gpa"); // gpa | career
  const series = useMemo(() => {
    let cumC = 0, cumP = 0;
    return terms.map((t) => {
      const m = calcMetrics(t.courses);
      cumC += m.gpaCredits; cumP += m.points;
      return { label: `${t.year}/${t.term === "Summer" ? "S" : t.term}`, term: m.gpa, cum: cumC > 0 ? cumP / cumC : 0 };
    });
  }, [terms]);

  const pct = Math.min(100, (earned / TOTAL_REQUIRED) * 100);
  const remaining = Math.max(0, TOTAL_REQUIRED - earned);

  const bestTerm = useMemo(() => {
    let best = 0;
    for (const t of terms) best = Math.max(best, calcMetrics(t.courses).gpa);
    return best;
  }, [terms]);

  const catProgress = useMemo(
    () =>
      CURRICULUM.map((cat) => {
        const cc = courses.filter((c) => c.categoryId === cat.id || c.categoryId.startsWith(cat.id + "."));
        const e = cc.reduce((s, c) => (c.grade !== "F" && c.grade !== "W" && c.grade !== "U" ? s + c.credits : s), 0);
        return { ...cat, earned: e, done: e >= cat.required };
      }),
    [courses]
  );
  const completedCats = catProgress.filter((c) => c.done).length;

  // ตัวเลขบอกระยะห่างถึงเกณฑ์เกียรตินิยม
  const toH1 = Math.max(0, 3.75 - gpa);
  const toH2 = Math.max(0, 3.25 - gpa);

  const displayName = profile?.name?.trim();
  const displaySid = profile?.sid?.trim();

  return (
    <div className="gc-view">
      <header className="gc-head">
        <p className="gc-eyebrow">Digital Design · {TOTAL_REQUIRED} หน่วยกิต</p>
        {displayName || displaySid ? (
          <>
            <h1 className="gc-title">{displayName || "นักศึกษา"}</h1>
            {displaySid && <p className="gc-muted-sm gc-num" style={{ marginTop: 2 }}>รหัส {displaySid}</p>}
          </>
        ) : (
          <h1 className="gc-title">ภาพรวมการเรียน</h1>
        )}
      </header>

      {/* HERO GPA */}
      <section className="gc-hero">
        <div className="gc-hero-bg" />
        <p className="gc-hero-cap">เกรดเฉลี่ยสะสม (GPAX)</p>
        <div className="gc-hero-gpa gc-num">{round2(gpa)}</div>

        <div className={`gc-badge ${honors.level ? "is-win" : honors.eligible ? "is-neutral" : "is-warn"}`}>
          {honors.level === 1 && (<>{Ic.crown}<span>เกียรตินิยมอันดับ 1</span></>)}
          {honors.level === 2 && (<>{Ic.crown}<span>เกียรตินิยมอันดับ 2</span></>)}
          {honors.level === 0 && honors.eligible && (<span>ยังมีสิทธิ์ · รักษาเกรดต่อไป</span>)}
          {honors.level === 0 && !honors.eligible && (<>{Ic.warn}<span>หมดสิทธิ์เกียรตินิยม</span></>)}
        </div>

        {honors.eligible && honors.level !== 1 && (
          <p className="gc-hero-hint">
            {honors.level === 2
              ? `อีก ${round2(toH1)} เพื่อขึ้นอันดับ 1`
              : `อีก ${round2(toH2)} เพื่อคว้าอันดับ 2`}
          </p>
        )}
      </section>

      {/* QUICK STATS */}
      <section className="gc-stats">
        <Stat label="หน่วยกิตสะสม" value={earned} sub={`/ ${TOTAL_REQUIRED}`} />
        <Stat label="เทอมที่เรียน" value={terms.length} sub="เทอม" />
        <Stat label="GPA สูงสุด/เทอม" value={round2(bestTerm)} />
      </section>

      {/* แนวโน้ม: สลับ GPA ↔ สายอาชีพ */}
      <Card>
        <div className="gc-segment gc-mb" role="tablist" aria-label="เลือกมุมมองแนวโน้ม">
          <button
            role="tab" aria-selected={trendView === "gpa"}
            className={`gc-segbtn ${trendView === "gpa" ? "is-on" : ""}`}
            onClick={() => setTrendView("gpa")}
          >แนวโน้ม GPA</button>
          <button
            role="tab" aria-selected={trendView === "career"}
            className={`gc-segbtn ${trendView === "career" ? "is-on" : ""}`}
            onClick={() => setTrendView("career")}
          >แนวโน้มสายอาชีพ</button>
        </div>

        {trendView === "gpa" ? (
          <>
            <div className="gc-row-between gc-mb">
              <p className="gc-card-title">GPA แต่ละเทอม</p>
              <div className="gc-legend">
                <span className="lg lg-term">เทอม</span>
                <span className="lg lg-cum">สะสม</span>
              </div>
            </div>
            {series.length < 2 ? (
              <div className="gc-chart-empty">ต้องมีข้อมูลอย่างน้อย 2 เทอมจึงจะเห็นแนวโน้ม</div>
            ) : (
              <LineChart data={series} />
            )}
          </>
        ) : (
          <CareerTrend courses={courses} />
        )}
      </Card>

      {/* สถานภาพนักศึกษา */}
      <Card>
        <div className="gc-row-between">
          <div>
            <p className="gc-card-title">สถานภาพนักศึกษา</p>
            <p className="gc-muted-sm">{standing.note}</p>
          </div>
          <span className={`gc-standing tone-${standing.tone}`}>
            {standing.tone === "ok" ? Ic.check : standing.tone === "neutral" ? null : Ic.warn}
            {standing.label}
          </span>
        </div>
      </Card>

      {/* ความคืบหน้ารวม */}
      <Card>
        <div className="gc-row-between">
          <div>
            <p className="gc-card-title">ความคืบหน้าหลักสูตร</p>
            <p className="gc-muted-sm">เหลืออีก {remaining} หน่วยกิตจึงจะครบ</p>
          </div>
          <div className="gc-bignum gc-num">{earned}<span className="gc-slash">/{TOTAL_REQUIRED}</span></div>
        </div>
        <Bar value={pct} />
      </Card>

      {/* เกณฑ์เกียรตินิยม checklist */}
      <Card>
        <div className="gc-row-between gc-mb">
          <p className="gc-card-title">เกณฑ์เกียรตินิยม</p>
          <span className="gc-muted-sm">3 เงื่อนไข</span>
        </div>
        <ul className="gc-checklist">
          {honors.checks.map((c) => (
            <li key={c.key} className={c.ok ? "ok" : "bad"}>
              <span className="gc-check-ic">{c.ok ? Ic.check : Ic.cross}</span>
              <span>{c.label}</span>
              <span className="gc-check-state">{c.ok ? "ผ่าน" : "ไม่ผ่าน"}</span>
            </li>
          ))}
        </ul>
        <div className="gc-threshold">
          <ThresholdRow label="อันดับ 1" need="≥ 3.75" gpa={gpa} target={3.75} eligible={honors.eligible} />
          <ThresholdRow label="อันดับ 2" need="3.25–3.74" gpa={gpa} target={3.25} eligible={honors.eligible} />
        </div>
      </Card>

      {/* หมวดวิชา */}
      <div className="gc-row-between gc-section-head">
        <h2 className="gc-h2">เช็คลิสต์การเรียนครบหมวด</h2>
        <span className="gc-muted-sm">ครบแล้ว {completedCats}/{catProgress.length}</span>
      </div>
      <div className="gc-catgrid">
        {catProgress.map((cat) => {
          const done = cat.done;
          return (
            <Card key={cat.id} pad="sm">
              <div className="gc-row-between">
                <span className="gc-cat-name">
                  {done && <span className="gc-cat-tick">{Ic.check}</span>}
                  {cat.id}. {cat.name}
                </span>
                <span className="gc-num gc-cat-num">
                  {done ? <span className="gc-cat-done">เรียนครบ</span> : <><b className="c-warn">{cat.earned}</b>/{cat.required}</>}
                </span>
              </div>
              <Bar value={Math.min(100, (cat.earned / cat.required) * 100)} tone={done ? "ok" : "warn"} thin />
            </Card>
          );
        })}
      </div>

      <button className="gc-link gc-center-link" onClick={() => onGoto("stats")}>ดูรายละเอียดกลุ่มย่อย →</button>
    </div>
  );
}

function ThresholdRow({ label, need, gpa, target, eligible }) {
  const reached = eligible && gpa >= target;
  return (
    <div className={`gc-thr ${reached ? "reached" : ""}`}>
      <span className="gc-thr-dot" />
      <span className="gc-thr-label">{label}</span>
      <span className="gc-thr-need gc-num">{need}</span>
      <span className="gc-thr-mark">{reached ? Ic.check : "—"}</span>
    </div>
  );
}

/* ============================================================
   COURSES
   ============================================================ */
function Courses({ courses, setCourses, showToast, askConfirm }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [yearFilter, setYearFilter] = useState("all"); // all | 1 | 2 | 3 | 4 ...
  const [termFilter, setTermFilter] = useState("all");  // all | "1" | "2" | "Summer"
  const [filter, setFilter] = useState("all"); // all | 1 | 2 | 3 | 4 (หมวดวิชา)

  // รายชื่อปีที่จะโชว์เป็นแท็บ: ปี 1–4 เสมอ + ปีอื่นที่มีข้อมูลจริง (เช่น ปี 5 กรณีเรียนเกิน)
  const years = useMemo(() => {
    const set = new Set([1, 2, 3, 4]);
    courses.forEach((c) => set.add(c.year));
    return Array.from(set).sort((a, b) => a - b);
  }, [courses]);

  const selectYear = (y) => {
    setYearFilter(y);
    setTermFilter("all"); // รีเซ็ตเทอมทุกครั้งที่เปลี่ยนปี
  };

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchQ =
        !q ||
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.code.toLowerCase().includes(q.toLowerCase());
      const matchYear = yearFilter === "all" || c.year === yearFilter;
      const matchTerm = yearFilter === "all" || termFilter === "all" || c.term === termFilter;
      const matchCat = filter === "all" || c.categoryId === filter || c.categoryId.startsWith(filter + ".");
      return matchQ && matchYear && matchTerm && matchCat;
    });
  }, [courses, q, yearFilter, termFilter, filter]);

  // สรุปของขอบเขตที่เลือกอยู่ (ปี หรือ ปี+เทอม)
  const yearSummary = useMemo(() => {
    if (yearFilter === "all") return null;
    const yc = courses.filter(
      (c) => c.year === yearFilter && (termFilter === "all" || c.term === termFilter)
    );
    const scope = termFilter === "all" ? `ปี ${yearFilter}` : `ปี ${yearFilter} · เทอม ${termLabel(termFilter)}`;
    return { count: yc.length, scope, ...calcMetrics(yc) };
  }, [courses, yearFilter, termFilter]);

  const groups = useMemo(() => groupByTerm(filtered), [filtered]);

  const save = (data) => {
    if (editing) setCourses((p) => p.map((c) => (c.id === editing.id ? { ...data, id: c.id } : c)));
    else setCourses((p) => [...p, { ...data, id: Math.random().toString(36).slice(2, 9) }]);
    setModal(false);
    showToast(editing ? "แก้ไขวิชาแล้ว" : "เพิ่มวิชาแล้ว");
  };

  const del = (c) =>
    askConfirm({
      title: "ลบวิชานี้?",
      body: `${c.code} · ${c.name}`,
      okLabel: "ลบ",
      danger: true,
      onOk: () => { setCourses((p) => p.filter((x) => x.id !== c.id)); showToast("ลบวิชาแล้ว"); },
    });

  return (
    <div className="gc-view">
      <header className="gc-head gc-row-between">
        <div>
          <p className="gc-eyebrow">ลงทะเบียนแล้ว {courses.length} วิชา</p>
          <h1 className="gc-title">วิชาเรียน</h1>
        </div>
      </header>

      {/* search + filter */}
      <div className="gc-search">
        <span className="gc-search-ic">{Ic.search}</span>
        <input
          className="gc-search-input"
          placeholder="ค้นหาชื่อวิชาหรือรหัส"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && <button className="gc-search-clear" onClick={() => setQ("")}>{Ic.x}</button>}
      </div>

      {/* แท็บเลือกปี (ตัวหลัก) */}
      <div className="gc-years">
        <button
          className={`gc-yeartab ${yearFilter === "all" ? "is-on" : ""}`}
          onClick={() => selectYear("all")}
        >
          ทั้งหมด
        </button>
        {years.map((y) => (
          <button
            key={y}
            className={`gc-yeartab ${yearFilter === y ? "is-on" : ""}`}
            onClick={() => selectYear(y)}
          >
            ปี {y}
          </button>
        ))}
      </div>

      {/* แท็บเลือกเทอม (โผล่เมื่อเลือกปีแล้ว) */}
      {yearFilter !== "all" && (
        <div className="gc-terms">
          {[
            { id: "all", label: "ทุกเทอม" },
            { id: "1", label: "เทอม 1" },
            { id: "2", label: "เทอม 2" },
            { id: "Summer", label: "ฤดูร้อน" },
          ].map((t) => (
            <button
              key={t.id}
              className={`gc-termtab ${termFilter === t.id ? "is-on" : ""}`}
              onClick={() => setTermFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* สรุปของขอบเขตที่เลือก */}
      {yearSummary && (
        <div className="gc-yearsum">
          <span>{yearSummary.scope} · {yearSummary.count} วิชา</span>
          <span className="gc-num">GPA {round2(yearSummary.gpa)} · {yearSummary.earned} นก.</span>
        </div>
      )}

      {/* ชิปกรองหมวดวิชา (ชั้นรอง อยู่ใต้แท็บปี) */}
      <div className="gc-chips">
        {[
          { id: "all", label: "ทุกหมวด" },
          { id: "1", label: "ศึกษาทั่วไป" },
          { id: "2", label: "แกน" },
          { id: "3", label: "เฉพาะ" },
          { id: "4", label: "เสรี" },
        ].map((f) => (
          <button
            key={f.id}
            className={`gc-chip ${filter === f.id ? "is-on" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="ยังไม่มีวิชาเรียน"
          body="เริ่มบันทึกเทอมแรกของคุณ แล้วดู GPA กับเกียรตินิยมอัปเดตทันที"
          action="เพิ่มวิชาแรก"
          onAction={() => { setEditing(null); setModal(true); }}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title={
            yearFilter !== "all"
              ? `ยังไม่มีวิชาใน${termFilter === "all" ? `ปี ${yearFilter}` : `ปี ${yearFilter} เทอม ${termLabel(termFilter)}`}`
              : "ไม่พบวิชาที่ค้นหา"
          }
          body="ลองเปลี่ยนปี เทอม หมวดวิชา หรือคำค้นหา"
          action="เพิ่มวิชา"
          onAction={() => { setEditing(null); setModal(true); }}
        />
      ) : (
        <div className="gc-termlist">
          {groups.map((g) => {
            const m = calcMetrics(g.courses);
            return (
              <section key={g.key} className="gc-term">
                <div className="gc-term-head">
                  <h3 className="gc-term-title">ปี {g.year} · เทอม {termLabel(g.term)}</h3>
                  <span className="gc-term-meta gc-num">GPA {round2(m.gpa)} · {m.earned} นก.</span>
                </div>
                {g.courses.map((c) => (
                  <div key={c.id} className="gc-course">
                    <div className="gc-course-main">
                      <div className="gc-course-top">
                        <span className="gc-code">{c.code}</span>
                        <span className="gc-muted-sm gc-num">{c.credits} นก.</span>
                        <span className="gc-catpill">{catShort(c.categoryId)}</span>
                      </div>
                      <p className="gc-course-name">{c.name}</p>
                    </div>
                    <div className="gc-course-right">
                      <span className={`gc-grade ${c.grade === "F" ? "is-f" : ""} gc-num`}>{c.grade}</span>
                      <div className="gc-course-actions">
                        <button className="gc-iconbtn" onClick={() => { setEditing(c); setModal(true); }}>{Ic.edit}</button>
                        <button className="gc-iconbtn is-danger" onClick={() => del(c)}>{Ic.trash}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}

      <button className="gc-fab" onClick={() => { setEditing(null); setModal(true); }} aria-label="เพิ่มวิชา">
        {Ic.plus}
      </button>

      {modal && (
        <CourseForm
          initial={editing}
          defaultYear={yearFilter !== "all" ? yearFilter : 1}
          defaultTerm={yearFilter !== "all" && termFilter !== "all" ? termFilter : "1"}
          existingCodes={courses.filter((c) => c.id !== editing?.id).map((c) => c.code.toUpperCase())}
          onSave={save}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  );
}

function CourseForm({ initial, defaultYear = 1, defaultTerm = "1", existingCodes, onSave, onClose }) {
  const [f, setF] = useState(
    initial || { code: "", name: "", credits: 3, grade: "A", categoryId: "3.1", year: defaultYear, term: defaultTerm }
  );
  const [err, setErr] = useState({});
  const dup = f.code && existingCodes.includes(f.code.trim().toUpperCase());

  const submit = () => {
    const e = {};
    if (!f.code.trim()) e.code = "กรอกรหัสวิชา";
    if (!f.name.trim()) e.name = "กรอกชื่อวิชา";
    if (!f.credits || f.credits <= 0) e.credits = "> 0";
    setErr(e);
    if (Object.keys(e).length) return;
    onSave({ ...f, code: f.code.trim().toUpperCase(), name: f.name.trim(), credits: Number(f.credits) });
  };

  return (
    <div className="gc-sheet-wrap" onClick={onClose}>
      <div className="gc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="gc-sheet-head">
          <h2 className="gc-sheet-title">{initial ? "แก้ไขวิชา" : "เพิ่มวิชาใหม่"}</h2>
          <button className="gc-iconbtn" onClick={onClose}>{Ic.x}</button>
        </div>

        <div className="gc-form">
          <div className="gc-grid3">
            <Field label="รหัสวิชา" error={err.code} className="col1">
              <input className="gc-input gc-num" placeholder="941-1106" value={f.code}
                inputMode="numeric"
                onChange={(e) => setF({ ...f, code: formatCourseCode(e.target.value) })} />
            </Field>
            <Field label="ชื่อวิชา" error={err.name} className="col2">
              <input className="gc-input" placeholder="Design Principles" value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })} />
            </Field>
          </div>
          {dup && <p className="gc-inline-warn">{Ic.warn} รหัสนี้มีอยู่แล้ว — จะถูกนับเป็น "เรียนซ้ำ" และตัดสิทธิ์เกียรตินิยม</p>}

          <div className="gc-grid2">
            <Field label="หน่วยกิต" error={err.credits}>
              <input className="gc-input gc-num" type="number" min="1" max="12" value={f.credits}
                onChange={(e) => setF({ ...f, credits: parseInt(e.target.value) || 0 })} />
            </Field>
            <Field label="เกรด">
              <select className="gc-input gc-num" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })}>
                {GRADE_ORDER.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>

          <Field label="หมวดวิชา">
            <select className="gc-input" value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
              {CURRICULUM.map((cat) =>
                cat.subcategories ? (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.subcategories.map((s) => <option key={s.id} value={s.id}>{s.id} {s.name}</option>)}
                  </optgroup>
                ) : (
                  <option key={cat.id} value={cat.id}>{cat.id} {cat.name}</option>
                )
              )}
            </select>
          </Field>

          <div className="gc-grid2">
            <Field label="ปีการศึกษา">
              <select className="gc-input gc-num" value={f.year} onChange={(e) => setF({ ...f, year: parseInt(e.target.value) })}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((y) => <option key={y} value={y}>ปีที่ {y}</option>)}
              </select>
            </Field>
            <Field label="ภาคเรียน">
              <select className="gc-input" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })}>
                <option value="1">เทอม 1</option>
                <option value="2">เทอม 2</option>
                <option value="Summer">ฤดูร้อน</option>
              </select>
            </Field>
          </div>

          <button className="gc-btn gc-btn-primary gc-btn-lg" onClick={submit}>
            {initial ? "บันทึกการแก้ไข" : "เพิ่มวิชา"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STATS
   ============================================================ */
function Stats({ courses }) {
  const terms = useMemo(() => groupByTerm(courses), [courses]);

  const series = useMemo(() => {
    let cumC = 0, cumP = 0;
    return terms.map((t) => {
      const m = calcMetrics(t.courses);
      cumC += m.gpaCredits; cumP += m.points;
      return {
        label: `${t.year}/${t.term === "Summer" ? "S" : t.term}`,
        term: m.gpa,
        cum: cumC > 0 ? cumP / cumC : 0,
      };
    });
  }, [terms]);

  return (
    <div className="gc-view">
      <header className="gc-head">
        <p className="gc-eyebrow">แนวโน้มผลการเรียน</p>
        <h1 className="gc-title">สถิติ</h1>
      </header>

      <Card>
        <div className="gc-row-between gc-mb">
          <p className="gc-card-title">GPA แต่ละเทอม</p>
          <div className="gc-legend">
            <span className="lg lg-term">เทอม</span>
            <span className="lg lg-cum">สะสม</span>
          </div>
        </div>
        {series.length < 2 ? (
          <div className="gc-chart-empty">ต้องมีข้อมูลอย่างน้อย 2 เทอมจึงจะเห็นแนวโน้ม</div>
        ) : (
          <LineChart data={series} />
        )}
      </Card>

      {/* subgroup checklist */}
      <Card>
        <p className="gc-card-title gc-mb">ตรวจสอบขั้นต่ำแต่ละกลุ่มย่อย</p>
        {CURRICULUM.map((cat) => {
          const cc = courses.filter((c) => c.categoryId === cat.id || c.categoryId.startsWith(cat.id + "."));
          const e = cc.reduce((s, c) => (c.grade !== "F" && c.grade !== "W" && c.grade !== "U" ? s + c.credits : s), 0);
          const done = e >= cat.required;
          return (
            <div key={cat.id} className="gc-sub-block">
              <div className="gc-sub-major">
                <span>{cat.id}. {cat.name}</span>
                <span className={`gc-num ${done ? "c-ok" : "c-warn"}`}>{e}/{cat.required} {done ? Ic.check : Ic.warn}</span>
              </div>
              {cat.subcategories?.map((s) => {
                const sc = courses.filter((c) => c.categoryId === s.id);
                const se = sc.reduce((a, c) => (c.grade !== "F" && c.grade !== "W" && c.grade !== "U" ? a + c.credits : a), 0);
                const sd = se >= s.required;
                return (
                  <div key={s.id} className="gc-sub-row">
                    <span className="gc-sub-name">{s.id} {s.name}</span>
                    <span className={`gc-num gc-sub-val ${sd ? "c-ok" : "c-warn"}`}>{se}/{s.required} {sd ? "✓" : "⚠"}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function LineChart({ data }) {
  const W = 320, H = 190, padL = 26, padR = 12, padT = 18, padB = 26;
  const cw = W - padL - padR, ch = H - padT - padB;
  const x = (i) => padL + (data.length === 1 ? cw / 2 : (i * cw) / (data.length - 1));
  const y = (v) => padT + ch - (v / 4) * ch;
  const line = (key) => data.map((d, i) => `${x(i)},${y(d[key])}`).join(" ");
  const area = `${x(0)},${y(0)} ${line("term")} ${x(data.length - 1)},${y(0)}`;

  return (
    <div className="gc-chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gcArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} className="gc-grid-line" />
            <text x={padL - 6} y={y(v) + 3} className="gc-axis-y">{v}</text>
          </g>
        ))}
        <polygon points={area} fill="url(#gcArea)" />
        <polyline points={line("cum")} className="gc-line-cum" />
        <polyline points={line("term")} className="gc-line-term" />
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.term)} r="4" className="gc-dot" />
            <text x={x(i)} y={y(d.term) - 9} className="gc-dot-label gc-num">{round2(d.term)}</text>
            <text x={x(i)} y={H - 8} className="gc-axis-x">{d.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* แนวโน้มสายอาชีพ — heuristic จากรายวิชาจริง (โชว์ในแท็บภาพรวม) */
function CareerTrend({ courses }) {
  const { top, hasEnough } = useMemo(() => analyzeCareer(courses), [courses]);

  if (!hasEnough) {
    return (
      <div className="gc-chart-empty">
        ยังมีข้อมูลไม่พอที่จะประเมินแนวโน้มสายอาชีพ · ลองเพิ่มวิชาเฉพาะทางให้มากขึ้น (อย่างน้อย 3 วิชาต่อสาย)
      </div>
    );
  }

  return (
    <div>
      <div className="gc-tracklist">
        {top.map((t, i) => (
          <div key={t.id} className="gc-track">
            <div className="gc-track-head">
              <span className="gc-track-rank gc-num">{i + 1}</span>
              <span className="gc-track-name">{t.name}</span>
              <span className="gc-track-gpa">
                <b className="gc-num">{t.gpaCredits > 0 ? round2(t.gpa) : "—"}</b>
                <span>GPA เฉลี่ย</span>
              </span>
            </div>
            <p className="gc-track-evidence">
              <b>{t.count} วิชา:</b>{" "}
              {t.courses.slice(0, 5).map((c) => c.code).join(" · ")}
              {t.courses.length > 5 ? ` +${t.courses.length - 5}` : ""}
            </p>
            <p className="gc-track-advice">{t.advice}</p>
          </div>
        ))}
      </div>
      <div className="gc-disclaimer" style={{ marginTop: 12 }}>
        {Ic.warn}
        <span>ประเมินจากเกรดวิชาที่ลงเรียนเท่านั้น เป็นแนวทางเบื้องต้น ไม่ใช่การประเมินทางจิตวิทยาอาชีพ · ควรปรึกษาอาจารย์แนะแนวหรือผู้เชี่ยวชาญเพิ่มเติม</span>
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS
   ============================================================ */
function Settings({ theme, setTheme, accent, setAccent, profile, setProfile, setCourses, showToast, askConfirm, count }) {
  return (
    <div className="gc-view">
      <header className="gc-head">
        <p className="gc-eyebrow">ปรับแต่งการแสดงผลและข้อมูล</p>
        <h1 className="gc-title">ตั้งค่า</h1>
      </header>

      {/* ข้อมูลนักศึกษา */}
      <Card>
        <p className="gc-card-title gc-mb">ข้อมูลนักศึกษา</p>
        <div className="gc-form">
          <label className="gc-field">
            <span className="gc-field-label">ชื่อ - นามสกุล</span>
            <input className="gc-input" placeholder="เช่น รชต ใจดี" value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
          </label>
          <label className="gc-field">
            <span className="gc-field-label">รหัสนักศึกษา</span>
            <input className="gc-input gc-num" placeholder="เช่น 6512345678" value={profile.sid}
              onChange={(e) => setProfile({ ...profile, sid: e.target.value })} />
          </label>
        </div>
      </Card>

      <Card>
        <div className="gc-row-between">
          <div>
            <p className="gc-card-title">โหมดมืด</p>
            <p className="gc-muted-sm">{theme === "dark" ? "กำลังใช้โทนมืด" : "กำลังใช้โทนสว่าง"}</p>
          </div>
          <button
            className={`gc-switch ${theme === "dark" ? "on" : ""}`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="สลับโหมดมืด"
          >
            <span className="gc-switch-knob" />
          </button>
        </div>
      </Card>

      <Card>
        <p className="gc-card-title gc-mb">สีธีมหลัก</p>
        <div className="gc-swatches">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              className={`gc-swatch ${accent === a.color ? "on" : ""}`}
              style={{ background: a.color }}
              onClick={() => setAccent(a.color)}
              aria-label={a.name}
            >
              {accent === a.color && Ic.check}
            </button>
          ))}
        </div>
      </Card>

      <Card danger>
        <p className="gc-card-title c-danger gc-mb">จัดการข้อมูล</p>
        <div className="gc-btn-stack">
          <button className="gc-btn gc-btn-outline" onClick={() => {
            askConfirm({
              title: "โหลดข้อมูลตัวอย่าง?", body: "ข้อมูลตัวอย่าง 4 เทอมจะแทนที่ข้อมูลปัจจุบัน",
              okLabel: "โหลด", onOk: () => { setCourses(MOCK); showToast("โหลดข้อมูลตัวอย่างแล้ว"); },
            });
          }}>โหลดข้อมูลตัวอย่าง</button>
          <button className="gc-btn gc-btn-danger" onClick={() => {
            askConfirm({
              title: "ล้างข้อมูลทั้งหมด?", body: `จะลบวิชาทั้งหมด ${count} รายการอย่างถาวร`,
              okLabel: "ล้างทั้งหมด", danger: true, onOk: () => { setCourses([]); showToast("ล้างข้อมูลแล้ว"); },
            });
          }}>ล้างข้อมูลทั้งหมด</button>
        </div>
      </Card>

      <p className="gc-foot">คำนวณตามโครงสร้างหลักสูตร Digital Design 133 หน่วยกิต</p>
    </div>
  );
}

/* ============================================================
   SHARED UI
   ============================================================ */
function Card({ children, pad = "md", danger }) {
  return <div className={`gc-card pad-${pad} ${danger ? "is-danger" : ""}`}>{children}</div>;
}
function Stat({ label, value, sub }) {
  return (
    <div className="gc-statbox">
      <div className="gc-stat-val gc-num">{value}{sub && <span className="gc-stat-sub">{sub}</span>}</div>
      <div className="gc-stat-label">{label}</div>
    </div>
  );
}
function Bar({ value, tone = "primary", thin }) {
  return (
    <div className={`gc-bar ${thin ? "thin" : ""}`}>
      <div className={`gc-bar-fill tone-${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}
function Field({ label, error, children, className = "" }) {
  return (
    <label className={`gc-field ${className}`}>
      <span className="gc-field-label">{label}{error && <em className="gc-field-err">{error}</em>}</span>
      {children}
    </label>
  );
}
function EmptyState({ title, body, action, onAction }) {
  return (
    <div className="gc-empty">
      <div className="gc-empty-ic">{Ic.book}</div>
      <p className="gc-empty-title">{title}</p>
      <p className="gc-empty-body">{body}</p>
      {action && <button className="gc-btn gc-btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}
function ConfirmDialog({ title, body, okLabel = "ตกลง", danger, onOk, onCancel }) {
  return (
    <div className="gc-sheet-wrap center" onClick={onCancel}>
      <div className="gc-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="gc-dialog-title">{title}</h3>
        {body && <p className="gc-dialog-body">{body}</p>}
        <div className="gc-dialog-actions">
          <button className="gc-btn gc-btn-outline" onClick={onCancel}>ยกเลิก</button>
          <button className={`gc-btn ${danger ? "gc-btn-danger" : "gc-btn-primary"}`} onClick={onOk}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}

function catShort(id) {
  const found = SELECTABLE.find((s) => s.id === id);
  return found ? found.name.replace("กลุ่มวิชา", "").replace("หมวดวิชา", "") : id;
}

/* ---------- Icons ---------- */
const Ic = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>,
  chart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>,
  cross: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
  crown: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8z" /></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" /></svg>,
};

/* ============================================================
   CSS (Warm / Organic Modern — SubTracker system)
   ============================================================ */
const CSS = `
/* ---- Global reset: กัน input/element ล้นกรอบ (border+padding ต้องรวมในความกว้าง) ---- */
*,*::before,*::after{box-sizing:border-box;}
.gc-root{
  --bg:#E4DED0; --surface:#F7F4ED; --surface-2:#F0EEE6;
  --ink:#2C261E; --line:#2C261E; --line-soft:rgba(44,38,30,.14);
  --muted:rgba(44,38,30,.60); --danger:#B33A3A; --warning:#C0862B;
  --on-primary:#F7F4ED;
  min-height:100%; background:var(--bg); color:var(--ink);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans Thai",sans-serif;
  -webkit-font-smoothing:antialiased;
}
.gc-root[data-theme="dark"]{
  --bg:#211D17; --surface:#2C271F; --surface-2:#38322A;
  --ink:#F2ECDD; --line:#F2ECDD; --line-soft:rgba(242,236,221,.16);
  --muted:rgba(242,236,221,.60); --danger:#E06A6A; --warning:#E0A64B; --on-primary:#FDFBF6;
}
.gc-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
.c-ok{color:var(--primary);} .c-warn{color:var(--warning);} .c-danger{color:var(--danger);}

.gc-frame{max-width:440px;margin:0 auto;min-height:100%;position:relative;padding:0 16px 120px;}
.gc-main{padding-top:24px;}
.gc-view{display:flex;flex-direction:column;gap:18px;animation:gcFade .32s ease;}

.gc-head{margin-bottom:2px;}
.gc-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:4px;}
.gc-title{font-size:26px;font-weight:800;letter-spacing:-.01em;line-height:1.1;}
.gc-h2{font-size:17px;font-weight:800;}
.gc-muted-sm{font-size:12px;color:var(--muted);}
.gc-row-between{display:flex;justify-content:space-between;align-items:center;gap:12px;}
.gc-mb{margin-bottom:14px;}
.gc-section-head{margin-top:6px;}
.gc-link{background:none;border:none;color:var(--primary);font-weight:700;font-size:13px;cursor:pointer;padding:0;}
.gc-center-link{display:block;margin:2px auto 0;text-align:center;}

/* Academic standing chip */
.gc-standing{display:inline-flex;align-items:center;gap:5px;padding:7px 13px;border-radius:999px;
  font-size:13px;font-weight:800;white-space:nowrap;flex:none;}
.gc-standing svg{width:14px;height:14px;}
.gc-standing.tone-ok{background:var(--primary);color:var(--on-primary);}
.gc-standing.tone-warn{background:var(--warning);color:#fff;}
.gc-standing.tone-danger{background:var(--danger);color:#fff;}
.gc-standing.tone-neutral{background:var(--surface-2);color:var(--muted);border:2px solid var(--line-soft);}

/* Category tick / done */
.gc-cat-tick{display:inline-flex;width:18px;height:18px;border-radius:999px;background:var(--primary);
  color:#fff;align-items:center;justify-content:center;margin-right:6px;vertical-align:-4px;}
.gc-cat-tick svg{width:11px;height:11px;}
.gc-cat-done{font-size:12px;font-weight:800;color:var(--primary);}

/* Card */
.gc-card{background:var(--surface);border:2px solid var(--line);border-radius:24px;
  box-shadow:2px 4px 0 rgba(0,0,0,.05);}
.gc-root[data-theme="dark"] .gc-card{box-shadow:2px 4px 0 rgba(0,0,0,.28);}
.pad-md{padding:20px;} .pad-sm{padding:14px 16px;}
.gc-card.is-danger{border-color:var(--danger);}
.gc-card-title{font-size:15px;font-weight:800;}

/* Hero */
.gc-hero{position:relative;overflow:hidden;background:var(--primary);color:var(--on-primary);
  border-radius:28px;padding:26px 24px 22px;text-align:center;}
.gc-hero-bg{position:absolute;inset:0;pointer-events:none;opacity:.16;
  background:radial-gradient(120% 90% at 15% 130%,#fff 0%,transparent 55%);}
.gc-hero-cap{position:relative;font-size:13px;font-weight:600;opacity:.85;margin-bottom:2px;}
.gc-hero-gpa{position:relative;font-size:64px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-bottom:12px;}
.gc-badge{position:relative;display:inline-flex;align-items:center;gap:6px;
  padding:6px 14px;border-radius:999px;font-size:13px;font-weight:700;
  background:rgba(255,255,255,.2);backdrop-filter:blur(6px);}
.gc-badge svg{width:15px;height:15px;}
.gc-badge.is-warn{background:rgba(0,0,0,.18);}
.gc-hero-hint{position:relative;margin-top:10px;font-size:12px;opacity:.85;}

/* Quick stats */
.gc-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.gc-statbox{background:var(--surface);border:2px solid var(--line);border-radius:18px;padding:12px 10px;text-align:center;}
.gc-stat-val{font-size:20px;font-weight:800;line-height:1;}
.gc-stat-sub{font-size:11px;font-weight:600;color:var(--muted);margin-left:2px;}
.gc-stat-label{font-size:10.5px;color:var(--muted);margin-top:5px;font-weight:600;}

/* Bar */
.gc-bignum{font-size:20px;font-weight:800;} .gc-slash{font-size:13px;color:var(--muted);font-weight:600;}
.gc-bar{margin-top:12px;height:12px;background:var(--line-soft);border-radius:999px;overflow:hidden;}
.gc-bar.thin{height:8px;margin-top:8px;}
.gc-bar-fill{height:100%;border-radius:999px;transition:width .7s cubic-bezier(.2,.8,.2,1);}
.gc-bar-fill.tone-primary{background:var(--primary);}
.gc-bar-fill.tone-ok{background:var(--primary);}
.gc-bar-fill.tone-warn{background:var(--warning);}

/* Checklist */
.gc-checklist{list-style:none;display:flex;flex-direction:column;gap:2px;margin-bottom:14px;}
.gc-checklist li{display:flex;align-items:center;gap:10px;padding:9px 0;font-size:14px;font-weight:600;border-bottom:1px solid var(--line-soft);}
.gc-checklist li:last-child{border-bottom:none;}
.gc-check-ic{width:22px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:none;}
.gc-check-ic svg{width:13px;height:13px;color:#fff;}
.gc-checklist li.ok .gc-check-ic{background:var(--primary);}
.gc-checklist li.bad .gc-check-ic{background:var(--danger);}
.gc-check-state{margin-left:auto;font-size:12px;font-weight:700;color:var(--muted);}
.gc-checklist li.bad .gc-check-state{color:var(--danger);}

.gc-threshold{display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line-soft);}
.gc-thr{display:flex;align-items:center;gap:10px;font-size:13px;}
.gc-thr-dot{width:9px;height:9px;border-radius:999px;background:var(--line-soft);flex:none;}
.gc-thr.reached .gc-thr-dot{background:var(--primary);}
.gc-thr-label{font-weight:700;}
.gc-thr-need{margin-left:auto;color:var(--muted);font-weight:600;}
.gc-thr-mark{width:18px;text-align:center;color:var(--primary);}
.gc-thr-mark svg{width:13px;height:13px;}

/* Category grid */
.gc-catgrid{display:flex;flex-direction:column;gap:10px;}
.gc-cat-name{font-size:13.5px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:8px;}
.gc-cat-num{font-size:13px;font-weight:600;white-space:nowrap;} .gc-cat-num b{font-weight:800;}

/* Search + chips */
.gc-search{display:flex;align-items:center;gap:8px;background:var(--surface);border:2px solid var(--line);border-radius:16px;padding:0 12px;}
.gc-search-ic svg{width:18px;height:18px;color:var(--muted);display:block;}
.gc-search-input{flex:1;border:none;background:none;outline:none;color:var(--ink);font-size:15px;padding:12px 0;font-family:inherit;}
.gc-search-clear{background:none;border:none;cursor:pointer;color:var(--muted);padding:4px;}
.gc-search-clear svg{width:16px;height:16px;}
.gc-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;}
.gc-chips::-webkit-scrollbar{display:none;}
.gc-chip{white-space:nowrap;border:2px solid var(--line);background:transparent;color:var(--ink);
  border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;transition:.15s;}
.gc-chip.is-on{background:var(--ink);color:var(--surface);}

/* Year tabs (ตัวเลือกหลัก — เด่นกว่าชิปหมวด) */
.gc-years{display:flex;gap:8px;overflow-x:auto;padding:4px;background:var(--surface-2);
  border:2px solid var(--line);border-radius:16px;scrollbar-width:none;}
.gc-years::-webkit-scrollbar{display:none;}
.gc-yeartab{flex:1;min-width:64px;white-space:nowrap;border:none;background:transparent;color:var(--muted);
  border-radius:11px;padding:9px 12px;font-size:14px;font-weight:800;cursor:pointer;transition:.15s;}
.gc-yeartab:hover{color:var(--ink);}
.gc-yeartab.is-on{background:var(--primary);color:var(--on-primary);box-shadow:0 2px 6px rgba(0,0,0,.12);}

/* Term tabs (ชั้นย่อยใต้ปี — เบากว่าแท็บปี) */
.gc-terms{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;}
.gc-terms::-webkit-scrollbar{display:none;}
.gc-termtab{white-space:nowrap;border:2px solid var(--line-soft);background:transparent;color:var(--muted);
  border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:700;cursor:pointer;transition:.15s;}
.gc-termtab:hover{color:var(--ink);border-color:var(--line);}
.gc-termtab.is-on{background:var(--surface-2);color:var(--ink);border-color:var(--line);}

/* แถบสรุปของปีที่เลือก */
.gc-yearsum{display:flex;justify-content:space-between;align-items:center;
  font-size:12.5px;font-weight:700;color:var(--muted);padding:0 6px;margin-top:-6px;}

/* Term + course rows */
.gc-termlist{display:flex;flex-direction:column;gap:22px;}
.gc-term{display:flex;flex-direction:column;gap:10px;}
.gc-term-head{display:flex;justify-content:space-between;align-items:baseline;
  padding-bottom:6px;border-bottom:2px solid var(--line-soft);}
.gc-term-title{font-size:16px;font-weight:800;}
.gc-term-meta{font-size:12.5px;color:var(--muted);font-weight:600;}
.gc-course{display:flex;align-items:center;gap:12px;background:var(--surface);
  border:2px solid var(--line);border-radius:18px;padding:12px 14px;}
.gc-course-main{flex:1;min-width:0;}
.gc-course-top{display:flex;align-items:center;gap:8px;margin-bottom:3px;}
.gc-code{font-size:10px;font-weight:800;letter-spacing:.04em;background:var(--ink);color:var(--surface);
  padding:2px 7px;border-radius:6px;}
.gc-catpill{font-size:10px;font-weight:700;color:var(--muted);background:var(--surface-2);
  border-radius:999px;padding:2px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:96px;}
.gc-course-name{font-size:14.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.gc-course-right{display:flex;align-items:center;gap:10px;}
.gc-grade{font-size:20px;font-weight:800;width:30px;text-align:center;}
.gc-grade.is-f{color:var(--danger);}
.gc-course-actions{display:flex;flex-direction:column;gap:5px;}
.gc-iconbtn{width:30px;height:30px;border-radius:9px;border:none;background:var(--surface-2);color:var(--ink);
  display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.15s;}
.gc-iconbtn:hover{background:var(--line-soft);}
.gc-iconbtn.is-danger{color:var(--danger);}
.gc-iconbtn svg{width:15px;height:15px;}

/* FAB */
.gc-fab{position:fixed;right:calc(50% - 220px + 20px);bottom:96px;width:56px;height:56px;border-radius:999px;
  background:var(--primary);color:var(--on-primary);border:2px solid var(--line);
  box-shadow:0 8px 20px rgba(0,0,0,.2);cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:transform .15s;z-index:30;}
.gc-fab:hover{transform:scale(1.06);}
.gc-fab svg{width:24px;height:24px;}
@media(max-width:472px){.gc-fab{right:20px;}}

/* Empty */
.gc-empty{background:var(--surface);border:2px dashed var(--line-soft);border-radius:24px;
  padding:40px 24px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;}
.gc-empty-ic{width:52px;height:52px;border-radius:16px;background:var(--surface-2);
  display:flex;align-items:center;justify-content:center;margin-bottom:6px;color:var(--muted);}
.gc-empty-ic svg{width:26px;height:26px;}
.gc-empty-title{font-size:16px;font-weight:800;}
.gc-empty-body{font-size:13px;color:var(--muted);max-width:260px;line-height:1.5;}
.gc-empty .gc-btn{margin-top:10px;}

/* Sheet / modal */
.gc-sheet-wrap{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.42);
  display:flex;align-items:flex-end;justify-content:center;animation:gcFade .2s ease;}
.gc-sheet-wrap.center{align-items:center;padding:20px;}
.gc-sheet{width:100%;max-width:440px;background:var(--surface);border:2px solid var(--line);
  border-radius:28px 28px 0 0;padding:22px 20px 26px;max-height:92vh;overflow-y:auto;animation:gcUp .28s ease;}
.gc-sheet-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;}
.gc-sheet-title{font-size:19px;font-weight:800;}
.gc-form{display:flex;flex-direction:column;gap:14px;}
.gc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.gc-grid3{display:grid;grid-template-columns:1fr 2fr;gap:12px;}
.gc-field{display:flex;flex-direction:column;gap:6px;min-width:0;}
.gc-form{min-width:0;}
.gc-field-label{font-size:12px;font-weight:800;display:flex;justify-content:space-between;}
.gc-field-err{color:var(--danger);font-style:normal;font-weight:700;}
.gc-input{width:100%;background:var(--surface-2);border:2px solid var(--line);border-radius:14px;
  padding:12px 14px;color:var(--ink);font-size:15px;outline:none;font-family:inherit;transition:.15s;}
.gc-input:focus{border-color:var(--primary);}
select.gc-input{appearance:none;-webkit-appearance:none;
  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);
  background-position:calc(100% - 18px) 55%,calc(100% - 13px) 55%;background-size:5px 5px,5px 5px;background-repeat:no-repeat;padding-right:36px;}
.gc-inline-warn{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--warning);
  background:var(--surface-2);border-radius:12px;padding:8px 12px;line-height:1.4;}
.gc-inline-warn svg{width:16px;height:16px;flex:none;}

/* Buttons */
.gc-btn{border-radius:999px;font-weight:800;font-size:15px;cursor:pointer;padding:12px 22px;
  border:2px solid transparent;transition:.15s;font-family:inherit;}
.gc-btn-lg{padding:15px 22px;font-size:16px;margin-top:6px;}
.gc-btn-primary{background:var(--primary);color:var(--on-primary);}
.gc-btn-primary:hover{filter:brightness(1.05);}
.gc-btn-outline{background:transparent;color:var(--ink);border-color:var(--line);}
.gc-btn-danger{background:transparent;color:var(--danger);border-color:var(--danger);}
.gc-btn-danger:hover{background:var(--danger);color:#fff;}
/* ปุ่มเรียงแนวตั้งพร้อมระยะห่าง (กันปุ่มชนกันในการ์ดจัดการข้อมูล ฯลฯ) */
.gc-btn-stack{display:flex;flex-direction:column;gap:12px;}
.gc-btn-stack>.gc-btn{width:100%;}

/* Segmented control (สลับมุมมองในแดชบอร์ด — สไตล์เดียวกับแท็บปี) */
.gc-segment{display:flex;gap:8px;padding:4px;background:var(--surface-2);
  border:2px solid var(--line);border-radius:16px;}
.gc-segbtn{flex:1;min-width:0;white-space:nowrap;border:none;background:transparent;color:var(--muted);
  border-radius:11px;padding:9px 12px;font-size:13.5px;font-weight:800;cursor:pointer;transition:.15s;}
.gc-segbtn:hover{color:var(--ink);}
.gc-segbtn.is-on{background:var(--primary);color:var(--on-primary);box-shadow:0 2px 6px rgba(0,0,0,.12);}

/* Career-trend cards */
.gc-tracklist{display:flex;flex-direction:column;gap:12px;}
.gc-track{border:2px solid var(--line);border-radius:18px;padding:14px 16px;background:var(--surface-2);min-width:0;}
.gc-track-head{display:flex;align-items:center;gap:10px;}
.gc-track-rank{width:24px;height:24px;flex:none;border-radius:999px;background:var(--primary);color:var(--on-primary);
  font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.gc-track-name{font-size:14.5px;font-weight:800;flex:1;min-width:0;line-height:1.25;}
.gc-track-gpa{flex:none;text-align:right;}
.gc-track-gpa b{font-size:17px;font-weight:800;}
.gc-track-gpa span{display:block;font-size:10px;font-weight:700;color:var(--muted);}
.gc-track-evidence{font-size:11.5px;color:var(--muted);margin-top:9px;line-height:1.55;}
.gc-track-evidence b{color:var(--ink);font-weight:700;}
.gc-track-advice{font-size:12.5px;font-weight:600;margin-top:9px;line-height:1.5;
  padding-top:9px;border-top:1px solid var(--line-soft);}
.gc-disclaimer{display:flex;gap:7px;align-items:flex-start;font-size:11px;color:var(--muted);
  line-height:1.5;margin-top:4px;background:var(--surface-2);border-radius:12px;padding:9px 12px;}
.gc-disclaimer svg{width:14px;height:14px;flex:none;margin-top:1px;color:var(--warning);}

/* Dialog */
.gc-dialog{width:100%;max-width:340px;background:var(--surface);border:2px solid var(--line);
  border-radius:24px;padding:24px 22px;animation:gcUp .24s ease;}
.gc-dialog-title{font-size:18px;font-weight:800;margin-bottom:6px;}
.gc-dialog-body{font-size:13.5px;color:var(--muted);line-height:1.5;margin-bottom:20px;}
.gc-dialog-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.gc-dialog-actions .gc-btn{padding:11px;font-size:14px;}

/* Switch + swatches */
.gc-switch{width:52px;height:30px;border-radius:999px;background:var(--line-soft);border:2px solid var(--line);
  position:relative;cursor:pointer;transition:.2s;flex:none;}
.gc-switch.on{background:var(--primary);}
.gc-switch-knob{position:absolute;top:2px;left:2px;width:22px;height:22px;border-radius:999px;background:var(--ink);transition:.2s;}
.gc-switch.on .gc-switch-knob{left:24px;background:#fff;}
.gc-swatches{display:flex;gap:12px;flex-wrap:wrap;}
.gc-swatch{width:44px;height:44px;border-radius:14px;border:3px solid transparent;cursor:pointer;
  display:flex;align-items:center;justify-content:center;color:#fff;transition:.15s;box-shadow:inset 0 0 0 2px rgba(0,0,0,.1);}
.gc-swatch.on{border-color:var(--ink);}
.gc-swatch svg{width:18px;height:18px;}
.gc-foot{text-align:center;font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5;}

/* Chart */
.gc-chart-empty{height:170px;display:flex;align-items:center;justify-content:center;text-align:center;
  font-size:13px;color:var(--muted);border:2px dashed var(--line-soft);border-radius:16px;padding:16px;}
.gc-legend{display:flex;gap:12px;font-size:11px;font-weight:700;}
.gc-legend .lg{display:flex;align-items:center;gap:5px;color:var(--muted);}
.gc-legend .lg::before{content:"";width:14px;height:3px;border-radius:2px;}
.gc-legend .lg-term::before{background:var(--primary);}
.gc-legend .lg-cum::before{background:var(--muted);}
.gc-chart svg{display:block;}
.gc-grid-line{stroke:var(--line-soft);stroke-width:1;stroke-dasharray:3 4;}
.gc-axis-y{fill:var(--muted);font-size:9px;text-anchor:end;}
.gc-axis-x{fill:var(--muted);font-size:9px;text-anchor:middle;}
.gc-line-term{fill:none;stroke:var(--primary);stroke-width:3;stroke-linecap:round;stroke-linejoin:round;}
.gc-line-cum{fill:none;stroke:var(--muted);stroke-width:2;stroke-dasharray:4 4;stroke-linecap:round;}
.gc-dot{fill:var(--surface);stroke:var(--primary);stroke-width:2;}
.gc-dot-label{fill:var(--ink);font-size:9px;font-weight:800;text-anchor:middle;}

/* Sub checklist */
.gc-sub-block{padding:12px 0;border-bottom:1px solid var(--line-soft);}
.gc-sub-block:last-child{border-bottom:none;padding-bottom:0;}
.gc-sub-major{display:flex;justify-content:space-between;font-size:13.5px;font-weight:800;margin-bottom:6px;}
.gc-sub-major svg{width:13px;height:13px;vertical-align:-2px;}
.gc-sub-row{display:flex;justify-content:space-between;font-size:12.5px;padding:4px 0 4px 12px;color:var(--muted);}
.gc-sub-name{font-weight:600;}
.gc-sub-val{font-weight:700;}

/* Nav */
.gc-nav{position:fixed;bottom:20px;left:0;right:0;margin:0 auto;max-width:396px;width:calc(100% - 32px);
  background:var(--surface);border:2px solid var(--line);border-radius:999px;
  display:flex;justify-content:space-around;padding:8px 6px;
  box-shadow:0 10px 28px rgba(0,0,0,.14);z-index:40;}
.gc-navbtn{flex:1;background:none;border:none;cursor:pointer;color:var(--muted);
  display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 2px;border-radius:16px;transition:.15s;}
.gc-navbtn.is-active{color:var(--primary);}
.gc-navicon svg{width:22px;height:22px;transition:transform .2s;}
.gc-navbtn.is-active .gc-navicon svg{transform:translateY(-1px) scale(1.08);}
.gc-navlabel{font-size:10px;font-weight:800;}

/* Toast */
.gc-toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%);z-index:60;
  background:var(--ink);color:var(--bg);font-size:13.5px;font-weight:700;
  padding:11px 20px;border-radius:999px;box-shadow:0 8px 20px rgba(0,0,0,.25);animation:gcUp .24s ease;white-space:nowrap;}

/* Shared-view banner */
.gc-sharednote{display:flex;align-items:center;gap:8px;margin-top:16px;
  background:var(--surface-2);border:2px solid var(--line);border-radius:14px;
  padding:9px 14px;font-size:12px;font-weight:700;color:var(--muted);}
.gc-sharednote svg{width:15px;height:15px;flex:none;color:var(--primary);}

/* Share card + modal */
.gc-share-ic{color:var(--primary);}
.gc-share-ic svg{width:22px;height:22px;}
.gc-btn-block{width:100%;}
.gc-share-hint{margin-top:10px;line-height:1.5;}
.gc-share{max-width:380px;}
.gc-share-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.gc-share-badge{width:40px;height:40px;border-radius:12px;background:var(--surface-2);
  display:flex;align-items:center;justify-content:center;color:var(--primary);}
.gc-share-badge svg{width:20px;height:20px;}
.gc-share-box{margin:14px 0 4px;}
.gc-share-input{width:100%;background:var(--surface-2);border:2px solid var(--line);border-radius:14px;
  padding:12px 14px;color:var(--ink);font-size:12px;outline:none;font-family:inherit;
  text-overflow:ellipsis;}
.gc-share-input:focus{border-color:var(--primary);}
.gc-btn.is-done{background:var(--ink);}
.gc-btn.is-done svg{width:15px;height:15px;vertical-align:-2px;margin-right:4px;}

@keyframes gcFade{from{opacity:0}to{opacity:1}}
@keyframes gcUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.gc-sheet-wrap.center .gc-toast{}
@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
`;
