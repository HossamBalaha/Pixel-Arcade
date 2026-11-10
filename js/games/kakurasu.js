/* Kakurasu — shade cells so row and column weights add up */
(function () {
  let live = null;
  GameRegistry.register({
    id: "kakurasu",
    name: "Kakurasu",
    icon: "📏",
    category: "logic",
    description: "Shade cells so row and column weights add up",
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
      let rowClues, colClues, shaded, solvedCount, best, solGrid;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="kk-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="kk-best">0</div></div>
        </div>
        <div class="status info" id="kk-status">Rows sum their column weights, columns sum their row weights</div>
        <div class="center"><div id="kk-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="kk-check">✔ Check</button>
          <button class="btn btn-sm" id="kk-clear">↻ Clear</button>
          <button class="btn btn-sm" id="kk-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Top clues = column weights (1..N down the side). Left clues = row weights (1..N along the top).</p>
      `;

      const gridEl = root.querySelector("#kk-grid");
      const statusEl = root.querySelector("#kk-status");
      best = Storage.getBest("kakurasu") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #kk-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .kk-cell { width:40px; height:40px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; border-radius:6px; user-select:none; }
        .kk-shaded { background:var(--text,#eee) !important; }
        .kk-clue { background:transparent; font-weight:700; font-size:14px; color:var(--text,#eee); cursor:default; }
        .kk-weight { font-size:11px; color:var(--text-muted,#94a3b8); }
      `;
      root.appendChild(style);

      function generate() {
        const sol = Array.from({length: N}, () => Array(N).fill(false));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) sol[y][x] = Math.random() < 0.42;
        // row clue: sum of (x+1) for shaded cells in that row
        rowClues = sol.map(r => r.reduce((s, v, x) => s + (v ? x + 1 : 0), 0));
        // col clue: sum of (y+1) for shaded cells in that col
        colClues = [];
        for (let x = 0; x < N; x++) {
          let s = 0;
          for (let y = 0; y < N; y++) if (sol[y][x]) s += y + 1;
          colClues.push(s);
        }
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        solGrid = sol;
        render();
        statusEl.textContent = "Rows sum their column weights, columns sum their row weights";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function current() {
        const rows = shaded.map(r => r.reduce((s, v, x) => s + (v ? x + 1 : 0), 0));
        const cols = [];
        for (let x = 0; x < N; x++) {
          let s = 0;
          for (let y = 0; y < N; y++) if (shaded[y][x]) s += y + 1;
          cols.push(s);
        }
        return {rows, cols};
      }

      function check() {
        const {rows, cols} = current();
        const badRows = [], badCols = [];
        for (let i = 0; i < N; i++) {
          if (rows[i] !== rowClues[i]) badRows.push(i + 1);
          if (cols[i] !== colClues[i]) badCols.push(i + 1);
        }
        if (!badRows.length && !badCols.length) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("kakurasu", best);
          }
          statusEl.textContent = "✔ Solved! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1400);
        } else {
          AudioFX.error();
          const parts = [];
          if (badRows.length) parts.push("rows " + badRows.join(", "));
          if (badCols.length) parts.push("cols " + badCols.join(", "));
          statusEl.textContent = "✗ Still off: " + parts.join(" / ");
          statusEl.className = "status lose";
        }
      }

      function render() {
        root.querySelector("#kk-solved").textContent = solvedCount;
        root.querySelector("#kk-best").textContent = best;
        const {rows, cols} = current();
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `44px repeat(${N}, 40px) 20px`;
        // corner
        let c = document.createElement("div");
        c.className = "kk-cell kk-clue";
        gridEl.appendChild(c);
        // top: column weight guides 1..N
        for (let x = 0; x < N; x++) {
          const cc = document.createElement("div");
          cc.className = "kk-cell kk-clue";
          cc.innerHTML = `<span class="kk-weight">${x + 1}</span>`;
          gridEl.appendChild(cc);
        }
        c = document.createElement("div");
        gridEl.appendChild(c);
        // second header: column clue (sum using row weights)
        c = document.createElement("div");
        c.className = "kk-cell kk-clue";
        gridEl.appendChild(c);
        for (let x = 0; x < N; x++) {
          const cc = document.createElement("div");
          cc.className = "kk-cell kk-clue";
          cc.textContent = colClues[x];
          cc.title = "column sum = " + colClues[x];
          gridEl.appendChild(cc);
        }
        gridEl.appendChild(document.createElement("div"));
        // rows
        for (let y = 0; y < N; y++) {
          // left: row clue
          const rc = document.createElement("div");
          rc.className = "kk-cell kk-clue";
          rc.textContent = rowClues[y];
          gridEl.appendChild(rc);
          for (let x = 0; x < N; x++) {
            const cell = document.createElement("div");
            cell.className = "kk-cell" + (shaded[y][x] ? " kk-shaded" : "");
            cell.style.background = "var(--bg-soft,#334155)";
            cell.addEventListener("pointerdown", () => toggle(x, y));
            gridEl.appendChild(cell);
          }
          // right: current row sum
          const rs = document.createElement("div");
          rs.className = "kk-cell kk-clue kk-weight";
          rs.textContent = rows[y];
          gridEl.appendChild(rs);
        }
        // bottom: current col sums
        const bl = document.createElement("div");
        gridEl.appendChild(bl);
        for (let x = 0; x < N; x++) {
          const cs = document.createElement("div");
          cs.className = "kk-cell kk-clue kk-weight";
          cs.textContent = cols[x];
          gridEl.appendChild(cs);
        }
        gridEl.appendChild(document.createElement("div"));
      }

      root.querySelector("#kk-check").addEventListener("click", check);
      root.querySelector("#kk-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#kk-new").addEventListener("click", generate);

      live = {
        hint: function () {
          const cur = current();
          if (cur.rows.every((v, i) => v === rowClues[i]) && cur.cols.every((v, i) => v === colClues[i])) {
            App.toast("The sums already match — press ✔ Check 💡", "info");
            return;
          }
          const missing = [], extra = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (solGrid[y][x] && !shaded[y][x]) missing.push([x, y]);
            if (!solGrid[y][x] && shaded[y][x]) extra.push([x, y]);
          }
          if (missing.length) {
            const [x, y] = missing[Math.floor(Math.random() * missing.length)];
            shaded[y][x] = true;
            AudioFX.reveal();
            render();
            App.toast(`💡 Hint: row ${y + 1}, column ${x + 1} should be shaded`, "info");
          } else if (extra.length) {
            const [x, y] = extra[Math.floor(Math.random() * extra.length)];
            shaded[y][x] = false;
            AudioFX.reveal();
            render();
            App.toast(`💡 Hint: row ${y + 1}, column ${x + 1} should stay empty`, "info");
          } else {
            App.toast("Nothing more to reveal 💡", "info");
          }
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
      App.showModal("How to play Kakurasu",
        `Two invisible rulers do the math:
        <br>• Each cell in <b>column x</b> is worth <b>x</b> points to its <b>row</b> (the small grey numbers along the top).
        <br>• Each cell in <b>row y</b> is worth <b>y</b> points to its <b>column</b>.
        <br><br>Shade cells so every row's total matches its clue on the left, and every column's total matches its clue on top.
        The current sums are shown in grey (row ends / column bottoms) as you go.`);
    },
  });
})();
