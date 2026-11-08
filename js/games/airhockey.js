/* Air Hockey — slide, block and smash past the AI goalie */
(function () {
  GameRegistry.register({
    id: "airhockey",
    name: "Air Hockey",
    icon: "🏒",
    category: "arcade",
    description: "Slide, block and smash past the AI goalie",
    tags: ["arcade", "sports", "versus-ai"],
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
      const W = 340, H = 460;
      let puck, you, ai, ys, as, over, raf, msgTimer;
      const WIN = 7;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="ah-you">0</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="ah-ai">0</div></div>
        </div>
        <div class="status info" id="ah-status">Drag your paddle (bottom half) — first to ${WIN} wins</div>
        <div class="center"><canvas id="ah-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Slam the puck with a fast paddle flick — the puck inherits your speed.</p>
      `;

      const canvas = root.querySelector("#ah-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#ah-status");

      function reset() {
        you = {x: W / 2, y: H - 90, px: W / 2, py: H - 90};
        ai = {x: W / 2, y: 90};
        ys = 0;
        as = 0;
        over = false;
        msgTimer = null;
        serve(Math.random() < 0.5 ? 1 : -1);
        updateHud();
        statusEl.textContent = `Drag your paddle (bottom half) — first to ${WIN} wins`;
        statusEl.className = "status info";
      }

      function serve(dir) {
        puck = {x: W / 2, y: H / 2, vx: dir * 2.6, vy: (Math.random() < 0.5 ? 1 : -1) * 2.2};
      }

      function updateHud() {
        root.querySelector("#ah-you").textContent = ys;
        root.querySelector("#ah-ai").textContent = as;
      }

      function paddleHit(p, r) {
        const dx = puck.x - p.x, dy = puck.y - p.y, d = Math.hypot(dx, dy);
        if (d < r + 12 && d > 0.001) {
          const nx = dx / d, ny = dy / d;
          puck.x = p.x + nx * (r + 12);
          puck.y = p.y + ny * (r + 12);
          const sp = Math.max(4, Math.hypot(puck.vx, puck.vy));
          puck.vx = nx * sp * 1.05 + (p === you ? (p.x - p.px) * 0.35 : 0);
          puck.vy = ny * sp * 1.05 + (p === you ? (p.y - p.py) * 0.35 : 0);
          AudioFX.pop();
        }
      }

      function tick() {
        if (!over) {
          // friction-free puck
          puck.x += puck.vx;
          puck.y += puck.vy;
          // walls
          if (puck.x < 14) {
            puck.x = 14;
            puck.vx = Math.abs(puck.vx);
            AudioFX.click();
          }
          if (puck.x > W - 14) {
            puck.x = W - 14;
            puck.vx = -Math.abs(puck.vx);
            AudioFX.click();
          }
          // goals
          if (puck.y < -14) {
            ys++;
            updateHud();
            AudioFX.win();
            score("You score!");
          }
          if (puck.y > H + 14) {
            as++;
            updateHud();
            AudioFX.lose();
            score("AI scores…");
          }
          // paddle collisions
          paddleHit(you, 24);
          paddleHit(ai, 24);
          // AI: track puck x with lag + speed cap; return to center when puck in your half
          const target = puck.y < H / 2 ? puck.x : W / 2;
          ai.x += Math.max(-4.4, Math.min(4.4, (target - ai.x) * 0.14));
          ai.y += Math.max(-2.4, Math.min(2.4, ((puck.y < H / 2 ? puck.y - 40 : 90) - ai.y) * 0.1));
          ai.x = Math.max(30, Math.min(W - 30, ai.x));
          ai.y = Math.max(30, Math.min(H / 2 - 20, ai.y));
          // store paddle velocity for smash transfer
          you.px = you.x;
          you.py = you.y;
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function score(m) {
        if (ys >= WIN || as >= WIN) {
          over = true;
          statusEl.textContent = ys >= WIN ? `🏆 You win ${ys}–${as}!` : `AI wins ${as}–${ys}. Rematch?`;
          statusEl.className = "status " + (ys >= WIN ? "win" : "lose");
          if (ys >= WIN) {
            const b = Storage.getBest("airhockey") || 0;
            Storage.setBest("airhockey", b + 1);
          }
          return;
        }
        statusEl.textContent = m;
        statusEl.className = "status info";
        puck = {x: W / 2, y: H / 2, vx: 0, vy: 0};
        after(() => serve(ys > as ? -1 : 1), 700);
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };
      const move = (e) => {
        e.preventDefault();
        const p = pos(e);
        you.x = Math.max(30, Math.min(W - 30, p.x));
        you.y = Math.max(H / 2 + 16, Math.min(H - 30, p.y));
      };
      canvas.addEventListener("pointerdown", move);
      canvas.addEventListener("pointermove", move);

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const accent2 = st.getPropertyValue("--accent-2").trim() || "#ec4899";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, W, H);
        // markings
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(10, H / 2);
        ctx.lineTo(W - 10, H / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 6, 0, Math.PI * 2);
        ctx.fill();
        // goals
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(W / 2 - 55, 0, 110, 8);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(W / 2 - 55, H - 8, 110, 8);
        // paddles
        ctx.fillStyle = accent2;
        ctx.beginPath();
        ctx.arc(you.x, you.y, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(you.x - 7, you.y - 7, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(ai.x, ai.y, 24, 0, Math.PI * 2);
        ctx.fill();
        // puck
        ctx.fillStyle = text;
        ctx.beginPath();
        ctx.arc(puck.x, puck.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.lineWidth = 3;
        ctx.stroke();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(ys >= WIN ? "You win! 🏆" : "AI wins", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click for a rematch", W / 2, H / 2 + 26);
          canvas.addEventListener("pointerdown", () => reset(), {once: true});
        }
      }

      reset();
      tick();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", move);
        canvas.removeEventListener("pointermove", move);
      };
    },
    help: function () {
      App.showModal("How to play Air Hockey",
        `Drag your paddle anywhere in the <b>bottom half</b>. The puck bounces off walls and paddles —
        flick the paddle <b>through</b> the puck to smash it.
        <br><br>Green goal at the top is yours to score in; red goal at the bottom is the AI's target.
        First to <b>7</b> wins. The AI tracks the puck but can be baited by fast direction changes.`);
    },
  });
})();
