/* mazeescape — procedurally generated mazes; reach the exit before the timer. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "mazeescape", name: "Maze Escape", icon: "🌀", category: "arcade",
    description: "Escape procedurally generated mazes against the clock", tags: ["arcade", "maze", "puzzle"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, timer = null;
      let N = 11, level = 1;
      let grid, player, exit, timeLeft, over, moves = 0;

      root.innerHTML = `
        <style>
          #me-grid { display: grid; margin: 8px auto; width: max-content; }
          .me-cell { width: 26px; height: 26px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; font-size: 15px; }
          .me-cell.wall { background: #1e293b; border-color: #334155; }
          .me-cell.you { background: #164e63; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="me-lv">1</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="me-tm">—</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="me-best">—</div></div>
        </div>
        <div class="status info" id="me-status">Find the 🚪 — arrows, WASD or swipe.</div>
        <div id="me-grid"></div>
        <div class="row" style="justify-content:center;"><button class="btn" id="me-new">🌀 New maze</button></div>
      `;

      // grid: cells with walls {t,r,b,l}; carve with iterative DFS
      function genMaze(n) {
        const cells = Array.from({length: n * n}, () => ({t: 1, r: 1, b: 1, l: 1, seen: false}));
        const at = (r, c) => cells[r * n + c];
        const stack = [[0, 0]];
        at(0, 0).seen = true;
        while (stack.length) {
          const [r, c] = stack[stack.length - 1];
          const opts = [];
          if (r > 0 && !at(r - 1, c).seen) opts.push([r - 1, c, "t", "b"]);
          if (r < n - 1 && !at(r + 1, c).seen) opts.push([r + 1, c, "b", "t"]);
          if (c > 0 && !at(r, c - 1).seen) opts.push([r, c - 1, "l", "r"]);
          if (c < n - 1 && !at(r, c + 1).seen) opts.push([r, c + 1, "r", "l"]);
          if (!opts.length) {
            stack.pop();
            continue;
          }
          const [nr, nc, w1, w2] = opts[Math.floor(Math.random() * opts.length)];
          at(r, c)[w1] = 0;
          at(nr, nc)[w2] = 0;
          at(nr, nc).seen = true;
          stack.push([nr, nc]);
        }
        return cells;
      }

      function newLevel() {
        N = Math.min(21, 9 + level * 2);
        grid = genMaze(N);
        player = [0, 0];
        exit = [N - 1, N - 1];
        timeLeft = Math.max(20, 20 + N * 2 - 10);
        over = false;
        moves = 0;
        const lv = root.querySelector("#me-lv");
        if (lv) lv.textContent = level;
        setStatus("Find the 🚪 — arrows, WASD or swipe.");
        render();
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive || over) return;
          timeLeft--;
          const tEl = root.querySelector("#me-tm");
          if (tEl) tEl.textContent = timeLeft + "s";
          if (timeLeft <= 0) {
            over = true;
            setStatus("⏰ Out of time! Level " + level, "lose");
            AudioFX.lose();
            App.recordResult(false, level - 1);
          }
        }, 1000);
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#me-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function tryMove(dr, dc) {
        if (over || !grid) return;
        const [r, c] = player;
        const cell = grid[r * N + c];
        if (dr === -1 && cell.t) return;
        if (dr === 1 && cell.b) return;
        if (dc === -1 && cell.l) return;
        if (dc === 1 && cell.r) return;
        player = [r + dr, c + dc];
        moves++;
        AudioFX.click();
        if (player[0] === exit[0] && player[1] === exit[1]) {
          over = true;
          clearInterval(timer);
          AudioFX.win();
          level++;
          setStatus(`🎉 Escaped in ${moves} moves! Next maze: level ${level}`, "win");
          App.recordResult(true, level - 1);
          setTimeout(() => {
            if (alive) newLevel();
          }, 1600);
        }
        render();
      }

      function render() {
        const el = root.querySelector("#me-grid");
        if (!el || !grid) return;
        el.style.gridTemplateColumns = `repeat(${N}, 26px)`;
        let h = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = grid[r * N + c];
          let cls = "me-cell";
          if (player[0] === r && player[1] === c) cls += " you";
          let inner = player[0] === r && player[1] === c ? "🏃" : (r === exit[0] && c === exit[1] ? "🚪" : "");
          h += `<div class="${cls}" style="border-top-width:${cell.t ? 1 : 0}px;border-right-width:${cell.r ? 1 : 0}px;border-bottom-width:${cell.b ? 1 : 0}px;border-left-width:${cell.l ? 1 : 0}px;">${inner}</div>`;
        }
        el.innerHTML = h;
      }

      const kd = e => {
        const map = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
          w: [-1, 0],
          s: [1, 0],
          a: [0, -1],
          d: [0, 1]
        };
        const m = map[e.key] || map[e.key.toLowerCase?.()];
        if (m) {
          e.preventDefault();
          tryMove(m[0], m[1]);
        }
      };
      document.addEventListener("keydown", kd);
      // swipe
      let sx = null, sy = null;
      root.addEventListener("pointerdown", e => {
        sx = e.clientX;
        sy = e.clientY;
      });
      root.addEventListener("pointerup", e => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.hypot(dx, dy) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
        else tryMove(dy > 0 ? 1 : -1, 0);
      });
      root.querySelector("#me-new").addEventListener("click", () => {
        AudioFX.click();
        level = 1;
        newLevel();
      });

      newLevel();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
        document.removeEventListener("keydown", kd);
      };
    },
    help: function () {
      App.showModal("How to play Maze Escape",
        "Every maze is generated fresh — start at the top-left 🏃 and reach the door 🚪 at the bottom-right." +
        "<br>Move with the arrow keys, WASD, or swipes. Thick borders are walls." +
        "<br>Beat the timer to advance: each level is a bigger maze. How deep can you go?");
    },
  });
})();
