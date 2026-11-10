/* LITS — shade one tetromino per region, no same shapes touching */
(function () {
  let live = null;
  GameRegistry.register({
    id: "lits",
    name: "LITS",
    icon: "🧩",
    category: "logic",
    description: "Shade one tetromino per region — no same shapes touching",
    tags: ["logic", "shading", "puzzle"],
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
      const N = 8;
      let regions, shaded, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="li-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="li-best">0</div></div>
        </div>
        <div class="status info" id="li-status">Shade exactly 4 cells per region — form one connected wall</div>
        <div class="center"><div id="li-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="li-check">✔ Check</button>
          <button class="btn btn-sm" id="li-clear">↻ Clear</button>
          <button class="btn btn-sm" id="li-new">🆕 New puzzle</button>
        </div>
        <p class="hint">I, L, T, S shapes only. Identical shapes can't touch orthogonally. No 2×2 blocks.</p>
      `;

      const gridEl = root.querySelector("#li-grid");
      const statusEl = root.querySelector("#li-status");
      best = Storage.getBest("lits") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #li-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .li-cell { width:36px; height:36px; cursor:pointer; border-radius:4px; user-select:none; }
        .li-on { background:var(--text,#eee) !important; }
      `;
      root.appendChild(style);
      const RCOLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b", "#14b8a6", "#8b5cf6", "#eab308"];

      const TETRO_SHAPES = {
        I: [[0, 0], [1, 0], [2, 0], [3, 0]],
        L: [[0, 0], [0, 1], [0, 2], [1, 2]],
        T: [[0, 0], [1, 0], [2, 0], [1, 1]],
        S: [[0, 0], [1, 0], [1, 1], [2, 1]],
      };

      function shapeOf(cells) {
        const s = cells.map(([x, y]) => x + "," + y).sort().join("|");
        for (const [name, base] of Object.entries(TETRO_SHAPES)) {
          for (const [rot, flip] of [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]) {
            let pts = base.map(([x, y]) => [x, y]);
            for (let r = 0; r < rot; r++) pts = pts.map(([x, y]) => [-y, x]);
            if (flip) pts = pts.map(([x, y]) => [-x, y]);
            const minX = Math.min(...pts.map(p => p[0])), minY = Math.min(...pts.map(p => p[1]));
            const norm = pts.map(([x, y]) => `${x - minX},${y - minY}`).sort().join("|");
            if (norm === s) return name;
          }
        }
        return "?";
      }

      function isConnected(cells) {
        const set = new Set(cells.map(c => c.join(",")));
        const seen = new Set([cells[0].join(",")]);
        const stack = [cells[0]];
        while (stack.length) {
          const [x, y] = stack.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const k = (x + dx) + "," + (y + dy);
            if (set.has(k) && !seen.has(k)) {
              seen.add(k);
              stack.push([x + dx, y + dy]);
            }
          }
        }
        return seen.size === cells.length;
      }

      // Pre-generated valid boards (each region contains a legal tetromino).
      const BOARDS = [[[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 8, 8, 8, 4, 6, 6, 6], [7, 8, 9, 10, 11, 11, 11, 11], [7, 9, 9, 10, 10, 12, 12, 13], [7, 9, 14, 10, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]], [[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 7, 7, 7, 4, 6, 6, 6], [8, 8, 8, 9, 10, 10, 10, 10], [8, 11, 11, 9, 9, 12, 12, 13], [11, 11, 14, 9, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]], [[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 7, 7, 7, 4, 6, 6, 6], [8, 8, 8, 9, 10, 10, 10, 10], [8, 11, 11, 9, 9, 12, 12, 13], [11, 11, 14, 9, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]], [[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 8, 8, 8, 4, 6, 6, 6], [7, 8, 9, 10, 11, 11, 11, 11], [7, 9, 9, 10, 10, 12, 12, 13], [7, 9, 14, 10, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]], [[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 7, 7, 7, 4, 6, 6, 6], [8, 8, 8, 9, 10, 10, 10, 10], [8, 11, 11, 9, 9, 12, 12, 13], [11, 11, 14, 9, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]], [[0, 1, 1, 1, 1, 2, 2, 2], [0, 0, 3, 3, 4, 2, 5, 5], [0, 3, 3, 4, 4, 5, 5, 6], [7, 7, 7, 7, 4, 6, 6, 6], [8, 8, 8, 9, 10, 10, 10, 10], [8, 11, 11, 9, 9, 12, 12, 13], [11, 11, 14, 9, 12, 12, 13, 13], [14, 14, 14, 15, 15, 15, 15, 13]]];

      function transformBoard(b, rot, mirror) {
        const n = b.length;
        const out = Array.from({length: n}, () => Array(n).fill(0));
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
          let tx = x, ty = y;
          for (let r = 0; r < rot; r++) {
            const t = tx;
            tx = n - 1 - ty;
            ty = t;
          }
          if (mirror) tx = n - 1 - tx;
          out[ty][tx] = b[y][x];
        }
        return out;
      }

      function buildPuzzle() {
        const b = BOARDS[Math.floor(Math.random() * BOARDS.length)];
        const rot = Math.floor(Math.random() * 4);
        const mirror = Math.random() < 0.5;
        return transformBoard(b, rot, mirror);
      }

      function generate() {
        const regionId = buildPuzzle();
        if (!regionId) {
          // extraordinarily unlikely; try once more synchronously
          return after(generate, 30);
        }
        regions = regionId;
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade exactly 4 cells per region — form one connected wall";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // count per region = 4, connected tetromino
        const regionCells = {};
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const r = regions[y][x];
          (regionCells[r] = regionCells[r] || []).push([x, y, shaded[y][x]]);
        }
        const shapesUsed = [];
        for (const r in regionCells) {
          const on = regionCells[r].filter(c => c[2]);
          if (on.length !== 4) return "each region needs exactly 4 shaded cells";
          if (!isConnected(on.map(c => [c[0], c[1]]))) return "shaded cells in a region must connect";
          const shape = shapeOf(on.map(c => [c[0], c[1]]));
          if (shape === "?") return "regions must form I/L/T/S shapes";
          shapesUsed.push({shape, cells: on.map(c => [c[0], c[1]])});
        }
        for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
          if (shaded[y][x] && shaded[y][x + 1] && shaded[y + 1][x] && shaded[y + 1][x + 1]) return "no 2×2 blocks allowed";
        }
        for (const s of shapesUsed) {
          for (const [x, y] of s.cells) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && shaded[ny][nx] && regions[ny][nx] !== regions[y][x]) {
                const other = shapesUsed.find(sh => sh.cells.some(([ox, oy]) => ox === nx && oy === ny));
                if (other && other.shape === s.shape) return "identical shapes can't touch";
              }
            }
          }
        }
        const cells = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shaded[y][x]) cells.push([x, y]);
        if (cells.length && !isConnected(cells)) return "all shaded cells must form one connected wall";
        return null;
      }

      // Hint-only pure solver: picks one tetromino per region so the whole board
      // satisfies every LITS rule (shape, 2×2, same-shape contact, one wall).
      // Deterministic backtracking with a step budget; never used by gameplay.
      function solveLits() {
        const byRegion = {};
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) (byRegion[regions[y][x]] = byRegion[regions[y][x]] || []).push([x, y]);
        const ids = Object.keys(byRegion);
        if (!ids.length) return null;
        const opts = ids.map(id => {
          const cells = byRegion[id], out = [];
          const rec = (start, chosen) => {
            if (chosen.length === 4) {
              if (isConnected(chosen)) {
                const sh = shapeOf(chosen);
                if (sh !== "?") out.push({shape: sh, cells: chosen.slice()});
              }
              return;
            }
            for (let i = start; i < cells.length; i++) {
              chosen.push(cells[i]);
              rec(i + 1, chosen);
              chosen.pop();
            }
          };
          rec(0, []);
          return out;
        });
        const on = new Set(), onShape = {};
        const chosen = [];
        let steps = 0;

        function conflicts(pl) {
          const plSet = new Set(pl.cells.map(c => c.join(",")));
          for (const [x, y] of pl.cells) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const k = (x + dx) + "," + (y + dy);
              if (on.has(k) && onShape[k] === pl.shape) return true; // same shape touching across regions
            }
            for (const [bx, by] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) {
              if (bx < 0 || by < 0 || bx + 1 >= N || by + 1 >= N) continue;
              let full = true;
              for (const [qx, qy] of [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]) {
                if (!plSet.has(qx + "," + qy) && !on.has(qx + "," + qy)) {
                  full = false;
                  break;
                }
              }
              if (full) return true; // 2×2 block
            }
          }
          return false;
        }

        function bt(k) {
          if (k === ids.length) {
            const cells = [];
            for (const pl of chosen) cells.push(...pl.cells);
            return cells.length > 0 && isConnected(cells);
          }
          if (++steps > 200000) return false;
          for (const pl of opts[k]) {
            if (conflicts(pl)) continue;
            chosen.push(pl);
            for (const c of pl.cells) {
              on.add(c.join(","));
              onShape[c.join(",")] = pl.shape;
            }
            if (bt(k + 1)) return true;
            for (const c of pl.cells) on.delete(c.join(","));
            chosen.pop();
          }
          return false;
        }

        if (!bt(0)) return null;
        const cells = [];
        for (const pl of chosen) cells.push(...pl.cells);
        return cells;
      }

      function check() {
        const err = validate();
        if (!err) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("lits", best);
          }
          statusEl.textContent = "✔ Solved! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1300);
        } else {
          AudioFX.error();
          statusEl.textContent = "✗ " + err;
          statusEl.className = "status lose";
        }
      }

      function render() {
        root.querySelector("#li-solved").textContent = solvedCount;
        root.querySelector("#li-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 36px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "li-cell" + (shaded[y][x] ? " li-on" : "");
          c.style.background = RCOLORS[regions[y][x] % RCOLORS.length];
          c.style.opacity = shaded[y][x] ? "1" : "0.8";
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#li-check").addEventListener("click", check);
      root.querySelector("#li-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#li-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!validate()) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const sol = solveLits();
          if (!sol) {
            App.toast("💡 Couldn't find a valid shading — try ↻ Clear and start again", "info");
            return;
          }
          const missing = sol.filter(([x, y]) => !shaded[y][x]);
          if (!missing.length) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const pick = missing[Math.floor(Math.random() * missing.length)];
          shaded[pick[1]][pick[0]] = true;
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: cell at row ${pick[1] + 1}, column ${pick[0] + 1} is shaded in one valid solution`, "info");
        }
      };

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play LITS",
        `Every region must have <b>exactly 4 connected cells shaded</b> forming a tetromino — but never the O (square): only <b>I, L, T and S</b> shapes.
        <br><br>Rules:
        <br>• No <b>2×2</b> block of shaded cells anywhere.
        <br>• Tetrominoes of the <b>same shape</b> can't touch orthogonally.
        <br>• All shaded cells together form <b>one connected wall</b>.
        <br>Press <b>Check</b> when done — any valid arrangement wins.`);
    },
  });
})();
