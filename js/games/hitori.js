/* Hitori — shade cells so no number repeats in any row/column; shaded cells can't touch. */
(function () {
  // Each puzzle: 4×4 grid of numbers, with the solution (1 = shaded, 0 = unshaded).
  const PUZZLES = [
    {
      grid: [[1, 2, 1, 3], [2, 1, 3, 1], [1, 3, 2, 2], [3, 1, 1, 2]],
      sol: [[0, 0, 1, 0], [0, 1, 0, 0], [1, 0, 0, 1], [0, 0, 1, 0]],
    },
    {
      grid: [[2, 1, 2, 3], [3, 2, 3, 1], [1, 3, 1, 2], [2, 1, 2, 1]],
      sol: [[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]],
    },
    {
      grid: [[1, 2, 3, 1], [3, 1, 2, 2], [2, 3, 1, 3], [1, 2, 3, 1]],
      sol: [[0, 0, 0, 1], [0, 0, 0, 1], [1, 0, 0, 0], [0, 0, 0, 1]],
    },
  ];
  const N = 4;

  let live = null;
  GameRegistry.register({
    id: "hitori",
    name: "Hitori",
    icon: "⬛",
    category: "logic",
    description: "Shade cells so no number repeats per row/column; shaded can't touch",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, state = null, over = false; // state: 0 = unshaded, 1 = shaded
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Shaded</div><div class="val" id="ht-count">0</div></div>
          <div class="score-cell"><div class="label">Conflicts</div><div class="val" id="ht-conflicts">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ht-best">—</div></div>
        </div>
        <div class="status info" id="ht-status">Click a cell to shade it. Shaded cells can't be adjacent; no number repeats per row/col in unshaded cells.</div>
        <div class="center" style="margin:14px 0;"><div class="ht-grid" id="ht-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ht-clear">Clear</button>
          <button class="btn primary" id="ht-check">Check</button>
        </div>
        <p class="hint">Shade cells so that: (1) no number appears more than once per row in <b>unshaded</b> cells; (2) same for columns; (3) shaded cells <b>don't touch</b> (even diagonally); (4) unshaded cells form a single connected group.</p>
      `;
      const statusEl = root.querySelector("#ht-status");
      const gridEl = root.querySelector("#ht-grid");
      if (!document.getElementById("ht-style")) {
        const s = document.createElement("style");
        s.id = "ht-style";
        s.textContent = `
          .ht-grid { display: inline-grid; grid-template-columns: repeat(${N}, 52px); gap: 3px; background: var(--border); padding: 6px; border-radius: var(--radius); }
          .ht-cell { width: 52px; height: 52px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.3rem; cursor: pointer; user-select: none; color: var(--text); transition: background 0.15s; }
          .ht-cell.shaded { background: #333; color: #888; }
          .ht-cell:hover { border-color: var(--accent); }
          .ht-cell.conflict { outline: 3px solid var(--danger); }
        `;
        document.head.appendChild(s);
      }

      function conflicts() {
        const cf = new Set();
        // Duplicate in row (unshaded cells)
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            if (state[r][c]) continue; // shaded, skip
            const v = puzzle.grid[r][c];
            if (seen[v] !== undefined) {
              cf.add(`${r},${c}`);
              cf.add(`${r},${seen[v]}`);
            }
            seen[v] = c;
          }
        }
        // Duplicate in col
        for (let c = 0; c < N; c++) {
          const seen = {};
          for (let r = 0; r < N; r++) {
            if (state[r][c]) continue;
            const v = puzzle.grid[r][c];
            if (seen[v] !== undefined) {
              cf.add(`${r},${c}`);
              cf.add(`${seen[v]},${c}`);
            }
            seen[v] = r;
          }
        }
        // Adjacent shaded (including diagonally)
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!state[r][c]) continue;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && state[nr][nc]) {
              cf.add(`${r},${c}`);
              cf.add(`${nr},${nc}`);
            }
          }
        }
        return cf;
      }

      function render() {
        gridEl.innerHTML = "";
        const cf = conflicts();
        let shaded = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "ht-cell" + (state[r][c] ? " shaded" : "");
            if (cf.has(`${r},${c}`)) cell.classList.add("conflict");
            cell.textContent = puzzle.grid[r][c];
            cell.addEventListener("click", () => {
              if (over) return;
              state[r][c] = state[r][c] ? 0 : 1;
              AudioFX.pop();
              render();
            });
            gridEl.appendChild(cell);
            if (state[r][c]) shaded++;
          }
        }
        root.querySelector("#ht-count").textContent = shaded;
        root.querySelector("#ht-conflicts").textContent = cf.size;
      }

      function check() {
        const cf = conflicts();
        if (cf.size > 0) {
          AudioFX.error();
          statusEl.textContent = `${cf.size} conflict${cf.size === 1 ? "" : "s"} remain`;
          statusEl.className = "status lose";
          return;
        }
        // Compare against solution
        const matches = state.every((row, r) => row.every((v, c) => v === puzzle.sol[r][c]));
        if (matches) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("hitori");
          if (!best || 100 > best) {
            Storage.setBest("hitori", 100);
            root.querySelector("#ht-best").textContent = 100;
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "No conflicts, but not the unique solution. Keep trying.";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#ht-check").addEventListener("click", check);
      root.querySelector("#ht-clear").addEventListener("click", () => {
        if (over) return;
        state = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        state = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        const best = Storage.getBest("hitori");
        root.querySelector("#ht-best").textContent = best || "—";
        statusEl.textContent = "Click a cell to shade it. Shaded cells can't be adjacent; no number repeats per row/col in unshaded cells.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < state.length; r++) for (let c = 0; c < state.length; c++) {
            if (state[r][c] !== puzzle.sol[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Everything is correct so far 💡", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          state[pick[0]][pick[1]] = puzzle.sol[pick[0]][pick[1]];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${pick[0] + 1}, column ${pick[1] + 1} revealed`, "info");
        },
        solve: function () {
          if (over) return;
          state = puzzle.sol.map(r => r.slice());
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
      App.showModal("How to play Hitori",
        `Shade cells in the grid so that:
        <br><br>1. No number appears more than once in any <b>row</b> (among unshaded cells).
        <br>2. No number appears more than once in any <b>column</b> (among unshaded cells).
        <br>3. Shaded cells are <b>never adjacent</b> — not even diagonally.
        <br>4. Unshaded cells form a <b>single connected group</b> (you can move between any two via up/down/left/right moves through unshaded cells).
        <br><br>Click a cell to toggle it shaded/unshaded.`);
    },
  });
})();
