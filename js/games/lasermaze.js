/* Laser Maze — rotate the mirrors and light every target */
(function () {
  GameRegistry.register({
    id: "lasermaze",
    name: "Laser Maze",
    icon: "🔦",
    category: "logic",
    description: "Rotate the mirrors and light every target",
    tags: ["logic", "light", "puzzle"],
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
      let grid, lit, solvedCount, best;

      // cell types: {type: 'mirror', dir: 0..3} mirror '/' or '\' depending on dir%2
      // laser enters from left of row 'laserRow'
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="lm-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lm-best">0</div></div>
        </div>
        <div class="status info" id="lm-status">Click mirrors to rotate — light up every target 🔶</div>
        <div class="center"><canvas id="lm-canvas" width="328" height="328"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="lm-new">🆕 New puzzle</button>
        </div>
        <p class="hint">The beam starts at ⚡ and travels straight. Mirrors bounce it 90°. Walls ⬛ stop it.</p>
      `;

      const canvas = root.querySelector("#lm-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#lm-status");
      best = Storage.getBest("lasermaze") || 0;
      solvedCount = 0;
      const CELL = 41;

      function generate() {
        grid = Array.from({length: N}, () => Array(N).fill(null));
        // laser row + start
        const laserRow = 2 + Math.floor(Math.random() * (N - 4));
        // walls
        const walls = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < walls; i++) {
          grid[Math.floor(Math.random() * N)][Math.floor(Math.random() * N)] = {type: "wall"};
        }
        // targets: 4
        const targets = [];
        let guard = 0;
        while (targets.length < 4 && guard++ < 100) {
          const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
          if (grid[y][x] || targets.some(t => t.x === x && t.y === y)) continue;
          if (y === laserRow && x === 0) continue;
          grid[y][x] = {type: "target"};
          targets.push({x, y});
        }
        // mirrors: 5-6
        const mirrors = [];
        guard = 0;
        while (mirrors.length < 6 && guard++ < 100) {
          const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
          if (grid[y][x] || (y === laserRow && x === 0)) continue;
          grid[y][x] = {type: "mirror", dir: Math.floor(Math.random() * 4)};
          mirrors.push({x, y});
        }
        laser = {row: laserRow};
        lit = new Set();
        trace();
        render();
        statusEl.textContent = "Click mirrors to rotate — light up every target 🔶";
        statusEl.className = "status info";
      }

      let laser = {row: 2};

      function trace() {
        // simulate beam from (0, laser.row) heading right; returns path cells + lit targets
        const path = [];
        lit = new Set();
        let x = 0, y = laser.row, dx = 1, dy = 0;
        let guard = 0;
        while (guard++ < 300) {
          if (x < 0 || y < 0 || x >= N || y >= N) break;
          path.push([x, y, dx, dy]);
          const c = grid[y][x];
          if (c && c.type === "wall") {
            path.pop();
            break;
          }
          if (c && c.type === "target") lit.add(x + "," + y);
          if (c && c.type === "mirror") {
            const slash = c.dir % 2 === 0; // '/' like
            if (slash) {
              const t = dx;
              dx = -dy;
              dy = -t;
            } else {
              const t = dx;
              dx = dy;
              dy = t;
            }
          }
          x += dx;
          y += dy;
        }
        return path;
      }

      function click(x, y) {
        const c = grid[y][x];
        if (!c || c.type !== "mirror") return;
        c.dir = (c.dir + 1) % 4;
        AudioFX.click();
        const path = trace();
        render(path);
        if (lit.size >= 4) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("lasermaze", best);
          }
          statusEl.textContent = "💡 All targets lit! New maze incoming…";
          statusEl.className = "status win";
          after(generate, 1400);
        } else {
          statusEl.textContent = `Targets lit: ${lit.size}/4`;
          statusEl.className = "status info";
        }
      }

      function render(path) {
        root.querySelector("#lm-solved").textContent = solvedCount;
        root.querySelector("#lm-best").textContent = best;
        path = path || trace();
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 328, 328);
        // grid
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)";
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
        // beam path glow
        ctx.strokeStyle = "rgba(248,113,113,0.25)";
        ctx.lineWidth = 9;
        drawPath(path);
        ctx.strokeStyle = "#f87171";
        ctx.lineWidth = 3;
        drawPath(path);
        // cells
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = grid[y][x];
          if (!c) continue;
          const cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
          if (c.type === "wall") {
            ctx.fillStyle = "#334155";
            ctx.beginPath();
            ctx.roundRect(x * CELL + 5, y * CELL + 5, CELL - 10, CELL - 10, 4);
            ctx.fill();
          } else if (c.type === "target") {
            const on = lit.has(x + "," + y);
            ctx.fillStyle = on ? "#fbbf24" : "#78350f";
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
            if (on) {
              ctx.fillStyle = "rgba(251,191,36,0.35)";
              ctx.beginPath();
              ctx.arc(cx, cy, 15 + Math.sin(Date.now() / 200) * 2, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (c.type === "mirror") {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(c.dir * Math.PI / 2);
            ctx.strokeStyle = "#94a3b8";
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(-12, 12);
            ctx.lineTo(12, -12);
            ctx.stroke();
            ctx.strokeStyle = "rgba(148,163,184,0.4)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-12, 12);
            ctx.lineTo(12, -12);
            ctx.stroke();
            ctx.restore();
          }
        }
        // laser emitter on the left of laser row
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(2, laser.row * CELL + CELL / 2 - 9);
        ctx.lineTo(14, laser.row * CELL + CELL / 2);
        ctx.lineTo(2, laser.row * CELL + CELL / 2 + 9);
        ctx.closePath();
        ctx.fill();
        ctx.font = "13px sans-serif";
        ctx.fillStyle = "#22c55e";
      }

      function drawPath(path) {
        if (path.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(path[0][0] * CELL + CELL / 2, path[0][1] * CELL + CELL / 2);
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i][0] * CELL + CELL / 2, path[i][1] * CELL + CELL / 2);
        }
        ctx.stroke();
      }

      canvas.addEventListener("pointerdown", (e) => {
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (328 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (328 / r.height)) / CELL);
        if (x >= 0 && y >= 0 && x < N && y < N) click(x, y);
      });
      root.querySelector("#lm-new").addEventListener("click", generate);

      generate();
      // gentle pulse animation for lit targets
      const raf = setInterval(() => {
        const path = trace();
        render(path);
      }, 300);
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        clearInterval(raf);
      };
    },
    help: function () {
      App.showModal("How to play Laser Maze",
        `A laser beam enters from the green emitter ⚡ on the left edge and travels straight.
        <br><br>• <b>Click a mirror</b> to rotate it 45° — the beam bounces off mirrors at right angles.
        <br>• <b>Walls</b> stop the beam dead.
        <br>• Light up <b>all four targets 🔶</b> to win.
        <br>The beam updates live as you rotate — find the arrangement that catches every target.`);
    },
  });
})();
