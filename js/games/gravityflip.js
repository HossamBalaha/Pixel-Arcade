/* Gravity Flip — flip between floor and ceiling to dodge the spikes */
(function () {
  GameRegistry.register({
    id: "gravityflip",
    name: "Gravity Flip",
    icon: "🔄",
    category: "arcade",
    description: "Flip between floor and ceiling to dodge the spikes",
    tags: ["arcade", "runner", "gravity"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 400, H = 240;
      let y, vy, grav, obstacles, dist, speed, score, best, over, raf, flipAnim;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="gf-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="gf-best">0</div></div>
        </div>
        <div class="status info" id="gf-status">Tap / Space to flip gravity — avoid the hazards</div>
        <div class="center"><canvas id="gf-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Floor spikes force you up, ceiling spikes force you down, pillars need precise timing.</p>
      `;

      const canvas = root.querySelector("#gf-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#gf-status");
      best = Storage.getBest("gravityflip") || 0;
      const PH = 26; // player half-height
      const FLOOR = H - 24, CEIL = 24;

      function reset() {
        y = FLOOR - PH;
        vy = 0;
        grav = 1;
        obstacles = [];
        dist = 0;
        speed = 3.4;
        score = 0;
        over = false;
        flipAnim = 0;
        statusEl.textContent = "Tap / Space to flip gravity — avoid the hazards";
        statusEl.className = "status info";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#gf-score").textContent = score;
        root.querySelector("#gf-best").textContent = best;
      }

      function spawn() {
        const frontier = obstacles.length ? obstacles[obstacles.length - 1].x : dist * 9 + 260;
        const r = Math.random();
        let o;
        if (r < 0.42) o = {type: "floor", x: frontier + 60 + Math.random() * 150, w: 26 + Math.random() * 40};
        else if (r < 0.84) o = {type: "ceil", x: frontier + 60 + Math.random() * 150, w: 26 + Math.random() * 40};
        else o = {type: "pillar", x: frontier + 90, gapY: 70 + Math.random() * (H - 190), gapH: 92};
        obstacles.push(o);
      }

      function flip() {
        if (over) {
          reset();
          return;
        }
        grav *= -1;
        flipAnim = 8;
        AudioFX.pop();
      }

      function tick() {
        if (!over) {
          dist += 0.045 * speed;
          speed = 3.4 + dist / 6;
          score = Math.floor(dist * 10);
          vy += 0.52 * grav;
          vy = Math.max(-9, Math.min(9, vy));
          y += vy;
          // stick to surfaces
          if (y + PH >= FLOOR && grav > 0) {
            y = FLOOR - PH;
            vy = 0;
          }
          if (y - PH <= CEIL && grav < 0) {
            y = CEIL + PH;
            vy = 0;
          }
          if (y + PH > FLOOR) {
            y = FLOOR - PH;
            vy = Math.min(vy, 0);
          }
          if (y - PH < CEIL) {
            y = CEIL + PH;
            vy = Math.max(vy, 0);
          }
          while (obstacles.length < 4) spawn();
          obstacles = obstacles.filter(o => o.x - dist * 9 > -80);
          // collisions at px=90
          const px = 90;
          for (const o of obstacles) {
            const sx = o.x - dist * 9;
            if (o.type === "floor") {
              if (sx < px + 14 && sx + o.w > px - 14 && y + PH > FLOOR - 26) return die("Spiked from below!");
            } else if (o.type === "ceil") {
              if (sx < px + 14 && sx + o.w > px - 14 && y - PH < CEIL + 26) return die("Spiked from above!");
            } else {
              if (sx < px + 14 && sx + 18 > px - 14) {
                if (y - PH < o.gapY || y + PH > o.gapY + o.gapH) return die("Smashed into the pillar!");
              }
            }
          }
          updateHud();
          if (flipAnim > 0) flipAnim--;
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("gravityflip", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        // background split
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#111827");
        g.addColorStop(1, "#1f2937");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        // grid lines moving
        ctx.strokeStyle = "rgba(99,102,241,0.12)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          const lx = ((i * 40 - dist * 9 * 0.5) % (W + 40) + W + 40) % (W + 40) - 20;
          ctx.beginPath();
          ctx.moveTo(lx, 0);
          ctx.lineTo(lx, H);
          ctx.stroke();
        }
        // floor & ceiling
        ctx.fillStyle = "#334155";
        ctx.fillRect(0, FLOOR, W, H - FLOOR);
        ctx.fillRect(0, 0, W, CEIL);
        ctx.fillStyle = "#475569";
        ctx.fillRect(0, FLOOR, W, 4);
        ctx.fillRect(0, CEIL - 4, W, 4);
        // obstacles
        for (const o of obstacles) {
          const sx = o.x - dist * 9;
          if (o.type === "floor" || o.type === "ceil") {
            const base = o.type === "floor" ? FLOOR : CEIL;
            const dir = o.type === "floor" ? -1 : 1;
            ctx.fillStyle = "#ef4444";
            for (let i = 0; i < o.w; i += 13) {
              ctx.beginPath();
              ctx.moveTo(sx + i, base);
              ctx.lineTo(sx + i + 6.5, base + dir * 20);
              ctx.lineTo(sx + i + 13, base);
              ctx.closePath();
              ctx.fill();
            }
          } else {
            ctx.fillStyle = "#7c3aed";
            ctx.fillRect(sx, 0, 18, o.gapY);
            ctx.fillRect(sx, o.gapY + o.gapH, 18, H - o.gapY - o.gapH);
            // gap edges glow
            ctx.fillStyle = "rgba(167,139,250,0.6)";
            ctx.fillRect(sx, o.gapY - 3, 18, 3);
            ctx.fillRect(sx, o.gapY + o.gapH, 18, 3);
          }
        }
        // player (rotates with gravity)
        ctx.save();
        ctx.translate(90, y);
        ctx.rotate(flipAnim > 0 ? flipAnim * Math.PI / 4 : (grav > 0 ? 0 : Math.PI));
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.roundRect(-14, -PH, 28, PH * 2, 6);
        ctx.fill();
        ctx.fillStyle = text;
        ctx.beginPath();
        ctx.arc(0, grav > 0 ? PH - 14 : -PH + 14, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(251,146,60,0.8)";
        ctx.beginPath();
        ctx.moveTo(-14, grav > 0 ? PH - 8 : -PH + 8);
        ctx.lineTo(-22, grav > 0 ? PH - 12 : -PH + 12);
        ctx.lineTo(-14, grav > 0 ? PH - 16 : -PH + 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Crashed!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R or tap to restart", W / 2, H / 2 + 24);
        }
      }

      const onKey = (e) => {
        if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          flip();
        }
        if (e.key.toLowerCase() === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", flip);

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        canvas.removeEventListener("pointerdown", flip);
      };
    },
    help: function () {
      App.showModal("How to play Gravity Flip",
        `You run automatically. Tap (or <b>Space</b>) to <b>flip gravity</b> — you fall to the ceiling, tap again to drop back to the floor.
        <br><br>🔺 Red spikes grow from the floor or ceiling — be on the <b>other side</b> when you pass them.
        🟣 Purple pillars span both sides with a single gap — align your fall to thread it.
        Speed ramps up forever.`);
    },
  });
})();
