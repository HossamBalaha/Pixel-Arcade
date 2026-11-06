/* Gomoku — Five in a Row on a 9x9 board. vs AI. */
(function () {
  const N = 9;
  const WIN = 5;
  const HUMAN = 1, AI = 2;
  let live = null;

  function winner(b, lastR, lastC) {
    if (lastR == null) return null;
    const v = b[lastR][lastC];
    if (!v) return null;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let s = 1; s < WIN; s++) {
        const r = lastR + dr * s, c = lastC + dc * s;
        if (r < 0 || r >= N || c < 0 || c >= N || b[r][c] !== v) break;
        count++;
      }
      for (let s = 1; s < WIN; s++) {
        const r = lastR - dr * s, c = lastC - dc * s;
        if (r < 0 || r >= N || c < 0 || c >= N || b[r][c] !== v) break;
        count++;
      }
      if (count >= WIN) return v;
    }
    return null;
  }

  function scoreLine(b, r, c, player) {
    // Heuristic: count open runs.
    let score = 0;
    const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (const [dr, dc] of dirs) {
      let run = 1, openEnds = 0;
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr][cc] === player) {
        run++;
        rr += dr;
        cc += dc;
      }
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && !b[rr][cc]) openEnds++;
      rr = r - dr;
      cc = c - dc;
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr][cc] === player) {
        run++;
        rr -= dr;
        cc -= dc;
      }
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && !b[rr][cc]) openEnds++;
      if (run >= WIN) score += 100000;
      else if (run === 4 && openEnds === 2) score += 10000;
      else if (run === 4 && openEnds === 1) score += 1000;
      else if (run === 3 && openEnds === 2) score += 500;
      else if (run === 3 && openEnds === 1) score += 100;
      else if (run === 2 && openEnds === 2) score += 50;
      else score += run;
    }
    return score;
  }

  function aiMove(b) {
    // For each empty cell, compute (own_score + opp_block_score). Pick best.
    let best = -Infinity, move = null;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c]) continue;
      // skip far cells (only consider near existing stones for speed)
      let near = false;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < N && cc >= 0 && cc < N && b[rr][cc]) near = true;
      }
      if (!near) continue;
      b[r][c] = AI;
      const s1 = scoreLine(b, r, c, AI);
      b[r][c] = HUMAN;
      const s2 = scoreLine(b, r, c, HUMAN);
      b[r][c] = 0;
      const total = s1 + s2 * 0.95;
      if (total > best) {
        best = total;
        move = [r, c];
      }
    }
    if (!move) {
      // first move: center
      const mid = Math.floor(N / 2);
      move = [mid, mid];
    }
    return move;
  }

  GameRegistry.register({
    id: "gomoku",
    name: "Gomoku",
    icon: "⚫",
    category: "strategy",
    description: "Five in a row on a 9x9 board. vs AI.",
    tags: ["strategy", "ai", "classic"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let board, current, over = false, aiTimer = null;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="gm-turn">You</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="gm-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="gm-best">—</div></div>
        </div>
        <div class="status info" id="gm-status">Place 5 stones in a row to win. Click an intersection.</div>
        <div class="center" style="margin:14px 0;"><div id="gm-board"></div></div>
        <button class="btn" id="gm-restart">Restart</button>
      `;
      const statusEl = root.querySelector("#gm-status");
      const boardEl = root.querySelector("#gm-board");
      if (!document.getElementById("gm-style")) {
        const s = document.createElement("style");
        s.id = "gm-style";
        s.textContent = `#gm-board{display:grid;grid-template-columns:repeat(${N},36px);background:var(--bg-soft);padding:6px;border-radius:var(--radius-sm);}.gm-cell{width:36px;height:36px;display:grid;place-items:center;cursor:pointer;position:relative;}.gm-cell:after{content:"";position:absolute;width:1px;height:36px;background:var(--border);}.gm-cell:before{content:"";position:absolute;width:36px;height:1px;background:var(--border);}.gm-stone{width:26px;height:26px;border-radius:50%;z-index:1;box-shadow:0 1px 3px rgba(0,0,0,0.4);}.gm-stone.human{background:var(--text);}.gm-stone.ai{background:var(--accent);}`;
        document.head.appendChild(s);
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "gm-cell";
          if (board[r][c]) {
            const stone = document.createElement("div");
            stone.className = "gm-stone " + (board[r][c] === HUMAN ? "human" : "ai");
            cell.appendChild(stone);
          }
          cell.addEventListener("click", () => play(r, c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#gm-turn").textContent = current === HUMAN ? "You" : "AI";
      }

      function play(r, c) {
        if (over || current !== HUMAN || board[r][c]) return;
        board[r][c] = HUMAN;
        AudioFX.pop();
        if (winner(board, r, c)) {
          end(HUMAN);
          return;
        }
        current = AI;
        render();
        statusEl.textContent = "AI is thinking…";
        statusEl.className = "status info";
        aiTimer = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (over || !alive) return;
          const [ar, ac] = aiMove(board);
          board[ar][ac] = AI;
          AudioFX.tick();
          if (winner(board, ar, ac)) {
            end(AI);
            return;
          }
          current = HUMAN;
          statusEl.textContent = "Your turn — place 5 in a row.";
          statusEl.className = "status info";
          render();
        }, 400);
      }

      function end(w) {
        over = true;
        if (w === HUMAN) {
          statusEl.textContent = "🎉 You win!";
          statusEl.className = "status win";
          AudioFX.win();
          const wins = (Storage.getBest("gomoku") || 0) + 1;
          Storage.setBest("gomoku", wins);
          root.querySelector("#gm-wins").textContent = wins;
          root.querySelector("#gm-best").textContent = wins;
          App.toast("You won!", "success");
        } else {
          statusEl.textContent = "AI wins. Try again!";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        render();
      }

      function newGame() {
        board = Array.from({length: N}, () => Array(N).fill(0));
        current = HUMAN;
        over = false;
        statusEl.textContent = "Place 5 stones in a row to win.";
        statusEl.className = "status info";
        root.querySelector("#gm-wins").textContent = Storage.getBest("gomoku") || 0;
        root.querySelector("#gm-best").textContent = Storage.getBest("gomoku") || "—";
        render();
      }

      root.querySelector("#gm-restart").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      live = {newGame};
      newGame();
      return function cleanup() {
        alive = false;
        if (aiTimer) clearTimeout(aiTimer);
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Gomoku",
        `Place stones on intersections of a 9×9 grid. The first player to get <b>5 in a row</b> (horizontal, vertical, or diagonal) wins.
        <br><br>You play black; the AI plays colored stones. Click an empty intersection to place your stone.`);
    },
  });
})();
