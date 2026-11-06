/* Sumplete — delete numbers from a grid so each row and column sums to the target. */
(function () {
  // We pre-generate 5x5 puzzles with a target row/col sum.
  const N = 5;

  function makePuzzle() {
    // Pick a hidden "kept" pattern, then values, then row/col targets = sum of kept values.
    const kept = Array.from({length: N}, () => Array.from({length: N}, () => Math.random() < 0.5));
    // Force at least 1 kept and 1 removed per row
    for (let r = 0; r < N; r++) {
      if (kept[r].every(v => v)) kept[r][Math.floor(Math.random() * N)] = false;
      if (kept[r].every(v => !v)) kept[r][Math.floor(Math.random() * N)] = true;
    }
    const grid = Array.from({length: N}, () => Array.from({length: N}, () => 1 + Math.floor(Math.random() * 9)));
    const rowTargets = grid.map((row, r) => row.reduce((s, v, c) => s + (kept[r][c] ? v : 0), 0));
    const colTargets = Array.from({length: N}, (_, c) => grid.reduce((s, row) => s + (kept[row] ? (kept[grid.indexOf(row)][c] ? row[c] : 0) : 0), 0));
    // The above is buggy; recompute cleanly:
    const ct = Array.from({length: N}, () => 0);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (kept[r][c]) ct[c] += grid[r][c];
    return {grid, kept, rowTargets, colTargets: ct};
  }

  let live = null;
  GameRegistry.register({
    id: "sumplete",
    name: "Sumplete",
    icon: "➕",
    category: "logic",
    description: "Delete numbers so each row & column sums to target",
    tags: ["logic", "math", "thinking"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null;
      let removed = null; // boolean grid: cell removed
      let over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Remaining</div><div class="val" id="sp-remaining">25</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="sp-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sp-best">—</div></div>
        </div>
        <div class="status info" id="sp-status">Tap a number to delete it. Rows and columns must sum to their targets.</div>
        <div class="center" style="margin:14px 0;"><div class="sp-wrap" id="sp-wrap"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sp-reset">Reset</button>
          <button class="btn primary" id="sp-check">Check</button>
        </div>
        <p class="hint">Each row's remaining numbers must sum to the target on the right. Each column's remaining numbers must sum to the target on the bottom.</p>
      `;
      const statusEl = root.querySelector("#sp-status");
      const wrapEl = root.querySelector("#sp-wrap");
      if (!document.getElementById("sp-style")) {
        const s = document.createElement("style");
        s.id = "sp-style";
        s.textContent = `
          .sp-wrap { display: inline-grid; grid-template-columns: repeat(${N}, 44px) 56px; gap: 3px; }
          .sp-cell { width: 44px; height: 44px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; color: var(--text); transition: all 0.15s; }
          .sp-cell.removed { background: var(--bg-soft); color: var(--text-muted); text-decoration: line-through; opacity: 0.4; }
          .sp-cell:hover { border-color: var(--accent); }
          .sp-cell.solved { background: var(--success); color: #fff; }
          .sp-target { width: 56px; height: 44px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); font-family: var(--font-mono); font-weight: 700; font-size: 1rem; border-radius: var(--radius-sm); }
          .sp-target.col { width: 44px; height: 44px; }
          .sp-corner { width: 56px; height: 44px; }
        `;
        document.head.appendChild(s);
      }

      function rowSum(r) {
        let s = 0;
        for (let c = 0; c < N; c++) if (!removed[r][c]) s += puzzle.grid[r][c];
        return s;
      }

      function colSum(c) {
        let s = 0;
        for (let r = 0; r < N; r++) if (!removed[r][c]) s += puzzle.grid[r][c];
        return s;
      }

      function render() {
        wrapEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sp-cell" + (removed[r][c] ? " removed" : "");
            if (!removed[r][c] && rowSum(r) === puzzle.rowTargets[r] && colSum(c) === puzzle.colTargets[c]) cell.classList.add("solved");
            cell.textContent = puzzle.grid[r][c];
            cell.addEventListener("click", () => {
              if (over) return;
              removed[r][c] = !removed[r][c];
              AudioFX.tick();
              render();
              checkAuto();
            });
            wrapEl.appendChild(cell);
          }
          // row target
          const rt = document.createElement("div");
          rt.className = "sp-target";
          const ok = rowSum(r) === puzzle.rowTargets[r];
          rt.style.background = ok ? "var(--success)" : "var(--accent-soft)";
          rt.style.color = ok ? "#fff" : "var(--accent)";
          rt.textContent = puzzle.rowTargets[r];
          wrapEl.appendChild(rt);
        }
        // col targets
        for (let c = 0; c < N; c++) {
          const ct = document.createElement("div");
          ct.className = "sp-target col";
          const ok = colSum(c) === puzzle.colTargets[c];
          ct.style.background = ok ? "var(--success)" : "var(--accent-soft)";
          ct.style.color = ok ? "#fff" : "var(--accent)";
          ct.textContent = puzzle.colTargets[c];
          wrapEl.appendChild(ct);
        }
        // corner
        const corner = document.createElement("div");
        corner.className = "sp-corner";
        wrapEl.appendChild(corner);
        // remaining count
        const remaining = removed.flat().filter(v => !v).length;
        root.querySelector("#sp-remaining").textContent = remaining;
        const errors = [];
        for (let r = 0; r < N; r++) if (rowSum(r) !== puzzle.rowTargets[r]) errors.push(`R${r + 1}`);
        for (let c = 0; c < N; c++) if (colSum(c) !== puzzle.colTargets[c]) errors.push(`C${c + 1}`);
        root.querySelector("#sp-errors").textContent = errors.length;
      }

      function checkAuto() {
        const ok = puzzle.rowTargets.every((t, r) => rowSum(r) === t) && puzzle.colTargets.every((t, c) => colSum(c) === t);
        if (ok) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("sumplete");
          if (!best || 100 > best) {
            Storage.setBest("sumplete", 100);
            root.querySelector("#sp-best").textContent = 100;
            App.toast("Solved!", "success");
          }
        }
      }

      function check() {
        const ok = puzzle.rowTargets.every((t, r) => rowSum(r) === t) && puzzle.colTargets.every((t, c) => colSum(c) === t);
        if (ok) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Not yet — keep removing";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#sp-check").addEventListener("click", check);
      root.querySelector("#sp-reset").addEventListener("click", () => {
        if (over) return;
        removed = Array.from({length: N}, () => Array(N).fill(false));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = makePuzzle();
        removed = Array.from({length: N}, () => Array(N).fill(false));
        over = false;
        const best = Storage.getBest("sumplete");
        root.querySelector("#sp-best").textContent = best || "—";
        statusEl.textContent = "Tap a number to delete it. Rows and columns must sum to their targets.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          removed = Array.from({length: N}, (_, r) => puzzle.kept[r].map(v => !v));
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
    help: function () {
      App.showModal("How to play Sumplete",
        `Tap numbers to <b>delete</b> them. Each row's remaining numbers must sum to the target shown on the right. Each column's remaining numbers must sum to the target shown at the bottom.
        <br><br>Targets turn green when the row/column is correct. Solve all rows and columns at once to win.`);
    },
  });
})();
