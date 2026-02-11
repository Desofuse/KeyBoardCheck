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

    window.addEventListener("o
