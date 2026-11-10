/* Paper Toss — throw paper into the bin, mind the wind */
(function () {
  GameRegistry.register({
    id: "papertoss",
    name: "Paper Toss",
    icon: "🗑️",
    category: "arcade",
    description: "Arc your throw into the bin — the fan changes the wind",
    tags: ["arcade", "aim", "physics"],
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
      const W = 340, H = 420;
      let ball, aiming, aimAngle, aimPower, wind, throwsLeft, score, best, raf, over, resultFlash;
      best = Storage.getBest("papertoss") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="pt-score">0</div></div>
          <div class="score-cell"><div class="label">Throws</div><div class="val" id="pt-throws">10</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pt-best">0</div></div>
          <div class="score-cell"><div class="label">Wind</div><div class="val" id="pt-wind">0</div></div>
        </div>
        <div class="status info" id="pt-status">Drag back from the paper and release to throw</div>
        <div class="center"><canvas id="pt-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Fan wind pushes the ball sideways — check the arrow before you throw.</p>
      `;

      const canvas = root.querySelector("#pt-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#pt-status");
      const startX = 60, startY = H - 60;
      const bin = {x: 0, w: 56}; // bin.x randomized each throw

      function reset() {
        score = 0;
        throwsLeft = 10;
        over = false;
        resultFlash = null;
        newThrow();
        updateHud();
      }

      function newThrow() {
        ball = {x: startX, y: startY, vx: 0, vy: 0, flying: false, trail: []};
        aiming = false;
        aimAngle = -0.7;
        aimPower = 0;
        bin.x = 150 + Math.random() * (W - 220);
        wind = (Math.random() * 2 - 1) * 0.06;
        updateHud();
      }

      function updateHud() {
        root.querySelector("#pt-score").textContent = score;
        root.querySelector("#pt-throws").textContent = throwsLeft;
        root.querySelector("#pt-best").textContent = best;
        const windEl = root.querySelector("#pt-wind");
        windEl.textContent = (wind > 0 ? "→ " : "← ") + Math.abs(wind * 100).toFixed(0);
      }

      function launch(vx, vy) {
        ball.flying = true;
        ball.vx = vx;
        ball.vy = vy;
        AudioFX.pop();
      }

      function tick() {
        if (ball.flying && !over) {
          ball.vy += 0.18;          // gravity
          ball.vx += wind * 2.2;    // wind
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.trail.push({x: ball.x, y: ball.y});
          if (ball.trail.length > 14) ball.trail.shift();
          // bin check: opening between bin.x..bin.x+bin.w at rim height
          const rimY = H - 105;
          if (ball.vy > 0 && ball.y >= rimY && ball.y <= rimY + 18 &&
            ball.x > bin.x + 6 && ball.x < bin.x + bin.w - 6) {
            score += 10;
            resultFlash = {msg: "SWISH! +10", ok: true};
            AudioFX.win();
            nextThrow();
          } else if (ball.y > H - 8 || ball.x < -30 || ball.x > W + 30) {
            resultFlash = {msg: "Miss…", ok: false};
            AudioFX.error();
            nextThrow();
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function nextThrow() {
        throwsLeft--;
        if (throwsLeft <= 0) {
          over = true;
          statusEl.textContent = `Out of throws — final score ${score}`;
          statusEl.className = "status " + (score >= 50 ? "win" : "lose");
          if (score > best) {
            best = score;
            Storage.setBest("papertoss", best);
            App.toast("New best: " + best, "success");
          }
        }
        after(() => {
          if (!over) newThrow(); else {
            resultFlash = null;
          }
        }, 500);
        if (over) { /* keep flash briefly */
          after(() => resultFlash = null, 600);
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#ddd";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const accent2 = st.getPropertyValue("--accent-2").trim() || "#ec4899";
        const text = st.getPropertyValue("--text").trim() || "#222";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // fan
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(W - 52, 60, 30, 46);
        ctx.fillStyle = "#64748b";
        ctx.save();
        ctx.translate(W - 37, 74);
        ctx.rotate(Date.now() / 120);
        for (let i = 0; i < 3; i++) {
          ctx.rotate(Math.PI * 2 / 3);
          ctx.fillRect(-3, -12, 6, 12);
        }
        ctx.restore();
        // wind arrow
        ctx.fillStyle = accent2;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        const wl = Math.abs(wind) * 300;
        ctx.fillRect(W / 2 - (wind > 0 ? 0 : wl), 30, wl, 4);
        ctx.beginPath();
        const tipX = W / 2 + (wind > 0 ? wl : -wl);
        ctx.moveTo(tipX + (wind > 0 ? 10 : -10), 32);
        ctx.lineTo(tipX, 24);
        ctx.lineTo(tipX, 40);
        ctx.closePath();
        ctx.fill();
        // ground
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, H - 20, W, 20);
        // bin — fixed mid-grays read on both light and dark canvases
        ctx.fillStyle = "#64748b";
        ctx.beginPath();
        ctx.moveTo(bin.x, H - 100);
        ctx.lineTo(bin.x + bin.w, H - 100);
        ctx.lineTo(bin.x + bin.w - 7, H - 18);
        ctx.lineTo(bin.x + 7, H - 18);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(bin.x - 4, H - 106, bin.w + 8, 8);
        // aim indicator
        if (aiming && !ball.flying) {
          const ex = startX + Math.cos(aimAngle) * aimPower * 120;
          const ey = startY + Math.sin(aimAngle) * aimPower * 120;
          ctx.strokeStyle = accent;
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // trail + ball
        if (ball.trail.length) {
          ctx.strokeStyle = "rgba(120,120,120,0.5)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ball.trail.forEach((t, i) => i ? ctx.lineTo(t.x, t.y) : ctx.moveTo(t.x, t.y));
          ctx.stroke();
        }
        if (!over || ball.flying) {
          ctx.save();
          ctx.translate(ball.x, ball.y);
          ctx.rotate(ball.x / 18);
          // paper ball follows theme text so it is visible on any canvas
          ctx.fillStyle = text;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#94a3b8";
          ctx.stroke();
          ctx.restore();
        }
        if (resultFlash) {
          ctx.fillStyle = resultFlash.ok ? "#16a34a" : "#dc2626";
          ctx.font = "bold 26px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(resultFlash.msg, W / 2, 140);
        }
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };
      const down = (e) => {
        if (over || ball.flying) return;
        aiming = true;
        const p = pos(e);
        aimAngle = Math.atan2(p.y - startY, p.x - startX);
        aimPower = Math.max(0, Math.min(1, Math.hypot(p.x - startX, p.y - startY) / 120));
      };
      const move = (e) => {
        if (!aiming) return;
        e.preventDefault();
        const p = pos(e);
        aimAngle = Math.atan2(p.y - startY, p.x - startX);
        aimPower = Math.max(0, Math.min(1, Math.hypot(p.x - startX, p.y - startY) / 120));
      };
      const up = () => {
        if (!aiming) return;
        aiming = false;
        const pw = 4 + aimPower * 9;
        launch(Math.cos(aimAngle) * pw, Math.sin(aimAngle) * pw);
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);

      const onKey = (e) => {
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);

      reset();
      tick();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Paper Toss",
        `<b>Drag</b> away from the paper ball and release — the throw follows the drag direction and length (like a slingshot).
        <br><br>The office fan creates <b>wind</b> shown at the top: aim upwind to compensate. The bin moves after every throw.
        Each basket is <b>+10</b>. You get <b>10 throws</b>. <b>R</b> restarts after the round.`);
    },
  });
})();
