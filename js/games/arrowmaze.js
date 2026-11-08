/* Arrow Maze — walk the arrows, visit every cell exactly once */
(function () {
  GameRegistry.register({
    id: "arrowmaze",
    name: "Arrow Maze",
    icon: "➡️",
    category: "logic",
    description: "Walk the arrows — visit every cell exactly once",
    tags: ["logic", "path", "puzzle"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const N = 6;
      let arrows, visited, order, pos, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="am-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="am-best">0</div></div>
          <div class="score-cell"><div class="label">Visited</div><div class="val" id="am-count">0/36</div></div>
        </div>
        <div class="status info" id="am-status">Start at ⭐ — follow the arrows through every cell</div>
        <div class="center"><div id="am-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="am-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Click any arrow pointing at your current cell to move there. Trap yourself and you restart!</p>
      `;

      const gridEl = root.querySelector("#am-grid");
      const statusEl = root.querySelector("#am-status");
      best = Storage.getBest("arrowmaze") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #am-grid { display:inline-grid; gap:3px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .am-cell { width:44px; height:44px; display:flex; align-items:center; justify-content:center;
                   font-size:20px; cursor:pointer; border-radius:6px; user-select:none; position:relative; }
        .am-cell.visited { opacity:0.3; }
        .am-cell .n { position:absolute; top:1px; right:3px; font-size:9px; font-weight:700; color:var(--text,#eee); }
        .am-cell.here { outline:3px solid #fbbf24; outline-offset:-3px; }
      `;
      root.appendChild(style);
      const DIRCH = ["⬆️", "➡️", "⬇️", "⬅️"];
      const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

      function generate() {
        // generate a random Hamiltonian path by random DFS (with backtracking, small grid works)
        const start = {x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N)};
        const path = [];
        const used = Array.from({length: N}, () => Array(N).fill(false));
        let nodes = 0;

        function dfs(x, y) {
          if (++nodes > 200000) return false;
          used[y][x] = true;
          path.push([x, y]);
          if (path.length === N * N) return true;
          const dirs = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
          for (const d of dirs) {
            const nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx >= N || ny >= N || used[ny][nx]) continue;
            if (dfs(nx, ny)) return true;
          }
          used[y][x] = false;
          path.pop();
          return false;
        }

        if (!dfs(start.x, start.y)) return generate();
        // arrows point from each cell to the NEXT cell in path
        arrows = Array.from({length: N}, () => Array(N).fill(-1));
        for (let i = 0; i + 1 < path.length; i++) {
          const [x, y] = path[i], [nx, ny] = path[i + 1];
          arrows[y][x] = dirTo(x, y, nx, ny);
        }
        visited = new Set([path[0].join(",")]);
        order = {0: [path[0][0], path[0][1]]};
        pos = {x: path[0][0], y: path[0][1]};
        startCell = path[0];
        render();
        statusEl.textContent = "Start at ⭐ — follow the arrows through every cell";
        statusEl.className = "status info";
      }

      let startCell = [0, 0];

      function dirTo(x, y, nx, ny) {
        if (nx === x + 1) return 1;
        if (nx === x - 1) return 3;
        if (ny === y + 1) return 2;
        return 0;
      }

      function tryMove(x, y) {
        if (visited.has(x + "," + y)) return;
        // the move is legal if cell (x,y)'s arrow points to pos
        const d = arrows[y][x];
        if (d < 0) return;
        const tx = x + DX[d], ty = y + DY[d];
        if (tx === pos.x && ty === pos.y) {
          visited.add(x + "," + y);
          order[visited.size - 1] = [x, y];
          pos = {x, y};
          AudioFX.pop();
          render();
          if (visited.size === N * N) win();
          else if (stuck()) {
            AudioFX.lose();
            statusEl.textContent = "😵 Trapped! No arrow points at you anymore — restarting…";
            statusEl.className = "status lose";
            after(generate, 1500);
          }
        }
      }

      function stuck() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (visited.has(x + "," + y)) continue;
          const d = arrows[y][x];
          if (d < 0) continue;
          if (x + DX[d] === pos.x && y + DY[d] === pos.y) return false;
        }
        return true;
      }

      function win() {
        AudioFX.win();
        solvedCount++;
        if (solvedCount > best) {
          best = solvedCount;
          Storage.setBest("arrowmaze", best);
        }
        statusEl.textContent = "🎉 Full tour! New maze incoming…";
        statusEl.className = "status win";
        after(generate, 1400);
      }

      function render() {
        root.querySelector("#am-solved").textContent = solvedCount;
        root.querySelector("#am-best").textContent = best;
        root.querySelector("#am-count").textContent = visited.size + "/" + (N * N);
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 44px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          const isStart = startCell[0] === x && startCell[1] === y;
          const vis = visited.has(x + "," + y);
          c.className = "am-cell" + (vis ? " visited" : "") + (pos.x === x && pos.y === y ? " here" : "");
          c.style.background = "var(--bg-soft,#334155)";
          c.innerHTML = (isStart ? "⭐" : arrows[y][x] >= 0 ? DIRCH[arrows[y][x]] : "·") +
            (vis ? `<span class="n">${[...(visited)].indexOf(x + "," + y) + 1}</span>` : "");
          c.addEventListener("pointerdown", () => tryMove(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#am-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Arrow Maze",
        `Every cell holds an arrow. Starting from the ⭐, click any <b>unvisited cell whose arrow points at your current position</b> —
        you then hop onto that cell.
        <br><br>Goal: visit <b>all ${6 * 6} cells</b>. The path always exists (the maze is generated backwards from a solution),
        but greedy moves can corner you — if no arrow points at you anymore, you're trapped and the maze restarts.`);
    },
  });
})();
