/* Darts — steady the wobbling crosshair and hit the bullseye */
(function () {
  GameRegistry.register({
    id: "darts",
    name: "Darts",
    icon: "🎯",
    category: "arcade",
    description: "Steady the wobbling crosshair and hit the bullseye",
    tags: ["arcade", "aim", "precision"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 360, H = 400;
      let cx, cy, wob, darts, score, best, raf, over, stuck, t, wind;
      best = Storage.getBest("darts") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="dt-score">0</div></div>
          <div class="score-cell"><div class="label">Darts</div><div class="val" id="dt-darts">5</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="dt-best">0</div></div>
        </div>
        <div class="status info" id="dt-status">Click to throw — the crosshair wobbles!</div>
        <div class="center"><canvas id="dt-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Bullseye = 50. Outer rings 25 / 10 / 5. Sudden gusts of wind add extra drift.</p>
      `;

      const canvas = root.querySelector("#dt-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#dt-status");
      cx = W / 2;
      cy = H / 2 - 10;

      function reset() {
        darts = 5;
        score = 0;
        over = false;
        stuck = [];
        t = 0;
        wind = 0;
        updateHud();
        statusEl.textContent = "Click to throw — the crosshair wobbles!";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#dt-score").textContent = score;
        root.querySelector("#dt-darts").textContent = darts;
        root.querySelector("#dt-best").textContent = best;
      }

      function aimPos() {
        // lissajous wobble + wind drift; amplitude grows slightly with each dart
        const amp = 34 + (5 - darts) * 6;
        return {
          x: cx + Math.sin(t / 41 + Math.sin(t / 97) * 2) * amp + wind,
          y: cy + Math.sin(t / 53 + Math.cos(t / 83) * 2) * amp * 0.8,
        };
      }

      canvas.addEventListener("pointerdown", () => {
        if (over) {
          reset();
          return;
        }
        if (darts <= 0) return;
        const a = aimPos();
        const d = Math.hypot(a.x - cx, a.y - cy);
        const pts = d < 9 ? 50 : d < 22 ? 25 : d < 52 ? 10 : d < 85 ? 5 : 0;
        score += pts;
        stuck.push({x: a.x, y: a.y, pts});
        darts--;
        if (pts === 50) AudioFX.win(); else if (pts > 0) AudioFX.pop(); else AudioFX.error();
        // new wind gust for next throw
        wind = (Math.random() * 2 - 1) * 26;
        updateHud();
        if (darts <= 0) {
          over = true;
          statusEl.textContent = `Round over — you scored ${score} / 250`;
          statusEl.className = "status " + (score >= 125 ? "win" : "lose");
          if (score > best) {
            best = score;
            Storage.setBest("darts", score);
            App.toast("New best: " + score, "success");
          }
        }
      });

      function render() {
        const st = getComputedStyle(document.documentElement);
        const text = st.getPropertyValue("--text").trim() || "#eee";
        t += 1;
        // board
        const rings = [
          {r: 110, c: "#111827"}, {r: 85, c: "#16a34a"}, {r: 52, c: "#dc2626"},
          {r: 22, c: "#16a34a"}, {r: 9, c: "#dc2626"},
        ];
        rings.forEach(rg => {
          ctx.fillStyle = rg.c;
          ctx.beginPath();
          ctx.arc(cx, cy, rg.r, 0, Math.PI * 2);
          ctx.fill();
        });
        // wire separators
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 22, cy + Math.sin(a) * 22);
          ctx.lineTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 110, 0, Math.PI * 2);
        ctx.stroke();
        // stuck darts
        stuck.forEach(d => {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + 12, d.y - 16);
          ctx.stroke();
          ctx.fillStyle = "#f8fafc";
          ctx.beginPath();
          ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
        // crosshair
        if (!over) {
          const a = aimPos();
          ctx.strokeStyle = text;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(a.x - 16, a.y);
          ctx.lineTo(a.x - 4, a.y);
          ctx.moveTo(a.x + 4, a.y);
          ctx.lineTo(a.x + 16, a.y);
          ctx.moveTo(a.x, a.y - 16);
          ctx.lineTo(a.x, a.y - 4);
          ctx.moveTo(a.x, a.y + 4);
          ctx.lineTo(a.x, a.y + 16);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(a.x, a.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = text;
          ctx.fill();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Round over — " + score + " pts", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to play again", W / 2, H / 2 + 26);
        }
        raf = requestAnimationFrame(render);
      }

      reset();
      render();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Darts",
        `Click (or tap) to throw a dart exactly where the wobbling crosshair sits at that moment.
        <br><br>Scoring: bullseye <b>50</b>, inner ring <b>25</b>, treble band <b>10</b>, outer band <b>5</b>, off the board <b>0</b>.
        The wobble gets wider as the round goes on, and random <b>wind gusts</b> shift your aim between throws.
        Five darts per round.`);
    },
  });
})();
