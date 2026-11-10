/* Norinori — shade dominoes so every region holds exactly one half */
(function () {
  let live = null;
  GameRegistry.register({
    id: "norinori",
    name: "Norinori",
    icon: "🍫",
    category: "logic",
    description: "Shade dominoes so every region holds exactly one half",
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
      const N = 9;
      let regions, shaded, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="no-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="no-best">0</div></div>
        </div>
        <div class="status info" id="no-status">Shade 1×2 dominoes — one half per region</div>
        <div class="center"><div id="no-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="no-check">✔ Check</button>
          <button class="btn btn-sm" id="no-clear">↻ Clear</button>
          <button class="btn btn-sm" id="no-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Every region gets exactly one shaded cell, and every shaded cell is half of a domino.</p>
      `;

      const gridEl = root.querySelector("#no-grid");
      const statusEl = root.querySelector("#no-status");
      best = Storage.getBest("norinori") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #no-grid { display:inline-grid; gap:0; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .no-cell { width:36px; height:36px; cursor:pointer; box-sizing:border-box; user-select:none; }
        .no-shaded { background:var(--text,#eee) !important; }
      `;
      root.appendChild(style);
      const RCOLORS = ["#f59e0b", "#3b82f6", "#ef4444", "#22c55e", "#a855f7", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b", "#14b8a6"];

      function genRegions() {
        const reg = Array.from({length: N}, () => Array(N).fill(-1));
        let id = 0, placed = 0;
        while (placed < N * N) {
          let sx = -1, sy = -1;
          outer: for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (reg[y][x] === -1) {
            sx = x;
            sy = y;
            break outer;
          }
          const size = 2 + Math.floor(Math.random() * 4);
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
          placed += count;
          id++;
        }
        return reg;
      }

      function generate() {
        regions = genRegions();
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade 1×2 dominoes — one half per region";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // every region exactly one shaded
        const counts = {};
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const r = regions[y][x];
          counts[r] = (counts[r] || 0) + (shaded[y][x] ? 1 : 0);
        }
        for (const r in counts) if (counts[r] !== 1) return "every region needs exactly one shaded cell";
        // every shaded cell has exactly one shaded orthogonal neighbor (domino pairing)
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!shaded[y][x]) continue;
          let n = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && shaded[ny][nx]) n++;
          }
          if (n !== 1) return "shaded cells must pair into isolated dominoes";
        }
        return null;
      }

      // Hint-only pure solver: extends the player's current shading so every region
      // keeps exactly one shaded cell and shaded cells pair into isolated dominoes.
      // Deterministic backtracking with a step budget; never used by gameplay.
      function solveNorinori() {
        const byRegion = {};
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) (byRegion[regions[y][x]] = byRegion[regions[y][x]] || []).push([x, y]);
        const ids = Object.keys(byRegion).map(Number);
        if (ids.length % 2) return null; // odd region count can never pair into dominoes
        const pre = {}; // region id → the cell the player already shaded (at most one, checked here)
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shaded[y][x]) {
          const r = regions[y][x];
          if (pre[r]) return null;
          pre[r] = [x, y];
        }
        const state = {}; // region id → 0 untouched, 1 shaded needs partner, 2 paired
        ids.forEach(r => {
          if (pre[r]) state[r] = 1;
        });
        const on = new Set();
        for (const r in pre) on.add(pre[r].join(","));
        const chosen = [];
        let steps = 0;
        const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;

        function canPlace(c, d) {
          for (const [p, q] of [[c, d], [d, c]]) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = p[0] + dx, ny = p[1] + dy;
              if (nx === q[0] && ny === q[1]) continue;
              if (inb(nx, ny) && on.has(nx + "," + ny)) return false;
            }
          }
          return true;
        }

        function bt(k) {
          if (k === ids.length) return true;
          if (++steps > 100000) return false;
          const r = ids[k];
          if (state[r] === 2) return bt(k + 1);
          const anchors = state[r] === 1 ? [pre[r]] : byRegion[r];
          for (const c of anchors) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = c[0] + dx, ny = c[1] + dy;
              if (!inb(nx, ny)) continue;
              const r2 = regions[ny][nx];
              if (r2 === r || state[r2] === 2) continue;
              if (state[r2] === 1 && (pre[r2][0] !== nx || pre[r2][1] !== ny)) continue;
              const d = [nx, ny];
              if (!canPlace(c, d)) continue;
              state[r] = 2;
              state[r2] = 2;
              on.add(c.join(","));
              on.add(d.join(","));
              chosen.push(c, d);
              if (bt(k + 1)) return true;
              chosen.pop();
              chosen.pop();
              on.delete(c.join(","));
              on.delete(d.join(","));
              state[r2] = pre[r2] ? 1 : 0;
              state[r] = pre[r] ? 1 : 0;
            }
          }
          return false;
        }

        if (!bt(0)) return null;
        return chosen.slice();
      }

      function check() {
        const err = validate();
        if (!err) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("norinori", best);
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
        root.querySelector("#no-solved").textContent = solvedCount;
        root.querySelector("#no-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 36px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "no-cell" + (shaded[y][x] ? " no-shaded" : "");
          c.style.background = RCOLORS[regions[y][x] % RCOLORS.length];
          c.style.opacity = shaded[y][x] ? "1" : "0.8";
          // region borders
          c.style.boxSizing = "border-box";
          const r = regions, x0 = x, y0 = y;
          c.style.borderTop = y === 0 || r[y - 1][x] !== r[y][x] ? "2.5px solid var(--text,#eee)" : "1px solid rgba(0,0,0,0.15)";
          c.style.borderLeft = x === 0 || r[y][x - 1] !== r[y][x] ? "2.5px solid var(--text,#eee)" : "1px solid rgba(0,0,0,0.15)";
          if (y === N - 1) c.style.borderBottom = "2.5px solid var(--text,#eee)";
          if (x === N - 1) c.style.borderRight = "2.5px solid var(--text,#eee)";
          c.addEventListener("pointerdown", () => toggle(x0, y0));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#no-check").addEventListener("click", check);
      root.querySelector("#no-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#no-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!validate()) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const doms = solveNorinori();
          if (!doms) {
            App.toast("💡 No valid domino shading found — try ↻ Clear or 🆕 New puzzle", "info");
            return;
          }
          const open = [];
          for (let i = 0; i < doms.length; i += 2) {
            if (!shaded[doms[i][1]][doms[i][0]] || !shaded[doms[i + 1][1]][doms[i + 1][0]]) open.push([doms[i], doms[i + 1]]);
          }
          if (!open.length) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const [a, b] = open[Math.floor(Math.random() * open.length)];
          shaded[a[1]][a[0]] = true;
          shaded[b[1]][b[0]] = true;
          AudioFX.reveal();
          render();
          const r1 = a[1] + 1, c1 = a[0] + 1, r2 = b[1] + 1, c2 = b[0] + 1;
          const where = r1 === r2
            ? `row ${r1}, columns ${Math.min(c1, c2)}–${Math.max(c1, c2)}`
            : `column ${c1}, rows ${Math.min(r1, r2)}–${Math.max(r1, r2)}`;
          App.toast(`💡 Hint: shade the domino at ${where}`, "info");
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
      App.showModal("How to play Norinori",
        `Shade cells to form <b>dominoes</b> (1×2 blocks) with two rules:
        <br>• every <b>region</b> (bold-bordered area) contains <b>exactly one</b> shaded cell — just one half of a domino, whose
        other half lies in a different region;
        <br>• every shaded cell must pair with exactly <b>one</b> orthogonal shaded neighbor (no bigger blobs, no lone cells).
        <br>Click cells to toggle, <b>Check</b> to verify.`);
    },
  });
})();
