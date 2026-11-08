/* Breakthrough — punch through the enemy line with your pawn army */
(function () {
  GameRegistry.register({
    id: "breakthrough",
    name: "Breakthrough",
    icon: "🛡️",
    category: "strategy",
    description: "Punch through the enemy line with your pawn army",
    tags: ["strategy", "pawns", "chess-like"],
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
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="bt-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bt-best">0</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="bt-turn">You</div></div>
        </div>
        <div class="status info" id="bt-status">Capture or breakthrough — reach the far row to win</div>
        <div class="center"><canvas id="bt-canvas" width="360" height="360"></canvas></div>
        <p class="hint">Pawns move forward one, capture diagonally forward. No double-steps, no en passant — pure brawl.</p>
      `;

      const canvas = root.querySelector("#bt-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bt-status");
      best = Storage.getBest("breakthrough") || 0;
      wins = 0;
      const CELL = 45;

      function reset() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        for (let x = 0; x < N; x++) {
          board[0][x] = 2;
          board[1][x] = 2; // AI at top moving down
          board[N - 1][x] = 1;
          board[N - 2][x] = 1; // player at bottom moving up
        }
        sel = null;
        turn = "p";
        won = null;
        render();
      }

      function moves(x, y, side) {
        const out = [];
        const dir = side === 1 ? -1 : 1; // player moves up (decreasing y)
        const fwd = y + dir;
        if (fwd >= 0 && fwd < N && !board[fwd][x]) out.push({x, y: fwd, cap: false});
        for (const dx of [-1, 1]) {
          const nx = x + dx;
          if (nx >= 0 && nx < N && fwd >= 0 && fwd < N && board[fwd][nx] === (side === 1 ? 2 : 1)) {
            out.push({x: nx, y: fwd, cap: true});
          }
        }
        return out;
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
            checkWin();
            if (!won) {
              turn = "a";
              render();
              after(aiMove, 500);
            } else render();
            return;
          }
        }
        if (board[y][x] === 1) {
          sel = {x, y};
          AudioFX.click();
        } else sel = null;
        render();
      });

      function checkWin() {
        // player wins reaching row 0; ai reaching row N-1
        for (let x = 0; x < N; x++) {
          if (board[0][x] === 1) return doWin("p");
          if (board[N - 1][x] === 2) return doWin("a");
        }
        if (!board.flat().includes(2)) return doWin("p");
        if (!board.flat().includes(1)) return doWin("a");
      }

      function doWin(w) {
        won = w;
        if (w === "p") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("breakthrough", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "p" ? "🛡️ Breakthrough achieved — you win!" : "The AI broke through your line…";
        statusEl.className = "status " + (w === "p" ? "win" : "lose");
        updateHud();
      }

      function aiMove() {
        // simple but decent: prefer advances that can't be captured, else captures, else advances
        const all = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (board[y][x] !== 2) continue;
          moves(x, y, 2).forEach(m => all.push({fx: x, fy: y, m}));
        }
        if (!all.length) {
          doWin("p");
          render();
          return;
        }
        const score = (o) => {
          let s = o.m.y * 10; // advance (y increases toward player side)
          if (o.m.cap) s += 25;
          // danger check: can player capture destination?
          const dir = -1;
          for (const dx of [-1, 1]) {
            const nx = o.m.x + dx, ny = o.m.y - 1;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N && board[ny] && board[ny][nx] === 1) s -= 20;
          }
          // winning move!
          if (o.m.y === N - 1) s += 1000;
          return s + Math.random() * 4;
        };
        all.sort((a, b) => score(b) - score(a));
        const pick = all[0];
        board[pick.m.y][pick.m.x] = 2;
        board[pick.fy][pick.fx] = 0;
        AudioFX.click();
        checkWin();
        turn = "p";
        render();
      }

      function updateHud() {
        root.querySelector("#bt-wins").textContent = wins;
        root.querySelector("#bt-best").textContent = best;
        root.querySelector("#bt-turn").textContent = won ? "—" : turn === "p" ? "You" : "AI";
      }

      function render() {
        updateHud();
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? "#e2e8f0" : "#94a3b8";
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
        // goal rows
        ctx.fillStyle = "rgba(250,204,21,0.35)";
        ctx.fillRect(0, 0, N * CELL, CELL);
        ctx.fillStyle = "rgba(239,68,68,0.25)";
        ctx.fillRect(0, (N - 1) * CELL, N * CELL, CELL);
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = board[y][x];
          if (!v) continue;
          ctx.font = "30px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(v === 1 ? "♙" : "♟", x * CELL + CELL / 2, y * CELL + CELL / 2 + 11);
          // color tint via shadow
          if (v === 1) {
            ctx.fillStyle = "rgba(250,204,21,0.9)";
            ctx.beginPath();
            ctx.arc(x * CELL + CELL / 2, y * CELL + CELL - 8, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (sel) {
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 4;
          ctx.strokeRect(sel.x * CELL + 2, sel.y * CELL + 2, CELL - 4, CELL - 4);
          moves(sel.x, sel.y, 1).forEach(m => {
            ctx.fillStyle = "rgba(22,163,74,0.5)";
            ctx.beginPath();
            ctx.arc(m.x * CELL + CELL / 2, m.y * CELL + CELL / 2, 9, 0, Math.PI * 2);
            ctx.fill();
          });
        }
        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 360, 360);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "p" ? "You win! 🛡️" : "AI wins", 180, 180);
        }
      }

      const onKey = (e) => {
        if (e.key.toLowerCase() === "r") reset();
      };
      document.addEventListener("keydown", onKey);
      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Breakthrough",
        `Chess pawns minus everything else! You command the white pawns at the bottom, the AI the black ones up top.
        <br><br>• Pawns move <b>straight forward</b> one square (if empty).
        <br>• They capture <b>diagonally forward</b> one square.
        <br>• <b>Reach the far row</b> or capture every enemy pawn to win.
        No double moves, no en passant — a fast, brutal little duel.`);
    },
  });
})();
