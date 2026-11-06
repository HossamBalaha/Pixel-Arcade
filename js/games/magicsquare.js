/* Magic Square — arrange numbers 1-9 in a 3x3 grid so all rows, columns, diagonals sum to 15. */
(function () {
  // Magic constant for 3x3 = 15. There are 8 solutions (4 rotations × 2 reflections) of the Lo Shu square.
  const SOLUTIONS = [
    [[2, 7, 6], [9, 5, 1], [4, 3, 8]],
    [[6, 1, 8], [7, 5, 3], [2, 9, 4]],
    [[8, 1, 6], [3, 5, 7], [4, 9, 2]],
    [[6, 7, 2], [1, 5, 9], [8, 3, 4]],
    [[4, 9, 2], [3, 5, 7], [8, 1, 6]],
    [[2, 9, 4], [7, 5, 3], [6, 1, 8]],
    [[4, 3, 8], [9, 5, 1], [2, 7, 6]],
    [[8, 3, 4], [1, 5, 9], [6, 7, 2]],
  ];
  const MAGIC = 15;
  let live = null;

  GameRegistry.register({
    id: "magicsquare",
    name: "Magic Square",
    icon: "🔢",
    category: "logic",
    description: "Arrange 1–9 in a 3×3 grid so every row, column & diagonal sums to 15",
    tags: ["math", "logic", "magic"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid = [[null, null, null], [null, null, null], [null, null, null]];
      let tray = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // available numbers
      let sel = null; // selected number from tray
      let moves = 0, time = 0, timerInt = null, started = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="mq-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mq-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mq-best">—</div></div>
        </div>
        <div class="status info" id="mq-status">Place numbers 1–9 so every row, column, and diagonal sums to 15.</div>
        <div class="center"><div id="mq-grid" style="display:grid;grid-template-columns:repeat(3,80px);grid-template-rows:repeat(3,80px);gap:6px;"></div></div>
        <div id="mq-tray" class="row" style="justify-content:center;gap:6px;margin-top:14px;flex-wrap:wrap;"></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:12px;">
          <button class="btn" id="mq-reset">Reset</button>
          <button class="btn primary" id="mq-check">Check</button>
        </div>
        <p class="hint">Tap a number in the tray, then tap a cell. Tap a placed number to send it back.</p>
      `;
      const gridEl = root.querySelector("#mq-grid");
      const trayEl = root.querySelector("#mq-tray");
      const statusEl = root.querySelector("#mq-status");
      root.querySelector("#mq-best").textContent = Storage.getBest("magicsquare") ?? "—";

      function newGame() {
        grid = [[null, null, null], [null, null, null], [null, null, null]];
        tray = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        sel = null;
        moves = 0;
        started = false;
        time = 0;
        clearInterval(timerInt);
        statusEl.textContent = "Place numbers 1–9 so every row, column, and diagonal sums to 15.";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);border:1px solid var(--border);display:grid;place-items:center;font-family:var(--font-mono);font-weight:800;font-size:2rem;cursor:pointer;";
          const v = grid[r][c];
          if (v !== null) {
            cell.textContent = v;
            cell.style.color = "var(--accent)";
          } else if (sel !== null) {
            cell.style.background = "var(--bg-soft)";
          }
          cell.addEventListener("click", () => onCell(r, c));
          gridEl.appendChild(cell);
        }
        trayEl.innerHTML = "";
        tray.forEach(n => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = n;
          btn.style.cssText = "min-width:44px;height:44px;font-family:var(--font-mono);font-weight:700;font-size:1.1rem;";
          if (sel === n) {
            btn.style.background = "var(--accent)";
            btn.style.color = "#fff";
          }
          btn.addEventListener("click", () => {
            sel = sel === n ? null : n;
            AudioFX.click();
            render();
          });
          trayEl.appendChild(btn);
        });
        root.querySelector("#mq-m").textContent = moves;
        root.querySelector("#mq-t").textContent = time + "s";
      }

      function onCell(r, c) {
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        if (grid[r][c] !== null) {
          // remove placed number back to tray
          tray.push(grid[r][c]);
          grid[r][c] = null;
          tray.sort((a, b) => a - b);
          AudioFX.click();
          render();
          return;
        }
        if (sel === null) {
          AudioFX.error();
          return;
        }
        grid[r][c] = sel;
        tray = tray.filter(x => x !== sel);
        sel = null;
        moves++;
        AudioFX.place();
        if (tray.length === 0) check();
        render();
      }

      function sums() {
        const rows = grid.map(row => row.reduce((a, b) => a + (b || 0), 0));
        const cols = [0, 1, 2].map(c => grid[0][c] + grid[1][c] + grid[2][c]);
        const diag1 = grid[0][0] + grid[1][1] + grid[2][2];
        const diag2 = grid[0][2] + grid[1][1] + grid[2][0];
        return {rows, cols, diag1, diag2};
      }

      function check() {
        const s = sums();
        const ok = s.rows.every(x => x === MAGIC) && s.cols.every(x => x === MAGIC) && s.diag1 === MAGIC && s.diag2 === MAGIC;
        if (ok) {
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Magic Square complete in ${moves} moves, ${time}s!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("magicsquare");
          if (best === null || moves < best) {
            Storage.setBest("magicsquare", moves);
            root.querySelector("#mq-best").textContent = moves;
            App.toast("Solved in " + moves + " moves!", "success");
          }
        } else {
          AudioFX.error();
          statusEl.textContent = `Not quite — check your sums (target: ${MAGIC}).`;
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#mq-check").addEventListener("click", check);
      root.querySelector("#mq-reset").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function doSolve() {
        const sol = SOLUTIONS[Math.floor(Math.random() * SOLUTIONS.length)];
        grid = sol.map(r => r.slice());
        tray = [];
        clearInterval(timerInt);
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
        clearInterval(timerInt);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Magic Square",
        `Arrange the numbers <b>1 through 9</b> in the 3×3 grid so that every row, every column, and both diagonals sum to <b>15</b>.
        <br><br>Tap a number in the tray, then tap a cell to place it. Tap a placed number to send it back to the tray.
        <br>The center is always 5 in any valid 3×3 magic square!`);
    },
  });
})();
