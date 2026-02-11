(() => {
  "use strict";

  // ========= helpers
  const $ = (id) => document.getElementById(id);

  const app = $("app");
  const kbViewport = $("kbViewport");
  const kbScale = $("kbScale");
  const keyboardEl = $("keyboard");

  // HUD
  const hudKey = $("hudKey");
  const hudHint = $("hudHint");
  const metaKey = $("metaKey");
  const metaCode = $("metaCode");
  const metaKeyCode = $("metaKeyCode");
  const metaRepeat = $("metaRepeat");

  const downCountEl = $("downCount");
  const maxCountEl = $("maxCount");
  const latchCountEl = $("latchCount");

  const badgeMode = $("badgeMode");
  const badgeOffline = $("badgeOffline");
  const badgeFocus = $("badgeFocus");

  // Top buttons
  const btnCapture = $("btnCapture");
  const btnMode = $("btnMode");
  const btnClear = $("btnClear");
  const btnLang = $("btnLang");
  const btnOS = $("btnOS");
  const btnTheme = $("btnTheme");
  const btnHelp = $("btnHelp");
  const btnFullscreen = $("btnFullscreen");

  // Live pill
  const liveDot = $("liveDot");
  const liveText = $("liveText");

  // Help modal
  const helpModal = $("helpModal");
  const helpClose = $("helpClose");
  const helpOk = $("helpOk");

  // ========= state (persisted)
  const LS = {
    CAPTURE: "kt.capture",
    MODE: "kt.mode",     // "live" | "latch"
    LANG: "kt.lang",     // "ru" | "en"
    OS: "kt.os",         // "win" | "mac"
    THEME: "kt.theme"    // "night" | "day"
  };

  let CAPTURE = readBool(LS.CAPTURE, true);
  let MODE = readStr(LS.MODE, "live");     // live|latch
  let UI_LANG = readStr(LS.LANG, "ru");
  let UI_OS = readStr(LS.OS, "win");
  let THEME = readStr(LS.THEME, prefersDay() ? "day" : "night");

  // runtime
  const down = new Set();
  const latched = new Set();
  let maxDown = 0;

  // ========= keyboard legends
  const RU = {
    Backquote:"Ё",
    KeyQ:"Й",KeyW:"Ц",KeyE:"У",KeyR:"К",KeyT:"Е",KeyY:"Н",KeyU:"Г",KeyI:"Ш",KeyO:"Щ",KeyP:"З",
    BracketLeft:"Х",BracketRight:"Ъ",
    KeyA:"Ф",KeyS:"Ы",KeyD:"В",KeyF:"А",KeyG:"П",KeyH:"Р",KeyJ:"О",KeyK:"Л",KeyL:"Д",
    Semicolon:"Ж",Quote:"Э",
    KeyZ:"Я",KeyX:"Ч",KeyC:"С",KeyV:"М",KeyB:"И",KeyN:"Т",KeyM:"Ь",
    Comma:"Б",Period:"Ю", Slash:"."
  };

  const EN_SHIFT = {
    Backquote:"~", Digit1:"!", Digit2:"@", Digit3:"#", Digit4:"$", Digit5:"%",
    Digit6:"^", Digit7:"&", Digit8:"*", Digit9:"(", Digit0:")",
    Minus:"_", Equal:"+", BracketLeft:"{", BracketRight:"}", Backslash:"|",
    Semicolon:":", Quote:'"', Comma:"<", Period:">", Slash:"?"
  };

  const RU_SHIFT = {
    Digit1:"!", Digit2:'"', Digit3:"№", Digit4:";", Digit5:"%", Digit6:":",
    Digit7:"?", Digit8:"*", Digit9:"(", Digit0:")",
    Minus:"_", Equal:"+", Slash:",", Backquote:"Ё"
  };

  // ========= layout (104-ish)
  const LAYOUT = [
    // Row 1
    [
      K("Escape","Esc"),
      S(0.6),
      K("F1","F1"),K("F2","F2"),K("F3","F3"),K("F4","F4"),
      S(0.35),
      K("F5","F5"),K("F6","F6"),K("F7","F7"),K("F8","F8"),
      S(0.35),
      K("F9","F9"),K("F10","F10"),K("F11","F11"),K("F12","F12"),
      S(0.35),
      K("PrintScreen","Prt"),K("ScrollLock","Scr"),K("Pause","Pause")
    ],

    // Row 2
    [
      K("Backquote","`","~"),
      K("Digit1","1","!"),K("Digit2","2","@"),K("Digit3","3","#"),K("Digit4","4","$"),K("Digit5","5","%"),
      K("Digit6","6","^"),K("Digit7","7","&"),K("Digit8","8","*"),K("Digit9","9","("),K("Digit0","0",")"),
      K("Minus","-","_"),K("Equal","=","+"),
      K("Backspace","Backspace","", "w2"),
      S(0.35),
      K("Insert","Ins"),K("Home","Home"),K("PageUp","PgUp"),
      S(0.35),
      K("NumLock","Num"),
      K("NumpadDivide","/"),K("NumpadMultiply","*"),K("NumpadSubtract","-")
    ],

    // Row 3
    [
      K("Tab","Tab","", "w1_5"),
      K("KeyQ","Q"),K("KeyW","W"),K("KeyE","E"),K("KeyR","R"),K("KeyT","T"),K("KeyY","Y"),K("KeyU","U"),K("KeyI","I"),K("KeyO","O"),K("KeyP","P"),
      K("BracketLeft","[","{"),K("BracketRight","]","}"),
      K("Backslash","\\","|","w1_5"),
      S(0.35),
      K("Delete","Del"),K("End","End"),K("PageDown","PgDn"),
      S(0.35),
      K("Numpad7","7"),K("Numpad8","8"),K("Numpad9","9"),
      K("NumpadAdd","+")
    ],

    // Row 4
    [
      K("CapsLock","Caps","", "w1_75"),
      K("KeyA","A"),K("KeyS","S"),K("KeyD","D"),K("KeyF","F"),K("KeyG","G"),K("KeyH","H"),K("KeyJ","J"),K("KeyK","K"),K("KeyL","L"),
      K("Semicolon","; ",":"),K("Quote","' ",'"'),
      K("Enter","Enter","", "w2_25"),
      S(0.35),
      S(1.55),               // место под стрелки (верхняя)
      S(0.35),
      K("Numpad4","4"),K("Numpad5","5"),K("Numpad6","6")
    ],

    // Row 5
    [
      K("ShiftLeft","Shift","", "w2_25"),
      K("KeyZ","Z"),K("KeyX","X"),K("KeyC","C"),K("KeyV","V"),K("KeyB","B"),K("KeyN","N"),K("KeyM","M"),
      K("Comma",",","<"),K("Period",".",">"),K("Slash","/","?"),
      K("ShiftRight","Shift","", "w2_75"),
      S(0.35),
      S(0.52),               // пусто слева от ArrowUp
      K("ArrowUp","▲"),
      S(0.52),               // пусто справа от ArrowUp
      S(0.35),
      K("Numpad1","1"),K("Numpad2","2"),K("Numpad3","3"),
      K("NumpadEnter","Enter")
    ],

    // Row 6
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
      K("ArrowLeft","◄"),
      K("ArrowDown","▼"),
      K("ArrowRight","►"),
      S(0.35),
      K("Numpad0","0","", "w2"),
      K("NumpadDecimal",".")
    ]
  ];

  function K(code, main, top="", sizeClass=""){
    return {type:"key", code, main, top, sizeClass};
  }
  function S(flex=1){
    return {type:"spacer", flex};
  }

  // ========= init UI from state
  applyTheme(THEME);
  syncTopbar();

  // ========= render keyboard
  renderKeyboard();
  applyKeyLegends();
  fitKeyboard();
  window.addEventListener("resize", () => fitKeyboard(), {passive:true});

  // focus indicator
  document.addEventListener("pointerdown", () => app.focus({preventScroll:true}), {passive:true});
  app.addEventListener("focus", () => badgeFocus.textContent = "focus: ok");
  app.addEventListener("blur", () => badgeFocus.textContent = "focus: no");
  badgeFocus.textContent = document.activeElement === app ? "focus: ok" : "focus: no";

  // offline indicator
  const updateOnline = () => {
    badgeOffline.textContent = `offline: ${navigator.onLine ? "no" : "yes"}`;
  };
  window.addEventListener("online", updateOnline);
  window.addEventListener("offline", updateOnline);
  updateOnline();

  // service worker (если есть)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // ========= buttons
  btnCapture.addEventListener("click", () => {
    CAPTURE = !CAPTURE;
    writeBool(LS.CAPTURE, CAPTURE);
    syncTopbar();
  });

  btnMode.addEventListener("click", () => {
    MODE = (MODE === "live") ? "latch" : "live";
    writeStr(LS.MODE, MODE);

    // если перешли в Live — чистим latch, чтобы не путалось
    if (MODE === "live") {
      latched.clear();
      keyboardEl.querySelectorAll(".key.is-latched").forEach(k => k.classList.remove("is-latched"));
      latchCountEl.textContent = "0";
    }
    syncTopbar();
  });

  btnClear.addEventListener("click", () => {
    down.clear();
    latched.clear();
    maxDown = 0;
    keyboardEl.querySelectorAll(".key").forEach(k => {
      k.classList.remove("is-down","is-latched");
    });
    downCountEl.textContent = "0";
    maxCountEl.textContent = "0";
    latchCountEl.textContent = "0";

    hudKey.textContent = "—";
    hudHint.textContent = "Нажми клавишу";
    metaKey.textContent = "—";
    metaCode.textContent = "—";
    metaKeyCode.textContent = "—";
    metaRepeat.textContent = "—";
  });

  btnLang.addEventListener("click", () => {
    UI_LANG = (UI_LANG === "ru") ? "en" : "ru";
    writeStr(LS.LANG, UI_LANG);
    syncTopbar();
    applyKeyLegends();
  });

  btnOS.addEventListener("click", () => {
    UI_OS = (UI_OS === "win") ? "mac" : "win";
    writeStr(LS.OS, UI_OS);
    syncTopbar();
    applyKeyLegends();
  });

  btnTheme.addEventListener("click", () => {
    THEME = (THEME === "night") ? "day" : "night";
    writeStr(LS.THEME, THEME);
    applyTheme(THEME);
    syncTopbar();
    // после смены темы иногда меняется рендер — подстрахуемся
    requestAnimationFrame(() => fitKeyboard());
  });

  btnFullscreen.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {}
  });

  btnHelp.addEventListener("click", () => openHelp(true));
  helpClose.addEventListener("click", () => openHelp(false));
  helpOk.addEventListener("click", () => openHelp(false));
  helpModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close === "1") openHelp(false);
  });

  window.addEventListener("keydown", (e) => {
    if (helpModal && !helpModal.hidden && e.key === "Escape") {
      openHelp(false);
      return;
    }
  });

  // ========= key events
  window.addEventListener("keydown", (e) => {
    if (shouldPrevent(e)) e.preventDefault();

    // pressed
    down.add(e.code);
    if (down.size > maxDown) maxDown = down.size;

    // latch mode
    if (MODE === "latch") {
      latched.add(e.code);
      const k = byCode(e.code);
      if (k) k.classList.add("is-latched");
      latchCountEl.textContent = String(latched.size);
    }

    // visual
    const keyEl = byCode(e.code);
    if (keyEl) keyEl.classList.add("is-down");

    // locks state
    updateLockVisual(e);

    // HUD
    const pretty = prettyKeyName(e);
    hudKey.textContent = pretty;
    hudHint.textContent = MODE === "latch" ? "Latch: подсветка сохранена" : "Live: держи клавишу";
    metaKey.textContent = (e.key ?? "—");
    metaCode.textContent = (e.code ?? "—");
    metaKeyCode.textContent = String(e.keyCode ?? "—");
    metaRepeat.textContent = e.repeat ? "yes" : "no";

    downCountEl.textContent = String(down.size);
    maxCountEl.textContent = String(maxDown);

    // live indicator
    liveDot.classList.add("live");
    liveText.textContent = "Live";
  }, {passive:false});

  window.addEventListener("keyup", (e) => {
    if (shouldPrevent(e)) e.preventDefault();

    down.delete(e.code);
    downCountEl.textContent = String(down.size);

    const keyEl = byCode(e.code);
    if (keyEl) keyEl.classList.remove("is-down");

    updateLockVisual(e);
  }, {passive:false});

  window.addEventListener("blur", () => {
    // убираем stuck pressed
    down.clear();
    keyboardEl.querySelectorAll(".key.is-down").forEach(k => k.classList.remove("is-down"));
    downCountEl.textContent = "0";
  });

  // ========= functions
  function renderKeyboard(){
    keyboardEl.innerHTML = "";
    LAYOUT.forEach((row) => {
      const r = document.createElement("div");
      r.className = "kRow";

      row.forEach((item) => {
        if (item.type === "spacer") {
          const sp = document.createElement("div");
          sp.className = "spacer";
          sp.style.flex = String(item.flex);
          r.appendChild(sp);
          return;
        }

        const k = document.createElement("div");
        k.className = "key" + (item.sizeClass ? " " + item.sizeClass : "");
        k.dataset.code = item.code;

        const top = document.createElement("div");
        top.className = "kTop";

        const main = document.createElement("div");
        main.className = "kMain";

        const code = document.createElement("div");
        code.className = "kCode";

        top.textContent = item.top || "";
        main.textContent = item.main || "";
        code.textContent = item.code;

        k.appendChild(top);
        k.appendChild(main);
        k.appendChild(code);

        r.appendChild(k);
      });

      keyboardEl.appendChild(r);
    });
  }

  function byCode(code){
    return keyboardEl.querySelector(`.key[data-code="${cssEscape(code)}"]`);
  }

  function applyKeyLegends(){
    keyboardEl.querySelectorAll(".key[data-code]").forEach((k) => {
      const code = k.dataset.code;
      const topEl = k.querySelector(".kTop");
      const mainEl = k.querySelector(".kMain");

      // OS labels
      if (code === "MetaLeft" || code === "MetaRight"){
        mainEl.textContent = (UI_OS === "mac") ? "⌘" : "Win";
        topEl.textContent = "";
        return;
      }
      if (code === "AltLeft" || code === "AltRight"){
        mainEl.textContent = (UI_OS === "mac") ? "⌥" : "Alt";
        topEl.textContent = "";
        return;
      }

      // letters
      if (code.startsWith("Key")){
        const letter = code.replace("Key","");
        if (UI_LANG === "ru"){
          mainEl.textContent = RU[code] || letter;
        } else {
          mainEl.textContent = letter;
        }
        topEl.textContent = "";
        return;
      }

      // digits
      if (code.startsWith("Digit")){
        const d = code.replace("Digit","");
        mainEl.textContent = d;
        const topMap = (UI_LANG === "ru") ? RU_SHIFT : EN_SHIFT;
        topEl.textContent = topMap[code] || "";
        return;
      }

      // punctuation top labels
      const topMap = (UI_LANG === "ru") ? RU_SHIFT : EN_SHIFT;
      if (topMap[code]) topEl.textContent = topMap[code];

      // backquote RU main
      if (UI_LANG === "ru" && code === "Backquote"){
        mainEl.textContent = RU.Backquote;
      }
    });
  }

  function fitKeyboard(){
    // на всякий: если клавиатура ещё не в DOM
    if (!keyboardEl || !kbViewport || !kbScale) return;

    // reset transform, чтобы корректно измерить базовые размеры
    kbScale.style.transform = "scale(1)";

    // размеры клавиатуры без скейла
    const kbW = keyboardEl.scrollWidth;
    const kbH = keyboardEl.scrollHeight;

    const pad = 18; // внутренний воздух
    const availW = kbViewport.clientWidth - pad * 2;
    const availH = kbViewport.clientHeight - pad * 2;

    if (kbW <= 0 || kbH <= 0 || availW <= 0 || availH <= 0) return;

    // scale to fit, но можно чуть увеличивать (чтобы выглядело "на весь экран")
    const raw = Math.min(availW / kbW, availH / kbH);
    const scale = clamp(raw, 0.50, 1.12);

    kbScale.style.transform = `scale(${scale})`;
  }

  function shouldPrevent(e){
    if (!CAPTURE) return false;

    const preventCodes = new Set([
      "Space",
      "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
      "PageUp","PageDown","Home","End"
    ]);

    // в capture глушим хоткеи браузера по ctrl/meta
    if (e.ctrlKey || e.metaKey) return true;
    return preventCodes.has(e.code);
  }

  function prettyKeyName(e){
    if (!e) return "—";
    if (e.key && e.key.length === 1) return e.key.toUpperCase();
    if (e.key && e.key !== "Unidentified") return e.key;
    return e.code || "—";
  }

  function updateLockVisual(e){
    try {
      const capsOn = e.getModifierState && e.getModifierState("CapsLock");
      const numOn  = e.getModifierState && e.getModifierState("NumLock");

      const caps = byCode("CapsLock");
      const num = byCode("NumLock");

      if (caps) caps.classList.toggle("is-lock-on", !!capsOn);
      if (num) num.classList.toggle("is-lock-on", !!numOn);
    } catch {}
  }

  function openHelp(show){
    helpModal.hidden = !show;
    helpModal.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function applyTheme(theme){
    document.documentElement.dataset.theme = theme;
  }

  function syncTopbar(){
    // Capture
    btnCapture.classList.toggle("is-on", CAPTURE);
    btnCapture.textContent = `Capture: ${CAPTURE ? "ON" : "OFF"}`;

    // Mode
    const isLatch = MODE === "latch";
    btnMode.textContent = `Mode: ${isLatch ? "Latch" : "Live"}`;
    badgeMode.textContent = isLatch ? "LATCH" : "LIVE";

    // Lang/OS/Theme labels
    btnLang.textContent = UI_LANG.toUpperCase();
    btnOS.textContent = (UI_OS === "mac") ? "Mac" : "Windows";
    btnTheme.textContent = `Theme: ${THEME === "day" ? "Day" : "Night"}`;
  }

  // ========= localStorage utils
  function readStr(key, fallback){
    try{
      const v = localStorage.getItem(key);
      return (v === null || v === undefined || v === "") ? fallback : v;
    }catch{
      return fallback;
    }
  }
  function writeStr(key, val){
    try{ localStorage.setItem(key, String(val)); }catch{}
  }
  function readBool(key, fallback){
    const v = readStr(key, "");
    if (v === "") return fallback;
    return v === "1" || v === "true" || v === "yes";
  }
  function writeBool(key, val){
    writeStr(key, val ? "1" : "0");
  }
  function prefersDay(){
    try{
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    }catch{
      return false;
    }
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  // css escape for dataset selectors
  function cssEscape(s){
    // minimal safe escape
    return String(s).replace(/"/g, '\\"');
  }

})();
