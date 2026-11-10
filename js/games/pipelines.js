/* Pipe Connect — rotate the pipes to link the source to the sink */
(function () {
  let live = null;
  GameRegistry.register({
    id: "pipelines",
    name: "Pipe Connect",
    icon: "🚰",
    category: "logic",
    description: "Rotate the pipes to link the water source to the sink",
    tags: ["logic", "pipes", "puzzle"],
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
      let cells, start, end, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="pp-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pp-best">0</div></div>
        </div>
        <div class="status info" id="pp-status">Click tiles to rotate — connect 🚰 to 🚿</div>
        <div class="center"><div id="pp-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="pp-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Blue tiles carry water. Water flows from the source through connected pipes to the drain.</p>
      `;

      const gridEl = root.querySelector("#pp-grid");
      const statusEl = root.querySelector("#pp-status");
      best = Storage.getBest("pipelines") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #pp-grid { display:inline-grid; gap:3px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .pp-cell { width:44px; height:44px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; background:var(--bg-soft,#334155); border-radius:6px; user-select:none; }
        .pp-cell.on { background:#0e7490; }
      `;
      root.appendChild(style);

      // pipe piece: set of directions out of N,E,S,W (0..3)
      const PIECES = {
        straight: [[0, 2], [1, 3]], // NS or EW
        elbow: [[0, 1], [1, 2], [2, 3], [3, 0]],
        tee: [[0, 1, 2], [1, 2, 3], [2, 3, 0], [3, 0, 1]],
      };

      function generate() {
        // build a random path from start to end, then assign pipes along it + random decoys
        start = {x: 0, y: Math.floor(Math.random() * N)};
        end = {x: N - 1, y: Math.floor(Math.random() * N)};
        // random walk from start to end (monotone-ish with detours)
        const path = [];
        let x = start.x, y = start.y, guard = 0;
        path.push({x, y});
        while ((x !== end.x || y !== end.y) && guard++ < 200) {
          const opts = [];
          if (x < end.x) opts.push([1, 0]);
          if (y < end.y) opts.push([0, 1]);
          if (y > end.y) opts.push([0, -1]);
          if (Math.random() < 0.3) { // possible backtrack/detour
            if (x > 0) opts.push([-1, 0]);
            if (y < N - 1) opts.push([0, 1]);
            if (y > 0) opts.push([0, -1]);
          }
          const [dx, dy] = opts[Math.floor(Math.random() * opts.length)];
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          // avoid immediate revisit
          if (path.length > 1 && path[path.length - 2].x === nx && path[path.length - 2].y === ny) continue;
          x = nx;
          y = ny;
          path.push({x, y});
          if (x === end.x && y === end.y) break;
        }
        if (path.length < 4 || path.length > 30) return generate();
        // connections along path
        cells = Array.from({length: N}, () => Array(N).fill(null));
        for (let i = 0; i < path.length; i++) {
          const dirs = new Set();
          if (i > 0) dirs.add(dirBetween(path[i], path[i - 1]));
          if (i < path.length - 1) dirs.add(dirBetween(path[i], path[i + 1]));
          cells[path[i].y][path[i].x] = {dirs: [...dirs], kind: "path"};
        }
        // decoy pipes on empty cells
        for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
          if (cells[yy][xx]) continue;
          const pool = [...PIECES.straight, ...PIECES.elbow, ...PIECES.tee];
          const dirs = pool[Math.floor(Math.random() * pool.length)];
          cells[yy][xx] = {dirs, kind: "decoy"};
        }
        // random rotations (rotation = how many 90° turns applied)
        for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
          cells[yy][xx].rot = Math.floor(Math.random() * 4);
        }
        // start/end also get random rotation? No — endpoints fixed relative to path.
        // ensure start connects West (from outside) — its first connection is handled by path dirs.
        render();
        statusEl.textContent = "Click tiles to rotate — connect 🚰 to 🚿";
        statusEl.className = "status info";
      }

      function dirBetween(a, b) {
        if (b.x === a.x + 1) return 1; // E
        if (b.x === a.x - 1) return 3; // W
        if (b.y === a.y + 1) return 2; // S
        return 0; // N
      }

      function actualDirs(c) {
        return c.dirs.map(d => (d + c.rot) % 4);
      }

      function rotate(x, y) {
        cells[y][x].rot = (cells[y][x].rot + 1) % 4;
        AudioFX.click();
        render();
        checkWin();
      }

      function watered() {
        // BFS from start: water exits start toward its actual dirs; a pipe passes water if the neighbor's
        // actual dirs include the opposite direction
        const wet = new Set([start.x + "," + start.y]);
        const queue = [{x: start.x, y: start.y, from: 3}]; // entering start from West (outside)
        while (queue.length) {
          const {x, y, from} = queue.shift();
          const c = cells[y][x];
          const dirs = actualDirs(c);
          // water enters a pipe only if pipe has opening toward `from` (opposite)
          if (x !== start.x || y !== start.y) {
            if (!dirs.includes(from)) continue;
          }
          if (x === end.x && y === end.y) {
            if (dirs.includes(1)) wet.add("END"); // exits east
            continue;
          }
          for (const d of dirs) {
            const nx = x + [0, 1, 0, -1][d], ny = y + [-1, 0, 1, 0][d];
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            const k = nx + "," + ny;
            if (wet.has(k)) continue;
            wet.add(k);
            queue.push({x: nx, y: ny, from: (d + 2) % 4});
          }
        }
        return wet;
      }

      function checkWin() {
        const wet = watered();
        if (wet.has("END")) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("pipelines", best);
          }
          statusEl.textContent = "🚰💦🚿 Water flows! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1500);
        } else {
          statusEl.textContent = "Not connected yet — keep rotating!";
          statusEl.className = "status info";
        }
      }

      function render() {
        root.querySelector("#pp-solved").textContent = solvedCount;
        root.querySelector("#pp-best").textContent = best;
        const wet = watered();
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 44px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          const isWet = wet.has(x + "," + y);
          c.className = "pp-cell" + (isWet ? " on" : "");
          const dirs = actualDirs(cells[y][x]);
          // draw with SVG
          const cx = 22, cy = 22;
          let svg = `<svg width="44" height="44" viewBox="0 0 44 44">`;
          svg += `<circle cx="22" cy="22" r="5" fill="${isWet ? "#38bdf8" : "#64748b"}"/>`;
          for (const d of dirs) {
            const ex = 22 + [0, 20, 0, -20][d], ey = 22 + [-20, 0, 20, 0][d];
            svg += `<line x1="22" y1="22" x2="${ex}" y2="${ey}" stroke="${isWet ? "#38bdf8" : "#94a3b8"}" stroke-width="8" stroke-linecap="round"/>`;
          }
          svg += `</svg>`;
          c.innerHTML = svg;
          if (x === start.x && y === start.y) {
            c.innerHTML = `<span style="font-size:22px;position:relative;z-index:2;">🚰</span>` + svg.replace("<svg", `<svg style="position:absolute;opacity:.35"`);
            c.style.position = "relative";
          }
          if (x === end.x && y === end.y) {
            c.innerHTML = `<span style="font-size:22px;position:relative;z-index:2;">🚿</span>` + svg.replace("<svg", `<svg style="position:absolute;opacity:.35"`);
            c.style.position = "relative";
          }
          c.addEventListener("pointerdown", () => rotate(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#pp-new").addEventListener("click", generate);

      live = {
        hint: function () {
          // a "path" tile is correctly rotated when its openings match the generated layout
          const wrong = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            const c = cells[y][x];
            if (c.kind !== "path") continue;
            const have = new Set(actualDirs(c));
            if (have.size !== c.dirs.length || !c.dirs.every(d => have.has(d))) wrong.push([x, y]);
          }
          if (!wrong.length) {
            App.toast("All water-carrying pipes are already aligned 💧", "info");
            return;
          }
          const pick = wrong[Math.floor(Math.random() * wrong.length)];
          cells[pick[1]][pick[0]].rot = 0;
          AudioFX.reveal();
          render();
          checkWin();
          App.toast(`💡 Hint: snapped the pipe at column ${pick[0] + 1}, row ${pick[1] + 1} into place`, "info");
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
      App.showModal("How to play Pipe Connect",
        `Click a tile to <b>rotate</b> its pipe 90°. Build an unbroken water path from the <b>🚰 source</b> (left edge)
        to the <b>🚿 drain</b> (right edge).
        <br><br>Water only flows through openings that actually meet — a pipe is not connected just because it's adjacent.
        Filled <b>blue</b> tiles carry water, grey ones are dry. Some pipes are decoys — ignore or use them.`);
    },
  });
})();
