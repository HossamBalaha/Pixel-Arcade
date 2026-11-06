/* Breakout — paddle + ball + bricks, classic arcade */
(function () {
  const W = 360, H = 360;
  const PADDLE_W = 64, PADDLE_H = 10;
  const BRICK_ROWS = 5, BRICK_COLS = 8, BRICK_H = 14;
  const BALL_R = 5;

  GameRegistry.register({
    id: "breakout",
    name: "Breakout",
    icon: "🧱",
    category: "arcade",
    description: "Bounce the ball, smash all the bricks",
    tags: ["arcade", "classic", "mouse"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let paddle, ball, vx, vy, bricks, score, lives, over, won, raf;
      let leftDown = false, rightDown = false;
      const best = Storage.getBest("breakout") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bk-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="bk-lives">3</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bk-best">${best}</div></div>
        </div>
        <div class="status info" id="bk-status">← → or mouse to move paddle</div>
        <div class="center"><div class="snake-wrap"><canvas id="bk-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div></div>
        <div class="dpad" id="bk-dpad">
          <button class="left">←</button>
          <button class="right">→</button>
        </div>
        <p class="hint">Move with mouse, arrows, or D-pad. Press <b>Space</b> to launch, <b>R</b> to restart.</p>
      `;
      const canvas = root.querySelector("#bk-canvas");
      const ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bk-status");

      function reset() {
        paddle = {x: W / 2 - PADDLE_W / 2, y: H - 24};
        ball = {x: W / 2, y: H - 40, stuck: true};
        vx = 3.2;
        vy = -3.2;
        score = 0;
        lives = 3;
        over = false;
        won = false;
        bricks = [];
        const bw = (W - 16) / BRICK_COLS;
        for (let r = 0; r < BRICK_ROWS; r++) for (let c = 0; c < BRICK_COLS; c++) {
          bricks.push({x: 8 + c * bw, y: 30 + r * BRICK_H, w: bw - 3, h: BRICK_H - 3, alive: true, row: r});
        }
        setStatus("Press Space to launch");
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function update() {
        if (over || won) return;
        // paddle move
        if (leftDown) paddle.x -= 5;
        if (rightDown) paddle.x += 5;
        paddle.x = Math.max(0, Math.min(W - PADDLE_W, paddle.x));
        if (ball.stuck) {
          ball.x = paddle.x + PADDLE_W / 2;
          ball.y = paddle.y - BALL_R - 1;
          return;
        }
        ball.x += vx;
        ball.y += vy;
        if (ball.x < BALL_R) {
          ball.x = BALL_R;
          vx = -vx;
          AudioFX.tick();
        }
        if (ball.x > W - BALL_R) {
          ball.x = W - BALL_R;
          vx = -vx;
          AudioFX.tick();
        }
        if (ball.y < BALL_R) {
          ball.y = BALL_R;
          vy = -vy;
          AudioFX.tick();
        }
        // paddle
        if (ball.y + BALL_R >= paddle.y && ball.y + BALL_R <= paddle.y + PADDLE_H + 4 && ball.x >= paddle.x && ball.x <= paddle.x + PADDLE_W) {
          ball.y = paddle.y - BALL_R;
          vy = -Math.abs(vy);
          // angle based on hit position
          const t = (ball.x - paddle.x) / PADDLE_W - 0.5;
          vx = t * 6;
          AudioFX.pop();
        }
        // bottom = lose
        if (ball.y > H + BALL_R * 2) {
          lives--;
          AudioFX.lose();
          if (lives <= 0) {
            over = true;
            setStatus(`Game Over! Score: ${score}`, "lose");
            if (score > best) {
              Storage.setBest("breakout", score);
              App.toast("New best: " + score, "success");
              root.querySelector("#bk-best").textContent = score;
            }
          } else {
            ball = {x: paddle.x + PADDLE_W / 2, y: paddle.y - BALL_R - 1, stuck: true};
            setStatus("Press Space to launch");
          }
        }
        // bricks
        for (const b of bricks) {
          if (!b.alive) continue;
          if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w && ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
            b.alive = false;
            score += (BRICK_ROWS - b.row) * 10;
            AudioFX.place();
            // crude reflection
            const overlapX = Math.min(ball.x + BALL_R - b.x, b.x + b.w - (ball.x - BALL_R));
            const overlapY = Math.min(ball.y + BALL_R - b.y, b.y + b.h - (ball.y - BALL_R));
            if (overlapX < overlapY) vx = -vx; else vy = -vy;
            if (bricks.every(br => !br.alive)) {
              won = true;
              AudioFX.win();
              setStatus(`🎉 Cleared! Score ${score}`, "win");
              if (score > best) {
                Storage.setBest("breakout", score);
                App.toast("New best: " + score, "success");
                root.querySelector("#bk-best").textContent = score;
              }
            }
            break;
          }
        }
      }

      function render() {
        const s = getComputedStyle(document.documentElement);
        ctx.fillStyle = s.getPropertyValue("--bg-soft");
        ctx.fillRect(0, 0, W, H);
        const brickColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];
        for (const b of bricks) {
          if (!b.alive) continue;
          ctx.fillStyle = brickColors[b.row];
          ctx.fillRect(b.x, b.y, b.w, b.h);
        }
        ctx.fillStyle = s.getPropertyValue("--accent");
        ctx.fillRect(paddle.x, paddle.y, PADDLE_W, PADDLE_H);
        ctx.fillStyle = s.getPropertyValue("--accent-2");
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
        root.querySelector("#bk-score").textContent = score;
        root.querySelector("#bk-lives").textContent = lives;
      }

      function loop() {
        if (!alive) return;
        update();
        render();
        raf = requestAnimationFrame(loop);
      }

      function launch() {
        if (over) {
          reset();
          return;
        }
        if (ball.stuck) {
          ball.stuck = false;
          vy = -3.4;
          vx = (Math.random() - 0.5) * 4;
          AudioFX.click();
          setStatus("Smash all the bricks!");
        }
      }

      function onKey(e) {
        if (e.key === "ArrowLeft" || e.key === "a") leftDown = true;
        else if (e.key === "ArrowRight" || e.key === "d") rightDown = true;
        else if (e.key === " ") {
          e.preventDefault();
          launch();
        } else if (e.key === "r" || e.key === "R") reset();
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
      }

      function onKeyUp(e) {
        if (e.key === "ArrowLeft" || e.key === "a") leftDown = false;
        else if (e.key === "ArrowRight" || e.key === "d") rightDown = false;
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("mousemove", e => {
        const rect = canvas.getBoundingClientRect();
        const scale = W / rect.width;
        paddle.x = Math.max(0, Math.min(W - PADDLE_W, (e.clientX - rect.left) * scale - PADDLE_W / 2));
      });
      canvas.addEventListener("click", launch);
      root.querySelectorAll("#bk-dpad button").forEach(b => {
        const k = b.className;
        const dn = () => {
          if (k === "left") leftDown = true; else if (k === "right") rightDown = true;
        };
        const up = () => {
          if (k === "left") leftDown = false; else if (k === "right") rightDown = false;
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
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Breakout",
        `Move the paddle left/right to bounce the ball into the bricks above.
        <br>Smash all bricks to win. Lose a life when the ball falls past your paddle.
        <br><br>Controls: <b>←/→</b>, <b>A/D</b>, mouse, or on-screen D-pad.
        <br><b>Space</b> launches the ball (and restarts after game over). <b>R</b> restart.`);
    },
  });
})();
