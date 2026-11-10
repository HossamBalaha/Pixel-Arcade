/* Clouds — place clouds to match the row and column counts */
(function () {
  let live = null;
  GameRegistry.register({
    id: "clouds",
    name: "Clouds",
    icon: "☁️",
    category: "logic",
    description: "Place clouds to match the row and column counts",
    tags: ["logic", "placement", "puzzle"],
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
      let clouds, shaded, solution, rowClues, colClues, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cl-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cl-best">0</div></div>
        </div>
        <div class="status info" id="cl-status">Place rectangular clouds — match the edge counts</div>
        <div class="center"><div id="cl-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="cl-check">✔ Check</button>
          <button class="btn btn-sm" id="cl-clear">↻ Clear</button>
          <button class="btn btn-sm" id="cl-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Clouds are 2×1 to 3×2 rectangles (draw with drag or click-drag). They never touch, even diagonally.</p>
      `;

      const gridEl = root.querySelector("#cl-grid");
      const statusEl = root.querySelector("#cl-status");
      best = Storage.getBest("clouds") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #cl-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .cl-cell { width:38px; height:38px; cursor:pointer; border-radius:6px; user-select:none; }
        .cl-on { background:#7dd3fc !important; box-shadow: inset 0 0 8px rgba(2,132,199,0.5); }
        .cl-clue { background:transparent; font-weight:700; color:var(--text,#eee); cursor:default; display:flex; align-items:center; justify-content:center; font-size:14px; }
      `;
      root.appendChild(style);

      function overlapsAny(rect, rects) {
        return rects.some(r =>
          rect.x < r.x + r.w + 1 && rect.x + rect.w + 1 > r.x &&
          rect.y < r.y + r.h + 1 && rect.y + rect.h + 1 > r.y);
      }

      function generate() {
        const rects = [];
        const target = 4 + Math.floor(Math.random() * 2);
        let guard = 0;
        while (rects.length < target && guard++ < 200) {
          const w = Math.random() < 0.5 ? 2 : 3;
          const h = Math.random() < 0.6 ? 1 : 2;
          const rect = {x: Math.floor(Math.random() * (N - w + 1)), y: Math.floor(Math.random() * (N - h + 1)), w, h};
          if (rect.x + w > N || rect.y + h > N) continue;
          if (overlapsAny(rect, rects)) continue;
          rects.push(rect);
        }
        clouds = rects;
        const sol = Array.from({length: N}, () => Array(N).fill(false));
        rects.forEach(r => {
          for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) sol[y][x] = true;
        });
        solution = sol;
        rowClues = sol.map(r => r.filter(Boolean).length);
        colClues = [];
        for (let x = 0; x < N; x++) {
          let c = 0;
          for (let y = 0; y < N; y++) if (sol[y][x]) c++;
          colClues.push(c);
        }
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Place rectangular clouds — match the edge counts";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // counts
        for (let y = 0; y < N; y++) {
          const c = shaded[y].filter(Boolean).length;
          if (c !== rowClues[y]) return `row ${y + 1} needs ${rowClues[y]} cloud cells`;
        }
        for (let x = 0; x < N; x++) {
          let c = 0;
          for (let y = 0; y < N; y++) if (shaded[y][x]) c++;
          if (c !== colClues[x]) return `col ${x + 1} needs ${colClues[x]} cloud cells`;
        }
        // rectangles: find connected shaded areas; each must be a 2-3 wide, 1-2 tall rectangle
        const seen = Array.from({length: N}, () => Array(N).fill(false));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (seen[y][x] || !shaded[y][x]) continue;
          const stack = [[x, y]], cells = [];
          seen[y][x] = true;
          while (stack.length) {
            const [cx, cy] = stack.pop();
            cells.push([cx, cy]);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx] && shaded[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([nx, ny]);
              }
            }
          }
          const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
          const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
          if (cells.length !== w * h) return "clouds must be rectangles";
          if (!((w === 2 || w === 3) && (h === 1 || h === 2) && !(w === 3 && h === 2 && false))) return "clouds must be 2×1, 3×1, 2×2 or 3×2";
        }
        // no touching, not even diagonally
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!shaded[y][x]) continue;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && shaded[ny][nx]) {
              // same cloud? check same rectangle region via 4-connectivity already handled; diagonal touch is between distinct clouds only if not 4-connected
              // find if (nx,ny) is 4-connected to (x,y)
              const connected4 = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ddx, ddy]) => nx === x + ddx && ny === y + ddy);
              if (!connected4) return "clouds can't touch, not even diagonally";
            }
          }
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
            Storage.setBest("clouds", best);
          }
          statusEl.textContent = "☁️ All clouds placed! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1400);
        } else {
          AudioFX.error();
          statusEl.textContent = "✗ " + err;
          statusEl.className = "status lose";
        }
      }

      function render() {
        root.querySelector("#cl-solved").textContent = solvedCount;
        root.querySelector("#cl-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `30px repeat(${N}, 38px)`;
        const corner = document.createElement("div");
        corner.className = "cl-clue";
        gridEl.appendChild(corner);
        for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "cl-clue";
          c.textContent = colClues[x];
          gridEl.appendChild(c);
        }
        for (let y = 0; y < N; y++) {
          const rc = document.createElement("div");
          rc.className = "cl-clue";
          rc.textContent = rowClues[y];
          gridEl.appendChild(rc);
          for (let x = 0; x < N; x++) {
            const c = document.createElement("div");
            c.className = "cl-cell" + (shaded[y][x] ? " cl-on" : "");
            c.style.background = "var(--bg-soft,#334155)";
            c.addEventListener("pointerdown", () => toggle(x, y));
            gridEl.appendChild(c);
          }
        }
      }

      root.querySelector("#cl-check").addEventListener("click", check);
      root.querySelector("#cl-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#cl-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!solution) return;
          const wrong = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (shaded[y][x] !== solution[y][x]) wrong.push([x, y]);
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [x, y] = wrong[Math.floor(Math.random() * wrong.length)];
          shaded[y][x] = solution[y][x];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${y + 1}, column ${x + 1} ${solution[y][x] ? "should be a cloud cell" : "should be empty sky"}`, "info");
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
      App.showModal("How to play Clouds",
        `Hide clouds in the sky grid:
        <br>• the numbers on the edges count the <b>cloud cells</b> in each row and column;
        <br>• each cloud is a rectangle of size <b>2×1, 3×1, 2×2 or 3×2</b>;
        <br>• clouds <b>never touch</b> — not even diagonally.
        <br><br>Click cells to paint cloud parts. Press <b>Check</b> when the counts look right.`);
    },
  });
})();
