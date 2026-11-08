/* Mini Golf — drag to aim and putt through walls and sand */
(function () {
  GameRegistry.register({
    id: "minigolf",
    name: "Mini Golf",
    icon: "⛳",
    category: "arcade",
    description: "Drag to aim and putt through walls and sand traps",
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
      let level, strokes, total, best, raf, ball, drag, won, msg;
      // Each hole: start, hole, walls (axis-aligned rects), sands (rects)
      const HOLES = [
        {start: {x: 50, y: 200}, hole: {x: 330, y: 200}, walls: [{x: 180, y: 60, w: 12, h: 130}], sands: []},
        {
          start: {x: 50, y: 340},
          hole: {x: 330, y: 70},
          walls: [{x: 150, y: 150, w: 12, h: 130}, {x: 260, y: 150, w: 12, h: 130}],
          sands: [{x: 170, y: 290, w: 80, h: 60}]
        },
        {
          start: {x: 50, y: 200},
          hole: {x: 190, y: 60},
          walls: [{x: 100, y: 120, w: 180, h: 12}],
          sands: [{x: 120, y: 240, w: 70, h: 50}]
        },
        {
          start: {x: 340, y: 350},
          hole: {x: 40, y: 50},
          walls: [{x: 120, y: 120, w: 12, h: 160}, {x: 240, y: 220, w: 12, h: 140}],
          sands: [{x: 150, y: 60, w: 90, h: 40}]
        },
        {
          start: {x: 60, y: 60},
          hole: {x: 320, y: 340},
          walls: [{x: 150, y: 40, w: 12, h: 180}, {x: 250, y: 180, w: 12, h: 180}, {x: 40, y: 220, w: 180, h: 12}],
          sands: [{x: 180, y: 130, w: 60, h: 60}]
        },
      ];
      const MAX = 2; // par per hole = 2 for display
      best = Storage.getBest("minigolf") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hole</div><div class="val" id="mg-hole">1/5</div></div>
          <div class="score-cell"><div class="label">Strokes</div><div class="val" id="mg-strokes">0</div></div>
          <div class="score-cell"><div class="label">Total</div><div class="val" id="mg-total">0</div></div>
        </div>
        <div class="status info" id="mg-status">Drag back from the ball and release to putt</div>
        <div class="center"><canvas id="mg-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Sand slows the ball a lot. Fewer total strokes across 5 holes = better score.</p>
      `;

      const canvas = root.querySelector("#mg-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#mg-status");

      function loadHole(i) {
        level = i;
        strokes = 0;
        ball = {x: HOLES[i].start.x, y: HOLES[i].start.y, vx: 0, vy: 0, moving: false};
        drag = null;
        won = false;
        msg = null;
        statusEl.textContent = `Hole ${i + 1} of 5 — par ${MAX}`;
        statusEl.className = "status info";
        updateHud();
      }

      function updateHud() {
        root.querySelector("#mg-hole").textContent = (level + 1) + "/5";
        root.querySelector("#mg-strokes").textContent = strokes;
        root.querySelector("#mg-total").textContent = total;
      }

      function tick() {
        if (ball.moving) {
          const h = HOLES[level];
          // sand friction
          let fr = 0.985;
          for (const s of h.sands) {
            if (ball.x > s.x && ball.x < s.x + s.w && ball.y > s.y && ball.y < s.y + s.h) fr = 0.9;
          }
          ball.vx *= fr;
          ball.vy *= fr;
          ball.x += ball.vx;
          ball.y += ball.vy;
          // walls (bounce)
          for (const w of h.walls) {
            if (ball.x > w.x - 7 && ball.x < w.x + w.w + 7 && ball.y > w.y - 7 && ball.y < w.y + w.h + 7) {
              // resolve on smallest penetration
              const dl = Math.abs(ball.x - (w.x - 7)), dr = Math.abs(w.x + w.w + 7 - ball.x);
              const dtp = Math.abs(ball.y - (w.y - 7)), db = Math.abs(w.y + w.h + 7 - ball.y);
              const m = Math.min(dl, dr, dtp, db);
              if (m === dl) {
                ball.x = w.x - 7;
                ball.vx = -Math.abs(ball.vx) * 0.8;
              } else if (m === dr) {
                ball.x = w.x + w.w + 7;
                ball.vx = Math.abs(ball.vx) * 0.8;
              } else if (m === dtp) {
                ball.y = w.y - 7;
                ball.vy = -Math.abs(ball.vy) * 0.8;
              } else {
                ball.y = w.y + w.h + 7;
                ball.vy = Math.abs(ball.vy) * 0.8;
              }
              AudioFX.click();
            }
          }
          // bounds
          if (ball.x < 14) {
            ball.x = 14;
            ball.vx = Math.abs(ball.vx) * 0.8;
          }
          if (ball.x > W - 14) {
            ball.x = W - 14;
            ball.vx = -Math.abs(ball.vx) * 0.8;
          }
          if (ball.y < 14) {
            ball.y = 14;
            ball.vy = Math.abs(ball.vy) * 0.8;
          }
          if (ball.y > H - 14) {
            ball.y = H - 14;
            ball.vy = -Math.abs(ball.vy) * 0.8;
          }
          // hole capture
          const d = Math.hypot(ball.x - h.hole.x, ball.y - h.hole.y);
          const sp = Math.hypot(ball.vx, ball.vy);
          if (d < 12 && sp < 5.5) {
            ball.moving = false;
            ball.x = h.hole.x;
            ball.y = h.hole.y;
            holeOut();
          }
          if (sp < 0.12) {
            ball.moving = false;
            ball.vx = ball.vy = 0;
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function holeOut() {
        won = true;
        total += strokes;
        AudioFX.win();
        msg = strokes <= MAX ? `Hole in ${strokes} — par or better!` : `Hole in ${strokes}`;
        statusEl.className = "status win";
        statusEl.textContent = msg;
        updateHud();
        after(() => {
          if (level + 1 < HOLES.length) loadHole(level + 1);
          else {
            // round over
            msg = `Course complete! Total strokes: ${total} (par ${MAX * HOLES.length})`;
            statusEl.textContent = msg;
            statusEl.className = "status " + (total <= MAX * HOLES.length ? "win" : "info");
            if (total > best) {
              best = total;
              Storage.setBest("minigolf", best);
            }
            const restart = () => {
              total = 0;
              loadHole(0);
              canvas.removeEventListener("pointerdown", restart);
            };
            after(() => canvas.addEventListener("pointerdown", restart), 400);
          }
        }, 900);
      }

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };
      const down = (e) => {
        if (ball.moving || won) return;
        const p = pos(e);
        if (Math.hypot(p.x - ball.x, p.y - ball.y) < 40) drag = {x: p.x, y: p.y};
      };
      const move = (e) => {
        if (drag) {
          e.preventDefault();
          const p = pos(e);
          drag.x = p.x;
          drag.y = p.y;
        }
      };
      const up = () => {
        if (!drag) return;
        const dx = ball.x - drag.x, dy = ball.y - drag.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) {
          const pw = Math.min(11, d / 12);
          ball.vx = (dx / d) * pw;
          ball.vy = (dy / d) * pw;
          ball.moving = true;
          strokes++;
          AudioFX.pop();
          updateHud();
        }
        drag = null;
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        const h = HOLES[level];
        // fairway
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.roundRect(8, 8, W - 16, H - 16, 18);
        ctx.fill();
        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 3;
        ctx.stroke();
        // sands
        ctx.fillStyle = "#fcd34d";
        for (const s of h.sands) ctx.fillRect(s.x, s.y, s.w, s.h);
        // walls
        ctx.fillStyle = "#1e293b";
        for (const w of h.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
        // hole
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.arc(h.hole.x, h.hole.y, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 2;
        ctx.stroke();
        // flag
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.hole.x, h.hole.y);
        ctx.lineTo(h.hole.x, h.hole.y - 26);
        ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.moveTo(h.hole.x, h.hole.y - 26);
        ctx.lineTo(h.hole.x + 20, h.hole.y - 20);
        ctx.lineTo(h.hole.x, h.hole.y - 14);
        ctx.closePath();
        ctx.fill();
        // aim line
        if (drag) {
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          const pw = Math.min(11, Math.hypot(ball.x - drag.x, ball.y - drag.y) / 12);
          const ux = (ball.x - drag.x), uy = (ball.y - drag.y), ud = Math.hypot(ux, uy) || 1;
          ctx.lineTo(ball.x + ux / ud * pw * 10, ball.y + uy / ud * pw * 10);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // ball
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
        ctx.fill();
        if (msg) {
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, H / 2 - 30, W, 60);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(msg, W / 2, H / 2 + 6);
        }
      }

      total = 0;
      loadHole(0);
      tick();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
    },
    help: function () {
      App.showModal("How to play Mini Golf",
        `<b>Drag</b> away from the ball (slingshot style) and release to putt — longer drag, harder hit.
        <br><br>Black blocks are walls; yellow patches are <b>sand</b> that kills your speed — chip around them.
        The ball only drops in the cup when it arrives <b>slowly</b>. Five holes, par 2 each.`);
    },
  });
})();
