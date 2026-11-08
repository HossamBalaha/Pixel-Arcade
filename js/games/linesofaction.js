/* Lines of Action — move exactly as many squares as pieces in the line */
(function () {
  GameRegistry.register({
    id: "linesofaction",
    name: "Lines of Action",
    icon: "➕",
    category: "strategy",
    description: "Move exactly as many squares as pieces in the line",
    tags: ["strategy", "connection", "abstract"],
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
      const N = 8;
      let board, sel, turn, won, wins, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="lo-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lo-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="lo-turn">You</div></div>
        </div>
        <div class="status info" id="lo-status">Connect all your pieces into one group</div>
        <div class="center"><canvas id="lo-canvas" width="360" height="360"></canvas></div>
        <p class="hint">Move distance = total pieces (both colors) on that line. Jump friends, capture enemies.</p>
      `;

      const canvas = root.querySelector("#lo-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#lo-status");
      best = Storage.getBest("linesofaction") || 0;
      wins = 0;
      const CELL = 45;

      function reset() {
        // standard LOA setup: pieces on edges (not corners)
        board = Array.from({length: N}, () => Array(N).fill(0));
        for (let i = 1; i < N - 1; i++) {
          board[0][i] = 2;
          board[N - 1][i] = 2; // AI black on top/bottom rows
          board[i][0] = 1;
          board[i][N - 1] = 1; // player white on left/right cols
        }
        sel = null;
        turn = "p";
        won = null;
        render();
      }

      function lineCount(x, y, dx, dy) {
        let c = 0;
        for (let i = 0; i < N; i++) {
          const nx = x + dx * i, ny = y + dy * i;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
          if (board[ny][nx]) c++;
        }
        for (let i = 1; i < N; i++) {
          const nx = x - dx * i, ny = y - dy * i;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
          if (board[ny][nx]) c++;
        }
        return c;
      }

      function moves(x, y, side) {
        const out = [];
        const dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
        for (const [dx, dy] of dirs) {
          const dist = lineCount(x, y, dx, dy);
          if (dist <= 1) continue; // must move exactly dist; dist>=2 to move
          const nx = x + dx * dist, ny = y + dy * dist;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const target = board[ny][nx];
          if (target === side) continue; // can jump over own but not land on it
          // path clear?
          let clear = true;
          for (let k = 1; k < dist; k++) {
            if (board[y + dy * k][x + dx * k]) {
              clear = false;
              break;
            }
          }
          if (clear) out.push({x: nx, y: ny, cap: target !== 0});
        }
        return out;
      }

      function connected(side) {
        const pieces = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] === side) pieces.push([x, y]);
        if (pieces.length <= 1) return true;
        const seen = new Set([pieces[0].join(",")]);
        const stack = [pieces[0]];
        while (stack.length) {
          const [x, y] = stack.pop();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
            if (board[ny][nx] === side && !seen.has(nx + "," + ny)) {
              seen.add(nx + "," + ny);
              stack.push([nx, ny]);
            }
          }
        }
        return seen.size === pieces.length;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (360 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (360 / r.height)) / CELL);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        if (sel) {
          const m = moves(sel.x, sel.y, 1).find(m => m.x === x && m.y === y);
          if (m) {
            board[y][x] = 1;
            board[sel.y][sel.x] = 0;
            AudioFX.pop();
            sel = null;
            if (connected(1)) return doWin("p");
            turn = "a";
            render();
            after(aiMove, 600);
            return;
          }
        }
        if (board[y][x] === 1) {
          sel = {x, y};
          AudioFX.click();
        } else sel = null;
        render();
      });

      function doWin(w) {
        won = w;
        if (w === "p") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("linesofaction", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "➕ All your pieces are one — victory!" : "The AI connected its pieces first…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        render();
      }

      function aiMove() {
        const all = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] !== 2) continue;
          moves(x, y, 2).forEach(m => all.push({fx: x, fy: y, m}));
        }
        if (!all.length) return doWin("p");
        // evaluate: simulate, count components; prefer minimizing own components and captures
        let bestMove = null, bestScore = -1e9;
        for (const o of all) {
          const backup = board.map(r => r.slice());
          board[o.m.y][o.m.x] = 2;
          board[o.fy][o.fx] = 0;
          let score;
          if (connected(2)) score = 1e6;
          else {
            // count own groups + distance heuristic: sum of pairwise min distances
            const pieces = [];
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] === 2) pieces.push([x, y]);
            let cohesion = 0;
            for (let i = 0; i < pieces.length; i++) {
              let minD = 99;
              for (let j = 0; j < pieces.length; j++) {
                if (i === j) continue;
                minD = Math.min(minD, Math.max(Math.abs(pieces[i][0] - pieces[j][0]), Math.abs(pieces[i][1] - pieces[j][1])));
              }
              cohesion += minD;
            }
            score = -cohesion + (o.m.cap ? 12 : 0);
          }
          score += Math.random() * 2;
          board = backup;
          if (score > bestScore) {
            bestScore = score;
            bestMove = o;
          }
        }
        if (bestMove) {
          board[bestMove.m.y][bestMove.m.x] = 2;
          board[bestMove.fy][bestMove.fx] = 0;
          AudioFX.click();
        }
        if (connected(2)) return doWin("a");
        turn = "p";
        render();
      }

      function updateHud() {
        root.querySelector("#lo-wins").textContent = wins;
        root.querySelector("#lo-best").textContent = best;
        root.querySelector("#lo-turn").textContent = won ? "—" : turn === "p" ? "You" : "AI";
      }

      function render() {
        updateHud();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#cbd5e1" : "#e2e8f0";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? "#f8fafc" : "#0f172a";
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 17, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = v === 1 ? "#64748b" : "#475569";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (sel) {
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(sel.x * CELL + CELL / 2, sel.y * CELL + CELL / 2, 19, 0, Math.PI * 2);
          ctx.stroke();
          moves(sel.x, sel.y, 1).forEach(m => {
            ctx.fillStyle = m.cap ? "rgba(239,68,68,0.6)" : "rgba(22,163,74,0.5)";
            ctx.beginPath();
            ctx.arc(m.x * CELL + CELL / 2, m.y * CELL + CELL / 2, 10, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 360, 360);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! ➕" : "AI wins", 180, 180);
        }
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Lines of Action",
        `A chess-like connection game by Claude Soucie. Your white pieces start on the left and right edges;
        black (AI) on top and bottom.
        <br><br><b>The quirky move rule:</b> a piece moves exactly as many squares as there are <b>pieces (either color)
        on that line</b> — horizontally, vertically or diagonally. You may jump over your own pieces but not the enemy's;
        landing on an enemy captures it.
        <br><br>Goal: get <b>all your pieces connected into one group</b> (diagonal adjacency counts). Capturing can
        backfire — it shrinks your opponent's army toward connectivity!`);
    },
  });
})();
