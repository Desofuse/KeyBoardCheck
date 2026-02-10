// =========================
// DOM
// =========================
const stage = document.getElementById("stage");
const keyboard = document.getElementById("keyboard");
const kbViewport = document.getElementById("kbViewport");
const kbScaler = document.getElementById("kbScaler");

const captureBtn = document.getElementById("captureBtn");
const helpBtn = document.getElementById("helpBtn");
const modeBtn = document.getElementById("modeBtn");
const clearLatchBtn = document.getElementById("clearLatchBtn");
const themeBtn = document.getElementById("themeBtn");

const modalRoot = document.getElementById("modalRoot");
const modalBackdrop = document.getElementById("modalBackdrop");
const helpCloseBtn = document.getElementById("helpCloseBtn");
const helpCloseX = document.getElementById("helpCloseX");

const hudKey = document.getElementById("hudKey");
const hudMeta = document.getElementById("hudMeta");

const chipKey = document.getElementById("chipKey");
const chipCode = document.getElementById("chipCode");
const chipKeyCode = document.getElementById("chipKeyCode");
const chipDown = document.getElementById("chipDown");
const chipMax = document.getElementById("chipMax");

// =========================
// STATE (with persistence)
// =========================
function readBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === "1";
}
function writeBool(key, val) {
  localStorage.setItem(key, val ? "1" : "0");
}

let CAPTURE = readBool("kb_capture", true);

// mode: "live" | "latch"
let MODE = localStorage.getItem("kb_mode") || "live";

// theme: "night" | "day"
let THEME = localStorage.getItem("kb_theme") || "night";

const down = new Set();          // currently held
const latched = new Set();       // persistent highlight in latch mode
let maxDown = 0;

// =========================
// Helpers
// =========================
function setTheme(theme) {
  THEME = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("kb_theme", theme);
  themeBtn.textContent = `Theme: ${theme === "night" ? "Night" : "Day"}`;
}

function setMode(mode) {
  MODE = mode;
  localStorage.setItem("kb_mode", mode);

  modeBtn.textContent = `Mode: ${mode === "latch" ? "Latch" : "Live"}`;
  modeBtn.classList.toggle("pill--on", mode === "latch");

  // Когда уходим в Live — чистим запомненное, чтобы точно не "помнило"
  if (mode === "live") {
    clearLatched();
  }

  updateClearBtn();
}

function setCapture(on) {
  CAPTURE = on;
  writeBool("kb_capture", on);
  captureBtn.classList.toggle("pill--on", on);
  captureBtn.textContent = `Capture: ${on ? "ON" : "OFF"}`;
}

function updateClearBtn() {
  clearLatchBtn.style.opacity = (MODE === "latch" && latched.size > 0) ? "1" : ".65";
}

// =========================
// Layout
// =========================
function K(code, main, top = "", sizeClass = "") {
  return { type: "key", code, main, top, sizeClass };
}
function S(flex = 1) {
  return { type: "spacer", flex };
}

