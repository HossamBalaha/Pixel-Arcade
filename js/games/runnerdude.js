/* Endless Runner — jump the boxes, duck the bars */
(function () {
  GameRegistry.register({
    id: "runnerdude",
    name: "Endless Runner",
    icon: "🏃",
    category: "arcade",
    description: "Jump the boxes, duck the bars — how far can you go?",
    tags: ["arcade", "runner", "endless"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 380, H = 240;
      let runner, obstacles, coins, dist, speed, score, best, over, raf;
      const groundY = H - 40;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="rd-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="rd-best">0</div></div>
        </div>
        <div class="status info" id="rd-status">↑ / Space jump · ↓ duck — time everything</div>
        <div class="center"><canvas id="rd-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Low bars must be ducked, high boxes jumped. Coins give bonus points.</p>
      `;

      const canvas = root.querySelector("#rd-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#rd-status");
      best = Storage.getBest("runnerdude") || 0;

      function reset() {
        runner = {y: groundY, vy: 0, duck: false, onGround: true};
        obstacles = [];
        coins = [];
        dist = 0;
        speed = 4;
        score = 0;
        over = false;
        statusEl.textContent = "↑ / Space jump · ↓ duck — time everything";
        statusEl.className = "status info";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#rd-score").textContent = score;
        root.querySelector("#rd-best").textContent = best;
      }

      function spawn() {
        const frontier = obstacles.length ? Math.max(...obstacles.map(o => o.x)) : 0;
        const coinF = coins.length ? coins[coins.length - 1].x : 0;
        const worldX = Math.max(frontier, coinF, dist * 10 + 500);
        if (Math.random() < 0.75) {
          obstacles.push({x: worldX + Math.random() * 150, type: Math.random() < 0.5 ? "box" : "bar"});
        } else {
          coins.push({x: worldX + 60, y: groundY - 50 - Math.random() * 45, got: false});
        }
      }

      function jump() {
        if (over) {
          reset();
          return;
        }
        if (runner.onGround) {
          runner.vy = -9.2;
          runner.onGround = false;
          AudioFX.pop();
        }
      }

      function tick() {
        if (!over) {
          dist += speed * 0.1;
          speed = 4 + dist / 300;
          score = Math.floor(dist);
          runner.vy += 0.46;
          runner.y += runner.vy;
          if (runner.y >= groundY) {
            runner.y = groundY;
            runner.vy = 0;
            runner.onGround = true;
          }
          while (obstacles.length < 3 || coins.length < 2) spawn();
          const camX = dist * 10;
          obstacles = obstacles.filter(o => o.x - camX > -60);
          coins = coins.filter(c => c.x - camX > -30 && !c.got);
          // collisions
          const rx = 70, rw = 26, rh = runner.duck ? 18 : 36;
          for (const o of obstacles) {
            const sx = o.x - camX;
            if (o.type === "box") {
              if (sx < rx + rw && sx + 26 > rx && runner.y > groundY - 30) return die("Tripped on a box!");
            } else { // low bar — must duck
              if (sx < rx + rw && sx + 34 > rx && runner.y - rh > groundY - 46 && runner.y > groundY - 46) {
                // bar occupies groundY-46 .. groundY-16 zone
                if (runner.y - (runner.duck ? 14 : 30) > groundY - 46 || runner.y === groundY) {
                  if (runner.y >= groundY - 2) {
                    if (!runner.duck) return die("Clotheslined by the bar!");
                  } else if (runner.y > groundY - 40) return die("Clotheslined by the bar!");
                }
              }
            }
          }
          for (const c of coins) {
            const sx = c.x - camX;
            if (!c.got && Math.abs(sx - rx) < 22 && Math.abs(c.y - (runner.y - 16)) < 26) {
              c.got = true;
              score += 20;
              dist += 2;
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
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("runnerdude", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        // fixed night-city scene — never follows the theme, so every element below
        // can use fixed colors that are guaranteed to contrast
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, W, H);
        // parallax city
        ctx.fillStyle = "rgba(120,120,150,0.16)";
        const camX = dist * 10;
        for (let i = 0; i < 10; i++) {
          const bx = ((i * 90 - camX * 0.25) % (W + 90) + W + 90) % (W + 90) - 45;
          ctx.fillRect(bx, groundY - 90, 55, 90);
        }
        // ground
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(W, groundY);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        for (let i = 0; i < 12; i++) {
          const lx = ((i * 44 - camX * 1.2) % (W + 44) + W + 44) % (W + 44) - 22;
          ctx.beginPath();
          ctx.moveTo(lx, groundY + 14);
          ctx.lineTo(lx + 22, groundY + 14);
          ctx.stroke();
        }
        // obstacles
        for (const o of obstacles) {
          const sx = o.x - camX;
          if (o.type === "box") {
            ctx.fillStyle = "#f59e0b";
            ctx.fillRect(sx, groundY - 28, 26, 28);
            ctx.strokeStyle = "#78350f";
            ctx.strokeRect(sx, groundY - 28, 26, 28);
          } else {
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(sx, groundY - 46, 34, 7);
            ctx.fillStyle = "#b91c1c";
            ctx.fillRect(sx + 14, groundY - 46, 5, 46);
          }
        }
        // coins
        ctx.fillStyle = "#fbbf24";
        for (const c of coins) {
          ctx.beginPath();
          ctx.arc(c.x - camX, c.y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        // runner — fixed amber so it pops on both the night sky and the slate road
        const rh = runner.duck && runner.onGround ? 20 : 38;
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath();
        ctx.roundRect(70 - 12, runner.y - rh, 24, rh, 5);
        ctx.fill();
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.arc(70 + 2, runner.y - rh + 7, 5, 0, Math.PI * 2);
        ctx.fill();
        // legs animation
        if (runner.onGround) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          const ph = Math.sin(dist * 2.4) * 6;
          ctx.beginPath();
          ctx.moveTo(70 - 4, runner.y - 4);
          ctx.lineTo(70 - 8 + ph, runner.y + 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(70 + 2, runner.y - 4);
          ctx.lineTo(70 + 6 - ph, runner.y + 2);
          ctx.stroke();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Wiped out!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 24);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowup" || k === " " || k === "w") {
          e.preventDefault();
          jump();
        }
        if (k === "arrowdown" || k === "s") runner.duck = true;
        if (k === "r" && over) reset();
      };
      const onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowdown" || k === "s") runner.duck = false;
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      // touch: lower half duck, upper jump
      canvas.addEventListener("pointerdown", (e) => {
        const r = canvas.getBoundingClientRect();
        const y = (e.clientY - r.top) * (H / r.height);
        if (y > H / 2) runner.duck = true; else jump();
      });
      canvas.addEventListener("pointerup", () => runner.duck = false);

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
      };
    },
    help: function () {
      App.showModal("How to play Endless Runner",
        `<b>↑</b> / <b>Space</b> / tap the upper half to jump; <b>↓</b> / hold the lower half to <b>duck</b>.
        <br><br>🟫 Boxes are low — jump them. 🔴 Red bars hang at head height — <b>duck under</b> them.
        🟡 Coins are +20 bonus. The city scrolls faster and faster. One hit ends the run.`);
    },
  });
})();
