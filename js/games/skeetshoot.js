/* Skeet Shoot — track the clay pigeons across the sky and shoot them down */
(function () {
  GameRegistry.register({
    id: "skeetshoot",
    name: "Skeet Shoot",
    icon: "🥏",
    category: "arcade",
    description: "Track the clay pigeons across the sky and shoot them down",
    tags: ["arcade", "aim", "action"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 380, H = 300;
      let clays, shots, hits, score, best, over, raf, cross, flash, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sk-score">0</div></div>
          <div class="score-cell"><div class="label">Hits</div><div class="val" id="sk-hits">0/15</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk-best">0</div></div>
        </div>
        <div class="status info" id="sk-status">Move to aim, click to fire — lead your targets!</div>
        <div class="center"><canvas id="sk-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Far clays are worth more. You have 15 shells — make them count.</p>
      `;

      const canvas = root.querySelector("#sk-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#sk-status");
      best = Storage.getBest("skeetshoot") || 0;
      cross = {x: W / 2, y: H / 2};
      let recoil = 0;

      function reset() {
        clays = [];
        shots = 15;
        hits = 0;
        score = 0;
        over = false;
        flash = 0;
        round = 0;
        updateHud();
        statusEl.textContent = "Move to aim, click to fire — lead your targets!";
        statusEl.className = "status info";
        launch();
      }

      function updateHud() {
        root.querySelector("#sk-score").textContent = score;
        root.querySelector("#sk-hits").textContent = hits + "/15";
        root.querySelector("#sk-best").textContent = best;
      }

      function launch() {
        if (over) return;
        const side = Math.random() < 0.5 ? 1 : -1;
        const y = 40 + Math.random() * 90;
        const far = Math.random() < 0.4; // far = small + fast
        clays.push({
          x: side > 0 ? -20 : W + 20, y,
          vx: side * (far ? 3.4 : 2.1), vy: -(far ? 0.9 : 0.6),
          r: far ? 9 : 15, far,
        });
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };
      canvas.addEventListener("pointermove", (e) => {
        const p = pos(e);
        cross = p;
      });
      canvas.addEventListener("pointerdown", (e) => {
        if (over) {
          reset();
          return;
        }
        const p = pos(e);
        cross = p;
        if (shots <= 0) return;
        shots--;
        recoil = 6;
        flash = 3;
        AudioFX.pop();
        // hit test with generous radius
        for (let i = clays.length - 1; i >= 0; i--) {
          const c = clays[i];
          if (Math.hypot(c.x - p.x, c.y - p.y) < c.r + 14) {
            clays.splice(i, 1);
            hits++;
            score += c.far ? 30 : 15;
            AudioFX.win();
            updateHud();
            break;
          }
        }
        if (shots <= 0 && clays.length === 0) endRound();
      });

      function endRound() {
        over = true;
        statusEl.textContent = `Round over — ${hits} hits, ${score} points`;
        statusEl.className = "status " + (hits >= 10 ? "win" : "info");
        if (score > best) {
          best = score;
          Storage.setBest("skeetshoot", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function tick() {
        round++;
        if (!over) {
          for (const c of clays) {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.008;
            c.rot = (c.rot || 0) + 0.1;
          }
          clays = clays.filter(c => c.x > -40 && c.x < W + 40 && c.y < H - 60);
          // auto launch
          if (round % 75 === 0 && clays.length < 3) launch();
          if (shots <= 0 && clays.length === 0) endRound();
        }
        if (recoil > 0) recoil--;
        render();
        raf = requestAnimationFrame(tick);
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const text = st.getPropertyValue("--text").trim() || "#eee";
        // sky
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#0369a1");
        g.addColorStop(1, "#7dd3fc");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // clouds
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        for (let i = 0; i < 3; i++) {
          const cx2 = ((i * 150 + round * 0.2) % (W + 100)) - 50;
          ctx.beginPath();
          ctx.ellipse(cx2, 40 + i * 28, 34, 12, 0, 0, Math.PI * 2);
          ctx.ellipse(cx2 + 20, 36 + i * 28, 22, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        // ground
        ctx.fillStyle = "#4d7c0f";
        ctx.fillRect(0, H - 40, W, 40);
        ctx.fillStyle = "#3f6212";
        ctx.fillRect(0, H - 40, W, 6);
        // trap house — warm brown so it reads against both the olive ground and dark skies
        ctx.fillStyle = "#78350f";
        ctx.fillRect(10, H - 52, 34, 14);
        // clays
        for (const c of clays) {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot || 0);
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.ellipse(0, 0, c.r, c.r * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#7c2d12";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 0, c.r, c.r * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#c2410c";
          ctx.beginPath();
          ctx.ellipse(0, 2, c.r * 0.7, c.r * 0.28, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        // crosshair with recoil offset
        const ry = cross.y + (recoil > 0 ? Math.sin(recoil) * 4 : 0);
        ctx.strokeStyle = text;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cross.x - 18, ry);
        ctx.lineTo(cross.x - 6, ry);
        ctx.moveTo(cross.x + 6, ry);
        ctx.lineTo(cross.x + 18, ry);
        ctx.moveTo(cross.x, ry - 18);
        ctx.lineTo(cross.x, ry - 6);
        ctx.moveTo(cross.x, ry + 6);
        ctx.lineTo(cross.x, ry + 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cross.x, ry, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ef4444";
        ctx.fill();
        // muzzle flash
        if (flash > 0) {
          ctx.fillStyle = "rgba(253,224,71,0.5)";
          ctx.beginPath();
          ctx.arc(cross.x, ry, 40, 0, Math.PI * 2);
          ctx.fill();
          flash--;
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`Round over — ${hits}/15`, W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to shoot again", W / 2, H / 2 + 26);
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Skeet Shoot",
        `Move the pointer to swing your shotgun sight and click to fire. Clays arc across the sky —
        <b>lead</b> them slightly ahead of their path.
        <br><br>Close clays are <b>+15</b>, far (small, fast) ones <b>+30</b>. You have <b>15 shells</b>; the round ends when they're spent.
        Because pellets spread, the hit radius is a little generous.`);
    },
  });
})();
