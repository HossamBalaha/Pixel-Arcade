/* Semantle — guess the secret word by semantic similarity (offline edition).
   Each guess is scored 0-100% for how semantically close it is to the target.
   100% = the word itself. The hallmark: an ever-growing list of guesses
   sorted by similarity, so you home in on the target. */
(function () {
  // 10 inline puzzles. Each has a target word and a curated list of associated
  // words with their similarity to the target (percent). Curated by hand —
  // an offline stand-in for real word-vector similarity.
  const PUZZLES = [
    {
      target: "coffee",
      assoc: [["espresso", 96], ["caffeine", 94], ["latte", 92], ["mocha", 91], ["brew", 88], ["cappuccino", 86], ["beans", 84], ["mug", 82], ["roast", 80], ["morning", 78], ["drink", 76], ["cafe", 74], ["barista", 72], ["kettle", 70], ["sugar", 68], ["cream", 66], ["cup", 64], ["bitter", 62], ["aroma", 60], ["grounds", 58], ["decaf", 56], ["filter", 54], ["java", 50], ["black", 44], ["hot", 42], ["tea", 40]]
    },
    {
      target: "mountain",
      assoc: [["peak", 96], ["summit", 95], ["alps", 92], ["everest", 90], ["climb", 88], ["slope", 84], ["valley", 82], ["hill", 80], ["altitude", 78], ["ridge", 76], ["glacier", 74], ["cliff", 72], ["rocks", 70], ["hiking", 68], ["snow", 66], ["base", 64], ["goats", 60], ["range", 58], ["terrain", 54], ["foothills", 52], ["pass", 48], ["pines", 46], ["fog", 44], ["top", 42]]
    },
    {
      target: "book",
      assoc: [["novel", 96], ["read", 94], ["pages", 92], ["story", 90], ["chapter", 88], ["author", 86], ["library", 84], ["cover", 82], ["shelf", 80], ["literature", 78], ["paperback", 76], ["plot", 74], ["bookstore", 72], ["words", 70], ["fiction", 68], ["spine", 66], ["bookmark", 64], ["publisher", 62], ["edition", 60], ["reader", 58], ["text", 56], ["prose", 54], ["title", 52], ["poetry", 44], ["diary", 46], ["essay", 48], ["writing", 42]]
    },
    {
      target: "rain",
      assoc: [["drizzle", 96], ["shower", 94], ["storm", 92], ["wet", 90], ["umbrella", 88], ["clouds", 86], ["downpour", 84], ["puddles", 82], ["thunder", 80], ["weather", 78], ["damp", 76], ["monsoon", 74], ["drops", 72], ["mist", 70], ["flood", 68], ["coat", 66], ["boots", 64], ["season", 62], ["grey", 60], ["water", 58], ["snow", 56], ["forecast", 54], ["sleet", 52], ["window", 50], ["spring", 46], ["autumn", 44], ["dry", 42]]
    },
    {
      target: "bread",
      assoc: [["loaf", 96], ["toast", 94], ["crust", 92], ["baker", 90], ["slices", 88], ["dough", 86], ["sandwich", 84], ["wheat", 82], ["bakery", 80], ["butter", 78], ["crumbs", 76], ["flour", 74], ["bake", 72], ["grain", 70], ["rolls", 68], ["sourdough", 66], ["oven", 64], ["yeast", 62], ["baguette", 60], ["rye", 58], ["knead", 50], ["bagels", 46], ["biscuit", 44], ["hungry", 42]]
    },
    {
      target: "clock",
      assoc: [["watch", 96], ["time", 94], ["hour", 92], ["minute", 90], ["tick", 88], ["alarm", 86], ["hands", 84], ["chime", 82], ["dial", 80], ["seconds", 78], ["timer", 76], ["noon", 74], ["midnight", 72], ["pendulum", 70], ["quartz", 68], ["wall", 66], ["wrist", 64], ["digital", 62], ["analog", 60], ["cuckoo", 56], ["bells", 54], ["late", 52], ["early", 50], ["sundial", 48], ["hourglass", 46], ["stopwatch", 44], ["gears", 42]]
    },
    {
      target: "garden",
      assoc: [["flowers", 96], ["plants", 94], ["soil", 92], ["seeds", 90], ["bloom", 88], ["weeds", 86], ["vegetables", 84], ["lawn", 82], ["roses", 78], ["sprout", 76], ["greenhouse", 74], ["compost", 72], ["rake", 70], ["hose", 68], ["tulips", 66], ["fence", 64], ["plot", 62], ["gardener", 60], ["shrubs", 58], ["mulch", 56], ["petals", 54], ["pruning", 52], ["harvest", 50], ["bees", 48], ["dirt", 46], ["spade", 44], ["watering", 42]]
    },
    {
      target: "dream",
      assoc: [["nightmare", 96], ["sleep", 94], ["wish", 92], ["fantasy", 90], ["night", 88], ["visions", 86], ["imagine", 84], ["pillow", 82], ["hope", 80], ["memory", 78], ["daydream", 76], ["surreal", 74], ["wake", 72], ["unconscious", 70], ["reverie", 68], ["aspiration", 66], ["goals", 64], ["mind", 62], ["subconscious", 60], ["lucid", 58], ["bedroom", 56], ["sheep", 54], ["illusion", 52], ["desire", 50], ["slumber", 48], ["bedtime", 46], ["reality", 44], ["snoring", 42]]
    },
    {
      target: "bridge",
      assoc: [["span", 96], ["river", 94], ["cross", 92], ["arch", 90], ["cables", 88], ["towers", 86], ["suspension", 84], ["steel", 82], ["road", 80], ["golden", 78], ["gap", 76], ["planks", 74], ["truss", 72], ["pier", 70], ["ferry", 68], ["lanes", 66], ["brooklyn", 64], ["engineers", 62], ["overpass", 60], ["rope", 58], ["viaduct", 56], ["crossing", 54], ["pillars", 52], ["drawbridge", 50], ["deck", 48], ["traffic", 46], ["rail", 44]]
    },
    {
      target: "honey",
      assoc: [["bees", 96], ["sweet", 94], ["sugar", 92], ["hive", 90], ["nectar", 88], ["comb", 86], ["flowers", 84], ["golden", 82], ["syrup", 80], ["beeswax", 78], ["amber", 76], ["dipper", 74], ["sticky", 72], ["jars", 70], ["queen", 68], ["pollen", 66], ["harvest", 64], ["lemon", 62], ["tea", 60], ["mead", 58], ["beekeeper", 56], ["wax", 54], ["clover", 50], ["drips", 48], ["bears", 46], ["spread", 44]]
    },
  ];
  const MAX_HINTS = 3;

  let live = null;

  GameRegistry.register({
    id: "semantle",
    name: "Semantle",
    icon: "🌡️",
    category: "word",
    description: "Guess the secret word — similarity percentage tells you how close you are",
    tags: ["word", "logic", "variant"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      let puzzle = null;
      let assoc = null;      // Map<word, similarity>
      let guesses = [];      // [{word, sim}]
      let over = false;
      let revealed = false;
      let hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Guesses</div><div class="val" id="sm-guesses">0</div></div>
          <div class="score-cell"><div class="label">Closest</div><div class="val" id="sm-closest">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sm-best">—</div></div>
        </div>
        <div class="status info" id="sm-status">Guess any word — its similarity to the secret word appears below</div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="sm-input" type="text" autocomplete="off" placeholder="Type any word…"
            style="padding:10px 14px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;flex:1;max-width:280px;" />
          <button class="btn primary" id="sm-submit">Guess</button>
        </div>
        <div class="col" id="sm-past" style="gap:6px;max-height:300px;overflow-y:auto;"></div>
        <p class="hint">Type a word and press <b>Enter</b>. 100% = the secret word. Higher = closer. Words not in the puzzle's association space show as "cold". <b>Hint</b> reveals a letter of the secret word (max ${MAX_HINTS}).</p>
      `;

      const statusEl = root.querySelector("#sm-status");
      const pastEl = root.querySelector("#sm-past");
      const inputEl = root.querySelector("#sm-input");

      function simColor(s) {
        if (s >= 90) return "var(--success)";
        if (s >= 70) return "var(--accent-2)";
        if (s >= 50) return "var(--warning)";
        if (s >= 30) return "var(--text-muted)";
        return "var(--bg-soft)";
      }

      function simLabel(s) {
        if (s === 100) return "the word!";
        if (s >= 90) return "burning hot";
        if (s >= 70) return "hot";
        if (s >= 50) return "warm";
        if (s >= 30) return "cool";
        if (s >= 12) return "cold";
        return "freezing";
      }

      // Deterministic pseudo-similarity for words outside the curated list:
      // a small value derived from letter overlap with the target, so repeated
      // guesses of unrelated words stay consistently chilly.
      function fallbackSim(word) {
        const t = puzzle.target.split("");
        let shared = 0;
        for (const ch of new Set(word.split(""))) {
          if (t.includes(ch)) shared++;
        }
        const uniq = new Set(word.split("")).size || 1;
        return Math.round(Math.min(11, (shared / uniq) * 11));
      }

      function similarity(word) {
        if (word === puzzle.target) return 100;
        if (assoc.has(word)) return assoc.get(word);
        return fallbackSim(word);
      }

      function renderPast() {
        pastEl.innerHTML = "";
        if (guesses.length === 0) {
          const p = document.createElement("p");
          p.className = "hint";
          p.textContent = "Your guesses will appear here, sorted by similarity (closest first).";
          pastEl.appendChild(p);
          return;
        }
        const sorted = guesses.slice().sort((a, b) => b.sim - a.sim);
        for (const g of sorted) {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.padding = "8px 12px";
          row.style.background = "var(--bg-elev)";
          row.style.border = "1px solid var(--border)";
          row.style.borderRadius = "var(--radius-sm)";
          if (g.sim === 100) {
            row.style.borderColor = "var(--success)";
            row.style.background = "rgba(22, 163, 74, 0.1)";
          }
          if (g.sim < 12) row.style.opacity = "0.55";
          const left = document.createElement("div");
          left.innerHTML = `<b style="font-family:var(--font-mono);">${g.word}</b> <span style="color:var(--text-muted);font-size:0.85rem;">— ${simLabel(g.sim)}</span>`;
          const right = document.createElement("div");
          right.style.fontFamily = "var(--font-mono)";
          right.style.fontWeight = "700";
          right.style.color = simColor(g.sim);
          right.textContent = g.sim + "%";
          row.appendChild(left);
          row.appendChild(right);
          pastEl.appendChild(row);
        }
      }

      function renderStats() {
        const gEl = root.querySelector("#sm-guesses");
        const cEl = root.querySelector("#sm-closest");
        const bEl = root.querySelector("#sm-best");
        if (gEl) gEl.textContent = guesses.length;
        if (cEl) {
          if (over) cEl.textContent = puzzle.target;
          else if (guesses.length) {
            const best = Math.max(...guesses.map(g => g.sim));
            cEl.textContent = best + "%";
          } else cEl.textContent = "—";
        }
        if (bEl) {
          const best = Storage.getBest("semantle");
          bEl.textContent = best ? best + " guesses" : "—";
        }
      }

      function submitGuess() {
        if (over || !puzzle) return;
        const raw = (inputEl.value || "").trim().toLowerCase();
        if (!raw) return;
        if (!/^[a-z]+$/.test(raw)) {
          statusEl.textContent = "Letters only, please.";
          statusEl.className = "status lose";
          return;
        }
        if (guesses.some(g => g.word === raw)) {
          statusEl.textContent = `You already tried "${raw}" (${similarity(raw)}%).`;
          statusEl.className = "status info";
          return;
        }
        const sim = similarity(raw);
        guesses.push({word: raw, sim});
        inputEl.value = "";
        AudioFX.flip();
        if (sim === 100) {
          over = true;
          statusEl.textContent = `🎉 Found it! The word was "${puzzle.target}" — ${guesses.length} guesses.`;
          statusEl.className = "status win";
          AudioFX.win();
          App.recordResult(true, guesses.length);
          const best = Storage.getBest("semantle");
          if (!best || guesses.length < best) {
            Storage.setBest("semantle", guesses.length);
            App.toast("New best! " + guesses.length + " guesses", "success");
          }
        } else {
          statusEl.textContent = `"${raw}" — ${sim}% (${simLabel(sim)}). ${sim >= 70 ? "Getting warmer!" : sim >= 30 ? "Keep going…" : "Cold."}`;
          statusEl.className = "status info";
        }
        renderPast();
        renderStats();
      }

      function doHint() {
        if (over || !puzzle) {
          App.toast("Start a new game first", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast("No hints left this round", "info");
          return;
        }
        // reveal one letter of the target (position order shuffled once)
        if (!doHint.order) {
          doHint.order = puzzle.target.split("")
            .map((c, i) => i)
            .sort(() => Math.random() - 0.5);
        }
        const idx = doHint.order[hintsUsed];
        hintsUsed++;
        AudioFX.reveal();
        App.toast(`Hint: letter ${idx + 1} is "${puzzle.target[idx].toUpperCase()}" (${MAX_HINTS - hintsUsed} left)`, "info");
      }

      function doSolve() {
        if (over || !puzzle) return;
        over = true;
        revealed = true;
        statusEl.textContent = `Solution revealed: the word was "${puzzle.target}".`;
        statusEl.className = "status lose";
        App.recordResult(false, 0);
        renderPast();
        renderStats();
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        assoc = new Map(puzzle.assoc);
        guesses = [];
        over = false;
        revealed = false;
        hintsUsed = 0;
        doHint.order = null;
        statusEl.textContent = "Guess any word — its similarity to the secret word appears below";
        statusEl.className = "status info";
        inputEl.value = "";
        inputEl.focus();
        renderPast();
        renderStats();
      }

      root.querySelector("#sm-submit").addEventListener("click", submitGuess);
      inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitGuess();
        }
      });
      const newBtn = document.createElement("button");
      newBtn.className = "btn";
      newBtn.textContent = "New puzzle";
      newBtn.style.marginTop = "10px";
      newBtn.addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      pastEl.parentNode.insertBefore(newBtn, pastEl.nextSibling);

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
      App.showModal("How to play Semantle",
        `Guess the <b>secret word</b>. Every guess gets a <b>similarity score from 0% to 100%</b> — 100% means you found it.
        <br><br>Your guesses are listed sorted by similarity, so you can home in on the target. Think of words that appear in similar contexts as the secret word.
        <br><br>This is an offline edition: similarity comes from a curated association list per puzzle. Words outside the list score as "cold" (below 12%).
        <br><br>Unlimited guesses. <b>Hint</b> reveals a letter of the secret word (max ${MAX_HINTS}); <b>Solve</b> gives up and reveals it. Best score = fewest guesses.`);
    },
  });
})();
