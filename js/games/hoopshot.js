/* Hoop Shot — set angle and power to sink the basket */
(function () {
  GameRegistry.register({
    id: "hoopshot",
    name: "Hoop Shot",
    icon: "🏀",
    category: "arcade",
    description: "Set angle and power to sink the basket",
    tags: ["arcade", "aim", "sports"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const W = 380, H = 400;
      let phase, ball, hoop, shots, score, best, raf, over, msg, aimOsc;
      best = Storage.getBest("hoopshot") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hs-score">0</div></div>
          <div class="score-cell"><div class="label">Shots</div><div class="val" id="hs-shots">10</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hs-best">0</div></div>
        </div>
        <div class="status info" id="hs-status">Step 1: click to set the ANGLE (bar at top). Step 2: click to set POWER.</div>
        <div class="center"><canvas id="hs-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Nothing but net! The hoop moves further away each round.</p>
      `;

      const canvas = root.querySelector("#hs-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hs-status");
      const startX = 60, startY = H - 50;
      let angle = 45, power = 0, t0 = 0;

      function reset() {
        shots = 10;
        score = 0;
        over = false;
        msg = null;
        hoop = {x: 300, y: 150};
        newShot();
      }

      function newShot() {
        phase = "angle";
        ball = null;
        t0 = performance.now();
        statusEl.textContent = "Step 1: click to set the ANGLE (bar at top). Step 2: click to set POWER.";
        statusEl.className = "status info";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#hs-score").textContent = score;
        root.querySelector("#hs-shots").textContent = shots;
        root.querySelector("#hs-best").textContent = best;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (over) {
          reset();
          return;
        }
        if (phase === "angle") {
          phase = "power";
          t0 = performance.now();
          AudioFX.click();
        } else if (phase === "power") {
          ball = {x: startX, y: startY, vx: Math.cos(angle) * power, vy: -Math.sin(angle) * power, trail: []};
          phase = "fly";
          AudioFX.pop();
        }
      });

      function tick(ts) {
        // oscillators
        if (phase === "angle") angle = 90 * (0.5 + 0.5 * Math.sin((ts - t0) / 600)); // 0..90 deg
        if (phase === "power") power = 3 + 9 * (0.5 + 0.5 * Math.sin((ts - t0) / 500)); // 3..12
        if (phase === "fly" && ball) {
          ball.vy += 0.16;
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.trail.push({x: ball.x, y: ball.y});
          if (ball.trail.length > 10) ball.trail.shift();
          // rim: two circles at hoop edges; net catch if between and falling
          const L = {x: hoop.x - 26, y: hoop.y}, R = {x: hoop.x + 26, y: hoop.y};
          for (const rim of [L, R]) {
            const d = Math.hypot(ball.x - rim.x, ball.y - rim.y);
            if (d < 8) {
              // bounce off rim
              const nx = (ball.x - rim.x) / d, ny = (ball.y - rim.y) / d;
              const sp = Math.hypot(ball.vx, ball.vy) * 0.55;
              ball.vx = nx * sp;
              ball.vy = -Math.abs(ny * sp);
              ball.x = rim.x + nx * 9;
              ball.y = rim.y + ny * 9;
              AudioFX.error();
            }
          }
          if (ball.vy > 0 && ball.y > hoop.y && ball.y < hoop.y + 14 && ball.x > L.x + 8 && ball.x < R.x - 8) {
            score += 10;
            msg = "SWISH! +10";
            AudioFX.win();
            finishShot();
          } else if (ball.y > H + 20 || ball.x > W + 30 || ball.x < -30) {
            msg = "Miss…";
            AudioFX.lose();
            finishShot();
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function finishShot() {
        shots--;
        hoop.x = 250 + Math.random() * 100;
        hoop.y = 120 + Math.random() * 60;
        if (shots <= 0) {
          over = true;
          statusEl.textContent = `Final score: ${score} / 100`;
          statusEl.className = "status " + (score >= 50 ? "win" : "lose");
          if (score > best) {
            best = score;
            Storage.setBest("hoopshot", best);
            App.toast("New best: " + best, "success");
          }
        } else {
          after(() => {
            msg = null;
            if (!over) newShot();
          }, 600);
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim();
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const accent2 = st.getPropertyValue("--accent-2").trim() || "#ec4899";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // court
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(0, H - 30, W, 30);
        // angle bar
        if (phase === "angle") {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(10, 12, 160, 12);
          ctx.fillStyle = accent;
          ctx.fillRect(10, 12, 160 * (angle / 90), 12);
          ctx.fillStyle = text;
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("ANGLE " + Math.round(angle) + "°", 12, 38);
          // guide
          ctx.strokeStyle = accent;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + Math.cos(angle * Math.PI / 180) * 90, startY - Math.sin(angle * Math.PI / 180) * 90);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        if (phase === "power") {
          ctx.fillStyle = "rgba(0,0,0,0.25)";
          ctx.fillRect(10, 12, 160, 12);
          ctx.fillStyle = accent2;
          ctx.fillRect(10, 12, 160 * ((power - 3) / 9), 12);
          ctx.fillStyle = text;
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("POWER " + power.toFixed(1), 12, 38);
          ctx.strokeStyle = accent;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(startX + Math.cos(angle * Math.PI / 180) * (power * 9), startY - Math.sin(angle * Math.PI / 180) * (power * 9));
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // hoop: backboard, rim, net — backboard follows theme text so it reads on the soft canvas
        ctx.fillStyle = text;
        ctx.fillRect(hoop.x + 26, hoop.y - 46, 6, 52);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(hoop.x - 26, hoop.y);
        ctx.lineTo(hoop.x + 26, hoop.y);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
          const x = hoop.x - 26 + i * 13;
          ctx.moveTo(x, hoop.y);
          ctx.lineTo(hoop.x + (i - 2) * 6, hoop.y + 22);
        }
        ctx.stroke();
        // player
        ctx.fillStyle = accent2;
        ctx.beginPath();
        ctx.arc(startX, startY - 22, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(startX - 6, startY - 14, 12, 14);
        // ball
        if (ball) {
          if (ball.trail.length > 1) {
            ctx.strokeStyle = "rgba(200,140,60,0.5)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ball.trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y));
            ctx.stroke();
          }
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
          ctx.moveTo(ball.x - 8, ball.y);
          ctx.lineTo(ball.x + 8, ball.y);
          ctx.moveTo(ball.x, ball.y - 8);
          ctx.lineTo(ball.x, ball.y + 8);
          ctx.stroke();
        }
        if (msg) {
          ctx.fillStyle = msg.startsWith("SWISH") ? "#16a34a" : "#dc2626";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(msg, W / 2, 90);
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game over", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to play again", W / 2, H / 2 + 26);
        }
      }

      reset();
      raf = requestAnimationFrame(tick);
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Hoop Shot",
        `Click once to lock the <b>angle</b> (it swings back and forth), click again to lock the <b>power</b> (the bar pulses).
        <br><br>Make the basket — pure net is <b>+10</b>. Rim bounces are live physics, so lucky rolls count too.
        10 shots per round; the hoop teleports after each one.`);
    },
  });
})();