const LAYOUT = [
  [
    K("Escape","Esc","Escape"),
    S(0.6),
    K("F1","F1"),K("F2","F2"),K("F3","F3"),K("F4","F4"),
    S(0.35),
    K("F5","F5"),K("F6","F6"),K("F7","F7"),K("F8","F8"),
    S(0.35),
    K("F9","F9"),K("F10","F10"),K("F11","F11"),K("F12","F12"),
    S(0.35),
    K("PrintScreen","Prt","Print"),K("ScrollLock","Scr","Scroll"),K("Pause","Pau","Pause"),
    S(0.35),
    K("NumLock","Num","NumL"),
    K("NumpadDivide","/",""),K("NumpadMultiply","*",""),K("NumpadSubtract","-","")
  ],
  [
    K("Backquote","`","~"),
    K("Digit1","1","!"),K("Digit2","2","@"),K("Digit3","3","#"),K("Digit4","4","$"),K("Digit5","5","%"),
    K("Digit6","6","^"),K("Digit7","7","&"),K("Digit8","8","*"),K("Digit9","9","("),K("Digit0","0",")"),
    K("Minus","-","_"),K("Equal","=","+"),
    K("Backspace","Backspace","", "w2"),
    S(0.35),
    K("Insert","Ins","Insert"),K("Home","Home","Home"),K("PageUp","PgUp","PageUp"),
    S(0.35),
    K("Numpad7","7",""),K("Numpad8","8",""),K("Numpad9","9",""),
    K("NumpadAdd","+","", "h2")
  ],
  [
    K("Tab","Tab","", "w1_5"),
    K("KeyQ","Q",""),K("KeyW","W",""),K("KeyE","E",""),K("KeyR","R",""),K("KeyT","T",""),
    K("KeyY","Y",""),K("KeyU","U",""),K("KeyI","I",""),K("KeyO","O",""),K("KeyP","P",""),
    K("BracketLeft","[","{"),K("BracketRight","]","}"),
    K("Backslash","\\","|","w1_5"),
    S(0.35),
    K("Delete","Del","Delete"),K("End","End","End"),K("PageDown","PgDn","PageDown"),
    S(0.35),
    K("Numpad4","4",""),K("Numpad5","5",""),K("Numpad6","6","")
  ],
  [
    K("CapsLock","Caps","Caps","w1_75"),
    K("KeyA","A"),K("KeyS","S"),K("KeyD","D"),K("KeyF","F"),K("KeyG","G"),
    K("KeyH","H"),K("KeyJ","J"),K("KeyK","K"),K("KeyL","L"),
    K("Semicolon","; ",":"),K("Quote","' ",'"'),
    K("Enter","Enter","", "w2_25"),
    S(0.35),
    S(2.0),
    S(0.35),
    K("Numpad1","1"),K("Numpad2","2"),K("Numpad3","3"),
    K("NumpadEnter","Enter","", "h2")
  ],
  [
    K("ShiftLeft","Shift","", "w2_25"),
    K("KeyZ","Z"),K("KeyX","X"),K("KeyC","C"),K("KeyV","V"),K("KeyB","B"),K("KeyN","N"),K("KeyM","M"),
    K("Comma",",","<"),K("Period",".",">"),K("Slash","/","?"),
    K("ShiftRight","Shift","", "w2_75"),
    S(0.35),
    S(2.0),
    S(0.35),
    K("Numpad0","0","", "w2"),
    K("NumpadDecimal",".","")
  ],
  [
    K("ControlLeft","Ctrl","", "w1_5"),
    K("MetaLeft","Win","", "w1_5"),
    K("AltLeft","Alt","", "w1_5"),
    K("Space","Space","", "w6"),
    K("AltRight","Alt","", "w1_5"),
    K("MetaRight","Win","", "w1_5"),
    K("ContextMenu","Menu","", "w1_5"),
    K("ControlRight","Ctrl","", "w1_75"),
    S(0.35),
    K("ArrowLeft","◄",""),
    K("ArrowUp","▲",""),
    K("ArrowDown","▼",""),
    K("ArrowRight","►","")
  ]
];

// =========================
// Render
// =========================
function el(tag, cls) {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  return x;
}

function renderKeyboard() {
  keyboard.innerHTML = "";

  LAYOUT.forEach((row) => {
    const r = el("div", "kRow");
    row.forEach((item) => {
      if (item.type === "spacer") {
        const sp = el("div", "spacer");
        sp.style.flex = String(item.flex);
        r.appendChild(sp);
        return;
      }

      const k = el("div", "key " + (item.sizeClass || ""));
      k.dataset.code = item.code;

      const top = el("div", "kTop");
      const main = el("div", "kMain");
      const code = el("div", "kCode");

      top.textContent = item.top || "";
      main.textContent = item.main || "";
      code.textContent = item.code;

      k.appendChild(top);
      k.appendChild(main);
      k.appendChild(code);

      r.appendChild(k);
    });
    keyboard.appendChild(r);
  });

  requestAnimationFrame(fitKeyboardToViewport);
}

function byCode(code) {
  return keyboard.querySelector(`[data-code="${CSS.escape(code)}"]`);
}

// =========================
// Fit keyboard to viewport (NO SCROLL)
// =========================
function fitKeyboardToViewport() {
  const pad = 16;
  const vp = kbViewport.getBoundingClientRect();

  const availableW = vp.width - pad * 2;
  const availableH = vp.height - pad * 2;

  const kb = keyboard.getBoundingClientRect();
  const scaleW = availableW / kb.width;
  const scaleH = availableH / kb.height;

  let scale = Math.min(scaleW, scaleH);
  scale = Math.min(scale, 1.05);
  scale = Math.max(scale, 0.55);

  kbScaler.style.transform = `scale(${scale})`;

  const scaledW = kb.width * scale;
  const scaledH = kb.height * scale;

  const offsetX = (availableW - scaledW) / 2;
  const offsetY = (availableH - scaledH) / 2;

  kbScaler.style.translate = `${Math.max(0, offsetX)}px ${Math.max(0, offsetY)}px`;
}

