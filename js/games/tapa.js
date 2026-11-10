/* Tapa — shade cells so each clue's lengths and gaps come true */
(function () {
  let live = null;
  GameRegistry.register({
    id: "tapa",
    name: "Tapa",
    icon: "⬛",
    category: "logic",
    description: "Shade cells so each clue's lengths and gaps come true",
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
      let clues, shaded, solvedCount, best, target;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="tp-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tp-best">0</div></div>
        </div>
        <div class="status info" id="tp-status">Shade cells around each clue to match its numbers</div>
        <div class="center"><div id="tp-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="tp-check">✔ Check</button>
          <button class="btn btn-sm" id="tp-clear">↻ Clear</button>
          <button class="btn btn-sm" id="tp-new">🆕 New puzzle</button>
        </div>
        <p class="hint">A clue like "1 2" means its neighbors form a run of 1, a gap, then a run of 2 shaded cells — in any order.</p>
      `;

      const gridEl = root.querySelector("#tp-grid");
      const statusEl = root.querySelector("#tp-status");
      best = Storage.getBest("tapa") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #tp-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .tp-cell { width:36px; height:36px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center;
                   gap:1px; cursor:pointer; border-radius:4px; font-size:11px; font-weight:700; color:var(--text,#eee); user-select:none; }
        .tp-shaded { background:var(--text,#eee) !important; }
        .tp-clue { background:#0f172a; cursor:default; }
      `;
      root.appendChild(style);

      function neighbors(x, y) {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push([nx, ny]);
        }
        return out;
      }

      function runsOf(shadeMap, x, y) {
        // circular sequence of 8 neighbors: compute runs of shaded with proper wrap
        const seq = [];
        const order = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
        for (const [dx, dy] of order) {
          const nx = x + dx, ny = y + dy;
          seq.push(nx >= 0 && ny >= 0 && nx < N && ny < N && shadeMap[ny][nx]);
        }
        // merge wrap-around
        if (seq[0] && seq[7]) {
          // rotate so a false exists
          const i = seq.indexOf(false);
          const rot = seq.slice(i).concat(seq.slice(0, i));
          return countRuns(rot);
        }
        return countRuns(seq);
      }

      function countRuns(seq) {
        const runs = [];
        let cur = 0;
        for (const v of seq) {
          if (v) cur++;
          else {
            if (cur) runs.push(cur);
            cur = 0;
          }
        }
        if (cur) runs.push(cur);
        return runs.sort((a, b) => a - b);
      }

      function generate() {
        clues = Array.from({length: N}, () => Array(N).fill(null));
        let shade = Array.from({length: N}, () => Array(N).fill(false));
        // place clue cells (well spread)
        const clueCells = [];
        let guard = 0;
        while (clueCells.length < 11 && guard++ < 200) {
          const x = 1 + Math.floor(Math.random() * (N - 2)), y = 1 + Math.floor(Math.random() * (N - 2));
          if (clueCells.some(([cx, cy]) => Math.abs(cx - x) < 2 && Math.abs(cy - y) < 2)) continue;
          clueCells.push([x, y]);
        }
        clueCells.forEach(([x, y]) => clues[y][x] = "clue");
        // random shading of non-clue cells
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!clues[y][x]) shade[y][x] = Math.random() < 0.34;
        }
        // derive clues
        let ok = true;
        for (const [x, y] of clueCells) {
          const runs = runsOf(shade, x, y);
          if (runs.length === 0 || runs.some(r => r > 4) || runs.length > 3) {
            ok = false;
            break;
          }
          clues[y][x] = runs;
        }
        if (!ok) return generate();
        target = shade.map(r => r.slice());
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade cells around each clue to match its numbers";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        if (clues[y][x]) return;
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // all clues satisfied + shaded cells connected + no clue cell shaded
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (Array.isArray(clues[y][x])) {
            const got = runsOf(shaded, x, y);
            const want = clues[y][x].slice().sort((a, b) => a - b);
            if (got.join(",") !== want.join(",")) return `clue at row ${y + 1}, col ${x + 1} not satisfied`;
          }
        }
        // connectivity of shaded
        const cells = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shaded[y][x]) cells.push([x, y]);
        if (!cells.length) return "nothing shaded yet";
        const seen = new Set([cells[0].join(",")]);
        const stack = [cells[0]];
        while (stack.length) {
          const [x, y] = stack.pop();
          for (const [nx, ny] of neighbors(x, y)) {
            const k = nx + "," + ny;
            if (shaded[ny][nx] && !seen.has(k)) {
              seen.add(k);
              stack.push([nx, ny]);
            }
          }
        }
        if (seen.size !== cells.length) return "all shaded cells must connect";
        return null;
      }

      function check() {
        const err = validate();
        if (!err) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("tapa", best);
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
        root.querySelector("#tp-solved").textContent = solvedCount;
        root.querySelector("#tp-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 36px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          const isClue = Array.isArray(clues[y][x]);
          c.className = "tp-cell" + (isClue ? " tp-clue" : shaded[y][x] ? " tp-shaded" : "");
          if (!isClue) c.style.background = "var(--bg-soft,#334155)";
          if (isClue) c.textContent = clues[y][x].join(" ");
          else c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#tp-check").addEventListener("click", check);
      root.querySelector("#tp-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#tp-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!target) return;
          const wrong = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shaded[y][x] !== target[y][x]) wrong.push([x, y]);
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [x, y] = wrong[Math.floor(Math.random() * wrong.length)];
          shaded[y][x] = target[y][x];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${y + 1}, column ${x + 1} ${target[y][x] ? "should be shaded" : "should not be shaded"}`, "info");
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
      App.showModal("How to play Tapa",
        `Shade empty cells so that the <b>8 neighbors of every clue</b> match its numbers.
        <br><br>Each number is the length of one <b>run of consecutive shaded cells</b> around that clue (clockwise), and different runs
        must be separated by at least one unshaded cell. Order doesn't matter — "1 2" can appear in any arrangement.
        <br>Extra rules: clue cells are never shaded, and <b>all shaded cells form one connected group</b> with no 2×2 blocks.`);
    },
  });
})();
