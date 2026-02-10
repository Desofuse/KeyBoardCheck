(() => {
  // ===== DOM =====
  const viewport  = document.getElementById("viewport");
  const scaleWrap = document.getElementById("scaleWrap");
  const keyboard  = document.getElementById("keyboard");

  const captureBtn = document.getElementById("captureBtn");
  const helpBtn = document.getElementById("helpBtn");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("closeBtn");

  const hudKey = document.getElementById("hudKey");
  const hudCode = document.getElementById("hudCode");
  const hudDown = document.getElementById("hudDown");
  const hudScale = document.getElementById("hudScale");

  // ===== State =====
  let CAPTURE = true;
  const down = new Set();

  // ===== Helpers for layout =====
  const K = (code, main, top = "", cls = "") => ({ t:"k", code, main, top, cls });
  const S = (flex = 1) => ({ t:"s", flex });

  // ANSI 104 + nav + arrows + numpad
  const LAYOUT = [
    [
      K("Escape","Esc"),
      S(0.6),
      K("F1","F1"),K("F2","F2"),K("F3","F3"),K("F4","F4"),
      S(0.35),
      K("F5","F5"),K("F6","F6"),K("F7","F7"),K("F8","F8"),
      S(0.35),
      K("F9","F9"),K("F10","F10"),K("F11","F11"),K("F12","F12"),
      S(0.35),
      K("PrintScreen","Prt"),K("ScrollLock","Scr"),K("Pause","Pause"),
    ],
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
      K("NumpadDivide","/"),K("NumpadMultiply","*"),K("NumpadSubtract","-"),
    ],
    [
      K("Tab","Tab","", "w1_5"),
      K("KeyQ","Q"),K("KeyW","W"),K("KeyE","E"),K("KeyR","R"),K("KeyT","T"),K("KeyY","Y"),K("KeyU","U"),K("KeyI","I"),K("KeyO","O"),K("KeyP","P"),
      K("BracketLeft","[","{"),K("BracketRight","]","}"),
      K("Backslash","\\","|", "w1_5"),
      S(0.35),
      K("Delete","Del"),K("End","End"),K("PageDown","PgDn"),
      S(0.35),
      K("Numpad7","7"),K("Numpad8","8"),K("Numpad9","9"),
      K("NumpadAdd","+"),
    ],
    [
      K("CapsLock","Caps","", "w1_75"),
      K("KeyA","A"),K("KeyS","S"),K("KeyD","D"),K("KeyF","F"),K("KeyG","G"),K("KeyH","H"),K("KeyJ","J"),K("KeyK","K"),K("KeyL","L"),
      K("Semicolon","; ",":"),K("Quote","' ",'"'),
      K("Enter","Enter","", "w2_25"),
      S(0.35),
      S(2.2), /* место под навигацию (пусто, чтобы сетка совпала) */
      S(0.35),
      K("Numpad4","4"),K("Numpad5","5"),K("Numpad6","6"),
      K("NumpadAdd","+"),
    ],
    [
      K("ShiftLeft","Shift","", "w2_25"),
      K("KeyZ","Z"),K("KeyX","X"),K("KeyC","C"),K("KeyV","V"),K("KeyB","B"),K("KeyN","N"),K("KeyM","M"),
      K("Comma",",","<"),K("Period",".",">"),K("Slash","/","?"),
      K("ShiftRight","Shift","", "w2_75"),
      S(0.35),
      S(1.0),K("ArrowUp","▲"),S(1.0),
      S(0.35),
      K("Numpad1","1"),K("Numpad2","2"),K("Numpad3","3"),
      K("NumpadEnter","Enter"),
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
      K("ArrowLeft","◄"),K("ArrowDown","▼"),K("ArrowRight","►"),
      S(0.35),
      K("Numpad0","0","", "w2"),
      K("NumpadDecimal","."),
      K("NumpadEnter","Enter"),
    ],
  ];

  // ===== Render =====
  function render() {
    keyboard.innerHTML = "";
    for (const row of LAYOUT) {
      const r = document.createElement("div");
      r.className = "row";
      for (const it of row) {
        if (it.t === "s") {
          const sp = document.createElement("div");
          sp.className = "spacer";
          sp.style.flex = String(it.flex);
          r.appendChild(sp);
          continue;
        }
        const k = document.createElement("div");
        k.className = `key ${it.cls || ""}`.trim();
        k.dataset.code = it.code;

        const top = document.createElement("div");
        top.className = "kTop";
        top.textContent = it.top || "";

        const main = document.createElement("div");
        main.className = "kMain";
        main.textContent = it.main || "";

        const code = document.createElement("div");
        code.className = "kCode";
        code.textContent = it.code;

        k.appendChild(top);
        k.appendChild(main);
        k.appendChild(code);

        r.appendChild(k);
      }
      keyboard.appendChild(r);
    }
    fitToScreen();
  }

  function keyEl(code) {
    return keyboard.querySelector(`[data-code="${CSS.escape(code)}"]`);
  }

  // ===== Fullscreen fit (NO SCROLL) =====
  function fitToScreen() {
    // размеры клавиатуры без трансформа
    const w = keyboard.offsetWidth;
    const h = keyboard.offsetHeight;

    const vw = viewport.clientWidth - 20;
    const vh = viewport.clientHeight - 20;

    if (!w || !h || !vw || !vh) return;

    let scale = Math.min(vw / w, vh / h);

    // можно чуть увеличить на больших экранах, чтобы реально "на весь экран"
    scale = Math.max(0.35, Math.min(scale, 1.6));

    scaleWrap.style.transform = `scale(${scale})`;
    hudScale.textContent = `${Math.round(scale * 100)}%`;
  }

  const ro = new ResizeObserver(() => fitToScreen());
  ro.observe(viewport);
  window.addEventListener("resize", fitToScreen);

  // ===== Capture mode =====
  function shouldPrevent(e) {
    if (!CAPTURE) return false;

    // глушим браузерные хоткеи
    if (e.ctrlKey || e.metaKey) return true;

    // и скролл/пейджинг
    const block = new Set([
      "Space",
      "ArrowUp","ArrowDown","ArrowLeft","ArrowRight",
      "PageUp","PageDown","Home","End"
    ]);
    return block.has(e.code);
  }

  function updateHud(e) {
    const keyText = (e.key && e.key.length === 1) ? e.key.toUpperCase() : (e.key || "—");
    hudKey.textContent = keyText;
    hudCode.textContent = e.code || "—";
    hudDown.textContent = String(down.size);
  }

  function syncLocks(e) {
    // подсветка Caps/Num если включены
    try {
      const capsOn = e.getModifierState && e.getModifierState("CapsLock");
      const numOn = e.getModifierState && e.getModifierState("NumLock");

      const caps = keyEl("CapsLock");
      const num = keyEl("NumLock");

      if (caps) caps.classList.toggle("lockOn", !!capsOn);
      if (num) num.classList.toggle("lockOn", !!numOn);
    } catch {}
  }

  // ===== Events =====
  window.addEventListener("keydown", (e) => {
    if (shouldPrevent(e)) e.preventDefault();

    down.add(e.code);

    const el = keyEl(e.code);
    if (el) el.classList.add("pressed");

    updateHud(e);
    syncLocks(e);
  }, { passive:false });

  window.addEventListener("keyup", (e) => {
    if (shouldPrevent(e)) e.preventDefault();

    down.delete(e.code);

    const el = keyEl(e.code);
    if (el) el.classList.remove("pressed");

    hudDown.textContent = String(down.size);
    syncLocks(e);
  }, { passive:false });

  window.addEventListener("blur", () => {
    for (const c of down) {
      const el = keyEl(c);
      if (el) el.classList.remove("pressed");
    }
    down.clear();
    hudDown.textContent = "0";
  });

  // ===== Help overlay =====
  function openHelp(on) {
    overlay.hidden = !on;
  }
  helpBtn.addEventListener("click", () => openHelp(true));
  closeBtn.addEventListener("click", () => openHelp(false));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) openHelp(false);
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && !overlay.hidden) openHelp(false);
    if (e.code === "KeyH") {
      // H — toggle help
      openHelp(overlay.hidden);
    }
  });

  // ===== Buttons =====
  captureBtn.classList.add("on");
  captureBtn.addEventListener("click", () => {
    CAPTURE = !CAPTURE;
    captureBtn.classList.toggle("on", CAPTURE);
    captureBtn.textContent = `Capture: ${CAPTURE ? "ON" : "OFF"}`;
  });

  // ===== Service worker =====
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // init
  render();
})();
