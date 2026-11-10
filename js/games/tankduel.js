/* Tank Duel — turn-based artillery: angle and power to hit the AI tank */
(function () {
  GameRegistry.register({
    id: "tankduel",
    name: "Tank Duel",
    icon: "🚜",
    category: "arcade",
    description: "Turn-based artillery — pick angle and power to hit the AI tank",
    tags: ["arcade", "artillery", "turn-based"],
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
      const W = 380, H = 320;
      let terrain, px, ax, phase, angle, power, proj, turn, pHp, aHp, wind, msg, raf, explode;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="tk-you">100</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="tk-ai">100</div></div>
          <div class="score-cell"><div class="label">Wind</div><div class="val" id="tk-wind">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="tk-turn">You</div></div>
        </div>
        <div class="status info" id="tk-status">◄ ► adjust angle (arrows), ▲ ▼ power — Space to fire</div>
        <div class="center"><canvas id="tk-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="tk-aup">Angle ▲</button>
          <button class="btn btn-sm" id="tk-adn">Angle ▼</button>
          <button class="btn btn-sm" id="tk-pup">Power ▲</button>
          <button class="btn btn-sm" id="tk-pdn">Power ▼</button>
          <button class="btn btn-sm primary" id="tk-fire">🔥 Fire</button>
        </div>
        <p class="hint">Direct hits deal 34–40 damage. Wind changes every turn — watch the flag.</p>
      `;

      const canvas = root.querySelector("#tk-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#tk-status");

      function genTerrain() {
        terrain = [];
        for (let x = 0; x <= W; x += 4) {
          const y = H - 46 - Math.sin(x / 55) * 22 - Math.sin(x / 23 + 2) * 9;
          terrain.push(y);
        }
      }

      function groundY(x) {
        const i = Math.max(0, Math.min(terrain.length - 1, Math.round(x / 4)));
        return terrain[i];
      }

      function reset() {
        genTerrain();
        px = 40 + Math.random() * 60;
        ax = W - 40 - Math.random() * 60;
        phase = "aim";
        angle = 45;
        power = 55;
        proj = null;
        turn = "you";
        pHp = 100;
        aHp = 100;
        wind = 0;
        msg = null;
        explode = null;
        rollWind();
        updateHud();
        statusEl.textContent = "◄ ► adjust angle (arrows), ▲ ▼ power — Space to fire";
        statusEl.className = "status info";
      }

      function rollWind() {
        wind = Math.round((Math.random() * 2 - 1) * 5);
      }

      function updateHud() {
        root.querySelector("#tk-you").textContent = pHp;
        root.querySelector("#tk-ai").textContent = aHp;
        root.querySelector("#tk-wind").textContent = (wind > 0 ? "→" : wind < 0 ? "←" : "") + Math.abs(wind);
        root.querySelector("#tk-turn").textContent = turn === "you" ? "You" : "AI";
      }

      function fire(fromX, ang, pow, isYou) {
        const dir = isYou ? 1 : -1;
        const a = ang * Math.PI / 180;
        const y0 = groundY(fromX) - 10;
        proj = {x: fromX, y: y0, vx: Math.cos(a) * pow * 0.115 * dir, vy: -Math.sin(a) * pow * 0.115, isYou};
        phase = "fly";
        AudioFX.pop();
      }

      function stepProj() {
        proj.vy += 0.045;
        proj.vx += wind * 0.0012;
        proj.x += proj.vx;
        proj.y += proj.vy;
        // hit tank?
        const tx = proj.isYou ? ax : px;
        if (Math.hypot(proj.x - tx, proj.y - (groundY(tx) - 8)) < 16) {
          const dmg = 34 + Math.floor(Math.random() * 7);
          if (proj.isYou) aHp = Math.max(0, aHp - dmg); else pHp = Math.max(0, pHp - dmg);
          explode = {x: proj.x, y: proj.y, t: 0};
          AudioFX.win();
          updateHud();
          endTurn();
          return;
        }
        // ground
        if (proj.y >= groundY(proj.x) || proj.x < -20 || proj.x > W + 20 || proj.y > H) {
          explode = {x: proj.x, y: Math.min(proj.y, groundY(Math.max(0, Math.min(W, proj.x)))), t: 0};
          AudioFX.error();
          endTurn();
        }
      }

      function endTurn() {
        proj = null;
        phase = "wait";
        if (pHp <= 0 || aHp <= 0) {
          after(() => {
            const won = aHp <= 0;
            statusEl.textContent = won ? "🏆 You destroyed the AI tank!" : "💥 Your tank is scrap metal…";
            statusEl.className = "status " + (won ? "win" : "lose");
            if (won) {
              const b = Storage.getBest("tankduel") || 0;
              Storage.setBest("tankduel", b + 1);
            }
            phase = "over";
          }, 700);
          return;
        }
        after(() => {
          rollWind();
          if (turn === "you") {
            turn = "ai";
            updateHud();
            aiThink();
          } else {
            turn = "you";
            phase = "aim";
            updateHud();
            statusEl.textContent = "Your turn — adjust and fire";
          }
        }, 900);
      }

      function aiThink() {
        // compute rough shot to player with error, improving when hurt
        const dx = px - ax;
        const err = (100 - aHp) / 100; // more desperate = better aim
        let ang = 38 + Math.random() * 20;
        let pow = Math.min(100, Math.abs(dx) / (Math.cos(ang * Math.PI / 180) * 0.115 * 2) * 0.55 + 30 + (Math.random() * 20 - 10) * (1 - err));
        // simple iterative improvement: simulate
        let bestPow = pow, bestDist = 1e9;
        for (let p = 30; p <= 100; p += 3) {
          const d = simulate(ax, ang, p, -1);
          if (Math.abs(d - px) < bestDist) {
            bestDist = Math.abs(d - px);
            bestPow = p;
          }
        }
        after(() => fire(ax, ang, bestPow + (Math.random() * 8 - 4) * (1 - err * 0.8), false), 800);
      }

      function simulate(x0, ang, pow, dir) {
        const a = ang * Math.PI / 180;
        let x = x0, y = groundY(x0) - 10;
        let vx = Math.cos(a) * pow * 0.115 * dir, vy = -Math.sin(a) * pow * 0.115;
        for (let i = 0; i < 400; i++) {
          vy += 0.045;
          vx += wind * 0.0012;
          x += vx;
          y += vy;
          if (y >= groundY(x)) return x;
        }
        return x;
      }

      function tick() {
        if (phase === "fly" && proj) stepProj();
        if (explode) {
          explode.t++;
          if (explode.t > 24) explode = null;
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function render() {
        // sky
        ctx.fillStyle = "#0b1220";
        ctx.fillRect(0, 0, W, H);
        // flag (wind)
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, 24);
        ctx.lineTo(W / 2, 52);
        ctx.stroke();
        ctx.fillStyle = wind === 0 ? "#64748b" : wind > 0 ? "#22c55e" : "#ef4444";
        const fw = Math.min(30, Math.abs(wind) * 6);
        ctx.beginPath();
        ctx.moveTo(W / 2, 26);
        ctx.lineTo(W / 2 + (wind >= 0 ? fw : -fw), 32);
        ctx.lineTo(W / 2, 38);
        ctx.closePath();
        ctx.fill();
        // terrain — kept lighter than the night sky so the silhouette reads
        ctx.fillStyle = "#5d4023";
        ctx.beginPath();
        ctx.moveTo(0, H);
        terrain.forEach((y, i) => ctx.lineTo(i * 4, y));
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
        // tanks
        drawTank(px, groundY(px), "#22c55e");
        drawTank(ax, groundY(ax), "#ef4444");
        // aim indicator
        if (turn === "you" && phase === "aim") {
          const a = angle * Math.PI / 180;
          ctx.strokeStyle = "rgba(255,255,255,0.6)";
          ctx.setLineDash([4, 6]);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, groundY(px) - 10);
          ctx.lineTo(px + Math.cos(a) * (power * 0.8), groundY(px) - 10 - Math.sin(a) * (power * 0.8));
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${angle}° ${power}`, px, groundY(px) - 46);
        }
        // projectile
        if (proj) {
          ctx.fillStyle = "#fde047";
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        // explosion
        if (explode) {
          const r = 6 + explode.t * 1.6;
          ctx.fillStyle = `rgba(251,${146 - explode.t * 3},60,${1 - explode.t / 24})`;
          ctx.beginPath();
          ctx.arc(explode.x, explode.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function drawTank(x, gy, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 16, gy - 14, 32, 10); // body
        ctx.fillRect(x - 5, gy - 22, 10, 8);   // turret
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, gy - 18);
        ctx.lineTo(x + (x < W / 2 ? 16 : -16), gy - 26);
        ctx.stroke();
        ctx.fillStyle = "#1c1917";
        ctx.fillRect(x - 16, gy - 5, 32, 5); // tracks
      }

      const adj = (a, p) => {
        if (phase !== "aim" || turn !== "you") return;
        angle = Math.max(5, Math.min(85, angle + a));
        power = Math.max(10, Math.min(100, power + p));
      };
      const onKey = (e) => {
        const k = e.key.toLowerCase();
        if (k === "arrowleft") adj(2, 0);
        if (k === "arrowright") adj(-2, 0);
        if (k === "arrowup") adj(0, 3);
        if (k === "arrowdown") adj(0, -3);
        if (k === " " && phase === "aim" && turn === "you") {
          e.preventDefault();
          fire(px, angle, power, true);
        }
        if (k === "r" && phase === "over") reset();
      };
      document.addEventListener("keydown", onKey);
      root.querySelector("#tk-aup").addEventListener("click", () => adj(2, 0));
      root.querySelector("#tk-adn").addEventListener("click", () => adj(-2, 0));
      root.querySelector("#tk-pup").addEventListener("click", () => adj(0, 3));
      root.querySelector("#tk-pdn").addEventListener("click", () => adj(0, -3));
      root.querySelector("#tk-fire").addEventListener("click", () => {
        if (phase === "aim" && turn === "you") fire(px, angle, power, true);
      });

      reset();
      tick();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Tank Duel",
        `Classic artillery duel. <b>← →</b> change the barrel <b>angle</b>, <b>↑ ↓</b> change <b>power</b>, then <b>Space</b> (or 🔥 Fire) to shoot.
        <br><br>The <b>wind flag</b> at the top pushes shells sideways — its strength and direction change every turn.
        Direct hits deal 34–40 damage; three hits win. The AI improves its aim as you hurt it. <b>R</b> restarts.`);
    },
  });
})();
