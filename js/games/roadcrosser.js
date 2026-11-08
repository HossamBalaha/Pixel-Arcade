/* Road Crosser — hop across lanes of traffic, one hop at a time */
(function () {
  GameRegistry.register({
    id: "roadcrosser",
    name: "Road Crosser",
    icon: "🐔",
    category: "arcade",
    description: "Hop across busy roads and rivers — one hop at a time",
    tags: ["arcade", "hopping", "reflex"],
    mount: function (root, {App, AudioFX, Storage}) {
      const W = 300, CELL = 40, ROWS = 13;
      const H = ROWS * CELL;
      let chicken, rows, score, best, over, hopAnim, raf, dead;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="rc-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="rc-best">0</div></div>
        </div>
        <div class="status info" id="rc-status">↑ ↓ ← → to hop — cross the traffic and the river</div>
        <div class="center"><canvas id="rc-canvas" width="${W}" height="${H}"></canvas></div>
        <div class="dpad">
          <button class="up">↑</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
        <p class="hint">Cars never stop. On logs you drift with the river — don't float off the edge!</p>
      `;

      const canvas = root.querySelector("#rc-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#rc-status");
      best = Storage.getBest("roadcrosser") || 0;

      function reset() {
        chicken = {col: Math.floor(W / CELL / 2), row: ROWS - 1, x: 0, y: 0};
        chicken.x = chicken.col * CELL + CELL / 2;
        chicken.y = chicken.row * CELL + CELL / 2;
        score = 0;
        over = false;
        dead = null;
        hopAnim = null;
        rows = [];
        // build rows: 0..2 grass safe zones, then alternate road/water/grass
        for (let r = 0; r < ROWS; r++) {
          let type = "grass";
          if (r >= 3 && r <= 5) type = "road";
          else if (r >= 6 && r <= 7) type = "grass";
          else if (r >= 8 && r <= 9) type = "water";
          else if (r >= 3 && r <= ROWS - 2) type = "road";
          if (r === ROWS - 1 || r <= 2) type = "grass";
          if (r === ROWS - 2) type = "road";
          const row = {type, items: [], dir: Math.random() < 0.5 ? 1 : -1, speed: 0};
          if (type === "road") {
            row.speed = 0.7 + Math.random() * 1.4;
            let x = Math.random() * W;
            const n = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < n; i++) {
              row.items.push({
                x: ((x + i * (W / n)) % W + W) % W,
                w: CELL * (Math.random() < 0.3 ? 1.6 : 1),
                color: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"][Math.floor(Math.random() * 5)]
              });
            }
          } else if (type === "water") {
            row.speed = 0.5 + Math.random() * 0.9;
            row.dir = Math.random() < 0.5 ? 1 : -1;
            let x = Math.random() * W;
            for (let i = 0; i < 3; i++) {
              row.items.push({x: ((x + i * (W / 2.4)) % W + W) % W, w: CELL * 2.2});
            }
          }
          rows.push(row);
        }
        updateHud();
        statusEl.textContent = "↑ ↓ ← → to hop — cross the traffic and the river";
        statusEl.className = "status info";
      }

      function updateHud() {
        root.querySelector("#rc-score").textContent = score;
        root.querySelector("#rc-best").textContent = best;
      }

      function hop(dx, dy) {
        if (over) {
          reset();
          return;
        }
        const nc = chicken.col + dx, nr = chicken.row + dy;
        if (nc < 0 || nc >= W / CELL || nr < 0 || nr >= ROWS) return;
        if (nr < chicken.row) {
          score += 10;
          updateHud();
        }
        chicken.col = nc;
        chicken.row = nr;
        hopAnim = {t: 0, fx: chicken.x, fy: chicken.y};
        AudioFX.click();
      }

      function tick() {
        if (!over) {
          // move rows
          for (const row of rows) {
            if (!row.speed) continue;
            for (const it of row.items) {
              it.x += row.speed * row.dir;
              if (it.x > W + 80) it.x = -80;
              if (it.x < -80) it.x = W + 80;
            }
          }
          // hop animation
          const tx = chicken.col * CELL + CELL / 2, ty = chicken.row * CELL + CELL / 2;
          if (hopAnim) {
            hopAnim.t += 0.22;
            if (hopAnim.t >= 1) {
              hopAnim = null;
              chicken.x = tx;
              chicken.y = ty;
            } else {
              chicken.x = hopAnim.fx + (tx - hopAnim.fx) * hopAnim.t;
              chicken.y = hopAnim.fy + (ty - hopAnim.fy) * hopAnim.t - Math.sin(hopAnim.t * Math.PI) * 12;
            }
          } else {
            chicken.x = tx;
            chicken.y = ty;
          }
          // collisions when settled
          if (!hopAnim) {
            const row = rows[chicken.row];
            if (row.type === "road") {
              for (const it of row.items) {
                if (chicken.x > it.x - it.w / 2 && chicken.x < it.x + it.w / 2) return die("Splat! Hit by traffic 💥");
              }
            } else if (row.type === "water") {
              let onLog = false;
              for (const it of row.items) {
                if (chicken.x > it.x - it.w / 2 && chicken.x < it.x + it.w / 2) {
                  onLog = true;
                  it.carry = true;
                }
              }
              if (onLog) {
                chicken.x += row.speed * row.dir;
                chicken.col = Math.round((chicken.x - CELL / 2) / CELL);
                if (chicken.x < 8 || chicken.x > W - 8) return die("Swept down the river! 🌊");
              } else return die("Splash! You can't swim 🌊");
            }
          }
          // reached top
          if (chicken.row === 0 && !over) {
            score += 100;
            updateHud();
            AudioFX.win();
            statusEl.textContent = "🏅 +100 — keep going! Rows reshuffled.";
            statusEl.className = "status win";
            reshuffleTop();
          }
        }
        render();
        raf = requestAnimationFrame(tick);
      }

      function reshuffleTop() {
        // turn top rows into new random stretch and push chicken back to a safe row
        for (let r = 0; r < 6; r++) {
          const t = ["road", "water", "grass"][Math.floor(Math.random() * 3)];
          rows[r] = {
            type: t,
            items: [],
            dir: Math.random() < 0.5 ? 1 : -1,
            speed: t === "grass" ? 0 : 0.7 + Math.random() * 1.2
          };
          if (t === "road") {
            for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
              rows[r].items.push({
                x: Math.random() * W,
                w: CELL,
                color: ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"][Math.floor(Math.random() * 5)]
              });
            }
          } else if (t === "water") {
            for (let i = 0; i < 3; i++) rows[r].items.push({x: Math.random() * W, w: CELL * 2.2});
          }
        }
        chicken.row = 6;
        chicken.col = Math.floor(W / CELL / 2);
      }

      function die(msg) {
        over = true;
        AudioFX.lose();
        statusEl.textContent = msg + " Score: " + score;
        statusEl.className = "status lose";
        if (score > best) {
          best = score;
          Storage.setBest("roadcrosser", score);
          App.toast("New best: " + score, "success");
        }
        updateHud();
      }

      function render() {
        const st = getComputedStyle(document.documentElement);
        const accent = st.getPropertyValue("--accent").trim() || "#6366f1";
        for (let r = 0; r < ROWS; r++) {
          const row = rows[r];
          ctx.fillStyle = row.type === "road" ? "#374151" : row.type === "water" ? "#1d4ed8" : "#16a34a";
          ctx.fillRect(0, r * CELL, W, CELL);
          if (row.type === "road") {
            ctx.strokeStyle = "rgba(255,255,255,0.3)";
            ctx.setLineDash([10, 12]);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, r * CELL + CELL);
            ctx.lineTo(W, r * CELL + CELL);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          if (row.type === "water") {
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
              const wy = r * CELL + 12 + i * 10;
              ctx.beginPath();
              for (let x = 0; x < W; x += 26) {
                ctx.moveTo(x, wy);
                ctx.quadraticCurveTo(x + 6, wy - 3, x + 13, wy);
              }
              ctx.stroke();
            }
          }
          for (const it of row.items) {
            if (row.type === "road") {
              ctx.fillStyle = it.color;
              ctx.beginPath();
              ctx.roundRect(it.x - it.w / 2, r * CELL + 7, it.w, CELL - 14, 5);
              ctx.fill();
              ctx.fillStyle = "rgba(255,255,255,0.4)";
              ctx.fillRect(it.x - it.w / 2 + 4, r * CELL + 11, it.w - 8, 6);
            } else if (row.type === "water") {
              ctx.fillStyle = "#78350f";
              ctx.beginPath();
              ctx.roundRect(it.x - it.w / 2, r * CELL + 8, it.w, CELL - 16, 8);
              ctx.fill();
              ctx.fillStyle = "#5c3711";
              ctx.fillRect(it.x - it.w / 2 + 6, r * CELL + 8, 4, CELL - 16);
              ctx.fillRect(it.x + it.w / 2 - 10, r * CELL + 8, 4, CELL - 16);
            }
          }
        }
        // chicken
        ctx.font = "26px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🐔", chicken.x, chicken.y + 9);
        if (over) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.fillText("Game over", W / 2, H / 2);
          ctx.font = "13px sans-serif";
          ctx.fillText("Press any arrow to restart", W / 2, H / 2 + 24);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        const map = {
          arrowup: [0, -1],
          w: [0, -1],
          arrowdown: [0, 1],
          s: [0, 1],
          arrowleft: [-1, 0],
          a: [-1, 0],
          arrowright: [1, 0],
          d: [1, 0]
        };
        if (map[k]) {
          e.preventDefault();
          hop(map[k][0], map[k][1]);
        }
      };
      document.addEventListener("keydown", onKey);
      root.querySelectorAll(".dpad button").forEach(b => {
        const m = {up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]};
        b.addEventListener("click", () => hop(...m[b.className.trim()]));
      });

      reset();
      tick();
      return function cleanup() {
        cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Road Crosser",
        `Hop one tile at a time with <b>↑ ↓ ← →</b> (or the D-pad). Each step forward is <b>+10</b>, reaching the far side <b>+100</b>.
        <br><br>🚗 <b>Roads:</b> cars are deadly — never hop into one.
        🌊 <b>Rivers:</b> you must land on a <b>log</b>; logs carry you sideways, and floating off-screen drowns you.
        The world regenerates forever — how far can you get?`);
    },
  });
})();
