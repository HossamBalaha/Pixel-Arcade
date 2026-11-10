/* Choco Banana — shade cells to match area clues, no 2×2 blocks */
(function () {
  let live = null;
  GameRegistry.register({
    id: "chocobanana",
    name: "Choco Banana",
    icon: "🍌",
    category: "logic",
    description: "Shade cells to match area clues — no 2×2 blocks",
    tags: ["logic", "shading", "areas"],
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
      let clues, shaded, target, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cb-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cb-best">0</div></div>
        </div>
        <div class="status info" id="cb-status">Shade white areas to their exact sizes — no 2×2 blocks</div>
        <div class="center"><div id="cb-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="cb-check">✔ Check</button>
          <button class="btn btn-sm" id="cb-clear">↻ Clear</button>
          <button class="btn btn-sm" id="cb-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Unshaded areas must match their clue exactly. Shaded areas can be any shape — but never 2×2.</p>
      `;

      const gridEl = root.querySelector("#cb-grid");
      const statusEl = root.querySelector("#cb-status");
      best = Storage.getBest("chocobanana") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #cb-grid { display:inline-grid; gap:0; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .cb-cell { width:36px; height:36px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; font-weight:700; box-sizing:border-box; user-select:none; color:var(--text,#eee); }
        .cb-shaded { background:var(--text,#eee) !important; color:var(--bg,#111); }
      `;
      root.appendChild(style);

      function generate() {
        // random shading ~45%
        const sol = Array.from({length: N}, () => Array.from({length: N}, () => Math.random() < 0.45));
        // kill 2x2s in solution
        for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
          if (sol[y][x] && sol[y][x + 1] && sol[y + 1][x] && sol[y + 1][x + 1]) sol[y + 1][x + 1] = false;
        }
        clues = Array.from({length: N}, () => Array(N).fill(null));
        // compute unshaded (white) areas and place one clue per area
        const seen = Array.from({length: N}, () => Array(N).fill(false));
        const areas = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (seen[y][x] || sol[y][x]) continue;
          const stack = [[x, y]], cells = [];
          seen[y][x] = true;
          while (stack.length) {
            const [cx, cy] = stack.pop();
            cells.push([cx, cy]);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx] && !sol[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([nx, ny]);
              }
            }
          }
          areas.push(cells);
        }
        areas.forEach(cells => {
          const [cx, cy] = cells[Math.floor(Math.random() * cells.length)];
          clues[cy][cx] = cells.length;
        });
        target = sol;
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Shade white areas to their exact sizes — no 2×2 blocks";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
      }

      function validate() {
        // no 2x2 shaded
        for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
          if (shaded[y][x] && shaded[y][x + 1] && shaded[y + 1][x] && shaded[y + 1][x + 1]) return "no 2×2 shaded blocks";
        }
        // white areas match clues
        const seen = Array.from({length: N}, () => Array(N).fill(false));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (seen[y][x] || shaded[y][x]) continue;
          const stack = [[x, y]], cells = [];
          seen[y][x] = true;
          while (stack.length) {
            const [cx, cy] = stack.pop();
            cells.push([cx, cy]);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[ny][nx] && !shaded[ny][nx]) {
                seen[ny][nx] = true;
                stack.push([nx, ny]);
              }
            }
          }
          const clueCell = cells.find(([cx, cy]) => clues[cy][cx] !== null);
          if (!clueCell) return "a white area has no size clue";
          if (clues[clueCell[1]][clueCell[0]] !== cells.length) return `clue ${clues[clueCell[1]][clueCell[0]]} area is size ${cells.length}`;
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
            Storage.setBest("chocobanana", best);
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
        root.querySelector("#cb-solved").textContent = solvedCount;
        root.querySelector("#cb-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 36px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "cb-cell" + (shaded[y][x] ? " cb-shaded" : "");
          c.style.background = "var(--bg-soft,#334155)";
          c.textContent = clues[y][x] !== null ? clues[y][x] : "";
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#cb-check").addEventListener("click", check);
      root.querySelector("#cb-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#cb-new").addEventListener("click", generate);

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
      App.showModal("How to play Choco Banana",
        `Shade cells so that:
        <br>• every <b>white (unshaded) area</b> contains exactly one <b>number</b>, and that number equals the area's cell count;
        <br>• <b>no 2×2 block</b> of shaded cells exists anywhere.
        <br><br>Shaded areas may be any shape (polyominoes) — they just can't be chunky enough to contain a 2×2.
        Click cells to toggle, <b>Check</b> to verify.`);
    },
  });
})();
