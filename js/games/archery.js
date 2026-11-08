/* Archery — compensate for wind and distance to hit the gold */
(function () {
  GameRegistry.register({
    id: "archery",
    name: "Archery",
    icon: "🏹",
    category: "arcade",
    description: "Compensate for wind and distance to hit the gold",
    tags: ["arcade", "aim", "precision"],
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
      const W = 380, H = 300;
      let phase, angle, power, arrow, dist, wind, arrows, score, best, raf, over, msg, t0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ar-score">0</div></div>
          <div class="score-cell"><div class="label">Arrows</div><div class="val" id="ar-arrows">9</div></div>
          <div class="score-cell"><div class="label">Dist</div><div class="val" id="ar-dist">40m</div></div>
          <div class="score-cell"><div class="label">Wind</div><div class="val" id="ar-wind">→2</div></div>
        </div>
        <div class="status info" id="ar-status">Click to lock angle, again for power — mind the wind</div>
        <div class="center"><canvas id="ar-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Gold = 50 · Red = 30 · Blue = 20 · White = 10. Target distance changes each arrow.</p>
      `;

      const canvas = root.querySelector("#ar-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#ar-status");
      best = Storage.getBest("archery") || 0;
      const bx = 60, by = H - 40;

      function newArrow() {
        phase = "angle";
        arrow = null;
        msg = null;
        t0 = performance.now();
        dist = 35 + Math.floor(Math.random() * 45); // meters
        wind = Math.floor(Math.random() * 7) - 3;
        updateHud();
        statusEl.textContent = `Target at ${dist}m — click to lock angle, then power`;
        statusEl.className = "status info";
      }

      function reset() {
        arrows = 9;
        score = 0;
        over = false;
        newArrow();
      }

      function updateHud() {
        root.querySelector("#ar-score").textContent = score;
        root.querySelector("#ar-arrows").textContent = arrows;
        root.querySelector("#ar-dist").textContent = dist + "m";
        root.querySelector("#ar-wind").textContent = (wind > 0 ? "→" : wind < 0 ? "←" : "") + Math.abs(wind);
      }

      canvas.addEventListener("pointerdown", () => {
        if (over) {
          reset();
          return;
        }
        if (phase === "angle") {
          phase = "power";
          t0 = performance.now();
          AudioFX.click();
        } else if (phase === "power") {
          const a = angle * Math.PI / 180;
          arrow = {x: bx, y: by, vx: Math.cos(a) * power, vy: -Math.sin(a) * power, stuck: null};
          phase = "fly";
          AudioFX.pop();
        }
      });

      function tick(ts) {
        if (phase === "angle") angle = 10 + 70 * (0.5 + 0.5 * Math.sin((ts - t0) / 650));
        if (phase === "power") power = 7 + 9 * (0.5 + 0.5 * Math.sin((ts - t0) / 520));
        if (phase === "fly" && arrow) {
          arrow.vy += 0.13;
          arrow.vx += wind * 0.016;
          arrow.x += arrow.vx;
          arrow.y += arrow.vy;
          // target occupies x ~ 300..320 at various y depending on distance (farther = higher on screen = smaller)
          const tx = 300, th = 84 - dist * 0.55; // target height shrinks with distance
          const ty = by - 20 - (dist - 35) * 2.4;
          if (arrow.x >= tx - 4 && arrow.x <= tx + 24 && !arrow.stuck) {
            const rel = (by - arrow.y) / (by - ty); // 0 ground .. 1 target center
            if (arrow.y < ty + th / 2 && arrow.y > ty - th / 2) {
              const d = Math.abs(arrow.y - ty) / (th / 2);
              const pts = d < 0.18 ? 50 : d < 0.45 ? 30 : d < 0.75 ? 20 : 10;
              score += pts;
              arrow.stuck = {pts, x: arrow.x, y: arrow.y};
              msg = `+${pts}${pts === 50 ? " — GOLD!" : ""}`;
              AudioFX.win();
              finishArrow();
            } else if (arrow.y >= ty + th / 2) {
              arrow.stuck = {pts: 0, x: arrow.x, y: ty + th / 2};
              msg = "Hit the frame…";
              AudioFX.error();
              finishArrow();
            }
          }
          if (arrow.y > by || arrow.x > W + 20) {
            msg = "Missed!";
            AudioFX.lose();
            arrow.stuck = {pts: 0, x: Math.min(arrow.x, W - 8), y: Math.min(arrow.y, by)};
            finishArrow();
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function finishArrow() {
        arrows--;
        updateHud();
        if (arrows <= 0) {
          over = true;
          statusEl.textContent = `Round over — ${score} points`;
          statusEl.className = "status " + (score >= 250 ? "win" : "lose");
          if (score > best) {
            best = score;
            Storage.setBest("archery", score);
            App.toast("New best: " + score, "success");
          }
        } else {
          after(() => {
            if (!over) newArrow();
          }, 700);
        }
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#0e7490";
        ctx.fillRect(0, 0, W, H);
        // sky gradient effect + sun
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(320, 50, 24, 0, Math.PI * 2);
        ctx.fill();
        // ground
        ctx.fillStyle = "#166534";
        ctx.fillRect(0, by, W, H - by);
        // wind flag
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, 40);
        ctx.lineTo(W / 2, 72);
        ctx.stroke();
        ctx.fillStyle = wind === 0 ? "#94a3b8" : wind > 0 ? "#22c55e" : "#ef4444";
        const fw = Math.min(34, Math.abs(wind) * 8);
        ctx.beginPath();
        ctx.moveTo(W / 2, 42);
        ctx.lineTo(W / 2 + (wind >= 0 ? fw : -fw), 50);
        ctx.lineTo(W / 2, 58);
        ctx.closePath();
        ctx.fill();
        // target
        const th = 84 - dist * 0.55;
        const ty = by - 20 - (dist - 35) * 2.4;
        const tx = 300;
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(tx + 14, ty + th / 2);
        ctx.lineTo(tx + 14, by);
        ctx.stroke();
        const rings = [[1, "#e2e8f0"], [0.75, "#3b82f6"], [0.5, "#dc2626"], [0.22, "#fcd34d"]];
        for (const [rr, c] of rings) {
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.ellipse(tx, ty, th * 0.14, th / 2 * rr, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // aim indicators
        if (phase === "angle" || phase === "power") {
          const a = angle * Math.PI / 180;
          ctx.strokeStyle = phase === "angle" ? accent : "#fcd34d";
          ctx.setLineDash([5, 6]);
          ctx.lineWidth = 2;
          const len = phase === "power" ? power * 12 : 80;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + Math.cos(a) * len, by - Math.sin(a) * len);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = text;
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(phase === "angle" ? `ANGLE ${Math.round(angle)}°` : `POWER ${power.toFixed(1)}`, 12, 20);
        }
        // bow
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bx, by, 22, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.5;
        const a2 = (phase === "fly" ? 45 : angle) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(bx + 22 * Math.cos(-Math.PI / 3), by + 22 * Math.sin(-Math.PI / 3));
        ctx.lineTo(bx + 22 * Math.cos(a2) * 0.3, by - 22 * Math.sin(a2) * 0.3);
        ctx.lineTo(bx + 22 * Math.cos(Math.PI / 3), by + 22 * Math.sin(Math.PI / 3));
        ctx.stroke();
        // arrow
        if (arrow) {
          const ang = Math.atan2(arrow.vy, arrow.vx);
          ctx.save();
          ctx.translate(arrow.x, arrow.y);
          ctx.rotate(ang);
          ctx.strokeStyle = "#f1f5f9";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(8, 0);
          ctx.stroke();
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(6, -3.5);
          ctx.lineTo(6, 3.5);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#ef4444";
          ctx.beginPath();
          ctx.moveTo(-14, 0);
          ctx.lineTo(-18, -4);
          ctx.moveTo(-14, 0);
          ctx.lineTo(-18, 4);
          ctx.stroke();
          ctx.restore();
        }
        if (msg) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(W / 2 - 90, 96, 180, 34);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(msg, W / 2, 119);
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`Round over — ${score} pts`, W / 2, H / 2);
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
      App.showModal("How to play Archery",
        `Click once to lock the <b>angle</b>, click again to lock <b>power</b> — then the arrow flies with real gravity and <b>wind drift</b>.
        <br><br>The target sits at a different <b>distance</b> each arrow (further = smaller and higher on screen).
        Gold center <b>50</b>, red <b>30</b>, blue <b>20</b>, white <b>10</b>. Nine arrows per round.`);
    },
  });
})();
