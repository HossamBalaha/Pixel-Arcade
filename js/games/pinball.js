/* Pinball — bounce the ball off bumpers and flippers for points */
(function () {
  GameRegistry.register({
    id: "pinball",
    name: "Pinball",
    icon: "🕹️",
    category: "arcade",
    description: "Bounce the ball off bumpers and flippers for points",
    tags: ["arcade", "physics", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 460;
      let ball, flippers, score, balls, best, over, raf, flipT;
      best = Storage.getBest("pinball") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="pb-score">0</div></div>
          <div class="score-cell"><div class="label">Balls</div><div class="val" id="pb-balls">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pb-best">0</div></div>
        </div>
        <div class="status info" id="pb-status">Launch with <b>Space</b> — flip with <b>←</b> and <b>→</b></div>
        <div class="center"><canvas id="pb-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn" id="pb-launch">🚀 Launch</button>
          <button class="btn" id="pb-fl">⬅ Flip</button>
          <button class="btn" id="pb-fr">Flip ➡</button>
        </div>
        <p class="hint">Bumpers give 100. Slingshots 250. Lose the ball 3 times and it's over.</p>
      `;

      const canvas = root.querySelector("#pb-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#pb-status");
      const bumpers = [
        {x: W * 0.3, y: H * 0.32, r: 20, pts: 100},
        {x: W * 0.7, y: H * 0.32, r: 20, pts: 100},
        {x: W * 0.5, y: H * 0.22, r: 24, pts: 250},
      ];
      const slings = [ // slingshot triangles above flippers
        {x: W * 0.18, y: H - 110}, {x: W * 0.82, y: H - 110},
      ];

      function reset(full) {
        if (full) {
          score = 0;
          balls = 3;
        }
        over = false;
        flippers = {L: -0.5, R: 0.5};
        ball = {x: W / 2, y: H - 60, vx: 0, vy: 0, stuck: true};
        flipT = 0;
        updateHud();
        statusEl.textContent = "Press Launch (or Space) to send the ball up!";
        statusEl.className = "status info";
      }

      function launch() {
        if (over || !ball.stuck) return;
        ball.stuck = false;
        ball.vx = (Math.random() * 2 - 1) * 1.2;
        ball.vy = -11;
        AudioFX.pop();
      }

      function updateHud() {
        root.querySelector("#pb-score").textContent = score;
        root.querySelector("#pb-balls").textContent = balls;
        root.querySelector("#pb-best").textContent = best;
      }

      function loseBall() {
        balls--;
        AudioFX.lose();
        if (balls <= 0) {
          over = true;
          statusEl.textContent = `Game over — final score ${score}`;
          statusEl.className = "status lose";
          if (score > best) {
            best = score;
            Storage.setBest("pinball", best);
            App.toast("New best: " + best, "success");
          }
        } else {
          reset(false);
        }
        updateHud();
      }

      function physics() {
        if (over) return;
        if (ball.stuck) {
          ball.x = W / 2 + Math.sin(Date.now() / 300) * 2;
          return;
        }
        ball.vy += 0.22;
        ball.vx *= 0.998;
        ball.x += ball.vx;
        ball.y += ball.vy;
        // walls
        if (ball.x < 10) {
          ball.x = 10;
          ball.vx = Math.abs(ball.vx) * 0.85;
        }
        if (ball.x > W - 10) {
          ball.x = W - 10;
          ball.vx = -Math.abs(ball.vx) * 0.85;
        }
        if (ball.y < 10) {
          ball.y = 10;
          ball.vy = Math.abs(ball.vy) * 0.85;
        }
        // bumpers
        for (const b of bumpers) {
          const dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy);
          if (d < b.r + 8) {
            const nx = dx / (d || 1), ny = dy / (d || 1);
            ball.x = b.x + nx * (b.r + 8);
            ball.y = b.y + ny * (b.r + 8);
            const sp = Math.max(6, Math.hypot(ball.vx, ball.vy));
            ball.vx = nx * sp;
            ball.vy = ny * sp;
            score += b.pts;
            AudioFX.pop();
            updateHud();
          }
        }
        // slingshots: strong diagonal bounce zones
        for (const s of slings) {
          if (Math.hypot(ball.x - s.x, ball.y - s.y) < 26) {
            const nx = (ball.x - s.x) / 26, ny = (ball.y - s.y) / 26;
            ball.vx = nx * 10;
            ball.vy = ny * 10;
            score += 250;
            AudioFX.pop();
            updateHud();
          }
        }
        // flippers (two angled segments near the bottom)
        const fL = flipAngle(0, -0.5), fR = flipAngle(1, 0.5);
        segBounce(W * 0.32, H - 34, W * 0.32 + 46 * Math.cos(fL), H - 34 - 46 * Math.sin(fL));
        segBounce(W * 0.68, H - 34, W * 0.68 + 46 * Math.cos(Math.PI - fR), H - 34 - 46 * Math.sin(Math.PI - fR));
        // out
        if (ball.y > H + 16) loseBall();
      }

      function flipAngle(side, rest) {
        const up = side === 0 ? keys.L : keys.R;
        const target = up ? 1.1 : rest;
        if (side === 0) flippers.L += (target - flippers.L) * 0.4;
        else flippers.R += (target - flippers.R) * 0.4;
        return side === 0 ? flippers.L : flippers.R;
      }

      function segBounce(x1, y1, x2, y2) {
        // distance from ball to segment
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((ball.x - x1) * dx + (ball.y - y1) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + t * dx, py = y1 + t * dy;
        const d = Math.hypot(ball.x - px, ball.y - py);
        if (d < 10) {
          const nx = (ball.x - px) / (d || 1), ny = (ball.y - py) / (d || 1);
          ball.x = px + nx * 10;
          ball.y = py + ny * 10;
          const sp = Math.hypot(ball.vx, ball.vy);
          const boost = 8.5;
          ball.vx = nx * boost + (Math.random() - 0.5);
          ball.vy = -Math.abs(ny * boost) - Math.max(0, sp * 0.3);
          AudioFX.click();
        }
      }

      const keys = {L: false, R: false};

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#222";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const accent2 = st.getPropertyValue("--accent-2").trim() || "#ec4899";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // side rails
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3;
        ctx.strokeRect(6, 6, W - 12, H - 12);
        // bumpers
        bumpers.forEach(b => {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath();
          ctx.arc(b.x - 6, b.y - 6, b.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = text;
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(b.pts, b.x, b.y + 4);
        });
        // slingshots
        slings.forEach(s => {
          ctx.fillStyle = accent2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 16, 0, Math.PI * 2);
          ctx.fill();
        });
        // flippers
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(W * 0.32, H - 34);
        ctx.lineTo(W * 0.32 + 46 * Math.cos(flipperDraw(0)), H - 34 - 46 * Math.sin(flipperDraw(0)));
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W * 0.68, H - 34);
        ctx.lineTo(W * 0.68 + 46 * Math.cos(Math.PI - flipperDraw(1)), H - 34 - 46 * Math.sin(Math.PI - flipperDraw(1)));
        ctx.stroke();
        // ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = text;
        ctx.fill();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = text;
          ctx.font = "bold 26px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", W / 2, H / 2 - 8);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 20);
        }
      }

      function flipperDraw(side) {
        return side === 0 ? flippers.L : flippers.R;
      }

      function loop() {
        physics();
        render();
        raf = requestAnimationFrame(loop);
      }

      const onKey = (e) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === " ") {
          e.preventDefault();
          launch();
        }
        if (k === "arrowleft" || k === "a") keys.L = true;
        if (k === "arrowright" || k === "d") keys.R = true;
        if (k === "r" && over) reset(true);
      };
      const onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") keys.L = false;
        if (k === "arrowright" || k === "d") keys.R = false;
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      root.querySelector("#pb-launch").addEventListener("click", launch);
      root.querySelector("#pb-fl").addEventListener("pointerdown", () => keys.L = true);
      root.querySelector("#pb-fl").addEventListener("pointerup", () => keys.L = false);
      root.querySelector("#pb-fr").addEventListener("pointerdown", () => keys.R = true);
      root.querySelector("#pb-fr").addEventListener("pointerup", () => keys.R = false);

      reset(true);
      loop();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
      };
    },
    help: function () {
      App.showModal("How to play Pinball",
        `Launch the ball with <b>Space</b> and keep it alive with the two flippers:
        <b>←</b> / <b>A</b> for the left one, <b>→</b> / <b>D</b> for the right.
        <br><br>Purple bumpers score <b>100</b>, the big center bumper <b>250</b>, and the pink slingshots <b>250</b>.
        You have three balls — the game ends when the last one drains.
        <br>Press <b>R</b> to restart after game over.`);
    },
  });
})();
