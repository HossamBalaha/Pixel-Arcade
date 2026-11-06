/* Pong — player paddle (W/S or arrows) vs AI. First to 7 wins. */
(function () {
  const W = 360, H = 360;
  const PADDLE_W = 8, PADDLE_H = 56;
  const BALL_R = 6;
  const WIN_SCORE = 7;

  GameRegistry.register({
    id: "pong",
    name: "Pong",
    icon: "🏓",
    category: "arcade",
    description: "Classic Pong — bounce the ball past the AI paddle",
    tags: ["arcade", "classic", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let p, ai, ball, vx, vy, over, raf;
      let upDown = false, downDown = false;
      const best = Storage.getBest("pong") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="pg-p">0</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="pg-a">0</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="pg-best">${best}</div></div>
        </div>
        <div class="status info" id="pg-status">First to ${WIN_SCORE} wins. W/S or arrows.</div>
        <div class="center"><div class="snake-wrap"><canvas id="pg-canvas" width="${W}" height="${H}" class="game-canvas" style="cursor:none"></canvas></div></div>
        <div class="dpad" id="pg-dpad">
          <button class="up">↑</button>
          <button class="down">↓</button>
        </div>
        <p class="hint"><b>W/S</b>, <b>↑/↓</b>, or <b>mouse</b> over the board to move. <b>Space</b> pause, <b>R</b> restart.</p>
      `;
      const canvas = root.querySelector("#pg-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#pg-status");
      let mouseTargetY = null; // when set, paddle follows the mouse

      function reset() {
        p = {x: 16, y: H / 2 - PADDLE_H / 2};
        ai = {x: W - 16 - PADDLE_W, y: H / 2 - PADDLE_H / 2};
        ball = {x: W / 2, y: H / 2};
        vx = 3.5 * (Math.random() > 0.5 ? 1 : -1);
        vy = (Math.random() - 0.5) * 4;
        over = null; // null = playing, "P" = player won, "A" = AI won
        setStatus(`First to ${WIN_SCORE} wins`);
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function update() {
        if (over !== null) return;
        // player paddle — keyboard first, then mouse
        const speed = 5;
        if (upDown) p.y -= speed;
        if (downDown) p.y += speed;
        if (mouseTargetY !== null) {
          // smoothly track the mouse target
          const target = Math.max(0, Math.min(H - PADDLE_H, mouseTargetY - PADDLE_H / 2));
          const diff = target - p.y;
          if (Math.abs(diff) > 1) p.y += diff * 0.35; // easing
        }
        p.y = Math.max(0, Math.min(H - PADDLE_H, p.y));
        // AI paddle: track ball, but slower
        const aiTarget = ball.y - PADDLE_H / 2;
        const aiSpeed = 3.4;
        if (Math.abs(ai.y - aiTarget) > 4) ai.y += aiTarget > ai.y ? aiSpeed : -aiSpeed;
        ai.y = Math.max(0, Math.min(H - PADDLE_H, ai.y));
        // ball
        ball.x += vx;
        ball.y += vy;
        if (ball.y < BALL_R) {
          ball.y = BALL_R;
          vy = -vy;
          AudioFX.tick();
        }
        if (ball.y > H - BALL_R) {
          ball.y = H - BALL_R;
          vy = -vy;
          AudioFX.tick();
        }
        // player paddle
        if (vx < 0 && ball.x - BALL_R < p.x + PADDLE_W && ball.x > p.x && ball.y > p.y && ball.y < p.y + PADDLE_H) {
          vx = -vx * 1.05;
          const off = (ball.y - (p.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          vy = off * 4;
          AudioFX.pop();
        }
        // AI paddle
        if (vx > 0 && ball.x + BALL_R > ai.x && ball.x < ai.x + PADDLE_W && ball.y > ai.y && ball.y < ai.y + PADDLE_H) {
          vx = -vx * 1.05;
          const off = (ball.y - (ai.y + PADDLE_H / 2)) / (PADDLE_H / 2);
          vy = off * 4;
          AudioFX.place();
        }
        // clamp speed
        const max = 8;
        if (Math.abs(vx) > max) vx = Math.sign(vx) * max;
        if (Math.abs(vy) > max) vy = Math.sign(vy) * max;
        // score
        if (ball.x < -BALL_R * 2) {
          ai_scored();
        } else if (ball.x > W + BALL_R * 2) {
          player_scored();
        }
      }

      function player_scored() {
        const cur = parseInt(root.querySelector("#pg-p").textContent, 10) + 1;
        root.querySelector("#pg-p").textContent = cur;
        AudioFX.win();
        if (cur >= WIN_SCORE) {
          over = "P";
          setStatus("🎉 You win!", "win");
          Storage.submitScore("pong", (Storage.getBest("pong") || 0) + 1);
          root.querySelector("#pg-best").textContent = Storage.getBest("pong");
        } else {
          resetBall(-1);
        }
      }

      function ai_scored() {
        const cur = parseInt(root.querySelector("#pg-a").textContent, 10) + 1;
        root.querySelector("#pg-a").textContent = cur;
        AudioFX.lose();
        if (cur >= WIN_SCORE) {
          over = "A";
          setStatus("AI wins 💀", "lose");
        } else {
          resetBall(1);
        }
      }

      function resetBall(dir) {
        ball = {x: W / 2, y: H / 2};
        vx = 3.5 * dir;
        vy = (Math.random() - 0.5) * 4;
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        // center dashed line
        ctx.strokeStyle = s.getPropertyValue("--border");
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = s.getPropertyValue("--accent");
        ctx.fillRect(p.x, p.y, PADDLE_W, PADDLE_H);
        ctx.fillStyle = s.getPropertyValue("--accent-2");
        ctx.fillRect(ai.x, ai.y, PADDLE_W, PADDLE_H);
        ctx.fillStyle = s.getPropertyValue("--text");
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }

      let paused = false;

      function loop() {
        if (!alive) return;
        if (!paused && over === null) update();
        render();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") upDown = true;
        else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") downDown = true;
        else if (e.key === " ") {
          e.preventDefault();
          paused = !paused;
          setStatus(paused ? "Paused" : "Playing", "info");
        } else if (e.key === "r" || e.key === "R") {
          root.querySelector("#pg-p").textContent = "0";
          root.querySelector("#pg-a").textContent = "0";
          reset();
        }
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      }

      function onKeyUp(e) {
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") upDown = false;
        else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") downDown = false;
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);

      // Mouse control — move the paddle to follow the cursor over the canvas.
      function canvasPos(clientY) {
        const rect = canvas.getBoundingClientRect();
        const scale = H / rect.height;
        return (clientY - rect.top) * scale;
      }

      function onMouseMove(e) {
        mouseTargetY = canvasPos(e.clientY);
      }

      function onMouseEnter(e) {
        mouseTargetY = canvasPos(e.clientY);
      }

      function onMouseLeave() { /* keep last target so paddle doesn't snap back */
      }

      function onTouch(e) {
        if (e.touches && e.touches[0]) {
          e.preventDefault();
          mouseTargetY = canvasPos(e.touches[0].clientY);
        }
      }

      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("mouseenter", onMouseEnter);
      canvas.addEventListener("mouseleave", onMouseLeave);
      canvas.addEventListener("touchstart", onTouch, {passive: false});
      canvas.addEventListener("touchmove", onTouch, {passive: false});
      root.querySelectorAll("#pg-dpad button").forEach(b => {
        const k = b.className;
        const dn = () => {
          if (k === "up") upDown = true; else if (k === "down") downDown = true;
        };
        const up = () => {
          if (k === "up") upDown = false; else if (k === "down") downDown = false;
        };
        b.addEventListener("mousedown", dn);
        b.addEventListener("mouseup", up);
        b.addEventListener("mouseleave", up);
        b.addEventListener("touchstart", e => {
          e.preventDefault();
          dn();
        });
        b.addEventListener("touchend", e => {
          e.preventDefault();
          up();
        });
      });
      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("mouseenter", onMouseEnter);
        canvas.removeEventListener("mouseleave", onMouseLeave);
        canvas.removeEventListener("touchstart", onTouch);
        canvas.removeEventListener("touchmove", onTouch);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Pong",
        `Bounce the ball back to the AI side. When the ball gets past a paddle, the other player scores a point.
        <br><br>First to <b>7 points</b> wins. Controls: <b>W/S</b>, <b>↑/↓</b>, or on-screen D-pad.
        <br><b>Space</b> pauses, <b>R</b> restarts. The ball speeds up after each paddle hit.`);
    },
  });
})();
