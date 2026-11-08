/* lunarlander — thrust, rotate, gravity; touch down gently on the pad. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "lunarlander", name: "Lunar Lander", icon: "🌕", category: "arcade",
    description: "Fuel, gravity, one landing pad — touch down softly", tags: ["arcade", "physics", "classic"],
    age: ["teens", "adults"], difficulty: "hard", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      const W = 360, H = 440;
      root.innerHTML = `
        <style>#ll-c { display:block; margin:0 auto; background:#020617; border-radius:12px; }</style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Altitude</div><div class="val" id="ll-alt">—</div></div>
          <div class="score-cell"><div class="label">Speed</div><div class="val" id="ll-spd">—</div></div>
          <div class="score-cell"><div class="label">Fuel</div><div class="val" id="ll-fuel">100</div></div>
        </div>
        <div class="status info" id="ll-status">Land gently on the green pad!</div>
        <canvas id="ll-c" width="${W}" height="${H}"></canvas>
        <div class="row" style="justify-content:center; gap:8px; margin-top:6px;">
          <button class="btn" id="ll-l">⟲</button>
          <button class="btn primary" id="ll-t">🔥 Thrust</button>
          <button class="btn" id="ll-r">⟳</button>
          <button class="btn" id="ll-new">↺ Restart</button>
        </div>
        <p class="hint" style="text-align:center;">◀ ▶ rotate · Space thrust · vertical speed under 45 to survive</p>
      `;
      const cv = root.querySelector("#ll-c");
      const g = cv.getContext("2d");
      let x, y, vx, vy, ang, fuel, over, raf = null, last = 0, thrusting = false, keys = {};
      let padX, padW, score = 0, round = 1;

      function reset(full) {
        x = 40;
        y = 50;
        vx = 26;
        vy = 8;
        ang = 0;
        fuel = 100;
        over = false;
        thrusting = false;
        if (full) {
          score = 0;
          round = 1;
        }
        padW = Math.max(40, 90 - round * 8);
        padX = 60 + Math.random() * (W - 120 - padW);
        setStatus("Land gently on the green pad!");
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#ll-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function update(dt) {
        if (over) return;
        if ((keys.ArrowLeft)) ang -= 2.4 * dt;
        if (keys.ArrowRight) ang += 2.4 * dt;
        const th = thrusting || keys[" "];
        if (th && fuel > 0) {
          fuel -= 26 * dt;
          vx += Math.sin(ang) * 42 * dt;
          vy -= Math.cos(ang) * 42 * dt;
        }
        vy += 16 * dt; // gravity
        x += vx * dt;
        y += vy * dt;
        if (x < -20) x = W + 20;
        if (x > W + 20) x = -20;
        if (y >= H - 26) {
          // touchdown
          const spd = Math.hypot(vx, vy);
          const onPad = x > padX && x < padX + padW;
          const upright = Math.abs(ang) < 0.5;
          if (onPad && spd < 45 && upright) {
            const pts = Math.round(100 + fuel - spd);
            score += Math.max(10, pts);
            round++;
            AudioFX.win();
            setStatus(` touchdown! +${Math.max(10, pts)} pts — next pad is smaller`, "win");
            setTimeout(() => {
              if (alive) {
                reset(false);
              }
            }, 1400);
            over = true; // pause until reset
            App.recordResult(true, score);
          } else {
            AudioFX.lose();
            setStatus(onPad ? "💥 Too fast / tilted — crashed on the pad" : "💥 Missed the pad — crashed", "lose");
            App.recordResult(false, score);
            over = true;
          }
        }
        const alt = root.querySelector("#ll-alt"), spdEl = root.querySelector("#ll-spd"),
          fEl = root.querySelector("#ll-fuel");
        if (alt) alt.textContent = Math.max(0, Math.round(H - 26 - y));
        if (spdEl) spdEl.textContent = Math.round(Math.hypot(vx, vy));
        if (fEl) fEl.textContent = Math.round(fuel);
      }

      function draw() {
        g.fillStyle = "#020617";
        g.fillRect(0, 0, W, H);
        // stars
        g.fillStyle = "#334155";
        for (let i = 0; i < 26; i++) g.fillRect((i * 89) % W, (i * 53) % (H - 60), 2, 2);
        // moon surface
        g.fillStyle = "#475569";
        g.fillRect(0, H - 20, W, 20);
        // pad
        g.fillStyle = "#22c55e";
        g.fillRect(padX, H - 26, padW, 8);
        // lander
        g.save();
        g.translate(x, y);
        g.rotate(ang);
        g.font = "24px sans-serif";
        g.textAlign = "center";
        g.fillText("🚀", 0, 8);
        if ((thrusting || keys[" "]) && fuel > 0 && !over) {
          g.font = "16px sans-serif";
          g.fillText("🔥", 0, 26);
        }
        g.restore();
      }

      function loop(t) {
        if (!alive) return;
        const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
        last = t;
        update(dt);
        draw();
        raf = requestAnimationFrame(loop);
      }

      const kd = e => {
        if (["ArrowLeft", "ArrowRight", " "].includes(e.key)) {
          e.preventDefault();
          keys[e.key] = true;
        }
      };
      const ku = e => {
        keys[e.key] = false;
      };
      document.addEventListener("keydown", kd);
      document.addEventListener("keyup", ku);
      root.querySelector("#ll-l").addEventListener("pointerdown", () => {
        ang -= 0.35;
      });
      root.querySelector("#ll-r").addEventListener("pointerdown", () => {
        ang += 0.35;
      });
      const tb = root.querySelector("#ll-t");
      tb.addEventListener("pointerdown", () => {
        thrusting = true;
      });
      const stopT = () => {
        thrusting = false;
      };
      tb.addEventListener("pointerup", stopT);
      tb.addEventListener("pointerleave", stopT);
      root.querySelector("#ll-new").addEventListener("click", () => {
        AudioFX.click();
        reset(true);
      });

      reset(true);
      raf = requestAnimationFrame(loop);
      return function cleanup() {
        alive = false;
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", kd);
        document.removeEventListener("keyup", ku);
      };
    },
    help: function () {
      App.showModal("How to play Lunar Lander",
        "Pilot the lander down to the green pad." +
        "<br>◀ ▶ (or the ⟲ ⟳ buttons) rotate; Space (or hold Thrust) fires the engine and burns fuel." +
        "<br>Touch down with <b>speed under 45</b>, upright, on the pad — otherwise you crash." +
        "<br>Each landing scores points for remaining fuel and softness; pads get narrower every round.");
    },
  });
})();