window.addEventListener("resize", () => requestAnimationFrame(fitKeyboardToViewport));

// =========================
// Capture rules
// =========================
function shouldPrevent(e) {
  if (!CAPTURE) return false;

  const preventCodes = new Set([
    "Space",
    "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
    "PageUp","PageDown","Home","End"
  ]);

  if ((e.ctrlKey || e.metaKey) && CAPTURE) return true;
  return preventCodes.has(e.code);
}

// =========================
// Modal
// =========================
function openHelp() {
  modalRoot.classList.add("isOpen");
  modalRoot.setAttribute("aria-hidden", "false");
}
function closeHelp() {
  modalRoot.classList.remove("isOpen");
  modalRoot.setAttribute("aria-hidden", "true");
}
helpBtn.addEventListener("click", openHelp);
helpCloseBtn.addEventListener("click", closeHelp);
helpCloseX.addEventListener("click", closeHelp);
modalBackdrop.addEventListener("click", closeHelp);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modalRoot.classList.contains("isOpen")) {
    e.preventDefault();
    closeHelp();
  }
}, { passive:false });

// =========================
// Latch logic
// =========================
function toggleLatch(code) {
  const keyEl = byCode(code);
  if (!keyEl) return;

  if (latched.has(code)) {
    latched.delete(code);
    keyEl.classList.remove("latched");
  } else {
    latched.add(code);
    keyEl.classList.add("latched");
  }
  updateClearBtn();
}

function clearLatched() {
  latched.forEach((code) => {
    const keyEl = byCode(code);
    if (keyEl) keyEl.classList.remove("latched");
  });
  latched.clear();
  updateClearBtn();
}

// =========================
// HUD updates
// =========================
function toTime() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}

// =========================
// Events
// =========================
window.addEventListener("keydown", (e) => {
  if (shouldPrevent(e)) e.preventDefault();

  // в latch-режиме НЕ делаем toggle на autorepeat, иначе при удержании будет мигать
  if (MODE === "latch" && !e.repeat) {
    toggleLatch(e.code);
  }

  down.add(e.code);
  if (down.size > maxDown) maxDown = down.size;

  const keyEl = byCode(e.code);
  if (keyEl) keyEl.classList.add("pressed");

  const prettyKey = (e.key && e.key.length === 1) ? e.key.toUpperCase() : (e.key || "—");
  hudKey.textContent = prettyKey;
  hudMeta.textContent = `${toTime()} · ${e.code}${e.repeat ? " · repeat" : ""}`;

  chipKey.textContent = `event.key: ${e.key ?? "—"}`;
  chipCode.textContent = `event.code: ${e.code ?? "—"}`;
  chipKeyCode.textContent = `keyCode: ${e.keyCode ?? "—"}`;
  chipDown.textContent = `down: ${down.size}`;
  chipMax.textContent = `max: ${maxDown}`;
}, { passive:false });

window.addEventListener("keyup", (e) => {
  if (shouldPrevent(e)) e.preventDefault();

  down.delete(e.code);
  chipDown.textContent = `down: ${down.size}`;

  const keyEl = byCode(e.code);
  if (keyEl) keyEl.classList.remove("pressed");
}, { passive:false });

window.addEventListener("blur", () => {
  down.forEach(code => {
    const keyEl = byCode(code);
    if (keyEl) keyEl.classList.remove("pressed");
  });
  down.clear();
  chipDown.textContent = `down: 0`;
});

// Click latch support (приятно как продукт)
keyboard.addEventListener("click", (e) => {
  const target = e.target.closest(".key");
  if (!target) return;
  if (MODE !== "latch") return;
  const code = target.dataset.code;
  if (code) toggleLatch(code);
});

// =========================
// Buttons
// =========================
captureBtn.addEventListener("click", () => setCapture(!CAPTURE));

modeBtn.addEventListener("click", () => {
  setMode(MODE === "live" ? "latch" : "live");
});

clearLatchBtn.addEventListener("click", () => {
  if (MODE !== "latch") return;
  clearLatched();
});

themeBtn.addEventListener("click", () => {
  setTheme(THEME === "night" ? "day" : "night");
  requestAnimationFrame(fitKeyboardToViewport);
});

// Focus
document.addEventListener("click", () => stage.focus({ preventScroll:true }));

// =========================
// Init
// =========================
renderKeyboard();
setCapture(CAPTURE);
setMode(MODE);
setTheme(THEME);
updateClearBtn();
