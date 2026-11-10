/* Hyper Sudoku — 4x4 Sudoku (1-4 per row/col/2x2 box) + 2 extra 2x2 regions. */
(function () {
  // 4x4 sudoku with extra hyper regions: top-middle 2x2 and bottom-middle 2x2 (overlapping center).
  // grid coords 0..3. Hyper region A = cells (0,1),(0,2),(1,1),(1,2).
  // Hyper region B = cells (2,1),(2,2),(3,1),(3,2).
  const PUZZLES = [{
    "blanks": [[0, 0], [0, 2], [1, 1], [1, 3], [2, 0], [2, 3], [3, 1]],
    "solution": [[3, 2, 1, 4], [1, 4, 3, 2], [2, 1, 4, 3], [4, 3, 2, 1]]
  }, {
    "blanks": [[0, 1], [0, 3], [1, 0], [2, 2], [2, 3], [3, 0], [3, 3]],
    "solution": [[3, 2, 1, 4], [1, 4, 3, 2], [2, 1, 4, 3], [4, 3, 2, 1]]
  }, {
    "solution": [[1, 2, 3, 4], [3, 4, 1, 2], [2, 1, 4, 3], [4, 3, 2, 1]],
    "blanks": [[0, 0], [0, 3], [1, 1], [1, 2], [2, 0], [3, 2], [3, 3]]
  }];
  const N = 4;
  const HYPER = [[[0, 1], [0, 2], [1, 1], [1, 2]], [[2, 1], [2, 2], [3, 1], [3, 2]]];
  let live = null;
  GameRegistry.register({
    id: "sudokuhyper",
    name: "Hyper Sudoku",
    icon: "🟦",
    category: "logic",
    description: "4x4 Sudoku plus 2 extra 2x2 regions",
    tags: ["logic", "sudoku", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, grid, given, over = false;
      root.innerHTML = `
        <div class="status info" id="sh-status">Fill the grid so each row, column, 2x2 box, AND highlighted region has 1-4.</div>
        <div class="center" style="margin:14px 0;"><div id="sh-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sh-clear">Clear</button>
          <button class="btn primary" id="sh-check">Check</button>
        </div>
        <p class="hint">Bold-bordered regions are the extra constraints. Click a cell to cycle 1-4.</p>
      `;
      const statusEl = root.querySelector("#sh-status");
      const gridEl = root.querySelector("#sh-grid");
      if (!document.getElementById("sh-style")) {
        const s = document.createElement("style");
        s.id = "sh-style";
        s.textContent = `#sh-grid{display:grid;grid-template-columns:repeat(${N},54px);gap:1px;background:var(--border);padding:1px;}.sh-cell{width:54px;height:54px;background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1.3rem;cursor:pointer;color:var(--text);position:relative;}.sh-cell.given{color:var(--accent);cursor:default;}.sh-cell.hyper{background:var(--bg-soft);box-shadow:inset 0 0 0 2px var(--warning);}`;
        document.head.appendChild(s);
      }

      function isHyper(r, c) {
        return HYPER.some(reg => reg.some(p => p[0] === r && p[1] === c));
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sh-cell" + (given[r][c] ? " given" : "") + (isHyper(r, c) ? " hyper" : "");
            cell.textContent = grid[r][c] || "";
            if (!given[r][c]) cell.addEventListener("click", () => {
              if (over) return;
              let v = grid[r][c] || 0;
              v = (v + 1) % (N + 1);
              grid[r][c] = v || 0;
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
      }

      function valid() {
        // rows & cols
        for (let r = 0; r < N; r++) {
          const v = grid[r].filter(x => x);
          if (new Set(v).size !== v.length) return false;
        }
        for (let c = 0; c < N; c++) {
          const v = [];
          for (let r = 0; r < N; r++) if (grid[r][c]) v.push(grid[r][c]);
          if (new Set(v).size !== v.length) return false;
        }
        // 2x2 boxes
        for (let br = 0; br < 2; br++) for (let bc = 0; bc < 2; bc++) {
          const v = [];
          for (let r = br * 2; r < br * 2 + 2; r++) for (let c = bc * 2; c < bc * 2 + 2; c++) if (grid[r][c]) v.push(grid[r][c]);
          if (new Set(v).size !== v.length) return false;
        }
        // hyper regions
        for (const reg of HYPER) {
          const v = reg.map(([r, c]) => grid[r][c]).filter(x => x);
          if (new Set(v).size !== v.length) return false;
        }
        return true;
      }

      function check() {
        if (over) return;
        const full = grid.every(row => row.every(v => v));
        if (!full) {
          AudioFX.error();
          statusEl.textContent = "Fill all cells.";
          statusEl.className = "status lose";
          return;
        }
        if (valid()) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("sudokuhyper");
          if (!best || 100 > best) {
            Storage.setBest("sudokuhyper", 100);
            App.toast("Solved!", "success");
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "Conflict — check rows, cols, boxes, hyper regions.";
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const sol = puzzle.solution;
        const blankSet = new Set(puzzle.blanks.map(b => b.join(",")));
        given = Array.from({length: N}, (_, r) => sol[r].map((v, c) => !blankSet.has(r + "," + c)));
        grid = Array.from({length: N}, (_, r) => sol[r].map((v, c) => given[r][c] ? v : 0));
        over = false;
        statusEl.textContent = "Fill the grid — 1-4 per row/col/box/hyper region.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#sh-check").addEventListener("click", check);
      root.querySelector("#sh-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!given[r][c]) grid[r][c] = 0;
        AudioFX.click();
        render();
      });
      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid.length; c++) {
            if (grid[r][c] !== puzzle.solution[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Everything is correct so far 💡", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          grid[pick[0]][pick[1]] = puzzle.solution[pick[0]][pick[1]];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${pick[0] + 1}, column ${pick[1] + 1} revealed`, "info");
        },
        solve: function () {
          if (over) return;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = puzzle.solution[r][c];
          over = true;
          AudioFX.lose();
          statusEl.textContent = "Solution revealed.";
          statusEl.className = "status lose";
          render();
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
      App.showModal("How to play Hyper Sudoku",
        `Fill the 4×4 grid with digits 1-4 so that each <b>row</b>, each <b>column</b>, and each 2×2 <b>box</b> contains 1-4.
        <br><br><b>Hyper rule:</b> the two extra 2×2 regions (highlighted with warning-color borders) must also each contain 1-4.`);
    },
  });
})();
