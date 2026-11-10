/* Hex Dodge — spin through the closing walls at hyper speed */
(function () {
  GameRegistry.register({
    id: "hexdodge",
    name: "Hex Dodge",
    icon: "🔷",
    category: "arcade",
    description: "Spin through the closing walls at hyper speed",
    tags: ["arcade", "reflex", "hyper-casual"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 360, H = 400;
      let rot, obstacles, dist, speed, best, over, raf, score, spinV;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hx-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hx-best">0</div></div>
        </div>
        <div class="status info" id="hx-status">← → (or drag) to rotate — fit through the gaps</div>
        <div class="center"><canvas id="hx-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Only one side of your triangle is vulnerable — the point. Wall edges are safe.</p>
      `;

      const canvas = root.querySelector("#hx-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hx-status");
      best = Storage.getBest("hexdodge") || 0;
      const CX = W / 2, CY = H / 2, R = 150;

      function reset() {
        rot = -Math.PI / 2;
        spinV = 0;
        obstacles = [{r: 460, gap: Math.random() * Math.PI * 2, gapW: 1.2}];
        dist = 0;
        speed = 1.6;
        score = 0;
        over = false;
        updateHud();
        statusEl.textContent = "← → (or drag) to rotate — fit through the gaps";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#hx-score").textContent = score;
        root.querySelector("#hx-best").textContent = best;
      }

      function spawn() {
        const gapW = Math.max(0.5, 1.25 - score / 45);
        obstacles.push({r: 470, gap: Math.random() * Math.PI * 2, gapW});
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft" || k === "a") spinV = -0.11;
        if (k === "arrowright" || k === "d") spinV = 0.11;
        if (k === "r" && over) reset();
      };
      const onKeyUp = (e) => {
        const k = e.key.toLowerCase();
        if (["arrowleft", "a", "arrowright", "d"].includes(k)) spinV = 0;
      };
      document.addEventListener("keydown", onKey);
      document.addEventListener("keyup", onKeyUp);
      // drag rotate
      let dragging = false;
      canvas.addEventListener("pointerdown", () => {
        dragging = true;
      });
      window.addEventListener("pointerup", () => dragging = false);
      canvas.addEventListener("pointermove", (e) => {
        if (!dragging || over) return;
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (W / r.width) - CX;
        const y = (e.clientY - r.top) * (H / r.height) - CY;
        const a = Math.atan2(y, x);
        let d = a - rot;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        rot += d * 0.35;
      });

      function tick() {
        if (!over) {
          rot += spinV;
          score += 1;
          speed = 1.6 + score / 90;
          for (const o of obstacles) o.r -= speed;
          obstacles = obstacles.filter(o => o.r > 26);
          if (obstacles.length < 3 && Math.random() < 0.03 + score / 40000) spawn();
          updateHud();
          // collision: player point at rot, radius 20
          const pr = 22;
          for (const o of obstacles) {
            // player must pass through ring when ring radius crosses player radius
            if (Math.abs(o.r - pr) < 10) {
              // angular distance from gap center
              let d = rot - o.gap;
              while (d > Math.PI) d -= Math.PI * 2;
              while (d < -Math.PI) d += Math.PI * 2;
              if (Math.abs(d) > o.gapW / 2) return die();
            }
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function die() {
        over = true;
        AudioFX.lose();
        statusEl.textContent = "Crunch! Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("hexdodge", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function hexPath(r) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
      }

      function render() {
        ctx.fillStyle = "#0b1020";
        ctx.fillRect(0, 0, W, H);
        // rotating hex backdrop
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(score / 300);
        ctx.strokeStyle = "rgba(99,102,241,0.15)";
        ctx.lineWidth = 1;
        for (let r = 40; r < 260; r += 28) hexPathAt(ctx, r);
        ctx.restore();
        // obstacles: arcs with gap
        for (const o of obstacles) {
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.arc(CX, CY, o.r, o.gap + o.gapW / 2, o.gap - o.gapW / 2 + Math.PI * 2);
          ctx.stroke();
          // glow edges
          ctx.strokeStyle = "rgba(251,146,60,0.5)";
          ctx.lineWidth = 18;
          ctx.stroke();
        }
        // player triangle pointing at rot — fixed cyan: dark canvas in every theme
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(rot);
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.lineTo(-14, -15);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-14, 15);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.65)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Crunch!", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Press R to spin again", W / 2, H / 2 + 24);
        }
      }

      function hexPathAt(c, r) {
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        c.closePath();
        c.stroke();
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        document.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("pointerup", () => {
        });
      };
    },
    help: function () {
      App.showModal("How to play Hex Dodge",
        `You are the arrow at the center, always pointing outward. Orange ring walls close in —
        rotate with <b>← →</b> (or drag) so your <b>arrow tip</b> lines up with the wall's gap when it arrives.
        <br><br>Your flat back can brush walls safely; only the tip collides. Walls speed up and gaps shrink
        as your score climbs. It gets very fast — stay calm and make small corrections.`);
    },
  });
})();
