/* Binairo — 6×6 binary puzzle. No three in a row; equal 0s and 1s per row & col; no duplicate rows/cols. */
(function () {
  // Pre-built valid 6x6 solutions; we blank out some cells to form the puzzle.
  const SOLUTIONS = [
    [[0, 1, 1, 0, 1, 0], [1, 0, 0, 1, 0, 1], [1, 0, 1, 0, 0, 1], [0, 1, 0, 1, 1, 0], [0, 1, 1, 0, 1, 0], [1, 0, 0, 1, 0, 1]],
    [[1, 0, 1, 0, 1, 0], [0, 1, 0, 1, 0, 1], [0, 1, 1, 0, 1, 0], [1, 0, 0, 1, 0, 1], [1, 0, 1, 0, 1, 0], [0, 1, 0, 1, 1, 0]],
    [[0, 1, 0, 1, 1, 0], [1, 0, 1, 0, 0, 1], [1, 0, 0, 1, 1, 0], [0, 1, 1, 0, 0, 1], [0, 1, 1, 0, 1, 0], [1, 0, 0, 1, 0, 1]],
  ];

  let live = null;
  GameRegistry.register({
    id: "binairo",
    name: "Binairo",
    icon: "🔢",
    category: "logic",
    description: "Fill the grid with 0s and 1s — no 3 in a row, balanced",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let solution = null, puzzle = null, grid = null, locked = null, over = false;
      const N = 6;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="bn-filled">0 / 36</div></div>
          <div class="score-cell"><div class="label">Conflicts</div><div class="val" id="bn-conflicts">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bn-best">—</div></div>
        </div>
        <div class="status info" id="bn-status">Tap a cell to toggle: empty → 0 → 1 → empty.</div>
        <div class="center" style="margin:14px 0;"><div class="bn-grid" id="bn-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="bn-clear">Clear inputs</button>
          <button class="btn primary" id="bn-check">Check</button>
        </div>
        <p class="hint">Rules: no <b>3 same in a row</b> (horizontal or vertical), each row &amp; column has <b>three 0s and three 1s</b>, no two rows or columns are identical.</p>
      `;
      const statusEl = root.querySelector("#bn-status");
      const gridEl = root.querySelector("#bn-grid");
      if (!document.getElementById("bn-style")) {
        const s = document.createElement("style");
        s.id = "bn-style";
        s.textContent = `
          .bn-grid { display: grid; grid-template-columns: repeat(6, 42px); gap: 3px; background: var(--border); padding: 3px; border-radius: var(--radius-sm); }
          .bn-cell { width: 42px; height: 42px; background: var(--bg-elev); display: grid; place-items: center; cursor: pointer; user-select: none; font-family: var(--font-mono); font-weight: 700; font-size: 1.2rem; color: var(--text); }
          .bn-cell.locked { background: var(--bg-soft); cursor: default; color: var(--text); }
          .bn-cell.zero { color: var(--accent); }
          .bn-cell.one { color: var(--accent-2); }
          .bn-cell.conflict { background: var(--danger); color: #fff; }
          .bn-cell:active { transform: scale(0.95); }
        `;
        document.head.appendChild(s);
      }

      function conflicts() {
        const cf = new Set();
        // 3 in a row — horizontal
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N - 2; c++) {
            const v = grid[r][c];
            if (v !== null && v === grid[r][c + 1] && v === grid[r][c + 2]) {
              cf.add(`${r},${c}`);
              cf.add(`${r},${c + 1}`);
              cf.add(`${r},${c + 2}`);
            }
          }
        }
        // vertical
        for (let c = 0; c < N; c++) {
          for (let r = 0; r < N - 2; r++) {
            const v = grid[r][c];
            if (v !== null && v === grid[r + 1][c] && v === grid[r + 2][c]) {
              cf.add(`${r},${c}`);
              cf.add(`${r + 1},${c}`);
              cf.add(`${r + 2},${c}`);
            }
          }
        }
        // unbalanced rows
        for (let r = 0; r < N; r++) {
          const filled = grid[r].filter(v => v !== null).length;
          if (filled === N) {
            const zeros = grid[r].filter(v => v === 0).length;
            if (zeros !== 3) for (let c = 0; c < N; c++) cf.add(`${r},${c}`);
          }
        }
        // unbalanced cols
        for (let c = 0; c < N; c++) {
          const col = grid.map(r => r[c]);
          if (col.every(v => v !== null)) {
            const zeros = col.filter(v => v === 0).length;
            if (zeros !== 3) for (let r = 0; r < N; r++) cf.add(`${r},${c}`);
          }
        }
        return cf;
      }

      function render() {
        gridEl.innerHTML = "";
        const cf = conflicts();
        let filledCount = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            const v = grid[r][c];
            cell.className = "bn-cell";
            if (locked[r][c]) cell.classList.add("locked");
            if (v === 0) cell.classList.add("zero");
            else if (v === 1) cell.classList.add("one");
            if (cf.has(`${r},${c}`) && !locked[r][c]) cell.classList.add("conflict");
            cell.textContent = v === null ? "" : v;
            if (v !== null) filledCount++;
            if (!locked[r][c]) {
              cell.addEventListener("click", () => {
                if (over) return;
                // cycle: null → 0 → 1 → null
                if (grid[r][c] === null) grid[r][c] = 0;
                else if (grid[r][c] === 0) grid[r][c] = 1;
                else grid[r][c] = null;
                AudioFX.tick();
                render();
              });
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#bn-filled").textContent = `${filledCount} / 36`;
        root.querySelector("#bn-conflicts").textContent = cf.size;
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        const cf = conflicts();
        // Duplicate rows
        const rowStrs = grid.map(r => r.join(""));
        const dupRows = new Set(rowStrs).size !== rowStrs.length;
        const colStrs = Array.from({length: N}, (_, c) => grid.map(r => r[c]).join(""));
        const dupCols = new Set(colStrs).size !== colStrs.length;
        if (cf.size === 0 && !dupRows && !dupCols) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("binairo");
          if (!best || 100 > best) {
            Storage.setBest("binairo", 100);
            root.querySelector("#bn-best").textContent = 100;
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "Not yet — keep working";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#bn-check").addEventListener("click", check);
      root.querySelector("#bn-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!locked[r][c]) grid[r][c] = null;
        AudioFX.click();
        render();
      });

      function newGame() {
        solution = JSON.parse(JSON.stringify(SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)]));
        // Blank ~50% of cells, but keep the puzzle solvable (for simplicity, just blank random cells)
        puzzle = solution.map(r => r.slice());
        locked = Array.from({length: N}, () => Array(N).fill(false));
        const cells = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
        // shuffle
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        // keep 16 cells as locked, blank the rest
        cells.slice(0, 16).forEach(([r, c]) => {
          locked[r][c] = true;
        });
        cells.slice(16).forEach(([r, c]) => {
          puzzle[r][c] = null;
        });
        grid = puzzle.map(r => r.slice());
        over = false;
        const best = Storage.getBest("binairo");
        root.querySelector("#bn-best").textContent = best || "—";
        statusEl.textContent = "Tap a cell to toggle: empty → 0 → 1 → empty.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid.length; c++) {
            if (grid[r][c] !== solution[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Everything is correct so far 💡", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          grid[pick[0]][pick[1]] = solution[pick[0]][pick[1]];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${pick[0] + 1}, column ${pick[1] + 1} revealed`, "info");
        },
        solve: function () {
          if (over) return;
          grid = solution.map(r => r.slice());
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Binairo",
        `Fill the grid with <b>0s</b> and <b>1s</b>. Three rules:
        <br><br>1. No <b>three identical in a row</b> (horizontally or vertically).
        <br>2. Each row and column has the <b>same number of 0s and 1s</b> (in a 6×6 grid: three of each).
        <br>3. No two rows or columns may be identical.
        <br><br>Tap a cell to cycle: empty → 0 → 1 → empty. Pre-filled cells are locked.`);
    },
  });
})();
