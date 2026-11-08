/* Bulls and Cows — crack the secret 4-digit code (distinct digits) in ≤10 guesses. */
(function () {
  const CODE_LEN = 4;
  const MAX_GUESSES = 10;
  const MAX_HINTS = 2;

  function makeSecret() {
    const d = "0123456789".split("");
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d.slice(0, CODE_LEN).join("");
  }

  let live = null;
  GameRegistry.register({
    id: "bullscows",
    name: "Bulls and Cows",
    icon: "🐂",
    category: "logic",
    description: "Crack the 4-digit code — bulls: right digit right place, cows: right digit wrong place",
    tags: ["logic", "numbers", "deduction", "codebreaking"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let secret = "", typed = "", over = false, guesses = 0;
      let hintsLeft = MAX_HINTS;
      let revealed = {}; // position index -> digit (from hints)

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Guesses</div><div class="val" id="bc-guesses">0/${MAX_GUESSES}</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="bc-hints">${MAX_HINTS}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bc-best">—</div></div>
        </div>
        <div class="status info" id="bc-status">Crack the secret code! 🐂 bulls = right digit in the right place, 🐄 cows = right digit in the wrong place.</div>
        <div class="center" style="margin:14px 0 4px;"><div class="bc-secret" id="bc-secret"></div></div>
        <div class="center text-muted text-sm">secret code</div>
        <div class="center" style="margin:12px 0;"><div class="bc-slots" id="bc-slots"></div></div>
        <div class="center" style="margin:10px 0 6px;"><div class="bc-pad" id="bc-pad"></div></div>
        <div class="center"><div class="row" style="gap:8px;">
          <button class="btn" id="bc-del">⌫ Delete</button>
          <button class="btn primary" id="bc-ok">Check ⏎</button>
        </div></div>
        <div class="bc-history" id="bc-history"></div>
        <p class="hint">The code has <b>4 different digits</b> (0–9). Type digits and press <b>Enter</b> to check. Win within <b>${MAX_GUESSES} guesses</b>. <b>Hint</b> reveals one digit's position (max ${MAX_HINTS}).</p>
      `;

      const statusEl = root.querySelector("#bc-status");
      const secretEl = root.querySelector("#bc-secret");
      const slotsEl = root.querySelector("#bc-slots");
      const padEl = root.querySelector("#bc-pad");
      const historyEl = root.querySelector("#bc-history");

      if (!document.getElementById("bc-style")) {
        const s = document.createElement("style");
        s.id = "bc-style";
        s.textContent = `
          .bc-secret, .bc-slots { display: inline-flex; gap: 8px; }
          .bc-digit { width: 46px; height: 54px; border-radius: 10px; background: var(--bg-elev); border: 2px solid var(--border-strong); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 800; font-size: 1.5rem; color: var(--text); }
          .bc-digit.shown { background: var(--accent); border-color: var(--accent); color: #fff; }
          .bc-slot { width: 46px; height: 54px; border-radius: 10px; background: var(--bg-soft); border: 2px dashed var(--border-strong); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 800; font-size: 1.5rem; color: var(--text); }
          .bc-slots.bc-shake { animation: bc-shake 0.4s; }
          @keyframes bc-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
          .bc-pad { display: grid; grid-template-columns: repeat(5, 54px); gap: 6px; justify-content: center; }
          .bc-key { width: 54px; height: 48px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; cursor: pointer; }
          .bc-key:hover:not(:disabled) { border-color: var(--accent); }
          .bc-key:disabled { opacity: 0.35; cursor: default; }
          .bc-history { max-width: 340px; margin: 16px auto 0; display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; }
          .bc-hrow { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 8px 12px; font-family: var(--font-mono); }
          .bc-hrow .g { font-size: 1.2rem; font-weight: 800; letter-spacing: 0.25em; }
          .bc-hrow .fb { font-size: 0.85rem; color: var(--text-muted); white-space: nowrap; }
          .bc-hrow .fb b.b { color: var(--success); }
          .bc-hrow .fb b.c { color: var(--warning); }
          .bc-hrow.win { border-color: var(--success); }
        `;
        document.head.appendChild(s);
      }

      function renderSecret() {
        secretEl.innerHTML = "";
        for (let i = 0; i < CODE_LEN; i++) {
          const d = document.createElement("div");
          d.className = "bc-digit" + (over || revealed[i] !== undefined ? " shown" : "");
          d.textContent = (over || revealed[i] !== undefined) ? secret[i] : "?";
          secretEl.appendChild(d);
        }
      }

      function renderSlots() {
        slotsEl.innerHTML = "";
        for (let i = 0; i < CODE_LEN; i++) {
          const d = document.createElement("div");
          d.className = "bc-slot";
          d.textContent = typed[i] || "";
          slotsEl.appendChild(d);
        }
      }

      function renderPad() {
        padEl.innerHTML = "";
        for (let n = 0; n <= 9; n++) {
          const b = document.createElement("button");
          b.className = "bc-key";
          b.textContent = n;
          b.disabled = over;
          b.addEventListener("click", () => addDigit(String(n)));
          padEl.appendChild(b);
        }
      }

      function renderHistory() {
        historyEl.innerHTML = "";
        for (let i = history.length - 1; i >= 0; i--) {
          const h = history[i];
          const row = document.createElement("div");
          row.className = "bc-hrow" + (h.g === secret ? " win" : "");
          row.innerHTML = '<span class="g">' + h.g.split("").join(" ") + "</span>" +
            '<span class="fb">🐂 <b class="b">' + h.bulls + "</b> &nbsp; 🐄 <b class=\"c\">" + h.cows + "</b></span>";
          historyEl.appendChild(row);
        }
      }

      let history = [];

      function addDigit(d) {
        if (over) return;
        if (typed.length >= CODE_LEN) return;
        if (typed.includes(d)) {
          AudioFX.error();
          App.toast("Digits must be different — " + d + " is already used", "warning");
          slotsEl.classList.add("bc-shake");
          setTimeout(() => {
            if (alive) slotsEl.classList.remove("bc-shake");
          }, 450);
          return;
        }
        typed += d;
        AudioFX.tick();
        renderSlots();
      }

      function delDigit() {
        if (over || !typed.length) return;
        typed = typed.slice(0, -1);
        AudioFX.click();
        renderSlots();
      }

      function check() {
        if (over) return;
        if (typed.length !== CODE_LEN) {
          App.toast("Enter all " + CODE_LEN + " digits first", "info");
          return;
        }
        let bulls = 0, cows = 0;
        for (let i = 0; i < CODE_LEN; i++) {
          if (typed[i] === secret[i]) bulls++;
          else if (secret.includes(typed[i])) cows++;
        }
        guesses++;
        history.push({g: typed, bulls, cows});
        root.querySelector("#bc-guesses").textContent = guesses + "/" + MAX_GUESSES;
        renderHistory();

        if (typed === secret) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Cracked it! The code was " + secret.split("").join(" ") + " — " + guesses + " guess" + (guesses === 1 ? "" : "es") + ".";
          statusEl.className = "status win";
          renderSecret();
          renderSlots();
          renderPad();
          const score = Math.max(10, 110 - guesses * 10);
          App.recordResult(true, score);
          const best = Storage.getBest("bullscows");
          if (!best || guesses < best) {
            Storage.setBest("bullscows", guesses);
            root.querySelector("#bc-best").textContent = guesses;
            App.toast("New best: " + guesses + " guesses", "success");
          }
          return;
        }

        if (guesses >= MAX_GUESSES) {
          over = true;
          AudioFX.lose();
          statusEl.textContent = "Out of guesses — the code was " + secret.split("").join(" ") + ".";
          statusEl.className = "status lose";
          renderSecret();
          renderSlots();
          renderPad();
          App.recordResult(false, 0);
          return;
        }

        AudioFX.flip();
        statusEl.textContent = "🐂 " + bulls + " bull" + (bulls === 1 ? "" : "s") + ", 🐄 " + cows + " cow" + (cows === 1 ? "" : "s") + " — try again!";
        statusEl.className = "status info";
        typed = "";
        renderSlots();
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        const open = [];
        for (let i = 0; i < CODE_LEN; i++) if (revealed[i] === undefined) open.push(i);
        if (!open.length) {
          App.toast("Every position is already revealed", "info");
          return;
        }
        const pos = open[Math.floor(Math.random() * open.length)];
        revealed[pos] = secret[pos];
        hintsLeft--;
        root.querySelector("#bc-hints").textContent = hintsLeft;
        AudioFX.reveal();
        renderSecret();
        App.toast("Position " + (pos + 1) + " is " + secret[pos], "info");
      }

      function doSolve() {
        if (over) return;
        over = true;
        AudioFX.lose();
        statusEl.textContent = "The code was " + secret.split("").join(" ") + ".";
        statusEl.className = "status lose";
        renderSecret();
        renderSlots();
        renderPad();
        App.recordResult(false, 0);
      }

      function onKey(e) {
        if (over) return;
        if (/^[0-9]$/.test(e.key)) {
          addDigit(e.key);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          delDigit();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          check();
        }
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#bc-del").addEventListener("click", delDigit);
      root.querySelector("#bc-ok").addEventListener("click", check);

      function newGame() {
        secret = makeSecret();
        typed = "";
        history = [];
        guesses = 0;
        over = false;
        hintsLeft = MAX_HINTS;
        revealed = {};
        root.querySelector("#bc-guesses").textContent = "0/" + MAX_GUESSES;
        root.querySelector("#bc-hints").textContent = hintsLeft;
        const best = Storage.getBest("bullscows");
        root.querySelector("#bc-best").textContent = best ? best + " tries" : "—";
        statusEl.textContent = "Crack the secret code! 🐂 bulls = right digit in the right place, 🐄 cows = right digit in the wrong place.";
        statusEl.className = "status info";
        renderSecret();
        renderSlots();
        renderPad();
        renderHistory();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Bulls and Cows",
        `The computer picks a secret code of <b>4 different digits</b> (0–9).
        <br><br>• Enter a 4-digit guess (all digits must be different).
        <br>• 🐂 <b>Bulls</b> — right digit in the <b>right position</b>.
        <br>• 🐄 <b>Cows</b> — right digit in the <b>wrong position</b>.
        <br>• Use the feedback to deduce the code in <b>10 guesses or fewer</b>.
        <br><br>Type digits on your keyboard or tap the pad; <b>Enter</b> checks, <b>Backspace</b> deletes.
        <br><br><b>Hint</b> reveals one digit's exact position (max 2). <b>Solve</b> gives up and shows the code.`);
    },
  });
})();
