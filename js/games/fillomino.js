/* Fillomino — fill the grid so every cell has a number, and each group of equal numbers is exactly that size. */
(function () {
  // 4×4 puzzles: grid = pre-filled cells (0 = blank), sol = full solution
  const PUZZLES = [
    {
      grid: [[1, 0, 0, 4], [0, 0, 0, 0], [0, 0, 0, 0], [2, 0, 0, 3]],
      sol: [[1, 1, 4, 4], [1, 4, 4, 4], [2, 2, 3, 3], [2, 2, 2, 3]],
    },
    {
      grid: [[3, 0, 0, 0], [0, 0, 2, 0], [0, 1, 0, 0], [0, 0, 0, 4]],
      sol: [[3, 3, 3, 4], [3, 2, 2, 4], [1, 1, 2, 4], [4, 4, 4, 4]],
    },
  ];
  const N = 4;

  let live = null;
  GameRegistry.register({
    id: "fillomino",
    name: "Fillomino",
    icon: "🧩",
    category: "logic",
    description: "Fill the grid so each n-group has exactly n cells",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, locked = null, over = false;
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="fm-filled">0 / ${N * N}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="fm-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fm-best">—</div></div>
        </div>
        <div class="status info" id="fm-status">Click a cell, then type a digit (1-4). Each group of equal numbers must be exactly that size.</div>
        <div class="center" style="margin:14px 0;"><div class="fm-grid" id="fm-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="fm-clear">Clear</button>
          <button class="btn primary" id="fm-check">Check</button>
        </div>
        <p class="hint">Fill every cell with a number. Each connected group of equal numbers must be <b>exactly that size</b>. E.g. a group of 3s must contain exactly 3 cells.</p>
      `;
      const statusEl = root.querySelector("#fm-status");
      const gridEl = root.querySelector("#fm-grid");
      if (!document.getElementById("fm-style")) {
        const s = document.createElement("style");
        s.id = "fm-style";
        s.textContent = `
          .fm-grid { display: inline-grid; grid-template-columns: repeat(${N}, 56px); gap: 3px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .fm-cell { width: 56px; height: 56px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.3rem; cursor: pointer; user-select: none; color: var(--text); }
          .fm-cell.locked { background: var(--bg-soft); cursor: default; }
          .fm-cell.active { outline: 3px solid var(--accent); }
          .fm-cell.error { color: var(--danger); }
          .fm-cell.correct { color: var(--success); }
        `;
        document.head.appendChild(s);
      }

      function floodFillSize(r, c, v) {
        // Returns the size of the connected group of value v containing (r, c)
        if (v === null || v === 0) return 0;
        const visited = new Set();
        const stack = [[r, c]];
        let size = 0;
        while (stack.length) {
          const [rr, cc] = stack.pop();
          const key = `${rr},${cc}`;
          if (visited.has(key)) continue;
          if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
          if (grid[rr][cc] !== v) continue;
          visited.add(key);
          size++;
          stack.push([rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]);
        }
        return size;
      }

      function errors() {
        const errs = new Set();
        // For each cell, check if its group's size matches its value
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const v = grid[r][c];
            if (v === null || v === 0) {
              if (!locked[r][c]) errs.add(`${r},${c}`);
              continue;
            }
            const size = floodFillSize(r, c, v);
            if (size !== v) {
              // Mark all cells in this group as errors
              const visited = new Set();
              const stack = [[r, c]];
              while (stack.length) {
                const [rr, cc] = stack.pop();
                const key = `${rr},${cc}`;
                if (visited.has(key)) continue;
                if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
                if (grid[rr][cc] !== v) continue;
                visited.add(key);
                if (!locked[rr][cc]) errs.add(key);
                stack.push([rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]);
              }
            }
          }
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
            cell.className = "fm-cell";
            if (locked[r][c]) cell.classList.add("locked");
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            const v = grid[r][c];
            if (v !== null && v !== 0) {
              cell.textContent = v;
              filled++;
              if (errs.has(`${r},${c}`)) cell.classList.add("error");
              else cell.classList.add("correct");
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
        root.querySelector("#fm-filled").textContent = `${filled} / ${N * N}`;
        root.querySelector("#fm-errors").textContent = errs.size;
      }

      function onKey(e) {
        if (over || !activeCell) return;
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[activeCell[0]][activeCell[1]] = null;
          AudioFX.click();
          render();
          return;
        }
        if (/^[1-9]$/.test(e.key)) {
          grid[activeCell[0]][activeCell[1]] = parseInt(e.key, 10);
          AudioFX.pop();
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
        const allFilled = grid.every(r => r.every(v => v !== null && v !== 0));
        if (!allFilled) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("fillomino");
          if (!best || 100 > best) {
            Storage.setBest("fillomino", 100);
            root.querySelector("#fm-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v !== null && v !== 0));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        if (errors().size === 0) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Some groups have the wrong size";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#fm-check").addEventListener("click", check);
      root.querySelector("#fm-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!locked[r][c]) grid[r][c] = null;
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = puzzle.sol.map(r => r.slice());
        locked = Array.from({length: N}, () => Array(N).fill(false));
        // Lock the original pre-filled cells (those that are non-zero in puzzle.grid)
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (puzzle.grid[r][c] !== 0) {
            locked[r][c] = true;
          } else {
            grid[r][c] = null;
          }
        }
        activeCell = null;
        over = false;
        const best = Storage.getBest("fillomino");
        root.querySelector("#fm-best").textContent = best || "—";
        statusEl.textContent = "Click a cell, then type a digit (1-4). Each group of equal numbers must be exactly that size.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          grid = puzzle.sol.map(r => r.slice());
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
      App.showModal("How to play Fillomino",
        `Fill every cell of the grid with a number (1-N).
        <br><br>Each <b>connected group</b> of equal numbers (orthogonally adjacent) must contain <b>exactly that many cells</b>.
        <br><br>For example, a "3" cell must be part of a connected region of exactly 3 cells all labelled "3".
        <br><br>Pre-filled cells are locked. Click a blank cell, then type a digit. <b>Backspace</b> clears.`);
    },
  });
})();
