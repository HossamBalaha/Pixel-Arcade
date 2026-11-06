/* Gomoku Mini — 5 in a row on a 7×7 board (smaller, faster variant of Gomoku). */
(function () {
  const N = 7, WIN = 5;
  const HUMAN = "B", AI = "W";
  let live = null;

  function checkWin(b, r, c) {
    const v = b[r][c];
    if (!v) return null;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      const line = [[r, c]];
      for (let k = 1; k < WIN; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || b[nr][nc] !== v) break;
        count++;
        line.push([nr, nc]);
      }
      for (let k = 1; k < WIN; k++) {
        const nr = r - dr * k, nc = c - dc * k;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || b[nr][nc] !== v) break;
        count++;
        line.unshift([nr, nc]);
      }
      if (count >= WIN) return line;
    }
    return null;
  }

  function scoreLine(b, r, c, player) {
    // Score a position for `player` based on potential lines through (r, c)
    let total = 0;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1, openEnds = 0;
      for (let k = 1; k < WIN; k++) {
        const nr = r + dr * k, nc = c + dc * k;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
        if (b[nr][nc] === player) count++;
        else {
          if (b[nr][nc] === null) openEnds++;
          break;
        }
      }
      for (let k = 1; k < WIN; k++) {
        const nr = r - dr * k, nc = c - dc * k;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
        if (b[nr][nc] === player) count++;
        else {
          if (b[nr][nc] === null) openEnds++;
          break;
        }
      }
      if (count >= WIN) total += 100000;
      else if (count === 4 && openEnds >= 1) total += 10000;
      else if (count === 3 && openEnds === 2) total += 1000;
      else if (count === 2 && openEnds === 2) total += 100;
      else total += count * 10;
    }
    return total;
  }

  function aiMove(b) {
    let bestScore = -1, bestMove = null;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c]) continue;
      // Only consider cells near existing stones
      let near = false;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && b[nr][nc]) near = true;
      }
      if (!near) continue;
      const myScore = scoreLine(b, r, c, AI);
      const oppScore = scoreLine(b, r, c, HUMAN);
      const s = myScore + oppScore * 0.9;
      if (s > bestScore) {
        bestScore = s;
        bestMove = [r, c];
      }
    }
    if (!bestMove) return [Math.floor(N / 2), Math.floor(N / 2)];
    return bestMove;
  }

  GameRegistry.register({
    id: "gomokumini",
    name: "Gomoku Mini",
    icon: "⚫",
    category: "strategy",
    description: "5 in a row on a 7×7 board — fast variant of Gomoku",
    tags: ["gomoku", "strategy", "ai"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, current, over, winLine, aiTimer;
      let scores = {B: 0, W: 0};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You (⚫)</div><div class="val" id="gm-b">0</div></div>
          <div class="score-cell"><div class="label">AI (⚪)</div><div class="val" id="gm-w">0</div></div>
        </div>
        <div class="status info" id="gm-status">Tap a square to place your stone. Get 5 in a row!</div>
        <div class="center"><div id="gm-board" style="display:grid;grid-template-columns:repeat(${N},42px);grid-template-rows:repeat(${N},42px);gap:0;background:var(--bg-soft);padding:6px;border-radius:var(--radius);"></div></div>
        <p class="hint">First to <b>5 in a row</b> wins. <b>R</b> = new game.</p>
      `;
      const boardEl = root.querySelector("#gm-board");
      const statusEl = root.querySelector("#gm-status");

      function newGame() {
        b = Array.from({length: N}, () => Array(N).fill(null));
        current = HUMAN;
        over = false;
        winLine = null;
        statusEl.textContent = "Tap a square to place your stone. Get 5 in a row!";
        statusEl.className = "status info";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);border:1px solid var(--border);display:grid;place-items:center;cursor:pointer;font-size:1.5rem;";
          if (winLine && winLine.some(p => p[0] === r && p[1] === c)) cell.style.background = "var(--success)";
          if (b[r][c]) {
            cell.textContent = b[r][c] === HUMAN ? "⚫" : "⚪";
          }
          cell.addEventListener("click", () => onCell(r, c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#gm-b").textContent = scores.B;
        root.querySelector("#gm-w").textContent = scores.W;
      }

      function onCell(r, c) {
        if (over || current !== HUMAN || b[r][c]) return;
        b[r][c] = HUMAN;
        AudioFX.place();
        const line = checkWin(b, r, c);
        if (line) {
          end(line, HUMAN);
          render();
          return;
        }
        current = AI;
        statusEl.textContent = "AI thinking…";
        render();
        aiTimer = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (over) return;
          const [ar, ac] = aiMove(b);
          b[ar][ac] = AI;
          AudioFX.pop();
          const line2 = checkWin(b, ar, ac);
          if (line2) {
            end(line2, AI);
          } else {
            current = HUMAN;
            statusEl.textContent = "Your turn (⚫)";
            statusEl.className = "status info";
          }
          render();
        }, 400);
      }

      function end(line, who) {
        over = true;
        winLine = line;
        if (who === HUMAN) {
          scores.B++;
          statusEl.textContent = "🎉 You win!";
          statusEl.className = "status win";
          AudioFX.win();
          const best = (Storage.getBest("gomokumini") || 0) + 1;
          Storage.setBest("gomokumini", best);
        } else {
          scores.W++;
          statusEl.textContent = "💀 AI wins!";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);
      live = {};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Gomoku Mini",
        `Place stones on the grid intersections. First player to get <b>5 in a row</b> (horizontally, vertically, or diagonally) wins.
        <br><br>You play <b>⚫ Black</b>, the AI plays <b>⚪ White</b>. The 7×7 board makes for faster, more tactical games than classic 15×15 Gomoku.`);
    },
  });
})();
