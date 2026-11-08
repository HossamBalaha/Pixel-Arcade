/* Rush Hour — slide the cars to free the red one */
(function () {
  GameRegistry.register({
    id: "rushhour",
    name: "Rush Hour",
    icon: "🚗",
    category: "logic",
    description: "Slide the cars and trucks to free the red car",
    tags: ["logic", "sliding", "puzzle"],
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
      // cars: {x, y, len, horiz, color} — red car is id 0, exits on the right at row 'exitRow'
      const LEVELS = [
        {
          exit: 2, cars: [
            {x: 0, y: 2, len: 2, horiz: true, color: "#ef4444"},
            {x: 4, y: 0, len: 3, horiz: false, color: "#3b82f6"},
            {x: 0, y: 1, len: 2, horiz: false, color: "#f59e0b"},
            {x: 2, y: 4, len: 2, horiz: true, color: "#10b981"},
            {x: 5, y: 4, len: 3, horiz: false, color: "#a855f7"},
          ]
        },
        {
          exit: 2, cars: [
            {x: 1, y: 2, len: 2, horiz: true, color: "#ef4444"},
            {x: 1, y: 0, len: 2, horiz: false, color: "#3b82f6"},
            {x: 3, y: 1, len: 3, horiz: true, color: "#f59e0b"},
            {x: 2, y: 3, len: 3, horiz: false, color: "#10b981"},
            {x: 5, y: 0, len: 2, horiz: false, color: "#a855f7"},
            {x: 0, y: 4, len: 2, horiz: true, color: "#ec4899"},
            {x: 3, y: 5, len: 2, horiz: true, color: "#64748b"},
          ]
        },
        {
          exit: 3, cars: [
            {x: 0, y: 3, len: 2, horiz: true, color: "#ef4444"},
            {x: 3, y: 0, len: 3, horiz: false, color: "#3b82f6"},
            {x: 4, y: 1, len: 3, horiz: false, color: "#f59e0b"},
            {x: 0, y: 0, len: 2, horiz: true, color: "#10b981"},
            {x: 2, y: 2, len: 2, horiz: true, color: "#a855f7"},
            {x: 0, y: 5, len: 3, horiz: true, color: "#ec4899"},
            {x: 5, y: 3, len: 2, horiz: false, color: "#64748b"},
          ]
        },
        {
          exit: 2, cars: [
            {x: 2, y: 2, len: 2, horiz: true, color: "#ef4444"},
            {x: 0, y: 0, len: 2, horiz: false, color: "#3b82f6"},
            {x: 0, y: 2, len: 2, horiz: false, color: "#f59e0b"},
            {x: 1, y: 4, len: 3, horiz: true, color: "#10b981"},
            {x: 3, y: 0, len: 2, horiz: true, color: "#a855f7"},
            {x: 5, y: 1, len: 3, horiz: false, color: "#ec4899"},
            {x: 4, y: 4, len: 2, horiz: false, color: "#64748b"},
            {x: 1, y: 5, len: 2, horiz: true, color: "#0ea5e9"},
          ]
        },
        {
          exit: 4, cars: [
            {x: 1, y: 4, len: 2, horiz: true, color: "#ef4444"},
            {x: 3, y: 1, len: 3, horiz: false, color: "#3b82f6"},
            {x: 0, y: 0, len: 3, horiz: true, color: "#f59e0b"},
            {x: 5, y: 0, len: 3, horiz: false, color: "#10b981"},
            {x: 0, y: 3, len: 3, horiz: false, color: "#a855f7"},
            {x: 1, y: 3, len: 2, horiz: true, color: "#ec4899"},
            {x: 2, y: 0, len: 2, horiz: false, color: "#64748b"},
            {x: 4, y: 5, len: 2, horiz: true, color: "#0ea5e9"},
            {x: 4, y: 3, len: 2, horiz: false, color: "#84cc16"},
          ]
        },
        {
          exit: 2, cars: [
            {x: 0, y: 2, len: 2, horiz: true, color: "#ef4444"},
            {x: 1, y: 0, len: 2, horiz: true, color: "#3b82f6"},
            {x: 3, y: 0, len: 3, horiz: false, color: "#f59e0b"},
            {x: 4, y: 2, len: 2, horiz: false, color: "#10b981"},
            {x: 0, y: 3, len: 2, horiz: true, color: "#a855f7"},
            {x: 2, y: 4, len: 2, horiz: true, color: "#ec4899"},
            {x: 5, y: 1, len: 2, horiz: false, color: "#64748b"},
            {x: 0, y: 5, len: 2, horiz: true, color: "#0ea5e9"},
            {x: 5, y: 4, len: 2, horiz: false, color: "#84cc16"},
            {x: 3, y: 5, len: 3, horiz: true, color: "#f43f5e"},
          ]
        },
      ];
      let level, cars, moves, won, best, selected;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="rh-lvl">1/6</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="rh-moves">0</div></div>
          <div class="score-cell"><div class="label">Cleared</div><div class="val" id="rh-best">0</div></div>
        </div>
        <div class="status info" id="rh-status">Tap a vehicle, then tap where to slide it</div>
        <div class="center"><canvas id="rh-canvas" width="300" height="300"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="rh-prev">← Prev</button>
          <button class="btn btn-sm" id="rh-restart">↻ Restart</button>
          <button class="btn btn-sm" id="rh-next">Skip →</button>
        </div>
        <p class="hint">Goal: drive the <b style="color:#ef4444">red car</b> out through the notch on the right.</p>
      `;

      const canvas = root.querySelector("#rh-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#rh-status");
      best = Storage.getBest("rushhour") || 0;
      const CELL = 50;

      function load(i) {
        level = i;
        cars = LEVELS[i].cars.map(c => ({...c}));
        moves = 0;
        won = false;
        selected = null;
        statusEl.textContent = `Level ${i + 1} — free the red car`;
        statusEl.className = "status info";
        render();
      }

      function occupied(x, y, ignore) {
        for (let i = 0; i < cars.length; i++) {
          if (i === ignore) continue;
          const c = cars[i];
          for (let k = 0; k < c.len; k++) {
            const cx = c.x + (c.horiz ? k : 0), cy = c.y + (c.horiz ? 0 : k);
            if (cx === x && cy === y) return i;
          }
        }
        return -1;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won) return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (300 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (300 / r.height)) / CELL);
        const hit = occupied(x, y, -1);
        if (hit >= 0) {
          selected = hit;
          AudioFX.click();
          render();
          return;
        }
        if (selected === null) return;
        // try to slide selected car toward (x,y)
        const c = cars[selected];
        if (c.horiz && y === c.y) {
          const dir = x > c.x ? 1 : -1;
          slide(selected, dir);
        } else if (!c.horiz && x === c.x) {
          const dir = y > c.y ? 1 : -1;
          slide(selected, dir);
        }
      });

      function slide(idx, dir) {
        const c = cars[idx];
        const tries = 4;
        let moved = false;
        for (let s = 0; s < tries; s++) {
          const nx = c.x + (c.horiz ? dir : 0);
          const ny = c.y + (c.horiz ? 0 : dir);
          if (nx < 0 || ny < 0) break;
          if (c.horiz && nx + c.len > N) break;
          if (!c.horiz && ny + c.len > N) break;
          const head = c.horiz ? nx + c.len - 1 : nx;
          const headY = c.horiz ? ny : ny + c.len - 1;
          if (occupied(c.horiz ? (dir > 0 ? c.x + c.len : nx) : nx, c.horiz ? ny : (dir > 0 ? c.y + c.len : ny), idx) >= 0) break;
          c.x = nx;
          c.y = ny;
          moved = true;
        }
        if (moved) {
          moves++;
          AudioFX.pop();
          render();
          checkWin();
        }
      }

      function checkWin() {
        const red = cars[0];
        const exitY = LEVELS[level].exit;
        if (red.x + red.len >= N && red.y === exitY) {
          won = true;
          AudioFX.win();
          if (level + 1 > best) {
            best = level + 1;
            Storage.setBest("rushhour", best);
          }
          statusEl.textContent = `🚗💨 Escaped in ${moves} moves!`;
          statusEl.className = "status win";
          App.toast("Level " + (level + 1) + " solved!", "success");
          after(() => {
            if (level + 1 < LEVELS.length) load(level + 1);
          }, 900);
        }
      }

      function render() {
        root.querySelector("#rh-lvl").textContent = (level + 1) + "/" + LEVELS.length;
        root.querySelector("#rh-moves").textContent = moves;
        root.querySelector("#rh-best").textContent = best;
        const st = getComputedStyle(document.documentElement);
        ctx.fillStyle = "var(--bg-soft)";
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, 300, 300);
        // grid
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#1e293b" : "#243244";
          ctx.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, CELL - 4);
        }
        // exit notch
        const exitY = LEVELS[level].exit;
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(296, exitY * CELL + 8, 8, CELL - 16);
        ctx.fillStyle = "#22c55e";
        ctx.font = "bold 10px sans-serif";
        // cars
        cars.forEach((c, i) => {
          const w = (c.horiz ? c.len : 1) * CELL - 8;
          const h = (c.horiz ? 1 : c.len) * CELL - 8;
          const x = c.x * CELL + 4, y = c.y * CELL + 4;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 8);
          ctx.fill();
          if (i === selected) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 10);
            ctx.stroke();
          }
          // windows
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          if (c.horiz) ctx.fillRect(x + w * 0.28, y + 5, w * 0.18, h - 10);
          else ctx.fillRect(x + 5, y + h * 0.28, w - 10, h * 0.18);
          if (i === 0) { // red car gets a driver
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("🚗", x + w / 2, y + h / 2 + 6);
          }
        });
      }

      root.querySelector("#rh-prev").addEventListener("click", () => load(Math.max(0, level - 1)));
      root.querySelector("#rh-restart").addEventListener("click", () => load(level));
      root.querySelector("#rh-next").addEventListener("click", () => load(Math.min(LEVELS.length - 1, level + 1)));

      load(0);
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Rush Hour",
        `Tap a vehicle to select it (white outline), then tap any empty square <b>in its row or column</b> — it slides as far as it can toward that spot.
        <br><br>Vehicles never jump over each other; trucks (length 3) need serious shuffling.
        Goal: bring the <b style="color:#ef4444">red car</b> to the green <b>exit notch</b> on the right edge. Six levels, beginner to gridlock.`);
    },
  });
})();
