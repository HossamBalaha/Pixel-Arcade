/* Connect 5 — 8x8 board, drop discs, get 5 in a row. vs AI. */
(function () {
  const ROWS = 8, COLS = 8, WIN = 5;
  const P = 1, A = 2;
  let live = null;

  function newBoard() {
    return Array.from({length: ROWS}, () => Array(COLS).fill(0));
  }

  function dropCol(b, c, p) {
    for (let r = ROWS - 1; r >= 0; r--) if (b[r][c] === 0) {
      b[r][c] = p;
      return r;
    }
    return -1;
  }

  function validCols(b) {
    const v = [];
    for (let c = 0; c < COLS; c++) if (b[0][c] === 0) v.push(c);
    return v;
  }

  function checkWin(b, p) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - WIN; c++) {
      let ok = true;
      for (let k = 0; k < WIN; k++) if (b[r][c + k] !== p) {
        ok = false;
        break;
      }
      if (ok) return Array.from({length: WIN}, (_, k) => [r, c + k]);
    }
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - WIN; r++) {
      let ok = true;
      for (let k = 0; k < WIN; k++) if (b[r + k][c] !== p) {
        ok = false;
        break;
      }
      if (ok) return Array.from({length: WIN}, (_, k) => [r + k, c]);
    }
    for (let r = 0; r <= ROWS - WIN; r++) for (let c = 0; c <= COLS - WIN; c++) {
      let ok = true;
      for (let k = 0; k < WIN; k++) if (b[r + k][c + k] !== p) {
        ok = false;
        break;
      }
      if (ok) return Array.from({length: WIN}, (_, k) => [r + k, c + k]);
    }
    for (let r = WIN - 1; r < ROWS; r++) for (let c = 0; c <= COLS - WIN; c++) {
      let ok = true;
      for (let k = 0; k < WIN; k++) if (b[r - k][c + k] !== p) {
        ok = false;
        break;
      }
      if (ok) return Array.from({length: WIN}, (_, k) => [r - k, c + k]);
    }
    return null;
  }

  function countRun(b, r, c, dr, dc, p) {
    let n = 0;
    for (let k = 1; k < WIN; k++) {
      const nr = r + dr * k, nc = c + dc * k;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
      n++;
    }
    for (let k = 1; k < WIN; k++) {
      const nr = r - dr * k, nc = c - dc * k;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
      n++;
    }
    return n + 1;
  }

  function evalPos(b, p) {
    // sum of best runs per cell
    let best = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (b[r][c] !== p) continue;
      const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
      for (const [dr, dc] of dirs) best = Math.max(best, countRun(b, r, c, dr, dc, p));
    }
    return best;
  }

  function aiMove(b) {
    // win if possible
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, A);
      if (checkWin(t, A)) return c;
    }
    // block player's win
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, P);
      if (checkWin(t, P)) return c;
    }
    // heuristic: pick column maximizing AI runs and minimizing player runs
    let best = -Infinity, bestC = validCols(b)[0];
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, A);
      const myScore = evalPos(t, A);
      const oppScore = evalPos(t, P);
      const center = -Math.abs(c - 3.5);
      const s = myScore * 10 - oppScore * 9 + center + Math.random() * 0.5;
      if (s > best) {
        best = s;
        bestC = c;
      }
    }
    return bestC;
  }

  function bestForPlayer(b) {
    // similar
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, P);
      if (checkWin(t, P)) return c;
    }
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, A);
      if (checkWin(t, A)) return c;
    }
    let best = -Infinity, bestC = validCols(b)[0];
    for (const c of validCols(b)) {
      const t = b.map(r => r.slice());
      dropCol(t, c, P);
      const myScore = evalPos(t, P);
      const oppScore = evalPos(t, A);
      const center = -Math.abs(c - 3.5);
      const s = myScore * 10 - oppScore * 9 + center + Math.random() * 0.5;
      if (s > best) {
        best = s;
        bestC = c;
      }
    }
    return bestC;
  }

  GameRegistry.register({
    id: "connect5",
    name: "Connect 5",
    icon: "🔵",
    category: "strategy",
    description: "Drop discs and get 5 in a row on an 8×8 board — vs AI",
    tags: ["strategy", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, current, over, winCells, scores;
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
        <div class="status info" id="c5-status">Your turn (Blue)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You</div><div class="val" id="c5-p">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="c5-d">0</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="c5-a">0</div></div>
        </div>
        <div class="center"><div class="c4-wrap"><div class="c4-board" id="c5-board" style="grid-template-columns:repeat(${COLS},minmax(0,1fr));width:360px;"></div></div></div>
        <p class="hint">Click a column to drop a disc. First to line up 5 wins.</p>
      `;
      const boardEl = root.querySelector("#c5-board");
      const statusEl = root.querySelector("#c5-status");

      function newGame() {
        b = newBoard();
        current = P;
        over = false;
        winCells = null;
        setStatus("Your turn (Blue)");
        render();
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const cell = document.createElement("div");
          cell.className = "c4-cell";
          cell.dataset.r = r;
          cell.dataset.c = c;
          const v = b[r][c];
          if (v) {
            const disc = document.createElement("div");
            disc.className = "c4-disc" + (v === A ? " p2" : "");
            if (v === A) disc.style.background = "var(--text)";
            cell.appendChild(disc);
          }
          if (winCells && winCells.some(([wr, wc]) => wr === r && wc === c)) cell.style.boxShadow = "0 0 0 3px var(--success) inset";
          cell.addEventListener("click", () => onCol(c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#c5-p").textContent = scores.P;
        root.querySelector("#c5-a").textContent = scores.A;
        root.querySelector("#c5-d").textContent = scores.draw;
      }

      function onCol(c) {
        if (over || current !== P) return;
        if (dropCol(b, c, P) === -1) return;
        AudioFX.place();
        if (afterMove()) return;
        current = A;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 500);
      }

      function aiTurn() {
        if (over) return;
        const c = aiMove(b);
        dropCol(b, c, A);
        AudioFX.move();
        if (afterMove()) return;
        current = P;
        setStatus("Your turn (Blue)");
        render();
      }

      function afterMove() {
        const w = checkWin(b, current);
        if (w) {
          over = true;
          winCells = w;
          if (current === P) {
            scores.P++;
            setStatus("🎉 You win!", "win");
            AudioFX.win();
            Storage.submitScore("connect5", (Storage.getBest("connect5") || 0) + 1);
          } else {
            scores.A++;
            setStatus("AI wins 💀", "lose");
            AudioFX.lose();
          }
          render();
          return true;
        }
        if (validCols(b).length === 0) {
          over = true;
          scores.draw++;
          setStatus("Draw", "info");
          AudioFX.lose();
          render();
          return true;
        }
        return false;
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          scores = {P: 0, A: 0, draw: 0};
          newGame();
        }
      }

      document.addEventListener("keydown", onKey);
      scores = {P: 0, A: 0, draw: 0};

      function doHint() {
        if (over || current !== P) return;
        const c = bestForPlayer(b);
        // highlight the topmost empty cell in that column
        for (let r = 0; r < ROWS; r++) {
          if (b[r][c] === 0) {
            // r is the topmost empty; we want bottom-most empty
          }
        }
        let r = -1;
        for (let rr = ROWS - 1; rr >= 0; rr--) if (b[rr][c] === 0) {
          r = rr;
          break;
        }
        if (r === -1) return;
        const el = boardEl.children[r * COLS + c];
        if (el) {
          el.style.boxShadow = "0 0 0 3px var(--warning) inset";
          AudioFX.reveal();
          later(() => {
            if (alive && el) el.style.boxShadow = "";
          }, 1500);
        }
      }

      function doSolve() {
        if (over || current !== P) return;
        const c = bestForPlayer(b);
        dropCol(b, c, P);
        AudioFX.place();
        if (afterMove()) return;
        current = A;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 500);
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
      App.showModal("How to play Connect 5",
        `Click any column to drop your disc into the lowest empty slot.
        <br>Be the first to line up <b>5 of your discs</b> — horizontally, vertically, or diagonally.
        <br><br>The AI uses a greedy heuristic: it wins if it can, blocks if it must, otherwise plays to extend its longest run.
        <br><b>Hint</b> highlights the suggested column. <b>Solve</b> plays it. <b>R</b> restarts.`);
    },
  });
})();
