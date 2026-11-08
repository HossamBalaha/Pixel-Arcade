/* Mastermind Classic — the original 1970s peg-board code-breaking game.
   The secret is 4 pegs drawn from 6 colors (repeats allowed). Each turn you
   build a row of 4 pegs and press Check: small black pegs mark right color in
   the right position, small white pegs mark right color in the wrong
   position. Crack the code within 10 rows. (Distinct from js/games/
   mastermind.js — the 8-row letter-style variant — this is the classic
   10-row board with always-allowed duplicate colors.) */
(function () {
  "use strict";

  const COLORS = [
    {name: "Red", hex: "#e0453a"},
    {name: "Blue", hex: "#3272c6"},
    {name: "Green", hex: "#2f9e55"},
    {name: "Yellow", hex: "#e2b422"},
    {name: "Orange", hex: "#e2712b"},
    {name: "Purple", hex: "#8451c4"},
  ];
  const SLOTS = 4;
  const ROWS = 10;
  const MAX_HINTS = 2;

  // Standard Mastermind feedback: black = right color & position,
  // white = right color & wrong position; each secret peg is matched at most once.
  function evaluate(guess, secret) {
    let black = 0, white = 0;
    const s = secret.slice(), g = guess.slice();
    for (let i = 0; i < g.length; i++) {
      if (g[i] !== null && g[i] === s[i]) {
        black++;
        g[i] = null;
        s[i] = null;
      }
    }
    for (let i = 0; i < g.length; i++) {
      if (g[i] === null) continue;
      const j = s.indexOf(g[i]);
      if (j !== -1) {
        white++;
        s[j] = null;
      }
    }
    return {black, white};
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "mastermindclassic",
    name: "Mastermind Classic",
    icon: "🎨",
    category: "logic",
    description: "Original 1970s peg board: crack the 4-peg code (6 colors, repeats allowed) in 10 rows using black & white feedback pegs",
    tags: ["logic", "classic", "deduction", "board", "codebreaking"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let secret = [], guesses = [], current = Array(SLOTS).fill(null);
      let over = false, hintsUsed = 0, lastColor = null;

      if (!document.getElementById("mmc-style")) {
        const s = document.createElement("style");
        s.id = "mmc-style";
        s.textContent = `
          .mmc-secret { display:flex; align-items:center; justify-content:center; gap:12px; margin:10px 0 4px; }
          .mmc-secret .label { font-size:0.8rem; color:var(--text-muted); letter-spacing:0.05em; }
          .mmc-secret .pegs { display:flex; gap:6px; }
          .mmc-board { display:flex; flex-direction:column; gap:4px; margin:10px auto; width:max-content; max-width:100%; }
          .mmc-row { display:flex; align-items:center; gap:10px; padding:4px 8px; border-radius:var(--radius); background:var(--bg-elev); }
          .mmc-row.active { outline:2px solid var(--accent); }
          .mmc-num { width:20px; text-align:right; font-family:var(--font-mono); font-size:0.7rem; color:var(--text-muted); flex:none; }
          .mmc-pegs { display:flex; gap:6px; }
          .mmc-peg { width:32px; height:32px; border-radius:50%; flex:none; background:var(--bg-soft); border:2px solid var(--border); box-shadow:inset 0 2px 4px rgba(0,0,0,0.25); display:grid; place-items:center; font-family:var(--font-mono); font-weight:700; color:var(--text-muted); font-size:0.9rem; padding:0; }
          .mmc-peg.filled { border-color:rgba(0,0,0,0.25); box-shadow:inset 0 -3px 5px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.3); color:transparent; }
          button.mmc-peg { cursor:pointer; }
          button.mmc-peg:disabled { cursor:default; }
          .mmc-row.active .mmc-peg:not(.filled) { border-style:dashed; border-color:var(--accent); }
          .mmc-fb { display:grid; grid-template-columns:repeat(2, 11px); gap:3px; margin-left:2px; flex:none; }
          .mmc-fbpeg { width:11px; height:11px; border-radius:50%; }
          .mmc-fbpeg.b { background:#161616; border:1px solid #7a7a7a; }
          .mmc-fbpeg.w { background:#f6f6f6; border:1px solid #8a8a8a; }
          .mmc-palette { display:flex; justify-content:center; align-items:flex-start; gap:14px; flex-wrap:wrap; margin:14px 0 20px; }
          .mmc-color { width:44px; height:44px; border-radius:50%; border:2px solid rgba(0,0,0,0.25); cursor:pointer; box-shadow:inset 0 -4px 6px rgba(0,0,0,0.3); position:relative; padding:0; }
          .mmc-color i { position:absolute; top:-6px; right:-6px; font-style:normal; font-size:0.6rem; line-height:1; background:var(--bg-elev); border:1px solid var(--border); border-radius:4px; padding:2px 3px; color:var(--text-muted); font-family:var(--font-mono); }
          @keyframes mmc-shake {0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
          .mmc-shake { animation: mmc-shake 0.3s; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Row</div><div class="val" id="mmc-row-num">1/10</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="mmc-hints">2</div></div>
          <div class="score-cell"><div class="label">Best score</div><div class="val" id="mmc-best">—</div></div>
        </div>
        <div class="status info" id="mmc-status">Build a row of 4 pegs, then press Check.</div>
        <div class="mmc-secret">
          <span class="label">SECRET CODE</span>
          <span class="pegs" id="mmc-secret"></span>
        </div>
        <div class="mmc-board" id="mmc-board"></div>
        <div class="mmc-palette" id="mmc-palette"></div>
        <div class="row" style="justify-content:center; gap:8px;">
          <button class="btn" id="mmc-clear">Clear row</button>
          <button class="btn primary" id="mmc-check">Check</button>
          <button class="btn" id="mmc-new">New game</button>
        </div>
        <p class="hint">⚫ Black peg = right color, right position. ⚪ White peg = right color, wrong position. Colors may repeat. Keyboard: <b>1–6</b> place colors, <b>Backspace</b> removes a peg, <b>Enter</b> checks.</p>
      `;

      const statusEl = root.querySelector("#mmc-status");
      const boardEl = root.querySelector("#mmc-board");
      const palEl = root.querySelector("#mmc-palette");
      const secretEl = root.querySelector("#mmc-secret");
      const checkBtn = root.querySelector("#mmc-check");
      const clearBtn = root.querySelector("#mmc-clear");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + cls;
      }

      function newGame() {
        secret = Array.from({length: SLOTS}, () => Math.floor(Math.random() * COLORS.length));
        guesses = [];
        current = Array(SLOTS).fill(null);
        over = false;
        hintsUsed = 0;
        lastColor = null;
        const best = Storage.getBest("mastermindclassic");
        root.querySelector("#mmc-best").textContent = best != null ? best : "—";
        setStatus("Build a row of 4 pegs, then press Check.", "info");
        render();
      }

      function renderSecret() {
        secretEl.innerHTML = "";
        for (let i = 0; i < SLOTS; i++) {
          const p = document.createElement("div");
          p.className = "mmc-peg";
          if (over) {
            p.classList.add("filled");
            p.style.background = COLORS[secret[i]].hex;
          } else {
            p.textContent = "?";
          }
          secretEl.appendChild(p);
        }
      }

      function render() {
        renderSecret();

        boardEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) {
          const row = document.createElement("div");
          row.className = "mmc-row" + (r === guesses.length && !over ? " active" : "");

          const num = document.createElement("div");
          num.className = "mmc-num";
          num.textContent = r + 1;
          row.appendChild(num);

          const pegs = document.createElement("div");
          pegs.className = "mmc-pegs";
          for (let i = 0; i < SLOTS; i++) {
            const peg = document.createElement("button");
            peg.type = "button";
            peg.className = "mmc-peg";
            peg.setAttribute("aria-label", "Row " + (r + 1) + " peg " + (i + 1));
            if (r < guesses.length) {
              peg.classList.add("filled");
              peg.style.background = COLORS[guesses[r].guess[i]].hex;
              peg.disabled = true;
            } else if (r === guesses.length && !over) {
              if (current[i] !== null) {
                peg.classList.add("filled");
                peg.style.background = COLORS[current[i]].hex;
                peg.title = "Tap to remove";
              }
              peg.addEventListener("click", () => {
                if (over) return;
                if (current[i] !== null) {
                  current[i] = null;
                  AudioFX.click();
                  render();
                } else if (lastColor !== null) {
                  current[i] = lastColor;
                  AudioFX.place();
                  render();
                }
              });
            } else {
              peg.disabled = true;
            }
            pegs.appendChild(peg);
          }
          row.appendChild(pegs);

          const fb = document.createElement("div");
          fb.className = "mmc-fb";
          if (r < guesses.length) {
            const ev = guesses[r].eval;
            for (let k = 0; k < ev.black; k++) {
              const f = document.createElement("div");
              f.className = "mmc-fbpeg b";
              f.title = "Black: right color, right position";
              fb.appendChild(f);
            }
            for (let k = 0; k < ev.white; k++) {
              const f = document.createElement("div");
              f.className = "mmc-fbpeg w";
              f.title = "White: right color, wrong position";
              fb.appendChild(f);
            }
          }
          row.appendChild(fb);
          boardEl.appendChild(row);
        }

        palEl.innerHTML = "";
        if (!over && guesses.length < ROWS) {
          COLORS.forEach((c, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "mmc-color";
            b.style.background = c.hex;
            b.title = c.name + " (key " + (i + 1) + ")";
            const key = document.createElement("i");
            key.textContent = i + 1;
            b.appendChild(key);
            b.addEventListener("click", () => placeColor(i));
            palEl.appendChild(b);
          });
        }

        const rowFull = current.every(x => x !== null);
        checkBtn.disabled = over || guesses.length >= ROWS || !rowFull;
        clearBtn.disabled = over || guesses.length >= ROWS || current.every(x => x === null);
        root.querySelector("#mmc-row-num").textContent = Math.min(guesses.length + (over ? 0 : 1), ROWS) + "/" + ROWS;
        root.querySelector("#mmc-hints").textContent = (MAX_HINTS - hintsUsed);
      }

      function placeColor(i) {
        if (over || guesses.length >= ROWS) return;
        lastColor = i;
        for (let k = 0; k < SLOTS; k++) {
          if (current[k] === null) {
            current[k] = i;
            AudioFX.place();
            render();
            return;
          }
        }
        setStatus("Row is full — press Check, or tap a peg to remove it.", "info");
      }

      function check() {
        if (over || guesses.length >= ROWS) return;
        if (!current.every(x => x !== null)) {
          setStatus("Fill all 4 pegs before checking.", "info");
          AudioFX.error();
          boardEl.children[guesses.length].classList.remove("mmc-shake");
          void boardEl.children[guesses.length].offsetWidth;
          boardEl.children[guesses.length].classList.add("mmc-shake");
          return;
        }
        const ev = evaluate(current, secret);
        guesses.push({guess: current.slice(), eval: ev});
        current = Array(SLOTS).fill(null);
        AudioFX.flip();

        if (ev.black === SLOTS) {
          over = true;
          const score = ROWS + 1 - guesses.length; // 10 for a first-row crack
          AudioFX.win();
          setStatus("🎉 Cracked the code in " + guesses.length + (guesses.length === 1 ? " row" : " rows") + " — score " + score + "!", "win");
          if (Storage.submitScore("mastermindclassic", score)) {
            App.toast("New best score: " + score, "success");
          }
          const best = Storage.getBest("mastermindclassic");
          root.querySelector("#mmc-best").textContent = best != null ? best : "—";
          App.recordResult(true, score);
        } else if (guesses.length >= ROWS) {
          over = true;
          AudioFX.lose();
          setStatus("Out of rows. The code was: " + secret.map(i => COLORS[i].name).join(", ") + ".", "lose");
          App.recordResult(false, 0);
        } else {
          setStatus("Row " + guesses.length + ": " + ev.black + " black, " + ev.white + " white. Next guess — row " + (guesses.length + 1) + " of " + ROWS + ".", "info");
        }
        render();
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast("No hints left (max " + MAX_HINTS + " per game)", "warning");
          return;
        }
        // Prefer a position never exactly matched in any previous guess.
        const discovered = new Set();
        for (const g of guesses) {
          for (let i = 0; i < SLOTS; i++) if (g.guess[i] === secret[i]) discovered.add(i);
        }
        const unknown = [];
        for (let i = 0; i < SLOTS; i++) if (!discovered.has(i)) unknown.push(i);
        const p = unknown.length ? unknown[Math.floor(Math.random() * unknown.length)]
          : Math.floor(Math.random() * SLOTS);
        hintsUsed++;
        const color = COLORS[secret[p]];
        if (current[p] === null) {
          current[p] = secret[p];
          lastColor = secret[p];
        }
        AudioFX.reveal();
        App.toast("Hint: peg " + (p + 1) + " of the code is " + color.name, "info");
        render();
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        over = true;
        AudioFX.lose();
        const code = secret.map(i => COLORS[i].name).join(", ");
        setStatus("Solution revealed. The code was: " + code + ".", "lose");
        App.recordResult(false, 0);
        render();
        App.showModal("Solution revealed",
          "The secret code was: <b>" + code + "</b>");
      }

      function onKey(e) {
        if (!alive) return;
        if (over && (e.key === "n" || e.key === "N")) {
          newGame();
          return;
        }
        if (over) return;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= COLORS.length) {
          placeColor(n - 1);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          for (let i = SLOTS - 1; i >= 0; i--) {
            if (current[i] !== null) {
              current[i] = null;
              AudioFX.click();
              render();
              return;
            }
          }
        } else if (e.key === "Enter") {
          e.preventDefault();
          check();
        }
      }

      document.addEventListener("keydown", onKey);
      checkBtn.addEventListener("click", check);
      clearBtn.addEventListener("click", () => {
        if (over) return;
        current = Array(SLOTS).fill(null);
        AudioFX.click();
        render();
      });
      root.querySelector("#mmc-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

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
      App.showModal("How to play Mastermind Classic",
        `This is the original 1970s peg-board game. The computer has hidden a code of <b>4 pegs</b>, each one of <b>6 colors</b> — colors <b>may repeat</b>.
        <br><br>Build a guess: tap a palette color (or press <b>1–6</b>) to fill the next empty slot. Tap a placed peg to remove it; <b>Backspace</b> removes the last one. Press <b>Check</b> (or <b>Enter</b>).
        <br><br>Feedback appears as small pegs beside the row:
        <br>⚫ <b>Black</b> — right color in the right position.
        <br>⚪ <b>White</b> — right color in the wrong position.
        <br>A peg is only counted once, and the feedback never tells you <i>which</i> pegs were right.
        <br><br>Crack the code within <b>10 rows</b>. Score = 11 − rows used (a first-row crack scores 10).
        <br><br><b>Hint</b> (max 2 per game) reveals the color of one code peg. <b>Solve</b> reveals the whole code and ends the game as a loss.`);
    },
  });
})();
