/* Nerdle — guess the 8-char math equation in 6 tries */
(function () {
  // Precomputed list of valid 8-char equations.
  const EQUATIONS = [
    "12+34=46", "10+20=30", "11+12=23", "21+22=43", "10+15=25",
    "15+25=40", "23+45=68", "11+22=33", "13+24=37", "16+27=43",
    "50-20=30", "60-25=35", "99-50=49", "80-40=40", "75-25=50",
    "5+5+5=15", "4+4+4=12", "9+8+7=24", "6+7+8=21", "5+6+7=18",
    "9+9+9=27", "8+8+8=24", "5*8+2=42", "3*4+5=17", "2*3+4=10",
    "4*5+6=26", "3*7+9=30", "9*6+1=55", "8*4+2=34", "2*9+3=21",
    "9*9-1=80", "8*8-1=63", "6*7-2=40", "8*9-2=70", "9*5-5=40",
    "7*8-6=50", "8*8/2=32", "9*4/3=12", "5*8/2=20", "6*4/2=12",
    "8*6/2=24", "9*8/3=24", "5*6/2=15", "7*8/4=14", "9*3-2=25",
    "7*3+4=25", "6*3+2=20", "5*3+5=20", "9*7-3=60", "8*7+4=60",
    "9*8+4=76", "9*2+8=26", "7*6+8=50", "9*4+4=40", "6*9-4=50",
    "8*3+6=30", "7*9+3=66", "8*5-2=38", "9*3-7=20", "5*4+9=29",
    "8*2+5=21", "7*4+2=30", "6*6-6=30", "9*5+9=54",
  ];

  const LEN = 8;
  const MAX = 6;
  const MAX_HINTS = 2;

  function validEq(s) {
    if (s.length !== LEN) return false;
    if ((s.match(/=/g) || []).length !== 1) return false;
    if (!/^[0-9+\-*/=]+$/.test(s)) return false;
    const [lhs, rhs] = s.split("=");
    if (!lhs || !rhs) return false;
    // No leading zeros, no consecutive operators, no leading/trailing operator
    if (/^[+\-*/]/.test(lhs) || /[+\-*/]$/.test(lhs)) return false;
    if (/^[+\-*/]/.test(rhs) || /[+\-*/]$/.test(rhs)) return false;
    if (/[+\-*/]{2,}/.test(lhs) || /[+\-*/]{2,}/.test(rhs)) return false;
    if (/^0[0-9]/.test(lhs) || /^0[0-9]/.test(rhs)) return false;
    // Internal numbers must not have leading zeros
    if (/(^|[+\-*/])0[0-9]/.test(lhs) || /(^|[+\-*/])0[0-9]/.test(rhs)) return false;
    let v;
    try {
      v = (new Function("return " + lhs))();
    } catch (e) {
      return false;
    }
    if (!isFinite(v)) return false;
    return Number(v) === Number(rhs);
  }

  function evaluate(guess, answer) {
    const res = Array(LEN).fill("absent");
    const a = answer.split("");
    for (let i = 0; i < LEN; i++) if (guess[i] === a[i]) {
      res[i] = "correct";
      a[i] = null;
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] === "correct") continue;
      const j = a.indexOf(guess[i]);
      if (j !== -1) {
        res[i] = "present";
        a[j] = null;
      }
    }
    return res;
  }

  let live = null;

  GameRegistry.register({
    id: "nerdle",
    name: "Nerdle",
    icon: "🧮",
    category: "word",
    description: "Guess the 8-character math equation in 6 tries",
    tags: ["math", "variant", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      let answer = "";
      let guesses = []; // [{guess, eval}]
      let current = "";
      let over = false;
      let revealed = false;
      let hintsUsed = 0;
      const keyState = {};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Try</div><div class="val" id="nd-try">0</div></div>
          <div class="score-cell"><div class="label">Max</div><div class="val">${MAX}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="nd-best">—</div></div>
        </div>
        <div class="status info" id="nd-status">Guess the 8-char equation — 6 tries</div>
        <div class="col" id="nd-rows" style="gap:6px;"></div>
        <div class="col" id="nd-keyboard" style="gap:6px;margin-top:8px;"></div>
        <p class="hint">Type an 8-char equation (e.g. <b>12+34=46</b>). <b>Enter</b> submits, <b>Backspace</b> deletes.</p>
      `;

      const rowsEl = root.querySelector("#nd-rows");
      const kbEl = root.querySelector("#nd-keyboard");
      const statusEl = root.querySelector("#nd-status");

      const KBD = ["1234567890".split(""), "+-*/=".split(""), ["ENTER", "BACK"]];

      function stateColor(state) {
        if (state === "correct") return {bg: "var(--success)", fg: "#fff"};
        if (state === "present") return {bg: "var(--accent-2)", fg: "#fff"};
        return {bg: "var(--bg-soft)", fg: "var(--text-muted)"};
      }

      function renderRows() {
        rowsEl.innerHTML = "";
        for (let r = 0; r < MAX; r++) {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "center";
          row.style.gap = "5px";
          for (let i = 0; i < LEN; i++) {
            const cell = document.createElement("div");
            cell.style.width = "42px";
            cell.style.height = "42px";
            cell.style.display = "grid";
            cell.style.placeItems = "center";
            cell.style.fontFamily = "var(--font-mono)";
            cell.style.fontWeight = "700";
            cell.style.fontSize = "1.2rem";
            cell.style.border = "2px solid var(--border)";
            cell.style.borderRadius = "5px";
            cell.style.background = "var(--bg-elev)";
            cell.style.transition = "transform 0.2s, background 0.3s";
            if (r < guesses.length) {
              const g = guesses[r].guess;
              const e = guesses[r].eval;
              cell.textContent = g[i];
              const c = stateColor(e[i]);
              cell.style.background = c.bg;
              cell.style.color = c.fg;
              cell.style.borderColor = c.bg;
              cell.style.animation = "flip 0.4s ease";
            } else if (r === guesses.length && !over) {
              cell.textContent = current[i] || "";
              if (current[i]) {
                cell.style.borderColor = "var(--accent)";
                cell.style.transform = "scale(1.05)";
              }
            }
            row.appendChild(cell);
          }
          rowsEl.appendChild(row);
        }
      }

      function renderKb() {
        kbEl.innerHTML = "";
        KBD.forEach(line => {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "center";
          line.forEach(k => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.style.fontFamily = "var(--font-mono)";
            btn.textContent = k === "BACK" ? "⌫" : k === "ENTER" ? "↵" : k;
            if (k.length > 1) btn.style.minWidth = "60px";
            if (keyState[k]) {
              const c = stateColor(keyState[k]);
              btn.style.background = c.bg;
              btn.style.color = c.fg;
              btn.style.borderColor = c.bg;
            }
            btn.addEventListener("click", () => {
              if (k === "ENTER") submit();
              else if (k === "BACK") back();
              else type(k);
            });
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
      }

      if (!document.getElementById("nd-shake")) {
        const s = document.createElement("style");
        s.id = "nd-shake";
        s.textContent = "@keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}@keyframes flip {0%{transform:rotateX(0)}50%{transform:rotateX(90deg)}100%{transform:rotateX(0)}}";
        document.head.appendChild(s);
      }

      function shake() {
        const last = rowsEl.children[guesses.length];
        if (last) {
          last.style.animation = "none";
          void last.offsetWidth;
          last.style.animation = "shake 0.4s";
        }
      }

      function type(ch) {
        if (over || current.length >= LEN) return;
        current += ch;
        AudioFX.tick();
        renderRows();
      }

      function back() {
        if (over) return;
        current = current.slice(0, -1);
        AudioFX.click();
        renderRows();
      }

      function submit() {
        if (over) return;
        if (current.length !== LEN) {
          shake();
          AudioFX.error();
          return;
        }
        if (!validEq(current)) {
          shake();
          AudioFX.error();
          statusEl.textContent = `"${current}" is not a valid equation`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) {
              statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
              statusEl.className = "status info";
            }
          }, 1500);
          return;
        }
        const guess = current;
        const ev = evaluate(guess, answer);
        guesses.push({guess, eval: ev});
        for (let i = 0; i < LEN; i++) {
          const c = guess[i];
          const order = {absent: 0, present: 1, correct: 2};
          if (!keyState[c] || order[ev[i]] > order[keyState[c]]) keyState[c] = ev[i];
        }
        current = "";
        AudioFX.flip();
        renderRows();
        renderKb();
        root.querySelector("#nd-try").textContent = guesses.length;

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed: ${answer}`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (guess === answer) {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("nerdle");
          if (!best || guesses.length < best) {
            Storage.setBest("nerdle", guesses.length);
            root.querySelector("#nd-best").textContent = guesses.length;
            App.toast("New best: " + guesses.length + " tries", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `Out of tries. The equation was ${answer}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
        }
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
        } else if (/^[0-9+\-*/=]$/.test(e.key)) {
          e.preventDefault();
          type(e.key);
        }
      }

      document.addEventListener("keydown", onKey);

      function newGame() {
        answer = EQUATIONS[Math.floor(Math.random() * EQUATIONS.length)];
        guesses = [];
        current = "";
        over = false;
        revealed = false;
        hintsUsed = 0;
        for (const k in keyState) delete keyState[k];
        root.querySelector("#nd-try").textContent = "0";
        const best = Storage.getBest("nerdle");
        root.querySelector("#nd-best").textContent = best || "—";
        statusEl.textContent = "Guess the 8-char equation — 6 tries";
        statusEl.className = "status info";
        renderRows();
        renderKb();
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        // Pick a position where the current input is missing or wrong
        const candidates = [];
        for (let i = 0; i < LEN; i++) if (current[i] !== answer[i]) candidates.push(i);
        if (candidates.length === 0) {
          App.toast("Current input already matches at every position", "info");
          return;
        }
        const p = candidates[Math.floor(Math.random() * candidates.length)];
        const ch = answer[p];
        hintsUsed++;
        // Auto-fill that position (replace current[p] with ch, leaving others intact)
        const arr = current.split("");
        arr[p] = ch;
        current = arr.join("");
        AudioFX.reveal();
        renderRows();
        App.toast(`Hint: position ${p + 1} is "${ch}"`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Solution revealed: ${answer}`;
        statusEl.className = "status lose";
        App.showModal("Nerdle solution", `The equation was: <b style="font-family:var(--font-mono);">${answer}</b>`);
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Nerdle",
        `Guess the hidden 8-character math equation in <b>6 tries</b>.
        <br><br>Each guess must be a valid 8-char equation containing:
        <br>• digits <b>0–9</b>, operators <b>+ − * /</b>, and exactly one <b>=</b>.
        <br>• standard math precedence (e.g. <b>3*4+5=17</b> works because 3*4=12, then 12+5=17).
        <br>• no leading zeros in numbers, no consecutive operators.
        <br><br>After each guess the tiles change color:
        <br>🟩 <b>Green</b> — correct character in the correct spot.
        <br>🟪 <b>Purple</b> — character is in the equation but in a different spot.
        <br>⬛ <b>Gray</b> — character is not in the equation at all.
        <br><br>Stuck? Use <b>Hint</b> (max 2 — fills one correct character into your current guess) or <b>Solve</b> (reveals the equation and ends the game as a loss).
        <br><br>Type using your keyboard or tap the on-screen keys. <b>Enter</b> submits, <b>Backspace</b> deletes.`);
    },
  });
})();
