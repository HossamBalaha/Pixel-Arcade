/* Halma — hop your pieces across the board to the opposite camp */
(function () {
  GameRegistry.register({
    id: "halma",
    name: "Halma",
    icon: "🏁",
    category: "strategy",
    description: "Hop your pieces across the board to the opposite camp",
    tags: ["strategy", "racing", "classic"],
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
      const N = 10, CAMP = 4; // 4x4 corner camps = 10 pieces each? use triangle-ish 10 cells
      let board, sel, turn, won, wins, best, moved;
      // camps: player bottom-left (rows N-4..N-1, cols 0..3 minus offset), AI top-right
      const campCells = (side) => {
        const cells = [];
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
          if (x + y < 4) cells.push(side === "p" ? [x, N - 1 - y] : [N - 1 - x, y]);
        }
        return cells; // 10 cells each
      };

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="hm-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hm-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="hm-turn">You</div></div>
        </div>
        <div class="status info" id="hm-status">Move or hop your 🟡 pieces into the far camp</div>
        <div class="center"><canvas id="hm-canvas" width="400" height="400"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="hm-new">↻ New game</button>
        </div>
        <p class="hint">Chain jumps! One piece may leap several times in a turn.</p>
      `;

      const canvas = root.querySelector("#hm-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#hm-status");
      best = Storage.getBest("halma") || 0;
      wins = 0;
      const CELL = 40;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0)); // 0 empty, 1 player, 2 ai
        campCells("p").forEach(([x, y]) => board[y][x] = 1);
        campCells("a").forEach(([x, y]) => board[y][x] = 2);
        sel = null;
        turn = "p";
        won = null;
        moved = false;
        render();
      }

      function inBounds(x, y) {
        return x >= 0 && y >= 0 && x < N && y < N;
      }

      function targets(x, y, chainable) {
        const out = [];
        // single steps
        if (!chainable) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (inBounds(nx, ny) && !board[ny][nx]) out.push({x: nx, y: ny, jump: false});
          }
        }
        // jumps (allowed always)
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const mx = x + dx, my = y + dy, nx = x + 2 * dx, ny = y + 2 * dy;
          if (inBounds(nx, ny) && !board[ny][nx] && board[my] && board[my][mx]) out.push({x: nx, y: ny, jump: true});
        }
        return out;
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "p") return;
        const r = canvas.getBoundingClientRect();
        const x = Math.floor(((e.clientX - r.left) * (400 / r.width)) / CELL);
        const y = Math.floor(((e.clientY - r.top) * (400 / r.height)) / CELL);
        if (!inBounds(x, y)) return;
        if (sel && sel !== null) {
          const t = targets(sel.x, sel.y, moved).find(t => t.x === x && t.y === y);
          if (t) {
            board[sel.y][sel.x] = 0;
            board[y][x] = 1;
            AudioFX.pop();
            if (t.jump) {
              sel = {x, y};
              moved = true;
              const more = targets(x, y, true);
              if (more.length) {
                render(true);
                return; // continue chain
              }
            }
            endPlayerTurn();
            return;
          }
        }
        if (board[y][x] === 1) {
          sel = {x, y};
          moved = false;
          AudioFX.click();
          render();
        } else {
          sel = null;
          render();
        }
      });

      function endPlayerTurn() {
        sel = null;
        moved = false;
        checkWin();
        if (!won) {
          turn = "a";
          render();
          after(aiMove, 600);
        } else render();
      }

      function checkWin() {
        const pCamp = campCells("a");
        if (pCamp.every(([x, y]) => board[y][x] === 1)) {
          won = "p";
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("halma", wins);
          }
          statusEl.textContent = "🏁 You reached the far camp — win!";
          statusEl.className = "status win";
        }
        const aCamp = campCells("p");
        if (aCamp.every(([x, y]) => board[y][x] === 2)) {
          won = "a";
          AudioFX.lose();
          statusEl.textContent = "The AI filled your camp first…";
          statusEl.className = "status lose";
        }
        updateHud();
      }

      function aiMove() {
        // greedy: move piece farthest from goal toward goal (prefer jumps)
        const goal = {x: 0, y: N - 1};
        const pieces = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (board[y][x] === 2) pieces.push({x, y});
        let bestMove = null, bestScore = -1e9;
        for (const p of pieces) {
          const t = targets(p.x, p.y, false);
          for (const m of t) {
            const dist0 = Math.hypot(p.x - goal.x, p.y - goal.y);
            const dist1 = Math.hypot(m.x - goal.x, m.y - goal.y);
            const gain = dist0 - dist1 + (m.jump ? 0.5 : 0);
            // avoid moving into own camp unnecessarily (already there -> small penalty to leave)
            const inOwnCampStart = campCells("a").some(([cx, cy]) => cx === p.x && cy === p.y);
            const inOwnCampEnd = campCells("a").some(([cx, cy]) => cx === m.x && cy === m.y);
            let sc = gain - (inOwnCampStart && !inOwnCampEnd ? 2 : 0);
            // don't enter player's occupied future... simple
            if (sc > bestScore) {
              bestScore = sc;
              bestMove = {p, m};
            }
          }
        }
        if (bestMove && bestScore > 0.05) {
          board[bestMove.p.y][bestMove.p.x] = 0;
          board[bestMove.m.y][bestMove.m.x] = 2;
          AudioFX.click();
        }
        checkWin();
        turn = "p";
        render();
      }

      function updateHud() {
        root.querySelector("#hm-wins").textContent = wins;
        root.querySelector("#hm-best").textContent = best;
        root.querySelector("#hm-turn").textContent = won ? "—" : turn === "p" ? "You" : "AI";
      }

      function render(hintChain) {
        updateHud();
        ctx.fillStyle = "#14532d";
        ctx.fillRect(0, 0, 400, 400);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#166534" : "#15803d";
          ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
        }
        // camps
        ctx.fillStyle = "rgba(250,204,21,0.18)";
        campCells("p").forEach(([x, y]) => ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2));
        ctx.fillStyle = "rgba(239,68,68,0.18)";
        campCells("a").forEach(([x, y]) => ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2));
        // pieces
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (!board[y][x]) continue;
          ctx.fillStyle = board[y][x] === 1 ? "#facc15" : "#ef4444";
          ctx.beginPath();
          ctx.arc(x * CELL + CELL / 2, y * CELL + CELL / 2, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // selection + targets
        if (sel) {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(sel.x * CELL + CELL / 2, sel.y * CELL + CELL / 2, 17, 0, Math.PI * 2);
          ctx.stroke();
          targets(sel.x, sel.y, moved).forEach(t => {
            ctx.fillStyle = t.jump ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.35)";
            ctx.beginPath();
            ctx.arc(t.x * CELL + CELL / 2, t.y * CELL + CELL / 2, 8, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🏁" : "AI wins", 200, 200);
        }
      }

      root.querySelector("#hm-new").addEventListener("click", reset);
      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Halma",
        `Race your 10 yellow pieces from your corner camp (bottom-left) to the opposite corner (top-right);
        the AI races the other way.
        <br><br>Moves: step <b>one square</b> in any direction (including diagonals) to an empty cell, or
        <b>jump</b> over any adjacent piece to the empty cell beyond — jumps may <b>chain</b> across the whole board in one turn!
        No captures. First to fill the enemy camp wins.`);
    },
  });
})();
