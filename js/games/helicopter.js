/* Helicopter — hold mouse/space to ascend, release to fall. Avoid obstacles. Canvas-based. */
(function () {
  const W = 400, H = 300;
  GameRegistry.register({
    id: "helicopter",
    name: "Helicopter",
    icon: "🚁",
    category: "arcade",
    description: "Hold to ascend, release to fall. Avoid the obstacles!",
    tags: ["arcade", "reflex", "canvas"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let heli, obstacles, score, over, started, raf, holding = false, gapY;
      const best = Storage.getBest("helicopter") || 0;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hc-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hc-best">${best}</div></div>
        </div>
        <div class="status info" id="hc-status">Hold mouse or Space to ascend; release to descend.</div>
        <div class="center"><canvas id="hc-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div>
        <p class="hint">Avoid the top/bottom walls and the obstacle blocks. Survive as long as you can.</p>
      `;
      const canvas = root.querySelector("#hc-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hc-status");

      function reset() {
        heli = {x: 80, y: H / 2, vy: 0, r: 10};
        obstacles = [];
        score = 0;
        over = false;
        started = false;
        holding = false;
        gapY = H / 2;
        statusEl.textContent = "Hold mouse or Space to begin.";
        statusEl.className = "status info";
      }

      function press() {
        if (over) {
          reset();
          return;
        }
        holding = true;
        if (!started) {
          started = true;
          statusEl.textContent = "Survive!";
          statusEl.className = "status info";
        }
      }

      function release() {
        holding = false;
      }

      function update() {
        if (!started || over) return;
        heli.vy += holding ? -0.3 : 0.4;
        heli.vy = Math.max(-4, Math.min(5, heli.vy));
        heli.y += heli.vy;
        // walls
        if (heli.y - heli.r < 0 || heli.y + heli.r > H) {
          endGame();
          return;
        }
        // spawn obstacles
        if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < W - 200) {
          const gapH = 110;
          const gap = 40 + Math.random() * (H - 80 - gapH);
          obstacles.push({x: W, gap});
          // track gap center for AI smoothness
        }
        for (const o of obstacles) o.x -= 2.5;
        obstacles = obstacles.filter(o => o.x > -40);
        // collision with obstacle blocks (top and bottom)
        for (const o of obstacles) {
          const gapH = 110;
          if (heli.x + heli.r > o.x && heli.x - heli.r < o.x + 30) {
            if (heli.y - heli.r < o.gap || heli.y + heli.r > o.gap + gapH) {
              endGame();
              return;
            }
          }
          if (!o.scored && o.x + 30 < heli.x) {
            o.scored = true;
            score++;
            AudioFX.tick();
          }
        }
      }

      function endGame() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Game over! Score: ${score}. Tap to restart.`;
        statusEl.className = "status lose";
        if (score > best) {
          Storage.setBest("helicopter", score);
          root.querySelector("#hc-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // obstacles
        ctx.fillStyle = s.getPropertyValue("--accent-2");
        for (const o of obstacles) {
          const gapH = 110;
          ctx.fillRect(o.x, 0, 30, o.gap);
          ctx.fillRect(o.x, o.gap + gapH, 30, H - o.gap - gapH);
        }
        // helicopter body
        ctx.fillStyle = s.getPropertyValue("--accent");
        ctx.beginPath();
        ctx.arc(heli.x, heli.y, heli.r, 0, Math.PI * 2);
        ctx.fill();
        // rotor
        ctx.strokeStyle = s.getPropertyValue("--text");
        ctx.lineWidth = 2;
        const rotorAng = (Date.now() / 30) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(heli.x - 14 * Math.cos(rotorAng), heli.y - heli.r - 4 - 6 * Math.sin(rotorAng) * 0);
        ctx.lineTo(heli.x + 14 * Math.cos(rotorAng), heli.y - heli.r - 4);
        ctx.stroke();
        // tail
        ctx.strokeStyle = s.getPropertyValue("--accent");
        ctx.beginPath();
        ctx.moveTo(heli.x, heli.y);
        ctx.lineTo(heli.x - 16, heli.y - 4);
        ctx.stroke();
        // score
        ctx.fillStyle = s.getPropertyValue("--text");
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText(score, W / 2, 30);
        root.querySelector("#hc-score").textContent = score;
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
          if (!e.repeat) press();
        }
      }

      function onKeyUp(e) {
        if (e.key === " " || e.key === "ArrowUp") release();
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousedown", press);
      document.addEventListener("mouseup", release);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        press();
      });
      canvas.addEventListener("touchend", e => {
        e.preventDefault();
        release();
      });
      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        document.removeEventListener("mouseup", release);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Helicopter",
        `Hold down the mouse button (or <b>Space</b>/<b>↑</b>) to make the helicopter ascend. Release to descend.
        <br><br>Thread through the gaps in the obstacle walls. Each obstacle you pass = 1 point. Don't hit anything.`);
    },
  });
})();
