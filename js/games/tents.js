/* Tents — place tents next to trees: each tree needs 1 adjacent tent (orthogonally); tents can't touch. */
(function () {
  // Each puzzle: 5x5 grid with tree positions and the solution tent positions.
  const PUZZLES = [
    {
      trees: [[1, 1], [1, 3], [3, 1], [3, 3]],
      tents: [[1, 2], [0, 3], [3, 2], [3, 0]],
      rowClues: [1, 1, 0, 2, 1],
      colClues: [1, 0, 2, 2, 0],
    },
    {
      trees: [[0, 0], [2, 2], [4, 4], [0, 4]],
      tents: [[1, 0], [2, 3], [3, 4], [1, 4]],
      rowClues: [0, 2, 1, 1, 1],
      colClues: [1, 0, 0, 1, 3],
    },
    {
      trees: [[0, 2], [2, 0], [2, 4], [4, 2]],
      tents: [[0, 1], [1, 0], [2, 3], [4, 3]],
      rowClues: [1, 1, 1, 0, 2],
      colClues: [1, 1, 1, 2, 0],
    },
  ];
  const N = 5;

  let live = null;
  GameRegistry.register({
    id: "tents",
    name: "Tents",
    icon: "⛺",
    category: "logic",
    description: "Place a tent next to each tree — tents can't touch",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Tents</div><div class="val" id="tn-tents">0 / ${"?"}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="tn-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tn-best">—</div></div>
        </div>
        <div class="status info" id="tn-status">Each tree needs one tent orthogonally adjacent. Tents never touch (not even diagonally).</div>
        <div class="center" style="margin:14px 0;"><div class="tn-wrap" id="tn-wrap"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="tn-clear">Clear</button>
          <button class="btn primary" id="tn-check">Check</button>
        </div>
        <p class="hint">Tap an empty cell to place a tent. Tap a tent to remove it. Numbers on the side/bottom show how many tents are in that row/column.</p>
      `;
      const statusEl = root.querySelector("#tn-status");
      const wrapEl = root.querySelector("#tn-wrap");
      if (!document.getElementById("tn-style")) {
        const s = document.createElement("style");
        s.id = "tn-style";
        s.textContent = `
          .tn-wrap { display: inline-grid; grid-template-columns: repeat(${N}, 44px) 32px; gap: 3px; }
          .tn-cell { width: 44px; height: 44px; background: var(--bg-soft); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-size: 1.4rem; }
          .tn-cell.tree { background: var(--success); color: #fff; cursor: default; }
          .tn-cell.tent::after { content: "⛺"; }
          .tn-cell:hover { border-color: var(--accent); }
          .tn-cell.conflict { background: var(--danger); }
          .tn-clue { width: 32px; height: 44px; display: grid; place-items: center; background: var(--bg-elev); color: var(--text); font-family: var(--font-mono); font-weight: 700; border-radius: var(--radius-sm); }
          .tn-clue.col { width: 44px; }
          .tn-clue.ok { background: var(--success); color: #fff; }
        `;
        document.head.appendChild(s);
      }

      function isTree(r, c) {
        return puzzle.trees.some(([tr, tc]) => tr === r && tc === c);
      }

      function isTent(r, c) {
        return grid[r][c] === "tent";
      }

      function isAdjacentOrth(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2);
      }

      function isAdjacentDiag(r1, c1, r2, c2) {
        return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && !(r1 === r2 && c1 === c2);
      }

      function errors() {
        const errs = new Set();
        const tents = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (isTent(r, c)) tents.push([r, c]);
        // tents touching (including diagonally)
        for (let i = 0; i < tents.length; i++) {
          for (let j = i + 1; j < tents.length; j++) {
            if (isAdjacentDiag(tents[i][0], tents[i][1], tents[j][0], tents[j][1])) {
              errs.add(`${tents[i][0]},${tents[i][1]}`);
              errs.add(`${tents[j][0]},${tents[j][1]}`);
            }
          }
        }
        return errs;
      }

      function rowTentCount(r) {
        return grid[r].filter(v => v === "tent").length;
      }

      function colTentCount(c) {
        let n = 0;
        for (let r = 0; r < N; r++) if (grid[r][c] === "tent") n++;
        return n;
      }

      function render() {
        wrapEl.innerHTML = "";
        const errs = errors();
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "tn-cell";
            if (isTree(r, c)) {
              cell.classList.add("tree");
              cell.textContent = "🌳";
            } else if (isTent(r, c)) {
              cell.classList.add("tent");
              if (errs.has(`${r},${c}`)) cell.classList.add("conflict");
            }
            if (!isTree(r, c)) {
              cell.addEventListener("click", () => {
                if (over) return;
                grid[r][c] = grid[r][c] === "tent" ? null : "tent";
                AudioFX.pop();
                render();
                checkAuto();
              });
            }
            wrapEl.appendChild(cell);
          }
          // row clue
          const rc = document.createElement("div");
          rc.className = "tn-clue" + (rowTentCount(r) === puzzle.rowClues[r] ? " ok" : "");
          rc.textContent = puzzle.rowClues[r];
          wrapEl.appendChild(rc);
        }
        // col clues
        for (let c = 0; c < N; c++) {
          const cc = document.createElement("div");
          cc.className = "tn-clue col" + (colTentCount(c) === puzzle.colClues[c] ? " ok" : "");
          cc.textContent = puzzle.colClues[c];
          wrapEl.appendChild(cc);
        }
        // corner
        const corner = document.createElement("div");
        corner.className = "tn-clue";
        corner.textContent = "";
        wrapEl.appendChild(corner);
        const tents = grid.flat().filter(v => v === "tent").length;
        const target = puzzle.tents.length;
        root.querySelector("#tn-tents").textContent = `${tents} / ${target}`;
        root.querySelector("#tn-errors").textContent = errs.size;
      }

      function checkAuto() {
        const tents = grid.flat().filter(v => v === "tent").length;
        if (tents !== puzzle.tents.length) return;
        if (errors().size > 0) return;
        // Check each tree has exactly one adjacent tent
        const allOk = puzzle.trees.every(([tr, tc]) => {
          let count = 0;
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const r = tr + dr, c = tc + dc;
            if (r >= 0 && r < N && c >= 0 && c < N && isTent(r, c)) count++;
          }
          return count === 1;
        });
        // Check row/col counts
        const rowsOk = puzzle.rowClues.every((v, r) => rowTentCount(r) === v);
        const colsOk = puzzle.colClues.every((v, c) => colTentCount(c) === v);
        if (allOk && rowsOk && colsOk) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("tents");
          if (!best || 100 > best) {
            Storage.setBest("tents", 100);
            root.querySelector("#tn-best").textContent = 100;
          }
        }
      }

      function check() {
        const tents = grid.flat().filter(v => v === "tent").length;
        if (tents !== puzzle.tents.length) {
          AudioFX.error();
          statusEl.textContent = `Place exactly ${puzzle.tents.length} tents`;
          statusEl.className = "status lose";
          return;
        }
        if (errors().size > 0) {
          AudioFX.error();
          statusEl.textContent = "Some tents touch";
          statusEl.className = "status lose";
          return;
        }
        checkAuto();
        if (!over) {
          AudioFX.error();
          statusEl.textContent = "Not yet — keep working";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#tn-check").addEventListener("click", check);
      root.querySelector("#tn-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: N}, () => Array(N).fill(null));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = Array.from({length: N}, () => Array(N).fill(null));
        over = false;
        const best = Storage.getBest("tents");
        root.querySelector("#tn-best").textContent = best || "—";
        statusEl.textContent = "Each tree needs one tent orthogonally adjacent. Tents never touch (not even diagonally).";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          grid = Array.from({length: N}, () => Array(N).fill(null));
          puzzle.tents.forEach(([r, c]) => grid[r][c] = "tent");
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
      App.showModal("How to play Tents",
        `Each <b>tree</b> (🌳) must be paired with exactly one <b>tent</b> (⛺) orthogonally adjacent (up, down, left, right — not diagonal).
        <br><br>Rules:
        <br>• Tents <b>never touch</b> — not even diagonally.
        <br>• Tents only go in empty cells.
        <br>• Row and column numbers tell you how many tents are in that row/column.
        <br><br>Tap an empty cell to place a tent. Tap a tent to remove it.`);
    },
  });
})();
