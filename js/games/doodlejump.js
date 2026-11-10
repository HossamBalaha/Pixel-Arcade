/* Doodle Jump — bounce up platforms endlessly, avoid falling. */
(function () {
  let live = null;
  GameRegistry.register({
    id: "doodlejump",
    name: "Doodle Jump",
    icon: "🦘",
    category: "arcade",
    description: "Bounce up endless platforms — don't fall off the bottom!",
    tags: ["arcade", "endless", "platformer"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const W = 320, H = 480;
      let player = {x: W / 2, y: H - 80, vx: 0, vy: 0, r: 14};
      let platforms = [], score = 0, rafId = null, over = false, keys = {};
      const GRAV = 0.35, JUMP_V = -10, MOVE = 0.5, MAX_VX = 4;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="dj-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="dj-best">—</div></div>
        </div>
        <div class="status info" id="dj-status">Use ← → (or A/D) to move. Land on platforms to bounce up!</div>
        <div class="center"><canvas class="game-canvas" id="dj-canvas" width="${W}" height="${H}" style="border-radius:var(--radius);background:var(--bg-soft);"></canvas></div>
        <p class="hint">Auto-bounce when you land on a platform. Don't fall off the bottom!</p>
      `;
      const canvas = root.querySelector("#dj-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#dj-status");
      root.querySelector("#dj-best").textContent = Storage.getBest("doodlejump") ?? "—";

      function init() {
        player = {x: W / 2, y: H - 80, vx: 0, vy: JUMP_V, r: 14};
        platforms = [];
        score = 0;
        over = false;
        // Initial platform floor
        platforms.push({x: W / 2 - 30, y: H - 30, w: 60, h: 8});
        // Generate platforms going up
        for (let i = 0; i < 12; i++) {
          platforms.push({x: Math.random() * (W - 60), y: H - 80 - i * 70, w: 60, h: 8});
        }
        root.querySelector("#dj-score").textContent = 0;
        statusEl.textContent = "Use ← → (or A/D) to move. Land on platforms!";
        statusEl.className = "status info";
        if (!rafId) loop();
      }

      function loop() {
        if (!alive) return;
        if (!over) {
          // Horizontal movement
          if (keys["ArrowLeft"] || keys["a"] || keys["A"]) player.vx -= MOVE;
          if (keys["ArrowRight"] || keys["d"] || keys["D"]) player.vx += MOVE;
          player.vx = Math.max(-MAX_VX, Math.min(MAX_VX, player.vx));
          player.vx *= 0.92;
          player.x += player.vx;
          // Wrap horizontally
          if (player.x < -player.r) player.x = W + player.r;
          if (player.x > W + player.r) player.x = -player.r;
          // Gravity
          player.vy += GRAV;
          player.y += player.vy;
          // Check platform collisions (only when falling)
          if (player.vy > 0) {
            for (const p of platforms) {
              if (player.x + player.r > p.x && player.x - player.r < p.x + p.w &&
                player.y + player.r > p.y && player.y + player.r < p.y + p.h + 10) {
                player.vy = JUMP_V;
                AudioFX.pop();
                break;
              }
            }
          }
          // Camera follows: when player above midpoint, shift everything down
          if (player.y < H / 2) {
            const shift = H / 2 - player.y;
            player.y = H / 2;
            for (const p of platforms) p.y += shift;
            score += Math.floor(shift / 10);
            root.querySelector("#dj-score").textContent = score;
            // Add new platforms at top
            while (platforms.length && platforms[platforms.length - 1].y > -50) {
              platforms.push({
                x: Math.random() * (W - 60),
                y: platforms[platforms.length - 1].y - (50 + Math.random() * 40),
                w: 60,
                h: 8
              });
            }
            // Remove platforms that fell off bottom
            platforms = platforms.filter(p => p.y < H + 20);
          }
          // Game over if fall below
          if (player.y > H + 30) {
            over = true;
            AudioFX.lose();
            statusEl.textContent = `💀 You fell! Final score: ${score}`;
            statusEl.className = "status lose";
            const best = Storage.getBest("doodlejump");
            if (!best || score > best) {
              Storage.setBest("doodlejump", score);
              root.querySelector("#dj-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
          }
        }
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function draw() {
        const styles = getComputedStyle(document.documentElement);
        const accent2 = styles.getPropertyValue("--accent-2").trim();
        ctx.clearRect(0, 0, W, H);
        // Background pattern
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        for (let i = 0; i < 6; i++) ctx.fillRect(0, (i * 80 + (Date.now() / 50) % 80) - 80, W, 2);
        // Platforms
        for (const p of platforms) {
          ctx.fillStyle = accent2;
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
        }
        // Player — fixed classic yellow, always distinct from the pink platforms
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fill();
        // Eyes
        ctx.fillStyle = "#fff";
        ctx.fillRect(player.x - 6, player.y - 5, 4, 4);
        ctx.fillRect(player.x + 2, player.y - 5, 4, 4);
        ctx.fillStyle = "#000";
        ctx.fillRect(player.x - 5, player.y - 4, 2, 2);
        ctx.fillRect(player.x + 3, player.y - 4, 2, 2);
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

      function onKey(e) {
        keys[e.key] = e.type === "keydown";
        if (e.key === "r" || e.key === "R") init();
        if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) e.preventDefault();
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKey);
      // Touch / tilt
      let touchX = null;
      canvas.addEventListener("touchstart", e => {
        touchX = e.touches[0].clientX;
      }, {passive: true});
      canvas.addEventListener("touchmove", e => {
        if (touchX === null) return;
        const dx = e.touches[0].clientX - touchX;
        player.vx += dx * 0.05;
        touchX = e.touches[0].clientX;
      }, {passive: true});
      canvas.addEventListener("touchend", () => {
        touchX = null;
      });
      live = {};
      init();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKey);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      };
    },
    help: function () {
      App.showModal("How to play Doodle Jump",
        `Bounce endlessly upward by landing on platforms!
        <br><br>Controls: <b>← →</b> or <b>A/D</b> to move (or swipe on touch). The screen wraps horizontally — fall off the left edge and you appear on the right.
        <br><br>Auto-bounce when you land on a platform. Don't fall off the bottom of the screen!
        <br>Score increases the higher you climb.`);
    },
  });
})();
