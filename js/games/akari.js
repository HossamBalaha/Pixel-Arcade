/* Akari (Light Up) — place bulbs to light up all white cells. Bulbs can't see each other. Numbered black cells show adjacent bulb count. */
(function () {
  // 5×5 grid: 0 = white, 1-4 = black with required bulbs, 9 = black no number.
  const PUZZLES = [
    {
      grid: [
        [0, 0, 0, 0, 0],
        [0, 9, 0, 9, 0],
        [0, 0, 2, 0, 0],
        [0, 9, 0, 9, 0],
        [0, 0, 0, 0, 0],
      ],
      sol: [[1, 1], [0, 4], [4, 0], [4, 4], [2, 3]],
    },
    {
      grid: [
        [9, 0, 0, 0, 0],
        [0, 0, 1, 0, 0],
        [0, 0, 0, 0, 9],
        [0, 9, 0, 0, 0],
        [0, 0, 0, 0, 0],
      ],
      sol: [[0, 4], [2, 0], [4, 2], [3, 4], [1, 2]],
    },
  ];
  const N = 5;

  let live = null;
  GameRegistry.register({
    id: "akari",
    name: "Light Up (Akari)",
    icon: "💡",
    category: "logic",
    description: "Place bulbs to light every white cell — no two bulbs see each other",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, bulbs = null, over = false; // bulbs: boolean grid

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Bulbs</div><div class="val" id="ak-bulbs">0</div></div>
          <div class="score-cell"><div class="label">Lit</div><div class="val" id="ak-lit">0 / 0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="ak-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ak-best">—</div></div>
        </div>
        <div class="status info" id="ak-status">Tap white cells to place bulbs. Light up every white cell.</div>
        <div class="center" style="margin:14px 0;"><div class="ak-grid" id="ak-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ak-clear">Clear</button>
          <button class="btn primary" id="ak-check">Check</button>
        </div>
        <p class="hint">Place <b>bulbs</b> in white cells. Bulbs light up their row and column until blocked by a black cell. No two bulbs may see each other. Numbered black cells must have exactly that many bulbs adjacent.</p>
      `;
      const statusEl = root.querySelector("#ak-status");
      const gridEl = root.querySelector("#ak-grid");
      if (!document.getElementById("ak-style")) {
        const s = document.createElement("style");
        s.id = "ak-style";
        s.textContent = `
          .ak-grid { display: inline-grid; grid-template-columns: repeat(${N}, 48px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .ak-cell { width: 48px; height: 48px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; cursor: pointer; user-select: none; color: var(--text); position: relative; }
          .ak-cell.black { background: #333; color: #fff; cursor: default; }
          .ak-cell.lit { background: rgba(255, 220, 100, 0.3); }
          .ak-cell.bulb::before { content: "💡"; font-size: 1.2rem; }
          .ak-cell.conflict { outline: 3px solid var(--danger); }
        `;
        document.head.appendChild(s);
      }

      function isBlack(r, c) {
        return puzzle.grid[r][c] !== 0;
      }

      function inBounds(r, c) {
        return r >= 0 && r < N && c >= 0 && c < N;
      }

      function isLit(r, c) {
        if (isBlack(r, c)) return false;
        if (bulbs[r][c]) return true;
        // Check 4 directions until hitting a black cell or finding a bulb
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let rr = r + dr, cc = c + dc;
          while (inBounds(rr, cc) && !isBlack(rr, cc)) {
            if (bulbs[rr][cc]) return true;
            rr += dr;
            cc += dc;
          }
        }
        return false;
      }

      function bulbsSeeEachOther() {
        // A bulb at (r,c) sees another bulb if there's a bulb in same row/col with no black between
        const seen = new Set();
        const positions = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bulbs[r][c]) positions.push([r, c]);
        for (let i = 0; i < positions.length; i++) {
          const [r1, c1] = positions[i];
          for (let j = i + 1; j < positions.length; j++) {
            const [r2, c2] = positions[j];
            if (r1 === r2) {
              // Same row — check no black between
              const lo = Math.min(c1, c2), hi = Math.max(c1, c2);
              let blocked = false;
              for (let cc = lo + 1; cc < hi; cc++) if (isBlack(r1, cc)) {
                blocked = true;
                break;
              }
              if (!blocked) {
                seen.add(`${r1},${c1}`);
                seen.add(`${r2},${c2}`);
              }
            } else if (c1 === c2) {
              const lo = Math.min(r1, r2), hi = Math.max(r1, r2);
              let blocked = false;
              for (let rr = lo + 1; rr < hi; rr++) if (isBlack(rr, c1)) {
                blocked = true;
                break;
              }
              if (!blocked) {
                seen.add(`${r1},${c1}`);
                seen.add(`${r2},${c2}`);
              }
            }
          }
        }
        return seen;
      }

      function numberedCellErrors() {
        const errs = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = puzzle.grid[r][c];
          if (v >= 1 && v <= 4) {
            let count = 0;
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nr = r + dr, nc = c + dc;
              if (inBounds(nr, nc) && bulbs[nr][nc]) count++;
            }
            if (count !== v) errs.add(`${r},${c}`);
          }
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const seeSet = bulbsSeeEachOther();
        const numErrs = numberedCellErrors();
        let bulbCount = 0, litCount = 0, totalWhite = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "ak-cell";
            if (isBlack(r, c)) {
              cell.classList.add("black");
              cell.textContent = puzzle.grid[r][c] === 9 ? "" : puzzle.grid[r][c];
              if (numErrs.has(`${r},${c}`)) cell.classList.add("conflict");
            } else {
              totalWhite++;
              if (isLit(r, c)) {
                cell.classList.add("lit");
                litCount++;
              }
              if (bulbs[r][c]) {
                cell.classList.add("bulb");
                bulbCount++;
                if (seeSet.has(`${r},${c}`)) cell.classList.add("conflict");
              }
              cell.addEventListener("click", () => {
                if (over) return;
                bulbs[r][c] = !bulbs[r][c];
                AudioFX.pop();
                render();
              });
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#ak-bulbs").textContent = bulbCount;
        root.querySelector("#ak-lit").textContent = `${litCount} / ${totalWhite}`;
        root.querySelector("#ak-errors").textContent = seeSet.size + numErrs.size;
      }

      function check() {
        const seeSet = bulbsSeeEachOther();
        const numErrs = numberedCellErrors();
        const allLit = (() => {
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (!isBlack(r, c) && !isLit(r, c)) return false;
          }
          return true;
        })();
        if (seeSet.size > 0) {
          AudioFX.error();
          statusEl.textContent = "Two bulbs see each other";
          statusEl.className = "status lose";
          return;
        }
        if (numErrs.size > 0) {
          AudioFX.error();
          statusEl.textContent = "Numbered cell mismatch";
          statusEl.className = "status lose";
          return;
        }
        if (!allLit) {
          AudioFX.error();
          statusEl.textContent = "Some cells are not lit";
          statusEl.className = "status lose";
          return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("akari");
        if (!best || 100 > best) {
          Storage.setBest("akari", 100);
          root.querySelector("#ak-best").textContent = 100;
        }
      }

      root.querySelector("#ak-check").addEventListener("click", check);
      root.querySelector("#ak-clear").addEventListener("click", () => {
        if (over) return;
        bulbs = Array.from({length: N}, () => Array(N).fill(false));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        bulbs = Array.from({length: N}, () => Array(N).fill(false));
        over = false;
        const best = Storage.getBest("akari");
        root.querySelector("#ak-best").textContent = best || "—";
        statusEl.textContent = "Tap white cells to place bulbs. Light up every white cell.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const missing = puzzle.sol.filter(([r, c]) => !bulbs[r][c]);
          if (!missing.length) {
            App.toast("All bulbs are in the right place 💡", "info");
            return;
          }
          const pick = missing[Math.floor(Math.random() * missing.length)];
          bulbs[pick[0]][pick[1]] = true;
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: a bulb belongs at row ${pick[0] + 1}, column ${pick[1] + 1}`, "info");
        },
        solve: function () {
          if (over) return;
          bulbs = Array.from({length: N}, () => Array(N).fill(false));
          puzzle.sol.forEach(([r, c]) => bulbs[r][c] = true);
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
      App.showModal("How to play Light Up (Akari)",
        `Place <b>bulbs</b> in white cells to light up the entire grid.
        <br><br>Rules:
        <br>• A bulb lights up its entire row and column until a black cell blocks it.
        <br>• <b>No two bulbs may see each other</b> (no black cell between them in the same row/column).
        <br>• A <b>numbered black cell</b> (1, 2, 3, 4) must have exactly that many bulbs in the 4 cells orthogonally adjacent to it.
        <br>• Every white cell must be lit by at least one bulb.
        <br><br>Tap a white cell to place or remove a bulb.`);
    },
  });
})();
