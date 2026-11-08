/* Jump Catch — time your jumps to snatch coins flying past at three heights.
   Gravity + jump impulse, 30-second run, coin pops with a stretchy two-frame character. */
(function () {
  "use strict";
  const W = 360, H = 420;
  const GROUND = H - 46;
  const GRAV = 1650, JUMP_V = 660;
  const CATCH_R = 15;                       // player catch circle radius
  const HEIGHTS = [GROUND - 52, GROUND - 95, GROUND - 138]; // low / mid / high lanes
  const TOTAL = 30;
  const BG = "#0f172a";

  GameRegistry.register({
    id: "jumpcatchgame",
    name: "Jump Catch",
    icon: "🦘",
    category: "arcade",
    description: "Time your jumps to grab coins flying past at three heights — 30 seconds",
    tags: ["arcade", "timing", "jump", "reflex", "coins"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true, raf = 0, last = 0;
      let player, coins, pops, score, timeLeft, over, spawnAcc, nextSpawn;
      let best = Storage.getBest("jumpcatchgame") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Coins</div><div class="val" id="jc-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="jc-time">${TOTAL.toFixed(1)}s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="jc-best">${best}</div></div>
        </div>
        <div class="status info" id="jc-status">Jump (Space / tap) to grab the flying coins!</div>
        <div class="center"><div class="snake-wrap"><canvas id="jc-canvas" width="${W}" height="${H}" class="game-canvas"></canvas></div></div>
        <div class="row" style="justify-content:center;margin-top:12px;">
          <button class="btn primary" id="jc-jump" type="button" style="min-width:160px;">JUMP</button>
          <button class="btn" id="jc-new" type="button">Restart</button>
        </div>
        <p class="hint"><b>Space</b> / <b>↑</b> / tap the field / JUMP button to leap. High coins need a full jump. <b>R</b> restarts.</p>
      `;
      const canvas = root.querySelector("#jc-canvas");
      const c = canvas.getContext("2d");
      const statusEl = root.querySelector("#jc-status");
      const scoreEl = root.querySelector("#jc-score");
      const timeEl = root.querySelector("#jc-time");
      const bestEl = root.querySelector("#jc-best");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function reset() {
        player = {x: 84, y: GROUND, vy: 0, grounded: true, squash: 0};
        coins = [];
        pops = [];
        score = 0;
        timeLeft = TOTAL;
        over = false;
        spawnAcc = 0;
        nextSpawn = 0.8;
        setStatus("Jump (Space / tap) to grab the flying coins!");
        scoreEl.textContent = "0";
        timeEl.textContent = TOTAL.toFixed(1) + "s";
      }

      function jump() {
        if (over) {
          reset();
          return;
        }
        if (player.grounded) {
          player.vy = -JUMP_V;
          player.grounded = false;
          AudioFX.move();
        }
      }

      function spawnCoin() {
        const lane = Math.floor(Math.random() * HEIGHTS.length);
        const ramp = 40 * (1 - timeLeft / TOTAL); // slightly faster late-game
        coins.push({
          x: W + 14,
          y: HEIGHTS[lane],
          vx: -(175 + Math.random() * 75 + ramp),
          spin: Math.random() * Math.PI * 2
        });
      }

      function end() {
        over = true;
        App.recordResult(score > 0, score);
        if (score > best) {
          best = score;
          Storage.setBest("jumpcatchgame", score);
          bestEl.textContent = best;
        }
        let msg, kind;
        if (score >= 20) {
          msg = "Amazing! " + score + " coins";
          kind = "success";
        } else if (score >= 10) {
          msg = "Great run — " + score + " coins!";
          kind = "success";
        } else if (score >= 1) {
          msg = "Good — " + score + " coin" + (score === 1 ? "" : "s") + ". Aim for 10!";
          kind = "info";
        } else {
          msg = "No coins caught — try again!";
          kind = "warning";
        }
        App.toast(msg, kind);
        if (score > 0) {
          AudioFX.win();
          setStatus("Time! You caught " + score + " coin" + (score === 1 ? "" : "s"), "win");
        } else {
          AudioFX.lose();
          setStatus("Time! No coins — tap or R to try again", "lose");
        }
      }

      function update(dt) {
        if (over) return;
        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          timeEl.textContent = "0.0s";
          end();
          return;
        }
        timeEl.textContent = timeLeft.toFixed(1) + "s";
        // player physics
        if (!player.grounded) {
          player.vy += GRAV * dt;
          player.y += player.vy * dt;
          if (player.y >= GROUND) {
            player.y = GROUND;
            player.vy = 0;
            player.grounded = true;
            player.squash = 0.16; // landing squash frame
          }
        }
        if (player.squash > 0) player.squash -= dt;
        // coin spawning at random intervals
        spawnAcc += dt;
        if (spawnAcc >= nextSpawn) {
          spawnAcc = 0;
          nextSpawn = 0.75 + Math.random() * 0.8;
          spawnCoin();
        }
        // coins + catch checks
        const pcx = player.x, pcy = player.y - 20; // player body center
        for (let i = coins.length - 1; i >= 0; i--) {
          const co = coins[i];
          co.x += co.vx * dt;
          co.spin += dt * 9;
          if (co.x < -16) {
            coins.splice(i, 1);
            continue;
          } // missed coins just pass
          const ddx = co.x - pcx, ddy = co.y - pcy;
          if (ddx * ddx + ddy * ddy < (CATCH_R + 9) * (CATCH_R + 9)) {
            coins.splice(i, 1);
            score++;
            scoreEl.textContent = score;
            AudioFX.pop();
            pops.push({x: co.x, y: co.y, t: 0});
          }
        }
        // pop effects
        for (let i = pops.length - 1; i >= 0; i--) {
          pops[i].t += dt;
          if (pops[i].t > 0.6) pops.splice(i, 1);
        }
      }

      function render() {
        c.fillStyle = BG;
        c.fillRect(0, 0, W, H);
        // lane guides (subtle dotted lines at coin heights)
        c.fillStyle = "rgba(148,163,184,0.12)";
        for (const y of HEIGHTS) for (let x = 8; x < W; x += 22) c.fillRect(x, y, 8, 1);
        // ground
        c.fillStyle = "#1e293b";
        c.fillRect(0, GROUND, W, H - GROUND);
        c.fillStyle = "#334155";
        c.fillRect(0, GROUND, W, 3);
        // coins (spinning: horizontal squash for a 3D flip)
        for (const co of coins) {
          const rx = Math.max(2, Math.abs(Math.cos(co.spin)) * 9);
          c.fillStyle = "#fbbf24";
          c.beginPath();
          c.ellipse(co.x, co.y, rx, 9, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#b45309";
          c.lineWidth = 1.5;
          c.stroke();
          if (rx > 5) {
            c.fillStyle = "#fde68a";
            c.beginPath();
            c.ellipse(co.x, co.y, rx * 0.5, 4.5, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
        // pop effects: expanding ring + floating +1
        for (const p of pops) {
          const k = p.t / 0.6;
          c.strokeStyle = "rgba(251,191,36," + (1 - k) + ")";
          c.lineWidth = 2;
          c.beginPath();
          c.arc(p.x, p.y - k * 22, 8 + k * 16, 0, Math.PI * 2);
          c.stroke();
          c.fillStyle = "rgba(253,230,138," + (1 - k) + ")";
          c.font = "bold 13px monospace";
          c.textAlign = "center";
          c.fillText("+1", p.x, p.y - 26 - k * 22);
        }
        // character — two-frame: stretched while rising, squashed on landing
        const rising = !player.grounded && player.vy < -60;
        const stretch = rising ? 1.25 : (!player.grounded ? 1.08 : (player.squash > 0 ? 0.78 : 1));
        const bodyH = 34 * stretch, bodyW = 30 / Math.sqrt(stretch);
        const bcx = player.x, bcy = player.y - bodyH / 2;
        if (rising) { // motion streaks
          c.strokeStyle = "rgba(34,211,238,0.35)";
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(bcx - 8, bcy - bodyH / 2 - 6);
          c.lineTo(bcx - 8, bcy - bodyH / 2 - 16);
          c.moveTo(bcx + 8, bcy - bodyH / 2 - 6);
          c.lineTo(bcx + 8, bcy - bodyH / 2 - 16);
          c.stroke();
        }
        c.fillStyle = "#f472b6";
        c.beginPath();
        c.ellipse(bcx, bcy, bodyW / 2, bodyH / 2, 0, 0, Math.PI * 2);
        c.fill();
        // eyes look toward the nearest coin (or up when jumping)
        let lx = 0, ly = rising ? -2 : -1;
        let nearest = null, nd = Infinity;
        for (const co of coins) {
          const d = (co.x - bcx) * (co.x - bcx) + (co.y - bcy) * (co.y - bcy);
          if (co.x > bcx - 20 && d < nd) {
            nd = d;
            nearest = co;
          }
        }
        if (nearest) {
          const a = Math.atan2(nearest.y - bcy, nearest.x - bcx);
          lx = Math.cos(a) * 2;
          ly = Math.sin(a) * 2;
        }
        c.fillStyle = "#fff";
        c.beginPath();
        c.arc(bcx - 6, bcy - 4, 4.5, 0, Math.PI * 2);
        c.arc(bcx + 6, bcy - 4, 4.5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#0f172a";
        c.beginPath();
        c.arc(bcx - 6 + lx, bcy - 4 + ly, 2, 0, Math.PI * 2);
        c.arc(bcx + 6 + lx, bcy - 4 + ly, 2, 0, Math.PI * 2);
        c.fill();
        // little feet
        c.fillStyle = "#f472b6";
        c.beginPath();
        c.ellipse(bcx - 8, player.y + 2, 5, 3, 0, 0, Math.PI * 2);
        c.ellipse(bcx + 8, player.y + 2, 5, 3, 0, 0, Math.PI * 2);
        c.fill();
        if (over) {
          c.fillStyle = "rgba(2,6,23,0.6)";
          c.fillRect(0, 0, W, H);
          c.fillStyle = "#e2e8f0";
          c.textAlign = "center";
          c.font = "bold 24px monospace";
          c.fillText("TIME!", W / 2, H / 2 - 12);
          c.font = "14px monospace";
          c.fillStyle = "#94a3b8";
          c.fillText(score + " coins — tap or R to retry", W / 2, H / 2 + 14);
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
        if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
          e.preventDefault();
          jump();
        } else if (k === "r" || k === "R") reset();
        if (k === "ArrowUp") e.preventDefault();
      }

      function onPointerDown() {
        jump();
      }

      function onTouchStart(e) {
        e.preventDefault();
        jump();
      }

      document.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("touchstart", onTouchStart, {passive: false});
      root.querySelector("#jc-jump").addEventListener("click", jump);
      root.querySelector("#jc-new").addEventListener("click", reset);

      reset();
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("touchstart", onTouchStart);
      };
    },
    help: function () {
      App.showModal("How to play Jump Catch",
        `Coins fly in from the right at <b>three different heights</b> — low, middle and high.
        <br><br>• Your character can't walk — it can only <b>jump</b>. Time the leap so you overlap a coin mid-air.
        <br>• Caught coins pop for <b>+1</b>; missed ones simply fly past (no penalty).
        <br>• High coins need a full jump; low ones just a hop.
        <br>• <b>30 seconds</b> on the clock. Score = coins caught. 10+ is a great run, 20+ is amazing.
        <br><br>Controls: <b>Space</b>, <b>↑</b>, <b>W</b>, tap/click the field, or the big <b>JUMP</b> button. <b>R</b> restarts.`);
    },
  });
})();
