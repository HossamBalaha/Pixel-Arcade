/* Brick Breaker Mini — compact Breakout variant: 5x8 brick wall, 2-hit top rows,
   ball speeds up with every brick hit, and every 10th hit briefly widens the paddle. */
(function () {
  "use strict";
  const W = 360, H = 420;
  const PADDLE_H = 10, PADDLE_Y = H - 26, BALL_R = 5;
  const NORM_W = 58, WIDE_W = 96, WIDE_SECS = 5;
  const ROWS = 5, COLS = 8, BRICK_H = 15, BRICK_TOP = 44, SIDE = 8, GAP = 3;
  const ROW_COLORS = ["#f87171", "#fb923c", "#facc15", "#4ade80", "#38bdf8"];
  const BG = "#0f172a";
  const KEY_SPEED = 350;   // paddle px/s
  const MAX_SPEED = 430;   // ball px/s cap

  GameRegistry.register({
    id: "brickbreakermini",
    name: "Brick Breaker Mini",
    icon: "🧱",
    category: "arcade",
    description: "Pocket breakout — 5x8 bricks, tough 2-hit top rows, paddle widens every 10th brick hit",
    tags: ["arcade", "classic", "paddle", "reflex", "mini"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true, raf = 0, last = 0;
      let cx, pw, ball, dx, dy, speed, bricks, score, lives, level, state, hits, wideLeft;
      let leftDown = false, rightDown = false;
      let best = Storage.getBest("brickbreakermini") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bbm-score">0</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="bbm-lives">3</div></div>
          <div class="score-cell"><div class="label">Level</div><div class="val" id="bbm-level">1</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bbm-best">${best}</div></div>
        </div>
        <div class="status info" id="bbm-status">Move with mouse, touch or arrows — Space to launch</div>
        <div class="center"><div class="snake-wrap"><canvas id="bbm-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div></div>
        <div class="dpad" id="bbm-dpad">
          <button class="left" type="button">←</button>
          <button class="right" type="button">→</button>
        </div>
        <p class="hint">Top rows take <b>2 hits</b> (+20), soft bricks +10. Every 10th brick hit widens the paddle for 5s. <b>R</b> restarts.</p>
      `;
      const canvas = root.querySelector("#bbm-canvas");
      const c = canvas.getContext("2d");
      const statusEl = root.querySelector("#bbm-status");
      const scoreEl = root.querySelector("#bbm-score");
      const livesEl = root.querySelector("#bbm-lives");
      const levelEl = root.querySelector("#bbm-level");
      const bestEl = root.querySelector("#bbm-best");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function paddleW() {
        return wideLeft > 0 ? WIDE_W : NORM_W;
      }

      function baseSpeed() {
        return Math.min(225 + (level - 1) * 32, 400);
      }

      function syncHud() {
        scoreEl.textContent = score;
        livesEl.textContent = lives;
        levelEl.textContent = level;
      }

      function makeBricks() {
        bricks = [];
        const bw = (W - SIDE * 2) / COLS;
        for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) {
          bricks.push({
            x: SIDE + col * bw + GAP / 2,
            y: BRICK_TOP + r * BRICK_H,
            w: bw - GAP,
            h: BRICK_H - GAP,
            hp: r < 2 ? 2 : 1, // top two rows are tougher
            row: r,
            alive: true
          });
        }
      }

      function stickBall() {
        pw = paddleW();
        ball = {x: cx, y: PADDLE_Y - BALL_R - 1};
      }

      function reset() {
        score = 0;
        lives = 3;
        level = 1;
        hits = 0;
        wideLeft = 0;
        cx = W / 2;
        state = "ready";
        makeBricks();
        stickBall();
        setStatus("Space or tap to launch the ball");
        syncHud();
      }

      function launch() {
        if (state === "over") {
          reset();
          return;
        }
        if (state === "ready") {
          state = "play";
          speed = baseSpeed();
          let a = (Math.random() - 0.5) * 0.7; // small random angle off vertical
          if (Math.abs(Math.sin(a)) < 0.18) a = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.15); // never perfectly vertical
          dx = Math.sin(a);
          dy = -Math.cos(a);
          AudioFX.click();
          setStatus("Smash the wall! Top rows take 2 hits");
        }
      }

      function loseLife() {
        lives--;
        AudioFX.lose();
        if (lives <= 0) {
          state = "over";
          setStatus("Game Over — score " + score + ". Tap or Space to retry", "lose");
          App.recordResult(false, score);
          if (score > best) {
            best = score;
            Storage.setBest("brickbreakermini", score);
            bestEl.textContent = best;
            App.toast("New best: " + score, "success");
          }
        } else {
          state = "ready";
          stickBall();
          setStatus(lives + (lives === 1 ? " life" : " lives") + " left — Space to launch");
        }
        syncHud();
      }

      function levelUp() {
        level++;
        AudioFX.win();
        App.toast("Wall cleared! Level " + level, "success");
        makeBricks();
        state = "ready";
        stickBall();
        setStatus("Level " + level + " — the ball starts faster now");
        syncHud();
      }

      function hitBrick(b) {
        hits++;
        speed = Math.min(speed * 1.012, MAX_SPEED); // slight speed-up per brick hit
        if (hits % 10 === 0) {
          wideLeft = WIDE_SECS;
          AudioFX.reveal();
          setStatus("Wide paddle for 5 seconds!");
        }
        b.hp--;
        if (b.hp <= 0) {
          b.alive = false;
          score += b.row < 2 ? 20 : 10;
          AudioFX.pop();
        } else {
          score += 5; // chip damage on a tough brick
          AudioFX.tick();
        }
        syncHud();
        if (bricks.every(x => !x.alive)) levelUp();
      }

      function update(dt) {
        if (state === "over") return;
        if (wideLeft > 0) wideLeft = Math.max(0, wideLeft - dt);
        if (leftDown) cx -= KEY_SPEED * dt;
        if (rightDown) cx += KEY_SPEED * dt;
        pw = paddleW();
        cx = Math.max(pw / 2, Math.min(W - pw / 2, cx));
        if (state === "ready") {
          ball.x = cx;
          ball.y = PADDLE_Y - BALL_R - 1;
          return;
        }
        // sub-stepped movement so the ball never tunnels through bricks
        const dist = speed * dt;
        const steps = Math.max(1, Math.ceil(dist / 4));
        const step = dist / steps;
        for (let i = 0; i < steps; i++) {
          ball.x += dx * step;
          ball.y += dy * step;
          // walls
          if (ball.x < BALL_R) {
            ball.x = BALL_R;
            dx = Math.abs(dx);
            AudioFX.tick();
          } else if (ball.x > W - BALL_R) {
            ball.x = W - BALL_R;
            dx = -Math.abs(dx);
            AudioFX.tick();
          }
          if (ball.y < BALL_R) {
            ball.y = BALL_R;
            dy = Math.abs(dy);
            AudioFX.tick();
          }
          // paddle (only when moving down)
          if (dy > 0 && ball.y + BALL_R >= PADDLE_Y && ball.y < PADDLE_Y + PADDLE_H + 6 &&
            ball.x >= cx - pw / 2 - BALL_R && ball.x <= cx + pw / 2 + BALL_R) {
            ball.y = PADDLE_Y - BALL_R - 0.5;
            const t = Math.max(-1, Math.min(1, (ball.x - cx) / (pw / 2)));
            let a = t * 1.05; // up to ~60 degrees off vertical
            if (Math.abs(Math.sin(a)) < 0.12) a = (t >= 0 ? 1 : -1) * 0.13; // avoid a dead-vertical lock
            dx = Math.sin(a);
            dy = -Math.cos(a);
            AudioFX.pop();
          }
          // floor
          if (ball.y - BALL_R > H) {
            loseLife();
            return;
          }
          // bricks (first contact per sub-step, with side detection)
          for (const b of bricks) {
            if (!b.alive) continue;
            const bx = b.x + b.w / 2, by = b.y + b.h / 2;
            const ox = b.w / 2 + BALL_R - Math.abs(ball.x - bx);
            if (ox <= 0) continue;
            const oy = b.h / 2 + BALL_R - Math.abs(ball.y - by);
            if (oy <= 0) continue;
            if (ox < oy) { // side hit
              dx = ball.x < bx ? -Math.abs(dx) : Math.abs(dx);
              ball.x += ball.x < bx ? -ox : ox;
            } else { // top/bottom hit
              dy = ball.y < by ? -Math.abs(dy) : Math.abs(dy);
              ball.y += ball.y < by ? -oy : oy;
            }
            hitBrick(b);
            break;
          }
          if (state !== "play") return; // level up or life lost mid-frame
        }
      }

      function roundRect(g, x, y, w, h, r) {
        r = Math.min(r, h / 2, w / 2);
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }

      function render() {
        c.fillStyle = BG;
        c.fillRect(0, 0, W, H);
        // bricks
        for (const b of bricks) {
          if (!b.alive) continue;
          c.fillStyle = ROW_COLORS[b.row];
          c.fillRect(b.x, b.y, b.w, b.h);
          if (b.row < 2 && b.hp === 2) { // pristine tough brick: glossy highlight
            c.fillStyle = "rgba(255,255,255,0.35)";
            c.fillRect(b.x, b.y, b.w, 3);
          } else if (b.row < 2) { // chipped tough brick: crack lines
            c.strokeStyle = "rgba(15,23,42,0.8)";
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo(b.x + b.w * 0.32, b.y);
            c.lineTo(b.x + b.w * 0.46, b.y + b.h * 0.55);
            c.lineTo(b.x + b.w * 0.36, b.y + b.h);
            c.stroke();
          }
        }
        // paddle
        const px = cx - pw / 2;
        if (wideLeft > 0) {
          c.fillStyle = "#4ade80";
          c.shadowColor = "#4ade80";
          c.shadowBlur = 12;
        } else {
          c.fillStyle = "#7dd3fc";
          c.shadowBlur = 0;
        }
        roundRect(c, px, PADDLE_Y, pw, PADDLE_H, 5);
        c.fill();
        c.shadowBlur = 0;
        // ball
        c.fillStyle = "#f8fafc";
        c.beginPath();
        c.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
        c.fill();
        // overlay text
        if (state !== "play") {
          c.fillStyle = "rgba(2,6,23,0.55)";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#e2e8f0";
          c.textAlign = "center";
          if (state === "over") {
            c.font = "bold 24px monospace";
            c.fillText("GAME OVER", W / 2, H / 2 - 16);
            c.font = "14px monospace";
            c.fillStyle = "#94a3b8";
            c.fillText("score " + score + " — tap or Space to retry", W / 2, H / 2 + 12);
          } else {
            c.font = "bold 20px monospace";
            c.fillText("LEVEL " + level, W / 2, H / 2 - 10);
            c.font = "13px monospace";
            c.fillStyle = "#94a3b8";
            c.fillText("tap or press Space to launch", W / 2, H / 2 + 16);
          }
        }
      }

      function loop(now) {
        if (!alive) return;
        if (!last) last = now;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        update(dt);
        render();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e) {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") leftDown = true;
        else if (k === "ArrowRight" || k === "d" || k === "D") rightDown = true;
        else if (k === " " || k === "Enter") launch();
        else if (k === "r" || k === "R") reset();
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
      }

      function onKeyUp(e) {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") leftDown = false;
        else if (k === "ArrowRight" || k === "d" || k === "D") rightDown = false;
      }

      function pointerToX(clientX) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return cx;
        return (clientX - rect.left) * (W / rect.width);
      }

      function moveTo(clientX) {
        pw = paddleW();
        cx = Math.max(pw / 2, Math.min(W - pw / 2, pointerToX(clientX)));
      }

      function onPointerMove(e) {
        moveTo(e.clientX);
      }

      function onTouchMove(e) {
        if (e.touches && e.touches.length) {
          e.preventDefault();
          moveTo(e.touches[0].clientX);
        }
      }

      function onPointerDown() {
        launch();
      }

      function onTouchStart(e) {
        if (e.touches && e.touches.length) moveTo(e.touches[0].clientX);
        launch();
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("touchmove", onTouchMove, {passive: false});
      canvas.addEventListener("touchstart", onTouchStart, {passive: true});
      root.querySelectorAll("#bbm-dpad button").forEach(b => {
        const left = b.className === "left";
        const dn = () => {
          if (left) leftDown = true; else rightDown = true;
        };
        const up = () => {
          if (left) leftDown = false; else rightDown = false;
        };
        b.addEventListener("mousedown", dn);
        b.addEventListener("mouseup", up);
        b.addEventListener("mouseleave", up);
        b.addEventListener("touchstart", e => {
          e.preventDefault();
          dn();
        }, {passive: false});
        b.addEventListener("touchend", e => {
          e.preventDefault();
          up();
        }, {passive: false});
      });

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("touchstart", onTouchStart);
      };
    },
    help: function () {
      App.showModal("How to play Brick Breaker Mini",
        `A pocket version of Breakout. Move the paddle to bounce the ball into the brick wall above.
        <br><br>• 5 rows x 8 bricks — the <b>top two rows are tough</b> and take 2 hits (+20 pts), soft bricks are +10 (chipping a tough one is +5).
        <br>• The ball gets a little <b>faster with every brick</b> it hits.
        <br>• No power-ups — but every <b>10th brick hit</b> widens your paddle for 5 seconds.
        <br>• Clear the wall to reach the next level (bricks regenerate, ball starts faster). You have <b>3 lives</b>.
        <br><br>Controls: mouse / touch drag (paddle follows your pointer), <b>arrow keys</b> or <b>A/D</b>, on-screen D-pad.
        <br><b>Space</b> or tap launches (and restarts after game over). <b>R</b> restarts anytime.`);
    },
  });
})();
