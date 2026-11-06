/* Nonogram — 5x5 Picross logic puzzle: fill cells per row/col clues. */
(function () {
  // Each puzzle: solution grid (5x5 of 0/1), name
  const PUZZLES = [
    {name: "Cross", sol: [[0, 1, 0, 1, 0], [0, 1, 0, 1, 0], [1, 1, 1, 1, 1], [0, 1, 0, 1, 0], [0, 1, 0, 1, 0]]},
    {name: "Plus", sol: [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]},
    {name: "Heart", sol: [[0, 1, 0, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]]},
    {name: "Smile", sol: [[1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [1, 1, 0, 1, 1]]},
    {name: "Diamond", sol: [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]]},
    {name: "Arrow", sol: [[0, 0, 1, 0, 0], [0, 1, 1, 1, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]},
    {name: "Letter T", sol: [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]},
    {name: "Square", sol: [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]]},
  ];

  function cluesFromRow(row) {
    const c = [];
    let run = 0;
    for (const v of row) {
      if (v === 1) run++;
      else {
        if (run) c.push(run);
        run = 0;
      }
    }
    if (run) c.push(run);
    return c.length ? c : [0];
  }

  let live = null;
  GameRegistry.register({
    id: "nonogram",
    name: "Nonogram",
    icon: "🔲",
    category: "logic",
    description: "5×5 Picross — fill cells per the row/column clues",
    tags: ["logic", "thinking", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null;
      let grid = []; // 0 = empty, 1 = filled, 2 = marked empty (X)
      let over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="ng-mistakes">0</div></div>
          <div class="score-cell"><div class="label">Picture</div><div class="val" id="ng-name">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ng-best">—</div></div>
        </div>
        <div class="status info" id="ng-status">Fill cells per the clues. Right-click (or long-press) marks an X.</div>
        <div class="center" style="margin:14px 0;">
          <div class="ng-wrap" id="ng-wrap"></div>
        </div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ng-clear">Clear</button>
          <button class="btn primary" id="ng-check">Check</button>
        </div>
        <p class="hint">Use the row and column number clues to figure out which cells to fill. Each number is a run of consecutive filled cells.</p>
      `;
      const statusEl = root.querySelector("#ng-status");
      const wrapEl = root.querySelector("#ng-wrap");
      if (!document.getElementById("ng-style")) {
        const s = document.createElement("style");
        s.id = "ng-style";
        s.textContent = `
          .ng-wrap { display: inline-grid; grid-template-columns: auto repeat(5, 36px); gap: 2px; }
          .ng-corner { width: 80px; }
          .ng-col-clue { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px; font-family: var(--font-mono); font-size: 0.78rem; min-height: 60px; }
          .ng-row-clue { display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 4px; font-family: var(--font-mono); font-size: 0.78rem; }
          .ng-cell { width: 36px; height: 36px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-weight: 700; color: var(--danger); }
          .ng-cell.filled { background: var(--text); border-color: var(--text); }
          .ng-cell.marked::after { content: "✕"; color: var(--text-muted); font-size: 0.9rem; }
          .ng-cell:hover { border-color: var(--accent); }
        `;
        document.head.appendChild(s);
      }

      function render() {
        wrapEl.innerHTML = "";
        // corner
        const corner = document.createElement("div");
        corner.className = "ng-corner";
        wrapEl.appendChild(corner);
        // col clues
        const colClues = [];
        for (let c = 0; c < 5; c++) {
          const col = puzzle.sol.map(r => r[c]);
          colClues.push(cluesFromRow(col));
        }
        for (let c = 0; c < 5; c++) {
          const el = document.createElement("div");
          el.className = "ng-col-clue";
          el.innerHTML = colClues[c].map(n => `<div>${n}</div>`).join("");
          wrapEl.appendChild(el);
        }
        // rows
        for (let r = 0; r < 5; r++) {
          const rowClue = cluesFromRow(puzzle.sol[r]);
          const rcEl = document.createElement("div");
          rcEl.className = "ng-row-clue";
          rcEl.textContent = rowClue.join("  ");
          wrapEl.appendChild(rcEl);
          for (let c = 0; c < 5; c++) {
            const cell = document.createElement("div");
            const v = grid[r][c];
            cell.className = "ng-cell" + (v === 1 ? " filled" : v === 2 ? " marked" : "");
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.addEventListener("click", () => onCell(r, c, false));
            cell.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              onCell(r, c, true);
            });
            wrapEl.appendChild(cell);
          }
        }
      }

      function onCell(r, c, isRight) {
        if (over) return;
        if (isRight) {
          // cycle empty → marked → empty
          grid[r][c] = grid[r][c] === 2 ? 0 : 2;
        } else {
          // cycle empty → filled → empty
          grid[r][c] = grid[r][c] === 1 ? 0 : 1;
        }
        AudioFX.tick();
        render();
      }

      function check() {
        let mistakes = 0;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 5; c++) {
            const filled = grid[r][c] === 1;
            const should = puzzle.sol[r][c] === 1;
            if (filled && !should) mistakes++;
          }
        }
        const correct = grid.every((row, r) => row.every((v, c) => (v === 1) === (puzzle.sol[r][c] === 1)));
        if (correct) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 Solved! It was "${puzzle.name}".`;
          statusEl.className = "status win";
          const score = Math.max(0, 100 - mistakes * 5);
          const best = Storage.getBest("nonogram");
          if (!best || score > best) {
            Storage.setBest("nonogram", score);
            root.querySelector("#ng-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
        } else {
          AudioFX.error();
          statusEl.textContent = mistakes > 0 ? `Not yet — ${mistakes} wrong cell${mistakes === 1 ? "" : "s"}` : "Keep going…";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#ng-check").addEventListener("click", check);
      root.querySelector("#ng-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: 5}, () => Array(5).fill(0));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = Array.from({length: 5}, () => Array(5).fill(0));
        over = false;
        root.querySelector("#ng-name").textContent = "???";
        const best = Storage.getBest("nonogram");
        root.querySelector("#ng-best").textContent = best || "—";
        statusEl.textContent = "Fill cells per the clues. Right-click (or long-press) marks an X.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          grid = puzzle.sol.map(r => r.slice());
          over = true;
          render();
          root.querySelector("#ng-name").textContent = puzzle.name;
          statusEl.textContent = `Solution revealed — it was "${puzzle.name}"`;
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
      App.showModal("How to play Nonogram",
        `Fill cells in the grid to reveal a hidden picture, based on the number clues.
        <br><br><b>Row clues</b> (left) describe each row's filled runs.
        <br><b>Column clues</b> (top) describe each column's filled runs.
        <br>Numbers are listed in order; runs are separated by at least one empty cell.
        <br><br><b>Left-click</b> a cell to fill it (toggle). <b>Right-click</b> to mark with X (a reminder you decided it's empty).
        <br><br>Hit <b>Check</b> when you think the picture is complete.`);
    },
  });
})();
