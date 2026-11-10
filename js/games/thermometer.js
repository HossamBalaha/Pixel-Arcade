/* Thermometer — fill thermometers so rows and columns reach their sums */
(function () {
  let live = null;
  GameRegistry.register({
    id: "thermometer",
    name: "Thermometer",
    icon: "🌡️",
    category: "logic",
    description: "Fill thermometers so rows and columns reach their sums",
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
      const N = 6;
      let thermos, rowSums, colSums, fills, target, best, solvedN, checks;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="th-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="th-best">0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="th-errors">—</div></div>
        </div>
        <div class="status info" id="th-status">Click a cell to fill/unfill — thermometers fill from the bulb ●</div>
        <div class="center"><div id="th-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="th-check">✔ Check</button>
          <button class="btn btn-sm" id="th-clear">↻ Clear</button>
          <button class="btn btn-sm" id="th-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Mercury rises from the round bulb. Every row and column must sum exactly to its number.</p>
      `;

      const gridEl = root.querySelector("#th-grid");
      const statusEl = root.querySelector("#th-status");
      best = Storage.getBest("thermometer") || 0;
      solvedN = 0;

      const style = document.createElement("style");
      style.textContent = `
        #th-grid { display:inline-grid; gap:3px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .th-cell { width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:20px; user-select:none; }
        .th-bulb { border-radius:50%; background:var(--accent,#6366f1); }
        .th-stem-h { border-radius:20px; }
        .th-filled { background:var(--accent-2,#ec4899) !important; }
        .th-clue { background:transparent; font-weight:700; font-size:15px; cursor:default; }
      `;
      root.appendChild(style);

      // thermometer = ordered list of cells from bulb outward
      function generate() {
        // build thermometers: random walks on grid, cells used once
        thermos = [];
        const used = Array.from({length: N}, () => Array(N).fill(false));
        const tries = 14;
        for (let t = 0; t < tries; t++) {
          // random start
          let x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
          if (used[y][x]) continue;
          const horiz = Math.random() < 0.5;
          const dir = Math.random() < 0.5 ? 1 : -1;
          const len = 2 + Math.floor(Math.random() * 3);
          const cells = [];
          let ok = true;
          for (let k = 0; k < len; k++) {
            const cx = x + (horiz ? dir * k : 0), cy = y + (horiz ? 0 : dir * k);
            if (cx < 0 || cy < 0 || cx >= N || cy >= N || used[cy][cx]) {
              ok = false;
              break;
            }
            cells.push([cx, cy]);
          }
          if (!ok || cells.length < 2) continue;
          cells.forEach(([cx, cy]) => used[cy][cx] = true);
          thermos.push({cells, horiz});
        }
        if (thermos.length < 6) return generate();
        // random valid fill -> derive sums
        fills = thermos.map(t => Math.floor(Math.random() * (t.cells.length + 1)));
        const rows = Array(N).fill(0), cols = Array(N).fill(0);
        thermos.forEach((t, i) => {
          for (let k = 0; k < fills[i]; k++) {
            const [x, y] = t.cells[k];
            rows[y]++;
            cols[x]++;
          }
        });
        rowSums = rows;
        colSums = cols;
        target = fills.slice();
        // player state = all empty
        fills = thermos.map(() => 0);
        checks = 0;
        render();
        statusEl.textContent = "Click a cell to fill/unfill — thermometers fill from the bulb ●";
        statusEl.className = "status info";
      }

      function cellThermo(x, y) {
        for (let i = 0; i < thermos.length; i++) {
          const k = thermos[i].cells.findIndex(([cx, cy]) => cx === x && cy === y);
          if (k >= 0) return {t: i, k};
        }
        return null;
      }

      function click(x, y) {
        const info = cellThermo(x, y);
        if (!info) return;
        const t = thermos[info.t];
        if (fills[info.t] === info.k + 1) fills[info.t] = info.k; // unfill to here
        else if (info.k < fills[info.t]) fills[info.t] = info.k; // unfill
        else fills[info.t] = info.k + 1; // fill up to here
        AudioFX.click();
        render();
      }

      function currentCounts() {
        const rows = Array(N).fill(0), cols = Array(N).fill(0);
        thermos.forEach((t, i) => {
          for (let k = 0; k < fills[i]; k++) {
            const [x, y] = t.cells[k];
            rows[y]++;
            cols[x]++;
          }
        });
        return {rows, cols};
      }

      function check() {
        checks++;
        const {rows, cols} = currentCounts();
        const bad = [];
        for (let i = 0; i < N; i++) {
          if (rows[i] !== rowSums[i]) bad.push("row " + (i + 1));
          if (cols[i] !== colSums[i]) bad.push("col " + (i + 1));
        }
        if (bad.length === 0) {
          AudioFX.win();
          solvedN++;
          if (solvedN > best) {
            best = solvedN;
            Storage.setBest("thermometer", best);
          }
          statusEl.textContent = "✔ Perfect! Generating a new puzzle…";
          statusEl.className = "status win";
          after(generate, 1200);
        } else {
          AudioFX.error();
          statusEl.textContent = `✗ Not yet — check ${bad.slice(0, 3).join(", ")}`;
          statusEl.className = "status lose";
        }
        root.querySelector("#th-errors").textContent = bad.length || "0";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#th-solved").textContent = solvedN;
        root.querySelector("#th-best").textContent = best;
      }

      function render() {
        gridEl.innerHTML = "";
        // top-left corner + column clues
        gridEl.style.gridTemplateColumns = `34px repeat(${N}, 40px)`;
        const corner = document.createElement("div");
        corner.style.cssText = "width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--text-muted,#94a3b8);";
        corner.textContent = "↓→";
        gridEl.appendChild(corner);
        colSums.forEach(v => {
          const c = document.createElement("div");
          c.className = "th-cell th-clue";
          c.style.width = "40px";
          c.style.height = "34px";
          c.textContent = v;
          gridEl.appendChild(c);
        });
        for (let y = 0; y < N; y++) {
          const rc = document.createElement("div");
          rc.className = "th-cell th-clue";
          rc.style.width = "34px";
          rc.textContent = rowSums[y];
          gridEl.appendChild(rc);
          for (let x = 0; x < N; x++) {
            const info = cellThermo(x, y);
            const cell = document.createElement("div");
            cell.className = "th-cell";
            if (!info) {
              cell.style.background = "rgba(255,255,255,0.04)";
            } else {
              const t = thermos[info.t];
              const isBulb = info.k === 0;
              cell.classList.add(isBulb ? "th-bulb" : "th-stem-h");
              cell.style.borderRadius = isBulb ? "50%" : "6px";
              if (isBulb) cell.style.background = "var(--bg-soft,#334155)";
              else cell.style.background = "var(--bg-soft,#334155)";
              if (info.k < fills[info.t]) {
                cell.classList.add("th-filled");
                cell.style.background = "";
                cell.textContent = isBulb ? "●" : "";
              }
              cell.addEventListener("pointerdown", () => click(x, y));
            }
            gridEl.appendChild(cell);
          }
        }
      }

      root.querySelector("#th-check").addEventListener("click", check);
      root.querySelector("#th-clear").addEventListener("click", () => {
        fills = thermos.map(() => 0);
        render();
      });
      root.querySelector("#th-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!target) return;
          const diff = [];
          for (let i = 0; i < thermos.length; i++) if (fills[i] !== target[i]) diff.push(i);
          if (!diff.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const i = diff[Math.floor(Math.random() * diff.length)];
          const up = fills[i] < target[i];
          const [x, y] = thermos[i].cells[up ? fills[i] : fills[i] - 1];
          fills[i] += up ? 1 : -1;
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: the cell at row ${y + 1}, column ${x + 1} ${up ? "should be filled" : "should be empty"}`, "info");
        },
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
      App.showModal("How to play Thermometer",
        `The grid is full of thermometer shapes, each with a round <b>bulb</b> and a stem.
        Click a cell to <b>fill</b> the thermometer with mercury <b>up to that cell</b> — mercury always rises from the bulb, never the other way. Click the last filled cell to drain.
        <br><br>Goal: make every <b>row</b> and <b>column</b> contain exactly the number of filled cells shown by its clue.
        Press <b>Check</b> to verify — any valid arrangement counts.`);
    },
  });
})();
