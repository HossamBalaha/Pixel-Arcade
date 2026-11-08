/* spaceinvaders — real arcade classic: marching alien formation, shoot, survive. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "spaceinvaders", name: "Space Invaders", icon: "👾", category: "arcade",
    description: "Blast the marching alien formation before it lands", tags: ["arcade", "shooter", "classic"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      const W = 360, H = 440, CW = 32, CH = 26;
      root.innerHTML = `
        <style>#si-c { display:block; margin:0 auto; background:#020617; border-radius:12px; touch-action:none; }</style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="si-sc">0</div></div>
          <div class="score-cell"><div class="label">Wave</div><div class="val" id="si-wv">1</div></div>
          <div class="score-cell"><div class="label">Lives</div><div class="val" id="si-lv">❤️❤️❤️</div></div>
        </div>
        <div class="status info" id="si-status">Wave 1</div>
        <canvas id="si-c" width="${W}" height="${H}"></canvas>
        <p class="hint" style="text-align:center;">◀ ▶ / drag to move · Space / tap to fire</p>
      `;
      const cv = root.querySelector("#si-c");
      const g = cv.getContext("2d");
      let px = W / 2, keys = {}, shots = [], bombs = [];
      let aliens = [], dir = 1, alienTimer = 0, fireTimer = 0, raf = null, last = 0;
      let score = 0, lives = 3, wave = 1, over = false;

      function spawnWave() {
        aliens = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++)
          aliens.push({x: 34 + c * 38, y: 40 + r * 32, alive: true, row: r});
        dir = 1;
        setStatus("Wave " + wave);
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#si-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function update(dt) {
        if (over) return;
        // player
        if (keys.ArrowLeft) px -= 240 * dt;
        if (keys.ArrowRight) px += 240 * dt;
        px = Math.max(18, Math.min(W - 18, px));
        // shots
        for (const s of shots) s.y -= 420 * dt;
        shots = shots.filter(s => s.y > -10);
        // alien march
        alienTimer += dt;
        const speed = Math.max(0.06, 0.42 - wave * 0.03 - (32 - aliens.filter(a => a.alive).length) * 0.006);
        if (alienTimer > speed) {
          alienTimer = 0;
          let hitEdge = false;
          for (const a of aliens) if (a.alive && ((dir > 0 && a.x > W - 40) || (dir < 0 && a.x < 40))) hitEdge = true;
          if (hitEdge) {
            dir *= -1;
            for (const a of aliens) a.y += 18;
          } else for (const a of aliens) a.x += dir * 10;
          AudioFX.click();
        }
        // alien fire
        fireTimer += dt;
        if (fireTimer > Math.max(0.35, 1.2 - wave * 0.08)) {
          fireTimer = 0;
          const live = aliens.filter(a => a.alive);
          if (live.length) {
            const a = live[Math.floor(Math.random() * live.length)];
            bombs.push({x: a.x, y: a.y + 12});
          }
        }
        for (const b of bombs) b.y += 190 * dt;
        bombs = bombs.filter(b => b.y < H + 10);
        // collisions
        for (const s of shots) {
          for (const a of aliens) {
            if (a.alive && Math.abs(s.x - a.x) < 16 && Math.abs(s.y - a.y) < 13) {
              a.alive = false;
              s.y = -99;
              score += (4 - a.row) * 10;
              AudioFX.pop();
            }
          }
        }
        for (const b of bombs) {
          if (Math.abs(b.x - px) < 16 && b.y > H - 40) {
            b.y = H + 99;
            lives--;
            AudioFX.error();
            const lv = root.querySelector("#si-lv");
            if (lv) lv.textContent = "❤️".repeat(Math.max(0, lives));
            if (lives <= 0) end(false);
          }
        }
        // aliens reach bottom?
        if (aliens.some(a => a.alive && a.y > H - 52)) end(false);
        if (!aliens.some(a => a.alive)) {
          wave++;
          const wv = root.querySelector("#si-wv");
          if (wv) wv.textContent = wave;
          spawnWave();
        }
        const sc = root.querySelector("#si-sc");
        if (sc) sc.textContent = score;
      }

      function end(win) {
        over = true;
        setStatus(win ? "🎉 Cleared!" : "💥 Game over — score " + score, win ? "win" : "lose");
        if (win) AudioFX.win(); else AudioFX.lose();
        App.recordResult(win, score);
      }

      function draw() {
        g.fillStyle = "#020617";
        g.fillRect(0, 0, W, H);
        // stars
        g.fillStyle = "#334155";
        for (let i = 0; i < 24; i++) g.fillRect((i * 97) % W, (i * 61) % H, 2, 2);
        // aliens
        g.font = "20px sans-serif";
        g.textAlign = "center";
        const faces = ["👽", "👾", "🤖", "🐙"];
        for (const a of aliens) if (a.alive) g.fillText(faces[a.row], a.x, a.y + 7);
        // player
        g.font = "22px sans-serif";
        g.fillText("🚀", px, H - 22);
        // shots & bombs
        g.fillStyle = "#4ade80";
        for (const s of shots) g.fillRect(s.x - 1.5, s.y - 8, 3, 10);
        g.fillStyle = "#f87171";
        for (const b of bombs) g.fillRect(b.x - 1.5, b.y, 3, 9);
        g.fillStyle = "#475569";
        g.fillRect(0, H - 8, W, 8);
      }

      function loop(t) {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
        last = t;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
      }

      function onKey(e, down) {
        if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
          e.preventDefault();
          keys[e.key] = down;
          if (e.key === " " && down && !over && shots.length < 3) {
            shots.push({x: px, y: H - 40});
            AudioFX.click();
          }
        }
      }

      const kd = e => onKey(e, true), ku = e => onKey(e, false);
      document.addEventListener("keydown", kd);
      document.addEventListener("keyup", ku);
      let dragX = null;
      cv.addEventListener("pointerdown", e => {
        dragX = e.offsetX;
        if (!over && shots.length < 3) {
          shots.push({x: px, y: H - 40});
          AudioFX.click();
        }
      });
      cv.addEventListener("pointermove", e => {
        if (dragX !== null) {
          px = Math.max(18, Math.min(W - 18, e.offsetX));
        }
      });
      cv.addEventListener("pointerup", () => {
        dragX = null;
      });

      spawnWave();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", kd);
        document.removeEventListener("keyup", ku);
      };
    },
    help: function () {
      App.showModal("How to play Space Invaders",
        "Move with ◀ ▶ (or drag) and fire with Space (or tap)." +
        "<br>The alien formation marches side to side and drops lower each edge — shoot them all before they land." +
        "<br>Red bombs end a life ❤️. Each wave gets faster; higher rows score more.");
    },
  });
})();
