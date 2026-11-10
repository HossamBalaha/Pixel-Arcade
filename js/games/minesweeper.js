/* Minesweeper — classic grid puzzle. Flag mines, reveal numbers, clear all safe cells.
   Board size / mine count is a variant: Easy 9×9 / Med 12×12 / Hard 16×14 —
   chosen in the game-header dropdown, persisted per player. */
(function () {
  const LEVELS = {
    easy: {rows: 9, cols: 9, mines: 10},
    medium: {rows: 12, cols: 12, mines: 24},
    hard: {rows: 16, cols: 14, mines: 40},
  };
  const MAX_HINTS = 3;

  function build(rows, cols, mines, safeR, safeC) {
    const b = Array.from({length: rows}, () => Array(cols).fill(0).map(() => ({
      mine: false,
      n: 0,
      revealed: false,
      flagged: false
    })));
    // Place mines avoiding the safe cell + neighbors
    let placed = 0;
    while (placed < mines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (b[r][c].mine) continue;
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      b[r][c].mine = true;
      placed++;
    }
    // Count neighbors
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (b[r][c].mine) continue;
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && b[nr][nc].mine) n++;
      }
      b[r][c].n = n;
    }
    return b;
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "minesweeper",
    name: "Minesweeper",
    icon: "💣",
    category: "logic",
    description: "Clear the board without detonating any mines",
    tags: ["puzzle", "classic", "popular"],
    variants: [
      {key: "easy", label: "Easy 9×9"},
      {key: "medium", label: "Medium 12×12"},
      {key: "hard", label: "Hard 16×14"},
    ],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      // Variant: starting board size from the persisted choice.
      let level = Storage.getVariant("minesweeper", "easy") || "easy";
      let b, started, over, flags, revealed, total, time, timerInterval;
      let hintsUsed = 0;

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="mw-diff">
            <button class="diff-btn ${level === "easy" ? "active" : ""}" data-l="easy">Easy 9×9</button>
            <button class="diff-btn ${level === "medium" ? "active" : ""}" data-l="medium">Med 12×12</button>
            <button class="diff-btn ${level === "hard" ? "active" : ""}" data-l="hard">Hard 16×14</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mines left</div><div class="val" id="mw-mines">0</div></div>
          <div class="score-cell"><div class="label">Cleared</div><div class="val" id="mw-cleared">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mw-time">0</div></div>
        </div>
        <div class="status info" id="mw-status">Click a cell to start. Right-click to flag a mine.</div>
        <div class="center" id="mw-wrap"></div>
        <p class="hint">Tap a cell to reveal. <b>Long-press</b> (mobile) or <b>right-click</b> (desktop) to flag. Press R to restart. Stuck? Use <b>Hint</b> (max 3 per game) or <b>Solve</b> in the header.</p>
      `;

      const wrap = root.querySelector("#mw-wrap");
      const statusEl = root.querySelector("#mw-status");

      function newGame() {
        const L = LEVELS[level];
        total = L.rows * L.cols - L.mines;
        b = Array.from({length: L.rows}, () => Array.from({length: L.cols}, () => ({
          mine: false,
          n: 0,
          revealed: false,
          flagged: false
        })));
        started = false;
        over = false;
        flags = 0;
        revealed = 0;
        time = 0;
        hintsUsed = 0;
        clearInterval(timerInterval);
        timerInterval = null;
        statusEl.textContent = "Click a cell to start. Right-click / long-press to flag.";
        statusEl.className = "status info";
        render();
      }

      function startGame(r, c) {
        const L = LEVELS[level];
        b = build(L.rows, L.cols, L.mines, r, c);
        started = true;
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) {
            time++;
            root.querySelector("#mw-time").textContent = time;
          }
        }, 1000);
      }

      function render() {
        const L = LEVELS[level];
        root.querySelector("#mw-mines").textContent = L.mines - flags;
        root.querySelector("#mw-cleared").textContent = `${revealed}/${total}`;
        root.querySelector("#mw-time").textContent = time;
        wrap.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "mw-board";
        grid.style.gridTemplateColumns = `repeat(${L.cols}, 1fr)`;
        for (let r = 0; r < L.rows; r++) {
          for (let c = 0; c < L.cols; c++) {
            const cell = b[r][c];
            const el = document.createElement("div");
            el.className = "mw-cell";
            el.dataset.r = r;
            el.dataset.c = c;
            if (cell.revealed) {
              el.classList.add("revealed");
              if (cell.mine) {
                el.classList.add("mine");
                el.textContent = "💣";
              } else if (cell.n > 0) {
                el.dataset.n = cell.n;
                el.textContent = cell.n;
              }
            } else if (cell.flagged) {
              el.classList.add("flagged");
              el.textContent = "🚩";
            }
            el.addEventListener("click", (e) => onLeft(r, c));
            el.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              onFlag(r, c);
            });
            let pressTimer;
            el.addEventListener("touchstart", (e) => {
              pressTimer = setTimeout(() => {
                if (!alive) return;
                if (!alive) return;
                if (alive) onFlag(r, c);
                pressTimer = null;
              }, 350);
            });
            el.addEventListener("touchend", () => {
              if (pressTimer) clearTimeout(pressTimer);
            });
            el.addEventListener("touchmove", () => {
              if (pressTimer) clearTimeout(pressTimer);
            });
            grid.appendChild(el);
          }
        }
        wrap.appendChild(grid);
      }

      function floodReveal(r, c) {
        const L = LEVELS[level];
        const stack = [[r, c]];
        while (stack.length) {
          const [cr, cc] = stack.pop();
          if (cr < 0 || cr >= L.rows || cc < 0 || cc >= L.cols) continue;
          const cell = b[cr][cc];
          if (cell.revealed || cell.flagged || cell.mine) continue;
          cell.revealed = true;
          revealed++;
          if (cell.n === 0) {
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
              if (dr || dc) stack.push([cr + dr, cc + dc]);
            }
          }
        }
      }

      function checkWin() {
        if (revealed !== total) return;
        over = true;
        clearInterval(timerInterval);
        statusEl.textContent = `🎉 Cleared in ${time}s!`;
        statusEl.className = "status win";
        AudioFX.win();
        const key = "minesweeper_" + level;
        const best = Storage.getBest(key);
        if (!best || time < best) {
          Storage.setBest(key, time);
          App.toast("New best for " + level + ": " + time + "s", "success");
        }
        // auto-flag remaining mines
        const L = LEVELS[level];
        for (let rr = 0; rr < L.rows; rr++) for (let cc = 0; cc < L.cols; cc++) {
          if (b[rr][cc].mine) b[rr][cc].flagged = true;
        }
        flags = L.mines;
      }

      function onLeft(r, c) {
        if (over) return;
        const cell = b[r][c];
        if (cell.flagged) return;
        if (!started) startGame(r, c);
        const cell2 = b[r][c];
        if (cell2.mine) {
          cell2.revealed = true;
          over = true;
          clearInterval(timerInterval);
          statusEl.textContent = "💥 Boom! You hit a mine.";
          statusEl.className = "status lose";
          AudioFX.lose();
          // reveal all mines
          for (let rr = 0; rr < LEVELS[level].rows; rr++) for (let cc = 0; cc < LEVELS[level].cols; cc++) {
            if (b[rr][cc].mine) b[rr][cc].revealed = true;
          }
          render();
          return;
        }
        floodReveal(r, c);
        AudioFX.reveal();
        checkWin();
        render();
      }

      function onFlag(r, c) {
        if (over) return;
        if (!started) return;
        const cell = b[r][c];
        if (cell.revealed) return;
        cell.flagged = !cell.flagged;
        flags += cell.flagged ? 1 : -1;
        AudioFX.click();
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);

      root.querySelectorAll("#mw-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#mw-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.l;
        newGame();
      }));

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast("No hints left", "warning");
          return;
        }
        const L = LEVELS[level];
        if (!started) {
          // Pick any cell to bootstrap the game; that cell is safe by construction.
          const r = Math.floor(Math.random() * L.rows);
          const c = Math.floor(Math.random() * L.cols);
          startGame(r, c);
          hintsUsed++;
          floodReveal(r, c);
          AudioFX.reveal();
          App.toast("Hint: revealed a safe cell", "info");
          checkWin();
          render();
          return;
        }
        const safe = [];
        for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
          if (!b[r][c].revealed && !b[r][c].flagged && !b[r][c].mine) safe.push([r, c]);
        }
        if (safe.length === 0) {
          App.toast("No safe cells left to reveal", "info");
          return;
        }
        const [r, c] = safe[Math.floor(Math.random() * safe.length)];
        hintsUsed++;
        floodReveal(r, c);
        AudioFX.reveal();
        App.toast("Hint: revealed a safe cell", "info");
        checkWin();
        render();
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!started) {
          // Need to bootstrap with a safe cell so build() places mines avoiding it.
          const L = LEVELS[level];
          const r = Math.floor(Math.random() * L.rows);
          const c = Math.floor(Math.random() * L.cols);
          startGame(r, c);
        }
        const L = LEVELS[level];
        // Reveal the entire board: all mines flagged, all safe cells revealed.
        for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
          if (b[r][c].mine) {
            b[r][c].flagged = true;
          } else {
            b[r][c].revealed = true;
          }
        }
        flags = L.mines;
        revealed = total;
        over = true;
        clearInterval(timerInterval);
        statusEl.textContent = "Solution revealed.";
        statusEl.className = "status lose";
        AudioFX.lose();
        render();
      }

      live = {hint: doHint, solve: doSolve};

      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInterval);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Minesweeper",
        `Reveal all the safe cells without detonating any mines.
        <br><br>Numbers tell you how many mines touch that cell. Use logic to deduce where mines are and flag them.
        <br><br><b>Left-click</b> reveals a cell. <b>Right-click</b> flags a suspected mine.
        <br>On touch screens, <b>long-press</b> (350ms) to flag.
        <br>The first click is always safe — it auto-clears a region. Press <b>R</b> for a new game.
        <br><br>Stuck? Use the <b>Hint</b> button (max 3 per game — reveals a random safe cell) or the <b>Solve</b> button (reveals the whole board and ends the game as a loss).
        <br>Best time is tracked per difficulty.`);
    },
  });
})();
