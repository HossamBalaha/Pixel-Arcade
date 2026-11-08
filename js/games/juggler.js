/* Juggler — keep every ball in the air as they keep coming */
(function () {
  GameRegistry.register({
    id: "juggler",
    name: "Juggler",
    icon: "🤹",
    category: "arcade",
    description: "Keep every ball in the air as they keep coming",
    tags: ["arcade", "reflex", "physics"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 380, H = 320;
      let paddle, balls, score, best, over, raf, spawnT, comboFlash;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="jg-score">0</div></div>
          <div class="score-cell"><div class="label">Balls</div><div class="val" id="jg-balls">1</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="jg-best">0</div></div>
        </div>
        <div class="status info" id="jg-status">Move the paddle — every bounce is +1</div>
        <div class="center"><canvas id="jg-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">A new ball joins every 15 bounces. Don't let any ball hit the floor!</p>
      `;

      const canvas = root.querySelector("#jg-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#jg-status");
      best = Storage.getBest("juggler") || 0;
      const PW = 70;

      function reset() {
        paddle = {x: W / 2, px: W / 2};
        balls = [mkBall(W / 2)];
        score = 0;
        over = false;
        spawnT = 0;
        comboFlash = null;
        updateHud();
        statusEl.textContent = "Move the paddle — every bounce is +1";
        statusEl.className = "status info";
      }

      function mkBall(x) {
        return {
          x,
          y: 60,
          vx: (Math.random() - 0.5) * 2.4,
          vy: 0,
          c: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"][Math.floor(Math.random() * 6)]
        };
      }

      function updateHud() {
        root.querySelector("#jg-score").textContent = score;
        root.querySelector("#jg-balls").textContent = balls.length;
        root.querySelector("#jg-best").textContent = best;
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width)};
      };
      const move = (e) => {
        e.preventDefault();
        paddle.x = Math.max(PW / 2, Math.min(W - PW / 2, pos(e).x));
      };
      canvas.addEventListener("pointerdown", (e) => {
        if (over) reset(); else move(e);
      });
      canvas.addEventListener("pointermove", move);

      function tick() {
        if (!over) {
          for (const b of balls) {
            b.vy += 0.16;
            b.x += b.vx;
            b.y += b.vy;
            if (b.x < 10) {
              b.x = 10;
              b.vx = Math.abs(b.vx);
            }
            if (b.x > W - 10) {
              b.x = W - 10;
              b.vx = -Math.abs(b.vx);
            }
            // paddle bounce
            if (b.vy > 0 && b.y > H - 34 && b.y < H - 18 &&
              b.x > paddle.x - PW / 2 - 8 && b.x < paddle.x + PW / 2 + 8) {
              b.y = H - 34;
              b.vy = -(5.4 + Math.random() * 0.8);
              b.vx += (paddle.x - paddle.px) * 0.34 + (b.x - paddle.x) * 0.06;
              b.vx = Math.max(-4.5, Math.min(4.5, b.vx));
              score++;
              AudioFX.pop();
              updateHud();
              if (score % 15 === 0 && balls.length < 6) {
                balls.push(mkBall(40 + Math.random() * (W - 80)));
                comboFlash = {t: 0, msg: "Another ball joins!"};
              }
            }
            // floor
            if (b.y > H - 6) return die();
          }
          paddle.px = paddle.x;
          if (comboFlash && ++comboFlash.t > 50) comboFlash = null;
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Dropped! Final score ${score} with ${balls.length} ball${balls.length > 1 ? "s" : ""}`;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("juggler", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#1e1b4b";
        ctx.fillRect(0, 0, W, H);
        // spotlight cone
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.moveTo(W / 2 - 30, 0);
        ctx.lineTo(W / 2 + 30, 0);
        ctx.lineTo(W / 2 + 140, H);
        ctx.lineTo(W / 2 - 140, H);
        ctx.closePath();
        ctx.fill();
        // floor
        ctx.fillStyle = "#312e81";
        ctx.fillRect(0, H - 8, W, 8);
        ctx.strokeStyle = "#ef4444";
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, H - 8);
        ctx.lineTo(W, H - 8);
        ctx.stroke();
        ctx.setLineDash([]);
        // paddle (hands)
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(paddle.x - PW / 2, H - 30, PW, 12, 6);
        ctx.fill();
        ctx.fillStyle = text;
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🤲", paddle.x - PW / 2 + 10, H - 18);
        ctx.fillText("🤲", paddle.x + PW / 2 - 10, H - 18);
        // balls
        for (const b of balls) {
          ctx.fillStyle = b.c;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.beginPath();
          ctx.arc(b.x - 3, b.y - 3, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (comboFlash) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(comboFlash.msg, W / 2, 60);
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Dropped a ball!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to juggle again", W / 2, H / 2 + 26);
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Juggler",
        `Slide the paddle with your pointer to bounce the balls. Every keep-up is <b>+1</b>.
        <br><br>Moving the paddle sideways adds <b>spin</b> — use it to steer balls away from the edges.
        Every <b>15 bounces</b> another ball joins (up to 6). Letting any ball hit the red floor ends the act.`);
    },
  });
})();
