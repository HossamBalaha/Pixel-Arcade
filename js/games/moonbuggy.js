/* Moon Buggy — jump the craters and collect moon rocks */
(function () {
  GameRegistry.register({
    id: "moonbuggy",
    name: "Moon Buggy",
    icon: "🌙",
    category: "arcade",
    description: "Jump the craters and collect moon rocks",
    tags: ["arcade", "jumping", "space"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 380, H = 260;
      let buggy, obstacles, rocks, dist, speed, score, best, over, raf, groundY;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Distance</div><div class="val" id="mb-dist">0m</div></div>
          <div class="score-cell"><div class="label">Rocks</div><div class="val" id="mb-rocks">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mb-best">0m</div></div>
        </div>
        <div class="status info" id="mb-status">Space / tap to jump the craters 🕳️</div>
        <div class="center"><canvas id="mb-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Collect 🪨 moon rocks for +25. Speed climbs with distance — timing is everything.</p>
      `;

      const canvas = root.querySelector("#mb-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#mb-status");
      best = Storage.getBest("moonbuggy") || 0;
      groundY = H - 46;

      function reset() {
        buggy = {x: 60, y: groundY, vy: 0, onGround: true};
        obstacles = [];
        rocks = [];
        dist = 0;
        speed = 3;
        score = 0;
        over = false;
        updateHud();
        statusEl.textContent = "Space / tap to jump the craters 🕳️";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#mb-dist").textContent = Math.floor(dist) + "m";
        root.querySelector("#mb-rocks").textContent = score;
        root.querySelector("#mb-best").textContent = best + "m";
      }

      function spawn() {
        const last = obstacles.length ? obstacles[obstacles.length - 1].x : 0;
        const lastR = rocks.length ? rocks[rocks.length - 1].x : 0;
        const frontier = Math.max(last, lastR, dist + 400);
        if (Math.random() < 0.5) {
          obstacles.push({
            x: frontier + 80 + Math.random() * 220,
            w: 34 + Math.random() * 34,
            type: Math.random() < 0.7 ? "crater" : "rock"
          });
        } else {
          rocks.push({x: frontier + 80 + Math.random() * 220, y: groundY - 50 - Math.random() * 40, got: false});
        }
      }

      function jump() {
        if (over) {
          reset();
          return;
        }
        if (buggy.onGround) {
          buggy.vy = -8.6;
          buggy.onGround = false;
          AudioFX.pop();
        }
      }

      function tick() {
        if (!over) {
          dist += speed * 0.12;
          speed = 3 + dist / 400;
          // physics
          buggy.vy += 0.4;
          buggy.y += buggy.vy;
          if (buggy.y >= groundY) {
            buggy.y = groundY;
            buggy.vy = 0;
            buggy.onGround = true;
          }
          // scroll
          const camX = dist * 10;
          for (const o of obstacles) { /* stored in world x */
          }
          while (obstacles.length < 4 || rocks.length < 3) spawn();
          obstacles = obstacles.filter(o => o.x - camX > -80);
          rocks = rocks.filter(r => r.x - camX > -40 && !r.got);
          // collisions (buggy at x=60, ~40px wide, y=buggy.y)
          const bx = 60, bw = 46;
          for (const o of obstacles) {
            const sx = o.x - camX;
            if (o.type === "crater") {
              if (sx < bx + bw && sx + o.w > bx && buggy.y > groundY - 4) return die("Fell into a crater!");
            } else {
              if (sx < bx + bw && sx + 24 > bx && buggy.y > groundY - 26) return die("Smashed a rock!");
            }
          }
          for (const r of rocks) {
            const sx = r.x - camX;
            if (!r.got && Math.abs(sx - bx) < 26 && Math.abs(r.y - buggy.y) < 30) {
              r.got = true;
              score += 25;
              AudioFX.win();
              updateHud();
            }
          }
          updateHud();
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Distance: " + Math.floor(dist) + "m";
        statusEl.className = "status lose";
        if (Math.floor(dist) > best) {
          best = Math.floor(dist);
          Storage.setBest("moonbuggy", best);
          App.toast("New best: " + best + "m", "success");
        }
        updateHud();
      }

      function render() {
        // fixed lunar space — stars, ground and buggy use fixed colors
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        // stars
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < 26; i++) {
          const sx = (i * 137.5 - dist * 0.5) % W, sy = (i * 61) % (H - 80);
          ctx.fillRect(((sx % W) + W) % W, sy, 2, 2);
        }
        // earth
        ctx.fillStyle = "#1d4ed8";
        ctx.beginPath();
        ctx.arc(W - 60, 46, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(W - 64, 42, 7, 0, Math.PI * 2);
        ctx.fill();
        // ground
        const camX = dist * 10;
        ctx.fillStyle = "#64748b";
        ctx.fillRect(0, groundY + 14, W, H - groundY);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(0, groundY + 10, W, 8);
        // craters/rocks
        for (const o of obstacles) {
          const sx = o.x - camX;
          if (o.type === "crater") {
            ctx.fillStyle = "#0f172a";
            ctx.beginPath();
            ctx.ellipse(sx + o.w / 2, groundY + 14, o.w / 2, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#475569";
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            ctx.fillStyle = "#475569";
            ctx.beginPath();
            ctx.moveTo(sx, groundY + 12);
            ctx.lineTo(sx + 12, groundY - 18);
            ctx.lineTo(sx + 26, groundY + 12);
            ctx.closePath();
            ctx.fill();
          }
        }
        // rocks
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        for (const r of rocks) ctx.fillText("🪨", r.x - camX, r.y);
        // buggy — fixed white body so it reads on the gray moonscape
        ctx.save();
        ctx.translate(60, buggy.y - 8);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.roundRect(-22, -12, 44, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.roundRect(-10, -22, 20, 12, 4);
        ctx.fill();
        // wheels
        ctx.fillStyle = "#1e293b";
        const spin = dist * 4;
        for (const wx of [-13, 13]) {
          ctx.beginPath();
          ctx.arc(wx, 4, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#64748b";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wx, 4);
          ctx.lineTo(wx + Math.cos(spin) * 5, 4 + Math.sin(spin) * 5);
          ctx.stroke();
        }
        ctx.restore();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Crashed on the moon", W / 2, H / 2 - 6);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 20);
        }
      }

      const onKey = (e) => {
        if (e.key === " " || e.key === "ArrowUp") {
          e.preventDefault();
          jump();
        }
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", jump);

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        canvas.removeEventListener("pointerdown", jump);
      };
    },
    help: function () {
      App.showModal("How to play Moon Buggy",
        `Drive your lunar rover across the surface. <b>Space</b> / tap to <b>jump</b> —
        clear the craters 🕳️ and hop over boulders.
        <br><br>Collect 🪨 moon rocks for <b>+25</b> each. Distance is your score; the buggy accelerates the farther you go.
        One crash ends the run. <b>R</b> restarts.`);
    },
  });
})();
