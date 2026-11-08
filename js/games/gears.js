/* Gear Puzzle — place gears on pegs to drive the wheel from the crank */
(function () {
  GameRegistry.register({
    id: "gears",
    name: "Gear Puzzle",
    icon: "⚙️",
    category: "logic",
    description: "Place gears on pegs to drive the wheel from the crank",
    tags: ["logic", "mechanics", "puzzle"],
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
      const W = 400, H = 300;
      let pegs, placed, solvedCount, best, spinning;
      const CRANK = {x: 50, y: H / 2}, WHEEL = {x: W - 60, y: H / 2};
      const R = 26; // gear radius

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="gr-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="gr-best">0</div></div>
        </div>
        <div class="status info" id="gr-status">Click pegs to add/remove gears — connect crank ➡️ wheel</div>
        <div class="center"><canvas id="gr-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="gr-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Gears must mesh (distance ≈ 2 radii). Connected gears counter-rotate!</p>
      `;

      const canvas = root.querySelector("#gr-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#gr-status");
      best = Storage.getBest("gears") || 0;
      solvedCount = 0;
      spinning = 0;

      function generate() {
        // peg grid, avoiding crank/wheel positions
        pegs = [];
        for (let y = 60; y < H - 40; y += 52) {
          for (let x = 110; x < W - 110; x += 58) {
            if (Math.hypot(x - CRANK.x, y - CRANK.y) < R * 2 + 6) continue;
            if (Math.hypot(x - WHEEL.x, y - WHEEL.y) < R * 2 + 6) continue;
            if (Math.random() < 0.62) pegs.push({x, y});
          }
        }
        placed = new Set();
        statusEl.textContent = "Click pegs to add/remove gears — connect crank ➡️ wheel";
        statusEl.className = "status info";
        render();
      }

      function adjacency() {
        // returns Map pegIdx -> [pegIdx...] for meshing gears + crank/wheel links
        const pts = [...pegs];
        const adj = pts.map(() => []);
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            if (Math.abs(d - R * 2) < 9) {
              adj[i].push(j);
              adj[j].push(i);
            }
          }
        }
        const crankLinks = pts.map(p => Math.abs(Math.hypot(p.x - CRANK.x, p.y - CRANK.y) - R * 2) < 9);
        const wheelLinks = pts.map(p => Math.abs(Math.hypot(p.x - WHEEL.x, p.y - WHEEL.y) - R * 2) < 9);
        return {adj, crankLinks, wheelLinks};
      }

      function connectedPath() {
        // BFS from crank through PLACED gears to wheel
        const {adj, crankLinks, wheelLinks} = adjacency();
        const visited = new Set();
        const queue = [];
        pegs.forEach((p, i) => {
          if (placed.has(i) && crankLinks[i]) {
            queue.push(i);
            visited.add(i);
          }
        });
        while (queue.length) {
          const i = queue.shift();
          if (wheelLinks[i]) return true;
          for (const j of adj[i]) {
            if (placed.has(j) && !visited.has(j)) {
              visited.add(j);
              queue.push(j);
            }
          }
        }
        return false;
      }

      function clickPeg(i) {
        if (placed.has(i)) placed.delete(i);
        else placed.add(i);
        AudioFX.click();
        render();
        if (connectedPath()) {
          spinning = 60;
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("gears", best);
          }
          statusEl.textContent = "⚙️⚙️⚙️ It spins! The wheel is driven. New puzzle…";
          statusEl.className = "status win";
          after(() => {
            spinning = 0;
            generate();
          }, 1900);
        }
      }

      let t = 0, raf = 0, dead = false;

      function render() {
        if (dead) return;
        t += spinning ? 0.09 : 0;
        root.querySelector("#gr-solved").textContent = solvedCount;
        root.querySelector("#gr-best").textContent = best;
        ctx.fillStyle = "#1c1917";
        ctx.fillRect(0, 0, W, H);
        // frame plate
        ctx.fillStyle = "#292524";
        ctx.beginPath();
        ctx.roundRect(10, 10, W - 20, H - 20, 14);
        ctx.fill();
        const {crankLinks, wheelLinks, adj} = adjacency();
        // pegs
        pegs.forEach((p, i) => {
          const on = placed.has(i);
          if (!on) {
            ctx.fillStyle = "#57534e";
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = crankLinks[i] || wheelLinks[i] ? "#fbbf24" : "#78716c";
            ctx.setLineDash([3, 3]);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
        // gears
        const drawGear = (x, y, ang, color) => {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(ang);
          ctx.fillStyle = color;
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            ctx.save();
            ctx.rotate(a);
            ctx.fillRect(R - 5, -4, 8, 8);
            ctx.restore();
          }
          ctx.beginPath();
          ctx.arc(0, 0, R - 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#1c1917";
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };
        // compute spin direction: distance from crank via BFS
        const spinDir = new Map();
        const queue = [];
        pegs.forEach((p, i) => {
          if (placed.has(i) && crankLinks[i]) {
            queue.push(i);
            spinDir.set(i, 1);
          }
        });
        while (queue.length) {
          const i = queue.shift();
          for (const j of adj[i]) if (placed.has(j) && !spinDir.has(j)) {
            spinDir.set(j, -spinDir.get(i));
            queue.push(j);
          }
        }
        pegs.forEach((p, i) => {
          if (placed.has(i)) drawGear(p.x, p.y, t * (spinDir.get(i) || 0) * (spinning ? 1 : 0), "#a8a29e");
        });
        // crank (always spins)
        drawGear(CRANK.x, CRANK.y, t, "#22c55e");
        // wheel: spins if connected
        if (connectedPath()) {
          const dirs = [...spinDir.values()];
          const wheelDir = -Math.sign(dirs.find(v => v !== 0) || 1);
          drawGear(WHEEL.x, WHEEL.y, t * wheelDir, "#fbbf24");
          // flag wave
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(WHEEL.x, WHEEL.y - R);
          ctx.lineTo(WHEEL.x, H / 2 - 56);
          ctx.stroke();
          ctx.fillStyle = "#fbbf24";
          const flap = Math.sin(t * 8) * 4;
          ctx.beginPath();
          ctx.moveTo(WHEEL.x, H / 2 - 56);
          ctx.lineTo(WHEEL.x + 26 + flap, H / 2 - 50);
          ctx.lineTo(WHEEL.x, H / 2 - 42);
          ctx.closePath();
          ctx.fill();
        } else {
          drawGear(WHEEL.x, WHEEL.y, 0, "#fbbf24");
        }
        if (spinning > 0) spinning--;
        raf = requestAnimationFrame(render);
      }

      canvas.addEventListener("pointerdown", (e) => {
        const r = canvas.getBoundingClientRect();
        const x = (e.clientX - r.left) * (W / r.width);
        const y = (e.clientY - r.top) * (H / r.height);
        for (let i = 0; i < pegs.length; i++) {
          if (Math.hypot(pegs[i].x - x, pegs[i].y - y) < R + 4) {
            clickPeg(i);
            return;
          }
        }
      });
      root.querySelector("#gr-new").addEventListener("click", generate);

      generate();
      raf = requestAnimationFrame(render);
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        dead = true;
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Gear Puzzle",
        `Click the small pegs to mount gears on them (click again to remove). Build a <b>chain of meshing gears</b>
        from the green <b>crank</b> on the left to the golden <b>wheel</b> on the right.
        <br><br>Gears mesh when their circles touch (dashed rings show the reach). When the chain is complete,
        everything spins — adjacent gears counter-rotate, so watch the physics come alive.`);
    },
  });
})();
