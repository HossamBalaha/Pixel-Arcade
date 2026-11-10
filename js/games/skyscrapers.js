/* Skyscrapers — 4×4 logic puzzle. Place buildings 1–4 in each row/col (no repeats) so the clues match. */
(function () {
  // Each puzzle: solution grid (4x4) + clues around the outside (top, right, bottom, left).
  // Clue = how many buildings are visible from that direction looking along the row/col.
  const PUZZLES = [
    {
      sol: [[1, 3, 2, 4], [4, 2, 3, 1], [3, 4, 1, 2], [2, 1, 4, 3]],
      top: [2, 2, 3, 1], right: [3, 2, 1, 3], bottom: [2, 3, 2, 1], left: [1, 3, 2, 3],
    },
    {
      sol: [[2, 1, 4, 3], [3, 4, 1, 2], [4, 2, 3, 1], [1, 3, 2, 4]],
      top: [2, 3, 1, 3], right: [2, 2, 3, 1], bottom: [1, 2, 3, 2], left: [3, 1, 2, 3],
    },
    {
      sol: [[4, 3, 2, 1], [1, 2, 3, 4], [2, 1, 4, 3], [3, 4, 1, 2]],
      top: [1, 2, 2, 4], right: [4, 3, 2, 1], bottom: [4, 2, 2, 1], left: [1, 2, 3, 2],
    },
  ];
  const N = 4;

  function visibility(line) {
    let count = 0, max = 0;
    for (const v of line) {
      if (v > max) {
        max = v;
        count++;
      }
    }
    return count;
  }

  let live = null;
  GameRegistry.register({
    id: "skyscrapers",
    name: "Skyscrapers",
    icon: "🏙️",
    category: "logic",
    description: "Place buildings 1–4 in each row/col so the visibility clues work",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false;
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="sk-filled">0 / 16</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="sk-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk-best">—</div></div>
        </div>
        <div class="status info" id="sk-status">Numbers around the grid tell you how many buildings are visible from that direction. Fill with 1–4.</div>
        <div class="center" style="margin:14px 0;"><div class="sk-wrap" id="sk-wrap"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sk-clear">Clear</button>
          <button class="btn primary" id="sk-check">Check</button>
        </div>
        <p class="hint">Each row and column must contain 1, 2, 3, 4 (no repeats). The numbers around the grid say how many buildings are <b>visible</b> looking from that side (taller buildings hide shorter ones).</p>
      `;
      const statusEl = root.querySelector("#sk-status");
      const wrapEl = root.querySelector("#sk-wrap");
      if (!document.getElementById("sk-style")) {
        const s = document.createElement("style");
        s.id = "sk-style";
        s.textContent = `
          .sk-wrap { display: inline-grid; grid-template-columns: 28px repeat(${N}, 48px) 28px; grid-template-rows: 28px repeat(${N}, 48px) 28px; gap: 3px; }
          .sk-clue { display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; color: var(--accent); font-size: 0.95rem; }
          .sk-cell { background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-family: var(--font-mono); font-weight: 700; font-size: 1.2rem; color: var(--text); }
          .sk-cell.active { outline: 3px solid var(--accent); }
          .sk-cell.error { color: var(--danger); }
          .sk-corner { background: transparent; }
        `;
        document.head.appendChild(s);
      }

      function errors() {
        const errs = new Set();
        // rows: duplicates
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

      function render() {
        wrapEl.innerHTML = "";
        const errs = errors();
        // Top clues (row 1 of grid, cols 2..5)
        wrapEl.appendChild(div("sk-corner"));
        for (let c = 0; c < N; c++) {
          const d = div("sk-clue");
          d.textContent = puzzle.top[c];
          wrapEl.appendChild(d);
        }
        wrapEl.appendChild(div("sk-corner"));
        // rows
        for (let r = 0; r < N; r++) {
          // left clue
          const lc = div("sk-clue");
          lc.textContent = puzzle.left[r];
          wrapEl.appendChild(lc);
          for (let c = 0; c < N; c++) {
            const cell = div("sk-cell");
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            if (errs.has(`${r},${c}`)) cell.classList.add("error");
            const v = grid[r][c];
            if (v) cell.textContent = v;
            cell.addEventListener("click", () => {
              activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
              AudioFX.tick();
              render();
            });
            wrapEl.appendChild(cell);
          }
          // right clue
          const rc = div("sk-clue");
          rc.textContent = puzzle.right[r];
          wrapEl.appendChild(rc);
        }
        // bottom clues
        wrapEl.appendChild(div("sk-corner"));
        for (let c = 0; c < N; c++) {
          const d = div("sk-clue");
          d.textContent = puzzle.bottom[c];
          wrapEl.appendChild(d);
        }
        wrapEl.appendChild(div("sk-corner"));
        const filled = grid.flat().filter(v => v).length;
        root.querySelector("#sk-filled").textContent = `${filled} / 16`;
        root.querySelector("#sk-errors").textContent = errs.size;
      }

      function div(cls) {
        const d = document.createElement("div");
        d.className = cls;
        return d;
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
        // Check visibility clues
        for (let c = 0; c < N; c++) {
          const col = grid.map(r => r[c]);
          if (visibility(col) !== puzzle.top[c]) return;
          if (visibility(col.slice().reverse()) !== puzzle.bottom[c]) return;
        }
        for (let r = 0; r < N; r++) {
          if (visibility(grid[r]) !== puzzle.left[r]) return;
          if (visibility(grid[r].slice().reverse()) !== puzzle.right[r]) return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("skyscrapers");
        if (!best || 100 > best) {
          Storage.setBest("skyscrapers", 100);
          root.querySelector("#sk-best").textContent = 100;
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
          statusEl.textContent = "Duplicates remain";
          statusEl.className = "status lose";
          return;
        }
        checkAuto();
        if (!over) {
          AudioFX.error();
          statusEl.textContent = "Visibility clues not satisfied";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#sk-check").addEventListener("click", check);
      root.querySelector("#sk-clear").addEventListener("click", () => {
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
        const best = Storage.getBest("skyscrapers");
        root.querySelector("#sk-best").textContent = best || "—";
        statusEl.textContent = "Numbers around the grid tell you how many buildings are visible from that direction. Fill with 1–4.";
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
      App.showModal("How to play Skyscrapers",
        `Fill the 4×4 grid with buildings of heights <b>1, 2, 3, 4</b>:
        <br>• Each row contains 1, 2, 3, 4 (no repeats).
        <br>• Each column contains 1, 2, 3, 4 (no repeats).
        <br><br>Numbers around the grid tell you how many buildings are <b>visible</b> from that direction. A taller building hides any shorter building behind it.
        <br><br>Click a cell, then type 1–4. <b>Backspace</b> clears.`);
    },
  });
})();
