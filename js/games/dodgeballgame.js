/* Dodge Ball — survive 30 seconds as balls rain down faster and faster.
   Move with arrow keys / WASD or drag on the canvas. One hit and you're out. */
(function () {
  "use strict";
  const W = 360, H = 420;
  const PLAYER_R = 10, KEY_SPEED = 280, DRAG_SPEED = 950;
  const TOTAL = 30; // seconds to survive
  const BG = "#0f172a";

  GameRegistry.register({
    id: "dodgeballgame",
    name: "Dodge Ball",
    icon: "⚾",
    category: "arcade",
    description: "Survive 30s — dodge falling balls that spawn faster and fall quicker every second",
    tags: ["arcade", "dodge", "reflex", "survival", "timing"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true, raf = 0, last = 0;
      let player, balls, elapsed, spawnAcc, over, dodged;
      let leftDown = false, rightDown = false, upDown = false, downDown = false;
      let drag = null; // {x, y} pointer target while pressed
      let best = Storage.getBest("dodgeballgame") || 0; // milliseconds survived

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time left</div><div class="val" id="dg-time">${TOTAL.toFixed(1)}s</div></div>
          <div class="score-cell"><div class="label">Dodged</div><div class="val" id="dg-dodged">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="dg-best">${best ? (best / 1000).toFixed(1) + "s" : "—"}</div></div>
        </div>
        <div class="status info" id="dg-status">Dodge the falling balls for 30 seconds!</div>
        <div class="center"><div class="snake-wrap"><canvas id="dg-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div></div>
        <div class="row" style="justify-content:center;margin-top:12px;">
          <button class="btn primary" id="dg-new" type="button">Restart</button>
        </div>
        <p class="hint">Arrow keys / WASD to move, or drag anywhere on the field. Balls fall harder every second — one touch ends the run. <b>R</b> restarts.</p>
      `;
      const canvas = root.querySelector("#dg-canvas");
      const c = canvas.getContext("2d");
      const statusEl = root.querySelector("#dg-status");
      const timeEl = root.querySelector("#dg-time");
      const dodgedEl = root.querySelector("#dg-dodged");
      const bestEl = root.querySelector("#dg-best");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function fmtBest() {
        return best ? (best / 1000).toFixed(1) + "s" : "—";
      }

      function reset() {
        player = {x: W / 2, y: H - 70, blink: 0};
        balls = [];
        elapsed = 0;
        spawnAcc = 0.4; // first ball comes quickly
        over = false;
        dodged = 0;
        drag = null;
        setStatus("Dodge the falling balls for 30 seconds!");
        dodgedEl.textContent = "0";
      }

      function spawnBall(prog) {
        const r = 8 + Math.random() * 6;
        balls.push({
          x: r + Math.random() * (W - r * 2),
          y: -r,
          r,
          vy: 115 + 160 * prog + Math.random() * 50, // ramps with progress
          vx: (Math.random() - 0.5) * 70,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 6
        });
      }

      function msSurvived() {
        return Math.round(elapsed * 1000);
      }

      function die() {
        over = true;
        drag = null;
        AudioFX.lose();
        const ms = msSurvived();
        App.recordResult(false, ms);
        setStatus("Hit! You survived " + elapsed.toFixed(1) + "s — tap or R to retry", "lose");
        if (ms > best) {
          best = ms;
          Storage.setBest("dodgeballgame", ms);
          bestEl.textContent = fmtBest();
          App.toast("New best: " + elapsed.toFixed(1) + "s", "success");
        }
      }

      function survive() {
        over = true;
        drag = null;
        AudioFX.win();
        App.recordResult(true, msSurvived());
        setStatus("You made it — 30 seconds survived!", "win");
        if (best < 30000) {
          best = 30000;
          Storage.setBest("dodgeballgame", best);
          bestEl.textContent = fmtBest();
        }
      }

      function update(dt) {
        if (over) return;
        elapsed += dt;
        if (elapsed >= TOTAL) {
          elapsed = TOTAL;
          survive();
          return;
        }
        const prog = Math.min(1, elapsed / TOTAL);
        // player movement: keys first, otherwise ease toward drag target
        let vx = 0, vy = 0;
        if (leftDown) vx -= 1;
        if (rightDown) vx += 1;
        if (upDown) vy -= 1;
        if (downDown) vy += 1;
        if (vx || vy) {
          const n = Math.hypot(vx, vy);
          player.x += vx / n * KEY_SPEED * dt;
          player.y += vy / n * KEY_SPEED * dt;
        } else if (drag) {
          const ddx = drag.x - player.x, ddy = drag.y - player.y;
          const d = Math.hypot(ddx, ddy);
          const mv = Math.min(d, DRAG_SPEED * dt);
          if (d > 0.5) {
            player.x += ddx / d * mv;
            player.y += ddy / d * mv;
          }
        }
        player.x = Math.max(PLAYER_R, Math.min(W - PLAYER_R, player.x));
        player.y = Math.max(PLAYER_R, Math.min(H - PLAYER_R, player.y));
        if (player.blink > 0) player.blink -= dt;
        // spawn timing: 1 every 1.2s at the start, ramping to 0.4s
        spawnAcc += dt;
        const interval = Math.max(0.4, 1.2 - 0.8 * prog);
        if (spawnAcc >= interval) {
          spawnAcc -= interval;
          spawnBall(prog);
        }
        // balls
        for (let i = balls.length - 1; i >= 0; i--) {
          const b = balls[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot += b.vr * dt;
          if (b.x < b.r) {
            b.x = b.r;
            b.vx = Math.abs(b.vx);
          } else if (b.x > W - b.r) {
            b.x = W - b.r;
            b.vx = -Math.abs(b.vx);
          }
          if (b.y - b.r > H) {
            balls.splice(i, 1);
            dodged++;
            dodgedEl.textContent = dodged;
            continue;
          }
          const ddx = b.x - player.x, ddy = b.y - player.y;
          const rr = b.r + PLAYER_R - 1; // small forgiveness
          if (ddx * ddx + ddy * ddy < rr * rr) {
            die();
            return;
          }
        }
        timeEl.textContent = (TOTAL - elapsed).toFixed(1) + "s";
      }

      function drawBall(b) {
        c.save();
        c.translate(b.x, b.y);
        c.rotate(b.rot);
        c.fillStyle = "#f1f5f9";
        c.beginPath();
        c.arc(0, 0, b.r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#ef4444";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(-b.r * 0.45, 0, b.r * 0.75, -0.9, 0.9);
        c.stroke();
        c.beginPath();
        c.arc(b.r * 0.45, 0, b.r * 0.75, Math.PI - 0.9, Math.PI + 0.9);
        c.stroke();
        c.restore();
      }

      function render() {
        c.fillStyle = BG;
        c.fillRect(0, 0, W, H);
        // subtle background stripes for depth
        c.fillStyle = "rgba(148,163,184,0.05)";
        for (let x = 0; x < W; x += 45) c.fillRect(x, 0, 1, H);
        // danger zone tint at the top (spawn area)
        c.fillStyle = "rgba(239,68,68,0.06)";
        c.fillRect(0, 0, W, 24);
        for (const b of balls) drawBall(b);
        // player: cyan blob with worried eyes
        c.fillStyle = "#22d3ee";
        c.beginPath();
        c.arc(player.x, player.y, PLAYER_R, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#0f172a";
        c.beginPath();
        c.arc(player.x - 3.5, player.y - 3, 2, 0, Math.PI * 2);
        c.arc(player.x + 3.5, player.y - 3, 2, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#0f172a";
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(player.x, player.y + 3.5, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
        if (over) {
          c.fillStyle = "rgba(2,6,23,0.6)";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#e2e8f0";
          c.textAlign = "center";
          c.font = "bold 24px monospace";
          c.fillText(elapsed >= TOTAL ? "SURVIVED!" : "GAME OVER", W / 2, H / 2 - 12);
          c.font = "14px monospace";
          c.fillStyle = "#94a3b8";
          c.fillText("survived " + elapsed.toFixed(1) + "s — tap or R to retry", W / 2, H / 2 + 14);
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

      function toCanvas(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return {x: player.x, y: player.y};
        return {
          x: (clientX - rect.left) * (W / rect.width),
          y: (clientY - rect.top) * (H / rect.height)
        };
      }

      function onPointerDown(e) {
        if (over) {
          reset();
          return;
        }
        drag = toCanvas(e.clientX, e.clientY);
      }

      function onPointerMove(e) {
        if (drag && !over) drag = toCanvas(e.clientX, e.clientY);
      }

      function onPointerUp() {
        drag = null;
      }

      function onTouchStart(e) {
        if (over) {
          reset();
          return;
        }
        if (e.touches && e.touches.length) {
          e.preventDefault();
          drag = toCanvas(e.touches[0].clientX, e.touches[0].clientY);
        }
      }

      function onTouchMove(e) {
        if (drag && !over && e.touches && e.touches.length) {
          e.preventDefault();
          drag = toCanvas(e.touches[0].clientX, e.touches[0].clientY);
        }
      }

      function onKey(e) {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") leftDown = true;
        else if (k === "ArrowRight" || k === "d" || k === "D") rightDown = true;
        else if (k === "ArrowUp" || k === "w" || k === "W") upDown = true;
        else if (k === "ArrowDown" || k === "s" || k === "S") downDown = true;
        else if (k === "r" || k === "R") reset();
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(k)) e.preventDefault();
      }

      function onKeyUp(e) {
        const k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") leftDown = false;
        else if (k === "ArrowRight" || k === "d" || k === "D") rightDown = false;
        else if (k === "ArrowUp" || k === "w" || k === "W") upDown = false;
        else if (k === "ArrowDown" || k === "s" || k === "S") downDown = false;
      }

      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      canvas.addEventListener("touchstart", onTouchStart, {passive: false});
      canvas.addEventListener("touchmove", onTouchMove, {passive: false});
      root.querySelector("#dg-new").addEventListener("click", reset);

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        canvas.removeEventListener("touchstart", onTouchStart);
        canvas.removeEventListener("touchmove", onTouchMove);
      };
    },
    help: function () {
      App.showModal("How to play Dodge Ball",
        `Balls drop from the top of the field. Your little cyan dodger must survive a full <b>30 seconds</b> without touching a single one.
        <br><br>• Balls spawn about <b>once every 1.2s</b> at the start, ramping up to <b>every 0.4s</b> — and they fall faster as time passes.
        <br>• One touch = game over. Your score is how long you survived.
        <br><br>Controls: <b>arrow keys</b> / <b>WASD</b> to move in any direction, or <b>drag</b> on the field and the dodger follows your finger.
        <br><b>R</b> or the Restart button starts over.`);
    },
  });
})();
