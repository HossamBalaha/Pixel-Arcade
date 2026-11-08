/* Bullet Dodge — weave your ship through an ever-denser bullet storm */
(function () {
  GameRegistry.register({
    id: "bulletdodge",
    name: "Bullet Dodge",
    icon: "💫",
    category: "arcade",
    description: "Weave your ship through an ever-denser bullet storm",
    tags: ["arcade", "dodge", "bullet-hell"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 440;
      let ship, bullets, t, score, best, over, raf, spawnRate, near;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Survived</div><div class="val" id="bd-score">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bd-best">0s</div></div>
        </div>
        <div class="status info" id="bd-status">Move with the pointer — survive the storm</div>
        <div class="center"><canvas id="bd-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Bullets spawn from the top edges and aim at you. Grazing close builds a score multiplier.</p>
      `;

      const canvas = root.querySelector("#bd-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bd-status");
      best = Storage.getBest("bulletdodge") || 0;
      let mult = 1, multT = 0;

      function reset() {
        ship = {x: W / 2, y: H - 80};
        bullets = [];
        t = 0;
        score = 0;
        over = false;
        spawnRate = 40;
        near = 0;
        mult = 1;
        multT = 0;
        statusEl.textContent = "Move with the pointer — survive the storm";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#bd-score").textContent = Math.floor(score) + "s";
        root.querySelector("#bd-best").textContent = best + "s";
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t2 = e.touches ? e.touches[0] : e;
        return {x: (t2.clientX - r.left) * (W / r.width), y: (t2.clientY - r.top) * (H / r.height)};
      };
      const move = (e) => {
        const p = pos(e);
        ship.x = Math.max(12, Math.min(W - 12, p.x));
        ship.y = Math.max(H / 3, Math.min(H - 20, p.y));
        e.preventDefault();
      };
      canvas.addEventListener("pointerdown", (e) => {
        if (over) reset();
        move(e);
      });
      canvas.addEventListener("pointermove", move);

      function spawnBullets() {
        // radial burst from a top corner or aimed shots
        const mode = Math.random();
        if (mode < 0.4) {
          // aimed trio
          const sx = Math.random() * W, sy = -10;
          const a = Math.atan2(ship.y - sy, ship.x - sx);
          for (const off of [-0.16, 0, 0.16]) {
            bullets.push({x: sx, y: sy, vx: Math.cos(a + off) * 2.4, vy: Math.sin(a + off) * 2.4, r: 6, c: "#f43f5e"});
          }
        } else if (mode < 0.75) {
          // rain
          for (let i = 0; i < 3; i++) {
            bullets.push({
              x: Math.random() * W,
              y: -10 - i * 30,
              vx: (Math.random() - 0.5) * 0.8,
              vy: 2 + Math.random() * 1.4,
              r: 6,
              c: "#fb923c"
            });
          }
        } else {
          // spiral from center-top
          const cx = W / 2, cy = -4;
          const base = t / 24;
          for (let i = 0; i < 5; i++) {
            const a = base + (i / 5) * Math.PI * 2;
            bullets.push({
              x: cx,
              y: cy,
              vx: Math.cos(a) * 1.7,
              vy: Math.abs(Math.sin(a)) * 1.7 + 0.7,
              r: 5,
              c: "#a78bfa"
            });
          }
        }
      }

      function tick() {
        if (!over) {
          t++;
          score += 1 / 60;
          spawnRate = Math.max(11, 40 - t / 55);
          if (t % Math.floor(spawnRate) === 0) spawnBullets();
          for (const b of bullets) {
            b.x += b.vx;
            b.y += b.vy;
          }
          bullets = bullets.filter(b => b.y < H + 20 && b.y > -30 && b.x > -20 && b.x < W + 20);
          // graze + collision
          for (const b of bullets) {
            const d = Math.hypot(b.x - ship.x, b.y - ship.y);
            if (d < b.r + 7) return die();
            if (d < b.r + 20) {
              near++;
              if (near > 22) {
                mult = Math.min(4, mult + 0.5);
                multT = 180;
                near = 0;
              }
            }
          }
          if (multT > 0) {
            multT--;
            score += 0.02 * mult;
            if (multT === 0) mult = 1;
          }
          updateHud();
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = `Obliterated after ${Math.floor(score)}s (×${mult.toFixed(1)} graze)`;
        statusEl.className = "status lose";
        if (Math.floor(score) > best) {
          best = Math.floor(score);
          Storage.setBest("bulletdodge", best);
          App.toast("New best: " + best + "s", "success");
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, W, H);
        // starfield
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let i = 0; i < 30; i++) {
          const sy = ((i * 97 + t * (1 + i % 3)) % H);
          ctx.fillRect((i * 53) % W, sy, 2, 2);
        }
        // bullets
        for (const b of bullets) {
          ctx.fillStyle = b.c;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.55)";
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        // graze ring
        if (mult > 1) {
          ctx.strokeStyle = `rgba(251,191,36,${0.25 + 0.15 * Math.sin(t / 6)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, 27, 0, Math.PI * 2);
          ctx.stroke();
        }
        // ship
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 9);
        ctx.lineTo(0, 4);
        ctx.lineTo(-8, 9);
        ctx.closePath();
        ctx.fill();
        // engine flame
        ctx.fillStyle = "#fb923c";
        ctx.beginPath();
        ctx.moveTo(-3, 8);
        ctx.lineTo(0, 13 + Math.random() * 4);
        ctx.lineTo(3, 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // multiplier
        if (mult > 1) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 16px sans-serif";
          ctx.textAlign = "left";
          ctx.fillText("×" + mult.toFixed(1), 10, 24);
        }
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("You were hit", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to try again", W / 2, H / 2 + 26);
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Bullet Dodge",
        `Slide your ship with the pointer (mouse or finger). Waves of bullets rain down, aim at you, and spiral out —
        patterns intensify every second.
        <br><br><b>Grazing</b> — flying within a hair of a bullet — builds a multiplier up to <b>×4</b> that accelerates your survival score.
        One hit ends the run. How long can you dance?`);
    },
  });
})();
