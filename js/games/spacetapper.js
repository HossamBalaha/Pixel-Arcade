/* Space Tapper — tap to shoot incoming space invaders. Survival timer. */
(function () {
  let live = null;
  GameRegistry.register({
    id: "spacetapper",
    name: "Space Tapper",
    icon: "🚀",
    category: "arcade",
    description: "Tap incoming invaders to blast them — survive as long as possible",
    tags: ["arcade", "shooter", "survival"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const W = 360, H = 440;
      let invaders = [], lasers = [], explosions = [];
      let score = 0, lives = 3, over = false, rafId = null, spawnTimer = null, spawnRate = 1200, timeLeft = 60,
        gameTimer = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="st-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="st-lives">3</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="st-time">60</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="st-best">—</div></div>
        </div>
        <div class="status info" id="st-status">Tap invaders to blast them. Survive 60 seconds!</div>
        <div class="center"><canvas class="game-canvas" id="st-canvas" width="${W}" height="${H}" style="border-radius:var(--radius);background:#0f0e17;"></canvas></div>
        <p class="hint>If an invader reaches your base, you lose a life. 3 lives = game over.</p>
      `;
      const canvas = root.querySelector("#st-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#st-status");
      root.querySelector("#st-best").textContent = Storage.getBest("spacetapper") ?? "—";

      function spawn() {
        if (over || !alive) return;
        const type = Math.random() < 0.7 ? "grunt" : "fast";
        invaders.push({
          x: 30 + Math.random() * (W - 60),
          y: -20,
          vx: (Math.random() - 0.5) * 1.5,
          vy: type === "fast" ? 1.4 : 0.8,
          type,
          hp: type === "fast" ? 1 : 1,
          emoji: type === "fast" ? "👾" : "👽",
        });
        spawnTimer = setTimeout(spawn, spawnRate);
      }

      function draw() {
        const styles = getComputedStyle(document.documentElement);
        const accent = styles.getPropertyValue("--accent").trim();
        const text = styles.getPropertyValue("--text").trim();
        ctx.clearRect(0, 0, W, H);
        // Stars
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        for (let i = 0; i < 30; i++) {
          const sx = (i * 37) % W;
          const sy = (i * 91 + Date.now() / 30) % H;
          ctx.fillRect(sx, sy, 1, 1);
        }
        // Base
        ctx.fillStyle = accent;
        ctx.fillRect(W / 2 - 20, H - 18, 40, 12);
        ctx.fillRect(W / 2 - 4, H - 26, 8, 10);
        // Invaders
        ctx.font = "26px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const inv of invaders) ctx.fillText(inv.emoji, inv.x, inv.y);
        // Lasers
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        for (const l of lasers) {
          ctx.beginPath();
          ctx.moveTo(l.x, l.y);
          ctx.lineTo(l.x, l.y - 12);
          ctx.stroke();
        }
        // Explosions
        for (const e of explosions) {
          ctx.fillStyle = `rgba(255,200,0,${1 - e.t / 20})`;
          ctx.beginPath();
          ctx.arc(e.x, e.y, 4 + e.t, 0, Math.PI * 2);
          ctx.fill();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = text;
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", W / 2, H / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 18);
        }
      }

      function loop() {
        if (!alive) return;
        if (!over) {
          // Move invaders
          for (const inv of invaders) {
            inv.x += inv.vx;
            inv.y += inv.vy;
            if (inv.x < 20 || inv.x > W - 20) inv.vx *= -1;
          }
          // Move lasers
          for (const l of lasers) l.y -= 8;
          lasers = lasers.filter(l => l.y > -20);
          // Check laser hits
          for (let i = invaders.length - 1; i >= 0; i--) {
            const inv = invaders[i];
            for (let j = lasers.length - 1; j >= 0; j--) {
              const l = lasers[j];
              if (Math.abs(inv.x - l.x) < 18 && Math.abs(inv.y - l.y) < 14) {
                explosions.push({x: inv.x, y: inv.y, t: 0});
                invaders.splice(i, 1);
                lasers.splice(j, 1);
                score += inv.type === "fast" ? 15 : 10;
                AudioFX.pop();
                root.querySelector("#st-score").textContent = score;
                break;
              }
            }
          }
          // Invaders reaching base
          for (let i = invaders.length - 1; i >= 0; i--) {
            if (invaders[i].y > H - 26) {
              lives--;
              AudioFX.error();
              root.querySelector("#st-lives").textContent = lives;
              invaders.splice(i, 1);
              if (lives <= 0) {
                gameOver();
                return;
              }
            }
          }
          // Update explosions
          for (const e of explosions) e.t++;
          explosions = explosions.filter(e => e.t < 20);
        }
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function fire(x, y) {
        if (over) return;
        lasers.push({x: W / 2, y: H - 30});
        // Auto-target nearest invader to x,y
        let nearest = null, nearestD = Infinity;
        for (const inv of invaders) {
          const d = Math.abs(inv.x - x) + Math.abs(inv.y - y);
          if (d < nearestD) {
            nearestD = d;
            nearest = inv;
          }
        }
        if (nearest && nearestD < 60) {
          // Snap laser to target column for guaranteed hit feel
          lasers[lasers.length - 1].x = nearest.x;
        }
        AudioFX.tick();
      }

      function onPointer(e) {
        if (over) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const y = (e.clientY - rect.top) * (H / rect.height);
        // Direct hit if click on invader
        for (let i = invaders.length - 1; i >= 0; i--) {
          const inv = invaders[i];
          if (Math.abs(inv.x - x) < 20 && Math.abs(inv.y - y) < 20) {
            explosions.push({x: inv.x, y: inv.y, t: 0});
            invaders.splice(i, 1);
            score += inv.type === "fast" ? 15 : 10;
            AudioFX.pop();
            root.querySelector("#st-score").textContent = score;
            return;
          }
        }
        fire(x, y);
      }

      canvas.addEventListener("click", onPointer);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        const t = e.touches[0];
        onPointer({clientX: t.clientX, clientY: t.clientY});
      }, {passive: false});

      function gameOver() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `💀 Overrun! Final score: ${score}`;
        statusEl.className = "status lose";
        const best = Storage.getBest("spacetapper");
        if (!best || score > best) {
          Storage.setBest("spacetapper", score);
          root.querySelector("#st-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
      }

      function start() {
        score = 0;
        lives = 3;
        timeLeft = 60;
        over = false;
        invaders = [];
        lasers = [];
        explosions = [];
        spawnRate = 1200;
        root.querySelector("#st-score").textContent = 0;
        root.querySelector("#st-lives").textContent = 3;
        root.querySelector("#st-time").textContent = 60;
        statusEl.textContent = "Tap invaders to blast them! 60s survival.";
        statusEl.className = "status info";
        clearTimeout(spawnTimer);
        clearInterval(gameTimer);
        spawn();
        gameTimer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#st-time").textContent = timeLeft;
          if (timeLeft % 15 === 0 && timeLeft > 0) spawnRate = Math.max(450, spawnRate - 200);
          if (timeLeft <= 10) AudioFX.tick();
          if (timeLeft <= 0) {
            over = true;
            clearInterval(gameTimer);
            clearTimeout(spawnTimer);
            statusEl.textContent = `🏆 Survived! Score: ${score}`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("spacetapper");
            if (!best || score > best) {
              Storage.setBest("spacetapper", score);
              root.querySelector("#st-best").textContent = score;
              App.toast("Survived! Score: " + score, "success");
            }
          }
        }, 1000);
        if (!rafId) loop();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") start();
      }

      document.addEventListener("keydown", onKey);
      live = {};
      start();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        clearTimeout(spawnTimer);
        clearInterval(gameTimer);
      };
    },
    help: function () {
      App.showModal("How to play Space Tapper",
        `Invaders 👽 and 👾 fall from the top of the screen toward your base.
        <br><br><b>Click or tap an invader</b> directly to blast it. Tapping empty space fires a laser toward the nearest invader.
        <br><br>Fast 👾 invaders = 15 pts, slow 👽 invaders = 10 pts. If an invader reaches your base, you lose a life.
        <br><br>Survive 60 seconds — but lose all 3 lives and you're done!`);
    },
  });
})();
