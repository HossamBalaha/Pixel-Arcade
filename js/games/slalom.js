/* Slalom — ski down the slope, thread every gate, dodge the trees */
(function () {
  GameRegistry.register({
    id: "slalom",
    name: "Slalom",
    icon: "🎿",
    category: "arcade",
    description: "Ski down the slope — thread every gate, dodge the trees",
    tags: ["arcade", "sports", "reflex"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 340, H = 440;
      let px, vx, dist, speed, score, best, over, raf, crashed;
      let gates, trees;
      best = Storage.getBest("slalom") || 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sl-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sl-best">0</div></div>
          <div class="score-cell"><div class="label">Speed</div><div class="val" id="sl-speed">1×</div></div>
        </div>
        <div class="status info" id="sl-status">Ski with ← → — pass gates on the side of the red pole</div>
        <div class="center"><canvas id="sl-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Gate poles flash green when you pass correctly. Hitting a pole or tree ends the run.</p>
      `;

      const canvas = root.querySelector("#sl-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#sl-status");

      function reset() {
        px = W / 2;
        vx = 0;
        dist = 0;
        speed = 2.4;
        score = 0;
        over = false;
        crashed = false;
        gates = [];
        trees = [];
        for (let i = 0; i < 8; i++) addGate();
        updateHud();
        statusEl.textContent = "Ski with ← → — pass gates on the side of the red pole";
        statusEl.className = "status info";
      }

      function addGate() {
        // Stack each new gate 130px above the current topmost gate (screen
        // space — the array scrolls with the world, so this stays correct no
        // matter how far the run has gone). Side alternates from the LAST
        // gate's side; deriving it from gates.length broke alternation once
        // old gates started filtering out.
        const side = gates.length ? -gates[gates.length - 1].side : 1;
        const y = gates.length ? gates[gates.length - 1].y - 130 : -60;
        const cx = W / 2 + side * (35 + Math.random() * 60);
        gates.push({y, cx, side, passed: false, flash: 0});
        if (Math.random() < 0.55) {
          trees.push({x: 30 + Math.random() * (W - 60), y: y - 55});
        }
      }

      function updateHud() {
        root.querySelector("#sl-score").textContent = score;
        root.querySelector("#sl-best").textContent = best;
        root.querySelector("#sl-speed").textContent = (speed / 2.4).toFixed(1) + "×";
      }

      function tick() {
        if (!over) {
          dist += speed;
          speed = Math.min(6.5, 2.4 + dist / 2600);
          px += vx;
          vx *= 0.9;
          px = Math.max(12, Math.min(W - 12, px));
          // scroll world
          for (const g of gates) g.y += speed;
          for (const t of trees) t.y += speed;
          gates = gates.filter(g => g.y < H + 80);
          trees = trees.filter(t => t.y < H + 40);
          while (gates.length < 8) addGate();
          // gate pass check at player line
          for (const g of gates) {
            if (!g.passed && g.y + 10 >= H - 70 && g.y - 10 <= H - 70) {
              g.passed = true;
              // correct side: must pass to the RIGHT of red pole if side=1 ... red pole marks the gate inner edge
              const ok = g.side === 1 ? px > g.cx : px < g.cx;
              if (ok) {
                score += 10;
                g.flash = 12;
                AudioFX.pop();
              } else {
                die("Missed the gate!");
              }
              updateHud();
            }
            // pole collision
            if (Math.abs(g.y - (H - 70)) < 8 && Math.abs(px - g.cx) < 6) die("You clipped a pole!");
          }
          // tree collision
          for (const t of trees) {
            if (Math.abs(t.y - (H - 70)) < 12 && Math.abs(px - t.x) < 12) die("You hit a tree! 🌲");
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die(msg) {
        if (over) return;
        over = true;
        crashed = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("slalom", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        // fixed snowfield — trees, gates and skier use fixed colors that pop on white
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(0, 0, W, H);
        // slope piste lines (moving)
        ctx.strokeStyle = "rgba(128,128,160,0.25)";
        ctx.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const y = ((i * 90 + (dist * 0.7) % 90) + 900) % (H + 90) - 45;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        // trees
        for (const t of trees) {
          ctx.fillStyle = "#166534";
          ctx.beginPath();
          ctx.moveTo(t.x, t.y - 14);
          ctx.lineTo(t.x - 10, t.y + 10);
          ctx.lineTo(t.x + 10, t.y + 10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#78350f";
          ctx.fillRect(t.x - 2, t.y + 10, 4, 6);
        }
        // gates: blue + red pole pair
        for (const g of gates) {
          ctx.fillStyle = "#2563eb";
          ctx.fillRect(g.cx + (g.side === 1 ? -60 : 60), g.y - 14, 6, 34);
          ctx.fillStyle = g.flash > 0 ? "#22c55e" : "#dc2626";
          ctx.fillRect(g.cx - 3, g.y - 16, 6, 38);
          if (g.flash > 0) g.flash--;
        }
        // skier — fixed dark silhouette on the fixed snow
        ctx.save();
        ctx.translate(px, H - 70);
        ctx.rotate(vx * 0.04);
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(-9, 12);
        ctx.lineTo(9, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e2e8f0";
        ctx.beginPath();
        ctx.arc(0, -8, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(crashed ? "Wipeout!" : "Run over", W / 2, H / 2 - 8);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to restart", W / 2, H / 2 + 18);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") vx = -5.5;
        if (k === "arrowright" || k === "d") vx = 5.5;
        if (k === "r" && over) reset();
      };
      document.addEventListener("keydown", onKey);
      // touch steer
      let touchX = null;
      const onMove = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        const x = (t.clientX - r.left) * (W / r.width);
        vx = Math.max(-5.5, Math.min(5.5, (x - px) * 0.25));
      };
      canvas.addEventListener("pointermove", onMove);

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        canvas.removeEventListener("pointermove", onMove);
      };
    },
    help: function () {
      App.showModal("How to play Slalom",
        `Ski down the endless slope with <b>←</b> / <b>→</b> (or drag on the canvas).
        <br><br>Each gate is a pair of poles — <b>blue</b> and <b>red</b>. Pass on the side of the <b>red pole</b>
        (the side alternates every gate — watch the pattern).
        <br>Correct pass = <b>+10</b>. Clipping a pole or a tree ends the run. The slope gets faster the further you go.
        <br><b>R</b> restarts after a wipeout.`);
    },
  });
})();
