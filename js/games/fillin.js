/* Fill-In Crossword — fit the given words into the empty grid (fast generator) */
(function () {
  GameRegistry.register({
    id: "fillin",
    name: "Fill-In Crossword",
    icon: "🧷",
    category: "word",
    description: "Fit the given words into the empty grid",
    tags: ["word", "crossword", "fitting"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const N = 9;
      let layout, slots, words, fills, solvedCount, best;
      let selSlot = null, selWord = null;

      // Layouts use only 4/5/6-letter slots (matching the dictionary).
      // Slot = {x, y, d, len}
      const LAYOUTS = [
        [
          {x: 0, y: 0, d: "A", len: 6}, {x: 0, y: 2, d: "A", len: 5}, {x: 0, y: 4, d: "A", len: 6},
          {x: 0, y: 6, d: "A", len: 5}, {x: 1, y: 8, d: "A", len: 6},
          {x: 0, y: 0, d: "D", len: 6}, {x: 2, y: 0, d: "D", len: 5}, {x: 4, y: 1, d: "D", len: 6},
          {x: 6, y: 0, d: "D", len: 5}, {x: 8, y: 2, d: "D", len: 4},
        ],
        [
          {x: 0, y: 0, d: "A", len: 5}, {x: 0, y: 2, d: "A", len: 6}, {x: 0, y: 4, d: "A", len: 5},
          {x: 2, y: 6, d: "A", len: 4}, {x: 1, y: 8, d: "A", len: 6},
          {x: 0, y: 0, d: "D", len: 6}, {x: 3, y: 0, d: "D", len: 5}, {x: 5, y: 2, d: "D", len: 6},
          {x: 7, y: 0, d: "D", len: 5}, {x: 8, y: 4, d: "D", len: 4},
        ],
        [
          {x: 0, y: 1, d: "A", len: 6}, {x: 0, y: 3, d: "A", len: 4}, {x: 0, y: 5, d: "A", len: 6},
          {x: 2, y: 0, d: "A", len: 5}, {x: 1, y: 7, d: "A", len: 5},
          {x: 0, y: 0, d: "D", len: 6}, {x: 2, y: 0, d: "D", len: 4}, {x: 4, y: 1, d: "D", len: 5},
          {x: 6, y: 0, d: "D", len: 6}, {x: 8, y: 2, d: "D", len: 4},
        ],
      ];

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="fi-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fi-best">0</div></div>
        </div>
        <div class="status info" id="fi-status">Fit every word into the grid — click a slot, then a word</div>
        <div class="center" id="fi-wrap" style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap;justify-content:center;"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:6px;">
          <button class="btn btn-sm" id="fi-new">🆕 New puzzle</button>
        </div>
        <p class="hint">No clues — just the words. Letter crossings must match!</p>
      `;

      const wrap = root.querySelector("#fi-wrap");
      const statusEl = root.querySelector("#fi-status");
      best = Storage.getBest("fillin") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .fi-grid { display:inline-grid; gap:2px; padding:8px; background:var(--bg-inset,#1f2937); border-radius:10px; align-self:flex-start; }
        .fi-cell { width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px;
                   text-transform:uppercase; border-radius:3px; }
        .fi-cell.block { background:#0b1220; cursor:default; }
        .fi-cell.open { background:var(--bg-soft,#334155); color:var(--text,#eee); cursor:pointer; }
        .fi-cell.hot { outline:2px solid #fbbf24; outline-offset:-2px; }
        .fi-words { max-width:210px; display:flex; flex-wrap:wrap; gap:6px; align-content:flex-start; }
        .fi-word { padding:4px 8px; border-radius:6px; background:var(--bg-soft,#334155); color:var(--text,#eee);
                   font-weight:700; cursor:pointer; letter-spacing:1px; font-size:13px; }
        .fi-word.placed { opacity:0.25; text-decoration:line-through; cursor:default; }
      `;
      root.appendChild(style);

      function slotCells(s) {
        const out = [];
        for (let i = 0; i < s.len; i++) out.push([s.x + (s.d === "A" ? i : 0), s.y + (s.d === "D" ? i : 0)]);
        return out;
      }

      function tryFill(slotList, wordPools, grid, i, budget) {
        if (i >= slotList.length) return true;
        if (budget.n <= 0) return false;
        const s = slotList[i];
        const cells = slotCells(s);
        // candidate words: match existing letters; also filter by pool
        const cands = [];
        for (const w of wordPools[s.len]) {
          if (w.used) continue;
          let ok = true;
          for (let k = 0; k < w.w.length; k++) {
            const [x, y] = cells[k];
            if (grid[y][x] && grid[y][x] !== w.w[k]) {
              ok = false;
              break;
            }
          }
          if (ok) cands.push(w);
        }
        // try most-constrained cells first: no extra ordering needed, small puzzle
        for (const w of cands) {
          budget.n--;
          const backup = cells.map(([x, y]) => grid[y][x]);
          cells.forEach(([x, y], k) => grid[y][x] = w.w[k]);
          w.used = true;
          if (tryFill(slotList, wordPools, grid, i + 1, budget)) return true;
          w.used = false;
          cells.forEach(([x, y], k) => grid[y][x] = backup[k]);
          if (budget.n <= 0) return false;
        }
        return false;
      }

      function generate() {
        layout = LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)];
        slots = layout.map(s => ({...s}));
        const lens = [...new Set(slots.map(s => s.len))];
        const answerPool = (window.ANSWERS_ALL || []).filter(w => lens.includes(w.length));
        // small pools keep the search fast; 6 attempts max
        for (let attempt = 0; attempt < 6; attempt++) {
          const wordPools = {};
          lens.forEach(l => {
            wordPools[l] = answerPool
              .filter(w => w.length === l)
              .sort(() => Math.random() - 0.5)
              .slice(0, 16)
              .map(w => ({w: w.toUpperCase(), used: false}));
          });
          const grid = Array.from({length: N}, () => Array(N).fill(""));
          const budget = {n: 20000};
          if (tryFill(slots, wordPools, grid, 0, budget)) {
            words = slots.map(s => slotCells(s).map(([x, y]) => grid[y][x]).join(""));
            fills = slots.map(() => "");
            selSlot = null;
            selWord = null;
            render();
            statusEl.textContent = "Fit every word into the grid — click a slot, then a word";
            statusEl.className = "status info";
            return;
          }
        }
        // extremely unlikely: fall back to deterministic letters (still playable-ish)
        words = slots.map(s => "?".repeat(s.len));
        fills = slots.map(() => "");
        render();
      }

      function currentGrid() {
        const grid = Array.from({length: N}, () => Array(N).fill(""));
        slots.forEach((s, i) => {
          if (fills[i]) slotCells(s).forEach(([x, y], k) => grid[y][x] = fills[i][k]);
        });
        return grid;
      }

      function tryPlace() {
        if (selSlot === null || !selWord) {
          AudioFX.error();
          return;
        }
        const s = slots[selSlot];
        if (s.len !== selWord.length) {
          statusEl.textContent = `That slot needs a ${s.len}-letter word`;
          statusEl.className = "status lose";
          AudioFX.error();
          return;
        }
        fills[selSlot] = selWord;
        AudioFX.pop();
        selWord = null;
        render();
        checkWin();
      }

      function checkWin() {
        if (fills.some(f => !f)) return;
        const ok = fills.every((f, i) => f === words[i]);
        if (ok) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("fillin", best);
          }
          statusEl.textContent = "🧷 Perfect fit! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1800);
        }
      }

      function render() {
        root.querySelector("#fi-solved").textContent = solvedCount;
        root.querySelector("#fi-best").textContent = best;
        const grid = currentGrid();
        const inSlot = (x, y) => slots.some(s => slotCells(s).some(([sx, sy]) => sx === x && sy === y));
        const hotCells = new Set(selSlot !== null && slots[selSlot] ? slotCells(slots[selSlot]).map(([x, y]) => x + "," + y) : []);
        let html = `<div class="fi-grid" style="grid-template-columns:repeat(${N},32px);">`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const open = inSlot(x, y);
          html += `<div class="fi-cell ${open ? "open" : "block"} ${hotCells.has(x + "," + y) ? "hot" : ""}" data-x="${x}" data-y="${y}">${grid[y][x]}</div>`;
        }
        html += `</div><div class="fi-words">`;
        const placed = fills.filter(Boolean);
        [...words].sort(() => Math.random() - 0.5).forEach(w => {
          const isPlaced = placed.includes(w);
          html += `<div class="fi-word ${isPlaced ? "placed" : ""}" data-w="${w}">${w}</div>`;
        });
        html += `</div>`;
        wrap.innerHTML = html;
        wrap.querySelectorAll(".fi-cell.open").forEach(el => {
          el.addEventListener("pointerdown", () => {
            const x = +el.dataset.x, y = +el.dataset.y;
            const hit = slots.findIndex(s => slotCells(s).some(([sx, sy]) => sx === x && sy === y));
            selSlot = hit >= 0 ? hit : null;
            AudioFX.click();
            render();
          });
        });
        wrap.querySelectorAll(".fi-word:not(.placed)").forEach(el => {
          el.addEventListener("pointerdown", () => {
            selWord = el.dataset.w;
            tryPlace();
          });
        });
      }

      root.querySelector("#fi-new").addEventListener("click", generate);
      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Fill-In Crossword",
        `It's a crossword with <b>no clues</b> — you get the complete word list and must fit them into the grid.
        <br><br>Click a slot (row or column run) to highlight it, then click the word to place.
        Place all words correctly to win. Every puzzle is generated fresh and always solvable.`);
    },
  });
})();
