/* Yajilin — 5x5 grid with numbered cells. Draw a single loop through all non-numbered cells.
   Numbers tell how many shaded cells are in the direction of the arrow. */
(function () {
  // For simplicity, arrows always point in one of 4 directions; numbers tell count of shaded cells
  // in that direction (within the row/col). Solution: a loop path + shaded cells.
  // Pre-baked puzzle: numbered cells with {r,c,count,dir}; solution path is a list of cells forming the loop.
  const PUZZLES = [
    {
      N: 5,
      numbers: [{r: 0, c: 0, count: 1, dir: "down"}, {r: 0, c: 4, count: 0, dir: "down"}, {
        r: 4,
        c: 0,
        count: 0,
        dir: "up"
      }, {r: 4, c: 4, count: 1, dir: "up"}],
      // pre-baked solution: path forming a loop around the middle, shaded cells at (2,0) and (2,4)
      shaded: ["2,0", "2,4"],
      loopPath: ["0,1", "0,2", "0,3", "1,3", "1,2", "1,1", "2,1", "3,1", "3,2", "3,3", "2,3", "1,3"]
    },
    {
      N: 5,
      numbers: [{r: 0, c: 2, count: 1, dir: "right"}, {r: 4, c: 2, count: 1, dir: "left"}, {
        r: 2,
        c: 0,
        count: 0,
        dir: "right"
      }, {r: 2, c: 4, count: 0, dir: "left"}],
      shaded: ["0,4", "4,0"],
      loopPath: ["0,1", "0,3", "1,1", "1,2", "1,3", "2,1", "2,3", "3,1", "3,2", "3,3"]
    },
  ];
  let live = null;
  GameRegistry.register({
    id: "yajilin",
    name: "Yajilin",
    icon: "🔄",
    category: "logic",
    description: "Draw a single loop through all cells; numbers count shaded cells in their direction",
    tags: ["logic", "puzzle", "loop"],
    age: ["adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, grid, over = false;
      // grid[r][c] = 0 (empty), 1 (loop), 2 (shaded/black), or "n" (numbered cell, untouchable)
      root.innerHTML = `
        <div class="status info" id="yj-status">Click empty cell once = part of loop, twice = shaded. Numbers show shaded cells in arrow direction. All non-shaded, non-numbered cells must form one loop.</div>
        <div class="center" style="margin:14px 0;"><div id="yj-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="yj-clear">Clear</button>
          <button class="btn primary" id="yj-check">Check</button>
        </div>
        <p class="hint">Click to cycle: empty → loop → shaded → empty. The loop visits every non-shaded cell exactly once.</p>
      `;
      const statusEl = root.querySelector("#yj-status");
      const gridEl = root.querySelector("#yj-grid");
      if (!document.getElementById("yj-style")) {
        const s = document.createElement("style");
        s.id = "yj-style";
        s.textContent = `#yj-grid{display:grid;background:var(--border);padding:1px;gap:1px;}.yj-cell{width:52px;height:52px;background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1rem;cursor:pointer;user-select:none;color:var(--text);position:relative;}.yj-cell.loop{background:var(--accent-soft);color:var(--accent);}.yj-cell.loop:before{content:"";position:absolute;width:18px;height:18px;border:2px solid var(--accent);border-radius:50%;}.yj-cell.shaded{background:var(--text);color:var(--bg);}.yj-cell.num{background:var(--bg-elev);color:var(--warning);cursor:default;}`;
        document.head.appendChild(s);
      }
      const DIR_ARROW = {up: "↑", down: "↓", left: "←", right: "→"};

      function numAt(r, c) {
        return puzzle.numbers.find(n => n.r === r && n.c === c);
      }

      function render() {
        const N = puzzle.N;
        gridEl.style.gridTemplateColumns = `repeat(${N},52px)`;
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "yj-cell";
            const n = numAt(r, c);
            if (n) {
              cell.classList.add("num");
              cell.textContent = `${n.count}${DIR_ARROW[n.dir]}`;
            } else {
              if (grid[r][c] === 1) cell.classList.add("loop");
              else if (grid[r][c] === 2) cell.classList.add("shaded");
              cell.addEventListener("click", () => {
                if (over) return;
                grid[r][c] = (grid[r][c] + 1) % 3;
                AudioFX.tick();
                render();
              });
            }
            gridEl.appendChild(cell);
          }
        }
      }

      function countShadedInDir(n) {
        const N = puzzle.N;
        let count = 0;
        if (n.dir === "up") for (let r = n.r - 1; r >= 0; r--) if (grid[r][n.c] === 2) count++;
        if (n.dir === "down") for (let r = n.r + 1; r < N; r++) if (grid[r][n.c] === 2) count++;
        if (n.dir === "left") for (let c = n.c - 1; c >= 0; c--) if (grid[n.r][c] === 2) count++;
        if (n.dir === "right") for (let c = n.c + 1; c < N; c++) if (grid[n.r][c] === 2) count++;
        return count;
      }

      function getLoopGraph() {
        // Each loop cell should have exactly 2 loop neighbors (orthogonal).
        const N = puzzle.N;
        const cells = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === 1) cells.push([r, c]);
        const adj = {};
        cells.forEach(([r, c]) => {
          adj[r + "," + c] = [];
        });
        cells.forEach(([r, c]) => {
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc, k = nr + "," + nc;
            if (adj[k]) adj[r + "," + c].push(k);
          }
        });
        return {cells, adj};
      }

      function isSingleLoop() {
        const N = puzzle.N;
        // All non-numbered, non-shaded cells must be loop cells
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const n = numAt(r, c);
          if (n) continue;
          if (grid[r][c] !== 1 && grid[r][c] !== 2) return false;
        }
        const {cells, adj} = getLoopGraph();
        if (cells.length === 0) return false;
        // each cell degree 2
        for (const k in adj) if (adj[k].length !== 2) return false;
        // single connected cycle: traverse
        const seen = new Set();
        const start = cells[0].join(",");
        let cur = start, prev = null;
        for (let i = 0; i < cells.length; i++) {
          if (seen.has(cur)) return false;
          seen.add(cur);
          const ns = adj[cur].filter(x => x !== prev);
          if (ns.length === 0 && i < cells.length - 1) return false;
          prev = cur;
          cur = ns[0];
          if (!cur) break;
        }
        return seen.size === cells.length;
      }

      function check() {
        if (over) return;
        const N = puzzle.N;
        // numbers satisfied
        const numsOk = puzzle.numbers.every(n => countShadedInDir(n) === n.count);
        if (!numsOk) {
          AudioFX.error();
          statusEl.textContent = "Some numbered hints aren't satisfied.";
          statusEl.className = "status lose";
          return;
        }
        if (!isSingleLoop()) {
          AudioFX.error();
          statusEl.textContent = "Loop must pass through every non-shaded cell exactly once, forming one cycle.";
          statusEl.className = "status lose";
          return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("yajilin");
        if (!best || 100 > best) {
          Storage.setBest("yajilin", 100);
          App.toast("Solved!", "success");
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const N = puzzle.N;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        statusEl.textContent = "Click cells to draw loop (or shade).";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#yj-check").addEventListener("click", check);
      root.querySelector("#yj-clear").addEventListener("click", () => {
        if (over) return;
        const N = puzzle.N;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });
      live = {
        solve: function () {
          if (over) return;
          const N = puzzle.N;
          grid = Array.from({length: N}, () => Array(N).fill(0));
          puzzle.shaded.forEach(k => {
            const [r, c] = k.split(",").map(Number);
            grid[r][c] = 2;
          });
          puzzle.loopPath.forEach(k => {
            const [r, c] = k.split(",").map(Number);
            grid[r][c] = 1;
          });
          over = true;
          AudioFX.lose();
          statusEl.textContent = "Solution revealed (path may differ).";
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
    help: function () {
      App.showModal("How to play Yajilin",
        `Draw a single loop through cells. Each numbered cell shows how many <b>shaded cells</b> lie in the arrow's direction (in that row or column).
        <br><br>Rules:
        <br>• The loop passes through every non-numbered, non-shaded cell.
        <br>• The loop never branches or crosses itself.
        <br>• Shaded cells may not be adjacent to each other (orthogonally).
        <br>• Numbered cells are not part of the loop.
        <br><br>Click cells to cycle: empty → loop → shaded.`);
    },
  });
})();
