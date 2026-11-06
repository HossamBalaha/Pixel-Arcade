/* Hex Puzzle — drag hex tiles to match colors with neighbors. */
(function () {
  const N = 5; // hex grid N rows
  const COLORS = ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];
  let live = null;

  GameRegistry.register({
    id: "hexpuzzle",
    name: "Hex Puzzle",
    icon: "⬡",
    category: "logic",
    description: "Swap hex tiles so no two neighbors share a color",
    tags: ["puzzle", "color"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid, sel, moves, time, timerInt, over;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="hp-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="hp-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hp-best">-</div></div>
        </div>
        <div class="status info" id="hp-status">Swap tiles so no neighbors share a color</div>
        <div class="center"><div id="hp-grid" style="position:relative;width:340px;height:280px;"></div></div>
        <p class="hint">Click two tiles to swap. No two adjacent hexes should match. <b>R</b> new puzzle.</p>
      `;
      const gridEl = root.querySelector("#hp-grid");
      const statusEl = root.querySelector("#hp-status");
      root.querySelector("#hp-best").textContent = Storage.getBest("hexpuzzle") ?? "-";

      // build a hex grid layout
      function buildGrid() {
        // 5 rows of 5 hexes (offset hex coordinates using axial)
        const cells = [];
        const r = 26; // hex radius
        const w = r * Math.sqrt(3);
        const h = r * 1.5;
        for (let row = 0; row < N; row++) {
          for (let col = 0; col < N; col++) {
            const x = col * w + (row % 2) * (w / 2) + w / 2;
            const y = row * h + r;
            cells.push({row, col, x, y, color: 0, idx: cells.length});
          }
        }
        // compute neighbors
        for (const c of cells) {
          c.neighbors = [];
          for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, rowParity(c.row)], [1, rowParity(c.row)]]) {
            const nr = c.row + d[0], nc = c.col + d[1];
            const n = cells.find(x => x.row === nr && x.col === nc);
            if (n) c.neighbors.push(n);
          }
        }
        return cells;

        function rowParity(row) {
          return row % 2 === 0 ? 1 : -1;
        }
      }

      // Better neighbor: use axial coords
      function buildGridV2() {
        const cells = [];
        const r = 26;
        const w = r * Math.sqrt(3);
        const h = r * 1.5;
        for (let row = 0; row < N; row++) {
          for (let col = 0; col < N; col++) {
            const x = col * w + (row % 2) * (w / 2) + w / 2;
            const y = row * h + r;
            cells.push({row, col, x, y, color: 0, idx: cells.length});
          }
        }
        for (const c of cells) {
          c.neighbors = [];
          // axial-ish neighbors with row parity
          const even = c.row % 2 === 0;
          const offsets = even
            ? [[0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]]
            : [[0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]];
          for (const [dr, dc] of offsets) {
            const nr = c.row + dr, nc = c.col + dc;
            const n = cells.find(x => x.row === nr && x.col === nc);
            if (n) c.neighbors.push(n);
          }
        }
        return cells;
      }

      function isSolved(cells) {
        for (const c of cells) for (const n of c.neighbors) if (n.color === c.color) return false;
        return true;
      }

      function shuffle(cells) {
        // Random colors with at least one mismatch
        let tries = 0;
        do {
          for (const c of cells) c.color = Math.floor(Math.random() * COLORS.length);
          tries++;
        } while (isSolved(cells) && tries < 20);
      }

      function newGame() {
        grid = buildGridV2();
        // try to generate a solvable puzzle (proper coloring exists with 5 colors for ~25 cells)
        // randomly assign colors; if already solved, reshuffle
        shuffle(grid);
        sel = null;
        moves = 0;
        time = 0;
        over = false;
        clearInterval(timerInt);
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time++;
          root.querySelector("#hp-t").textContent = time + "s";
        }, 1000);
        statusEl.textContent = "Swap tiles so no neighbors share a color";
        statusEl.className = "status info";
        render();
      }

      function hexPath(cx, cy, r) {
        const p = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i - Math.PI / 6;
          p.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
        }
        return p.join(" ");
      }

      function render() {
        gridEl.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "340");
        svg.setAttribute("height", "280");
        for (const c of grid) {
          const hex = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          hex.setAttribute("points", hexPath(c.x, c.y, 24));
          hex.setAttribute("fill", COLORS[c.color]);
          hex.setAttribute("stroke", sel === c ? "var(--warning)" : "var(--border)");
          hex.setAttribute("stroke-width", sel === c ? "4" : "1.5");
          hex.style.cursor = "pointer";
          hex.dataset.idx = c.idx;
          hex.addEventListener("click", () => onHex(c));
          svg.appendChild(hex);
        }
        gridEl.appendChild(svg);
        root.querySelector("#hp-m").textContent = moves;
      }

      function onHex(c) {
        if (over) return;
        if (!sel) {
          sel = c;
          AudioFX.click();
          render();
          return;
        }
        if (sel === c) {
          sel = null;
          render();
          return;
        }
        // swap colors
        [sel.color, c.color] = [c.color, sel.color];
        moves++;
        AudioFX.flip();
        sel = null;
        if (isSolved(grid)) {
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Solved in ${moves} moves, ${time}s!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("hexpuzzle");
          if (best === null || moves < best) {
            Storage.setBest("hexpuzzle", moves);
            App.toast("New best: " + moves + " moves", "success");
            root.querySelector("#hp-best").textContent = moves;
          }
        }
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        // find a pair of cells where swapping reduces conflicts (greedy)
        let bestPair = null, bestImp = 0;
        for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) {
          if (grid[i].color === grid[j].color) continue;
          const imp = improvement(grid[i], grid[j]);
          if (imp > bestImp) {
            bestImp = imp;
            bestPair = [grid[i], grid[j]];
          }
        }
        if (!bestPair) {
          App.toast("No helpful swap found", "info");
          return;
        }
        sel = bestPair[0];
        AudioFX.reveal();
        // also pulse the other
        const other = bestPair[1];
        render();
        // do the swap directly? We'll just highlight both.
        // Highlight by selecting sel and showing hint
        const svg = gridEl.querySelector("svg");
        if (svg) {
          const hex = svg.children[other.idx];
          if (hex) {
            hex.setAttribute("stroke", "var(--success)");
            hex.setAttribute("stroke-width", "4");
          }
        }
      }

      function improvement(a, b) {
        // count conflicts before and after swap
        const beforeA = a.neighbors.filter(n => n.color === a.color).length;
        const beforeB = b.neighbors.filter(n => n.color === b.color).length;
        [a.color, b.color] = [b.color, a.color];
        const afterA = a.neighbors.filter(n => n.color === a.color).length;
        const afterB = b.neighbors.filter(n => n.color === b.color).length;
        [a.color, b.color] = [b.color, a.color]; // restore
        return (beforeA + beforeB) - (afterA + afterB);
      }

      function doSolve() {
        // greedy solve: repeatedly pick the swap with biggest improvement
        if (over) return;
        const step = () => {
          if (isSolved(grid)) {
            over = true;
            clearInterval(timerInt);
            statusEl.textContent = `Auto-solved in ${moves} moves, ${time}s`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("hexpuzzle");
            if (best === null || moves < best) {
              Storage.setBest("hexpuzzle", moves);
              root.querySelector("#hp-best").textContent = moves;
            }
            return;
          }
          let bestPair = null, bestImp = 0;
          for (let i = 0; i < grid.length; i++) for (let j = i + 1; j < grid.length; j++) {
            if (grid[i].color === grid[j].color) continue;
            const imp = improvement(grid[i], grid[j]);
            if (imp > bestImp) {
              bestImp = imp;
              bestPair = [grid[i], grid[j]];
            }
          }
          if (!bestPair || bestImp <= 0) {
            // fallback random swap
            const a = grid[Math.floor(Math.random() * grid.length)];
            const b = grid[Math.floor(Math.random() * grid.length)];
            bestPair = [a, b];
          }
          [bestPair[0].color, bestPair[1].color] = [bestPair[1].color, bestPair[0].color];
          moves++;
          AudioFX.tick();
          render();
          later(step, 200);
        };
        step();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Hex Puzzle",
        `Click two hex tiles to swap their colors.
        <br><br>Goal: no two neighboring hexes should share a color.
        <br><br><b>Hint</b> highlights a swap that reduces the number of color conflicts. <b>Solve</b> animates a greedy solver.`);
    },
  });
})();
