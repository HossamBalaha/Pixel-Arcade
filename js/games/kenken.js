/* KenKen — arithmetic sudoku: each row/column contains 1..N with no repeats;
   cages must produce their target with the given operation.
   Generator: build a latin square by cyclic shifts of a shuffled base row
   (valid by construction), partition cells into random cages, and compute
   every cage target FROM the solution — always consistent. */
(function () {
  "use strict";

  const N = 6;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function cageResult(values, op) {
    if (op === "+") return values.reduce((a, b) => a + b, 0);
    if (op === "×") return values.reduce((a, b) => a * b, 1);
    if (op === "−") return Math.max(...values) - Math.min(...values);
    if (op === "÷") {
      const mx = Math.max(...values), mn = Math.min(...values);
      return mx % mn === 0 ? mx / mn : -1;
    }
    return null;
  }

  function generate() {
    // latin square
    const base = shuffle(Array.from({length: N}, (_, i) => i + 1));
    const sol = Array.from({length: N}, (_, r) => Array.from({length: N}, (_, c) => base[(r + c) % N]));
    // shuffle rows & columns for extra variety
    const rows = shuffle(Array.from({length: N}, (_, i) => i));
    const cols = shuffle(Array.from({length: N}, (_, i) => i));
    const sol2 = rows.map(r => cols.map(c => sol[r][c]));
    // cage partition: random growth
    const cage = Array.from({length: N}, () => Array(N).fill(-1));
    let id = 0;
    const starts = shuffle([]);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) starts.push([r, c]);
    shuffle(starts);
    for (const [r0, c0] of starts) {
      if (cage[r0][c0] !== -1) continue;
      const size = 1 + Math.floor(Math.random() * 3) + (Math.random() < 0.2 ? 1 : 0);
      const cells = [[r0, c0]];
      cage[r0][c0] = id;
      let guard = 0;
      while (cells.length < size && guard++ < 30) {
        const opts = [];
        for (const [r, c] of cells) {
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && cage[nr][nc] === -1) opts.push([nr, nc]);
          }
        }
        if (!opts.length) break;
        const [r, c] = opts[Math.floor(Math.random() * opts.length)];
        cage[r][c] = id;
        cells.push([r, c]);
      }
      id++;
    }
    // build cages with op + target from solution
    const cages = [];
    for (let i = 0; i < id; i++) {
      const cells = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (cage[r][c] === i) cells.push([r, c]);
      const values = cells.map(([r, c]) => sol2[r][c]);
      let op, target;
      if (cells.length === 1) {
        op = "+";
        target = values[0];
      } else if (cells.length === 2) {
        const [a, b] = values;
        const choices = [];
        choices.push(["+", a + b]);
        choices.push(["×", a * b]);
        if (a !== b) choices.push(["−", Math.abs(a - b)]);
        if (Math.max(a, b) % Math.min(a, b) === 0) choices.push(["÷", Math.max(a, b) / Math.min(a, b)]);
        [op, target] = choices[Math.floor(Math.random() * choices.length)];
      } else {
        op = Math.random() < 0.5 ? "+" : "×";
        target = cageResult(values, op);
      }
      cages.push({cells, op, target});
    }
    return {sol: sol2, cages};
  }

  let live = null;
  GameRegistry.register({
    id: "kenken",
    name: "KenKen",
    icon: "➗",
    category: "logic",
    description: "6×6 arithmetic sudoku — cages hit the target with +, −, ×, ÷",
    tags: ["logic", "math", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false, activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="kk2-filled">0</div></div>
          <div class="score-cell"><div class="label">Cages OK</div><div class="val" id="kk2-cages">0 / ?</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="kk2-best">—</div></div>
        </div>
        <div class="status info" id="kk2-status">Fill the grid with 1–${N}. Each row/col has no repeats; cages must reach their target.</div>
        <div class="center" style="margin:14px 0;"><div class="kk2-grid" id="kk2-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="kk2-clear">Clear</button>
          <button class="btn primary" id="kk2-check">Check</button>
        </div>
        <p class="hint"><b>Rows &amp; columns</b> contain 1–${N} with no repeats. Each <b>cage</b> shows a target and operation — its cells must combine (in any order) to hit the target.</p>
      `;
      const statusEl = root.querySelector("#kk2-status");
      const gridEl = root.querySelector("#kk2-grid");
      if (!document.getElementById("kk2-style")) {
        const s = document.createElement("style");
        s.id = "kk2-style";
        s.textContent = `
          .kk2-grid { display: inline-grid; grid-template-columns: repeat(${N}, 56px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .kk2-cell { width: 56px; height: 56px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.3rem; cursor: pointer; color: var(--text); position: relative; }
          .kk2-cell.active { outline: 3px solid var(--accent); }
          .kk2-cage-label { position: absolute; top: 2px; left: 4px; font-size: 0.6rem; font-weight: 700; color: var(--accent); }
        `;
        document.head.appendChild(s);
      }

      function cageOf(r, c) {
        return puzzle.cages.findIndex(cg => cg.cells.some(([cr, cc]) => cr === r && cc === c));
      }

      function render() {
        gridEl.innerHTML = "";
        let filled = 0, cagesOk = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "kk2-cell" + (activeCell && activeCell[0] === r && activeCell[1] === c ? " active" : "");
          const ci = cageOf(r, c);
          const cg = puzzle.cages[ci];
          if (cg && cg.cells[0][0] === r && cg.cells[0][1] === c) {
            const label = document.createElement("span");
            label.className = "kk2-cage-label";
            label.textContent = cg.target + cg.op;
            cell.appendChild(label);
          }
          const v = document.createElement("span");
          v.textContent = grid[r][c] || "";
          cell.appendChild(v);
          if (grid[r][c]) filled++;
          cell.addEventListener("click", () => {
            if (over) return;
            activeCell = [r, c];
            AudioFX.click();
            render();
          });
          gridEl.appendChild(cell);
        }
        for (const cg of puzzle.cages) {
          const vals = cg.cells.map(([r, c]) => grid[r][c]).filter(Boolean);
          if (vals.length === cg.cells.length && cageResult(vals, cg.op) === cg.target) cagesOk++;
        }
        root.querySelector("#kk2-filled").textContent = filled;
        root.querySelector("#kk2-cages").textContent = cagesOk + " / " + puzzle.cages.length;
      }

      function typeKey(e) {
        if (!alive || over || !activeCell) return;
        const [r, c] = activeCell;
        if (/^[1-9]$/.test(e.key) && +e.key <= N) {
          grid[r][c] = +e.key;
          AudioFX.pop();
          render();
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[r][c] = 0;
          render();
        } else if (e.key === "ArrowUp" && r > 0) {
          activeCell = [r - 1, c];
          render();
        } else if (e.key === "ArrowDown" && r < N - 1) {
          activeCell = [r + 1, c];
          render();
        } else if (e.key === "ArrowLeft" && c > 0) {
          activeCell = [r, c - 1];
          render();
        } else if (e.key === "ArrowRight" && c < N - 1) {
          activeCell = [r, c + 1];
          render();
        }
      }

      document.addEventListener("keydown", typeKey);

      function check() {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) return fail("Fill every cell first.");
        for (let r = 0; r < N; r++) if (new Set(grid[r]).size !== N) return fail(`Row ${r + 1} repeats a number.`);
        for (let c = 0; c < N; c++) {
          const col = grid.map(row => row[c]);
          if (new Set(col).size !== N) return fail(`Column ${c + 1} repeats a number.`);
        }
        for (const cg of puzzle.cages) {
          const vals = cg.cells.map(([r, c]) => grid[r][c]);
          if (cageResult(vals, cg.op) !== cg.target) {
            return fail(`Cage ${cg.target}${cg.op} doesn't work with ${vals.join(", ")}.`);
          }
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("kenken");
        if (!best || 100 > best) {
          Storage.setBest("kenken", 100);
          root.querySelector("#kk2-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        grid = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        activeCell = null;
        const best = Storage.getBest("kenken");
        root.querySelector("#kk2-best").textContent = best || "—";
        statusEl.textContent = "Fill the grid with 1–" + N + ". Each row/col has no repeats; cages must reach their target.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#kk2-check").addEventListener("click", check);
      root.querySelector("#kk2-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const wrong = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] !== puzzle.sol[r][c]) wrong.push([r, c]);
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [r, c] = wrong[Math.floor(Math.random() * wrong.length)];
          grid[r][c] = puzzle.sol[r][c];
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          grid = puzzle.sol.map(row => row.slice());
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        },
      };
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", typeKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play KenKen",
        `Fill the grid with numbers 1–${N}.
        <br><br>• <b>Rows and columns</b> may not repeat a number.
        <br>• Each heavily-outlined <b>cage</b> shows a target and an operation (+ − × ÷).
        <br>• The cage's numbers combine in <b>any order</b> to make the target (for − and ÷, subtract/divide the larger by the smaller).
        <br><br>Click a cell and type. Arrow keys move.`);
    },
  });
})();
