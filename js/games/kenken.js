/* KenKen — 4×4 arithmetic sudoku with cages. Each row/col has 1–4 (no repeats); cages must produce the target via the operation. */
(function () {
  const PUZZLES = [
    {
      sol: [[1, 2, 3, 4], [2, 3, 4, 1], [3, 4, 1, 2], [4, 1, 2, 3]],
      cages: [
        {cells: [[0, 0], [0, 1]], target: 3, op: "+"},
        {cells: [[0, 2], [1, 2]], target: 7, op: "+"},
        {cells: [[0, 3], [1, 3]], target: 5, op: "-"},
        {cells: [[1, 0], [2, 0]], target: 5, op: "+"},
        {cells: [[1, 1], [2, 1]], target: 7, op: "+"},
        {cells: [[2, 2], [2, 3]], target: 3, op: "+"},
        {cells: [[3, 0], [3, 1]], target: 5, op: "-"},
        {cells: [[3, 2], [3, 3]], target: 5, op: "+"},
      ],
    },
    {
      sol: [[4, 1, 2, 3], [3, 2, 1, 4], [1, 4, 3, 2], [2, 3, 4, 1]],
      cages: [
        {cells: [[0, 0], [0, 1]], target: 5, op: "+"},
        {cells: [[0, 2], [0, 3]], target: 5, op: "+"},
        {cells: [[1, 0], [2, 0]], target: 4, op: "+"},
        {cells: [[1, 1], [1, 2]], target: 3, op: "-"},
        {cells: [[1, 3], [2, 3]], target: 6, op: "+"},
        {cells: [[2, 1], [3, 1]], target: 7, op: "+"},
        {cells: [[2, 2], [3, 2]], target: 6, op: "-"},
        {cells: [[3, 0], [3, 3]], target: 3, op: "-"},
      ],
    },
  ];
  const N = 4;
  const COLORS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fae8ff", "#fed7aa", "#cffafe", "#fce7f3", "#e0e7ff"];

  function cageResult(values, op) {
    if (op === "+") return values.reduce((a, b) => a + b, 0);
    if (op === "*") return values.reduce((a, b) => a * b, 1);
    if (op === "-") {
      if (values.length !== 2) return null;
      return Math.abs(values[0] - values[1]);
    }
    if (op === "/") {
      if (values.length !== 2) return null;
      const a = Math.max(values[0], values[1]), b = Math.min(values[0], values[1]);
      if (b === 0) return null;
      return a % b === 0 ? a / b : -1;
    }
    return null;
  }

  let live = null;
  GameRegistry.register({
    id: "kenken",
    name: "KenKen",
    icon: "🧮",
    category: "logic",
    description: "4×4 arithmetic sudoku — cages hit the target with +, −, ×, ÷",
    tags: ["logic", "math", "thinking"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false;
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="kk-filled">0 / 16</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="kk-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="kk-best">—</div></div>
        </div>
        <div class="status info" id="kk-status">Fill the grid with 1–4. Each row/col has no repeats; cages must reach their target.</div>
        <div class="center" style="margin:14px 0;"><div class="kk-grid" id="kk-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="kk-clear">Clear</button>
          <button class="btn primary" id="kk-check">Check</button>
        </div>
        <p class="hint"><b>Rows &amp; columns</b> have 1, 2, 3, 4 (no repeats). Each <b>cage</b> shows a target and operation — its cells must combine (in any order) to hit the target.</p>
      `;
      const statusEl = root.querySelector("#kk-status");
      const gridEl = root.querySelector("#kk-grid");
      if (!document.getElementById("kk-style")) {
        const s = document.createElement("style");
        s.id = "kk-style";
        s.textContent = `
          .kk-grid { display: grid; grid-template-columns: repeat(${N}, 60px); gap: 2px; background: var(--bg-elev); padding: 6px; border-radius: var(--radius); }
          .kk-cell { width: 60px; height: 60px; background: var(--bg-soft); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-family: var(--font-mono); font-weight: 700; font-size: 1.4rem; color: var(--text); position: relative; }
          .kk-cell.active { outline: 3px solid var(--accent); }
          .kk-cell.error { color: var(--danger); }
          .kk-target { position: absolute; top: 2px; left: 4px; font-size: 0.6rem; font-weight: 700; color: var(--text-muted); }
        `;
        document.head.appendChild(s);
      }

      function cellToCage(r, c) {
        for (let i = 0; i < puzzle.cages.length; i++) {
          if (puzzle.cages[i].cells.some(([cr, cc]) => cr === r && cc === c)) return i;
        }
        return -1;
      }

      function cageCellInfo(r, c) {
        const ci = cellToCage(r, c);
        if (ci < 0) return {isTarget: false};
        const cage = puzzle.cages[ci];
        const first = cage.cells[0];
        const isTarget = first[0] === r && first[1] === c;
        return {isTarget, target: isTarget ? `${cage.target}${cage.op}` : null, colorIdx: ci};
      }

      function errors() {
        const errs = new Set();
        // rows
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            const v = grid[r][c];
            if (!v) continue;
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
            if (!v) continue;
            if (seen[v] !== undefined) {
              errs.add(`${r},${c}`);
              errs.add(`${seen[v]},${c}`);
            }
            seen[v] = r;
          }
        }
        return errs;
      }

      function cageOk(cage) {
        const values = cage.cells.map(([r, c]) => grid[r][c]);
        if (values.some(v => !v)) return false;
        const result = cageResult(values, cage.op);
        return result === cage.target;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        let filled = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "kk-cell";
            const info = cageCellInfo(r, c);
            if (info.colorIdx !== undefined) {
              cell.style.background = COLORS[info.colorIdx % COLORS.length];
            }
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            if (errs.has(`${r},${c}`)) cell.classList.add("error");
            const v = grid[r][c];
            if (v) {
              cell.textContent = v;
              filled++;
            }
            if (info.isTarget) {
              const t = document.createElement("span");
              t.className = "kk-target";
              t.textContent = info.target;
              cell.appendChild(t);
            }
            cell.addEventListener("click", () => {
              activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#kk-filled").textContent = `${filled} / 16`;
        root.querySelector("#kk-errors").textContent = errs.size;
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
          let [r, c] = activeCell;
          let found = null;
          for (let i = r * N + c + 1; i < N * N; i++) {
            const rr = Math.floor(i / N), cc = i % N;
            found = [rr, cc];
            break;
          }
          activeCell = found;
          render();
          checkAuto();
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = grid.every(r => r.every(v => v));
        if (!allFilled) return;
        if (errors().size > 0) return;
        const cagesOk = puzzle.cages.every(cageOk);
        if (cagesOk) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("kenken");
          if (!best || 100 > best) {
            Storage.setBest("kenken", 100);
            root.querySelector("#kk-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        if (errors().size > 0) {
          AudioFX.error();
          statusEl.textContent = "Row/column conflicts";
          statusEl.className = "status lose";
          return;
        }
        const badCages = puzzle.cages.filter(c => !cageOk(c));
        if (badCages.length) {
          AudioFX.error();
          statusEl.textContent = `${badCages.length} cage${badCages.length === 1 ? "" : "s"} wrong`;
          statusEl.className = "status lose";
        } else checkAuto();
      }

      root.querySelector("#kk-check").addEventListener("click", check);
      root.querySelector("#kk-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: N}, () => Array(N).fill(null));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = Array.from({length: N}, () => Array(N).fill(null));
        over = false;
        activeCell = null;
        const best = Storage.getBest("kenken");
        root.querySelector("#kk-best").textContent = best || "—";
        statusEl.textContent = "Fill the grid with 1–4. Each row/col has no repeats; cages must reach their target.";
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
      App.showModal("How to play KenKen",
        `Fill the grid with <b>1, 2, 3, 4</b> so each row and column has no repeats (like Sudoku).
        <br><br>Additionally, the grid is divided into <b>cages</b> (colored regions). Each cage shows a target and an operation in its top-left cell.
        <br>For example <b>3+</b> means the cage's numbers must add up to 3. <b>2÷</b> means one divided by the other equals 2.
        <br>Operations work on the cage's cells in any order. <b>−</b> and <b>÷</b> cages always have exactly 2 cells.`);
    },
  });
})();
