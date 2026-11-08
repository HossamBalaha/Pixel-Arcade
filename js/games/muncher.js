/* Maze Muncher — eat every dot before the chasers corner you */
(function () {
  GameRegistry.register({
    id: "muncher",
    name: "Maze Muncher",
    icon: "😋",
    category: "arcade",
    description: "Eat every dot before the chasers corner you",
    tags: ["arcade", "maze", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      const COLS = 15, ROWS = 15, CELL = 24;
      const W = COLS * CELL, H = ROWS * CELL;
      // hand-made symmetric maze (1 = wall)
      const MAZE = [
        "111111111111111",
        "100000000000001",
        "101101111011101",
        "100000000000001",
        "101101111011101",
        "100000100000001",
        "111010101011101",
        "100000000000001",
        "101011101110001",
        "100010000010001",
        "101011111010101",
        "100000000000001",
        "101111011110101",
        "100000000000001",
        "111111111111111",
      ];
      let grid, dots, player, ghosts, dir, nextDir, score, lives, best, over, loop, fright;
      best = Storage.getBest("muncher") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="mu-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="mu-lives">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mu-best">0</div></div>
        </div>
        <div class="status info" id="mu-status">Arrow keys / WASD to move — eat all the dots</div>
        <div class="center"><canvas id="mu-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="dpad">
          <button class="up">↑</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
        <p class="hint">Golden dots turn the tables — chasers turn blue and edible for 6s (+50 each).</p>
      `;

      const canvas = root.querySelector("#mu-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#mu-status");
      const at = (x, y) => (x < 0 || y < 0 || x >= COLS || y >= ROWS) ? 1 : MAZE[y][x] === "1" ? 1 : 0;

      function reset(full) {
        if (full) {
          score = 0;
          lives = 3;
        }
        dots = new Set();
        fright = 0;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (MAZE[y][x] === "0" && !(x === 7 && y === 7)) dots.add(x + "," + y);
        }
        // golden dots at four corners of open space
        dots.delete("1,1");
        dots.delete("13,1");
        dots.delete("1,13");
        dots.delete("13,13");
        player = {x: 7, y: 11, fx: 7, fy: 11};
        dir = {x: 0, y: 0};
        nextDir = dir;
        ghosts = [
          {x: 7, y: 7, c: "#ef4444", vx: 1, vy: 0},
          {x: 6, y: 7, c: "#3b82f6", vx: -1, vy: 0},
          {x: 8, y: 7, c: "#f59e0b", vx: 0, vy: 1},
          {x: 7, y: 6, c: "#ec4899", vx: 0, vy: -1},
        ];
        over = false;
        clearInterval(loop);
        loop = setInterval(tick, 130);
        updateHud();
      }

      function updateHud() {
        root.querySelector("#mu-score").textContent = score;
        root.querySelector("#mu-lives").textContent = lives;
        root.querySelector("#mu-best").textContent = best;
      }

      function stepPlayer() {
        if (nextDir && !at(player.x + nextDir.x, player.y + nextDir.y)) dir = nextDir;
        if (!at(player.x + dir.x, player.y + dir.y)) {
          player.x += dir.x;
          player.y += dir.y;
        }
        const k = player.x + "," + player.y;
        if (dots.has(k)) {
          dots.delete(k);
          score += 10;
          AudioFX.pop();
          if (dots.size === 0) {
            clearInterval(loop);
            statusEl.textContent = `🎉 Maze cleared! Score ${score}`;
            statusEl.className = "status win";
            AudioFX.win();
            if (score > best) {
              best = score;
              Storage.setBest("muncher", score);
              App.toast("New best: " + best, "success");
            }
            over = true;
          }
        }
        // golden dot pickups
        for (const g of goldens) {
          if (player.x === g.x && player.y === g.y && !g.eaten) {
            g.eaten = true;
            fright = 46;
            score += 20;
            AudioFX.win();
          }
        }
        // ghost collisions
        for (const gh of ghosts) {
          if (player.x === gh.x && player.y === gh.y) {
            if (fright > 0) {
              gh.x = 7;
              gh.y = 7;
              score += 50;
              AudioFX.win();
            } else {
              lives--;
              AudioFX.lose();
              if (lives <= 0) {
                clearInterval(loop);
                over = true;
                statusEl.textContent = `Game over — score ${score}`;
                statusEl.className = "status lose";
                if (score > best) {
                  best = score;
                  Storage.setBest("muncher", score);
                }
              } else {
                player = {x: 7, y: 11};
                dir = {x: 0, y: 0};
                nextDir = dir;
              }
            }
          }
        }
        updateHud();
      }

      const goldens = [{x: 1, y: 1}, {x: 13, y: 1}, {x: 1, y: 13}, {x: 13, y: 13}].map(g => ({...g, eaten: false}));

      function stepGhost(g) {
        const opts = [];
        for (const d of [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]) {
          if (!at(g.x + d.x, g.y + d.y)) opts.push(d);
        }
        if (!opts.length) return;
        // when frightened: random; otherwise 60% chase player, 40% random
        let choice;
        if (fright > 0 || Math.random() < 0.4) choice = opts[Math.floor(Math.random() * opts.length)];
        else {
          opts.sort((a, b) =>
            Math.hypot(g.x + a.x - player.x, g.y + a.y - player.y) -
            Math.hypot(g.x + b.x - player.x, g.y + b.y - player.y));
          choice = opts[0];
        }
        g.x += choice.x;
        g.y += choice.y;
      }

      function tick() {
        if (over) return;
        stepPlayer();
        ghosts.forEach(stepGhost);
        if (fright > 0) fright--;
        render();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#111";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // walls
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (MAZE[y][x] === "1") {
            ctx.fillStyle = "#4338ca";
            ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
          }
        }
        // dots
        ctx.fillStyle = "#fcd34d";
        dots.forEach(k => {
          const [x, y] = k.split(",").map(Number);
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        // goldens
        for (const g of goldens) {
          if (g.eaten) continue;
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(g.x * CELL + CELL / 2, g.y * CELL + CELL / 2, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.beginPath();
          ctx.arc(g.x * CELL + CELL / 2 - 2, g.y * CELL + CELL / 2 - 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // player
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(player.x * CELL + CELL / 2, player.y * CELL + CELL / 2 - 1, CELL / 2 - 3, Math.PI, 0);
        ctx.lineTo(player.x * CELL + CELL / 2 + CELL / 2 - 3, player.y * CELL + CELL / 2 + 5);
        ctx.lineTo(player.x * CELL + CELL / 2 - CELL / 2 + 3, player.y * CELL + CELL / 2 + 5);
        ctx.closePath();
        ctx.fill();
        // ghosts
        ghosts.forEach(g => {
          ctx.fillStyle = fright > 0 ? "#64748b" : g.c;
          ctx.beginPath();
          ctx.arc(g.x * CELL + CELL / 2, g.y * CELL + CELL / 2 - 2, CELL / 2 - 3, Math.PI, 0);
          ctx.lineTo(g.x * CELL + CELL / 2 + CELL / 2 - 3, g.y * CELL + CELL / 2 + 5);
          for (let i = 0; i < 3; i++) {
            ctx.arc(g.x * CELL + CELL / 2 + CELL / 2 - 3 - (i + 0.5) * (CELL - 6) / 3, g.y * CELL + CELL / 2 + 5, (CELL - 6) / 6, 0, Math.PI);
          }
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(g.x * CELL + CELL / 2 - 6, g.y * CELL + CELL / 2 - 6, 4, 4);
          ctx.fillRect(g.x * CELL + CELL / 2 + 2, g.y * CELL + CELL / 2 - 6, 4, 4);
        });
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(dots.size === 0 ? "Maze Cleared!" : "Game Over", W / 2, H / 2);
          ctx.font = "13px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 24);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        const map = {
          arrowup: {x: 0, y: -1},
          w: {x: 0, y: -1},
          arrowdown: {x: 0, y: 1},
          s: {x: 0, y: 1},
          arrowleft: {x: -1, y: 0},
          a: {x: -1, y: 0},
          arrowright: {x: 1, y: 0},
          d: {x: 1, y: 0}
        };
        if (map[k]) {
          nextDir = map[k];
          e.preventDefault();
        }
        if (k === "r" && over) reset(true);
      };
      document.addEventListener("keydown", onKey);
      root.querySelectorAll(".dpad button").forEach(b => {
        b.addEventListener("click", () => {
          const m = {up: {x: 0, y: -1}, down: {x: 0, y: 1}, left: {x: -1, y: 0}, right: {x: 1, y: 0}};
          nextDir = m[b.className.replace(/^\s+|\s+$/g, "")] || nextDir;
        });
      });

      reset(true);
      return function cleanup() {
        clearInterval(loop);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Maze Muncher",
        `Guide the muncher through the maze and eat <b>every dot</b> to clear the level.
        <br><br>Four chasers roam the maze — they mostly hunt you (with some randomness so they can be outsmarted).
        <b>Golden dots</b> make them edible for 6 seconds (<b>+50</b> per ghost).
        You have 3 lives. Arrows / WASD or the D-pad.`);
    },
  });
})();
