/* Connect 3 — faster variant of Connect 4. Connect 3 in a row on a 4×4 board. */
(function () {
  const ROWS = 4, COLS = 4, WIN = 3;
  const HUMAN = "R", AI = "Y";
  let live = null;

  function checkWin(b) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!b[r][c]) continue;
      const v = b[r][c];
      // Horizontal
      if (c + WIN <= COLS && Array.from({length: WIN}, (_, k) => b[r][c + k]).every(x => x === v)) return v;
      // Vertical
      if (r + WIN <= ROWS && Array.from({length: WIN}, (_, k) => b[r + k][c]).every(x => x === v)) return v;
      // Diagonal down-right
      if (r + WIN <= ROWS && c + WIN <= COLS && Array.from({length: WIN}, (_, k) => b[r + k][c + k]).every(x => x === v)) return v;
      // Diagonal down-left
      if (r + WIN <= ROWS && c - WIN + 1 >= 0 && Array.from({length: WIN}, (_, k) => b[r + k][c - k]).every(x => x === v)) return v;
    }
    if (b.every(row => row.every(x => x))) return "draw";
    return null;
  }

  function dropCol(b, col, player) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!b[r][col]) {
        b[r][col] = player;
        return r;
      }
    }
    return -1;
  }

  function aiMove(b) {
    // 1. Win if possible
    for (let c = 0; c < COLS; c++) {
      const test = b.map(r => r.slice());
      if (dropCol(test, c, AI) >= 0 && checkWin(test) === AI) return c;
    }
    // 2. Block human win
    for (let c = 0; c < COLS; c++) {
      const test = b.map(r => r.slice());
      if (dropCol(test, c, HUMAN) >= 0 && checkWin(test) === HUMAN) return c;
    }
    // 3. Prefer center columns
    const order = [1, 2, 0, 3];
    for (const c of order) {
      if (b[0][c]) continue;
      return c;
    }
    return -1;
  }

  GameRegistry.register({
    id: "connect3",
    name: "Connect 3",
    icon: "🔴",
    category: "strategy",
    description: "Connect 3 in a row on a 4×4 board — fast variant of Connect 4",
    tags: ["connect", "strategy", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, current, over, aiTimer;
      let scores = {R: 0, Y: 0, draw: 0};

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You (R)</div><div class="val" id="c3-r">0</div></div>
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="c3-d">0</div></div>
          <div class="score-cell"><div class="label">AI (Y)</div><div class="val" id="c3-y">0</div></div>
        </div>
        <div class="status info" id="c3-status">Click a column to drop your red disc. Get 3 in a row!</div>
        <div class="center"><div id="c3-board" style="display:grid;grid-template-columns:repeat(4,60px);grid-template-rows:repeat(4,60px);gap:4px;background:var(--border);padding:4px;border-radius:var(--radius);"></div></div>
        <p class="hint">First to <b>3 in a row</b> (horizontal, vertical, or diagonal) wins. <b>R</b> = new game.</p>
      `;
      const boardEl = root.querySelector("#c3-board");
      const statusEl = root.querySelector("#c3-status");

      function newGame() {
        b = Array.from({length: ROWS}, () => Array(COLS).fill(null));
        current = HUMAN;
        over = false;
        statusEl.textContent = "Click a column to drop your red disc. Get 3 in a row!";
        statusEl.className = "status info";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const cell = document.createElement("div");
          cell.style.cssText = "background:var(--bg-elev);display:grid;place-items:center;cursor:pointer;";
          const v = b[r][c];
          if (v) {
            const dot = document.createElement("div");
            dot.style.cssText = `width:46px;height:46px;border-radius:50%;background:${v === HUMAN ? "var(--danger)" : "var(--warning)"};`;
            cell.appendChild(dot);
          }
          cell.addEventListener("click", () => onCol(c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#c3-r").textContent = scores.R;
        root.querySelector("#c3-y").textContent = scores.Y;
        root.querySelector("#c3-d").textContent = scores.draw;
      }

      function onCol(c) {
        if (over || current !== HUMAN) return;
        const r = dropCol(b, c, HUMAN);
        if (r < 0) {
          AudioFX.error();
          return;
        }
        AudioFX.place();
        if (check()) {
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
          const col = aiMove(b);
          if (col >= 0) dropCol(b, col, AI);
          AudioFX.pop();
          if (!check()) {
            current = HUMAN;
            statusEl.textContent = "Your turn (R)";
            statusEl.className = "status info";
          }
          render();
        }, 450);
      }

      function check() {
        const w = checkWin(b);
        if (!w) return false;
        over = true;
        if (w === "draw") {
          scores.draw++;
          statusEl.textContent = "It's a draw!";
          statusEl.className = "status info";
          AudioFX.lose();
        } else if (w === HUMAN) {
          scores.R++;
          statusEl.textContent = "🎉 You win!";
          statusEl.className = "status win";
          AudioFX.win();
          const best = (Storage.getBest("connect3") || 0) + 1;
          Storage.setBest("connect3", best);
        } else {
          scores.Y++;
          statusEl.textContent = "💀 AI wins!";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        return true;
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
      App.showModal("How to play Connect 3",
        `Drop discs into columns — they fall to the lowest empty slot.
        <br><br>First to get <b>3 in a row</b> (horizontally, vertically, or diagonally) wins.
        <br><br>You play <b style="color:var(--danger)">Red</b>, the AI plays <b style="color:var(--warning)">Yellow</b>. Smaller 4×4 board makes for quick games.`);
    },
  });
})();
