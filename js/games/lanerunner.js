/* Lane Runner — three lanes, full speed, dodge the traffic */
(function () {
  GameRegistry.register({
    id: "lanerunner",
    name: "Lane Runner",
    icon: "🏎️",
    category: "arcade",
    description: "Three lanes, full speed — dodge the traffic",
    tags: ["arcade", "reflex", "endless"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 300, H = 440;
      let lane, cars, dist, speed, score, best, over, raf, laneX;
      best = Storage.getBest("lanerunner") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="lr-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lr-best">0</div></div>
          <div class="score-cell"><div class="label">Speed</div><div class="val" id="lr-speed">1×</div></div>
        </div>
        <div class="status info" id="lr-status">← → to switch lanes — collect the coins!</div>
        <div class="center"><canvas id="lr-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="dpad">
          <button class="left">←</button>
          <button class="right">→</button>
        </div>
        <p class="hint">Near misses give bonus points. Traffic thickens as you go.</p>
      `;

      const canvas = root.querySelector("#lr-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#sr-status") || root.querySelector("#lr-status");
      const laneW = W / 3;
      const carColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f97316"];

      function reset() {
        lane = 1;
        laneX = laneW * 1.5;
        cars = [];
        coins = [];
        dist = 0;
        speed = 3;
        score = 0;
        over = false;
        spawnAhead();
        updateHud();
        statusEl.textContent = "← → to switch lanes — collect the coins!";
        statusEl.className = "status info";
      }

      let coins = [];

      function spawnAhead() {
        while (cars.length < 6 || (cars.length && cars[cars.length - 1].y > -400)) {
          const y = cars.length ? cars[cars.length - 1].y - (70 + Math.random() * 130) : -80;
          // 1-2 blocked lanes max (never all 3)
          const blocked = [];
          const nBlocked = Math.random() < 0.35 ? 2 : 1;
          while (blocked.length < nBlocked) {
            const l = Math.floor(Math.random() * 3);
            if (!blocked.includes(l)) blocked.push(l);
          }
          for (const l of blocked) {
            cars.push({lane: l, y, color: carColors[Math.floor(Math.random() * carColors.length)], passed: false});
          }
          if (Math.random() < 0.5) {
            const free = [0, 1, 2].filter(l => !blocked.includes(l));
            coins.push({lane: free[Math.floor(Math.random() * free.length)], y: y - 45, got: false});
          }
        }
      }

      function updateHud() {
        root.querySelector("#lr-score").textContent = score;
        root.querySelector("#lr-best").textContent = best;
        root.querySelector("#lr-speed").textContent = (speed / 3).toFixed(1) + "×";
      }

      function tick() {
        if (!over) {
          dist += speed;
          speed = Math.min(9, 3 + dist / 1500);
          for (const c of cars) c.y += speed;
          for (const c of coins) c.y += speed;
          cars = cars.filter(c => c.y < H + 60);
          coins = coins.filter(c => c.y < H + 40 && !c.got);
          spawnAhead();
          // smooth lane movement
          const targetX = laneW * lane + laneW / 2;
          laneX += (targetX - laneX) * 0.25;
          // collisions
          const py = H - 70;
          for (const c of cars) {
            if (Math.abs(c.y - py) < 34 && c.lane === lane && Math.abs(laneX - (laneW * c.lane + laneW / 2)) < laneW * 0.32) {
              return die("Crash! 💥");
            }
            if (!c.passed && c.y > py + 40) {
              c.passed = true;
              score += 5;
            }
          }
          for (const c of coins) {
            if (Math.abs(c.y - py) < 26 && Math.abs(laneX - (laneW * c.lane + laneW / 2)) < laneW * 0.3) {
              c.got = true;
              score += 25;
              AudioFX.pop();
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
          Storage.setBest("lanerunner", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function drawCar(x, y, w, h, color, isPlayer) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, y - h / 2, w, h, 8);
        ctx.fill();
        // windshield
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(x - w / 2 + 4, y - h / 2 + (isPlayer ? 4 : h * 0.5 - 4), w - 8, h * 0.28);
        if (isPlayer) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.fillRect(x - 4, y - h / 2 - 2, 8, 4); // antenna
        }
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#222";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // asphalt + lane markers
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 22]);
        for (let i = 1; i < 3; i++) {
          const x = laneW * i;
          ctx.beginPath();
          const off = (dist * 2) % 40;
          ctx.moveTo(x, -40 + off);
          ctx.lineTo(x, H + 40);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        // coins — amber with a dark rim so they read on light canvases too
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.5;
        for (const c of coins) {
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(laneW * c.lane + laneW / 2, c.y, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.beginPath();
          ctx.arc(laneW * c.lane + laneW / 2 - 3, c.y - 3, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        // traffic
        for (const c of cars) drawCar(laneW * c.lane + laneW / 2, c.y, laneW * 0.62, 46, c.color, false);
        // player — theme accent tracks the canvas so it works in every theme
        drawCar(laneX, H - 70, laneW * 0.62, 50, accent, true);
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Crashed!", W / 2, H / 2 - 8);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 18);
        }
      }

      const move = (d) => {
        if (!over) lane = Math.max(0, Math.min(2, lane + d));
      };
      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") move(-1);
        if (k === "arrowright" || k === "d") move(1);
        if (k === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);
      const dpad = root.querySelector(".dpad");
      dpad.querySelector(".left").addEventListener("click", () => move(-1));
      dpad.querySelector(".right").addEventListener("click", () => move(1));

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Lane Runner",
        `You're racing up a three-lane road. Switch lanes with <b>←</b> / <b>→</b> (or the on-screen buttons).
        <br><br>Passing a car is worth <b>5</b>, grabbing a coin <b>25</b>. Traffic gets denser and faster with distance.
        Never all three lanes are blocked — a gap always exists. <b>R</b> restarts.`);
    },
  });
})();
