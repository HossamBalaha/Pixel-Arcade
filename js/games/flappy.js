/* Flappy Bird — tap/click/space to flap; avoid pipes. Canvas-based. */
(function () {
  const W = 320, H = 400;
  const GRAVITY = 0.4, FLAP = -6.5, PIPE_W = 50, GAP = 110, PIPE_SPEED = 2;
  GameRegistry.register({
    id: "flappy",
    name: "Flappy Bird",
    icon: "🐤",
    category: "arcade",
    description: "Tap to flap; avoid the pipes",
    tags: ["arcade", "reflex", "canvas"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let bird, pipes, score, over, started, raf;
      const best = Storage.getBest("flappy") || 0;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fp-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fp-best">${best}</div></div>
        </div>
        <div class="status info" id="fp-status">Tap, click, or press Space to flap</div>
        <div class="center"><canvas id="fp-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div>
        <p class="hint">Avoid the pipes. Each pipe cleared = 1 point.</p>
      `;
      const canvas = root.querySelector("#fp-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#fp-status");

      function reset() {
        bird = {x: 80, y: H / 2, vy: 0, r: 12};
        pipes = [];
        score = 0;
        over = false;
        started = false;
        statusEl.textContent = "Tap, click, or press Space to flap";
        statusEl.className = "status info";
      }

      function flap() {
        if (over) {
          reset();
          return;
        }
        if (!started) started = true;
        bird.vy = FLAP;
        AudioFX.pop();
      }

      function update() {
        if (!started || over) return;
        bird.vy += GRAVITY;
        bird.y += bird.vy;
        // spawn pipes
        if (pipes.length === 0 || pipes[pipes.length - 1].x < W - 160) {
          const gapY = 80 + Math.random() * (H - 160 - GAP);
          pipes.push({x: W, gapY});
        }
        for (const p of pipes) p.x -= PIPE_SPEED;
        pipes = pipes.filter(p => p.x + PIPE_W > 0);
        // score
        for (const p of pipes) {
          if (!p.scored && p.x + PIPE_W < bird.x) {
            p.scored = true;
            score++;
            AudioFX.tick();
          }
        }
        // collision
        if (bird.y + bird.r > H || bird.y - bird.r < 0) {
          endGame();
          return;
        }
        for (const p of pipes) {
          if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W) {
            if (bird.y - bird.r < p.gapY || bird.y + bird.r > p.gapY + GAP) {
              endGame();
              return;
            }
          }
        }
      }

      function endGame() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Game over! Score: ${score}. Tap to restart.`;
        statusEl.className = "status lose";
        if (score > best) {
          Storage.setBest("flappy", score);
          root.querySelector("#fp-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // pipes
        ctx.fillStyle = s.getPropertyValue("--accent-2");
        for (const p of pipes) {
          ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
          ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H - p.gapY - GAP);
        }
        // bird
        ctx.fillStyle = s.getPropertyValue("--accent");
        ctx.beginPath();
        ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(bird.x + 4, bird.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(bird.x + 5, bird.y - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        // score
        ctx.fillStyle = s.getPropertyValue("--text");
        ctx.font = "bold 28px var(--font-mono, monospace)";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText(score, W / 2, 50);
        root.querySelector("#fp-score").textContent = score;
      }

      function loop() {
        if (!alive) return;
        update();
        render();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        if (e.key === " " || e.key === "ArrowUp") {
          e.preventDefault();
          flap();
        }
      }

      document.addEventListener("keydown", onKey);
      canvas.addEventListener("click", flap);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        flap();
      });
      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Flappy Bird",
        `Tap (or click, or press <b>Space</b>/<b>↑</b>) to flap upward. Gravity pulls you down.
        <br><br>Fly through the gaps between pipes. Each pipe you pass scores 1 point. Don't hit the pipes or the ground.`);
    },
  });
})();
