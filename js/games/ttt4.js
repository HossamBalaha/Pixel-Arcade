/* Tic Tac Toe 4x4 — get 4 in a row. vs simple AI. */
(function () {
  const N = 4;
  const H = "X", AI = "O";
  let live = null;

  function lines() {
    const L = [];
    // rows & cols
    for (let i = 0; i < N; i++) {
      L.push(Array.from({length: N}, (_, j) => [i, j]));
      L.push(Array.from({length: N}, (_, j) => [j, i]));
    }
    // diagonals
    L.push(Array.from({length: N}, (_, i) => [i, i]));
    L.push(Array.from({length: N}, (_, i) => [i, N - 1 - i]));
    return L;
  }

  const LINES = lines();

  function winner(b) {
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      if (vals[0] && vals.every(v => v === vals[0])) return {p: vals[0], line};
    }
    if (b.flat().every(v => v)) return {p: "draw"};
    return null;
  }

  // Heuristic AI: win if possible, block if needed, else best heuristic
  function aiMove(b) {
    // 1. Try win
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      const emptyIdx = vals.findIndex(v => !v);
      const oCount = vals.filter(v => v === AI).length;
      const xCount = vals.filter(v => v === H).length;
      if (oCount === 3 && emptyIdx !== -1) return line[emptyIdx];
    }
    // 2. Block
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      const emptyIdx = vals.findIndex(v => !v);
      const xCount = vals.filter(v => v === H).length;
      const oCount = vals.filter(v => v === AI).length;
      if (xCount === 3 && oCount === 0 && emptyIdx !== -1) return line[emptyIdx];
    }
    // 3. Two-in-row creation
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      const emptyIdx = vals.findIndex(v => !v);
      const oCount = vals.filter(v => v === AI).length;
      if (oCount === 2 && emptyIdx !== -1 && vals.filter(v => !v).length === 2) return line[emptyIdx];
    }
    // 4. Center preference
    const prefs = [[1, 1], [1, 2], [2, 1], [2, 2], [0, 0], [0, 3], [3, 0], [3, 3]];
    for (const [r, c] of prefs) if (!b[r][c]) return [r, c];
    // 5. random
    const empty = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!b[r][c]) empty.push([r, c]);
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function bestForPlayer(b) {
    // similar but from player perspective (also wins/blocks)
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      const emptyIdx = vals.findIndex(v => !v);
      const xCount = vals.filter(v => v === H).length;
      const oCount = vals.filter(v => v === AI).length;
      if (xCount === 3 && emptyIdx !== -1 && oCount === 0) return line[emptyIdx];
    }
    for (const line of LINES) {
      const vals = line.map(([r, c]) => b[r][c]);
      const emptyIdx = vals.findIndex(v => !v);
      const oCount = vals.filter(v => v === AI).length;
      const xCount = vals.filter(v => v === H).length;
      if (oCount === 3 && emptyIdx !== -1 && xCount === 0) return line[emptyIdx];
    }
    return aiMove(b); // fallback uses same heuristic
  }

  GameRegistry.register({
    id: "ttt4",
    name: "Tic Tac Toe 4×4",
    icon: "❌",
    category: "strategy",
    description: "Get 4 in a row on a 4×4 board vs AI",
    tags: ["strategy", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, current, over, winLine, scores;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="status info" id="tt-status">Your turn (X)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">X (You)</div><div class="val" id="tt-x">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="tt-d">0</div></div>
          <div class="score-cell"><div class="label">O (AI)</div><div class="val" id="tt-o">0</div></div>
        </div>
        <div class="center"><div id="tt-board" style="display:grid;grid-template-columns:repeat(4,70px);grid-template-rows:repeat(4,70px);gap:6px;"></div></div>
        <p class="hint">Click a square to play. Get 4 in a row to win. <b>R</b> restart.</p>
      `;
      const boardEl = root.querySelector("#tt-board");
      const statusEl = root.querySelector("#tt-status");

      function newGame() {
        b = Array.from({length: N}, () => Array(N).fill(null));
        current = H;
        over = false;
        winLine = null;
        setStatus("Your turn (X)");
        render();
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.style.fontSize = "1.8rem";
          const v = b[r][c];
          if (v) {
            cell.classList.add(v.toLowerCase(), "filled", "locked");
            cell.textContent = v;
          }
          if (winLine && winLine.some(([wr, wc]) => wr === r && wc === c)) cell.style.background = "var(--success)";
          if (over) cell.classList.add("disabled");
          cell.addEventListener("click", () => onClick(r, c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#tt-x").textContent = scores.X;
        root.querySelector("#tt-o").textContent = scores.O;
        root.querySelector("#tt-d").textContent = scores.draw;
      }

      function onClick(r, c) {
        if (over || b[r][c] || current !== H) return;
        b[r][c] = H;
        AudioFX.place();
        if (checkEnd()) return;
        current = AI;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 400);
      }

      function aiTurn() {
        if (over) return;
        const [r, c] = aiMove(b);
        b[r][c] = AI;
        AudioFX.move();
        if (checkEnd()) return;
        current = H;
        setStatus("Your turn (X)");
        render();
      }

      function checkEnd() {
        const w = winner(b);
        if (!w) return false;
        over = true;
        winLine = w.line;
        if (w.p === "draw") {
          scores.draw++;
          setStatus("Draw!", "info");
          AudioFX.lose();
        } else if (w.p === H) {
          scores.X++;
          setStatus("🎉 You win!", "win");
          AudioFX.win();
          Storage.submitScore("ttt4", (Storage.getBest("ttt4") || 0) + 1);
        } else {
          scores.O++;
          setStatus("AI wins 💀", "lose");
          AudioFX.lose();
        }
        render();
        return true;
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          scores = {X: 0, O: 0, draw: 0};
          newGame();
        }
      }

      document.addEventListener("keydown", onKey);
      scores = {X: 0, O: 0, draw: 0};

      function doHint() {
        if (over || current !== H) return;
        const [r, c] = bestForPlayer(b);
        const cell = boardEl.children[r * N + c];
        if (cell) {
          cell.style.outline = "3px solid var(--warning)";
          AudioFX.reveal();
          later(() => {
            if (alive && cell) cell.style.outline = "";
          }, 1500);
        }
      }

      function doSolve() {
        if (over || current !== H) return;
        const [r, c] = bestForPlayer(b);
        b[r][c] = H;
        AudioFX.place();
        if (checkEnd()) return;
        current = AI;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 400);
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Tic Tac Toe 4×4",
        `Same rules as classic Tic Tac Toe, but on a 4×4 grid — you need 4 in a row (horizontal, vertical, or diagonal) to win.
        <br><br>You play X, the AI plays O. <b>Hint</b> suggests a strong move. <b>Solve</b> plays it for you. <b>R</b> restarts.`);
    },
  });
})();
