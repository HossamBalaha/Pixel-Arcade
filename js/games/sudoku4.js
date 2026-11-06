/* Mini Sudoku (4x4) — 1-4 in each row, column, and 2x2 box. Hint shows next move, solve completes it. */
(function () {
  const N = 4, BOX = 2;
  let live = null;
  const DIGITS = [1, 2, 3, 4];

  function genSolved() {
    const b = Array.from({length: N}, () => Array(N).fill(0));

    function ok(r, c, v) {
      for (let i = 0; i < N; i++) if (b[r][i] === v || b[i][c] === v) return false;
      const br = Math.floor(r / BOX) * BOX, bc = Math.floor(c / BOX) * BOX;
      for (let dr = 0; dr < BOX; dr++) for (let dc = 0; dc < BOX; dc++) if (b[br + dr][bc + dc] === v) return false;
      return true;
    }

    function solve() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (b[r][c] === 0) {
          const ds = DIGITS.slice().sort(() => Math.random() - 0.5);
          for (const v of ds) {
            if (ok(r, c, v)) {
              b[r][c] = v;
              if (solve()) return true;
              b[r][c] = 0;
            }
          }
          return false;
        }
      }
      return true;
    }

    solve();
    return b;
  }

  function makePuzzle() {
    const sol = genSolved();
    const puz = sol.map(r => r.slice());
    // remove ~5-7 cells (out of 16) for difficulty
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    cells.sort(() => Math.random() - 0.5);
    const toRemove = 6 + Math.floor(Math.random() * 2);
    for (let i = 0; i < toRemove; i++) {
      const [r, c] = cells[i];
      puz[r][c] = 0;
    }
    return {puz, sol};
  }

  function isSolved(b) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === 0) return false;
    for (let i = 0; i < N; i++) {
      const row = new Set(b[i]);
      const col = new Set(b.map(r => r[i]));
      if (row.size !== N || col.size !== N) return false;
    }
    for (let br = 0; br < N; br += BOX) for (let bc = 0; bc < N; bc += BOX) {
      const s = new Set();
      for (let dr = 0; dr < BOX; dr++) for (let dc = 0; dc < BOX; dc++) s.add(b[br + dr][bc + dc]);
      if (s.size !== N) return false;
    }
    return true;
  }

  GameRegistry.register({
    id: "sudoku4",
    name: "Mini Sudoku (4×4)",
    icon: "🔢",
    category: "logic",
    description: "Fill the 4×4 grid — 1–4 in each row, column, and 2×2 box",
    tags: ["puzzle", "logic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz, sol, b, given, sel, mistakes, time, timerInt;
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
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="su4-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="su4-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="su4-best">-</div></div>
        </div>
        <div class="status info" id="su4-status">Fill 1–4 in each row, column, and box</div>
        <div class="center"><div id="su4-grid" style="display:grid;grid-template-columns:repeat(4,60px);grid-template-rows:repeat(4,60px);gap:2px;background:var(--border-strong);padding:2px;border-radius:var(--radius-sm);"></div></div>
        <div class="row" style="justify-content:center;gap:6px;margin-top:8px;">
          ${[1, 2, 3, 4].map(d => `<button class="btn" data-d="${d}" style="min-width:50px;">${d}</button>`).join("")}
          <button class="btn" id="su4-erase" style="min-width:50px;">⌫</button>
        </div>
        <p class="hint">Click a cell then a digit. <b>R</b> new puzzle. <b>Backspace</b> clears.</p>
      `;
      const gridEl = root.querySelector("#su4-grid");
      const statusEl = root.querySelector("#su4-status");
      root.querySelector("#su4-best").textContent = Storage.getBest("sudoku4") ?? "-";

      function newGame() {
        const p = makePuzzle();
        puz = p.puz;
        sol = p.sol;
        b = puz.map(r => r.slice());
        given = puz.map(r => r.map(v => v !== 0));
        sel = null;
        mistakes = 0;
        time = 0;
        clearInterval(timerInt);
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time++;
          root.querySelector("#su4-t").textContent = time + "s";
        }, 1000);
        statusEl.textContent = "Fill 1–4 in each row, column, and box";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.background = "var(--bg-elev)";
          cell.style.display = "grid";
          cell.style.placeItems = "center";
          cell.style.fontFamily = "var(--font-mono)";
          cell.style.fontWeight = "700";
          cell.style.fontSize = "1.4rem";
          cell.style.cursor = "pointer";
          cell.dataset.r = r;
          cell.dataset.c = c;
          // box borders
          if (r === 1) cell.style.borderBottom = "2px solid var(--border-strong)";
          if (r === 2) cell.style.borderTop = "2px solid var(--border-strong)";
          if (c === 1) cell.style.borderRight = "2px solid var(--border-strong)";
          if (c === 2) cell.style.borderLeft = "2px solid var(--border-strong)";
          const v = b[r][c];
          if (v) {
            cell.textContent = v;
            if (given[r][c]) cell.style.color = "var(--text)";
            else cell.style.color = (v === sol[r][c]) ? "var(--accent)" : "var(--danger)";
          }
          if (sel && sel[0] === r && sel[1] === c) cell.style.background = "var(--accent-soft)";
          cell.addEventListener("click", () => {
            sel = [r, c];
            AudioFX.click();
            render();
          });
          gridEl.appendChild(cell);
        }
        root.querySelector("#su4-m").textContent = mistakes;
      }

      function place(d) {
        if (!sel) {
          AudioFX.error();
          return;
        }
        const [r, c] = sel;
        if (given[r][c]) {
          AudioFX.error();
          return;
        }
        b[r][c] = d;
        if (d !== sol[r][c]) {
          mistakes++;
          AudioFX.error();
        } else AudioFX.place();
        if (isSolved(b)) {
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Solved in ${time}s with ${mistakes} mistakes!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("sudoku4");
          // best = lowest time with 0 mistakes; just track time
          if (best === null || (time < best && mistakes === 0)) {
            Storage.setBest("sudoku4", time);
            App.toast("New best: " + time + "s", "success");
            root.querySelector("#su4-best").textContent = time;
          }
        }
        render();
      }

      root.querySelectorAll("[data-d]").forEach(btn => btn.addEventListener("click", () => place(+btn.dataset.d)));
      root.querySelector("#su4-erase").addEventListener("click", () => {
        if (!sel) return;
        const [r, c] = sel;
        if (given[r][c]) return;
        b[r][c] = 0;
        AudioFX.click();
        render();
      });

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          newGame();
          return;
        }
        if (sel && /^[1-4]$/.test(e.key)) place(+e.key);
        if (sel && (e.key === "Backspace" || e.key === "Delete" || e.key === "0")) {
          const [r, c] = sel;
          if (given[r][c]) return;
          b[r][c] = 0;
          render();
        }
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        // find an empty cell with fewest candidates
        let best = null, bestN = 99;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (b[r][c] !== 0) continue;
          let n = 0, onlyV = 0;
          for (const v of DIGITS) {
            let ok = true;
            for (let i = 0; i < N; i++) if (b[r][i] === v || b[i][c] === v) {
              ok = false;
              break;
            }
            const br = Math.floor(r / BOX) * BOX, bc = Math.floor(c / BOX) * BOX;
            if (ok) for (let dr = 0; dr < BOX && ok; dr++) for (let dc = 0; dc < BOX && ok; dc++) if (b[br + dr][bc + dc] === v) ok = false;
            if (ok) {
              n++;
              onlyV = v;
            }
          }
          if (n < bestN) {
            bestN = n;
            best = {r, c, v: onlyV};
          }
        }
        if (best) {
          sel = [best.r, best.c];
          place(best.v);
        }
      }

      function doSolve() {
        // animate filling in solution
        let order = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!given[r][c]) order.push([r, c]);
        let i = 0;
        const step = () => {
          if (i >= order.length) {
            statusEl.textContent = `Solved! Time: ${time}s`;
            statusEl.className = "status win";
            AudioFX.win();
            clearInterval(timerInt);
            return;
          }
          const [r, c] = order[i];
          i++;
          b[r][c] = sol[r][c];
          AudioFX.tick();
          render();
          later(step, 150);
        };
        step();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Mini Sudoku (4×4)",
        `Fill the 4×4 grid so that every row, every column, and every 2×2 box contains the digits 1, 2, 3, and 4 exactly once.
        <br><br>Click a cell to select it, then click a digit (or press 1–4). Backspace clears. Givens are darker; wrong entries turn red.
        <br><br><b>Hint</b> fills an empty cell with the easiest single-candidate value. <b>Solve</b> animates the full solution.`);
    },
  });
})();
