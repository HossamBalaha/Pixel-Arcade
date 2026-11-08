/* tron — light cycles: you vs the AI; walls and trails are fatal. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "tron", name: "Tron Light Cycles", icon: "🏍️", category: "arcade",
    description: "Outride the AI — don't hit the walls or any light trail", tags: ["arcade", "classic", "versus"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      const N = 30, CELL = 14, W = N * CELL;
      root.innerHTML = `
        <style>#tr-c { display:block; margin:0 auto; background:#020617; border-radius:12px; }</style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="tr-w">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="tr-r">1</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="tr-l">0</div></div>
        </div>
        <div class="status info" id="tr-status">Steer with the arrow keys — first crash loses.</div>
        <canvas id="tr-c" width="${W}" height="${W}"></canvas>
        <div class="row" style="justify-content:center;"><button class="btn" id="tr-new">↺ New round</button></div>
      `;
      const cv = root.querySelector("#tr-c");
      const g = cv.getContext("2d");
      let grid, you, ai, raf = null, timer = null, over = false;
      let wins = {you: 0, ai: 0}, round = 1;

      function reset() {
        grid = Array.from({length: N}, () => Array(N).fill(0)); // 1 you, 2 ai
        you = {r: Math.floor(N / 2), c: 5, dr: 0, dc: 1};
        ai = {r: Math.floor(N / 2), c: N - 6, dr: 0, dc: -1};
        grid[you.r][you.c] = 1;
        grid[ai.r][ai.c] = 2;
        over = false;
        setStatus("Steer with the arrow keys — first crash loses.");
        draw();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#tr-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function step() {
        if (over) return;
        // ai steering: avoid immediate death, prefer space (flood-fill lite: pick direction with most free cells)
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
          .filter(([dr, dc]) => !(dr === -ai.dr && dc === -ai.dc));
        let best = null, bestSpace = -1;
        for (const [dr, dc] of dirs) {
          const nr = ai.r + dr, nc = ai.c + dc;
          if (nr < 0 || nr >= N || nc < 0 || nc >= N || grid[nr][nc]) continue;
          let space = 0;
          for (let k = 1; k < N; k++) {
            const fr = ai.r + dr * k, fc = ai.c + dc * k;
            if (fr < 0 || fr >= N || fc < 0 || fc >= N || grid[fr][fc]) break;
            space++;
          }
          if (space > bestSpace) {
            bestSpace = space;
            best = [dr, dc];
          }
        }
        if (best) {
          ai.dr = best[0];
          ai.dc = best[1];
        }
        // move both
        let youDead = false, aiDead = false;
        you.r += you.dr;
        you.c += you.dc;
        if (you.r < 0 || you.r >= N || you.c < 0 || you.c >= N || grid[you.r][you.c]) youDead = true;
        ai.r += ai.dr;
        ai.c += ai.dc;
        if (ai.r < 0 || ai.r >= N || ai.c < 0 || ai.c >= N || grid[ai.r][ai.c]) aiDead = true;
        if (youDead && aiDead) {
          finish("draw");
          return;
        }
        if (youDead) {
          finish("ai");
          return;
        }
        if (aiDead) {
          finish("you");
          return;
        }
        grid[you.r][you.c] = 1;
        grid[ai.r][ai.c] = 2;
        draw();
      }

      function finish(w) {
        over = true;
        if (w === "you") {
          wins.you++;
          setStatus("🎉 The AI crashed — you win the round!", "win");
          AudioFX.win();
          App.recordResult(true, wins.you);
        } else if (w === "ai") {
          wins.ai++;
          setStatus("💥 You crashed — AI takes the round.", "lose");
          AudioFX.lose();
          App.recordResult(false, wins.ai);
        } else {
          setStatus("Both crashed — draw!", "");
        }
        const wEl = root.querySelector("#tr-w"), lEl = root.querySelector("#tr-l");
        if (wEl) wEl.textContent = wins.you;
        if (lEl) lEl.textContent = wins.ai;
        draw(true);
      }

      function draw(crash) {
        g.fillStyle = "#020617";
        g.fillRect(0, 0, W, W);
        g.strokeStyle = "#1e293b";
        for (let i = 0; i <= N; i++) {
          g.beginPath();
          g.moveTo(i * CELL, 0);
          g.lineTo(i * CELL, W);
          g.stroke();
          g.beginPath();
          g.moveTo(0, i * CELL);
          g.lineTo(W, i * CELL);
          g.stroke();
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (grid[r][c] === 1) {
            g.fillStyle = "#22d3ee";
            g.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
          }
          if (grid[r][c] === 2) {
            g.fillStyle = "#f97316";
            g.fillRect(c * CELL + 2, r * CELL + 2, CELL - 4, CELL - 4);
          }
        }
        if (!over) {
          g.font = "16px sans-serif";
          g.textAlign = "center";
          g.fillText("🏍️", you.c * CELL + CELL / 2, you.r * CELL + CELL / 2 + 6);
          g.fillText("🤖", ai.c * CELL + CELL / 2, ai.r * CELL + CELL / 2 + 6);
        }
      }

      const kd = e => {
        const map = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
        if (map[e.key]) {
          e.preventDefault();
          const [dr, dc] = map[e.key];
          if (!(dr === -you.dr && dc === -you.dc)) {
            you.dr = dr;
            you.dc = dc;
          }
        }
      };
      document.addEventListener("keydown", kd);
      // touch steering
      cv.addEventListener("pointerdown", e => {
        const rect = cv.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        const dx = mx - (you.c * CELL + CELL / 2), dy = my - (you.r * CELL + CELL / 2);
        if (Math.abs(dx) > Math.abs(dy)) {
          const dc = dx > 0 ? 1 : -1;
          if (dc !== -you.dc || you.dr !== 0) {
            you.dr = 0;
            you.dc = dc;
          }
        } else {
          const dr = dy > 0 ? 1 : -1;
          if (dr !== -you.dr || you.dc !== 0) {
            you.dr = dr;
            you.dc = 0;
          }
        }
      });
      root.querySelector("#tr-new").addEventListener("click", () => {
        round++;
        const rEl = root.querySelector("#tr-r");
        if (rEl) rEl.textContent = round;
        AudioFX.click();
        reset();
      });

      reset();
      timer = setInterval(() => {
        if (alive && !over) step();
      }, 110);
      return function cleanup() {
        alive = false;
        clearInterval(timer);
        document.removeEventListener("keydown", kd);
      };
    },
    help: function () {
      App.showModal("How to play Tron Light Cycles",
        "Your cyan cycle leaves a solid light trail; the orange AI does too." +
        "<br>Steer with the arrow keys (or tap a direction relative to your bike). You can't reverse." +
        "<br>First one to hit a wall, a trail or the other cycle loses the round. Force the AI into a dead end!");
    },
  });
})();
