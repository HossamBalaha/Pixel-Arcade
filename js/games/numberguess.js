/* Number Guess — guess the secret number with hot/cold hints + Hint/Solve */
(function () {
  const LEVELS = {
    easy: {max: 50, label: "Easy (1–50)"},
    classic: {max: 100, label: "Classic (1–100)"},
    hard: {max: 1000, label: "Hard (1–1000)"},
  };
  const MAX_HINTS = 2;

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "numberguess",
    name: "Number Guess",
    icon: "🎯",
    category: "logic",
    description: "Guess the secret number with hot/cold hints",
    tags: ["classic", "logic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let level = "classic";
      let target, attempts, history, over, max;
      let lo, hi;
      let hintsUsed = 0;

      function newGame() {
        const L = LEVELS[level];
        max = L.max;
        target = Math.floor(Math.random() * max) + 1;
        attempts = 0;
        history = [];
        over = false;
        hintsUsed = 0;
        lo = 1;
        hi = max;
        render();
        statusEl.textContent = `I'm thinking of a number between 1 and ${max}.`;
        statusEl.className = "status info";
        guessEl.value = "";
        guessEl.focus();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="ng-diff">
            <button class="diff-btn" data-d="easy">Easy (1–50)</button>
            <button class="diff-btn active" data-d="classic">Classic (1–100)</button>
            <button class="diff-btn" data-d="hard">Hard (1–1000)</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Attempts</div><div class="val" id="ng-attempts">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ng-best">-</div></div>
        </div>
        <div class="status info" id="ng-status">I'm thinking of a number between 1 and 100.</div>
        <div class="row" style="justify-content:center;">
          <input type="number" id="ng-guess" min="1" max="100" placeholder="Your guess"
                 style="padding:10px 14px;font-size:1.1rem;border-radius:var(--radius-sm);background:var(--bg-elev);border:1px solid var(--border);color:var(--text);width:160px;text-align:center;" />
          <button class="btn primary" id="ng-go">Guess</button>
        </div>
        <div id="ng-hint" class="text-muted text-sm center" style="margin-top:8px;"></div>
        <div id="ng-history" class="col" style="gap:4px;margin-top:8px;max-height:180px;overflow:auto;"></div>
      `;

      const statusEl = root.querySelector("#ng-status");
      const hintEl = root.querySelector("#ng-hint");
      const histEl = root.querySelector("#ng-history");
      const guessEl = root.querySelector("#ng-guess");

      function render() {
        root.querySelector("#ng-attempts").textContent = attempts;
        const key = "numberguess_" + level;
        const best = Storage.getBest(key);
        root.querySelector("#ng-best").textContent = best === null ? "-" : best + " tries";
        histEl.innerHTML = "";
        history.forEach(h => {
          const el = document.createElement("div");
          el.className = "text-sm center";
          if (h.hint) {
            el.style.color = "var(--accent-2)";
            el.textContent = "💡 " + h.label;
          } else {
            el.style.color = h.distance === 0 ? "var(--success)" : (h.distance <= 5 ? "var(--warning)" : "var(--text-muted)");
            el.textContent = `${h.guess} → ${h.distance === 0 ? "🎯 correct!" : h.label}`;
          }
          histEl.appendChild(el);
        });
      }

      function hotCold(guess) {
        // Scale thresholds with max (Classic = 1×, Easy = 0.5×, Hard = 10×)
        const sc = max / 100;
        const dist = Math.abs(guess - target);
        if (dist === 0) return {label: "🔥 BULLSEYE!", distance: 0};
        if (dist <= 3 * sc) return {label: "🔥 Burning hot!", distance: dist};
        if (dist <= 8 * sc) return {label: "♨️ Hot", distance: dist};
        if (dist <= 15 * sc) return {label: "🌡 Warm", distance: dist};
        if (dist <= 30 * sc) return {label: "❄ Cold", distance: dist};
        return {label: "🧊 Freezing", distance: dist};
      }

      function go() {
        if (over) return;
        const v = parseInt(guessEl.value, 10);
        if (!v || v < 1 || v > max) {
          AudioFX.error();
          hintEl.textContent = `Enter a number between 1 and ${max}.`;
          return;
        }
        attempts++;
        const h = hotCold(v);
        history.unshift(h); // newest first
        if (v === target) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 Solved in ${attempts} ${attempts === 1 ? "try" : "tries"}! The number was ${target}.`;
          statusEl.className = "status win";
          const key = "numberguess_" + level;
          const best = Storage.getBest(key);
          if (best === null || attempts < best) {
            Storage.setBest(key, attempts);
            App.toast("New best: " + attempts + " tries", "success");
          }
          render();
        } else {
          AudioFX.tick();
          statusEl.textContent = `${v < target ? "Higher" : "Lower"} than ${v} — try again`;
          statusEl.className = "status info";
          render();
          guessEl.value = "";
          guessEl.focus();
        }
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R" || e.key === "Enter")) {
          newGame();
          return;
        }
        if (e.key === "Enter") go();
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#ng-go").addEventListener("click", go);

      // Difficulty selector
      root.querySelectorAll("#ng-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#ng-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.d;
        newGame();
      }));

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        hintsUsed++;
        // Narrow the current range by ~50%, centered on the target
        const oldSpan = hi - lo + 1;
        const newSpan = Math.max(2, Math.floor(oldSpan / 2));
        let newLo = Math.max(lo, target - Math.floor(newSpan / 2));
        let newHi = Math.min(hi, newLo + newSpan - 1);
        newLo = Math.max(newLo, newHi - newSpan + 1);
        lo = newLo;
        hi = newHi;
        const msg = `The number is between ${lo} and ${hi}`;
        statusEl.textContent = msg;
        statusEl.className = "status info";
        history.unshift({hint: true, label: msg});
        AudioFX.tick();
        App.toast(msg, "info");
        render();
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        over = true;
        statusEl.textContent = `Solution revealed: ${target}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        history.unshift({hint: true, label: `Solution revealed: ${target}`});
        render();
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
      App.showModal("How to play Number Guess",
        `I'm thinking of a number from 1 to <b>max</b>. Pick a difficulty:
        <br>• <b>Easy</b> — 1 to 50
        <br>• <b>Classic</b> — 1 to 100
        <br>• <b>Hard</b> — 1 to 1000
        <br><br>Type your guess and hit Enter (or click Guess). Each guess tells you whether the answer is higher or lower, plus a temperature hint that scales with the difficulty:
        <br>🔥 Burning hot · ♨️ Hot · 🌡 Warm · ❄ Cold · 🧊 Freezing
        <br><br>Stuck? Use the <b>Hint</b> button (max 2 per game — narrows the range by ~50% around the target) or <b>Solve</b> (reveals the answer and ends the game as a loss).
        <br><br>Try to find the number in as few guesses as possible. Best score = fewest tries, tracked per difficulty. Press <b>R</b> for a new number.`);
    },
  });
})();
