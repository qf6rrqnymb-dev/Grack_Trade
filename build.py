#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — สร้าง index.html (ไฟล์เดียว เปิดได้เลย) จากซอร์ส GradeCalculatorApp.jsx

ทำไมต้องมีสคริปต์นี้:
  - อาจารย์กำหนดว่า index ต้องเป็น HTML และเครื่องไม่มี Node/npm
  - เราจึงฝัง React + Babel + Supabase จาก CDN แล้ววาง JSX ไว้ในไฟล์เดียว
  - แก้โค้ดที่ GradeCalculatorApp.jsx (อ่านง่าย) แล้วรัน:  python3 build.py
  - จะได้ index.html ใหม่ที่ deploy ขึ้น GitHub Pages ได้ทันที

หมายเหตุ: จะแก้ตรง index.html ก็ได้เช่นกัน แต่แนะนำให้แก้ที่ .jsx เพื่อความเป็นระเบียบ
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "GradeCalculatorApp.jsx")
OUT = os.path.join(HERE, "index.html")

# เวอร์ชัน CDN แบบ pin ไว้ (เสถียร ไม่เปลี่ยนเองภายหลัง)
REACT = "https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js"
REACT_DOM = "https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js"
BABEL = "https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js"
SUPABASE = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"


def build():
    with open(SRC, "r", encoding="utf-8") as f:
        code = f.read()

    # 1) ตัดบรรทัด import React ... (โหลด React จาก CDN แทน)
    code = re.sub(r'^\s*import\s+React[^\n]*\n', '', code, count=1, flags=re.MULTILINE)
    # 2) export default function App() -> function App()
    code = code.replace("export default function App()", "function App()")

    if "function App()" not in code:
        sys.exit("ERROR: หา component App ไม่เจอในซอร์ส")
    if "</script" in code.lower():
        sys.exit("ERROR: ซอร์สมี '</script' ซึ่งจะทำให้ inline script พัง")

    html = TEMPLATE.replace("/*__APP__*/", code)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("✓ สร้าง index.html สำเร็จ (%d bytes)" % os.path.getsize(OUT))


TEMPLATE = """<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#E4DED0" />
<title>คำนวณเกรด · Digital Design</title>
<style>
  html,body{margin:0;padding:0;min-height:100%;background:#E4DED0;}
  #root{min-height:100vh;}
  *{-webkit-tap-highlight-color:transparent;}
  .gc-boot{min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans Thai",sans-serif;
    color:rgba(44,38,30,.6);font-size:14px;font-weight:700;}
</style>
</head>
<body>
<div id="root"><div class="gc-boot">กำลังโหลด…</div></div>

<!-- React + Babel + Supabase จาก CDN (ไม่ต้องมี build tool / Node) -->
<script src="__REACT__" crossorigin></script>
<script src="__REACT_DOM__" crossorigin></script>
<script src="__SUPABASE__"></script>
<script src="__BABEL__"></script>

<script type="text/babel" data-presets="react">
const { useState, useEffect, useMemo, useCallback } = React;

/*__APP__*/

const _root = ReactDOM.createRoot(document.getElementById("root"));
_root.render(<App />);
</script>
</body>
</html>
"""

TEMPLATE = (TEMPLATE
            .replace("__REACT__", REACT)
            .replace("__REACT_DOM__", REACT_DOM)
            .replace("__SUPABASE__", SUPABASE)
            .replace("__BABEL__", BABEL))

if __name__ == "__main__":
    build()
