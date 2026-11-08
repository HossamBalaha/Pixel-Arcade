/* Zigzag — tap to turn as the ball races along the zigzag wall */
(function () {
  GameRegistry.register({
    id: "zigzag",
    name: "Zigzag",
    icon: "⚡",
    category: "arcade",
    description: "Tap to turn as the ball races along the zigzag wall",
    tags: ["arcade", "reflex", "endless"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 440;
      // The track lives in "grid" space: cells advance in +y; direction is +x or -x
      // Camera keeps the player at a fixed screen point while the track scrolls down.
      let track, pos, score, best, over, raf, dir; // dir: +1 or -1
      best = Storage.getBest("zigzag") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="zz-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="zz-best">0</div></div>
        </div>
        <div class="status info" id="zz-status">Tap / press Space to turn — stay on the track!</div>
        <div class="center"><canvas id="zz-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">The ball speeds up as you survive. One wrong turn and it's over.</p>
      `;

      const canvas = root.querySelector("#zz-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#zz-status");
      const CELL = 28;

      // Track: list of {x, y} grid points the path passes through
      function reset() {
        track = [{x: 0, y: 0}, {x: 5, y: 0}, {x: 5, y: 5}, {x: -2, y: 5}];
        dir = 1; // moving +x or -x or +y handled by last segment
        pos = 0; // distance along track in cells
        score = 0;
        over = false;
        extend();
        updateHud();
        statusEl.textContent = "Tap / press Space to turn — stay on the track!";
        statusEl.className = "status info";
      }

      function extend() {
        while (track.length < 40) {
          const last = track[track.length - 1];
          const prev = track[track.length - 2];
          const movingX = last.y === prev.y; // horizontal segment
          if (movingX) {
            const len = 3 + Math.floor(Math.random() * 5);
            const ny = last.y + len;
            track.push({x: last.x, y: ny});
          } else {
            const len = 3 + Math.floor(Math.random() * 5);
            const right = Math.random() < 0.5;
            const nx = last.x + (right ? len : -len);
            track.push({x: nx, y: last.y});
          }
        }
      }

      function updateHud() {
        root.querySelector("#zz-score").textContent = score;
        root.querySelector("#zz-best").textContent = best;
      }

      // position along polyline in cell units
      function pointAt(d) {
        let acc = 0;
        for (let i = 1; i < track.length; i++) {
          const a = track[i - 1], b = track[i];
          const segLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
          if (d <= acc + segLen) {
            const t = (d - acc) / segLen;
            return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
          }
          acc += segLen;
        }
        const last = track[track.length - 1];
        return {x: last.x, y: last.y};
      }

      function currentSegment() {
        let acc = 0;
        for (let i = 1; i < track.length; i++) {
          const a = track[i - 1], b = track[i];
          const segLen = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
          if (pos <= acc + segLen) return {a, b, horizontal: a.y === b.y};
          acc += segLen;
        }
        return null;
      }

      function turn() {
        if (over) {
          reset();
          return;
        }
        const seg = currentSegment();
        if (!seg) return;
        // jumping to next segment start = turn now
        if (seg.horizontal) {
          // moving horizontally -> must turn to vertical
          const a = track[track.indexOf(seg.b)];
          pos = Math.ceil(pos);
        } else {
          pos = Math.ceil(pos);
        }
      }

      let lastTick = 0;

      function tick(ts) {
        raf = requestAnimationFrame(tick);
        if (!ts) return;
        if (!lastTick) lastTick = ts;
        const dt = Math.min(50, ts - lastTick);
        lastTick = ts;
        if (!over) {
          const speed = 4 + Math.min(8, score / 15); // cells per second
          pos += speed * dt / 1000;
          score = Math.floor(pos);
          extend();
          // trim behind
          if (pos > 30) {
            const shift = Math.floor(pos - 30);
            // recompute: easiest to shift track indices — skip optimization
          }
          updateHud();
        }
        render();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#111";
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        const accent2 = st.getPropertyValue("--accent-2").trim() || "#ec4899";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        const p = pointAt(pos);
        const camX = p.x, camY = p.y - 3.2; // keep player slightly above center
        const toScreen = (gx, gy) => ({sx: W / 2 + (gx - camX) * CELL, sy: H * 0.62 + (gy - camY) * CELL});
        // draw track as thick polyline
        ctx.strokeStyle = accent;
        ctx.lineWidth = CELL * 0.85;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        let started = false;
        const dStart = Math.max(0, pos - 16);
        for (let d = dStart; d <= pos + 40; d += 0.5) {
          const pt = pointAt(d);
          const s = toScreen(pt.x, pt.y);
          if (!started) {
            ctx.moveTo(s.sx, s.sy);
            started = true;
          } else ctx.lineTo(s.sx, s.sy);
        }
        ctx.stroke();
        // edges
        ctx.strokeStyle = accent2;
        ctx.lineWidth = 3;
        ctx.beginPath();
        started = false;
        for (let d = dStart; d <= pos + 40; d += 0.5) {
          const pt = pointAt(d);
          const s = toScreen(pt.x, pt.y);
          if (!started) {
            ctx.moveTo(s.sx, s.sy);
            started = true;
          } else ctx.lineTo(s.sx, s.sy);
        }
        ctx.setLineDash([6, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        // player
        const ps = toScreen(p.x, p.y);
        ctx.beginPath();
        ctx.arc(ps.sx, ps.sy, CELL * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = accent2;
        ctx.fill();
        // falling off?
        if (!over) {
          const seg = currentSegment();
          if (!seg) {
            die("Fell off the end!");
          }
        }
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("zigzag", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      const onKey = (e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          turn();
        }
      };
      document.addEventListener("keydown", onKey);
      canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        turn();
      });

      reset();
      raf = requestAnimationFrame(tick);
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Zigzag",
        `The ball rolls forward on its own. Tap the canvas (or press <b>Space</b>) to make a <b>90° turn</b> —
        the only way to stay on the zigzag path.
        <br><br>Your score is the distance travelled. The ball accelerates as you go, so turns must come faster and faster.
        Fall off and the run ends — tap to restart.`);
    },
  });
})();
