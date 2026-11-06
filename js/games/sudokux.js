/* Sudoku X — 4×4 sudoku (2×2 boxes) with both diagonals also unique. */
(function () {
  // Solutions: 4×4 grids valid for sudoku + diagonals.
  const SOLUTIONS = [
    [[1, 2, 3, 4], [3, 4, 1, 2], [4, 1, 2, 3], [2, 3, 4, 1]],
    [[1, 3, 4, 2], [4, 2, 1, 3], [2, 4, 3, 1], [3, 1, 2, 4]],
    [[2, 1, 4, 3], [3, 4, 1, 2], [4, 3, 2, 1], [1, 2, 3, 4]],
    [[4, 3, 2, 1], [1, 2, 3, 4], [2, 1, 4, 3], [3, 4, 1, 2]],
  ];

  let live = null;
  GameRegistry.register({
    id: "sudokux",
    name: "Sudoku X",
    icon: "✖️",
    category: "logic",
    description: "4×4 Sudoku — rows, cols, 2×2 boxes, AND both diagonals",
    tags: ["logic", "sudoku", "thinking"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let solution = null, grid = null, locked = null, over = false;
      const N = 4;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="sx-filled">0 / 16</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="sx-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sx-best">—</div></div>
        </div>
        <div class="status info" id="sx-status">Click a cell, then type 1–4. Rows, columns, 2×2 boxes, and both diagonals must each have 1,2,3,4.</div>
        <div class="center" style="margin:14px 0;"><div class="sx-grid" id="sx-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sx-clear">Clear</button>
          <button class="btn primary" id="sx-check">Check</button>
        </div>
        <p class="hint">Both diagonals (highlighted) must also contain 1, 2, 3, 4 exactly once — in addition to the rows, columns, and 2×2 boxes.</p>
      `;
      const statusEl = root.querySelector("#sx-status");
      const gridEl = root.querySelector("#sx-grid");
      if (!document.getElementById("sx-style")) {
        const s = document.createElement("style");
        s.id = "sx-style";
        s.textContent = `
          .sx-grid { display: grid; grid-template-columns: repeat(4, 56px); gap: 2px; background: var(--border); padding: 6px; border-radius: var(--radius); }
          .sx-cell { width: 56px; height: 56px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.4rem; cursor: pointer; user-select: none; color: var(--text); }
          .sx-cell.diag { background: var(--accent-soft); }
          .sx-cell.locked { background: var(--bg-soft); cursor: default; }
          .sx-cell.active { outline: 3px solid var(--accent); }
          .sx-cell.error { color: var(--danger); }
          .sx-cell.box-r { border-right: 2px solid var(--text); }
          .sx-cell.box-b { border-bottom: 2px solid var(--text); }
        `;
        document.head.appendChild(s);
      }

      let activeCell = null;

      function isDiag(r, c) {
        return r === c || r + c === N - 1;
      }

      function errors() {
        const errs = new Set();
        // rows
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            const v = grid[r][c];
            if (v === null) continue;
            if (seen[v] !== undefined) {
              errs.add(`${r},${c}`);
              errs.add(`${r},${seen[v]}`);
            }
            seen[v] = c;
          }
        }
        // cols
        for (let c = 0; c < N; c++) {
          const seen = {};
          for (let r = 0; r < N; r++) {
            const v = grid[r][c];
            if (v === null) continue;
            if (seen[v] !== undefined) {
              errs.add(`${r},${c}`);
              errs.add(`${seen[v]},${c}`);
            }
            seen[v] = r;
          }
        }
        // 2x2 boxes
        for (let br = 0; br < 2; br++) for (let bc = 0; bc < 2; bc++) {
          const seen = {};
          for (let r = br * 2; r < br * 2 + 2; r++) for (let c = bc * 2; c < bc * 2 + 2; c++) {
            const v = grid[r][c];
            if (v === null) continue;
            if (seen[v]) {
              errs.add(`${r},${c}`);
              errs.add(seen[v]);
            }
            seen[v] = `${r},${c}`;
          }
        }
        // diag \
        let seen = {};
        for (let i = 0; i < N; i++) {
          const v = grid[i][i];
          if (v === null) continue;
          if (seen[v]) {
            errs.add(`${i},${i}`);
            errs.add(seen[v]);
          }
          seen[v] = `${i},${i}`;
        }
        // diag /
        seen = {};
        for (let i = 0; i < N; i++) {
          const v = grid[i][N - 1 - i];
          if (v === null) continue;
          if (seen[v]) {
            errs.add(`${i},${N - 1 - i}`);
            errs.add(seen[v]);
          }
          seen[v] = `${i},${N - 1 - i}`;
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        let filled = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sx-cell";
            if (isDiag(r, c)) cell.classList.add("diag");
            if (locked[r][c]) cell.classList.add("locked");
            if (c === 1) cell.classList.add("box-r");
            if (r === 1) cell.classList.add("box-b");
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            if (errs.has(`${r},${c}`) && !locked[r][c]) cell.classList.add("error");
            const v = grid[r][c];
            if (v !== null) {
              cell.textContent = v;
              filled++;
            }
            if (!locked[r][c]) {
              cell.addEventListener("click", () => {
                activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
                AudioFX.tick();
                render();
              });
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#sx-filled").textContent = `${filled} / 16`;
        root.querySelector("#sx-errors").textContent = errs.size;
      }

      function onKey(e) {
        if (over || !activeCell) return;
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[activeCell[0]][activeCell[1]] = null;
          AudioFX.click();
          render();
          return;
        }
        if (/^[1-4]$/.test(e.key)) {
          grid[activeCell[0]][activeCell[1]] = parseInt(e.key, 10);
          AudioFX.pop();
          // advance
          let [r, c] = activeCell;
          let found = null;
          for (let i = r * N + c + 1; i < N * N; i++) {
            const rr = Math.floor(i / N), cc = i % N;
            if (!locked[rr][cc]) {
              found = [rr, cc];
              break;
            }
          }
          activeCell = found;
          render();
          checkAuto();
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("sudokux");
          if (!best || 100 > best) {
            Storage.setBest("sudokux", 100);
            root.querySelector("#sx-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        if (errors().size === 0) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Conflicts remain";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#sx-check").addEventListener("click", check);
      root.querySelector("#sx-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!locked[r][c]) grid[r][c] = null;
        AudioFX.click();
        render();
      });

      function newGame() {
        solution = JSON.parse(JSON.stringify(SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)]));
        grid = solution.map(r => r.slice());
        locked = Array.from({length: N}, () => Array(N).fill(false));
        // blank out 8 cells (keep 8 as locked)
        const cells = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        cells.slice(0, 8).forEach(([r, c]) => {
          locked[r][c] = true;
        });
        cells.slice(8).forEach(([r, c]) => {
          grid[r][c] = null;
        });
        activeCell = null;
        over = false;
        const best = Storage.getBest("sudokux");
        root.querySelector("#sx-best").textContent = best || "—";
        statusEl.textContent = "Click a cell, then type 1–4. Rows, columns, 2×2 boxes, and both diagonals must each have 1,2,3,4.";
        statusEl.className = "status info";
        render();
      }

      live = {
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
        document.removeEventListener("keydown", onKey);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Sudoku X",
        `Fill the 4×4 grid with <b>1, 2, 3, 4</b>:
        <br>• Each <b>row</b> has 1, 2, 3, 4.
        <br>• Each <b>column</b> has 1, 2, 3, 4.
        <br>• Each <b>2×2 box</b> has 1, 2, 3, 4.
        <br>• <b>Both diagonals</b> (highlighted) have 1, 2, 3, 4.
        <br><br>Click a cell, then type a number. <b>Backspace</b> clears.`);
    },
  });
})();
