/* Keyboard Tester — fullscreen, grid-aligned, RU/EN help, Day/Night, Live/Latch, Capture
   - подсветка по event.code (физическая клавиша)
   - режим Live: подсветка только пока держишь
   - режим Latch: запоминает нажатое и держит подсветку (повторное нажатие снимает)
   - Help автоматически RU/EN в зависимости от выбранного языка
   - серые подписи вида "KeyF/KeyH" НЕ рисуем вообще
*/

(() => {
  const STORAGE_KEY = "kb_tester_settings_v3";

  const DEFAULTS = {
    lang: "ru",        // ru | en
    os: "win",         // win | mac
    theme: "night",    // night | day
    mode: "live",      // live | latch
    capture: false
  };

  const I18N = {
    ru: {
      title: "Keyboard Tester",
      live: "Live",
      captureOn: "Capture: ON",
      captureOff: "Capture: OFF",
      modeLive: "Mode: Live",
      modeLatch: "Mode: Latch",
      clear: "Clear",
      themeNight: "Theme: Night",
      themeDay: "Theme: Day",
      fullscreen: "Fullscreen",
      help: "Help",
      helpTitle: "Как пользоваться",
      ok: "OK",
      helpLines: [
        "**Live** — подсвечивает только пока клавиша зажата.",
        "**Latch** — запоминает нажатые клавиши и держит подсветку, пока не нажмёшь **Clear** (или нажмёшь клавишу повторно).",
        "**Capture** — глушит хоткеи/скролл браузера (Ctrl/Meta + комбинации, Space, стрелки и т.п.).",
        "Подсветка завязана на **event.code** — это *физическая* клавиша.",
        "Если “не ловит” — кликни в пустое место страницы, чтобы вернуть фокус."
      ],
      hudHint: "Нажми клавишу",
      hudLiveHint: "Live: держи клавишу"
    },
    en: {
      title: "Keyboard Tester",
      live: "Live",
      captureOn: "Capture: ON",
      captureOff: "Capture: OFF",
      modeLive: "Mode: Live",
      modeLatch: "Mode: Latch",
      clear: "Clear",
      themeNight: "Theme: Night",
      themeDay: "Theme: Day",
      fullscreen: "Fullscreen",
      help: "Help",
      helpTitle: "How to use",
      ok: "OK",
      helpLines: [
        "**Live** — highlights only while the key is held down.",
        "**Latch** — remembers pressed keys and keeps them highlighted until you hit **Clear** (or press the key again).",
        "**Capture** — suppresses browser hotkeys/scroll (Ctrl/Meta combos, Space, arrows, etc.).",
        "Highlight is based on **event.code** — the *physical* key.",
        "If it doesn’t capture — click empty space to restore focus."
      ],
      hudHint: "Press a key",
      hudLiveHint: "Live: hold the key"
    }
  };

  // Легенды для букв/символов (то, что написано на клавишах)
  const LEGEND_EN = {
    Backquote: "`",
    Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
    Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
    Minus: "-", Equal: "=",
    KeyQ: "Q", KeyW: "W", KeyE: "E", KeyR: "R", KeyT: "T", KeyY: "Y", KeyU: "U", KeyI: "I", KeyO: "O", KeyP: "P",
    BracketLeft: "[", BracketRight: "]", Backslash: "\\",
    KeyA: "A", KeyS: "S", KeyD: "D", KeyF: "F", KeyG: "G", KeyH: "H", KeyJ: "J", KeyK: "K", KeyL: "L",
    Semicolon: ";", Quote: "'",
    KeyZ: "Z", KeyX: "X", KeyC: "C", KeyV: "V", KeyB: "B", KeyN: "N", KeyM: "M",
    Comma: ",", Period: ".", Slash: "/"
  };

  const LEGEND_RU = {
    Backquote: "Ё",
    Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
    Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
    Minus: "-", Equal: "=",
    KeyQ: "Й", KeyW: "Ц", KeyE: "У", KeyR: "К", KeyT: "Е", KeyY: "Н", KeyU: "Г", KeyI: "Ш", KeyO: "Щ", KeyP: "З",
    BracketLeft: "Х", BracketRight: "Ъ", Backslash: "\\",
    KeyA: "Ф", KeyS: "Ы", KeyD: "В", KeyF: "А", KeyG: "П", KeyH: "Р", KeyJ: "О", KeyK: "Л", KeyL: "Д",
    Semicolon: "Ж", Quote: "Э",
    KeyZ: "Я", KeyX: "Ч", KeyC: "С", KeyV: "М", KeyB: "И", KeyN: "Т", KeyM: "Ь",
    Comma: "Б", Period: "Ю", Slash: "."
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let settings = loadSettings();

  // State
  const down = new Set();
  const latched = new Set();
  let maxDown = 0;

  // Build UI skeleton
  const app = document.getElementById("app");
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo">K</div>
        <div class="brand-title">Keyboard Tester</div>
      </div>

      <div class="pillbar">
        <div class="pill live-pill" id="livePill"><span class="dot"></span><span id="liveText">Live</span></div>

        <button class="pill" id="captureBtn" type="button"></button>
        <button class="pill" id="modeBtn" type="button"></button>
        <button class="pill" id="clearBtn" type="button"></button>

        <button class="pill" id="langBtn" type="button"></button>
        <button class="pill" id="osBtn" type="button"></button>

        <button class="pill" id="themeBtn" type="button"></button>
        <button class="pill" id="fsBtn" type="button">Fullscreen</button>
        <button class="pill" id="helpBtn" type="button" aria-expanded="false">Help</button>
      </div>
    </header>

    <aside class="hud" id="hud">
      <div class="hud-title" id="hudTitle">—</div>
      <div class="hud-sub" id="hudSub">Нажми клавишу</div>

      <div class="hud-grid">
        <div class="hud-row">
          <div class="hud-k">event.key</div>
          <div class="hud-v" id="vKey">—</div>
        </div>
        <div class="hud-row">
          <div class="hud-k">event.code</div>
          <div class="hud-v" id="vCode">—</div>
        </div>
        <div class="hud-row">
          <div class="hud-k">keyCode</div>
          <div class="hud-v" id="vKeyCode">—</div>
        </div>
        <div class="hud-row">
          <div class="hud-k">repeat</div>
          <div class="hud-v" id="vRepeat">—</div>
        </div>
      </div>

      <div class="hud-footer">
        <div class="hud-chip" id="chipMode">LIVE</div>
        <div class="hud-chip" id="chipOffline">offline: no</div>
        <div class="hud-chip" id="chipFocus">focus: yes</div>
      </div>

      <div class="hud-mini">
        <span>down: <b id="mDown">0</b></span>
        <span>max: <b id="mMax">0</b></span>
        <span>latched: <b id="mLatched">0</b></span>
      </div>
    </aside>

    <section class="stage">
      <div class="kb-shell" id="kbShell">
        <div class="kb-scale" id="kbScale">
          <div class="kb-grid" id="keyboard"></div>
        </div>
      </div>
    </section>

    <div class="modal-backdrop" id="helpBackdrop" hidden>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
        <button class="modal-x" id="helpClose" type="button" aria-label="Close">×</button>
        <div class="modal-title" id="helpTitle">Help</div>
        <div class="modal-body" id="helpBody"></div>
        <div class="modal-actions">
          <button class="pill pill-primary" id="helpOk" type="button">OK</button>
        </div>
      </div>
    </div>
  `;

  // Elements
  const captureBtn = $("#captureBtn");
  const modeBtn = $("#modeBtn");
  const clearBtn = $("#clearBtn");
  const langBtn = $("#langBtn");
  const osBtn = $("#osBtn");
  const themeBtn = $("#themeBtn");
  const fsBtn = $("#fsBtn");
  const helpBtn = $("#helpBtn");

  const helpBackdrop = $("#helpBackdrop");
  const helpClose = $("#helpClose");
  const helpOk = $("#helpOk");
  const helpTitle = $("#helpTitle");
  const helpBody = $("#helpBody");

  const keyboardEl = $("#keyboard");
  const kbShell = $("#kbShell");
  const kbScale = $("#kbScale");

  // HUD
  const hudTitle = $("#hudTitle");
  const hudSub = $("#hudSub");
  const vKey = $("#vKey");
  const vCode = $("#vCode");
  const vKeyCode = $("#vKeyCode");
  const vRepeat = $("#vRepeat");
  const chipMode = $("#chipMode");
  const chipOffline = $("#chipOffline");
  const chipFocus = $("#chipFocus");
  const mDown = $("#mDown");
  const mMax = $("#mMax");
  const mLatched = $("#mLatched");
  const liveText = $("#liveText");

  // Helpers
  function isMac() { return settings.os === "mac"; }
  function legendMap() { return settings.lang === "ru" ? LEGEND_RU : LEGEND_EN; }

  function setTheme(theme) {
    settings.theme = theme;
    document.body.dataset.theme = theme;
    saveSettings(settings);
    updateTopbar();
    // перерасчёт масштаба (на всякий)
    queueResize();
  }

  function setLang(lang) {
    settings.lang = lang;
    saveSettings(settings);
    updateTopbar();
    buildKeyboard();       // чтобы легенды на кнопках тоже сменились (QWERTY vs ЙЦУКЕН)
    renderHelp(false);     // обновить содержимое help (если открыт)
    updateHudText();
  }

  function setOS(os) {
    settings.os = os;
    saveSettings(settings);
    updateTopbar();
    buildKeyboard();       // чтобы Win/⌘ и Alt/⌥ поменялись
  }

  function setMode(mode) {
    settings.mode = mode;
    saveSettings(settings);
    chipMode.textContent = mode.toUpperCase();
    updateTopbar();
    syncHighlights();
  }

  function setCapture(on) {
    settings.capture = !!on;
    saveSettings(settings);
    updateTopbar();
  }

  function updateHudText() {
    const t = I18N[settings.lang];
    hudSub.textContent = settings.mode === "live" ? t.hudLiveHint : t.hudHint;
    liveText.textContent = t.live;
  }

  function updateTopbar() {
    const t = I18N[settings.lang];

    captureBtn.textContent = settings.capture ? t.captureOn : t.captureOff;
    captureBtn.classList.toggle("is-on", settings.capture);

    modeBtn.textContent = settings.mode === "live" ? t.modeLive : t.modeLatch;

    clearBtn.textContent = t.clear;

    langBtn.textContent = settings.lang.toUpperCase();

    osBtn.textContent = isMac() ? "Mac" : "Windows";

    themeBtn.textContent = settings.theme === "night" ? t.themeNight : t.themeDay;

    fsBtn.textContent = t.fullscreen;
    helpBtn.textContent = t.help;

    updateHudText();
  }

  function renderHelp(open) {
    const t = I18N[settings.lang];
    helpTitle.textContent = t.helpTitle;
    helpOk.textContent = t.ok;

    // Безопасный рендер: минимально markdown-подобный для **...**
    const html = t.helpLines.map(line => {
      const esc = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      const bolded = esc.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
      return `<div class="help-line">• ${bolded}</div>`;
    }).join("");

    helpBody.innerHTML = html;

    if (open === true) {
      helpBackdrop.hidden = false;
      helpBtn.setAttribute("aria-expanded", "true");
      // фокус внутрь
      setTimeout(() => helpOk.focus(), 0);
    } else if (open === false) {
      helpBackdrop.hidden = true;
      helpBtn.setAttribute("aria-expanded", "false");
    } else {
      // open === null: только перерисовать текст (если открыт)
      // ничего
    }
  }

  function toggleHelp() {
    const willOpen = helpBackdrop.hidden;
    renderHelp(willOpen);
  }

  function clearAll() {
    down.clear();
    latched.clear();
    maxDown = 0;
    mDown.textContent = "0";
    mMax.textContent = "0";
    mLatched.textContent = "0";
    vKey.textContent = "—";
    vCode.textContent = "—";
    vKeyCode.textContent = "—";
    vRepeat.textContent = "—";
    hudTitle.textContent = "—";
    syncHighlights();
  }

  // Keyboard layout (24 columns, 6 rows)
  // Колонки: 1..15 main, 16 gap, 17..19 nav/prtsc cluster, 20 gap, 21..24 numpad
  function keyLabelFor(code, fallback) {
    const map = legendMap();
    return map[code] || fallback || code;
  }

  function makeKey(def) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "key";
    el.dataset.code = def.code;
    el.style.gridColumn = `${def.c} / span ${def.w || 1}`;
    el.style.gridRow = `${def.r} / span ${def.h || 1}`;

    el.innerHTML = `
      <div class="k-main">${def.main}</div>
      ${def.sub ? `<div class="k-sub">${def.sub}</div>` : ""}
    `;

    // Клик мышкой — как “виртуальное нажатие” (для демонстрации)
    el.addEventListener("click", () => {
      // клик не должен ломать фокус/залипание
      if (settings.mode === "latch") {
        if (latched.has(def.code)) latched.delete(def.code);
        else latched.add(def.code);
        mLatched.textContent = String(latched.size);
        syncHighlights();
      } else {
        // В live — краткий флэш
        el.classList.add("is-down");
        setTimeout(() => el.classList.remove("is-down"), 160);
      }
    });

    return el;
  }

  function buildKeyboard() {
    keyboardEl.innerHTML = "";

    const metaL = isMac() ? "⌘" : "Win";
    const metaR = isMac() ? "⌘" : "Win";
    const altL = isMac() ? "⌥" : "Alt";
    const altR = isMac() ? "⌥" : "Alt";

    const defs = [
      // Row 1 (function row)
      { code: "Escape", r: 1, c: 1, w: 1, main: "Esc", sub: "Escape" },
      { code: "F1", r: 1, c: 3, main: "F1" },
      { code: "F2", r: 1, c: 4, main: "F2" },
      { code: "F3", r: 1, c: 5, main: "F3" },
      { code: "F4", r: 1, c: 6, main: "F4" },
      { code: "F5", r: 1, c: 8, main: "F5" },
      { code: "F6", r: 1, c: 9, main: "F6" },
      { code: "F7", r: 1, c: 10, main: "F7" },
      { code: "F8", r: 1, c: 11, main: "F8" },
      { code: "F9", r: 1, c: 13, main: "F9" },
      { code: "F10", r: 1, c: 14, main: "F10" },
      { code: "F11", r: 1, c: 15, main: "F11" },
      { code: "F12", r: 1, c: 16, main: "F12" },

      { code: "PrintScreen", r: 1, c: 17, main: "Prt", sub: "PrintScreen" },
      { code: "ScrollLock", r: 1, c: 18, main: "Scr", sub: "ScrollLock" },
      { code: "Pause", r: 1, c: 19, main: "Pause", sub: "Pause" },

      // Row 2 (numbers + Ins/Home/PgUp + numpad ops)
      { code: "Backquote", r: 2, c: 1, main: keyLabelFor("Backquote", "`") },
      { code: "Digit1", r: 2, c: 2, main: keyLabelFor("Digit1", "1") },
      { code: "Digit2", r: 2, c: 3, main: keyLabelFor("Digit2", "2") },
      { code: "Digit3", r: 2, c: 4, main: keyLabelFor("Digit3", "3") },
      { code: "Digit4", r: 2, c: 5, main: keyLabelFor("Digit4", "4") },
      { code: "Digit5", r: 2, c: 6, main: keyLabelFor("Digit5", "5") },
      { code: "Digit6", r: 2, c: 7, main: keyLabelFor("Digit6", "6") },
      { code: "Digit7", r: 2, c: 8, main: keyLabelFor("Digit7", "7") },
      { code: "Digit8", r: 2, c: 9, main: keyLabelFor("Digit8", "8") },
      { code: "Digit9", r: 2, c: 10, main: keyLabelFor("Digit9", "9") },
      { code: "Digit0", r: 2, c: 11, main: keyLabelFor("Digit0", "0") },
      { code: "Minus", r: 2, c: 12, main: keyLabelFor("Minus", "-"), sub: "Minus" },
      { code: "Equal", r: 2, c: 13, main: keyLabelFor("Equal", "="), sub: "Equal" },
      { code: "Backspace", r: 2, c: 14, w: 2, main: "Backspace", sub: "Backspace" },

      { code: "Insert", r: 2, c: 17, main: "Ins", sub: "Insert" },
      { code: "Home", r: 2, c: 18, main: "Home", sub: "Home" },
      { code: "PageUp", r: 2, c: 19, main: "PgUp", sub: "PageUp" },

      { code: "NumLock", r: 2, c: 21, main: "NumLock", sub: "NumLock" },
      { code: "NumpadDivide", r: 2, c: 22, main: "/", sub: "NumpadDivide" },
      { code: "NumpadMultiply", r: 2, c: 23, main: "*", sub: "NumpadMultiply" },
      { code: "NumpadSubtract", r: 2, c: 24, main: "−", sub: "NumpadSubtract" },

      // Row 3 (Q row + Del/End/PgDn + numpad 7-9 + plus span2)
      { code: "Tab", r: 3, c: 1, w: 2, main: "Tab", sub: "Tab" },
      { code: "KeyQ", r: 3, c: 3, main: keyLabelFor("KeyQ", "Q") },
      { code: "KeyW", r: 3, c: 4, main: keyLabelFor("KeyW", "W") },
      { code: "KeyE", r: 3, c: 5, main: keyLabelFor("KeyE", "E") },
      { code: "KeyR", r: 3, c: 6, main: keyLabelFor("KeyR", "R") },
      { code: "KeyT", r: 3, c: 7, main: keyLabelFor("KeyT", "T") },
      { code: "KeyY", r: 3, c: 8, main: keyLabelFor("KeyY", "Y") },
      { code: "KeyU", r: 3, c: 9, main: keyLabelFor("KeyU", "U") },
      { code: "KeyI", r: 3, c: 10, main: keyLabelFor("KeyI", "I") },
      { code: "KeyO", r: 3, c: 11, main: keyLabelFor("KeyO", "O") },
      { code: "KeyP", r: 3, c: 12, main: keyLabelFor("KeyP", "P") },
      { code: "BracketLeft", r: 3, c: 13, main: keyLabelFor("BracketLeft", "[") },
      { code: "BracketRight", r: 3, c: 14, main: keyLabelFor("BracketRight", "]") },
      { code: "Backslash", r: 3, c: 15, main: keyLabelFor("Backslash", "\\") },

      { code: "Delete", r: 3, c: 17, main: "Del", sub: "Delete" },
      { code: "End", r: 3, c: 18, main: "End", sub: "End" },
      { code: "PageDown", r: 3, c: 19, main: "PgDn", sub: "PageDown" },

      { code: "Numpad7", r: 3, c: 21, main: "7", sub: "Numpad7" },
      { code: "Numpad8", r: 3, c: 22, main: "8", sub: "Numpad8" },
      { code: "Numpad9", r: 3, c: 23, main: "9", sub: "Numpad9" },
      { code: "NumpadAdd", r: 3, c: 24, h: 2, main: "+", sub: "NumpadAdd" },

      // Row 4 (A row + numpad 4-6)
      { code: "CapsLock", r: 4, c: 1, w: 2, main: "Caps", sub: "CapsLock" },
      { code: "KeyA", r: 4, c: 3, main: keyLabelFor("KeyA", "A") },
      { code: "KeyS", r: 4, c: 4, main: keyLabelFor("KeyS", "S") },
      { code: "KeyD", r: 4, c: 5, main: keyLabelFor("KeyD", "D") },
      { code: "KeyF", r: 4, c: 6, main: keyLabelFor("KeyF", "F") },
      { code: "KeyG", r: 4, c: 7, main: keyLabelFor("KeyG", "G") },
      { code: "KeyH", r: 4, c: 8, main: keyLabelFor("KeyH", "H") },
      { code: "KeyJ", r: 4, c: 9, main: keyLabelFor("KeyJ", "J") },
      { code: "KeyK", r: 4, c: 10, main: keyLabelFor("KeyK", "K") },
      { code: "KeyL", r: 4, c: 11, main: keyLabelFor("KeyL", "L") },
      { code: "Semicolon", r: 4, c: 12, main: keyLabelFor("Semicolon", ";"), sub: "Semicolon" },
      { code: "Quote", r: 4, c: 13, main: keyLabelFor("Quote", "'"), sub: "Quote" },
      { code: "Enter", r: 4, c: 14, w: 2, main: "Enter", sub: "Enter" },

      { code: "Numpad4", r: 4, c: 21, main: "4", sub: "Numpad4" },
      { code: "Numpad5", r: 4, c: 22, main: "5", sub: "Numpad5" },
      { code: "Numpad6", r: 4, c: 23, main: "6", sub: "Numpad6" },

      // Row 5 (Z row + ArrowUp + numpad 1-3 + Enter span2)
      { code: "ShiftLeft", r: 5, c: 1, w: 3, main: "Shift", sub: "ShiftLeft" },
      { code: "KeyZ", r: 5, c: 4, main: keyLabelFor("KeyZ", "Z") },
      { code: "KeyX", r: 5, c: 5, main: keyLabelFor("KeyX", "X") },
      { code: "KeyC", r: 5, c: 6, main: keyLabelFor("KeyC", "C") },
      { code: "KeyV", r: 5, c: 7, main: keyLabelFor("KeyV", "V") },
      { code: "KeyB", r: 5, c: 8, main: keyLabelFor("KeyB", "B") },
      { code: "KeyN", r: 5, c: 9, main: keyLabelFor("KeyN", "N") },
      { code: "KeyM", r: 5, c: 10, main: keyLabelFor("KeyM", "M") },
      { code: "Comma", r: 5, c: 11, main: keyLabelFor("Comma", ",") },
      { code: "Period", r: 5, c: 12, main: keyLabelFor("Period", ".") },
      { code: "Slash", r: 5, c: 13, main: keyLabelFor("Slash", "/") },
      { code: "ShiftRight", r: 5, c: 14, w: 2, main: "Shift", sub: "ShiftRight" },

      { code: "ArrowUp", r: 5, c: 18, main: "▲", sub: "ArrowUp" },

      { code: "Numpad1", r: 5, c: 21, main: "1", sub: "Numpad1" },
      { code: "Numpad2", r: 5, c: 22, main: "2", sub: "Numpad2" },
      { code: "Numpad3", r: 5, c: 23, main: "3", sub: "Numpad3" },
      { code: "NumpadEnter", r: 5, c: 24, h: 2, main: "Enter", sub: "NumpadEnter" },

      // Row 6 (bottom row + arrows + numpad 0/.)
      { code: "ControlLeft", r: 6, c: 1, w: 2, main: "Ctrl", sub: "ControlLeft" },
      { code: "MetaLeft", r: 6, c: 3, main: metaL, sub: "MetaLeft" },
      { code: "AltLeft", r: 6, c: 4, main: altL, sub: "AltLeft" },
      { code: "Space", r: 6, c: 5, w: 5, main: "Space", sub: "Space" },
      { code: "AltRight", r: 6, c: 10, main: altR, sub: "AltRight" },
      { code: "MetaRight", r: 6, c: 11, main: metaR, sub: "MetaRight" },
      { code: "ContextMenu", r: 6, c: 12, main: "Menu", sub: "ContextMenu" },
      { code: "ControlRight", r: 6, c: 13, w: 2, main: "Ctrl", sub: "ControlRight" },

      { code: "ArrowLeft", r: 6, c: 17, main: "◀", sub: "ArrowLeft" },
      { code: "ArrowDown", r: 6, c: 18, main: "▼", sub: "ArrowDown" },
      { code: "ArrowRight", r: 6, c: 19, main: "▶", sub: "ArrowRight" },

      { code: "Numpad0", r: 6, c: 21, w: 2, main: "0", sub: "Numpad0" },
      { code: "NumpadDecimal", r: 6, c: 23, main: ".", sub: "NumpadDecimal" }
    ];

    defs.forEach(d => keyboardEl.appendChild(makeKey(d)));
    syncHighlights();
    queueResize();
  }

  function syncHighlights() {
    const keys = keyboardEl.querySelectorAll(".key");
    const active = new Set();

    if (settings.mode === "live") {
      down.forEach(c => active.add(c));
    } else {
      down.forEach(c => active.add(c));
      latched.forEach(c => active.add(c));
    }

    keys.forEach(el => {
      const code = el.dataset.code;
      el.classList.toggle("is-down", active.has(code));
      el.classList.toggle("is-latched", settings.mode === "latch" && latched.has(code));
    });

    mDown.textContent = String(down.size);
    mLatched.textContent = String(latched.size);
    mMax.textContent = String(maxDown);
  }

  function updateHudFromEvent(e) {
    hudTitle.textContent = e.key && e.key.length ? e.key : "—";
    vKey.textContent = e.key || "—";
    vCode.textContent = e.code || "—";
    vKeyCode.textContent = String(e.keyCode ?? "—");
    vRepeat.textContent = e.repeat ? "yes" : "no";
  }

  function shouldCapture(e) {
    if (!settings.capture) return false;

    // Глушим системные комбинации и скролл
    if (e.ctrlKey || e.metaKey) return true;
    const k = e.key;
    const code = e.code;

    if (k === " " || code === "Space") return true;
    if (code.startsWith("Arrow")) return true;
    if (code === "Tab") return true;

    // PageUp/Down/Home/End — тоже часто скроллит
    if (["PageUp", "PageDown", "Home", "End"].includes(code)) return true;

    return false;
  }

  function onKeyDown(e) {
    if (shouldCapture(e)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!e.code) return;
    updateHudFromEvent(e);

    if (!down.has(e.code)) {
      down.add(e.code);
      maxDown = Math.max(maxDown, down.size);
    }

    if (settings.mode === "latch" && !e.repeat) {
      if (latched.has(e.code)) latched.delete(e.code);
      else latched.add(e.code);
    }

    syncHighlights();
  }

  function onKeyUp(e) {
    if (shouldCapture(e)) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!e.code) return;
    down.delete(e.code);
    syncHighlights();
  }

  function updateOnlineState() {
    const off = !navigator.onLine;
    chipOffline.textContent = `offline: ${off ? "yes" : "no"}`;
    chipOffline.classList.toggle("bad", off);
  }

  function updateFocusState() {
    const focused = document.hasFocus();
    chipFocus.textContent = `focus: ${focused ? "yes" : "no"}`;
    chipFocus.classList.toggle("bad", !focused);
  }

  // Fullscreen
  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // ignore
    }
  }

  // Resize & scale (чтобы ничего не выпирало за рамки)
  let resizeQueued = false;
  function queueResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      applyScale();
    });
  }

  function applyScale() {
    // Базовые размеры “дизайна”
    const COLS = 24;
    const ROWS = 6;

    // Эти значения дают “дорогую” плотность на большинстве экранов
    const baseUnit = 64;  // ширина 1u
    const baseGap = 12;
    const baseH = 64;

    // Посчитаем базовую ширину/высоту грида
    const baseW = (COLS * baseUnit) + ((COLS - 1) * baseGap);
    const baseHeight = (ROWS * baseH) + ((ROWS - 1) * baseGap);

    // Доступное пространство под клавиатуру
    const rect = kbShell.getBoundingClientRect();
    const availW = rect.width - 32;
    const availH = rect.height - 32;

    const sW = availW / baseW;
    const sH = availH / baseHeight;

    // Разрешаем чуть увеличивать, чтобы “на весь экран” выглядело мощно
    const scale = Math.max(0.55, Math.min(1.15, sW, sH));

    kbScale.style.setProperty("--u", `${baseUnit}px`);
    kbScale.style.setProperty("--g", `${baseGap}px`);
    kbScale.style.setProperty("--h", `${baseH}px`);
    kbScale.style.setProperty("--scale", scale.toFixed(4));
  }

  // Wire buttons
  captureBtn.addEventListener("click", () => setCapture(!settings.capture));
  modeBtn.addEventListener("click", () => setMode(settings.mode === "live" ? "latch" : "live"));
  clearBtn.addEventListener("click", clearAll);

  langBtn.addEventListener("click", () => setLang(settings.lang === "ru" ? "en" : "ru"));
  osBtn.addEventListener("click", () => setOS(settings.os === "win" ? "mac" : "win"));
  themeBtn.addEventListener("click", () => setTheme(settings.theme === "night" ? "day" : "night"));

  fsBtn.addEventListener("click", toggleFullscreen);
  helpBtn.addEventListener("click", toggleHelp);

  // Modal close
  helpClose.addEventListener("click", () => renderHelp(false));
  helpOk.addEventListener("click", () => renderHelp(false));
  helpBackdrop.addEventListener("click", (e) => {
    if (e.target === helpBackdrop) renderHelp(false);
  });
  window.addEventListener("keydown", (e) => {
    if (!helpBackdrop.hidden && e.key === "Escape") renderHelp(false);
  });

  // Global listeners
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: false });

  window.addEventListener("online", updateOnlineState);
  window.addEventListener("offline", updateOnlineState);
  window.addEventListener("focus", updateFocusState);
  window.addEventListener("blur", updateFocusState);
  window.addEventListener("resize", queueResize);

  // Init
  document.body.dataset.theme = settings.theme;
  updateTopbar();
  buildKeyboard();
  updateOnlineState();
  updateFocusState();
  chipMode.textContent = settings.mode.toUpperCase();
})();
