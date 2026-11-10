/* Hidato — fill the grid so numbers 1..N form a path where consecutive numbers are adjacent (incl. diagonal). */
(function () {
  // Pre-built 5x5 Hidato puzzles. Some cells pre-filled, others blank for the player.
  const PUZZLES = [{
    "sol": [[1, 2, 3, 4, 5], [10, 9, 8, 7, 6], [11, 12, 13, 14, 15], [20, 19, 18, 17, 16], [21, 22, 23, 24, 25]],
    "blanks": [[2, 2], [2, 4], [3, 1], [3, 3], [4, 2], [4, 4]]
  }, {
    "sol": [[1, 2, 3, 4, 5], [16, 17, 18, 19, 6], [15, 24, 25, 20, 7], [14, 23, 22, 21, 8], [13, 12, 11, 10, 9]],
    "blanks": [[1, 2], [1, 4], [2, 1], [2, 3], [3, 2], [3, 4], [4, 1], [4, 3]]
  }, {
    "sol": [[21, 22, 23, 24, 25], [20, 19, 18, 17, 16], [11, 12, 13, 14, 15], [10, 9, 8, 7, 6], [1, 2, 3, 4, 5]],
    "blanks": [[0, 2], [1, 1], [2, 3], [3, 0], [4, 2], [4, 4]]
  }];

  let live = null;
  GameRegistry.register({
    id: "hidato",
    name: "Hidato",
    icon: "🧩",
    category: "logic",
    description: "Connect numbers 1..N in sequence on the grid",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, locked = null, over = false;
      let activeCell = null;
      const N = 5;
      const totalNumbers = 25;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="hd-filled">0 / ${totalNumbers}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="hd-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hd-best">—</div></div>
        </div>
        <div class="status info" id="hd-status">Click a blank cell, then type a number (1–25). Consecutive numbers must be adjacent.</div>
        <div class="center" style="margin:14px 0;"><div class="hd-grid" id="hd-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="hd-clear">Clear inputs</button>
          <button class="btn primary" id="hd-check">Check</button>
        </div>
        <p class="hint">Numbers <b>1 → 2 → … → 25</b> must form a continuous path. Consecutive numbers must touch (incl. diagonally). Pre-filled cells are locked.</p>
      `;
      const statusEl = root.querySelector("#hd-status");
      const gridEl = root.querySelector("#hd-grid");
      if (!document.getElementById("hd-style")) {
        const s = document.createElement("style");
        s.id = "hd-style";
        s.textContent = `
          .hd-grid { display: grid; grid-template-columns: repeat(5, 52px); gap: 4px; background: var(--bg-elev); padding: 8px; border-radius: var(--radius); }
          .hd-cell { width: 52px; height: 52px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1rem; cursor: pointer; user-select: none; color: var(--text); }
          .hd-cell.locked { background: var(--accent); color: #fff; }
          .hd-cell.active { outline: 3px solid var(--accent-2); }
          .hd-cell.error { background: var(--danger); color: #fff; }
          .hd-cell.correct { background: var(--success); color: #fff; }
        `;
        document.head.appendChild(s);
      }

      function isAdjacent(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
      }

      function findNumber(n) {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === n) return [r, c];
        return null;
      }

      function errors() {
        const errs = new Set();
        for (let n = 1; n < totalNumbers; n++) {
          const a = findNumber(n), b = findNumber(n + 1);
          if (a && b && !isAdjacent(a[0], a[1], b[0], b[1])) {
            // Mark both as error cells
            // (don't include locked cells)
            if (!locked[a[0]][a[1]]) errs.add(`${a[0]},${a[1]}`);
            if (!locked[b[0]][b[1]]) errs.add(`${b[0]},${b[1]}`);
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
            cell.className = "hd-cell";
            if (locked[r][c]) cell.classList.add("locked");
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
        root.querySelector("#hd-filled").textContent = `${filled} / ${totalNumbers}`;
        root.querySelector("#hd-errors").textContent = errs.size;
      }

      function onKey(e) {
        if (over || !activeCell) return;
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[activeCell[0]][activeCell[1]] = null;
          AudioFX.click();
          render();
          return;
        }
        // Allow typing 1 or 2 digits
        if (/^[0-9]$/.test(e.key)) {
          const r = activeCell[0], c = activeCell[1];
          const cur = grid[r][c];
          let next = e.key;
          if (cur !== null && String(cur).length < 2 && cur !== 0) {
            const candidate = parseInt(String(cur) + e.key, 10);
            if (candidate >= 1 && candidate <= totalNumbers) next = candidate;
            else {
              grid[r][c] = parseInt(e.key, 10);
              AudioFX.tick();
              render();
              return;
            }
          }
          const n = parseInt(next, 10);
          if (n >= 1 && n <= totalNumbers) {
            // If number already used elsewhere (non-locked), clear it from there
            for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
              if (!locked[rr][cc] && grid[rr][cc] === n && !(rr === r && cc === c)) grid[rr][cc] = null;
            }
            grid[r][c] = n;
            AudioFX.pop();
            // Move active to next blank cell
            let found = false;
            for (let cc = c + 1; cc < N && !found; cc++) if (!locked[r][cc] && grid[r][cc] === null) {
              activeCell = [r, cc];
              found = true;
            }
            if (!found) for (let rr = r + 1; rr < N && !found; rr++) for (let cc = 0; cc < N && !found; cc++) if (!locked[rr][cc] && grid[rr][cc] === null) {
              activeCell = [rr, cc];
              found = true;
            }
            render();
            checkAuto();
          }
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) return;
        const errs = errors();
        if (errs.size === 0) {
          over = true;
          statusEl.textContent = "🎉 Solved! Path complete.";
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("hidato");
          if (!best || 100 > best) {
            Storage.setBest("hidato", 100);
            root.querySelector("#hd-best").textContent = 100;
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
        const errs = errors();
        if (errs.size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("hidato");
          if (!best || 100 > best) {
            Storage.setBest("hidato", 100);
            root.querySelector("#hd-best").textContent = 100;
          }
        } else {
          AudioFX.error();
          statusEl.textContent = `${errs.size} adjacency issue${errs.size === 1 ? "" : "s"}`;
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#hd-check").addEventListener("click", check);
      root.querySelector("#hd-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!locked[r][c]) grid[r][c] = null;
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = puzzle.sol.map(r => r.slice());
        locked = Array.from({length: N}, () => Array(N).fill(true));
        // blank out the cells listed in puzzle.blanks
        puzzle.blanks.forEach(([r, c]) => {
          grid[r][c] = null;
          locked[r][c] = false;
        });
        activeCell = null;
        over = false;
        const best = Storage.getBest("hidato");
        root.querySelector("#hd-best").textContent = best || "—";
        statusEl.textContent = "Click a blank cell, then type a number (1–25). Consecutive numbers must be adjacent.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid.length; c++) {
            if (grid[r][c] !== puzzle.sol[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Everything is correct so far 💡", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          grid[pick[0]][pick[1]] = puzzle.sol[pick[0]][pick[1]];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${pick[0] + 1}, column ${pick[1] + 1} revealed`, "info");
        },
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
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Hidato",
        `Fill every cell with a number from <b>1 to 25</b> so that consecutive numbers are <b>adjacent</b> (horizontally, vertically, or diagonally).
        <br><br>Some cells are pre-filled and locked.
        <br><br>Click a blank cell to activate it, then type a number. <b>Backspace</b> clears the active cell.`);
    },
  });
})();
