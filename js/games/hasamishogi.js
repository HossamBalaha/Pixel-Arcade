/* Hasami Shogi — sandwich enemy pieces on the grid to capture them */
(function () {
  GameRegistry.register({
    id: "hasamishogi",
    name: "Hasami Shogi",
    icon: "🎴",
    category: "strategy",
    description: "Sandwich enemy pieces between yours to capture them",
    tags: ["strategy", "capture", "abstract"],
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
      const N = 9;
      let board, sel, turn, won, wins, best;
      const NEED = 5; // capture 5 to win

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Captured</div><div class="val" id="hs-you">0/5</div></div>
          <div class="score-cell"><div class="label">AI captured</div><div class="val" id="hs-ai">0/5</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="hs-wins">0</div></div>
        </div>
        <div class="status info" id="hs-status">Move like a rook — capture by sandwiching</div>
        <div class="center"><canvas id="hs-canvas" width="378" height="378"></canvas></div>
        <p class="hint">Pin an enemy (or run of enemies) against one of your pieces to lift them off.</p>
      `;

      const canvas = root.querySelector("#hs-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hs-status");
      best = Storage.getBest("hasamishogi") || 0;
      wins = 0;
      let captured = {p: 0, a: 0};
      const CELL = 42;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        for (let x = 0; x < N; x++) {
          board[0][x] = 2;
          board[N - 1][x] = 1;
        }
        sel = null;
        turn = "p";
        won = null;
        captured = {p: 0, a: 0};
        render();
      }

      function rookMoves(x, y) {
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          for (let k = 1; k < N; k++) {
            const nx = x + dx * k, ny = y + dy * k;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
            if (board[ny][nx]) break;
            out.push({x: nx, y: ny});
          }
        }
        return out;
      }

      function doCaptures(x, y, side) {
        // check all 4 directions: adjacent run of enemy pieces terminated by our piece
        let count = 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const kx = x + dx, ky = y + dy;
          if (kx < 0 || ky < 0 || kx >= N || ky >= N || board[ky][kx] !== (side === 1 ? 2 : 1)) continue;
          const victims = [];
          let cx = kx, cy = ky;
          while (cx >= 0 && cy >= 0 && cx < N && cy < N && board[cy][cx] === (side === 1 ? 2 : 1)) {
            victims.push([cx, cy]);
            cx += dx;
            cy += dy;
          }
          if (cx >= 0 && cy >= 0 && cx < N && cy < N && board[cy][cx] === side) {
            victims.forEach(([vx, vy]) => board[vy][vx] = 0);
            count += victims.length;
          }
        }
        return count;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (378 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (378 / r.height)) / CELL);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        if (sel) {
          const m = rookMoves(sel.x, sel.y).find(m => m.x === x && m.y === y);
          if (m) {
            board[y][x] = 1;
            board[sel.y][sel.x] = 0;
            const c = doCaptures(x, y, 1);
            captured.p += c;
            if (c) AudioFX.win(); else AudioFX.pop();
            sel = null;
            if (captured.p >= NEED) return doWin("p");
            turn = "a";
            render();
            after(aiTurn, 600);
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
            Storage.setBest("hasamishogi", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "🎴 Five captures — you win!" : "The AI captured five of your pieces…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        render();
      }

      function aiTurn() {
        if (won) return;
        let bestMove = null, bestScore = -1e9;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] !== 2) continue;
          for (const m of rookMoves(x, y)) {
            const backup = board.map(r => r.slice());
            board[y][x] = 0;
            board[m.y][m.x] = 2;
            const caps = doCaptures(m.x, m.y, 2);
            let score = caps * 10;
            // avoid getting sandwiched: check if player can capture this square next
            let danger = 0;
            for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
              if (board[yy][xx] !== 1) continue;
              // simulate player capture potential on target area (cheap check)
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const ax = m.x + dx, ay = m.y + dy;
                const bx = m.x - dx, by = m.y - dy;
                if (ax >= 0 && ay >= 0 && ax < N && ay < N && bx >= 0 && by >= 0 && bx < N && by < N) {
                  if (board[ay][ax] === 1 && board[by][bx] === 1) danger++;
                }
              }
            }
            score -= danger * 3;
            score += Math.random() * 1.5;
            board = backup;
            if (score > bestScore) {
              bestScore = score;
              bestMove = {x, y, m};
            }
          }
        }
        if (bestMove) {
          board[bestMove.y][bestMove.x] = 0;
          board[bestMove.m.y][bestMove.m.x] = 2;
          const c = doCaptures(bestMove.m.x, bestMove.m.y, 2);
          captured.a += c;
          if (c) AudioFX.error(); else AudioFX.click();
          if (captured.a >= NEED) return doWin("a");
        }
        turn = "p";
        render();
      }

      function render() {
        root.querySelector("#hs-you").textContent = captured.p + "/5";
        root.querySelector("#hs-ai").textContent = captured.a + "/5";
        root.querySelector("#hs-wins").textContent = wins;
        ctx.fillStyle = "#78350f";
        ctx.fillRect(0, 0, 378, 378);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#e8d5b5" : "#f0e0c4";
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          ctx.fillStyle = v === 1 ? "#f8fafc" : "#0f172a";
          ctx.beginPath();
          ctx.roundRect(x * CELL + 5, y * CELL + 5, CELL - 10, CELL - 10, 6);
          ctx.fill();
          ctx.strokeStyle = v === 1 ? "#64748b" : "#475569";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = v === 1 ? "#334155" : "#e2e8f0";
          ctx.font = "13px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(v === 1 ? "歩" : "歩", x * CELL + CELL / 2, y * CELL + CELL / 2 + 5);
        }
        if (sel) {
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 3;
          ctx.strokeRect(sel.x * CELL + 2, sel.y * CELL + 2, CELL - 4, CELL - 4);
          rookMoves(sel.x, sel.y).forEach(m => {
            ctx.fillStyle = "rgba(22,163,74,0.45)";
            ctx.beginPath();
            ctx.arc(m.x * CELL + CELL / 2, m.y * CELL + CELL / 2, 9, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 378, 378);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🎴" : "AI wins", 189, 189);
        }
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Hasami Shogi",
        `“Sandwiching shogi” — pieces move like <b>rooks</b> (any distance along a row or column, no jumping).
        <br><br><b>Capturing:</b> after moving, if one of your pieces pins a straight run of enemy pieces
        against <b>another</b> of your pieces (enemy in between), the whole run is captured.
        <br>Goal: capture <b>5</b> enemy pieces. Watch out — careless moves get your own pieces clamped!`);
    },
  });
})();
