/* Ripple Effect — 5x5 grid divided into regions. Place 1..N in each region (N = size) so no two
   same numbers are adjacent (including diagonally). */
(function () {
  // regions: each cell belongs to a region id (0..K-1).
  const PUZZLES = [
    {
      N: 5, regions: [
        [0, 0, 1, 1, 1],
        [0, 0, 1, 2, 1],
        [0, 3, 3, 2, 2],
        [4, 3, 3, 2, 2],
        [4, 4, 4, 4, 2]],
      solution: [
        [1, 2, 3, 2, 1],
        [2, 1, 2, 1, 3],
        [3, 1, 2, 3, 2],
        [2, 3, 1, 2, 1],
        [1, 2, 3, 1, 3]]
    },
  ];
  let live = null;
  GameRegistry.register({
    id: "rippleeffect",
    name: "Ripple Effect",
    icon: "🌊",
    category: "logic",
    description: "Fill regions with 1..N; no two same numbers touch (incl. diagonally)",
    tags: ["logic", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, grid, over = false;
      const COLORS = ["#6366f1", "#ec4899", "#22c55e", "#f97316", "#06b6d4", "#a855f7", "#eab308"];
      root.innerHTML = `
        <div class="status info" id="re-status">Click a cell to cycle values. Each region needs 1..N (its size). Same numbers can't touch (incl. diagonally).</div>
        <div class="center" style="margin:14px 0;"><div id="re-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="re-clear">Clear</button>
          <button class="btn primary" id="re-check">Check</button>
        </div>
        <p class="hint">Regions are colored. A region of size N must contain each of 1..N exactly once.</p>
      `;
      const statusEl = root.querySelector("#re-status");
      const gridEl = root.querySelector("#re-grid");
      if (!document.getElementById("re-style")) {
        const s = document.createElement("style");
        s.id = "re-style";
        s.textContent = `#re-grid{display:grid;background:var(--border);padding:1px;gap:1px;}.re-cell{width:48px;height:48px;display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;cursor:pointer;user-select:none;color:var(--text);border:1px solid transparent;}.re-cell.err{color:var(--danger);}`;
        document.head.appendChild(s);
      }

      function render() {
        const N = puzzle.N;
        gridEl.style.gridTemplateColumns = `repeat(${N},48px)`;
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "re-cell";
            cell.style.background = COLORS[puzzle.regions[r][c] % COLORS.length] + "55";
            cell.textContent = grid[r][c] || "";
            cell.addEventListener("click", () => {
              if (over) return;
              let v = grid[r][c] || 0;
              v = (v + 1) % 6;
              grid[r][c] = v;
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
      }

      function regionCells(id) {
        const out = [];
        for (let r = 0; r < puzzle.N; r++) for (let c = 0; c < puzzle.N; c++) if (puzzle.regions[r][c] === id) out.push([r, c]);
        return out;
      }

      function check() {
        if (over) return;
        const N = puzzle.N;
        // 1. each region 0..K must contain 1..size exactly once
        const numRegions = Math.max(...puzzle.regions.flat()) + 1;
        for (let id = 0; id < numRegions; id++) {
          const cells = regionCells(id);
          const vals = cells.map(([r, c]) => grid[r][c]);
          if (vals.some(v => !v)) {
            fail("Fill every cell.");
            return;
          }
          const expected = Array.from({length: cells.length}, (_, i) => i + 1);
          if (vals.slice().sort().join(",") !== expected.join(",")) {
            fail(`Region ${id + 1} needs 1..${cells.length}.`);
            return;
          }
        }
        // 2. no adjacent (incl diagonal) same numbers
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            if (grid[r][c] && grid[nr][nc] && grid[r][c] === grid[nr][nc]) {
              fail(`Two ${grid[r][c]}'s touch.`);
              return;
            }
          }
        }
        // win
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("rippleeffect");
        if (!best || 100 > best) {
          Storage.setBest("rippleeffect", 100);
          App.toast("Solved!", "success");
        }
      }

      function fail(msg) {
        AudioFX.error();
        statusEl.textContent = msg;
        statusEl.className = "status lose";
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const N = puzzle.N;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        statusEl.textContent = "Click a cell to cycle values.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#re-check").addEventListener("click", check);
      root.querySelector("#re-clear").addEventListener("click", () => {
        if (over) return;
        const N = puzzle.N;
        grid = Array.from({length: N}, () => Array(N).fill(0));
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
          const N = puzzle.N;
          grid = puzzle.solution.map(row => row.slice());
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
      App.showModal("How to play Ripple Effect",
        `The grid is divided into colored <b>regions</b>.
        <br><br>Place numbers in each region: a region of size N must contain each of <b>1, 2, ..., N</b> exactly once.
        <br><br>Same numbers may not be adjacent — including diagonally!
        <br><br>Click a cell to cycle values. Use <b>Check</b> to verify.`);
    },
  });
})();
