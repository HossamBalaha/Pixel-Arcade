/* Tic Tac Toe Extreme — each player can only have 3 pieces on the board (oldest disappears). */
(function () {
  const HUMAN = "X", AI = "O";
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const MAX_PIECES = 3;

  function winner(b) {
    for (const [a, b1, c] of LINES) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    return null;
  }

  function bestMove(b, placements) {
    // Try to win, then block, then center, then corners, then sides
    const me = AI, opp = HUMAN;
    for (const [a, b1, c] of LINES) {
      const line = [b[a], b[b1], b[c]];
      const idxs = [a, b1, c];
      if (line.filter(x => x === me).length === 2 && line.filter(x => !x).length === 1) return idxs[line.indexOf(undefined)];
    }
    for (const [a, b1, c] of LINES) {
      const line = [b[a], b[b1], b[c]];
      const idxs = [a, b1, c];
      if (line.filter(x => x === opp).length === 2 && line.filter(x => !x).length === 1) return idxs[line.indexOf(undefined)];
    }
    if (!b[4]) return 4;
    const corners = [0, 2, 6, 8].filter(i => !b[i]);
    if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
    const sides = [1, 3, 5, 7].filter(i => !b[i]);
    if (sides.length) return sides[Math.floor(Math.random() * sides.length)];
    return null;
  }

  let live = null;
  GameRegistry.register({
    id: "tictactoextreme",
    name: "Tic Tac Toe Extreme",
    icon: "⚡",
    category: "strategy",
    description: "Tic Tac Toe with a twist — only 3 pieces per player, oldest disappears",
    tags: ["tictactoe", "strategy", "twist"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let board = Array(9).fill(null);
      let placements = {X: [], O: []}; // ordered list of indexes for each player
      let current = HUMAN, over = false, winLine = null, aiTimer = null;
      let scores = {X: 0, O: 0, draw: 0};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">X Wins</div><div class="val" id="te-x">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="te-d">0</div></div>
          <div class="score-cell"><div class="label">O Wins</div><div class="val" id="te-o">0</div></div>
        </div>
        <div class="status info" id="te-status">Your turn (X). You can only have 3 pieces on the board.</div>
        <div class="center"><div class="board" id="te-board" style="grid-template-columns:repeat(3,90px);width:282px;"></div></div>
        <p class="hint">Each player gets only 3 pieces — when you place a 4th, the oldest disappears. <b>R</b> = reset.</p>
      `;
      const boardEl = root.querySelector("#te-board");
      const statusEl = root.querySelector("#te-status");

      function render() {
        boardEl.innerHTML = "";
        for (let i = 0; i < 9; i++) {
          const c = document.createElement("div");
          c.className = "cell";
          c.style.fontSize = "2rem";
          if (board[i]) {
            c.classList.add(board[i].toLowerCase(), "filled");
            // Show aging: oldest piece is dimmer
            const playerPlacements = placements[board[i]];
            if (playerPlacements[0] === i && playerPlacements.length >= MAX_PIECES) {
              c.style.opacity = "0.4";
              c.style.borderStyle = "dashed";
            }
          }
          if (winLine && winLine.includes(i)) c.style.background = "var(--success)";
          if (over) c.classList.add("disabled");
          c.textContent = board[i] || "";
          c.addEventListener("click", () => onCell(i));
          boardEl.appendChild(c);
        }
        root.querySelector("#te-x").textContent = scores.X;
        root.querySelector("#te-o").textContent = scores.O;
        root.querySelector("#te-d").textContent = scores.draw;
      }

      function place(player, i) {
        if (board[i]) return false;
        board[i] = player;
        placements[player].push(i);
        // If over the limit, remove oldest
        if (placements[player].length > MAX_PIECES) {
          const oldest = placements[player].shift();
          board[oldest] = null;
        }
        return true;
      }

      function onCell(i) {
        if (over || board[i] || current !== HUMAN) return;
        place(HUMAN, i);
        AudioFX.place();
        if (checkEnd()) {
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
          const m = bestMove(board, placements);
          if (m !== null) {
            place(AI, m);
            AudioFX.pop();
          }
          if (!checkEnd()) {
            current = HUMAN;
            statusEl.textContent = "Your turn (X)";
          }
          render();
        }, 500);
      }

      function checkEnd() {
        const w = winner(board);
        if (!w) {
          // Draw = no winner, board full (rare given cycling, but possible)
          if (board.every(x => x) && placements.X.length === 3 && placements.O.length === 3) {
            over = true;
            scores.draw++;
            statusEl.textContent = "It's a draw!";
            statusEl.className = "status info";
            AudioFX.lose();
            return true;
          }
          return false;
        }
        over = true;
        winLine = LINES.find(l => l.every(i => board[i] === w));
        if (w === HUMAN) {
          scores.X++;
          statusEl.textContent = "🎉 You win!";
          statusEl.className = "status win";
          AudioFX.win();
          const best = (Storage.getBest("tictactoextreme") || 0) + 1;
          Storage.setBest("tictactoextreme", best);
        } else {
          scores.O++;
          statusEl.textContent = "💀 AI wins!";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        return true;
      }

      function reset() {
        board = Array(9).fill(null);
        placements = {X: [], O: []};
        current = HUMAN;
        over = false;
        winLine = null;
        statusEl.textContent = "Your turn (X). You can only have 3 pieces on the board.";
        statusEl.className = "status info";
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") reset();
      }

      document.addEventListener("keydown", onKey);

      live = {};
      render();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Tic Tac Toe Extreme",
        `Classic Tic Tac Toe with a twist: <b>each player can only have 3 pieces on the board at once</b>.
        <br><br>When you place a 4th piece, your <b>oldest</b> piece disappears (shown dimmed with a dashed border before it goes).
        <br><br>Get 3 in a row to win. Pieces can come and go, so plan ahead!`);
    },
  });
})();
