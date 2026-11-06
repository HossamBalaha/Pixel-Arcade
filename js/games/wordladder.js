/* Word Ladder — change START word into END word one letter at a time; each step must be a real word. */
(function () {
  // Predefined ladders (start, end, valid word pool for that length)
  const LADDERS = [
    {
      len: 4,
      start: "COLD",
      end: "WARM",
      pool: ["COLD", "CORD", "CORE", "CARE", "WARM", "CARD", "WARD", "WORD", "WORK", "CORK", "CORP", "COLT", "WORT", "WART", "WARE", "WARP", "CARP", "WORM"]
    },
    {
      len: 4,
      start: "HEAD",
      end: "TAIL",
      pool: ["HEAD", "HEAL", "TEAL", "TAIL", "TELL", "TALL", "TILL", "TILE", "HALE", "HAUL", "HAIL", "HALL", "TALL", "TAIL", "TEAL", "TELL"]
    },
    {
      len: 4,
      start: "FISH",
      end: "BIRD",
      pool: ["FISH", "FIST", "WISH", "WISP", "DISP", "DIRT", "DIRG", "BIRD", "FIST", "WIST", "DIRT", "BIRT"]
    },
    {
      len: 5,
      start: "BLACK",
      end: "WHITE",
      pool: ["BLACK", "CLACK", "CLICK", "CLICH", "CHICH", "CHICE", "WHITE", "SLICK", "SLICE", "SPICE", "SPITE", "WHITE", "BLINK", "BLANK", "BLANE", "WHALE", "WHITE"]
    },
    {
      len: 3,
      start: "CAT",
      end: "DOG",
      pool: ["CAT", "COT", "COG", "DOG", "CAB", "COB", "COG", "COW", "COT", "DOG", "HOG", "HAG", "HAT", "HOT", "DOT", "DOG"]
    },
    {
      len: 4,
      start: "DARK",
      end: "LIGHT",
      pool: ["DARK", "DART", "TART", "TARTS", "START", "STAIR", "STARE", "STALE", "STYLE", "SYTLE", "WHILE", "WHITE", "LIGHT", "LATE", "LITE", "LIMN", "LIMB", "LAME", "LAMP", "LIMY", "LIST", "LIT", "LITE", "LITT", "LIVER", "LITE", "LIGHT"]
    },
  ];

  function neighbors(word, pool) {
    const res = [];
    for (const w of pool) {
      if (w === word) continue;
      if (w.length !== word.length) continue;
      let diff = 0;
      for (let i = 0; i < w.length; i++) if (w[i] !== word[i]) diff++;
      if (diff === 1) res.push(w);
    }
    return res;
  }

  let live = null;
  GameRegistry.register({
    id: "wordladder",
    name: "Word Ladder",
    icon: "🪜",
    category: "word",
    description: "Change one word into another, one letter at a time",
    tags: ["word", "thinking"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let ladder = null, current = "", end = "", steps = [], over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Steps</div><div class="val" id="wl-steps">0</div></div>
          <div class="score-cell"><div class="label">Target</div><div class="val" id="wl-end">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wl-best">—</div></div>
        </div>
        <div class="status info" id="wl-status">Change each letter to reach the target word. Each step must be a real word.</div>
        <div id="wl-chain" style="display:flex;flex-direction:column;gap:6px;align-items:center;margin:14px 0;"></div>
        <div id="wl-active" style="display:flex;gap:4px;justify-content:center;margin:10px 0;"></div>
        <div id="wl-suggestions" class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;"></div>
        <p class="hint">Click a letter to change it. Then pick a new letter (or type). Each intermediate word must be in the word pool.</p>
      `;
      const statusEl = root.querySelector("#wl-status");
      const chainEl = root.querySelector("#wl-chain");
      const activeEl = root.querySelector("#wl-active");
      const suggEl = root.querySelector("#wl-suggestions");
      if (!document.getElementById("wl-style")) {
        const s = document.createElement("style");
        s.id = "wl-style";
        s.textContent = `
          .wl-word { font-family: var(--font-mono); font-size: 1.4rem; letter-spacing: 0.25em; font-weight: 700; }
          .wl-letter { display: inline-block; padding: 4px 6px; border-radius: 4px; cursor: pointer; }
          .wl-letter:hover { background: var(--bg-elev); }
          .wl-letter.active { background: var(--accent-soft); outline: 2px solid var(--accent); color: var(--accent); }
          .wl-letter.changed { color: var(--accent-2); }
          .wl-sugg { padding: 6px 12px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-sm); cursor: pointer; font-family: var(--font-mono); font-weight: 700; }
          .wl-sugg:hover { border-color: var(--accent); color: var(--accent); }
          .wl-arrow { color: var(--text-muted); }
        `;
        document.head.appendChild(s);
      }

      let activeLetterIdx = -1;

      function renderChain() {
        chainEl.innerHTML = "";
        steps.forEach((w, i) => {
          const row = document.createElement("div");
          row.className = "wl-word";
          row.innerHTML = `<span style="color:var(--text-muted);font-size:0.7em;margin-right:8px;">${i + 1}.</span>${w}`;
          chainEl.appendChild(row);
          if (i < steps.length - 1) {
            const arrow = document.createElement("div");
            arrow.className = "wl-arrow";
            arrow.textContent = "↓";
            chainEl.appendChild(arrow);
          }
        });
        root.querySelector("#wl-steps").textContent = steps.length - 1;
      }

      function renderActive() {
        activeEl.innerHTML = "";
        if (over) return;
        current.split("").forEach((c, i) => {
          const span = document.createElement("span");
          span.className = "wl-letter" + (i === activeLetterIdx ? " active" : "");
          if (ladder && current[i] !== ladder.start[i]) span.classList.add("changed");
          span.textContent = c;
          span.addEventListener("click", () => {
            activeLetterIdx = (activeLetterIdx === i) ? -1 : i;
            AudioFX.tick();
            renderActive();
            renderSuggestions();
          });
          activeEl.appendChild(span);
        });
      }

      function renderSuggestions() {
        suggEl.innerHTML = "";
        if (over || activeLetterIdx < 0) return;
        // Show all single-letter changes that are valid words in the pool
        const candidates = [];
        for (let i = 0; i < 26; i++) {
          const L = String.fromCharCode(65 + i);
          if (L === current[activeLetterIdx]) continue;
          const newWord = current.split("");
          newWord[activeLetterIdx] = L;
          const w = newWord.join("");
          if (ladder.pool.includes(w) && !steps.includes(w)) candidates.push(w);
        }
        if (!candidates.length) {
          const el = document.createElement("div");
          el.className = "text-muted text-sm";
          el.textContent = "No valid words from this letter";
          suggEl.appendChild(el);
          return;
        }
        candidates.forEach(w => {
          const btn = document.createElement("button");
          btn.className = "wl-sugg";
          btn.textContent = w;
          btn.addEventListener("click", () => applyWord(w));
          suggEl.appendChild(btn);
        });
      }

      function applyWord(w) {
        if (over) return;
        if (ladder.pool.includes(w) && !steps.includes(w)) {
          steps.push(w);
          current = w;
          activeLetterIdx = -1;
          AudioFX.pop();
          if (w === end) {
            over = true;
            statusEl.textContent = `🎉 Reached the target in ${steps.length - 1} steps!`;
            statusEl.className = "status win";
            AudioFX.win();
            const score = Math.max(0, 100 - (steps.length - 1) * 5);
            const best = Storage.getBest("wordladder");
            if (!best || score > best) {
              Storage.setBest("wordladder", score);
              root.querySelector("#wl-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
          } else {
            statusEl.textContent = `Good step. Keep going to reach "${end}".`;
            statusEl.className = "status info";
          }
          renderChain();
          renderActive();
          renderSuggestions();
        } else {
          AudioFX.error();
          statusEl.textContent = "Not a valid next word";
          statusEl.className = "status lose";
        }
      }

      function onKey(e) {
        if (over) return;
        if (activeLetterIdx < 0) return;
        if (/^[a-zA-Z]$/.test(e.key)) {
          const newWord = current.split("");
          newWord[activeLetterIdx] = e.key.toUpperCase();
          applyWord(newWord.join(""));
        }
      }

      document.addEventListener("keydown", onKey);

      function newGame() {
        ladder = LADDERS[Math.floor(Math.random() * LADDERS.length)];
        current = ladder.start;
        end = ladder.end;
        steps = [current];
        over = false;
        activeLetterIdx = -1;
        root.querySelector("#wl-end").textContent = end;
        const best = Storage.getBest("wordladder");
        root.querySelector("#wl-best").textContent = best || "—";
        statusEl.textContent = `Change "${current}" into "${end}" one letter at a time.`;
        statusEl.className = "status info";
        renderChain();
        renderActive();
        renderSuggestions();
      }

      live = {
        hint: function () {
          if (over) return;
          // Find shortest path from current to end using BFS
          const visited = new Set([current]);
          const q = [[current]];
          while (q.length) {
            const path = q.shift();
            const w = path[path.length - 1];
            if (w === end) {
              if (path.length < 2) {
                App.toast("Already there!", "info");
                return;
              }
              const next = path[1];
              App.toast(`Hint: try "${next}" next`, "info");
              AudioFX.reveal();
              return;
            }
            for (const n of neighbors(w, ladder.pool)) {
              if (!visited.has(n) && !steps.includes(n)) {
                visited.add(n);
                q.push([...path, n]);
              }
            }
          }
          App.toast("No hint path found", "info");
        }, solve: function () {
          if (over) return;
          const visited = new Set([current]);
          const q = [[current]];
          while (q.length) {
            const path = q.shift();
            const w = path[path.length - 1];
            if (w === end) {
              path.slice(1).forEach(p => steps.push(p));
              current = end;
              over = true;
              statusEl.textContent = `Solution revealed in ${steps.length - 1} steps`;
              statusEl.className = "status lose";
              AudioFX.lose();
              renderChain();
              renderActive();
              renderSuggestions();
              return;
            }
            for (const n of neighbors(w, ladder.pool)) {
              if (!visited.has(n) && !steps.includes(n)) {
                visited.add(n);
                q.push([...path, n]);
              }
            }
          }
        }
      };
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
      App.showModal("How to play Word Ladder",
        `Transform the <b>start word</b> into the <b>target word</b>, one letter at a time.
        <br><br>Each intermediate word must be a real word in the puzzle's pool.
        <br><br>Click a letter position to make it active, then either pick a suggested word or type a letter.
        <br><br>Reach the target in as few steps as possible.`);
    },
  });
})();
