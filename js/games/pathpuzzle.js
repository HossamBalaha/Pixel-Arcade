/* Path Puzzle — find a path from start to end visiting every cell exactly once. */
(function () {
  // 5×5 grid; some cells have required-direction arrows that constrain movement.
  const PUZZLES = [
    {
      size: 5,
      start: [0, 0], end: [4, 4],
      walls: [],
      arrows: {}, // "r,c" → direction
      sol: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 3], [3, 3], [2, 3], [1, 3], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]],
    },
    {
      size: 5,
      start: [0, 4], end: [4, 0],
      walls: [],
      arrows: {"2,2": "down"},
      sol: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [4, 3], [3, 3], [2, 3], [1, 3], [0, 3], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [4, 1], [3, 1], [2, 1], [1, 1], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
    },
    {
      size: 5,
      start: [2, 0], end: [2, 4],
      walls: [[1, 2], [3, 2]],
      arrows: {},
      // no "sol": this layout has no path that visits every cell exactly once
    },
  ];
  const DIRS = {up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1]};

  let live = null;
  GameRegistry.register({
    id: "pathpuzzle",
    name: "Path Puzzle",
    icon: "🛤️",
    category: "logic",
    description: "Draw a path from start to end, visiting every cell once",
    tags: ["logic", "thinking", "puzzle"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, path = [], over = false;
      // path = list of [r, c] cells, starting with start cell

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Visited</div><div class="val" id="pp-visited">0 / 0</div></div>
          <div class="score-cell"><div class="label">Status</div><div class="val" id="pp-status-short">drawing…</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pp-best">—</div></div>
        </div>
        <div class="status info" id="pp-status">Click adjacent cells to extend the path. Visit every cell and end at the goal.</div>
        <div class="center" style="margin:14px 0;"><div class="pp-grid" id="pp-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="pp-undo">Undo</button>
          <button class="btn" id="pp-clear">Clear</button>
        </div>
        <p class="hint">Start at <b>S</b>, end at <b>E</b>. Each step must move to an orthogonally adjacent cell. Visit every white cell exactly once.</p>
      `;
      const statusEl = root.querySelector("#pp-status");
      const gridEl = root.querySelector("#pp-grid");
      if (!document.getElementById("pp-style")) {
        const s = document.createElement("style");
        s.id = "pp-style";
        s.textContent = `
          .pp-grid { display: inline-grid; grid-template-columns: repeat(5, 50px); gap: 3px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .pp-cell { width: 50px; height: 50px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1rem; cursor: pointer; user-select: none; color: var(--text); position: relative; }
          .pp-cell.wall { background: #333; color: #888; cursor: default; }
          .pp-cell.start { background: var(--success); color: #fff; }
          .pp-cell.end { background: var(--danger); color: #fff; }
          .pp-cell.path { background: var(--accent); color: #fff; }
          .pp-cell.path-start { background: var(--success); color: #fff; }
          .pp-cell.path-end { background: var(--danger); color: #fff; }
        `;
        document.head.appendChild(s);
      }

      function isWall(r, c) {
        return puzzle.walls.some(([wr, wc]) => wr === r && wc === c);
      }

      function inPath(r, c) {
        return path.some(([pr, pc]) => pr === r && pc === c);
      }

      function render() {
        gridEl.innerHTML = "";
        const totalCells = puzzle.size * puzzle.size - puzzle.walls.length;
        for (let r = 0; r < puzzle.size; r++) {
          for (let c = 0; c < puzzle.size; c++) {
            const cell = document.createElement("div");
            cell.className = "pp-cell";
            if (isWall(r, c)) {
              cell.classList.add("wall");
              cell.textContent = "▓";
            } else {
              const inP = inPath(r, c);
              const isStart = r === puzzle.start[0] && c === puzzle.start[1];
              const isEnd = r === puzzle.end[0] && c === puzzle.end[1];
              if (inP) {
                cell.classList.add("path");
                if (isStart) cell.classList.add("path-start");
                if (isEnd) cell.classList.add("path-end");
                const idx = path.findIndex(([pr, pc]) => pr === r && pc === c);
                cell.textContent = idx + 1;
              } else {
                if (isStart) {
                  cell.classList.add("start");
                  cell.textContent = "S";
                } else if (isEnd) {
                  cell.classList.add("end");
                  cell.textContent = "E";
                }
              }
              cell.addEventListener("click", () => clickCell(r, c));
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#pp-visited").textContent = `${path.length} / ${totalCells}`;
      }

      function clickCell(r, c) {
        if (over) return;
        if (isWall(r, c)) return;
        // If path is empty and this is the start, begin
        if (path.length === 0) {
          if (r === puzzle.start[0] && c === puzzle.start[1]) {
            path.push([r, c]);
            AudioFX.pop();
            render();
            checkAuto();
          }
          return;
        }
        // If already in path, ignore
        if (inPath(r, c)) return;
        // Must be adjacent to the last cell in the path
        const last = path[path.length - 1];
        const dr = Math.abs(r - last[0]), dc = Math.abs(c - last[1]);
        if (dr + dc !== 1) {
          AudioFX.error();
          return;
        }
        // Check arrow constraint
        const arrowKey = `${last[0]},${last[1]}`;
        if (puzzle.arrows[arrowKey]) {
          const dir = puzzle.arrows[arrowKey];
          const expected = DIRS[dir];
          if (r - last[0] !== expected[0] || c - last[1] !== expected[1]) {
            AudioFX.error();
            App.toast(`Must move ${dir} from this cell`, "warning");
            return;
          }
        }
        path.push([r, c]);
        AudioFX.pop();
        render();
        checkAuto();
      }

      function checkAuto() {
        const totalCells = puzzle.size * puzzle.size - puzzle.walls.length;
        if (path.length === totalCells) {
          const last = path[path.length - 1];
          if (last[0] === puzzle.end[0] && last[1] === puzzle.end[1]) {
            over = true;
            AudioFX.win();
            statusEl.textContent = "🎉 Path complete!";
            statusEl.className = "status win";
            root.querySelector("#pp-status-short").textContent = "SOLVED";
            const best = Storage.getBest("pathpuzzle");
            if (!best || 100 > best) {
              Storage.setBest("pathpuzzle", 100);
              root.querySelector("#pp-best").textContent = 100;
            }
          }
        }
      }

      root.querySelector("#pp-undo").addEventListener("click", () => {
        if (over || path.length === 0) return;
        path.pop();
        AudioFX.click();
        render();
      });
      root.querySelector("#pp-clear").addEventListener("click", () => {
        if (over) return;
        path = [];
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        path = [];
        over = false;
        const best = Storage.getBest("pathpuzzle");
        root.querySelector("#pp-best").textContent = best || "—";
        statusEl.textContent = "Click adjacent cells to extend the path. Visit every cell and end at the goal.";
        statusEl.className = "status info";
        root.querySelector("#pp-status-short").textContent = "drawing…";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          if (!puzzle.sol) {
            App.toast("💡 This layout has no path that covers every cell — nothing to reveal", "info");
            return;
          }
          const sol = puzzle.sol;
          // longest prefix of the player's path that matches the solution
          let k = 0;
          while (k < path.length && k < sol.length && path[k][0] === sol[k][0] && path[k][1] === sol[k][1]) k++;
          if (k >= sol.length) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const next = sol[k];
          if (k === path.length) {
            path.push([next[0], next[1]]);
            AudioFX.reveal();
            render();
            checkAuto();
            App.toast(`💡 Hint: the path continues at row ${next[0] + 1}, column ${next[1] + 1}`, "info");
          } else {
            App.toast(`💡 Hint: step ${k + 1} of a valid path is row ${next[0] + 1}, column ${next[1] + 1} — try Undo`, "info");
          }
        },
        solve: function () {
          if (over) return;
          App.toast("Try to find a Hamiltonian path from S to E!", "info");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Path Puzzle",
        `Draw a path from <b>S</b> (start) to <b>E</b> (end) that visits <b>every white cell exactly once</b>.
        <br><br>Click cells in order — each new cell must be orthogonally adjacent (up/down/left/right) to the previous one.
        <br><br>Some cells have arrows that force a specific direction of movement when leaving them. Black cells are walls (skip them).`);
    },
  });
})();
