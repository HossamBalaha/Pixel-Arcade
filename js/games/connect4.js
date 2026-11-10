/* Connect Four — drop discs to make 4 in a row vs AI (Easy/Medium/Hard) */
(function () {
  const ROWS = 6, COLS = 7;
  const P1 = 1, P2 = 2;
  const DEPTH = {easy: 1, medium: 3, hard: 5};

  function newBoard() {
    return Array.from({length: ROWS}, () => Array(COLS).fill(0));
  }

  function dropCol(b, col, p) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (b[r][col] === 0) {
        b[r][col] = p;
        return r;
      }
    }
    return -1;
  }

  function validCols(b) {
    const v = [];
    for (let c = 0; c < COLS; c++) if (b[0][c] === 0) v.push(c);
    return v;
  }

  function checkWin(b, p) {
    // horizontal
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r][c + 1] === p && b[r][c + 2] === p && b[r][c + 3] === p) return [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]];
    // vertical
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++)
      if (b[r][c] === p && b[r + 1][c] === p && b[r + 2][c] === p && b[r + 3][c] === p) return [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]];
    // diag down-right
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r + 1][c + 1] === p && b[r + 2][c + 2] === p && b[r + 3][c + 3] === p) return [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]];
    // diag up-right
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++)
      if (b[r][c] === p && b[r - 1][c + 1] === p && b[r - 2][c + 2] === p && b[r - 3][c + 3] === p) return [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]];
    return null;
  }

  // Score a window for the AI (P2 perspective)
  function scoreWindow(w) {
    let s = 0;
    const p2 = w.filter(x => x === P2).length;
    const p1 = w.filter(x => x === P1).length;
    const e = w.filter(x => x === 0).length;
    if (p2 === 4) s += 1000;
    else if (p2 === 3 && e === 1) s += 50;
    else if (p2 === 2 && e === 2) s += 5;
    if (p1 === 3 && e === 1) s -= 80;
    if (p1 === 2 && e === 2) s -= 4;
    return s;
  }

  function evalBoard(b) {
    let s = 0;
    // center column preference
    const center = COLS >> 1;
    for (let r = 0; r < ROWS; r++) if (b[r][center] === P2) s += 4;
    // windows
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) s += scoreWindow([b[r][c], b[r][c + 1], b[r][c + 2], b[r][c + 3]]);
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) s += scoreWindow([b[r][c], b[r + 1][c], b[r + 2][c], b[r + 3][c]]);
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) s += scoreWindow([b[r][c], b[r + 1][c + 1], b[r + 2][c + 2], b[r + 3][c + 3]]);
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) s += scoreWindow([b[r][c], b[r - 1][c + 1], b[r - 2][c + 2], b[r - 3][c + 3]]);
    return s;
  }

  function minimax(b, depth, alpha, beta, maxing) {
    const w1 = checkWin(b, P1), w2 = checkWin(b, P2);
    if (w2) return {score: 100000 + depth};
    if (w1) return {score: -100000 - depth};
    if (depth === 0 || validCols(b).length === 0) return {score: evalBoard(b)};
    if (maxing) {
      let best = {score: -Infinity, col: -1};
      for (const c of validCols(b)) {
        const tmp = b.map(row => row.slice());
        dropCol(tmp, c, P2);
        const r = minimax(tmp, depth - 1, alpha, beta, false);
        if (r.score > best.score) best = {score: r.score, col: c};
        alpha = Math.max(alpha, best.score);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = {score: Infinity, col: -1};
      for (const c of validCols(b)) {
        const tmp = b.map(row => row.slice());
        dropCol(tmp, c, P1);
        const r = minimax(tmp, depth - 1, alpha, beta, true);
        if (r.score < best.score) best = {score: r.score, col: c};
        beta = Math.min(beta, best.score);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function aiMove(b, depth) {
    if (depth === 1) {
      // Easy: random + sometimes block obvious 3
      const vc = validCols(b);
      // Block if P1 has 3 in a row
      for (const c of vc) {
        const tmp = b.map(r => r.slice());
        dropCol(tmp, c, P1);
        if (checkWin(tmp, P1)) return c;
      }
      return vc[Math.floor(Math.random() * vc.length)];
    }
    return minimax(b, depth, -Infinity, Infinity, true).col;
  }

  GameRegistry.register({
    id: "connect4",
    name: "Connect Four",
    icon: "🔴",
    category: "strategy",
    description: "Drop discs to make 4 in a row vs AI",
    tags: ["strategy", "ai", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let aiTimer = null;
      let b, mode = "ai", diff = "medium", over = false, current = P1, winCells = null;
      let scores = {P1: 0, P2: 0, draw: 0};

      function newGame() {
        b = newBoard();
        over = false;
        current = P1;
        winCells = null;
        render(-1, -1);
      }

      root.innerHTML = `
        <div class="row" style="justify-content:space-between;">
          <div class="difficulty" id="c4-mode">
            <button class="diff-btn active" data-m="ai">vs AI</button>
            <button class="diff-btn" data-m="2p">2P</button>
          </div>
          <div class="difficulty" id="c4-diff">
            <button class="diff-btn" data-d="easy">Easy</button>
            <button class="diff-btn active" data-d="medium">Med</button>
            <button class="diff-btn" data-d="hard">Hard</button>
          </div>
        </div>
        <div class="status info" id="c4-status">Your turn (Red)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Red (You)</div><div class="val" id="c4-p1">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="c4-d">0</div></div>
          <div class="score-cell"><div class="label">Yellow</div><div class="val" id="c4-p2">0</div></div>
        </div>
        <div class="center"><div class="c4-wrap"><div class="c4-board" id="c4-board"></div></div></div>
        <p class="hint">Click a column to drop a disc. Connect 4 horizontally, vertically, or diagonally.</p>
      `;

      const boardEl = root.querySelector("#c4-board");
      const statusEl = root.querySelector("#c4-status");

      function render(newR, newC) {
        // Rebuild the grid DOM. We track which cell (row,col) just got a disc
        // so only that one animates a drop; existing discs are rendered
        // WITHOUT the drop animation so they don't re-fall on every move.
        boardEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const cell = document.createElement("div");
            cell.className = "c4-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            const v = b[r][c];
            if (v) {
              const disc = document.createElement("div");
              disc.className = "c4-disc" + (v === P2 ? " p2" : "");
              // Only the just-dropped disc animates; the rest appear instantly.
              if (r === newR && c === newC) {
                disc.classList.add("c4-drop-new");
              } else {
                disc.classList.add("c4-no-anim");
              }
              cell.appendChild(disc);
            }
            if (winCells && winCells.some(([wr, wc]) => wr === r && wc === c)) {
              cell.style.boxShadow = "0 0 0 3px var(--success) inset";
            }
            cell.addEventListener("click", () => onCol(c));
            boardEl.appendChild(cell);
          }
        }
        root.querySelector("#c4-p1").textContent = scores.P1;
        root.querySelector("#c4-p2").textContent = scores.P2;
        root.querySelector("#c4-d").textContent = scores.draw;
      }

      function onCol(c) {
        if (over) return;
        if (mode === "ai" && current !== P1) return;
        const placedRow = dropCol(b, c, current);
        if (placedRow === -1) return;
        AudioFX.place();
        afterMove();
        if (!over) {
          current = current === P1 ? P2 : P1;
          statusEl.textContent = mode === "ai" && current === P2 ? "AI thinking…" : (current === P1 ? "Your turn (Red)" : "Yellow's turn");
          render(placedRow, c);
          if (mode === "ai" && current === P2) aiTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            aiTurn();
          }, 500);
          else if (mode === "2p" && passOn) App.passTurn(current === P1 ? "Red (P1)" : "Yellow (P2)");
        } else render(placedRow, c);
      }

      function aiTurn() {
        if (over) return;
        const c = aiMove(b, DEPTH[diff]);
        const placedRow = dropCol(b, c, P2);
        AudioFX.move();
        afterMove();
        if (!over) {
          current = P1;
          statusEl.textContent = "Your turn (Red)";
        }
        render(placedRow, c);
      }

      function afterMove() {
        const w = checkWin(b, current);
        if (w) {
          over = true;
          winCells = w;
          if (current === P1) {
            scores.P1++;
            statusEl.textContent = "🎉 You win!";
            statusEl.className = "status win";
            AudioFX.win();
            Storage.submitScore("connect4", (Storage.getBest("connect4") || 0) + 1);
          } else {
            scores.P2++;
            statusEl.textContent = "AI wins 💀";
            statusEl.className = "status lose";
            AudioFX.lose();
          }
        } else if (validCols(b).length === 0) {
          over = true;
          scores.draw++;
          statusEl.textContent = "Draw — board full";
          statusEl.className = "status info";
          AudioFX.lose();
        }
      }

      root.querySelectorAll("#c4-mode .diff-btn").forEach(btn => btn.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#c4-mode .diff-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        mode = btn.dataset.m;
        root.querySelector("#c4-diff").style.display = mode === "ai" ? "" : "none";
        scores = {P1: 0, P2: 0, draw: 0};
        newGame();
      }));
      // Pass-and-play curtain — optional privacy screen between 2P turns.
      let passOn = Storage.getPassPlay("connect4", false); // fast turns: opt-in
      const passBtn = document.createElement("button");
      passBtn.className = "diff-btn";
      passBtn.title = "Show a privacy screen between turns when playing 2P";
      const syncPassBtn = () => {
        passBtn.textContent = "🙈 Pass: " + (passOn ? "ON" : "OFF");
        passBtn.classList.toggle("active", passOn);
      };
      syncPassBtn();
      passBtn.addEventListener("click", () => {
        passOn = !passOn;
        Storage.setPassPlay("connect4", passOn);
        syncPassBtn();
        AudioFX.click();
      });
      root.querySelector("#c4-mode").appendChild(passBtn);
      root.querySelectorAll("#c4-diff .diff-btn").forEach(btn => btn.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#c4-diff .diff-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        diff = btn.dataset.d;
        scores = {P1: 0, P2: 0, draw: 0};
        newGame();
      }));

      newGame();
      return function cleanup() {
        alive = false;
        if (aiTimer) clearTimeout(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Connect Four",
        `Click any column to drop your disc into the lowest empty slot in that column.
        <br>Be the first to line up <b>4 of your discs</b> — horizontally, vertically, or diagonally — to win.
        <br><br><b>Easy AI</b>: random with basic blocking. <b>Medium AI</b>: minimax depth 3. <b>Hard AI</b>: minimax depth 5 (stronger but slower).`);
    },
  });
})();
