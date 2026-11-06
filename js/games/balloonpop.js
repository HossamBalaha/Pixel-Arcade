/* Balloon Pop — pop balloons by clicking before they float off screen. Increasing speed. */
(function () {
  let live = null;
  const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ec4899"];
  const EMOJIS = ["🎈", "🎈", "🎈", "🎈", "💣"]; // bombs penalize
  GameRegistry.register({
    id: "balloonpop",
    name: "Balloon Pop",
    icon: "🎈",
    category: "arcade",
    description: "Pop balloons before they float away — avoid bombs, speed increases",
    tags: ["arcade", "click", "speed"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const W = 360, H = 440;
      let balloons = [], score = 0, missed = 0, rafId = null, spawnTimer = null, over = false, spawnRate = 1000,
        speed = 0.6, timeLeft = 45, gameTimer = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bp-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="bp-time">45</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bp-best">—</div></div>
        </div>
        <div class="status info" id="bp-status">Click 🎈 balloons to pop them. Avoid 💣 bombs! 45 seconds.</div>
        <div class="center"><canvas class="game-canvas" id="bp-canvas" width="${W}" height="${H}" style="border-radius:var(--radius);background:var(--bg-soft);cursor:crosshair;"></canvas></div>
        <p class="hint">Balloons rise faster over time. Bombs cost 5 points if clicked.</p>
      `;
      const canvas = root.querySelector("#bp-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bp-status");
      root.querySelector("#bp-best").textContent = Storage.getBest("balloonpop") ?? "—";

      function spawn() {
        if (over || !alive) return;
        const isBomb = Math.random() < 0.18;
        const x = 30 + Math.random() * (W - 60);
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        balloons.push({
          x,
          y: H + 30,
          color,
          isBomb,
          vy: -(speed + Math.random() * 0.5),
          emoji: isBomb ? "💣" : "🎈",
          r: 22
        });
        spawnTimer = setTimeout(spawn, spawnRate);
      }

      function draw() {
        const styles = getComputedStyle(document.documentElement);
        const text = styles.getPropertyValue("--text").trim();
        ctx.clearRect(0, 0, W, H);
        // Background clouds
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(60 + i * 130, 80, 28, 0, Math.PI * 2);
          ctx.arc(85 + i * 130, 80, 22, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const b of balloons) {
          ctx.font = "28px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.emoji, b.x, b.y);
          if (!b.isBomb) {
            ctx.strokeStyle = b.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(b.x, b.y + 14);
            ctx.lineTo(b.x + (Math.sin(b.y / 30) * 5), b.y + 30);
            ctx.stroke();
          }
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = text;
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Time's Up!", W / 2, H / 2 - 10);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 18);
        }
      }

      function loop() {
        if (!alive) return;
        if (!over) {
          for (const b of balloons) b.y += b.vy;
          // remove balloons that escaped
          for (let i = balloons.length - 1; i >= 0; i--) {
            if (balloons[i].y < -30) {
              if (!balloons[i].isBomb) missed++;
              balloons.splice(i, 1);
            }
          }
        }
        draw();
        rafId = requestAnimationFrame(loop);
      }

      function onPointer(e) {
        if (over) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (W / rect.width);
        const y = (e.clientY - rect.top) * (H / rect.height);
        for (let i = balloons.length - 1; i >= 0; i--) {
          const b = balloons[i];
          if (Math.abs(b.x - x) < b.r && Math.abs(b.y - y) < b.r) {
            if (b.isBomb) {
              score = Math.max(0, score - 5);
              AudioFX.error();
              statusEl.textContent = "💣 Bomb! -5 points";
              statusEl.className = "status lose";
              setTimeout(() => {
                if (!alive) return;
                if (!alive) return;
                if (alive && !over) {
                  statusEl.textContent = "Pop 🎈, avoid 💣!";
                  statusEl.className = "status info";
                }
              }, 800);
            } else {
              score += 1;
              AudioFX.pop();
            }
            balloons.splice(i, 1);
            root.querySelector("#bp-score").textContent = score;
            return;
          }
        }
        // Missed click
        AudioFX.tick();
      }

      canvas.addEventListener("click", onPointer);
      canvas.addEventListener("touchstart", e => {
        e.preventDefault();
        const t = e.touches[0];
        onPointer({clientX: t.clientX, clientY: t.clientY});
      }, {passive: false});

      function start() {
        score = 0;
        missed = 0;
        timeLeft = 45;
        over = false;
        balloons = [];
        speed = 0.6;
        spawnRate = 1000;
        root.querySelector("#bp-score").textContent = 0;
        root.querySelector("#bp-time").textContent = 45;
        statusEl.textContent = "Pop 🎈, avoid 💣! 45 seconds.";
        statusEl.className = "status info";
        clearTimeout(spawnTimer);
        clearInterval(gameTimer);
        spawn();
        gameTimer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#bp-time").textContent = timeLeft;
          // Speed up every 10 seconds
          if (timeLeft % 10 === 0 && timeLeft > 0) {
            speed += 0.4;
            spawnRate = Math.max(400, spawnRate - 150);
          }
          if (timeLeft <= 10) AudioFX.tick();
          if (timeLeft <= 0) {
            over = true;
            clearInterval(gameTimer);
            clearTimeout(spawnTimer);
            statusEl.textContent = `⏰ Time! You scored ${score}. Missed: ${missed}`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("balloonpop");
            if (!best || score > best) {
              Storage.setBest("balloonpop", score);
              root.querySelector("#bp-best").textContent = score;
              App.toast("New best: " + score, "success");
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
      App.showModal("How to play Balloon Pop",
        `Balloons 🎈 float up from the bottom of the screen. <b>Click or tap them to pop</b> and score points.
        <br><br>Avoid the <b>💣 bombs</b> — clicking one costs you 5 points!
        <br>45-second round. Balloons speed up every 10 seconds.`);
    },
  });
})();
