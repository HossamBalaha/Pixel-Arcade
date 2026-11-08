/* Heyawake — shade rooms to their counts, never three shaded in a row */
(function () {
  GameRegistry.register({
    id: "heyawake",
    name: "Heyawake",
    icon: "🏠",
    category: "logic",
    description: "Shade rooms to their counts — never three shaded in a row",
    tags: ["logic", "rooms", "puzzle"],
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
      let rooms, counts, shaded, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="hy-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hy-best">0</div></div>
        </div>
        <div class="status info" id="hy-status">Shade the number of cells shown in each room</div>
        <div class="center"><div id="hy-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="hy-check">✔ Check</button>
          <button class="btn btn-sm" id="hy-clear">↻ Clear</button>
          <button class="btn btn-sm" id="hy-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Rule of three: no three shaded cells may line up consecutively, even across rooms.</p>
      `;

      const gridEl = root.querySelector("#hy-grid");
      const statusEl = root.querySelector("#hy-status");
      best = Storage.getBest("heyawake") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #hy-grid { display:inline-grid; gap:0; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .hy-cell { width:36px; height:36px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; box-sizing:border-box; font-weight:700; color:var(--text,#eee); user-select:none; }
        .hy-shaded { background:var(--text,#eee) !important; }
      `;
      root.appendChild(style);

      function genRooms() {
        // random rectangular partition via recursive splitting
        const rooms = [];

        function split(x, y, w, h) {
          const area = w * h;
          if (area <= 4 || (area <= 9 && Math.random() < 0.5)) {
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

      function roomAt(x, y) {
        return rooms.findIndex(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      }

      function generate() {
        rooms = genRooms();
        // random solution respecting no-3-in-line
        let shade = Array.from({length: N}, () => Array(N).fill(false));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) shade[y][x] = Math.random() < 0.28;
        // fix vertical/horizontal triples greedily
        let guard = 0;
        while (guard++ < 300) {
          let fixed = 0;
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (x + 2 < N && shade[y][x] && shade[y][x + 1] && shade[y][x + 2]) {
              shade[y][x + 1] = false;
              fixed++;
            }
            if (y + 2 < N && shade[y][x] && shade[y + 1][x] && shade[y + 2][x]) {
              shade[y + 1][x] = false;
              fixed++;
            }
          }
          if (!fixed) break;
        }
        // counts (null for some rooms)
        rooms.forEach(r => {
          let c = 0;
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (shade[y][x]) c++;
          r.count = (c > 0 && Math.random() < 0.75) ? c : (c === 0 && Math.random() < 0.35 ? 0 : null);
        });
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade the number of cells shown in each room";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // room counts
        for (const r of rooms) {
          if (r.count === null) continue;
          let c = 0;
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) if (shaded[y][x]) c++;
          if (c !== r.count) return `room needs exactly ${r.count} shaded`;
        }
        // no 3 consecutive in row/col
        for (let y = 0; y < N; y++) for (let x = 0; x + 2 < N; x++) {
          if (shaded[y][x] && shaded[y][x + 1] && shaded[y][x + 2]) return "three in a row at row " + (y + 1);
        }
        for (let x = 0; x < N; x++) for (let y = 0; y + 2 < N; y++) {
          if (shaded[y][x] && shaded[y + 1][x] && shaded[y + 2][x]) return "three in a column at col " + (x + 1);
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
            Storage.setBest("heyawake", best);
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
        root.querySelector("#hy-solved").textContent = solvedCount;
        root.querySelector("#hy-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 36px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "hy-cell" + (shaded[y][x] ? " hy-shaded" : "");
          c.style.background = "var(--bg-soft,#334155)";
          // room borders
          const ri = roomAt(x, y), r = rooms[ri];
          c.style.borderTop = r.y === y ? "2.5px solid var(--text,#eee)" : "1px solid rgba(255,255,255,0.08)";
          c.style.borderLeft = r.x === x ? "2.5px solid var(--text,#eee)" : "1px solid rgba(255,255,255,0.08)";
          if (r.y + r.h === y + 1) c.style.borderBottom = "2.5px solid var(--text,#eee)";
          if (r.x + r.w === x + 1) c.style.borderRight = "2.5px solid var(--text,#eee)";
          if (r.count !== null && r.x === x && r.y === y) c.textContent = r.count;
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#hy-check").addEventListener("click", check);
      root.querySelector("#hy-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#hy-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Heyawake",
        `The grid is divided into <b>rooms</b> (bold borders). Shade cells so that:
        <br>• every numbered room contains <b>exactly</b> that many shaded cells (unnumbered rooms are free), and
        <br>• <b>three shaded cells never line up</b> consecutively in any row or column — even across room borders.
        <br><br>Click cells to toggle, then press <b>Check</b>. Any valid arrangement counts.`);
    },
  });
})();
