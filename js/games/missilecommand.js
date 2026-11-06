/* Missile Command — click to fire missiles at incoming targets. Protect your cities. Canvas-based. */
(function () {
  const W = 400, H = 400;
  const CITIES = [80, 140, 200, 260, 320];
  GameRegistry.register({
    id: "missilecommand",
    name: "Missile Command",
    icon: "🚀",
    category: "arcade",
    description: "Fire missiles to intercept incoming threats. Protect your cities!",
    tags: ["arcade", "defense", "canvas"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let cities, missiles, enemies, explosions, score, wave, over, raf, spawnTimer, enemiesToSpawn;
      const best = Storage.getBest("missilecommand") || 0;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="mc-score">0</div></div>
          <div class="score-cell"><div class="label">Wave</div><div class="val" id="mc-wave">1</div></div>
          <div class="score-cell"><div class="label">Cities</div><div class="val" id="mc-cities">5</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mc-best">${best}</div></div>
        </div>
        <div class="status info" id="mc-status">Click anywhere to fire a missile at that spot.</div>
        <div class="center"><canvas id="mc-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div>
        <p class="hint">Your base is at the bottom center. Click to intercept incoming enemy missiles before they hit your cities.</p>
      `;
      const canvas = root.querySelector("#mc-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#mc-status");
      const BASE = {x: W / 2, y: H - 18};

      function reset() {
        cities = CITIES.map(x => ({x, alive: true}));
        missiles = [];
        enemies = [];
        explosions = [];
        score = 0;
        wave = 1;
        over = false;
        spawnTimer = 60;
        enemiesToSpawn = 5 + wave * 2; // enemies remaining to spawn this wave
        statusEl.textContent = "Click to fire missiles at incoming threats.";
        statusEl.className = "status info";
      }

      function fire(tx, ty) {
        if (over) return;
        const dx = tx - BASE.x, dy = ty - BASE.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 1) return;
        const speed = 5;
        missiles.push({x: BASE.x, y: BASE.y, tx, ty, vx: dx / dist * speed, vy: dy / dist * speed, life: 200});
        AudioFX.click();
      }

      function spawnEnemy() {
        const x = Math.random() * W;
        const tx = Math.random() * W;
        const speed = 0.5 + wave * 0.15;
        enemies.push({x, y: 0, vx: (tx - x) / H * speed * 1.5, vy: speed});
        enemiesToSpawn--;
      }

      function explode(x, y, radius, friendly) {
        explosions.push({x, y, r: 0, max: radius, life: 30, friendly});
        AudioFX.pop();
      }

      function update() {
        if (over) return;
        // Spawn enemies on a timer — but only while this wave still has
        // enemies remaining in its quota. Prevents the wave-clear condition
        // from firing on frame 1 before anything has spawned.
        if (enemiesToSpawn > 0) {
          spawnTimer--;
          if (spawnTimer <= 0) {
            spawnEnemy();
            spawnTimer = Math.max(20, 70 - wave * 3);
          }
        }
        // friendly missiles
        for (const m of missiles) {
          m.x += m.vx;
          m.y += m.vy;
          m.life--;
          if (Math.hypot(m.x - m.tx, m.y - m.ty) < 5 || m.life <= 0) {
            m.dead = true;
            explode(m.x, m.y, 30, true);
          }
        }
        missiles = missiles.filter(m => !m.dead);
        // enemy missiles
        for (const e of enemies) {
          e.x += e.vx;
          e.y += e.vy;
          if (e.y >= H - 18) {
            e.dead = true;
            explode(e.x, H - 18, 35, false);
            // city hit?
            for (const c of cities) {
              if (c.alive && Math.abs(c.x - e.x) < 20) {
                c.alive = false;
                AudioFX.lose();
              }
            }
          }
        }
        enemies = enemies.filter(e => !e.dead);
        // explosions grow & kill enemies
        for (const ex of explosions) {
          ex.r = (1 - ex.life / 30) * ex.max;
          ex.life--;
          // kill enemies within radius
          for (const e of enemies) {
            if (!e.dead && Math.hypot(e.x - ex.x, e.y - ex.y) < ex.r) {
              e.dead = true;
              score += 10;
              explode(e.x, e.y, 20, true);
            }
          }
        }
        explosions = explosions.filter(ex => ex.life > 0);
        // wave clear: only when the wave's full quota has been spawned AND
        // every enemy has been destroyed (or reached the ground).
        if (enemiesToSpawn === 0 && enemies.length === 0 && cities.some(c => c.alive)) {
          wave++;
          enemiesToSpawn = 5 + wave * 2;
          spawnTimer = 60;
          AudioFX.win();
          // bonus: revive a city every 3 waves
          if (wave % 3 === 0) {
            const dead = cities.filter(c => !c.alive);
            if (dead.length) dead[0].alive = true;
          }
          App.toast("Wave " + wave + " incoming!", "info");
        }
        // game over: no cities left
        if (cities.every(c => !c.alive)) {
          over = true;
          statusEl.textContent = `Game over! Score: ${score}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          if (score > best) {
            Storage.setBest("missilecommand", score);
            root.querySelector("#mc-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
        }
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // ground
        ctx.fillStyle = s.getPropertyValue("--border");
        ctx.fillRect(0, H - 18, W, 18);
        // cities
        ctx.fillStyle = s.getPropertyValue("--accent");
        for (const c of cities) {
          if (!c.alive) continue;
          ctx.fillRect(c.x - 12, H - 30, 24, 12);
        }
        // base
        ctx.fillStyle = s.getPropertyValue("--text");
        ctx.fillRect(BASE.x - 16, H - 30, 32, 12);
        // enemy missiles (trails)
        ctx.strokeStyle = s.getPropertyValue("--danger");
        ctx.lineWidth = 2;
        for (const e of enemies) {
          ctx.beginPath();
          ctx.moveTo(e.x - e.vx * 8, e.y - e.vy * 8);
          ctx.lineTo(e.x, e.y);
          ctx.stroke();
          ctx.fillStyle = s.getPropertyValue("--danger");
          ctx.beginPath();
          ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // friendly missiles
        ctx.strokeStyle = s.getPropertyValue("--accent-2");
        ctx.lineWidth = 2;
        for (const m of missiles) {
          ctx.beginPath();
          ctx.moveTo(BASE.x, BASE.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();
        }
        // explosions
        for (const ex of explosions) {
          ctx.fillStyle = ex.friendly ? "rgba(99,102,241,0.6)" : "rgba(239,68,68,0.6)";
          ctx.beginPath();
          ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2);
          ctx.fill();
        }
        // crosshair follows mouse
        ctx.strokeStyle = s.getPropertyValue("--text-muted");
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
        ctx.stroke();
        root.querySelector("#mc-score").textContent = score;
        root.querySelector("#mc-wave").textContent = wave;
        root.querySelector("#mc-cities").textContent = cities.filter(c => c.alive).length;
      }

      let mouseX = W / 2, mouseY = H / 2;

      function loop() {
        if (!alive) return;
        update();
        render();
        raf = requestAnimationFrame(loop);
      }

      canvas.addEventListener("mousemove", e => {
        const rect = canvas.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) * (W / rect.width);
        mouseY = (e.clientY - rect.top) * (H / rect.height);
      });
      canvas.addEventListener("click", e => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const y = (e.clientY - rect.top) * (H / rect.height);
        fire(x, y);
      });
      canvas.addEventListener("touchstart", e => {
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        fire((t.clientX - rect.left) * (W / rect.width), (t.clientY - rect.top) * (H / rect.height));
        e.preventDefault();
      });
      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Missile Command",
        `Enemy missiles fall from the sky toward your cities.
        <br><br>Click anywhere to launch an intercepting missile to that point — it explodes on arrival, destroying any enemy missiles within the blast.
        <br><br>Protect your 5 cities. Each wave gets faster and denser. Lose all cities = game over.`);
    },
  });
})();
