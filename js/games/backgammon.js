/* Backgammon — race your checkers home and bear them all off */
(function () {
  GameRegistry.register({
    id: "backgammon",
    name: "Backgammon",
    icon: "🎲",
    category: "strategy",
    description: "Race your checkers home, then bear them all off",
    tags: ["strategy", "dice", "classic"],
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
      // Simplified single-checker-per-point racing representation for playability:
      // points 1..24, player moves toward 25 (home 19-24), AI toward 0 (home 1-6).
      let board, dice, used, turn, selected, msg, won, movesLeft, wins, best;
      // board[i] = positive count = player checkers, negative = AI checkers (i = 1..24)
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="bg2-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="bg2-best">0</div></div>
          <div class="score-cell"><div class="label">Dice</div><div class="val" id="bg2-dice">—</div></div>
        </div>
        <div class="status info" id="bg2-status">Roll the dice and race your 🟡 checkers home</div>
        <div class="center"><canvas id="bg2-canvas" width="560" height="330"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm primary" id="bg2-roll">🎲 Roll</button>
          <button class="btn btn-sm" id="bg2-new">↻ New game</button>
        </div>
        <p class="hint">Click a highlighted checker then a destination. 🟡 you (move right) · 🔴 AI (moves left). Bear off from the far right!</p>
      `;

      const canvas = root.querySelector("#bg2-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#bg2-status");
      best = Storage.getBest("backgammon") || 0;
      wins = 0;

      function reset() {
        board = Array(25).fill(0);
        // standard-ish start (simplified): player at 1(2),12(5),17(3),19(5); mirrored for AI
        board[1] = 2;
        board[12] = 5;
        board[17] = 3;
        board[19] = 5;
        board[24] = -2;
        board[13] = -5;
        board[8] = -3;
        board[6] = -5;
        dice = [];
        used = [];
        turn = "player";
        selected = null;
        msg = "";
        won = null;
        render();
        statusEl.textContent = "Roll the dice and race your 🟡 checkers home";
        statusEl.className = "status info";
      }

      function roll() {
        if (dice.length && dice.some((d, i) => !used[i])) return;
        const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
        dice = a === b ? [a, a, a, a] : [a, b];
        used = dice.map(() => false);
        AudioFX.pop();
        render();
        if (!hasMove("player")) {
          statusEl.textContent = "No legal moves — dice pass to the AI";
          after(aiTurn, 1200);
        }
      }

      function hasMove(side) {
        return legalMoves(side).length > 0;
      }

      function legalMoves(side) {
        const out = [];
        const dices = dice.map((d, i) => ({d, i})).filter(x => !used[x.i]);
        if (side === "player") {
          const home = board.slice(19, 25).reduce((s, v) => s + Math.max(0, v), 0) + borneOff.p;
          for (let p = 1; p <= 24; p++) {
            if (board[p] <= 0) continue;
            for (const {d, i} of dices) {
              const to = p + d;
              if (to <= 24) {
                if (board[to] >= -1) out.push({from: p, to, di: i});
              } else {
                // bear off allowed if all checkers in home (19..24)
                if (allHome()) out.push({from: p, to: 25, di: i});
              }
            }
          }
        } else {
          for (let p = 1; p <= 24; p++) {
            if (board[p] >= 0) continue;
            for (const {d, i} of dices) {
              const to = p - d;
              if (to >= 1) {
                if (board[to] <= 1) out.push({from: p, to, di: i});
              } else {
                if (aiAllHome()) out.push({from: p, to: 0, di: i});
              }
            }
          }
        }
        return out;
      }

      let borneOff = {p: 0, a: 0};

      function allHome() {
        for (let p = 1; p <= 18; p++) if (board[p] > 0) return false;
        return true;
      }

      function aiAllHome() {
        for (let p = 7; p <= 24; p++) if (board[p] < 0) return false;
        return true;
      }

      function applyMove(m) {
        if (m.to === 25) {
          board[m.from]--;
          borneOff.p++;
        } else if (m.to === 0) {
          board[m.from]++;
          borneOff.a++;
        } else {
          if (board[m.to] === -1) {
            board[m.to] = 0;
            board[0] = board[0]; /* hit */
            board[m.to] = 0;
            barP++;
          }
          if (board[m.to] === 1) {
            board[m.to] = 0;
            barA++;
          }
          board[m.from] > 0 ? board[m.from]-- : board[m.from]++;
          board[m.to] > 0 || m.from === 0 ? board[m.to]++ : board[m.to]--;
        }
        used[m.di] = true;
        AudioFX.click();
        render();
        checkWin();
      }

      let barP = 0, barA = 0;

      function checkWin() {
        if (borneOff.p === 15) {
          won = "player";
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("backgammon", wins);
          }
          statusEl.textContent = "🏆 You bore off all checkers — victory!";
          statusEl.className = "status win";
        } else if (borneOff.a === 15) {
          won = "ai";
          AudioFX.lose();
          statusEl.textContent = "The AI bore off first — rematch?";
          statusEl.className = "status lose";
        }
        updateHud();
      }

      function updateHud() {
        root.querySelector("#bg2-wins").textContent = wins;
        root.querySelector("#bg2-best").textContent = best;
        root.querySelector("#bg2-dice").textContent = dice.length ? dice.map((d, i) => used[i] ? "(" + d + ")" : d).join(" ") : "—";
      }

      function aiTurn() {
        if (won) return;
        const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
        dice = a === b ? [a, a, a, a] : [a, b];
        used = dice.map(() => false);
        updateHud();
        const step = () => {
          const moves = legalMoves("ai");
          if (!moves.length || used.every(Boolean)) {
            dice = [];
            used = [];
            updateHud();
            turn = "player";
            return;
          }
          // greedy: prefer bearing off, then advance farthest checker
          moves.sort((x, y) => (y.to === 0 ? 100 : y.to) - (x.to === 0 ? 100 : x.to));
          applyMove(moves[0]);
          after(step, 550);
        };
        step();
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won || turn !== "player") return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (560 / r.width);
        const my = (e.clientY - r.top) * (330 / r.height);
        // hit test points
        const pt = pointAt(mx, my);
        if (!pt) return;
        if (selected === null) {
          if (board[pt] > 0) {
            selected = pt;
            AudioFX.click();
            render();
          }
        } else {
          const moves = legalMoves("player").filter(m => m.from === selected);
          const m = moves.find(m => m.to === pt);
          if (m) {
            applyMove(m);
            selected = null;
            if (used.every(Boolean)) {
              turn = "ai";
              after(aiTurn, 700);
            }
          } else {
            selected = board[pt] > 0 ? pt : null;
            render();
          }
        }
      });

      function pointAt(mx, my) {
        // points layout: 13-18 top-left→right, 19-24 top-right; 12-7 bottom-right→left, 6-1 bottom-left
        const W = 560, PAD = 16, PW = (W - PAD * 2 - 8) / 12;
        const col = Math.floor((mx - PAD) / PW);
        if (col < 0 || col > 11) return null;
        if (my < 160) { // top
          const n = 13 + col;
          return n <= 24 ? n : null;
        } else { // bottom
          const n = 12 - col;
          return n >= 1 ? n : null;
        }
      }

      function render() {
        updateHud();
        ctx.fillStyle = "#3f2a1d";
        ctx.fillRect(0, 0, 560, 330);
        const W = 560, PAD = 16, PW = (W - PAD * 2 - 8) / 12;
        // bar — darker divider so it separates from the board face
        ctx.fillStyle = "#171009";
        ctx.fillRect(W / 2 - 4, 10, 8, 310);
        const highlight = selected !== null ? new Set(legalMoves("player").filter(m => m.from === selected).map(m => m.to)) : new Set();
        for (let col = 0; col < 12; col++) {
          const x = PAD + col * PW + (col >= 6 ? 8 : 0);
          let n, y0, dir;
          if (col < 6) {
            n = 13 + col;
            y0 = 10;
            dir = 1;
          } else {
            n = 13 + col;
            y0 = 10;
            dir = 1;
          }
          // top row = 13..18 then 19..24; bottom = 12..7 then 6..1
          const topN = col < 6 ? 13 + col : 6 + (col - 6) + 13; // 13..18, 19..24
          drawPoint(x, 10, 1, col < 6 ? 13 + col : 19 + (col - 6), highlight, false);
          drawPoint(x, 320, -1, col < 6 ? 12 - col : 6 - (col - 6), highlight, true);
        }
        // borne off trays
        ctx.fillStyle = "rgba(250,204,21,0.25)";
        ctx.fillRect(PAD + 12 * PW - 60, 10, 52, 130);
        ctx.fillStyle = "rgba(239,68,68,0.25)";
        ctx.fillRect(PAD + 12 * PW - 60, 190, 52, 130);
        ctx.fillStyle = "#facc15";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("off: " + borneOff.p, PAD + 12 * PW - 34, 26);
        ctx.fillStyle = "#f87171";
        ctx.fillText("off: " + borneOff.a, PAD + 12 * PW - 34, 216);

        function drawPoint(x, yBase, dir, n, hl, isBottom) {
          const W2 = 560, PAD2 = 16, PW2 = (W2 - PAD2 * 2 - 8) / 12;
          const xx = PAD2 + (isBottom ? 11 - (n <= 6 ? 6 - n : 12 - n) : (n <= 18 ? n - 13 : n - 13)) * PW2 + (n <= 6 || (n >= 13 && n <= 18) ? 0 : 8);
          // triangle
          ctx.fillStyle = n % 2 ? "#5b3a21" : "#4a2f1a";
          ctx.beginPath();
          if (!isBottom) {
            ctx.moveTo(xx, 10);
            ctx.lineTo(xx + PW2 - 4, 10);
            ctx.lineTo(xx + PW2 / 2 - 2, 130);
          } else {
            ctx.moveTo(xx, 320);
            ctx.lineTo(xx + PW2 - 4, 320);
            ctx.lineTo(xx + PW2 / 2 - 2, 200);
          }
          ctx.closePath();
          ctx.fill();
          if (hl.has(n)) {
            ctx.strokeStyle = "#22c55e";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          if (selected === n) {
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          // checkers
          const cnt = Math.abs(board[n]);
          for (let k = 0; k < Math.min(cnt, 5); k++) {
            const cy = isBottom ? 320 - 16 - k * 30 : 10 + 16 + k * 30;
            ctx.fillStyle = board[n] > 0 ? "#facc15" : "#ef4444";
            ctx.beginPath();
            ctx.arc(xx + PW2 / 2 - 2, cy, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(0,0,0,0.3)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          if (cnt > 5) {
            ctx.fillStyle = "#fff";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("×" + cnt, xx + PW2 / 2 - 2, isBottom ? 200 : 140);
          }
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(n, xx + PW2 / 2 - 2, isBottom ? 332 : 8);
        }

        if (won) {
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(0, 0, 560, 330);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 26px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(won === "player" ? "You win! 🏆" : "AI wins", 280, 165);
        }
      }

      root.querySelector("#bg2-roll").addEventListener("click", roll);
      root.querySelector("#bg2-new").addEventListener("click", reset);

      reset();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Backgammon",
        `Two armies race in opposite directions. 🟡 <b>You</b> move from low points toward <b>24</b> and bear off beyond it;
        🔴 the AI heads the other way.
        <br><br>🎲 <b>Roll</b> — click one of your points, then a highlighted destination (point number + die value).
        Landing on a single enemy checker <b>hits</b> it. Doubles grant four moves.
        Once all 15 of your checkers reach your home quadrant, bear them off (destination beyond 24).
        First to bear off everything wins. This version auto-handles hits and skips illegal moves.`);
    },
  });
})();
