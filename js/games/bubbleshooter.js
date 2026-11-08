/* Bubble Shooter — aim and fire bubbles, pop clusters of three or more */
(function () {
  GameRegistry.register({
    id: "bubbleshooter",
    name: "Bubble Shooter",
    icon: "🫧",
    category: "arcade",
    description: "Aim and fire bubbles — pop clusters of three or more",
    tags: ["arcade", "aim", "match"],
    mount: function (root, {App, AudioFX, Storage}) {
      const R = 15, COLS = 12, ROWS = 12;
      const W = COLS * R * 2, H = ROWS * R * 2 + 60;
      const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];
      let grid, current, next, aim, score, best, over, raf, shots;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="bs-score">0</div></div>
          <div class="score-cell"><div class="label">Shots</div><div class="val" id="bs-shots">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bs-best">0</div></div>
        </div>
        <div class="status info" id="bs-status">Aim with the pointer — click to fire. Match 3+ to pop.</div>
        <div class="center"><canvas id="bs-canvas" width="${W}" height="${H}"></canvas></div>
        <p class="hint">Every 10 shots the ceiling pushes down one row. Don't let bubbles cross the line!</p>
      `;

      const canvas = root.querySelector("#bs-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bs-status");
      best = Storage.getBest("bubbleshooter") || 0;
      let flying = null;

      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return {x: (t.clientX - r.left) * (W / r.width), y: (t.clientY - r.top) * (H / r.height)};
      };

      function reset() {
        grid = [];
        for (let y = 0; y < 5; y++) {
          const row = [];
          const off = y % 2 ? R : 0;
          for (let x = 0; x < COLS; x++) {
            row.push({
              c: COLORS[Math.floor(Math.random() * COLORS.length)],
              x: x * R * 2 + R + off,
              y: y * R * 1.74 + R + 30,
              col: x,
              row: y
            });
          }
          grid.push(row);
        }
        score = 0;
        shots = 0;
        over = false;
        flying = null;
        current = COLORS[Math.floor(Math.random() * COLORS.length)];
        next = COLORS[Math.floor(Math.random() * COLORS.length)];
        updateHud();
        statusEl.textContent = "Aim with the pointer — click to fire. Match 3+ to pop.";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#bs-score").textContent = score;
        root.querySelector("#bs-shots").textContent = shots;
        root.querySelector("#bs-best").textContent = best;
      }

      const shooter = {x: W / 2, y: H - 30};
      let aimAngle = -Math.PI / 2;

      canvas.addEventListener("pointermove", (e) => {
        const p = pos(e);
        const a = Math.atan2(p.y - shooter.y, p.x - shooter.x);
        if (a < 0) aimAngle = Math.max(-Math.PI + 0.3, Math.min(-0.3, a));
      });
      canvas.addEventListener("pointerdown", (e) => {
        if (over) {
          reset();
          return;
        }
        if (flying) return;
        const p = pos(e);
        const a = Math.atan2(p.y - shooter.y, p.x - shooter.x);
        if (a < 0) aimAngle = Math.max(-Math.PI + 0.3, Math.min(-0.3, a));
        flying = {x: shooter.x, y: shooter.y, vx: Math.cos(aimAngle) * 7.5, vy: Math.sin(aimAngle) * 7.5, c: current};
        current = next;
        next = COLORS[Math.floor(Math.random() * COLORS.length)];
        shots++;
        AudioFX.pop();
        updateHud();
      });

      function allBubbles() {
        const out = [];
        grid.forEach((row, y) => row.forEach(b => {
          if (b) out.push({...b, row: y});
        }));
        return out;
      }

      function snapBubble(f) {
        // find nearest empty grid slot
        const rowIdx = Math.round((f.y - 30 - R) / (R * 1.74));
        const off = rowIdx % 2 ? R : 0;
        const colIdx = Math.round((f.x - R - off) / (R * 2));
        if (rowIdx < 0) return null;
        while (grid.length <= rowIdx) grid.push(Array(COLS).fill(null).map((_, x) => null));
        const row = grid[rowIdx];
        const col = Math.max(0, Math.min(COLS - 1, colIdx));
        if (row[col]) return null; // occupied
        const placed = {
          c: f.c,
          x: col * R * 2 + R + (rowIdx % 2 ? R : 0),
          y: rowIdx * R * 1.74 + R + 30,
          col,
          row: rowIdx
        };
        row[col] = placed;
        return placed;
      }

      function neighbors(b) {
        const out = [];
        const off = b.row % 2 ? -1 : 0;
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [off, -1], [off, 1]];
        for (const [dx, dy] of dirs) {
          const r = b.row + dy, c = b.col + dx;
          if (r >= 0 && r < grid.length && c >= 0 && c < COLS && grid[r] && grid[r][c]) out.push(grid[r][c]);
        }
        return out;
      }

      function popCluster(seed) {
        // BFS same color
        const seen = new Set([seed.row + "," + seed.col]);
        const stack = [seed];
        const cluster = [seed];
        while (stack.length) {
          const b = stack.pop();
          for (const n of neighbors({...b, row: b.row, col: b.col})) {
            const k = n.row + "," + n.col;
            if (!seen.has(k) && n.c === seed.c) {
              seen.add(k);
              stack.push(n);
              cluster.push(n);
            }
          }
        }
        if (cluster.length >= 3) {
          cluster.forEach(b => {
            grid[b.row][b.col] = null;
          });
          score += cluster.length * 10;
          AudioFX.win();
          dropFloaters();
          updateHud();
          return true;
        }
        return false;
      }

      function dropFloaters() {
        // keep only bubbles connected to top row
        const keep = new Set();
        const stack = [];
        grid[0] && grid[0].forEach((b, c) => {
          if (b) {
            keep.add("0," + c);
            stack.push({...b, row: 0, col: c});
          }
        });
        while (stack.length) {
          const b = stack.pop();
          for (const n of neighbors(b)) {
            const k = n.row + "," + n.col;
            if (!keep.has(k)) {
              keep.add(k);
              stack.push(n);
            }
          }
        }
        let dropped = 0;
        grid.forEach((row, r) => row.forEach((b, c) => {
          if (b && !keep.has(r + "," + c)) {
            grid[r][c] = null;
            dropped++;
          }
        }));
        if (dropped) {
          score += dropped * 20;
          App.toast(dropped + " bubbles dropped! +" + dropped * 20, "success");
        }
      }

      function pushDown() {
        grid.unshift(Array(COLS).fill(null));
        grid.forEach((row, r) => row.forEach(b => {
          if (b) {
            b.y += R * 1.74;
            b.row = r;
          }
        }));
      }

      function tick() {
        if (flying && !over) {
          flying.x += flying.vx;
          flying.y += flying.vy;
          if (flying.x < R) {
            flying.x = R;
            flying.vx *= -1;
            AudioFX.click();
          }
          if (flying.x > W - R) {
            flying.x = W - R;
            flying.vx *= -1;
            AudioFX.click();
          }
          if (flying.y < 30 + R) { // hit ceiling
            const placed = snapBubble(flying);
            flying = null;
            if (placed) popCluster(placed);
            afterShot();
          } else {
            // hit a bubble?
            for (const b of allBubbles()) {
              if (Math.hypot(b.x - flying.x, b.y - flying.y) < R * 2 - 2) {
                const placed = snapBubble(flying);
                flying = null;
                if (placed) popCluster(placed);
                afterShot();
                break;
              }
            }
          }
          // bottom check
          if (flying && flying.y > H - 60) {
            flying = null;
            afterShot();
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function afterShot() {
        if (shots % 10 === 0 && !over) {
          pushDown();
        }
        // game over check
        for (const b of allBubbles()) {
          if (b.y > H - 110) {
            over = true;
            statusEl.textContent = `Game over — score ${score}`;
            statusEl.className = "status lose";
            if (score > best) {
              best = score;
              Storage.setBest("bubbleshooter", score);
              App.toast("New best: " + score, "success");
            }
            updateHud();
            break;
          }
        }
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const bgSoft = st.getPropertyValue("--bg-soft").trim() || "#0f172a";
        const text = st.getPropertyValue("--text").trim() || "#eee";
        ctx.fillStyle = bgSoft;
        ctx.fillRect(0, 0, W, H);
        // danger line
        ctx.strokeStyle = "#ef4444";
        ctx.setLineDash([8, 8]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, H - 100);
        ctx.lineTo(W, H - 100);
        ctx.stroke();
        ctx.setLineDash([]);
        // bubbles
        const drawB = (b, r) => {
          ctx.fillStyle = b.c;
          ctx.beginPath();
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.beginPath();
          ctx.arc(b.x - r * 0.3, b.y - r * 0.3, r * 0.3, 0, Math.PI * 2);
          ctx.fill();
        };
        allBubbles().forEach(b => drawB(b, R - 1));
        // aim guide
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(shooter.x, shooter.y);
        ctx.lineTo(shooter.x + Math.cos(aimAngle) * 80, shooter.y + Math.sin(aimAngle) * 80);
        ctx.stroke();
        ctx.setLineDash([]);
        // flying
        if (flying) drawB(flying, R - 1);
        // shooter + next
        drawB({x: shooter.x, y: shooter.y, c: current}, R - 1);
        ctx.fillStyle = text;
        ctx.font = "12px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Next:", 12, H - 12);
        drawB({x: 58, y: H - 16, c: next}, 10);
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game over", W / 2, H / 2);
          ctx.font = "14px sans-serif";
          ctx.fillText("Click to play again", W / 2, H / 2 + 26);
        }
      }

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
      };
    },
    help: function () {
      App.showModal("How to play Bubble Shooter",
        `Aim with your pointer and click to fire the colored bubble. Walls <b>bounce</b> the shot — use bank shots to reach tight spots.
        <br><br>Match <b>3 or more</b> of a color to pop them. Bubbles left hanging without support fall for <b>double points</b>.
        Every 10 shots the ceiling adds a row; bubbles past the red line end the game.`);
    },
  });
})();
