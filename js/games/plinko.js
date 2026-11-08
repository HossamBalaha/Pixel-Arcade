/* Plinko — drop the chip and ride the pegs to a jackpot slot */
(function () {
  GameRegistry.register({
    id: "plinko",
    name: "Plinko",
    icon: "🎰",
    category: "arcade",
    description: "Drop the chip and ride the pegs to a jackpot slot",
    tags: ["arcade", "physics", "luck"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 420;
      const COLS = 9, SLOTS = 8;
      let chips, pegs, scores, score, best, raf, over, drops, aimX;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="pl-score">0</div></div>
          <div class="score-cell"><div class="label">Drops</div><div class="val" id="pl-drops">10</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="pl-best">0</div></div>
        </div>
        <div class="status info" id="pl-status">Move to aim, click to drop — edges pay the most!</div>
        <div class="center"><canvas id="pl-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Slot values: 10 · 50 · 100 · 250 · 500 · 250 · 100 · 50 · 10 — the corners are gold.</p>
      `;

      const canvas = root.querySelector("#pl-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#pl-status");
      best = Storage.getBest("plinko") || 0;
      const SLOT_vals = [10, 50, 100, 250, 500, 250, 100, 50, 10];
      const slotW = W / SLOTS;

      function reset() {
        chips = [];
        pegs = [];
        score = 0;
        drops = 10;
        over = false;
        aimX = W / 2;
        // peg grid (offset rows)
        for (let row = 0; row < 9; row++) {
          const y = 70 + row * 32;
          const n = COLS - (row % 2);
          for (let i = 0; i < n; i++) {
            pegs.push({x: (i + 0.5 + (row % 2) * 0.5) * (W / COLS), y, r: 5});
          }
        }
        updateHud();
        statusEl.textContent = "Move to aim, click to drop — edges pay the most!";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#pl-score").textContent = score;
        root.querySelector("#pl-drops").textContent = drops;
        root.querySelector("#pl-best").textContent = best;
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width)};
      };
      canvas.addEventListener("pointermove", (e) => {
        aimX = pos(e).x;
      });
      canvas.addEventListener("pointerdown", (e) => {
        if (over) {
          reset();
          return;
        }
        if (drops <= 0) return;
        aimX = pos(e).x;
        chips.push({x: Math.max(14, Math.min(W - 14, aimX)), y: 20, vx: 0, vy: 0, settled: null});
        drops--;
        AudioFX.pop();
        updateHud();
      });

      function tick() {
        for (const c of chips) {
          if (c.settled !== null) continue;
          c.vy += 0.14;
          c.x += c.vx;
          c.y += c.vy;
          // peg bounce
          for (const p of pegs) {
            const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy);
            if (d < p.r + 7) {
              const nx = dx / (d || 1), ny = dy / (d || 1);
              c.x = p.x + nx * (p.r + 7);
              c.y = p.y + ny * (p.r + 7);
              const sp = Math.max(1.6, Math.hypot(c.vx, c.vy) * 0.5);
              c.vx = nx * sp + (Math.random() - 0.5) * 0.7;
              c.vy = -Math.abs(ny * sp) - 0.6;
              AudioFX.click();
            }
          }
          // walls
          if (c.x < 10) {
            c.x = 10;
            c.vx = Math.abs(c.vx) * 0.7;
          }
          if (c.x > W - 10) {
            c.x = W - 10;
            c.vx = -Math.abs(c.vx) * 0.7;
          }
          // slot landing
          const floorY = H - 46;
          if (c.y >= floorY) {
            const slot = Math.max(0, Math.min(SLOTS - 1, Math.floor(c.x / slotW)));
            c.settled = slot;
            const pts = SLOT_vals[slot];
            score += pts;
            if (pts >= 250) {
              AudioFX.win();
              App.toast("Jackpot slot! +" + pts, "success");
            } else AudioFX.pop();
            updateHud();
            if (drops <= 0 && chips.every(ch => ch.settled !== null)) {
              over = true;
              statusEl.textContent = `All chips dropped — final score ${score}`;
              statusEl.className = "status " + (score >= 1000 ? "win" : "info");
              if (score > best) {
                best = score;
                Storage.setBest("plinko", score);
                App.toast("New best: " + score, "success");
              }
              updateHud();
            }
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#111827";
        ctx.fillRect(0, 0, W, H);
        // board
        ctx.fillStyle = "#0b1220";
        ctx.beginPath();
        ctx.roundRect(8, 8, W - 16, H - 16, 12);
        ctx.fill();
        // aim arrow
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.beginPath();
        ctx.moveTo(Math.max(14, Math.min(W - 14, aimX)) - 7, 12);
        ctx.lineTo(Math.max(14, Math.min(W - 14, aimX)) + 7, 12);
        ctx.lineTo(Math.max(14, Math.min(W - 14, aimX)), 24);
        ctx.closePath();
        ctx.fill();
        // pegs
        for (const p of pegs) {
          ctx.fillStyle = "#e2e8f0";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.beginPath();
          ctx.arc(p.x - 1.5, p.y - 1.5, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
        // slots
        for (let i = 0; i < SLOTS; i++) {
          const v = SLOT_vals[i];
          ctx.fillStyle = v >= 500 ? "#fbbf24" : v >= 250 ? "#f97316" : v >= 100 ? "#38bdf8" : "#334155";
          ctx.fillRect(i * slotW + 3, H - 44, slotW - 6, 36);
          ctx.fillStyle = "#0b1220";
          ctx.font = "bold 13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(v), i * slotW + slotW / 2, H - 21);
          // slot dividers
          ctx.fillStyle = "#1f2937";
          if (i > 0) ctx.fillRect(i * slotW - 2, H - 46, 4, 40);
        }
        // chips
        for (const c of chips) {
          ctx.fillStyle = c.settled !== null ? "rgba(99,102,241,0.5)" : "#f43f5e";
          ctx.beginPath();
          ctx.arc(c.x, c.y, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath();
          ctx.arc(c.x - 2, c.y - 2, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`Final score ${score}`, W / 2, H / 2 - 8);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to play again", W / 2, H / 2 + 20);
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Plinko",
        `Aim with the pointer and click to drop a chip. It tumbles down through the peg field, bouncing left and right at random,
        and lands in one of nine slots.
        <br><br>Slot values: 10 · 50 · 100 · 250 · <b>500</b> · 250 · 100 · 50 · 10.
        Physics is chaotic — corners are rare, which is why they pay. Ten chips per round.`);
    },
  });
})();
