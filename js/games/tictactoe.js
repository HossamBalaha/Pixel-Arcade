/* Tic Tac Toe — vs AI (Easy/Medium/Hard minimax) or 2-player */
(function () {
  const HUMAN = "X";
  const AI = "O";
  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  function winner(b) {
    for (const [a, b1, c] of LINES) {
      if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
    }
    if (b.every(x => x)) return "draw";
    return null;
  }

  function minimax(b, player, depth) {
    const w = winner(b);
    if (w === AI) return {score: 10 - depth};
    if (w === HUMAN) return {score: depth - 10};
    if (w === "draw") return {score: 0};

    const moves = [];
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = player;
        const res = minimax(b, player === AI ? HUMAN : AI, depth + 1);
        moves.push({i, score: res.score});
        b[i] = null;
      }
    }
    if (player === AI) {
      return moves.reduce((best, m) => m.score > best.score ? m : best, {score: -Infinity});
    } else {
      return moves.reduce((best, m) => m.score < best.score ? m : best, {score: Infinity});
    }
  }

  function bestMove(b) {
    return minimax(b, AI, 0).i;
  }

  function randomMove(b) {
    const empty = [];
    for (let i = 0; i < 9; i++) if (!b[i]) empty.push(i);
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function blockingMove(b) {
    // Take win if available, else block
    for (const [a, b1, c] of LINES) {
      const line = [b[a], b[b1], b[c]];
      const idxs = [a, b1, c];
      // AI wins?
      if (line.filter(x => x === AI).length === 2 && line.filter(x => !x).length === 1) {
        return idxs[line.indexOf(undefined)];
      }
      // Block human?
      if (line.filter(x => x === HUMAN).length === 2 && line.filter(x => !x).length === 1) {
        return idxs[line.indexOf(undefined)];
      }
    }
    return null;
  }

  function aiMove(b, diff) {
    if (diff === "easy") return randomMove(b);
    if (diff === "medium") {
      const block = blockingMove(b);
      if (block !== null && Math.random() < 0.7) return block;
      return randomMove(b);
    }
    // hard
    return bestMove(b);
  }

  GameRegistry.register({
    id: "tictactoe",
    name: "Tic Tac Toe",
    icon: "⭕",
    category: "strategy",
    description: "Classic 3-in-a-row vs smart AI or a friend",
    tags: ["classic", "ai", "popular"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let aiTimer = null;
      let board = Array(9).fill(null);
      let mode = "ai";      // "ai" | "2p"
      let difficulty = "hard";
      let current = HUMAN;
      let over = false;
      let winLine = null;
      let scores = {X: 0, O: 0, draw: 0};

      root.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div class="difficulty" id="ttt-mode">
            <button class="diff-btn active" data-m="ai">vs AI</button>
            <button class="diff-btn" data-m="2p">2 Players</button>
          </div>
          <div class="difficulty" id="ttt-diff">
            <button class="diff-btn" data-d="easy">Easy</button>
            <button class="diff-btn" data-d="medium">Med</button>
            <button class="diff-btn active" data-d="hard">Hard</button>
          </div>
        </div>
        <div class="status" id="ttt-status">Your turn (X)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">X Wins</div><div class="val" id="ttt-x">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="ttt-d">0</div></div>
          <div class="score-cell"><div class="label">O Wins</div><div class="val" id="ttt-o">0</div></div>
        </div>
        <div class="center">
          <div class="board" id="ttt-board" style="grid-template-columns:repeat(3,90px);width:282px;"></div>
        </div>
        <p class="hint">Tap a square to play. Press R to restart, 1/2/3 to set AI difficulty.</p>
      `;

      const boardEl = root.querySelector("#ttt-board");
      const statusEl = root.querySelector("#ttt-status");

      function render() {
        boardEl.innerHTML = "";
        for (let i = 0; i < 9; i++) {
          const c = document.createElement("div");
          c.className = "cell";
          c.style.fontSize = "2rem";
          c.dataset.i = i;
          if (board[i]) c.classList.add(board[i].toLowerCase(), "filled", "locked");
          if (winLine && winLine.includes(i)) c.style.background = "var(--success)";
          if (over) c.classList.add("disabled");
          c.textContent = board[i] || "";
          c.addEventListener("click", () => onCell(i));
          boardEl.appendChild(c);
        }
        root.querySelector("#ttt-x").textContent = scores.X;
        root.querySelector("#ttt-o").textContent = scores.O;
        root.querySelector("#ttt-d").textContent = scores.draw;
      }

      function setStatus(text, kind) {
        statusEl.textContent = text;
        statusEl.className = "status" + (kind ? " " + kind : "");
      }

      function onCell(i) {
        if (over || board[i]) return;
        if (mode === "ai" && current !== HUMAN) return;
        board[i] = current;
        AudioFX.place();
        const w = checkEnd();
        if (w) {
          render();
          return;
        }
        current = current === HUMAN ? AI : HUMAN;
        setStatus(mode === "ai" ? "AI thinking…" : `Player ${current}'s turn (${current})`);
        render();
        if (mode === "ai" && current === AI && !over) {
          aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiTurn();
          }, 450);
        }
      }

      function aiTurn() {
        if (over) return;
        const m = aiMove(board, difficulty);
        if (m === undefined || m === null) return;
        board[m] = AI;
        AudioFX.move();
        const w = checkEnd();
        if (!w) {
          current = HUMAN;
          setStatus("Your turn (X)");
        }
        render();
      }

      function checkEnd() {
        const w = winner(board);
        if (!w) return false;
        over = true;
        winLine = LINES.find(l => l.every(i => board[i] === w));
        if (w === "draw") {
          scores.draw++;
          setStatus("It's a draw!", "info");
          AudioFX.lose();
        } else {
          scores[w]++;
          if (mode === "ai") {
            if (w === HUMAN) {
              setStatus("You win! 🎉", "win");
              AudioFX.win();
              Storage.submitScore("tictactoe", (Storage.getBest("tictactoe") || 0) + 1, {higherBetter: true});
            } else {
              setStatus("AI wins 💀", "lose");
              AudioFX.lose();
            }
          } else {
            setStatus(`Player ${w} wins! 🎉`, "win");
            AudioFX.win();
          }
        }
        return true;
      }

      function reset() {
        board = Array(9).fill(null);
        current = HUMAN;
        over = false;
        winLine = null;
        setStatus("Your turn (X)");
        render();
      }

      // Wire buttons
      root.querySelectorAll("#ttt-mode .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#ttt-mode .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        mode = b.dataset.m;
        root.querySelector("#ttt-diff").style.display = mode === "ai" ? "" : "none";
        scores = {X: 0, O: 0, draw: 0};
        reset();
      }));
      root.querySelectorAll("#ttt-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#ttt-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        difficulty = b.dataset.d;
        scores = {X: 0, O: 0, draw: 0};
        reset();
      }));

      // Keyboard
      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          reset();
        }
        if (mode === "ai") {
          if (e.key === "1") {
            root.querySelector('[data-d="easy"]').click();
          }
          if (e.key === "2") {
            root.querySelector('[data-d="medium"]').click();
          }
          if (e.key === "3") {
            root.querySelector('[data-d="hard"]').click();
          }
        }
      }

      document.addEventListener("keydown", onKey);

      render();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Tic Tac Toe",
        `Get three of your marks in a row (horizontally, vertically, or diagonally) before your opponent does.
        <br><br><b>vs AI</b>: choose Easy (random), Medium (sometimes blocks), or Hard (unbeatable minimax).
        <br><b>2 Players</b>: take turns on the same device, X starts.
        <br><br>Keyboard: <b>R</b> to restart, <b>1/2/3</b> to set AI difficulty.`);
    },
  });
})();
