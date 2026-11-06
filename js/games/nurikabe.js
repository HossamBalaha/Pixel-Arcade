/* Nurikabe — 5x5 grid with numbered cells. Shade cells so each number is an island of that size. */
(function () {
  // Pre-baked puzzles: number cells with their island size, solution = shaded cells set.
  const PUZZLES = [
    {
      N: 5,
      numbers: [[0, 0, 2], [0, 4, 2], [2, 2, 3], [4, 0, 2], [4, 4, 2]],
      shaded: ["1,0", "1,4", "2,1", "2,3", "3,0", "3,4", "0,2", "4,2"]
    },
    {
      N: 5,
      numbers: [[0, 2, 2], [1, 0, 2], [1, 4, 3], [3, 0, 2], [4, 4, 2]],
      shaded: ["0,1", "0,3", "2,0", "2,1", "2,4", "3,4", "4,3", "3,2"]
    },
  ];
  let live = null;
  GameRegistry.register({
    id: "nurikabe",
    name: "Nurikabe",
    icon: "🏝️",
    category: "logic",
    description: "Shade cells to form islands of the right size, with a connected wall",
    tags: ["logic", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, grid, over = false;
      // grid cell states: 0 = empty (white island), 1 = shaded (wall), 'n' = numbered
      root.innerHTML = `
        <div class="status info" id="nb-status">Click cells to shade/unshade. Each number = island size. Walls must be connected, no 2×2 walls.</div>
        <div class="center" style="margin:14px 0;"><div id="nb-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="nb-clear">Clear</button>
          <button class="btn primary" id="nb-check">Check</button>
        </div>
        <p class="hint">Rules: each numbered cell is part of an island of exactly that many white cells. Shaded cells form one connected wall. No 2×2 shaded blocks.</p>
      `;
      const statusEl = root.querySelector("#nb-status");
      const gridEl = root.querySelector("#nb-grid");
      if (!document.getElementById("nb-style")) {
        const s = document.createElement("style");
        s.id = "nb-style";
        s.textContent = `#nb-grid{display:grid;background:var(--border);padding:1px;gap:1px;}.nb-cell{width:48px;height:48px;background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;cursor:pointer;user-select:none;color:var(--text);}.nb-cell.shaded{background:var(--text);color:var(--bg);}.nb-cell.number{background:var(--bg-elev);color:var(--accent);cursor:default;}`;
        document.head.appendChild(s);
      }

      function numAt(r, c) {
        return puzzle.numbers.find(n => n[0] === r && n[1] === c);
      }

      function render() {
        const N = puzzle.N;
        gridEl.style.gridTemplateColumns = `repeat(${N},48px)`;
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "nb-cell";
            const n = numAt(r, c);
            if (n) {
              cell.classList.add("number");
              cell.textContent = n[2];
            } else if (grid[r][c] === 1) {
              cell.classList.add("shaded");
            }
            if (!n) cell.addEventListener("click", () => {
              if (over) return;
              grid[r][c] = grid[r][c] === 1 ? 0 : 1;
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
      }

      function getIslands() {
        const N = puzzle.N;
        const visited = Array.from({length: N}, () => Array(N).fill(false));
        const islands = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (visited[r][c] || grid[r][c] === 1) continue;
          // BFS white region
          const q = [[r, c]];
          visited[r][c] = true;
          const cells = [];
          while (q.length) {
            const [rr, cc] = q.shift();
            cells.push([rr, cc]);
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = rr + dr, nc = cc + dc;
              if (nr < 0 || nr >= N || nc < 0 || nc >= N || visited[nr][nc] || grid[nr][nc] === 1) continue;
              visited[nr][nc] = true;
              q.push([nr, nc]);
            }
          }
          islands.push(cells);
        }
        return islands;
      }

      function wallsConnected() {
        const N = puzzle.N;
        const shaded = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (grid[r][c] === 1) shaded.push([r, c]);
        if (shaded.length === 0) return true;
        const seen = new Set([shaded[0].join(",")]);
        const q = [shaded[0]];
        while (q.length) {
          const [r, c] = q.shift();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc, k = nr + "," + nc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            if (grid[nr][nc] === 1 && !seen.has(k)) {
              seen.add(k);
              q.push([nr, nc]);
            }
          }
        }
        return seen.size === shaded.length;
      }

      function no2x2() {
        const N = puzzle.N;
        for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
          if (grid[r][c] === 1 && grid[r][c + 1] === 1 && grid[r + 1][c] === 1 && grid[r + 1][c + 1] === 1) return false;
        }
        return true;
      }

      function check() {
        if (over) return;
        const islands = getIslands();
        const good = islands.every(isl => {
          const nums = isl.filter(([r, c]) => numAt(r, c));
          if (nums.length === 0) return false; // unnumbered island
          if (nums.length > 1) return false; // island with multiple numbers
          return isl.length === nums[0] && numAt(nums[0][0], nums[0][1])[2];
        });
        const allMatched = islands.every(isl => {
          const nums = isl.filter(([r, c]) => numAt(r, c));
          if (nums.length !== 1) return false;
          return isl.length === numAt(nums[0][0], nums[0][1])[2];
        });
        if (good && allMatched && wallsConnected() && no2x2()) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("nurikabe");
          if (!best || 100 > best) {
            Storage.setBest("nurikabe", 100);
            App.toast("Solved!", "success");
          }
        } else {
          AudioFX.error();
          let msg = "Not yet.";
          if (!no2x2()) msg = "No 2×2 shaded blocks allowed.";
          else if (!wallsConnected()) msg = "Walls must be one connected group.";
          else if (!allMatched) msg = "Each island must match its number's size.";
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const N = puzzle.N;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        statusEl.textContent = "Click cells to shade/unshade.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#nb-check").addEventListener("click", check);
      root.querySelector("#nb-clear").addEventListener("click", () => {
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
            grid[r][c] = 1;
          });
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
    help: function () {
      App.showModal("How to play Nurikabe",
        `Click cells to toggle them between <b>white (island)</b> and <b>shaded (wall)</b>.
        <br><br>Rules:
        <br>• Each numbered cell is part of a connected white <b>island</b> of exactly that many cells.
        <br>• Each island contains exactly one number.
        <br>• All shaded cells form one connected wall.
        <br>• No 2×2 block of shaded cells.`);
    },
  });
})();
