/* Word Search — 12x12 grid with 8 hidden words. Drag to select. Hint reveals first letter of one word. */
(function () {
  const N = 12;
  let live = null;
  const CATS = {
    animals: ["CAT", "DOG", "LION", "TIGER", "HORSE", "MONKEY", "RABBIT", "ELEPHANT"],
    fruits: ["APPLE", "BANANA", "MANGO", "PEACH", "LEMON", "GRAPE", "CHERRY", "ORANGE"],
    colors: ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE", "PINK", "BLACK"],
    space: ["STAR", "MOON", "COMET", "PLANET", "GALAXY", "ROCKET", "ORBIT", "METEOR"],
    ocean: ["WAVE", "FISH", "SHARK", "WHALE", "CORAL", "PEARL", "OCEAN", "DOLPHIN"],
  };

  function placeWords(grid, words) {
    const dirs = [[0, 1], [1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, -1], [-1, 0]];
    for (const w of words) {
      let placed = false, tries = 0;
      while (!placed && tries < 200) {
        tries++;
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        const r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
        const endR = r0 + dr * (w.length - 1), endC = c0 + dc * (w.length - 1);
        if (endR < 0 || endR >= N || endC < 0 || endC >= N) continue;
        let ok = true;
        for (let i = 0; i < w.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i;
          if (grid[r][c] !== "" && grid[r][c] !== w[i]) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (let i = 0; i < w.length; i++) {
          const r = r0 + dr * i, c = c0 + dc * i;
          grid[r][c] = w[i];
        }
        placed = true;
      }
    }
  }

  function fillRandom(grid) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (grid[r][c] === "") grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    }
  }

  GameRegistry.register({
    id: "wordsearch",
    name: "Word Search",
    icon: "🔍",
    category: "word",
    description: "Find 8 hidden words in the letter grid",
    tags: ["word", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid, words, found, dragStart = null, dragEnd = null;
      const catKeys = Object.keys(CATS);
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

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Found</div><div class="val" id="ws-found">0/8</div></div>
          <div class="score-cell"><div class="label">Theme</div><div class="val" id="ws-theme">-</div></div>
        </div>
        <div class="status info" id="ws-status">Drag across letters to mark a word</div>
        <div class="center"><div id="ws-grid" style="display:inline-grid;grid-template-columns:repeat(${N},28px);grid-template-rows:repeat(${N},28px);gap:1px;background:var(--border);padding:1px;border-radius:var(--radius-sm);user-select:none;"></div></div>
        <div id="ws-words" style="margin-top:8px;text-align:center;"></div>
        <p class="hint">Click & drag from start to end of a word. <b>R</b> new puzzle.</p>
      `;
      const gridEl = root.querySelector("#ws-grid");
      const statusEl = root.querySelector("#ws-status");

      function newPuzzle() {
        const cat = catKeys[Math.floor(Math.random() * catKeys.length)];
        words = CATS[cat].slice();
        root.querySelector("#ws-theme").textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        grid = Array.from({length: N}, () => Array(N).fill(""));
        placeWords(grid, words);
        fillRandom(grid);
        found = new Set();
        renderGrid();
        renderWords();
        statusEl.textContent = `Find 8 words about ${cat}. Drag to mark.`;
        statusEl.className = "status info";
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "mw-cell";
          cell.style.width = "28px";
          cell.style.height = "28px";
          cell.style.background = "var(--bg-elev)";
          cell.style.cursor = "pointer";
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.textContent = grid[r][c];
          gridEl.appendChild(cell);
        }
      }

      function renderWords() {
        const el = root.querySelector("#ws-words");
        el.innerHTML = words.map(w => `<span style="display:inline-block;padding:4px 10px;margin:3px;border-radius:999px;background:${found.has(w) ? "var(--success)" : "var(--bg-elev)"};color:${found.has(w) ? "#fff" : "var(--text)"};font-size:0.85rem;text-decoration:${found.has(w) ? "line-through" : "none"};">${w}</span>`).join("");
        root.querySelector("#ws-found").textContent = `${found.size}/${words.length}`;
      }

      function cellsBetween(a, b) {
        // returns null if not straight line, else list of cells
        const dr = b.r - a.r, dc = b.c - a.c;
        const adr = Math.abs(dr), adc = Math.abs(dc);
        if (dr !== 0 && dc !== 0 && adr !== adc) return null;
        const len = Math.max(adr, adc) + 1;
        const sr = dr === 0 ? 0 : dr / adr;
        const sc = dc === 0 ? 0 : dc / adc;
        const out = [];
        for (let i = 0; i < len; i++) out.push({r: a.r + sr * i, c: a.c + sc * i});
        return out;
      }

      function highlight(cells) {
        gridEl.querySelectorAll(".mw-cell").forEach(c => c.style.background = "var(--bg-elev)");
        if (!cells) return;
        for (const {r, c} of cells) {
          const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
          if (el) el.style.background = "var(--accent-soft)";
        }
      }

      function checkWord(cells) {
        const letters = cells.map(({r, c}) => grid[r][c]).join("");
        const rev = letters.split("").reverse().join("");
        for (const w of words) {
          if (found.has(w)) continue;
          if (w === letters || w === rev) {
            found.add(w);
            AudioFX.win();
            // mark permanently
            for (const {r, c} of cells) {
              const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
              if (el) {
                el.style.background = "var(--success)";
                el.style.color = "#fff";
              }
            }
            renderWords();
            if (found.size === words.length) {
              statusEl.textContent = "🎉 All words found!";
              statusEl.className = "status win";
              AudioFX.win();
              Storage.submitScore("wordsearch", (Storage.getBest("wordsearch") || 0) + 1);
            } else {
              statusEl.textContent = `✓ Found ${w}! ${words.length - found.size} left`;
              statusEl.className = "status win";
            }
            return true;
          }
        }
        return false;
      }

      gridEl.addEventListener("mousedown", e => {
        const t = e.target.closest(".mw-cell");
        if (!t) return;
        dragStart = {r: +t.dataset.r, c: +t.dataset.c};
        dragEnd = dragStart;
        highlight([dragStart]);
        e.preventDefault();
      });
      gridEl.addEventListener("mousemove", e => {
        if (!dragStart) return;
        const t = e.target.closest(".mw-cell");
        if (!t) return;
        dragEnd = {r: +t.dataset.r, c: +t.dataset.c};
        const cells = cellsBetween(dragStart, dragEnd);
        highlight(cells);
      });

      function endDrag() {
        if (!dragStart) return;
        const cells = cellsBetween(dragStart, dragEnd);
        if (cells) {
          if (!checkWord(cells)) {
            highlight(null);
            AudioFX.error();
          }
        } else highlight(null);
        dragStart = null;
        dragEnd = null;
      }

      gridEl.addEventListener("mouseup", endDrag);
      gridEl.addEventListener("mouseleave", () => {
        if (dragStart) {
          highlight(null);
          dragStart = null;
        }
      });
      // touch
      gridEl.addEventListener("touchstart", e => {
        const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        const cell = t && t.closest && t.closest(".mw-cell");
        if (!cell) return;
        dragStart = {r: +cell.dataset.r, c: +cell.dataset.c};
        dragEnd = dragStart;
        highlight([dragStart]);
        e.preventDefault();
      }, {passive: false});
      gridEl.addEventListener("touchmove", e => {
        if (!dragStart) return;
        const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        const cell = t && t.closest && t.closest(".mw-cell");
        if (!cell) return;
        dragEnd = {r: +cell.dataset.r, c: +cell.dataset.c};
        const cells = cellsBetween(dragStart, dragEnd);
        highlight(cells);
        e.preventDefault();
      }, {passive: false});
      gridEl.addEventListener("touchend", endDrag);

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newPuzzle();
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        const remaining = words.filter(w => !found.has(w));
        if (!remaining.length) {
          App.toast("All found!", "info");
          return;
        }
        // find first letter position in grid
        const w = remaining[Math.floor(Math.random() * remaining.length)];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (grid[r][c] === w[0]) {
            // check if word fits
            for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1], [0, -1], [-1, 0]]) {
              let ok = true;
              for (let i = 0; i < w.length; i++) {
                const rr = r + dr * i, cc = c + dc * i;
                if (rr < 0 || rr >= N || cc < 0 || cc >= N || grid[rr][cc] !== w[i]) {
                  ok = false;
                  break;
                }
              }
              if (ok) {
                const el = gridEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
                if (el) {
                  const orig = el.style.background;
                  el.style.background = "var(--warning)";
                  el.style.color = "#fff";
                  AudioFX.reveal();
                  later(() => {
                    if (alive) {
                      if (!found.has(w)) {
                        el.style.background = orig;
                        el.style.color = "";
                      }
                    }
                  }, 1500);
                }
                App.toast(`Hint: ${w[0]} starts a word`, "info");
                return;
              }
            }
          }
        }
      }

      live = {hint: doHint};
      newPuzzle();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    help: function () {
      App.showModal("How to play Word Search",
        `Find all 8 hidden words in the grid. Words can run horizontally, vertically, or diagonally, and forwards or backwards.
        <br><br>Drag from the first letter to the last letter of a word to mark it. Correct words stay highlighted.
        <br><br>Press <b>R</b> for a new puzzle. <b>Hint</b> highlights the first letter of an unfound word.`);
    },
  });
})();
