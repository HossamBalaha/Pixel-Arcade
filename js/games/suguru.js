/* Suguru — fill regions with 1..N, neighbors never repeat a digit */
(function () {
  GameRegistry.register({
    id: "suguru",
    name: "Suguru",
    icon: "🔢",
    category: "logic",
    description: "Fill regions with 1…N — neighbors can never repeat a digit",
    tags: ["logic", "numbers", "puzzle"],
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
      const N = 7;
      let regions, values, given, solvedCount, best, sel;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="sg-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sg-best">0</div></div>
        </div>
        <div class="status info" id="sg-status">Tap a cell, then a number — fill every region with 1…size</div>
        <div class="center"><div id="sg-grid"></div></div>
        <div class="row gap-2" id="sg-pad" style="justify-content:center;"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:6px;">
          <button class="btn btn-sm" id="sg-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Regions are colored areas. Touching cells (even diagonally!) can't hold the same digit.</p>
      `;

      const gridEl = root.querySelector("#sg-grid");
      const padEl = root.querySelector("#sg-pad");
      const statusEl = root.querySelector("#sg-status");
      best = Storage.getBest("suguru") || 0;
      solvedCount = 0;
      const REGION_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

      const style = document.createElement("style");
      style.textContent = `
        #sg-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .sg-cell { width:42px; height:42px; display:flex; align-items:center; justify-content:center;
                   font-weight:700; font-size:19px; cursor:pointer; color:var(--text,#eee); user-select:none; }
        .sg-cell.sel { outline:3px solid #fff; outline-offset:-3px; }
        .sg-btn { width:40px; height:40px; border-radius:8px; border:none; font-weight:700; font-size:17px; cursor:pointer; background:var(--bg-soft,#334155); color:var(--text,#eee); }
        .sg-btn:hover { filter:brightness(1.25); }
      `;
      root.appendChild(style);

      function genRegions() {
        // random BFS growth partition
        const reg = Array.from({length: N}, () => Array(N).fill(-1));
        const sizes = [];
        let id = 0, placed = 0;
        const target = N * N;
        while (placed < target) {
          // find an unassigned cell
          let sx = -1, sy = -1;
          outer: for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (reg[y][x] === -1) {
            sx = x;
            sy = y;
            break outer;
          }
          const size = Math.min(1 + Math.floor(Math.random() * 5), target - placed);
          const queue = [[sx, sy]];
          let count = 0;
          while (queue.length && count < size) {
            const [x, y] = queue.shift();
            if (reg[y][x] !== -1) continue;
            reg[y][x] = id;
            count++;
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
            for (const [dx, dy] of dirs) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && reg[ny][nx] === -1) queue.push([nx, ny]);
            }
          }
          sizes.push(count);
          placed += count;
          id++;
        }
        return {reg, sizes};
      }

      function solve(reg, sizes) {
        // Backtracking with incremental region bookkeeping (fast).
        const values = Array.from({length: N}, () => Array(N).fill(0));
        const regionOf = Array.from({length: N}, () => Array(N).fill(0));
        const regionCells = {};
        const cells = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const r = reg[y][x];
          regionOf[y][x] = r;
          (regionCells[r] = regionCells[r] || []).push([x, y]);
          cells.push([x, y]);
        }
        // order: fill regions one at a time, smallest first (fail fast)
        const regionOrder = Object.keys(regionCells).map(Number)
          .sort((a, b) => regionCells[a].length - regionCells[b].length);
        const ordered = [];
        regionOrder.forEach(r => regionCells[r].forEach(c => ordered.push(c)));
        const usedIn = {}; // region -> Set of values
        regionOrder.forEach(r => usedIn[r] = new Set());
        const budget = {n: 25000};

        function ok(x, y, v) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && values[ny][nx] === v) return false;
          }
          return true;
        }

        function bt(i) {
          if (--budget.n < 0) return false;
          if (i >= ordered.length) return true;
          const [x, y] = ordered[i];
          const r = regionOf[y][x];
          const maxV = sizes[r];
          const cands = [];
          for (let v = 1; v <= maxV; v++) {
            if (!usedIn[r].has(v) && ok(x, y, v)) cands.push(v);
          }
          // try most-constrained-ish random order
          cands.sort(() => Math.random() - 0.5);
          for (const v of cands) {
            values[y][x] = v;
            usedIn[r].add(v);
            if (bt(i + 1)) return true;
            usedIn[r].delete(v);
            values[y][x] = 0;
          }
          return false;
        }

        return bt(0) ? values : null;
      }

      function generate() {
        let sol, reg, sizes;
        let attempts = 0;
        do {
          ({reg, sizes} = genRegions());
          if (sizes.some(s => s > 5) || sizes.length < 8) continue;
          sol = solve(reg, sizes);
          attempts++;
        } while ((!sol || sizes.some(s => s < 1)) && attempts < 12);
        if (!sol) return generate();
        regions = reg;
        values = Array.from({length: N}, () => Array(N).fill(0));
        given = Array.from({length: N}, () => Array(N).fill(false));
        // givens: ~45% of cells
        const allCells = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) allCells.push([x, y]);
        allCells.sort(() => Math.random() - 0.5).slice(0, Math.floor(allCells.length * 0.42)).forEach(([x, y]) => {
          values[y][x] = sol[y][x];
          given[y][x] = true;
        });
        sel = null;
        render();
        statusEl.textContent = "Tap a cell, then a number — fill every region with 1…size";
        statusEl.className = "status info";
      }

      function checkWin() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!values[y][x]) return;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && values[ny][nx] === values[y][x]) return;
          }
        }
        // also verify region completeness (1..size)
        const regionCells = {};
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const r = regions[y][x];
          (regionCells[r] = regionCells[r] || []).push(values[y][x]);
        }
        for (const r in regionCells) {
          const size = regionCells[r].length;
          for (let v = 1; v <= size; v++) if (!regionCells[r].includes(v)) return;
        }
        AudioFX.win();
        solvedCount++;
        if (solvedCount > best) {
          best = solvedCount;
          Storage.setBest("suguru", best);
        }
        statusEl.textContent = "✔ Solved! New puzzle incoming…";
        statusEl.className = "status win";
        after(generate, 1300);
      }

      function setVal(v) {
        if (sel === null) return;
        const [x, y] = sel;
        if (given[y][x]) return;
        values[y][x] = values[y][x] === v ? 0 : v;
        AudioFX.click();
        sel = null;
        render();
        checkWin();
      }

      function render() {
        root.querySelector("#sg-solved").textContent = solvedCount;
        root.querySelector("#sg-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 42px)`;
        const maxRegion = Math.max(...regions.flat().map((_,) => 0)) || 0;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const c = document.createElement("div");
            c.className = "sg-cell" + (sel && sel[0] === x && sel[1] === y ? " sel" : "");
            const r = regions[y][x];
            c.style.background = REGION_COLORS[r % REGION_COLORS.length];
            c.style.opacity = given[y][x] ? "1" : "0.82";
            c.style.color = "#fff";
            c.style.textShadow = "0 1px 2px rgba(0,0,0,0.5)";
            c.textContent = values[y][x] || "";
            c.addEventListener("pointerdown", () => {
              if (given[y][x]) {
                AudioFX.error();
                return;
              }
              sel = [x, y];
              render();
            });
            gridEl.appendChild(c);
          }
        }
        padEl.innerHTML = "";
        for (let v = 1; v <= 5; v++) {
          const b = document.createElement("button");
          b.className = "sg-btn";
          b.textContent = v;
          b.addEventListener("click", () => setVal(v));
          padEl.appendChild(b);
        }
      }

      const onKey = (e) => {
        if (sel && /^[1-5]$/.test(e.key)) setVal(Number(e.key));
        if (e.key === "Backspace" && sel) setVal(values[sel[1]][sel[0]]);
        if (e.key === "0" && sel) {
          values[sel[1]][sel[0]] = 0;
          sel = null;
          render();
        }
      };
      document.addEventListener("keydown", onKey);

      root.querySelector("#sg-new").addEventListener("click", generate);
      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Suguru",
        `Each colored region of size N must contain the digits <b>1 through N</b> exactly once.
        <br><br>The catch: cells that touch — <b>including diagonally</b> — can never hold the same digit.
        Tap a cell, then tap a number (or press <b>1–5</b>). Tap the same number again to clear.
        Solved puzzles auto-advance to a fresh grid.`);
    },
  });
})();
