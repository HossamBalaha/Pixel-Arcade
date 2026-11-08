/* Word Chain (Contexto) — guess the secret word; get feedback on how close each guess is */
(function () {
  // 10 inline puzzles. Each has a target word and a precomputed list of associations
  // with their distance from the target (1 = closest, higher = farther).
  const PUZZLES = [
    {
      target: "ocean",
      associations: [["sea", 1], ["water", 2], ["wave", 3], ["fish", 4], ["blue", 5], ["deep", 6], ["salt", 7], ["beach", 8], ["ship", 9], ["whale", 10], ["sand", 11], ["coral", 12], ["sail", 13], ["storm", 14], ["tide", 15], ["shore", 16], ["current", 17], ["depth", 18], ["marine", 19], ["swim", 20]]
    },
    {
      target: "fire",
      associations: [["flame", 1], ["hot", 2], ["burn", 3], ["smoke", 4], ["red", 5], ["heat", 6], ["candle", 7], ["ash", 8], ["spark", 9], ["forest", 10], ["match", 11], ["blaze", 12], ["ember", 13], ["campfire", 14], ["warm", 15], ["scorch", 16], ["inferno", 17], ["kindle", 18], ["stove", 19], ["wildfire", 20]]
    },
    {
      target: "winter",
      associations: [["snow", 1], ["cold", 2], ["ice", 3], ["freeze", 4], ["coat", 5], ["christmas", 6], ["december", 7], ["ski", 8], ["frost", 9], ["north", 10], ["blizzard", 11], ["chill", 12], ["mittens", 13], ["sled", 14], ["flake", 15], ["shiver", 16], ["january", 17], ["scarf", 18], ["hockey", 19], ["igloo", 20]]
    },
    {
      target: "music",
      associations: [["song", 1], ["note", 2], ["melody", 3], ["sound", 4], ["rhythm", 5], ["band", 6], ["instrument", 7], ["dance", 8], ["radio", 9], ["guitar", 10], ["piano", 11], ["jazz", 12], ["singer", 13], ["drum", 14], ["beat", 15], ["tune", 16], ["harmony", 17], ["concert", 18], ["violin", 19], ["opera", 20]]
    },
    {
      target: "school",
      associations: [["student", 1], ["teacher", 2], ["class", 3], ["learn", 4], ["book", 5], ["desk", 6], ["homework", 7], ["grade", 8], ["math", 9], ["library", 10], ["pupil", 11], ["lesson", 12], ["chalk", 13], ["exam", 14], ["principal", 15], ["recess", 16], ["backpack", 17], ["quiz", 18], ["study", 19], ["cafeteria", 20]]
    },
    {
      target: "doctor",
      associations: [["hospital", 1], ["patient", 2], ["nurse", 3], ["medicine", 4], ["sick", 5], ["health", 6], ["clinic", 7], ["prescription", 8], ["surgery", 9], ["stethoscope", 10], ["appointment", 11], ["illness", 12], ["fever", 13], ["dentist", 14], ["diagnosis", 15], ["exam", 16], ["treatment", 17], ["vaccine", 18], ["surgeon", 19], ["checkup", 20]]
    },
    {
      target: "space",
      associations: [["star", 1], ["planet", 2], ["moon", 3], ["galaxy", 4], ["rocket", 5], ["astronaut", 6], ["orbit", 7], ["universe", 8], ["mars", 9], ["telescope", 10], ["comet", 11], ["meteor", 12], ["cosmos", 13], ["satellite", 14], ["shuttle", 15], ["gravity", 16], ["nebula", 17], ["venus", 18], ["alien", 19], ["vacuum", 20]]
    },
    {
      target: "kitchen",
      associations: [["stove", 1], ["cook", 2], ["fridge", 3], ["sink", 4], ["counter", 5], ["oven", 6], ["knife", 7], ["pot", 8], ["pantry", 9], ["cabinet", 10], ["refrigerator", 11], ["pan", 12], ["dish", 13], ["spoon", 14], ["microwave", 15], ["meal", 16], ["recipe", 17], ["blender", 18], ["faucet", 19], ["toaster", 20]]
    },
    {
      target: "forest",
      associations: [["tree", 1], ["wood", 2], ["leaves", 3], ["green", 4], ["pine", 5], ["trail", 6], ["animal", 7], ["wilderness", 8], ["moss", 9], ["oak", 10], ["ranger", 11], ["canopy", 12], ["jungle", 13], ["fern", 14], ["bear", 15], ["hike", 16], ["woods", 17], ["trail", 18], ["bark", 19], ["sapling", 20]]
    },
    {
      target: "computer",
      associations: [["screen", 1], ["keyboard", 2], ["mouse", 3], ["laptop", 4], ["code", 5], ["program", 6], ["software", 7], ["cpu", 8], ["data", 9], ["internet", 10], ["monitor", 11], ["memory", 12], ["ram", 13], ["pixel", 14], ["server", 15], ["binary", 16], ["algorithm", 17], ["desktop", 18], ["printer", 19], ["usb", 20]]
    },
  ];
  const MAX_HINTS = 3;

  let live = null;

  GameRegistry.register({
    id: "contexto",
    name: "Contexto",
    icon: "🧠",
    category: "word",
    description: "Guess the secret word — distance tells you how close each guess is",
    tags: ["word", "logic", "variant"],
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

      let puzzle = null;
      let assoc = null;     // Map<word, distance>
      let guesses = [];     // [{word, distance, target}]
      let over = false;
      let revealed = false;
      let hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Guesses</div><div class="val" id="cx-guesses">0</div></div>
          <div class="score-cell"><div class="label">Closest</div><div class="val" id="cx-closest">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cx-best">—</div></div>
        </div>
        <div class="status info" id="cx-status">Guess any related word — distance tells you how close</div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="cx-input" type="text" autocomplete="off" placeholder="Type a related word…"
            style="padding:10px 14px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;flex:1;max-width:280px;" />
          <button class="btn primary" id="cx-submit">Guess</button>
        </div>
        <div class="col" id="cx-past" style="gap:6px;max-height:300px;overflow-y:auto;"></div>
        <p class="hint">Type a word and press <b>Enter</b>. Lower distance = closer to the target. "No connection" means it isn't in the association list. <b>Hint</b> reveals the closest unguessed related word (max 3).</p>
      `;

      const statusEl = root.querySelector("#cx-status");
      const pastEl = root.querySelector("#cx-past");
      const inputEl = root.querySelector("#cx-input");

      function distColor(d) {
        // d=1 → green, d=2-5 → yellow→orange, d>10 → gray
        if (d === 1) return "var(--success)";
        if (d <= 3) return "var(--accent-2)";
        if (d <= 7) return "var(--warning)";
        if (d <= 12) return "var(--text-muted)";
        return "var(--bg-soft)";
      }

      function distLabel(d) {
        if (d === 1) return "very close";
        if (d <= 3) return "close";
        if (d <= 7) return "warm";
        if (d <= 12) return "far";
        return "very far";
      }

      function renderPast() {
        pastEl.innerHTML = "";
        if (guesses.length === 0) {
          const hint = document.createElement("p");
          hint.className = "hint";
          hint.textContent = "Your guesses will appear here, sorted by distance (closest first).";
          pastEl.appendChild(hint);
          return;
        }
        const sorted = guesses.slice().sort((a, b) => a.distance - b.distance);
        for (const g of sorted) {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.padding = "8px 12px";
          row.style.background = "var(--bg-elev)";
          row.style.border = "1px solid var(--border)";
          row.style.borderRadius = "var(--radius-sm)";
          if (g.distance === 0) {
            row.style.borderColor = "var(--success)";
            row.style.background = "rgba(22, 163, 74, 0.1)";
          }
          if (g.distance === -1) {
            row.style.opacity = "0.55";
            row.style.fontStyle = "italic";
          }
          const left = document.createElement("span");
          left.innerHTML = `<b>${g.word}</b>${g.distance === 0 ? " 🎯" : ""}`;
          const right = document.createElement("span");
          if (g.distance === -1) {
            right.textContent = "no connection";
            right.style.color = "var(--text-muted)";
          } else if (g.distance === 0) {
            right.innerHTML = `<b style="color:var(--success);">TARGET ✓</b>`;
          } else {
            right.innerHTML = `<span style="display:inline-grid;place-items:center;width:32px;height:32px;border-radius:999px;background:${distColor(g.distance)};color:#fff;font-weight:700;font-family:var(--font-mono);">${g.distance}</span> <span style="color:var(--text-muted);font-size:0.85rem;margin-left:6px;">${distLabel(g.distance)}</span>`;
          }
          row.appendChild(left);
          row.appendChild(right);
          pastEl.appendChild(row);
        }
      }

      function updateScoreboard() {
        root.querySelector("#cx-guesses").textContent = guesses.length;
        const closest = guesses.filter(g => g.distance > 0).sort((a, b) => a.distance - b.distance)[0];
        root.querySelector("#cx-closest").textContent = closest ? `#${closest.distance}` : "—";
      }

      function submit() {
        if (over) return;
        const raw = inputEl.value.trim().toLowerCase();
        inputEl.value = "";
        if (!raw) return;
        if (guesses.some(g => g.word === raw)) {
          AudioFX.error();
          statusEl.textContent = `Already guessed "${raw}"`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
          return;
        }
        let distance;
        if (raw === puzzle.target) {
          distance = 0;
          guesses.push({word: raw, distance});
          AudioFX.win();
          over = true;
          renderPast();
          updateScoreboard();
          statusEl.textContent = `🎉 Solved! The target was "${puzzle.target}" — found in ${guesses.length} ${guesses.length === 1 ? "guess" : "guesses"}.`;
          statusEl.className = "status win";
          const best = Storage.getBest("contexto");
          if (!best || guesses.length < best) {
            Storage.setBest("contexto", guesses.length);
            root.querySelector("#cx-best").textContent = guesses.length;
            App.toast("New best: " + guesses.length + " guesses", "success");
          }
          return;
        } else if (assoc.has(raw)) {
          distance = assoc.get(raw);
          AudioFX.reveal();
          guesses.push({word: raw, distance});
          statusEl.textContent = `"${raw}" — distance ${distance} (${distLabel(distance)})`;
          statusEl.className = "status info";
        } else {
          distance = -1;
          AudioFX.error();
          guesses.push({word: raw, distance});
          statusEl.textContent = `"${raw}" — no connection to the target`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) resetStatus();
          }, 1500);
        }
        renderPast();
        updateScoreboard();
        inputEl.focus();
      }

      function resetStatus() {
        statusEl.textContent = `Guess any related word — distance tells you how close`;
        statusEl.className = "status info";
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      root.querySelector("#cx-submit").addEventListener("click", submit);

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        // Find closest association not yet guessed
        const guessed = new Set(guesses.map(g => g.word));
        const remaining = puzzle.associations.filter(([w]) => !guessed.has(w));
        if (remaining.length === 0) {
          App.toast("All associations already guessed", "info");
          return;
        }
        remaining.sort((a, b) => a[1] - b[1]);
        const [word, dist] = remaining[0];
        hintsUsed++;
        AudioFX.reveal();
        App.toast(`Hint: try "${word}" (distance ${dist})`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Solution revealed: ${puzzle.target}`;
        statusEl.className = "status lose";
        // Show top associations too
        const top = puzzle.associations.slice(0, 5).map(([w, d]) => `${w} (${d})`).join(", ");
        App.showModal("Word Chain solution",
          `The target word was: <b>${puzzle.target}</b><br><br>Closest associations: ${top}`);
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        assoc = new Map(puzzle.associations);
        guesses = [];
        over = false;
        revealed = false;
        hintsUsed = 0;
        const best = Storage.getBest("contexto");
        root.querySelector("#cx-best").textContent = best || "—";
        root.querySelector("#cx-guesses").textContent = "0";
        root.querySelector("#cx-closest").textContent = "—";
        resetStatus();
        renderPast();
        inputEl.focus();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
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
      App.showModal("How to play Word Chain",
        `Find the secret <b>target word</b> by guessing related words.
        <br><br>Type any word and press <b>Enter</b>. The game responds with a <b>distance</b>:
        <br>• <b>1</b> = extremely close (top association)
        <br>• <b>2–3</b> = close
        <br>• <b>4–7</b> = warm
        <br>• <b>8–12</b> = far
        <br>• <b>13+</b> = very far
        <br>• <b>"no connection"</b> = not in the precomputed association list
        <br><br>Your guesses are listed sorted by distance (closest at top). Guess the <b>target word</b> itself to win.
        <br><br>Unlimited guesses — but your guess count is tracked. Lower is better.
        <br><br>Stuck? Use the <b>Hint</b> button (max 3 — reveals the closest unguessed related word) or <b>Solve</b> (reveals the target and ends the game as a loss).`);
    },
  });
})();
