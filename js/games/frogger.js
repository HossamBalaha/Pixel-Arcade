/* Frogger — simplified. Hop the frog across the road & river to the goal. */
(function () {
  const COLS = 9, ROWS = 7;
  const CELL = 36;

  let live = null;
  GameRegistry.register({
    id: "frogger",
    name: "Frogger",
    icon: "🐸",
    category: "arcade",
    description: "Hop across the road and river to the goal",
    tags: ["arcade", "classic", "keyboard"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let frog = {x: 4, y: 6}, cars = [], logs = [], score = 0, over = false, won = false, raf = null;
      let lastTime = 0, tickAcc = 0;
      const TICK_MS = 200;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fg-score">0</div></div>
          <div class="score-cell"><div class="label">Crossings</div><div class="val" id="fg-cross">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fg-best">0</div></div>
        </div>
        <div class="status info" id="fg-status">Use arrow keys to hop. Avoid cars; ride logs across the river.</div>
        <div class="center" style="margin:14px 0;"><canvas id="fg-canvas" width="${COLS * CELL}" height="${ROWS * CELL}" class="game-canvas"></canvas></div>
        <p class="hint"><b>Arrow keys</b> to hop. Reach the top row to score. Get hit by a car or fall in the water = game over.</p>
      `;
      const canvas = root.querySelector("#fg-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#fg-status");

      function reset() {
        frog = {x: 4, y: 6};
        score = 0;
        over = false;
        won = false;
        root.querySelector("#fg-score").textContent = 0;
        root.querySelector("#fg-cross").textContent = 0;
        const best = Storage.getBest("frogger") || 0;
        root.querySelector("#fg-best").textContent = best;
        // Cars on rows 4, 5 (road)
        cars = [
          {y: 4, x: 0, dir: 1, speed: 1},
          {y: 4, x: 4, dir: 1, speed: 1},
          {y: 5, x: 2, dir: -1, speed: 1},
          {y: 5, x: 6, dir: -1, speed: 1},
        ];
        // Logs on rows 1, 2 (river); safe cells are 0 (goal), 3 (median), 6 (start)
        logs = [
          {y: 1, x: 0, dir: 1, speed: 1, len: 3},
          {y: 1, x: 5, dir: 1, speed: 1, len: 2},
          {y: 2, x: 1, dir: -1, speed: 1, len: 3},
          {y: 2, x: 6, dir: -1, speed: 1, len: 2},
        ];
      }

      function rowType(y) {
        if (y === 0) return "goal";
        if (y === 1 || y === 2) return "river";
        if (y === 3) return "median";
        if (y === 4 || y === 5) return "road";
        return "start";
      }

      function tick() {
        if (over) return;
        // Move cars
        cars.forEach(c => {
          c.x += c.dir * c.speed;
          if (c.x > COLS + 1) c.x = -2;
          if (c.x < -2) c.x = COLS + 1;
        });
        // Move logs
        logs.forEach(l => {
          l.x += l.dir * l.speed;
          if (l.x > COLS + 1) l.x = -l.len - 1;
          if (l.x < -l.len - 1) l.x = COLS + 1;
        });
        // Carry frog if on a log
        if (rowType(frog.y) === "river") {
          const log = logs.find(l => l.y === frog.y && frog.x >= l.x && frog.x < l.x + l.len);
          if (log) {
            frog.x += log.dir * log.speed;
            if (frog.x < 0 || frog.x >= COLS) {
              die("Frog drifted off the river!");
              return;
            }
          } else {
            die("Frog fell in the water!");
            return;
          }
        }
        // Check car collision
        if (rowType(frog.y) === "road") {
          const hit = cars.find(c => c.y === frog.y && Math.abs(c.x - frog.x) < 1);
          if (hit) {
            die("Frog got hit by a car!");
            return;
          }
        }
      }

      function die(msg) {
        if (over) return;
        over = true;
        statusEl.textContent = `💀 ${msg} Score: ${score}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        Storage.submitScore("frogger", score, {});
        const best = Storage.getBest("frogger") || 0;
        if (score > best) {
          Storage.setBest("frogger", score);
          root.querySelector("#fg-best").textContent = score;
        }
      }

      function hop(dx, dy) {
        if (over) return;
        const nx = frog.x + dx, ny = frog.y + dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
        frog.x = nx;
        frog.y = ny;
        AudioFX.tick();
        if (ny === 0) {
          // Reached goal
          score += 50;
          const cross = parseInt(root.querySelector("#fg-cross").textContent, 10) + 1;
          root.querySelector("#fg-cross").textContent = cross;
          root.querySelector("#fg-score").textContent = score;
          AudioFX.win();
          statusEl.textContent = `🎉 Crossed! +50 pts. Total: ${score}`;
          statusEl.className = "status win";
          frog = {x: 4, y: 6}; // back to start
        } else {
          statusEl.textContent = rowType(ny) === "river" ? "On a log!" : rowType(ny) === "road" ? "Watch for cars!" : "";
          statusEl.className = "status info";
        }
      }

      function onKey(e) {
        if (over) {
          if (e.key === "r" || e.key === "R" || e.key === "Enter") reset();
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          hop(0, -1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          hop(0, 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          hop(-1, 0);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          hop(1, 0);
        } else if (e.key === "r" || e.key === "R") {
          e.preventDefault();
          reset();
        }
      }

      document.addEventListener("keydown", onKey);

      function render() {
        const s = getComputedStyle(document.documentElement);
        // Rows
        for (let y = 0; y < ROWS; y++) {
          const rt = rowType(y);
          ctx.fillStyle = rt === "goal" ? "#9cffi9".replace("ff", "cc") : rt === "river" ? "#1e40af" : rt === "median" ? "#84cc16" : rt === "road" ? "#374151" : "#22c55e";
          if (rt === "goal") ctx.fillStyle = "#15803d";
          ctx.fillRect(0, y * CELL, canvas.width, CELL);
        }
        // Logs
        logs.forEach(l => {
          ctx.fillStyle = "#92400e";
          for (let i = 0; i < l.len; i++) {
            const x = (l.x + i) * CELL;
            if (x >= -CELL && x < canvas.width) {
              ctx.fillRect(x + 2, l.y * CELL + 4, CELL - 4, CELL - 8);
            }
          }
        });
        // Cars
        cars.forEach(c => {
          ctx.fillStyle = c.dir > 0 ? "#dc2626" : "#f59e0b";
          ctx.fillRect(c.x * CELL + 2, c.y * CELL + 4, CELL - 4, CELL - 8);
        });
        // Frog
        if (!over || !won) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(frog.x * CELL + CELL / 2, frog.y * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(frog.x * CELL + CELL / 2 - 5, frog.y * CELL + CELL / 2 - 4, 3, 0, Math.PI * 2);
          ctx.arc(frog.x * CELL + CELL / 2 + 5, frog.y * CELL + CELL / 2 - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function loop(t) {
        if (!alive) return;
        if (!lastTime) lastTime = t;
        const dt = t - lastTime;
        lastTime = t;
        tickAcc += dt;
        if (tickAcc >= TICK_MS) {
          tickAcc = 0;
          tick();
        }
        render();
        raf = requestAnimationFrame(loop);
      }

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Frogger",
        `Hop the frog from the bottom to the top.
        <br><br>• <b>Arrow keys</b> to hop one cell in each direction.
        <br>• <b>Road rows</b>: avoid getting hit by cars.
        <br>• <b>River rows</b>: ride on logs (or you fall in the water and die).
        <br>• Reach the top row (<b>goal</b>) to score +50 and respawn at the start.
        <br>• <b>R</b> restarts the game.`);
    },
  });
})();
