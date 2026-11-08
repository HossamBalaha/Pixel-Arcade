/* Aqre — shade cells to match room counts, four in a row is too many */
(function () {
  GameRegistry.register({
    id: "aqre",
    name: "Aqre",
    icon: "🔳",
    category: "logic",
    description: "Shade cells to match room counts — four in a row is too many",
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
      const N = 10;
      let rooms, shaded, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="aq-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="aq-best">0</div></div>
        </div>
        <div class="status info" id="aq-status">Shade the right number of cells in each room</div>
        <div class="center"><div id="aq-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="aq-check">✔ Check</button>
          <button class="btn btn-sm" id="aq-clear">↻ Clear</button>
          <button class="btn btn-sm" id="aq-new">🆕 New puzzle</button>
        </div>
        <p class="hint">No four consecutive cells (shaded or unshaded!) in any row or column.</p>
      `;

      const gridEl = root.querySelector("#aq-grid");
      const statusEl = root.querySelector("#aq-status");
      best = Storage.getBest("aqre") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #aq-grid { display:inline-grid; gap:0; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .aq-cell { width:34px; height:34px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; box-sizing:border-box; font-weight:700; color:var(--text,#eee); user-select:none; }
        .aq-shaded { background:var(--text,#eee) !important; }
      `;
      root.appendChild(style);

      function genRooms() {
        const rooms = [];

        function split(x, y, w, h) {
          const area = w * h;
          if (area <= 6 || (area <= 12 && Math.random() < 0.45)) {
            rooms.push({x, y, w, h, count: null});
            return;
          }
          if (w >= h && w > 1) {
            const cut = 1 + Math.floor(Math.random() * (w - 1));
            split(x, y, cut, h);
            split(x + cut, y, w - cut, h);
          } else if (h > 1) {
            const cut = 1 + Math.floor(Math.random() * (h - 1));
            split(x, y, w, cut);
            split(x, y + cut, w, h - cut);
          } else rooms.push({x, y, w, h, count: null});
        }

        split(0, 0, N, N);
        return rooms;
      }

      function generate() {
        rooms = genRooms();
        // solution: random shading with the no-4-run constraint satisfied via runs kept <= 3
        const shade = Array.from({length: N}, () => Array(N).fill(false));
        for (let y = 0; y < N; y++) {
          let run = 0;
          for (let x = 0; x < N; x++) {
            const p = Math.random() < 0.42;
            if (p && run < 3) {
              shade[y][x] = true;
              run++;
            } else if (!p && !shade[y][x]) run = 0;
            else if (p && run >= 3) {
              run = 0;
            }
          }
        }
        // fix vertical runs
        for (let x = 0; x < N; x++) {
          let run = 0;
          for (let y = 0; y < N; y++) {
            if (shade[y][x]) {
              run++;
              if (run >= 4) {
                shade[y][x] = false;
                run = 0;
              }
            } else run = 0;
          }
        }
        // horizontal check again for unshaded runs (we only constrained shaded above; Aqre needs BOTH)
        // unshaded runs fix:
        for (let pass = 0; pass < 40; pass++) {
          let bad = false;
          for (let y = 0; y < N; y++) for (let x = 0; x + 3 < N; x++) {
            const s = shade[y].slice(x, x + 4);
            if (s.every(v => v === s[0])) {
              shade[y][x + 1] = !shade[y][x + 1];
              bad = true;
            }
          }
          for (let x = 0; x < N; x++) for (let y = 0; y + 3 < N; y++) {
            const col = [shade[y][x], shade[y + 1][x], shade[y + 2][x], shade[y + 3][x]];
            if (col.every(v => v === col[0])) {
              shade[y + 1][x] = !shade[y + 1][x];
              bad = true;
            }
          }
          if (!bad) break;
        }
        rooms.forEach(r => {
          let c = 0;
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (shade[y][x]) c++;
          r.count = c > 0 || Math.random() < 0.4 ? c : null;
        });
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade the right number of cells in each room";
        statusEl.className = "status info";
      }

      function roomOf(x, y) {
        return rooms.find(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        for (const r of rooms) {
          if (r.count === null) continue;
          let c = 0;
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (shaded[y][x]) c++;
          if (c !== r.count) return `a room needs exactly ${r.count} shaded`;
        }
        for (let y = 0; y < N; y++) for (let x = 0; x + 3 < N; x++) {
          const s = [shaded[y][x], shaded[y][x + 1], shaded[y][x + 2], shaded[y][x + 3]];
          if (s.every(v => v === s[0])) return "four in a row (horizontal) at row " + (y + 1);
        }
        for (let x = 0; x < N; x++) for (let y = 0; y + 3 < N; y++) {
          const c4 = [shaded[y][x], shaded[y + 1][x], shaded[y + 2][x], shaded[y + 3][x]];
          if (c4.every(v => v === c4[0])) return "four in a column (vertical) at col " + (x + 1);
        }
        return null;
      }

      function check() {
        const err = validate();
        if (!err) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("aqre", best);
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
        root.querySelector("#aq-solved").textContent = solvedCount;
        root.querySelector("#aq-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 34px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "aq-cell" + (shaded[y][x] ? " aq-shaded" : "");
          c.style.background = "var(--bg-soft,#334155)";
          const r = roomOf(x, y);
          c.style.borderTop = r.y === y ? "2.5px solid var(--text,#eee)" : "1px solid rgba(255,255,255,0.08)";
          c.style.borderLeft = r.x === x ? "2.5px solid var(--text,#eee)" : "1px solid rgba(255,255,255,0.08)";
          if (r.y + r.h === y + 1) c.style.borderBottom = "2.5px solid var(--text,#eee)";
          if (r.x + r.w === x + 1) c.style.borderRight = "2.5px solid var(--text,#eee)";
          if (r.count !== null && r.x === x && r.y === y) c.textContent = r.count;
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#aq-check").addEventListener("click", check);
      root.querySelector("#aq-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#aq-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Aqre",
        `Shade cells so each <b>numbered room</b> holds exactly that many shaded cells.
        <br><br>The twist: in every row and column, <b>no four consecutive cells</b> may share the same state —
        not four shaded in a row, and not four unshaded either! Every run of 4 must be broken.
        Click cells to toggle, press <b>Check</b> to verify.`);
    },
  });
})();
