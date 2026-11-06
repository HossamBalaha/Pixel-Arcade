/* Color Switch — tap to jump through matching color obstacles. */
(function () {
  let live = null;
  GameRegistry.register({
    id: "colorswitch",
    name: "Color Switch",
    icon: "🌈",
    category: "arcade",
    description: "Tap to jump — pass through obstacles of matching color, avoid mismatches",
    tags: ["arcade", "tap", "color", "reflex"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const W = 320, H = 480, BALL_R = 10;
      const COLORS = ["#ef4444", "#eab308", "#22c55e", "#06b6d4"];
      let ball = {y: H - 60, vy: 0, color: 0};
      let obstacles = [], score = 0, rafId = null, over = false, spawnY = -100, gravity = 0.4, jump = -7;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="cs-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cs-best">—</div></div>
        </div>
        <div class="status info" id="cs-status">Tap / click / Space to jump. Match the color to pass!</div>
        <div class="center"><canvas class="game-canvas" id="cs-canvas" width="${W}" height="${H}" style="border-radius:var(--radius);background:#1a1a2e;"></canvas></div>
        <p class="hint">Ball changes color at each star. Pass only through the matching color gap.</p>
      `;
      const canvas = root.querySelector("#cs-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#cs-status");
      root.querySelector("#cs-best").textContent = Storage.getBest("colorswitch") ?? "—";

      function spawnObstacle(y) {
        const colors = COLORS.slice().sort(() => Math.random() - 0.5);
        // 4 quadrant obstacle with one gap per color
        obstacles.push({y, colors, passed: false});
      }

      function spawnStar(y) {
        obstacles.push({y, isStar: true, color: Math.floor(Math.random() * 4)});
      }

      function init() {
        ball = {y: H - 60, vy: 0, color: 0};
        obstacles = [];
        score = 0;
        over = false;
        spawnY = -100;
        root.querySelector("#cs-score").textContent = 0;
        statusEl.textContent = "Tap / click / Space to jump. Match the color to pass!";
        statusEl.className = "status info";
        // Pre-spawn obstacles going up
        for (let i = 0; i < 5; i++) {
          spawnY = H - 150 - i * 130;
          if (i % 2 === 0) spawnObstacle(spawnY);
          else spawnStar(spawnY);
        }
        if (!rafId) loop();
      }

      function loop() {
        if (!alive) return;
        if (!over) {
          ball.vy += gravity;
          ball.y += ball.vy;
          // Scroll obstacles down (visualizing the ball going up)
          for (const o of obstacles) o.y += 2;
          // Remove off-screen
          obstacles = obstacles.filter(o => o.y < H + 100);
          // Spawn new above
          if (obstacles.length === 0 || obstacles[obstacles.length - 1].y > 100) {
            const y = obstacles.length ? obstacles[obstacles.length - 1].y - 130 : -100;
            if (Math.random() < 0.5) spawnObstacle(y);
            else spawnStar(y);
          }
          // Check collisions
          for (const o of obstacles) {
            if (o.isStar) {
              if (Math.abs(o.y - ball.y) < 25 && o.color !== ball.color) {
                ball.color = o.color;
                o.color = -1; // mark consumed
                AudioFX.flip();
              }
            } else {
              if (!o.passed && Math.abs(o.y - ball.y) < 20) {
                // Check which quadrant ball is in (left, top, right, bottom)
                const cx = W / 2;
                const dx = cx - W / 2;
                // Simplified: ball x is at center W/2
                // Quadrant based on angular position around obstacle center
                const ox = W / 2, oy = o.y;
                const bx = W / 2, by = ball.y;
                const angle = Math.atan2(by - oy, bx - ox); // -PI..PI
                let quad = Math.floor(((angle + Math.PI) / (Math.PI / 2))) % 4;
                if (quad < 0) quad += 4;
                if (o.colors[quad] !== ball.color) {
                  gameOver();
                  return;
                }
                o.passed = true;
                score++;
                AudioFX.pop();
                root.querySelector("#cs-score").textContent = score;
              }
            }
          }
          // Fall off bottom
          if (ball.y > H + 30) {
            gameOver();
            return;
          }
        }
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function draw() {
        ctx.clearRect(0, 0, W, H);
        // Background
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, W, H);
        // Obstacles & stars
        for (const o of obstacles) {
          if (o.isStar) {
            if (o.color >= 0) {
              ctx.fillStyle = COLORS[o.color];
              ctx.font = "28px sans-serif";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText("★", W / 2, o.y);
            }
          } else {
            const cx = W / 2, cy = o.y, r = 50;
            // 4 arc quadrants
            for (let i = 0; i < 4; i++) {
              ctx.fillStyle = o.colors[i];
              ctx.beginPath();
              ctx.moveTo(cx, cy);
              ctx.arc(cx, cy, r, -Math.PI + i * Math.PI / 2, -Math.PI + (i + 1) * Math.PI / 2);
              ctx.closePath();
              ctx.fill();
            }
            // Inner gap circle
            ctx.fillStyle = "#1a1a2e";
            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // Ball
        ctx.fillStyle = COLORS[ball.color];
        ctx.beginPath();
        ctx.arc(W / 2, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", W / 2, H / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 18);
        }
      }

      function gameOver() {
        if (over) return;
        over = true;
        AudioFX.lose();
        statusEl.textContent = `💀 Game over! Score: ${score}`;
        statusEl.className = "status lose";
        const best = Storage.getBest("colorswitch");
        if (!best || score > best) {
          Storage.setBest("colorswitch", score);
          root.querySelector("#cs-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
      }

      function jumpBall() {
        if (over) return;
        ball.vy = jump;
        AudioFX.tick();
      }

      function onKey(e) {
        if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") {
          e.preventDefault();
          jumpBall();
        } else if (e.key === "r" || e.key === "R") init();
      }

      document.addEventListener("keydown", onKey);
      canvas.addEventListener("click", jumpBall);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        jumpBall();
      }, {passive: false});
      live = {};
      init();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      };
    },
    help: function () {
      App.showModal("How to play Color Switch",
        `Tap (or Space / click) to make the ball jump upward. Gravity pulls it back down.
        <br><br>The ball has a color. Pass through the matching color quadrant of each obstacle — touching a non-matching color = game over.
        <br><br>Catch the <b>★ stars</b> to change your ball's color. Score = obstacles passed.`);
    },
  });
})();
