/* Amazons — queens move and shoot arrows to claim the last territory */
(function () {
  GameRegistry.register({
    id: "amazons",
    name: "Amazons",
    icon: "🏹",
    category: "strategy",
    description: "Queens move and shoot arrows — claim the last territory",
    tags: ["strategy", "territory", "chess-like"],
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
      const N = 10;
      let board, sel, phase, turn, won, wins, best;
      // board: 0 empty, 1 player amazon, 2 ai amazon, 3 arrow (blocked)

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="am2-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="am2-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="am2-turn">You</div></div>
        </div>
        <div class="status info" id="am2-status">Move a queen, then fire an arrow to block a square</div>
        <div class="center"><canvas id="am2-canvas" width="400" height="400"></canvas></div>
        <p class="hint">Whoever can't move loses. Every move removes two squares from the board forever!</p>
      `;

      const canvas = root.querySelector("#am2-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#am2-status");
      best = Storage.getBest("amazons") || 0;
      wins = 0;
      const CELL = 40;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        [[6, 0], [3, 0], [0, 3], [9, 3]].forEach(([x, y]) => board[y][x] = 1);
        [[6, 9], [3, 9], [0, 6], [9, 6]].forEach(([x, y]) => board[y][x] = 2);
        sel = null;
        phase = "move";
        turn = "p";
        won = null;
        render();
      }

      function queenMoves(x, y) {
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let k = 1; k < N; k++) {
            const nx = x + dx * k, ny = y + dy * k;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
            if (board[ny][nx]) break;
            out.push({x: nx, y: ny});
          }
        }
        return out;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (400 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (400 / r.height)) / CELL);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        if (phase === "move") {
          if (sel) {
            const m = queenMoves(sel.x, sel.y).find(m => m.x === x && m.y === y);
            if (m) {
              board[y][x] = 1;
              board[sel.y][sel.x] = 0;
              sel = {x, y};
              phase = "shoot";
              AudioFX.pop();
              render();
              return;
            }
          }
          if (board[y][x] === 1) {
            sel = {x, y};
            AudioFX.click();
          } else sel = null;
          render();
        } else if (phase === "shoot") {
          const m = queenMoves(sel.x, sel.y).find(m => m.x === x && m.y === y);
          if (m) {
            board[y][x] = 3;
            AudioFX.click();
            phase = "move";
            sel = null;
            if (checkEnd()) return;
            turn = "a";
            render();
            after(aiTurn, 650);
            return;
          }
          render();
        }
      });

      function checkEnd() {
        const side = turn === "p" ? 1 : 2;
        const any = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] === side && queenMoves(x, y).length) {
            any.push([x, y]);
          }
        }
        if (!any.length) {
          won = side === 1 ? "a" : "p"; // player stuck = AI wins
          if (won === "p") {
            wins++;
            AudioFX.win();
            if (wins > best) {
              best = wins;
              Storage.setBest("amazons", wins);
            }
          } else AudioFX.lose();
          statusEl.textContent = won === "p" ? "🏹 The AI has no moves — you rule the territory!" : "Your amazons are boxed in…";
          statusEl.className = "status " + (won === "p" ? "win" : "lose");
          render();
          return true;
        }
        return false;
      }

      function aiTurn() {
        // greedy: maximize own mobility - player mobility
        let bestMove = null, bestScore = -1e9;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] !== 2) continue;
          const mv = queenMoves(x, y);
          for (const m of mv) {
            // simulate move
            board[y][x] = 0;
            board[m.y][m.x] = 2;
            const shots = queenMoves(m.x, m.y);
            for (const s of shots.slice(0, 14)) {
              board[s.y][s.x] = 3;
              // mobility count
              let myMob = 0, theirMob = 0;
              for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
                if (board[yy][xx] === 2) myMob += queenMoves(xx, yy).length;
                else if (board[yy][xx] === 1) theirMob += queenMoves(xx, yy).length;
              }
              const score = myMob - theirMob * 1.1 + Math.random() * 3;
              if (score > bestScore) {
                bestScore = score;
                bestMove = {fx: x, fy: y, m, s};
              }
              board[s.y][s.x] = 0;
            }
            board[y][x] = 2;
            board[m.y][m.x] = 0;
          }
        }
        if (!bestMove) {
          won = "p";
          doPlayerWin();
          return;
        }
        board[bestMove.fy][bestMove.fx] = 0;
        board[bestMove.m.y][bestMove.m.x] = 2;
        board[bestMove.s.y][bestMove.s.x] = 3;
        AudioFX.click();
        if (checkEnd()) return;
        turn = "p";
        render();
      }

      function doPlayerWin() {
        wins++;
        AudioFX.win();
        if (wins > best) {
          best = wins;
          Storage.setBest("amazons", wins);
        }
        statusEl.textContent = "🏹 AI stuck — you win!";
        statusEl.className = "status win";
        render();
      }

      function updateHud() {
        root.querySelector("#am2-wins").textContent = wins;
        root.querySelector("#am2-best").textContent = best;
        root.querySelector("#am2-turn").textContent = won ? "—" : (turn === "p" ? (phase === "move" ? "You (move)" : "You (shoot)") : "AI");
      }

      function render() {
        updateHud();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#d9c8a9" : "#efe3cd";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          if (board[y][x] === 3) {
            ctx.fillStyle = "#7c4a1e";
            ctx.fillRect(x * CELL + 3, y * CELL + 3, CELL - 6, CELL - 6);
            ctx.strokeStyle = "#5b3212";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x * CELL + 8, y * CELL + CELL - 8);
            ctx.lineTo(x * CELL + CELL / 2, y * CELL + 6);
            ctx.lineTo(x * CELL + CELL - 8, y * CELL + CELL - 8);
            ctx.stroke();
          }
        }
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (v !== 1 && v !== 2) continue;
          ctx.font = "26px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(v === 1 ? "♛" : "♕", x * CELL + CELL / 2, y * CELL + CELL / 2 + 9);
          if (v === 2) {
            ctx.fillStyle = "rgba(15,23,42,0.85)";
            ctx.fillText("♕", x * CELL + CELL / 2, y * CELL + CELL / 2 + 9);
          }
        }
        if (sel) {
          ctx.strokeStyle = phase === "move" ? "#16a34a" : "#dc2626";
          ctx.lineWidth = 4;
          ctx.strokeRect(sel.x * CELL + 2, sel.y * CELL + 2, CELL - 4, CELL - 4);
          queenMoves(sel.x, sel.y).forEach(m => {
            ctx.fillStyle = phase === "move" ? "rgba(22,163,74,0.5)" : "rgba(220,38,38,0.45)";
            ctx.beginPath();
            ctx.arc(m.x * CELL + CELL / 2, m.y * CELL + CELL / 2, 9, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🏹" : "AI wins", 200, 200);
        }
      }

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Amazons",
        `Each turn has <b>two parts</b>: move one of your queens like a chess queen, then <b>fire an arrow</b>
        from her new square (also queen-style) — the arrowed square is blocked forever.
        <br><br>There are no captures. Instead you strangle the board: whoever's queens get <b>immobilized first loses</b>.
        Think territory, not bloodshed. Plan arrows to cage the enemy queens while keeping your own options open.`);
    },
  });
})();
