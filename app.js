(() => {
  const LS_KEY = "kbTesterSettings_v3";

  const state = {
    capture: false,
    mode: "live",       // live | latch
    theme: "night",     // night | day
    lang: "en",         // en | ru
    platform: "windows",// windows | mac

    down: new Set(),    // currently pressed (event.code)
    latched: new Set(), // remembered pressed (for latch mode)
    maxDown: 0
  };

  const el = {};
  let ro = null;

  // --------- Layout data (physical) ---------
  // We build rows as blocks to keep realistic gaps (main / nav / numpad)
  const LAYOUT = [
    // Row 0: Esc | F-keys | Prt/Scr/Pause
    [
      [{ c: "Escape", u: 1.25 }],
      [
        { c: "F1" }, { c: "F2" }, { c: "F3" }, { c: "F4" },
        { c: "F5" }, { c: "F6" }, { c: "F7" }, { c: "F8" },
        { c: "F9" }, { c: "F10" }, { c: "F11" }, { c: "F12" }
      ],
      [{ c: "PrintScreen" }, { c: "ScrollLock" }, { c: "Pause" }]
    ],

    // Row 1: ` 1..0 - = Backspace | Ins Home PgUp | Num / * -
    [
      [
        { c: "Backquote" },
        { c: "Digit1" }, { c: "Digit2" }, { c: "Digit3" }, { c: "Digit4" }, { c: "Digit5" },
        { c: "Digit6" }, { c: "Digit7" }, { c: "Digit8" }, { c: "Digit9" }, { c: "Digit0" },
        { c: "Minus" }, { c: "Equal" },
        { c: "Backspace", u: 2.25 }
      ],
      [{ c: "Insert" }, { c: "Home" }, { c: "PageUp" }],
      [{ c: "NumLock" }, { c: "NumpadDivide" }, { c: "NumpadMultiply" }, { c: "NumpadSubtract" }]
    ],

    // Row 2: Tab Q..] \ | Del End PgDn | 7 8 9 +
    [
      [
        { c: "Tab", u: 1.6 },
        { c: "KeyQ" }, { c: "KeyW" }, { c: "KeyE" }, { c: "KeyR" }, { c: "KeyT" },
        { c: "KeyY" }, { c: "KeyU" }, { c: "KeyI" }, { c: "KeyO" }, { c: "KeyP" },
        { c: "BracketLeft" }, { c: "BracketRight" },
        { c: "Backslash", u: 1.6 }
      ],
      [{ c: "Delete" }, { c: "End" }, { c: "PageDown" }],
      [{ c: "Numpad7" }, { c: "Numpad8" }, { c: "Numpad9" }, { c: "NumpadAdd" }]
    ],

    // Row 3: Caps A..' Enter | (gap) | 4 5 6 (gap)
    [
      [
        { c: "CapsLock", u: 1.9 },
        { c: "KeyA" }, { c: "KeyS" }, { c: "KeyD" }, { c: "KeyF" }, { c: "KeyG" },
        { c: "KeyH" }, { c: "KeyJ" }, { c: "KeyK" }, { c: "KeyL" },
        { c: "Semicolon" }, { c: "Quote" },
        { c: "Enter", u: 2.35 }
      ],
      [{ spacer: true }], // small alignment spacer (keeps blocks consistent)
      [{ c: "Numpad4" }, { c: "Numpad5" }, { c: "Numpad6" }, { c: "NumpadAdd" }]
    ],

    // Row 4: Shift Z../ Shift | Up | 1 2 3 Enter
    [
      [
        { c: "ShiftLeft", u: 2.45 },
        { c: "KeyZ" }, { c: "KeyX" }, { c: "KeyC" }, { c: "KeyV" }, { c: "KeyB" },
        { c: "KeyN" }, { c: "KeyM" },
        { c: "Comma" }, { c: "Period" }, { c: "Slash" },
        { c: "ShiftRight", u: 2.7 }
      ],
      [{ c: "ArrowUp" }],
      [{ c: "Numpad1" }, { c: "Numpad2" }, { c: "Numpad3" }, { c: "NumpadEnter" }]
    ],

    // Row 5: Ctrl Win Alt Space Alt Win Menu Ctrl | Left Down Right | 0 . Enter
    [
      [
        { c: "ControlLeft", u: 1.35 },
        { c: "MetaLeft", u: 1.35 },
        { c: "AltLeft", u: 1.35 },
        { c: "Space", u: 6.5 },
        { c: "AltRight", u: 1.35 },
        { c: "MetaRight", u: 1.35 },
        { c: "ContextMenu", u: 1.35 },
        { c: "ControlRight", u: 1.6 }
      ],
      [{ c: "ArrowLeft" }, { c: "ArrowDown" }, { c: "ArrowRight" }],
      [{ c: "Numpad0", u: 2.25 }, { c: "NumpadDecimal" }, { c: "NumpadEnter" }]
    ]
  ];

  // --------- Label maps ---------
  const EN = {
    Backquote: ["`", "~"],
    Digit1: ["1", "!"], Digit2: ["2", "@"], Digit3: ["3", "#"], Digit4: ["4", "$"], Digit5: ["5", "%"],
    Digit6: ["6", "^"], Digit7: ["7", "&"], Digit8: ["8", "*"], Digit9: ["9", "("], Digit0: ["0", ")"],
    Minus: ["-", "_"], Equal: ["=", "+"],
    BracketLeft: ["[", "{"], BracketRight: ["]", "}"], Backslash: ["\\", "|"],
    Semicolon: [";", ":"], Quote: ["'", "\""],
    Comma: [",", "<"], Period: [".", ">"], Slash: ["/", "?"]
  };

  const RU = {
    // RU legends for letter keys (physical)
    KeyQ: "Й", KeyW: "Ц", KeyE: "У", KeyR: "К", KeyT: "Е", KeyY: "Н", KeyU: "Г", KeyI: "Ш", KeyO: "Щ", KeyP: "З",
    KeyA: "Ф", KeyS: "Ы", KeyD: "В", KeyF: "А", KeyG: "П", KeyH: "Р", KeyJ: "О", KeyK: "Л", KeyL: "Д",
    KeyZ: "Я", KeyX: "Ч", KeyC: "С", KeyV: "М", KeyB: "И", KeyN: "Т", KeyM: "Ь",
    Backquote: ["Ё", "Ё"],
    BracketLeft: ["Х", "Х"], BracketRight: ["Ъ", "Ъ"],
    Semicolon: ["Ж", "Ж"], Quote: ["Э", "Э"],
    Comma: ["Б", "Б"], Period: ["Ю", "Ю"], Slash: [".", ","],
    Backslash: ["\\", "/"],

    Digit1: ["1", "!"], Digit2: ["2", "\""], Digit3: ["3", "№"], Digit4: ["4", ";"], Digit5: ["5", "%"],
    Digit6: ["6", ":"], Digit7: ["7", "?"], Digit8: ["8", "*"], Digit9: ["9", "("], Digit0: ["0", ")"],
    Minus: ["-", "_"], Equal: ["=", "+"]
  };

  function loadSettings(){
    try{
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (typeof saved.capture === "boolean") state.capture = saved.capture;
      if (saved.mode === "live" || saved.mode === "latch") state.mode = saved.mode;
      if (saved.theme === "day" || saved.theme === "night") state.theme = saved.theme;
      if (saved.lang === "en" || saved.lang === "ru") state.lang = saved.lang;
      if (saved.platform === "windows" || saved.platform === "mac") state.platform = saved.platform;
    }catch{}
  }
  function saveSettings(){
    localStorage.setItem(LS_KEY, JSON.stringify({
      capture: state.capture,
      mode: state.mode,
      theme: state.theme,
      lang: state.lang,
      platform: state.platform
    }));
  }

  // --------- DOM helpers ---------
  const $ = (id) => document.getElementById(id);

  function init(){
    loadSettings();

    el.stage = $("stage");
    el.kbScale = $("kbScale");
    el.topbar = $("topbar");

    el.btnCapture = $("btnCapture");
    el.btnMode = $("btnMode");
    el.btnClear = $("btnClear");
    el.btnTheme = $("btnTheme");
    el.btnLang = $("btnLang");
    el.btnPlatform = $("btnPlatform");
    el.btnFS = $("btnFS");
    el.btnHelp = $("btnHelp");

    el.overlay = $("overlay");
    el.btnClose = $("btnClose");
    el.btnOk = $("btnOk");

    el.vKey = $("vKey");
    el.vCode = $("vCode");
    el.vKeyCode = $("vKeyCode");
    el.vRepeat = $("vRepeat");
    el.vDown = $("vDown");
    el.vMax = $("vMax");
    el.vLatched = $("vLatched");

    el.pillMode = $("pillMode");
    el.pillOffline = $("pillOffline");
    el.pillFocus = $("pillFocus");

    buildKeyboard();
    bindUI();
    applyAll();
    installFit();
    installEvents();
    installSW();
    updateOnline();
    updateFocus();

    // make stage focusable on click (helps keyboard events)
    document.addEventListener("pointerdown", () => updateFocus(), { passive: true });
  }

  function bindUI(){
    el.btnCapture.addEventListener("click", () => {
      state.capture = !state.capture;
      saveSettings();
      applyControls();
    });

    el.btnMode.addEventListener("click", () => {
      state.mode = (state.mode === "live") ? "latch" : "live";
      if (state.mode === "live") state.latched.clear();
      saveSettings();
      applyControls();
      renderHighlights();
      updateCounters();
    });

    el.btnClear.addEventListener("click", () => {
      state.down.clear();
      state.latched.clear();
      state.maxDown = 0;
      updateInfo(null);
      renderHighlights();
      updateCounters();
    });

    el.btnTheme.addEventListener("click", () => {
      state.theme = (state.theme === "night") ? "day" : "night";
      saveSettings();
      applyTheme();
      fitKeyboard();
    });

    el.btnLang.addEventListener("click", () => {
      state.lang = (state.lang === "en") ? "ru" : "en";
      saveSettings();
      rerenderLegends();
    });

    el.btnPlatform.addEventListener("click", () => {
      state.platform = (state.platform === "windows") ? "mac" : "windows";
      saveSettings();
      rerenderLegends();
    });

    el.btnFS.addEventListener("click", async () => {
      try{
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      }catch{}
    });

    el.btnHelp.addEventListener("click", openHelp);
    el.btnClose.addEventListener("click", closeHelp);
    el.btnOk.addEventListener("click", closeHelp);

    el.overlay.addEventListener("click", (e) => {
      if (e.target === el.overlay) closeHelp();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isHelpOpen()) closeHelp();
    });

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("focus", updateFocus);
    window.addEventListener("blur", updateFocus);

    document.addEventListener("fullscreenchange", () => {
      el.btnFS.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
      fitKeyboard();
    });
  }

  function applyAll(){
    applyTheme();
    applyControls();
    rerenderLegends();
    renderHighlights();
    updateCounters();
    fitKeyboard();
  }

  function applyTheme(){
    document.documentElement.setAttribute("data-theme", state.theme);

    // small theme-color tweak
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "night" ? "#0b0f19" : "#eef1f6");

    el.btnTheme.textContent = `Theme: ${state.theme === "night" ? "Night" : "Day"}`;
  }

  function applyControls(){
    el.btnCapture.setAttribute("aria-pressed", String(state.capture));
    el.btnCapture.textContent = `Capture: ${state.capture ? "ON" : "OFF"}`;

    el.btnMode.setAttribute("aria-pressed", String(state.mode === "latch"));
    el.btnMode.textContent = `Mode: ${state.mode === "live" ? "Live" : "Latch"}`;

    el.btnLang.textContent = state.lang.toUpperCase();
    el.btnPlatform.textContent = state.platform === "windows" ? "Windows" : "Mac";

    el.pillMode.textContent = state.mode === "live" ? "LIVE" : "LATCH";
  }

  // --------- Keyboard rendering ---------
  function buildKeyboard(){
    el.kbScale.innerHTML = "";
    const kb = document.createElement("div");
    kb.className = "kb";
    kb.id = "kb";

    for (const rowBlocks of LAYOUT){
      const row = document.createElement("div");
      row.className = "row";

      rowBlocks.forEach((block, idx) => {
        if (block.length === 1 && block[0].spacer){
          const spacer = document.createElement("div");
          spacer.className = "blockSpacer";
          spacer.style.width = "10px";
          row.appendChild(spacer);
          return;
        }

        block.forEach((k) => row.appendChild(makeKey(k)));

        if (idx !== rowBlocks.length - 1){
          const spacer = document.createElement("div");
          spacer.className = "blockSpacer";
          row.appendChild(spacer);
        }
      });

      kb.appendChild(row);
    }

    el.kbScale.appendChild(kb);
  }

  function makeKey(def){
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.code = def.c;
    key.style.setProperty("--u", String(def.u ?? 1));

    const main = document.createElement("div");
    main.className = "main";
    const sub = document.createElement("div");
    sub.className = "sub";

    key.appendChild(main);
    key.appendChild(sub);

    // click to "latch" (optional convenience) only in latch mode
    key.addEventListener("click", () => {
      if (state.mode !== "latch") return;
      const code = def.c;
      if (state.latched.has(code)) state.latched.delete(code);
      else state.latched.add(code);
      renderHighlights();
      updateCounters();
    });

    return key;
  }

  function rerenderLegends(){
    const keys = el.kbScale.querySelectorAll(".key");
    keys.forEach((node) => {
      const code = node.dataset.code;
      const main = node.querySelector(".main");
      const sub = node.querySelector(".sub");

      const { label, small } = legendFor(code);
      main.textContent = label;
      sub.textContent = small;

      // slightly different style for wide utility keys
      const wide = isWideKey(code);
      node.classList.toggle("wide", wide);
    });

    fitKeyboard();
  }

  function isWideKey(code){
    return ["Backspace","Tab","CapsLock","Enter","ShiftLeft","ShiftRight","Space"].includes(code);
  }

  function legendFor(code){
    // Function keys
    if (/^F\d+$/.test(code)) return { label: code, small: code };

    // Numpad keys
    if (code.startsWith("Numpad")){
      const m = {
        NumpadDivide: "/", NumpadMultiply: "*", NumpadSubtract: "−", NumpadAdd: "+",
        NumpadDecimal: ".", NumpadEnter: "Enter"
      };
      if (code === "NumLock") return { label: "Num", small: "NumLock" };
      if (m[code]) return { label: m[code], small: code.replace("Numpad","Numpa") };
      const digit = code.replace("Numpad","");
      if (/^\d+$/.test(digit)) return { label: digit, small: code };
      return { label: code.replace("Numpad",""), small: code };
    }

    // Arrows
    if (code.startsWith("Arrow")){
      const a = { ArrowUp:"▲", ArrowDown:"▼", ArrowLeft:"◀", ArrowRight:"▶" };
      return { label: a[code] || code, small: code };
    }

    // Nav cluster
    const nav = {
      Insert:"Ins", Delete:"Del", Home:"Home", End:"End", PageUp:"PgUp", PageDown:"PgDn"
    };
    if (nav[code]) return { label: nav[code], small: code };

    // Modifiers / specials
    const isMac = state.platform === "mac";
    const mod = {
      Escape: ["Esc","Escape"],
      Backspace: ["Backspace","Backspace"],
      Tab: ["Tab","Tab"],
      CapsLock: ["Caps","CapsLock"],
      Enter: ["Enter","Enter"],
      ShiftLeft: ["Shift","ShiftLeft"],
      ShiftRight: ["Shift","ShiftRight"],
      ControlLeft: ["Ctrl","ControlLeft"],
      ControlRight: ["Ctrl","ControlRight"],
      AltLeft: isMac ? ["⌥","AltLeft"] : ["Alt","AltLeft"],
      AltRight: isMac ? ["⌥","AltRight"] : ["Alt","AltRight"],
      MetaLeft: isMac ? ["⌘","MetaLeft"] : ["Win","MetaLeft"],
      MetaRight: isMac ? ["⌘","MetaRight"] : ["Win","MetaRight"],
      ContextMenu: isMac ? ["Menu","ContextMenu"] : ["Menu","ContextMenu"],
      Space: ["Space","Space"],
      PrintScreen: ["Prt","PrintScreen"],
      ScrollLock: ["Scr","ScrollLock"],
      Pause: ["Pause","Pause"]
    };
    if (mod[code]) return { label: mod[code][0], small: mod[code][1] };

    // Letters
    if (code.startsWith("Key")){
      if (state.lang === "ru" && RU[code]) return { label: RU[code], small: code };
      return { label: code.replace("Key",""), small: code };
    }

    // Punctuation / digits (layout aware)
    const dict = (state.lang === "ru") ? RU : EN;
    if (dict[code]){
      const v = dict[code];
      if (Array.isArray(v)) return { label: v[0], small: code };
      return { label: String(v), small: code };
    }

    // Digits if not mapped
    if (code.startsWith("Digit")){
      return { label: code.replace("Digit",""), small: code };
    }

    return { label: code, small: code };
  }

  // --------- Highlight logic ---------
  function installEvents(){
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
  }

  function shouldIgnoreEvent(e){
    const t = e.target;
    if (!t) return false;
    const tag = t.tagName ? t.tagName.toLowerCase() : "";
    return tag === "input" || tag === "textarea" || tag === "select" || t.isContentEditable;
  }

  function onKeyDown(e){
    if (shouldIgnoreEvent(e)) return;

    // Capture mode: block browser hotkeys/scroll
    if (state.capture){
      // allow Ctrl+L etc? — нет, смысл capture как раз глушить
      e.preventDefault();
      e.stopPropagation();
    }

    const code = e.code || "";
    if (!code) return;

    state.down.add(code);
    if (state.mode === "latch") state.latched.add(code);

    if (state.down.size > state.maxDown) state.maxDown = state.down.size;

    updateInfo(e);
    renderHighlights();
    updateCounters();
  }

  function onKeyUp(e){
    if (shouldIgnoreEvent(e)) return;

    if (state.capture){
      e.preventDefault();
      e.stopPropagation();
    }

    const code = e.code || "";
    if (!code) return;

    state.down.delete(code);

    updateInfo(e);
    renderHighlights();
    updateCounters();
  }

  function renderHighlights(){
    const keys = el.kbScale.querySelectorAll(".key");
    keys.forEach((node) => {
      const code = node.dataset.code;
      const pressed = state.down.has(code);
      const latched = state.mode === "latch" && state.latched.has(code);

      node.classList.toggle("pressed", pressed);
      node.classList.toggle("latched", !pressed && latched);
    });
  }

  // --------- Info / counters ---------
  function updateInfo(e){
    if (!e){
      el.vKey.textContent = "—";
      el.vCode.textContent = "—";
      el.vKeyCode.textContent = "—";
      el.vRepeat.textContent = "—";
      return;
    }
    el.vKey.textContent = String(e.key ?? "—");
    el.vCode.textContent = String(e.code ?? "—");
    el.vKeyCode.textContent = String(e.keyCode ?? "—");
    el.vRepeat.textContent = e.repeat ? "yes" : "no";
  }

  function updateCounters(){
    el.vDown.textContent = String(state.down.size);
    el.vMax.textContent = String(state.maxDown);
    el.vLatched.textContent = String(state.latched.size);
    el.pillMode.textContent = state.mode === "live" ? "LIVE" : "LATCH";
  }

  function updateOnline(){
    const offline = !navigator.onLine;
    el.pillOffline.textContent = `offline: ${offline ? "yes" : "no"}`;
  }

  function updateFocus(){
    const focused = document.hasFocus();
    el.pillFocus.textContent = `focus: ${focused ? "yes" : "no"}`;
  }

  // --------- Help modal ---------
  function isHelpOpen(){
    return el.overlay.classList.contains("open");
  }
  function openHelp(){
    el.overlay.classList.add("open");
    el.overlay.setAttribute("aria-hidden", "false");
  }
  function closeHelp(){
    el.overlay.classList.remove("open");
    el.overlay.setAttribute("aria-hidden", "true");
  }

  // --------- Auto-fit keyboard so it never overflows ---------
  function installFit(){
    // Keep stage height accurate: header can wrap into 2 lines on small screens
    const updateStageHeight = () => {
      const topH = el.topbar.offsetHeight;
      const stageH = Math.max(200, window.innerHeight - topH);
      el.stage.style.height = `${stageH}px`;
    };

    updateStageHeight();
    window.addEventListener("resize", () => {
      updateStageHeight();
      fitKeyboard();
    });

    ro = new ResizeObserver(() => {
      updateStageHeight();
      fitKeyboard();
    });
    ro.observe(el.topbar);
  }

  function fitKeyboard(){
    const kb = el.kbScale;
    const stage = el.stage;

    if (!kb || !stage) return;

    const pad = 18; // safe padding around keyboard inside stage
    const availW = stage.clientWidth - pad * 2;
    const availH = stage.clientHeight - pad * 2;

    const naturalW = kb.offsetWidth;
    const naturalH = kb.offsetHeight;

    if (naturalW <= 0 || naturalH <= 0) return;

    // allow slight upscale on big monitors, but keep it classy
    const scale = Math.min(availW / naturalW, availH / naturalH, 1.12);
    document.documentElement.style.setProperty("--kb-scale", String(scale));
  }

  // --------- Service worker ---------
  function installSW(){
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // boot
  document.addEventListener("DOMContentLoaded", init);
})();
