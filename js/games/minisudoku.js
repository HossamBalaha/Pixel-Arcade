/* Mini Sudoku (3x3) — place 1, 2, 3 in each row, column, and box. Perfect for kids. */
(function () {
  const N = 3;
  let live = null;

  function genSolved() {
    const b = Array.from({length: N}, () => Array(N).fill(0));

    function ok(r, c, v) {
      for (let i = 0; i < N; i++) if (b[r][i] === v || b[i][c] === v) return false;
      return true;
    }

    function solve() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (b[r][c] === 0) {
          const ds = [1, 2, 3].sort(() => Math.random() - 0.5);
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
    // remove 3-4 cells
    const cells = [[0, 0], [0, 1], [1, 0], [1, 2], [2, 1], [2, 2]];
    cells.sort(() => Math.random() - 0.5);
    const remove = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < remove; i++) {
      const [r, c] = cells[i];
      puz[r][c] = 0;
    }
    return {puz, sol};
  }

  function isSolved(b) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!b[r][c]) return false;
    for (let i = 0; i < N; i++) {
      if (new Set(b[i]).size !== N) return false;
      if (new Set(b.map(r => r[i])).size !== N) return false;
    }
    return true;
  }

  GameRegistry.register({
    id: "minisudoku",
    name: "Mini Sudoku (3×3)",
    icon: "🔢",
    category: "logic",
    description: "3×3 Sudoku — place 1, 2, 3 in each row, column & box",
    tags: ["sudoku", "logic", "kids"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz, sol, b, given, sel, mistakes;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="ms-m">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ms-best">—</div></div>
        </div>
        <div class="status info" id="ms-status">Place 1, 2, 3 in every row, column, and box!</div>
        <div class="center"><div id="ms-grid" style="display:grid;grid-template-columns:repeat(3,80px);grid-template-rows:repeat(3,80px);gap:4px;background:var(--border);padding:4px;border-radius:var(--radius);"></div></div>
        <div class="row" style="justify-content:center;gap:6px;margin-top:10px;">
          ${[1, 2, 3].map(d => `<button class="btn" data-d="${d}" style="min-width:60px;font-weight:700;">${d}</button>`).join("")}
          <button class="btn" id="ms-erase" style="min-width:60px;">⌫</button>
        </div>
        <p class="hint">Tap a cell, then tap a number. <b>R</b> = new puzzle.</p>
      `;
      const gridEl = root.querySelector("#ms-grid");
      const statusEl = root.querySelector("#ms-status");
      root.querySelector("#ms-best").textContent = Storage.getBest("minisudoku") ?? "—";

      function newGame() {
        const p = makePuzzle();
        puz = p.puz;
        sol = p.sol;
        b = puz.map(r => r.slice());
        given = puz.map(r => r.map(v => v !== 0));
        sel = null;
        mistakes = 0;
        statusEl.textContent = "Place 1, 2, 3 in every row, column, and box!";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:800;font-size:2rem;cursor:pointer;";
          if (sel && sel[0] === r && sel[1] === c) cell.style.background = "var(--bg-soft)";
          cell.dataset.r = r;
          cell.dataset.c = c;
          const v = b[r][c];
          if (v) {
            cell.textContent = v;
            cell.style.color = given[r][c] ? "var(--text)" : (v === sol[r][c] ? "var(--accent)" : "var(--danger)");
          }
          cell.addEventListener("click", () => {
            sel = [r, c];
            AudioFX.click();
            render();
          });
          gridEl.appendChild(cell);
        }
        root.querySelector("#ms-m").textContent = mistakes;
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
          statusEl.textContent = `🎉 Solved with ${mistakes} mistakes!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("minisudoku");
          if (best === null || mistakes < best) {
            Storage.setBest("minisudoku", mistakes);
            root.querySelector("#ms-best").textContent = mistakes;
            App.toast("Solved!", "success");
          }
        }
        render();
      }

      root.querySelectorAll("[data-d]").forEach(btn => btn.addEventListener("click", () => place(+btn.dataset.d)));
      root.querySelector("#ms-erase").addEventListener("click", () => {
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
        if (sel && /^[1-3]$/.test(e.key)) place(+e.key);
        if (sel && (e.key === "Backspace" || e.key === "Delete" || e.key === "0")) {
          const [r, c] = sel;
          if (given[r][c]) return;
          b[r][c] = 0;
          render();
        }
      }

      document.addEventListener("keydown", onKey);

      function doSolve() {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!given[r][c]) b[r][c] = sol[r][c];
        AudioFX.reveal();
        render();
        statusEl.textContent = "Solution revealed";
        statusEl.className = "status lose";
      }

      live = {solve: doSolve};
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
      App.showModal("How to play Mini Sudoku (3×3)",
        `Fill the 3×3 grid so each <b>row</b>, <b>column</b>, and the whole <b>box</b> contains the digits 1, 2, and 3 exactly once.
        <br><br>Tap a cell to select it, then tap a digit. Wrong entries turn red. Press <b>R</b> for a new puzzle.`);
    },
  });
})();
