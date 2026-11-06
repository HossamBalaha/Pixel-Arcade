/* Asteroids — rotate ship, thrust, fire bullets, asteroids split when hit. Canvas-based. */
(function () {
  const W = 400, H = 400;
  GameRegistry.register({
    id: "asteroids",
    name: "Asteroids",
    icon: "🚀",
    category: "arcade",
    description: "Shoot asteroids; they split when hit",
    tags: ["arcade", "shooter", "canvas"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let ship, bullets, asteroids, score, lives, over, raf;
      let keys = {};
      const best = Storage.getBest("asteroids") || 0;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="as-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="as-lives">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="as-best">${best}</div></div>
        </div>
        <div class="status info" id="as-status">← → rotate, ↑ thrust, Space to fire</div>
        <div class="center"><canvas id="as-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div>
        <p class="hint">Big asteroids split into 2 medium; medium into 2 small. Clear them all for the next wave.</p>
      `;
      const canvas = root.querySelector("#as-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#as-status");

      function spawnAsteroid(size, x, y) {
        if (x == null) {
          x = Math.random() * W;
          y = Math.random() * H;
        }
        const ang = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 0.8;
        return {x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: size * 10 + 10, size};
      }

      function reset() {
        ship = {x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, r: 8, cooldown: 0};
        bullets = [];
        asteroids = [];
        for (let i = 0; i < 4; i++) asteroids.push(spawnAsteroid(3));
        score = 0;
        lives = 3;
        over = false;
        statusEl.textContent = "← → rotate, ↑ thrust, Space to fire";
        statusEl.className = "status info";
      }

      function fire() {
        if (over || ship.cooldown > 0) return;
        bullets.push({
          x: ship.x,
          y: ship.y,
          vx: ship.vx + Math.cos(ship.angle) * 5,
          vy: ship.vy + Math.sin(ship.angle) * 5,
          life: 60
        });
        ship.cooldown = 10;
        AudioFX.click();
      }

      function update() {
        if (over) return;
        if (keys["ArrowLeft"] || keys["a"]) ship.angle -= 0.08;
        if (keys["ArrowRight"] || keys["d"]) ship.angle += 0.08;
        if (keys["ArrowUp"] || keys["w"]) {
          ship.vx += Math.cos(ship.angle) * 0.15;
          ship.vy += Math.sin(ship.angle) * 0.15;
        }
        ship.vx *= 0.99;
        ship.vy *= 0.99;
        ship.x += ship.vx;
        ship.y += ship.vy;
        ship.x = (ship.x + W) % W;
        ship.y = (ship.y + H) % H;
        if (ship.cooldown > 0) ship.cooldown--;
        for (const b of bullets) {
          b.x += b.vx;
          b.y += b.vy;
          b.life--;
          b.x = (b.x + W) % W;
          b.y = (b.y + H) % H;
        }
        bullets = bullets.filter(b => b.life > 0);
        for (const a of asteroids) {
          a.x += a.vx;
          a.y += a.vy;
          a.x = (a.x + W) % W;
          a.y = (a.y + H) % H;
        }
        // bullet collisions
        for (let i = bullets.length - 1; i >= 0; i--) {
          for (let j = asteroids.length - 1; j >= 0; j--) {
            const a = asteroids[j], b = bullets[i];
            if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) {
              bullets.splice(i, 1);
              asteroids.splice(j, 1);
              score += (4 - a.size) * 10;
              AudioFX.pop();
              if (a.size > 1) {
                asteroids.push(spawnAsteroid(a.size - 1, a.x, a.y));
                asteroids.push(spawnAsteroid(a.size - 1, a.x, a.y));
              }
              break;
            }
          }
        }
        // ship collision
        for (const a of asteroids) {
          if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + ship.r) {
            lives--;
            AudioFX.lose();
            ship.x = W / 2;
            ship.y = H / 2;
            ship.vx = 0;
            ship.vy = 0;
            if (lives <= 0) {
              over = true;
              statusEl.textContent = `Game over! Score: ${score}.`;
              statusEl.className = "status lose";
              if (score > best) {
                Storage.setBest("asteroids", score);
                root.querySelector("#as-best").textContent = score;
                App.toast("New best: " + score, "success");
              }
            }
            break;
          }
        }
        // wave clear
        if (asteroids.length === 0 && !over) {
          for (let i = 0; i < 5; i++) asteroids.push(spawnAsteroid(3));
          AudioFX.win();
        }
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // asteroids
        ctx.strokeStyle = s.getPropertyValue("--text-muted");
        ctx.lineWidth = 2;
        for (const a of asteroids) {
          ctx.beginPath();
          ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
          ctx.stroke();
        }
        // bullets
        ctx.fillStyle = s.getPropertyValue("--accent-2");
        for (const b of bullets) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        // ship
        ctx.strokeStyle = s.getPropertyValue("--accent");
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ship.x + Math.cos(ship.angle) * 12, ship.y + Math.sin(ship.angle) * 12);
        ctx.lineTo(ship.x + Math.cos(ship.angle + 2.5) * 8, ship.y + Math.sin(ship.angle + 2.5) * 8);
        ctx.lineTo(ship.x + Math.cos(ship.angle - 2.5) * 8, ship.y + Math.sin(ship.angle - 2.5) * 8);
        ctx.closePath();
        ctx.stroke();
        root.querySelector("#as-score").textContent = score;
        root.querySelector("#as-lives").textContent = lives;
      }

      function loop() {
        if (!alive) return;
        update();
        render();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        keys[e.key] = true;
        if (e.key === " ") {
          e.preventDefault();
          fire();
        }
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      }

      function onKeyUp(e) {
        keys[e.key] = false;
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("click", fire);
      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Asteroids",
        `Pilot your ship through a field of asteroids.
        <br><br><b>←/→</b> or <b>A/D</b> to rotate. <b>↑</b> or <b>W</b> to thrust. <b>Space</b> or click to fire.
        <br><br>Big asteroids split into medium, medium into small. Clear the screen to spawn a new wave. Don't get hit!`);
    },
  });
})();
