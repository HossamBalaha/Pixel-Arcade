/* Digger — tunnel through the dirt for gems, rocks fall, beware */
(function () {
  GameRegistry.register({
    id: "digger",
    name: "Digger",
    icon: "⛏️",
    category: "arcade",
    description: "Tunnel through the dirt for gems — rocks fall, beware",
    tags: ["arcade", "digging", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      const COLS = 20, ROWS = 13, CELL = 26;
      const W = COLS * CELL, H = ROWS * CELL;
      // cell types: 0 empty, 1 dirt, 2 rock, 3 gem, 4 wall(border)
      let grid, player, score, best, over, raf, falling, face;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="dg-score">0</div></div>
          <div class="score-cell"><div class="label">Gems left</div><div class="val" id="dg-gems">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="dg-best">0</div></div>
        </div>
        <div class="status info" id="dg-status">Arrows to dig — collect all gems, dodge falling rocks</div>
        <div class="center"><canvas id="dg-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="dpad">
          <button class="up">↑</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
        <p class="hint">Dig under a rock and step aside — it falls and can crush you (or block your tunnel).</p>
      `;

      const canvas = root.querySelector("#dg-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#dg-status");
      best = Storage.getBest("digger") || 0;

      function reset() {
        grid = [];
        for (let y = 0; y < ROWS; y++) {
          const row = [];
          for (let x = 0; x < COLS; x++) {
            if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) row.push(4);
            else if (y <= 1) row.push(0); // open sky row
            else row.push(1);
          }
          grid.push(row);
        }
        // scatter rocks + gems (not in sky, not adjacent to start)
        let gems = 0;
        while (gems < 14) {
          const x = 2 + Math.floor(Math.random() * (COLS - 4));
          const y = 3 + Math.floor(Math.random() * (ROWS - 5));
          if (grid[y][x] === 1) {
            grid[y][x] = 3;
            gems++;
          }
        }
        for (let i = 0; i < 12; i++) {
          const x = 2 + Math.floor(Math.random() * (COLS - 4));
          const y = 3 + Math.floor(Math.random() * (ROWS - 5));
          if (grid[y][x] === 1 && !(Math.abs(x - 2) < 3 && y < 6)) grid[y][x] = 2;
        }
        player = {x: 2, y: ROWS - 2};
        grid[player.y][player.x] = 0;
        falling = [];
        score = 0;
        over = false;
        face = "down";
        updateHud();
        statusEl.textContent = "Arrows to dig — collect all gems, dodge falling rocks";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#dg-score").textContent = score;
        let g = 0;
        grid.forEach(r => r.forEach(c => {
          if (c === 3) g++;
        }));
        root.querySelector("#dg-gems").textContent = g;
        root.querySelector("#dg-best").textContent = best;
      }

      function tryMove(dx, dy) {
        if (over) return;
        if (dx > 0) face = "right";
        if (dx < 0) face = "left";
        if (dy > 0) face = "down";
        if (dy < 0) face = "up";
        const nx = player.x + dx, ny = player.y + dy;
        const c = grid[ny] && grid[ny][nx];
        if (c === 4 || c === 2 || c === undefined) return; // wall / rock immovable
        if (c === 3) {
          score += 20;
          AudioFX.win();
        } else if (c === 1) AudioFX.click();
        player.x = nx;
        player.y = ny;
        grid[ny][nx] = 0;
        updateHud();
        let g = 0;
        grid.forEach(r => r.forEach(cc => {
          if (cc === 3) g++;
        }));
        if (g === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 All gems collected! Score ${score}`;
          statusEl.className = "status win";
          if (score > best) {
            best = score;
            Storage.setBest("digger", score);
            App.toast("New best: " + score, "success");
          }
        }
      }

      function physics() {
        // rocks fall if empty below; they also start falling if player dug under them (handled same way)
        for (let y = ROWS - 2; y >= 1; y--) {
          for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === 2 && grid[y + 1] && grid[y + 1][x] === 0) {
              // start falling
              grid[y][x] = 0;
              let ny = y + 1;
              while (ny + 1 < ROWS - 1 && grid[ny + 1][x] === 0) ny++;
              if (player.x === x && player.y === ny) {
                die("Crushed by a falling rock!");
                return;
              }
              grid[ny][x] = 2;
              AudioFX.click();
              // if rock lands on player position horizontally while falling beside? keep simple
            }
          }
        }
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + ` Final score ${score}`;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("digger", score);
        }
        updateHud();
      }

      let frame = 0;

      function tick() {
        frame++;
        if (!over && frame % 14 === 0) physics();
        render();
        raf = requestAnimationFrame(tick);
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const c = grid[y][x];
            if (c === 4) ctx.fillStyle = "#1f2937";
            else if (c === 0) ctx.fillStyle = y <= 1 ? "#0c4a6e" : "#292524";
            else if (c === 1) {
              ctx.fillStyle = "#78350f";
            } else if (c === 2) ctx.fillStyle = "#64748b";
            else ctx.fillStyle = "#082f49";
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
            if (c === 1) {
              ctx.fillStyle = "rgba(0,0,0,0.18)";
              ctx.fillRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8);
            } else if (c === 3) {
              ctx.fillStyle = "#e879f9";
              ctx.beginPath();
              ctx.moveTo(x * CELL + CELL / 2, y * CELL + 4);
              ctx.lineTo(x * CELL + CELL - 5, y * CELL + CELL / 2);
              ctx.lineTo(x * CELL + CELL / 2, y * CELL + CELL - 4);
              ctx.lineTo(x * CELL + 5, y * CELL + CELL / 2);
              ctx.closePath();
              ctx.fill();
              ctx.fillStyle = "rgba(255,255,255,0.6)";
              ctx.beginPath();
              ctx.arc(x * CELL + CELL / 2 - 3, y * CELL + CELL / 2 - 3, 2, 0, Math.PI * 2);
              ctx.fill();
            } else if (c === 2) {
              ctx.fillStyle = "#94a3b8";
              ctx.beginPath();
              ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = "rgba(255,255,255,0.35)";
              ctx.beginPath();
              ctx.arc(x * CELL + CELL / 2 - 4, y * CELL + CELL / 2 - 4, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        // player
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        const ex = {right: 4, left: -4, up: 0, down: 0}[face], ey = {right: 0, left: 0, up: -3, down: 2}[face];
        ctx.fillRect(player.x * CELL + CELL / 2 - 4 + ex, player.y * CELL + CELL / 2 - 4 + ey, 3, 3);
        ctx.fillRect(player.x * CELL + CELL / 2 + 1 + ex, player.y * CELL + CELL / 2 - 4 + ey, 3, 3);
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(grid.flat().includes(3) ? "Crushed!" : "All gems!", W / 2, H / 2);
          ctx.font = "13px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 24);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowup" || k === "w") tryMove(0, -1);
        if (k === "arrowdown" || k === "s") tryMove(0, 1);
        if (k === "arrowleft" || k === "a") tryMove(-1, 0);
        if (k === "arrowright" || k === "d") tryMove(1, 0);
        if (k === "r" && over) reset();
        if (k.startsWith("arrow")) e.preventDefault();
      };
      document.addEventListener("keydown", onKey);
      root.querySelectorAll(".dpad button").forEach(b => {
        const m = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
        b.addEventListener("click", () => {
          const [dx, dy] = m[b.className.trim()];
          tryMove(dx, dy);
        });
      });

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Digger",
        `Dig through the brown dirt with the arrow keys (or D-pad) to collect all the <b>pink gems</b> (+20 each).
        <br><br>Grey <b>rocks</b> can't be dug — but if you tunnel <b>under</b> one, it starts falling.
        A falling rock <b>crushes</b> you, so dig diagonally and keep moving. Falling rocks can also seal tunnels — plan your route!`);
    },
  });
})();
