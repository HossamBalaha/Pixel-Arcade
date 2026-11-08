/* Mini Go — surround territory on a 9×9 board */
(function () {
  GameRegistry.register({
    id: "minigo",
    name: "Mini Go",
    icon: "⚫",
    category: "strategy",
    description: "Surround territory on a 9×9 board — ancient game, tiny package",
    tags: ["strategy", "go", "territory"],
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
      let board, turn, passes, won, wins, best, ko;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="go-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="go-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="go-turn">You ⚫</div></div>
        </div>
        <div class="status info" id="go-status">Place stones — surround territory, capture by encirclement</div>
        <div class="center"><canvas id="go-canvas" width="378" height="378"></canvas></div>
        <div class="row gap-2" style="justify-content:center;margin-top:8px;">
          <button class="btn btn-sm" id="go-pass">🤚 Pass</button>
          <button class="btn btn-sm" id="go-new">↻ New game</button>
        </div>
        <p class="hint">Two passes end the game — territory (empty + captures) decides the winner.</p>
      `;

      const canvas = root.querySelector("#go-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#go-status");
      best = Storage.getBest("minigo") || 0;
      wins = 0;
      const CELL = 42, PAD = 6;
      const px = (i) => PAD + i * CELL + CELL / 2;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        turn = 1;
        passes = 0;
        won = null;
        ko = null;
        render();
      }

      function neighbors(x, y) {
        const out = [];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push([nx, ny]);
        }
        return out;
      }

      function groupOf(x, y) {
        const color = board[y][x];
        const seen = new Set([x + "," + y]);
        const stack = [[x, y]];
        const cells = [];
        let libs = new Set();
        while (stack.length) {
          const [cx, cy] = stack.pop();
          cells.push([cx, cy]);
          for (const [nx, ny] of neighbors(cx, cy)) {
            const v = board[ny][nx];
            if (v === 0) libs.add(nx + "," + ny);
            else if (v === color && !seen.has(nx + "," + ny)) {
              seen.add(nx + "," + ny);
              stack.push([nx, ny]);
            }
          }
        }
        return {cells, libs};
      }

      function legal(x, y, color) {
        if (board[y][x]) return null;
        if (ko && ko.x === x && ko.y === y) return null;
        // simulate
        const backup = board.map(r => r.slice());
        board[y][x] = color;
        let captured = 0;
        // capture adjacent enemy groups with no liberties
        for (const [nx, ny] of neighbors(x, y)) {
          if (board[ny][nx] === (color === 1 ? 2 : 1)) {
            const g = groupOf(nx, ny);
            if (g.libs.size === 0) {
              g.cells.forEach(([gx, gy]) => board[gy][gx] = 0);
              captured += g.cells.length;
            }
          }
        }
        // suicide check
        const g = groupOf(x, y);
        if (g.libs.size === 0) {
          board = backup;
          return null;
        }
        // single-stone capture => ko
        let koPoint = null;
        if (captured === 1 && g.cells.length === 1 && g.libs.size === 1) {
          // find the captured point from backup diff
          for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) {
            if (backup[yy][xx] !== 0 && board[yy][xx] === 0) koPoint = {x: xx, y: yy};
          }
        }
        return {backup, captured, koPoint};
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== 1) return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (378 / r.width);
        const my = (e.clientY - r.top) * (378 / r.height);
        const x = Math.round((mx - PAD - CELL / 2) / CELL);
        const y = Math.round((my - PAD - CELL / 2) / CELL);
        if (x < 0 || y < 0 || x >= N || y >= N) return;
        const res = legal(x, y, 1);
        if (!res) {
          AudioFX.error();
          return;
        }
        board[y][x] = 1;
        // apply captures
        for (const [nx, ny] of neighbors(x, y)) {
          if (board[ny][nx] === 2) {
            const g = groupOf(nx, ny);
            if (g.libs.size === 0) g.cells.forEach(([gx, gy]) => board[gy][gx] = 0);
          }
        }
        ko = res.koPoint;
        AudioFX.pop();
        passes = 0;
        turn = 2;
        render();
        after(aiTurn, 650);
      });

      function pass() {
        if (won) return;
        passes++;
        if (passes >= 2) return endGame();
        turn = 2;
        render();
        after(aiTurn, 650);
      }

      function scoreBoard() {
        // area scoring: stones + surrounded empty
        const seen = Array.from({length: N}, () => Array(N).fill(false));
        let black = 0, white = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] === 1) black++;
          else if (board[y][x] === 2) white++;
          else if (!seen[y][x]) {
            // flood empty region
            const region = [];
            const stack = [[x, y]];
            seen[y][x] = true;
            let borders = new Set();
            while (stack.length) {
              const [cx, cy] = stack.pop();
              region.push([cx, cy]);
              for (const [nx, ny] of neighbors(cx, cy)) {
                if (board[ny][nx] === 0 && !seen[ny][nx]) {
                  seen[ny][nx] = true;
                  stack.push([nx, ny]);
                } else if (board[ny][nx]) borders.add(board[ny][nx]);
              }
            }
            if (borders.size === 1) {
              if (borders.has(1)) black += region.length;
              else white += region.length;
            }
          }
        }
        return {black, white};
      }

      function endGame() {
        won = "end";
        const {black, white} = scoreBoard();
        const playerWins = black > white + 3.5; // komi 3.5 for white (AI)
        if (playerWins) {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("minigo", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = `Score: ⚫ ${black} vs ⚪ ${white} + 3.5 komi — ${playerWins ? "you win!" : "AI wins."}`;
        statusEl.className = "status " + (playerWins ? "win" : "lose");
        render();
      }

      function aiTurn() {
        if (won) return;
        // candidate moves: empty points with best heuristic
        let bestMove = null, bestScore = -1e9;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const res = legal(x, y, 2);
          if (!res) continue;
          let score = 0;
          // captures!
          score += res.captured * 8;
          // liberty count of resulting group
          const g = groupOf(x, y);
          score += Math.min(g.libs.size, 4);
          // adjacency to own stones (connection) & enemy stones (pressure)
          let own = 0, enemy = 0;
          for (const [nx, ny] of neighbors(x, y)) {
            if (board[ny][nx] === 2) own++;
            else if (board[ny][nx] === 1) enemy++;
          }
          score += own * 0.6 + enemy * 0.8;
          // star points / center preference early
          score += (4 - Math.abs(x - 4)) * 0.3 + (4 - Math.abs(y - 4)) * 0.3;
          // avoid self-atari
          if (g.libs.size === 1 && res.captured === 0) score -= 6;
          score += Math.random() * 1.2;
          if (score > bestScore) {
            bestScore = score;
            bestMove = {x, y, res};
          }
        }
        if (bestMove && bestScore > 0.5) {
          board[bestMove.y][bestMove.x] = 2;
          for (const [nx, ny] of neighbors(bestMove.x, bestMove.y)) {
            if (board[ny][nx] === 1) {
              const g = groupOf(nx, ny);
              if (g.libs.size === 0) g.cells.forEach(([gx, gy]) => board[gy][gx] = 0);
            }
          }
          ko = bestMove.res.koPoint;
          AudioFX.click();
          passes = 0;
        } else {
          // pass
          passes++;
          statusEl.textContent = "🤖 AI passes.";
          statusEl.className = "status info";
          if (passes >= 2) return endGame();
        }
        turn = 1;
        render();
      }

      function updateHud() {
        root.querySelector("#go-wins").textContent = wins;
        root.querySelector("#go-best").textContent = best;
        root.querySelector("#go-turn").textContent = won ? "—" : turn === 1 ? "You ⚫" : "AI ⚪";
      }

      function render() {
        updateHud();
        ctx.fillStyle = "#dcb35c";
        ctx.fillRect(0, 0, 378, 378);
        ctx.strokeStyle = "#1c1917";
        ctx.lineWidth = 1.5;
        for (let i = 0; i < N; i++) {
          ctx.beginPath();
          ctx.moveTo(px(0), px(i));
          ctx.lineTo(px(N - 1), px(i));
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px(i), px(0));
          ctx.lineTo(px(i), px(N - 1));
          ctx.stroke();
        }
        // star points
        ctx.fillStyle = "#1c1917";
        [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(px(x), px(y), 3, 0, Math.PI * 2);
          ctx.fill();
        });
        // ko marker
        if (ko) {
          ctx.strokeStyle = "rgba(220,38,38,0.7)";
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(px(ko.x) - 15, px(ko.y) - 15, 30, 30);
          ctx.setLineDash([]);
        }
        // stones
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          ctx.beginPath();
          ctx.arc(px(x), px(y), 17, 0, Math.PI * 2);
          const grad = ctx.createRadialGradient(px(x) - 5, px(y) - 5, 3, px(x), px(y), 17);
          if (v === 1) {
            grad.addColorStop(0, "#555");
            grad.addColorStop(1, "#000");
          } else {
            grad.addColorStop(0, "#fff");
            grad.addColorStop(1, "#cbd5e1");
          }
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        if (won === "end") {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(0, 0, 378, 378);
          const {black, white} = scoreBoard();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`⚫ ${black} — ${white} ⚪ (+3.5)`, 189, 189);
        }
      }

      root.querySelector("#go-pass").addEventListener("click", () => {
        if (turn === 1 && !won) pass();
      });
      root.querySelector("#go-new").addEventListener("click", reset);
      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Mini Go",
        `The 4,000-year-old game on a 9×9 board — you play ⚫ black, the AI plays ⚪ white (with 3.5 komi).
        <br><br>• Stones go on <b>intersections</b>. Once placed, they never move.
        <br>• A stone (or group) with <b>no empty adjacent points (liberties)</b> is captured.
        <br>• You can't <b>suicide</b> your own stones, and the <b>ko rule</b> prevents instant recapture loops.
        <br>• Two consecutive <b>passes</b> end the game; surrounded empty territory + stones decide the score.
        <br>Corners first, then sides, then center!`);
    },
  });
})();
