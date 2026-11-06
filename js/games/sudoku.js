/* Sudoku — 9×9 puzzle. Solve by filling each row, column, and 3×3 box with 1–9 */
(function () {
  // Generate a valid Sudoku via backtracking, then carve out cells to make a puzzle
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function valid(g, r, c, n) {
    for (let i = 0; i < 9; i++) {
      if (g[r][i] === n || g[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (g[br + i][bc + j] === n) return false;
    return true;
  }

  function fill(g) {
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (g[r][c] === 0) {
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (valid(g, r, c, n)) {
            g[r][c] = n;
            if (fill(g)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  function makePuzzle(holes) {
    const g = Array.from({length: 9}, () => Array(9).fill(0));
    fill(g);
    const solution = g.map(r => r.slice());
    const cells = [];
    for (let i = 0; i < 81; i++) cells.push(i);
    shuffle(cells);
    for (let i = 0; i < holes; i++) {
      const r = Math.floor(cells[i] / 9), c = cells[i] % 9;
      g[r][c] = 0;
    }
    return {puzzle: g, solution};
  }

  const MAX_HINTS = 3;

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "sudoku",
    name: "Sudoku",
    icon: "🔢",
    category: "logic",
    description: "Fill the 9×9 grid — every row, column & box has 1-9",
    tags: ["puzzle", "logic", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let level = "easy";
      let puzzle, solution, given, user, sel, over, mistakes, startTime, timerInterval;
      let hintsUsed = 0;
      const HOLES = {easy: 38, medium: 48, hard: 56};

      function newGame() {
        const r = makePuzzle(HOLES[level]);
        puzzle = r.puzzle;
        solution = r.solution;
        given = puzzle.map(row => row.map(v => v !== 0));
        user = puzzle.map(row => row.slice());
        sel = null;
        over = false;
        mistakes = 0;
        hintsUsed = 0;
        startTime = Date.now();
        clearInterval(timerInterval);
        timerInterval = setInterval(updateClock, 1000);
        render();
      }

      function updateClock() {
        if (over) return;
        const s = Math.floor((Date.now() - startTime) / 1000);
        root.querySelector("#su-timer").textContent = s + "s";
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="su-diff">
            <button class="diff-btn active" data-l="easy">Easy</button>
            <button class="diff-btn" data-l="medium">Med</button>
            <button class="diff-btn" data-l="hard">Hard</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="su-mistakes">0/3</div></div>
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="su-filled">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="su-timer">0s</div></div>
        </div>
        <div class="status info" id="su-status">Tap a cell, then pick 1–9</div>
        <div class="center"><div class="su-grid" id="su-grid"></div></div>
        <div class="row" id="su-pad" style="justify-content:center;gap:6px;margin-top:12px;"></div>
        <p class="hint">Click a cell, then 1–9 on your keyboard or pad. 0/Backspace to clear. Three mistakes ends the game. Stuck? Use <b>Hint</b> (max 3 per game) or <b>Solve</b> in the header.</p>
      `;

      const gridEl = root.querySelector("#su-grid");
      const padEl = root.querySelector("#su-pad");
      const statusEl = root.querySelector("#su-status");

      function render() {
        gridEl.innerHTML = "";
        let filled = 0;
        for (let r = 0; r < 9; r++) {
          for (let c = 0; c < 9; c++) {
            const cell = document.createElement("div");
            cell.className = "su-cell";
            cell.dataset.row = r;
            cell.dataset.col = c;
            const v = user[r][c];
            if (v) {
              filled++;
              cell.textContent = v;
              if (given[r][c]) cell.classList.add("given");
              else {
                cell.classList.add("user");
                if (v !== solution[r][c]) cell.classList.add("wrong");
              }
            }
            if (sel && sel.r === r && sel.c === c) cell.classList.add("selected");
            else if (sel) {
              if (sel.r === r || sel.c === c || (Math.floor(sel.r / 3) === Math.floor(r / 3) && Math.floor(sel.c / 3) === Math.floor(c / 3))) cell.classList.add("peer");
            }
            cell.addEventListener("click", () => {
              sel = {r, c};
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        // Pad
        padEl.innerHTML = "";
        for (let n = 1; n <= 9; n++) {
          const b = document.createElement("button");
          b.className = "key";
          b.textContent = n;
          b.style.minWidth = "38px";
          b.addEventListener("click", () => place(n));
          padEl.appendChild(b);
        }
        const clr = document.createElement("button");
        clr.className = "key";
        clr.textContent = "⌫";
        clr.style.minWidth = "56px";
        clr.addEventListener("click", () => place(0));
        padEl.appendChild(clr);

        root.querySelector("#su-mistakes").textContent = mistakes + "/3";
        root.querySelector("#su-filled").textContent = filled + "/81";
      }

      function place(n) {
        if (over || !sel) return;
        if (given[sel.r][sel.c]) return;
        user[sel.r][sel.c] = n;
        AudioFX.click();
        if (n !== 0 && n !== solution[sel.r][sel.c]) {
          mistakes++;
          AudioFX.error();
          if (mistakes >= 3) {
            over = true;
            clearInterval(timerInterval);
            statusEl.textContent = "Game over — 3 mistakes. Try a new puzzle.";
            statusEl.className = "status lose";
            AudioFX.lose();
            render();
            return;
          }
        }
        // Check solved
        let solved = true;
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
          if (user[r][c] !== solution[r][c]) {
            solved = false;
            break;
          }
        }
        if (solved) {
          over = true;
          clearInterval(timerInterval);
          const t = Math.floor((Date.now() - startTime) / 1000);
          statusEl.textContent = `🎉 Solved in ${t}s with ${mistakes} mistake${mistakes === 1 ? "" : "s"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const key = "sudoku_" + level;
          const best = Storage.getBest(key);
          if (!best || t < best) {
            Storage.setBest(key, t);
            App.toast("New best for " + level + ": " + t + "s", "success");
          }
        }
        render();
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newGame();
          return;
        }
        if (!sel) return;
        if (e.key >= "1" && e.key <= "9") place(parseInt(e.key, 10));
        else if (e.key === "0" || e.key === "Backspace" || e.key === "Delete") place(0);
        else if (e.key.startsWith("Arrow")) {
          const dr = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
          const dc = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
          if (sel) {
            const nr = Math.max(0, Math.min(8, sel.r + dr));
            const nc = Math.max(0, Math.min(8, sel.c + dc));
            sel = {r: nr, c: nc};
            render();
          }
        }
      }

      document.addEventListener("keydown", onKey);

      root.querySelectorAll("#su-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#su-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.l;
        newGame();
      }));

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!sel) {
          App.toast("Select a cell first", "info");
          return;
        }
        if (given[sel.r][sel.c]) {
          App.toast("That cell is given", "info");
          return;
        }
        if (user[sel.r][sel.c] === solution[sel.r][sel.c]) {
          App.toast("Already correct", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        hintsUsed++;
        const v = solution[sel.r][sel.c];
        user[sel.r][sel.c] = v;
        AudioFX.reveal();
        App.toast(`Hint: this cell is ${v}`, "info");
        // Don't count as a mistake. Check solved.
        let solved = true;
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
          if (user[r][c] !== solution[r][c]) {
            solved = false;
            break;
          }
        }
        if (solved) {
          over = true;
          clearInterval(timerInterval);
          const t = Math.floor((Date.now() - startTime) / 1000);
          statusEl.textContent = `🎉 Solved in ${t}s with ${mistakes} mistake${mistakes === 1 ? "" : "s"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const key = "sudoku_" + level;
          const best = Storage.getBest(key);
          if (!best || t < best) {
            Storage.setBest(key, t);
            App.toast("New best for " + level + ": " + t + "s", "success");
          }
        }
        render();
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        // Fill every empty cell with the solution and end the game as a loss.
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
          user[r][c] = solution[r][c];
        }
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
      App.showModal("How to play Sudoku",
        `Fill every empty cell with a digit 1–9 so that:
        <br>• each row contains 1–9 exactly once
        <br>• each column contains 1–9 exactly once
        <br>• each 3×3 box contains 1–9 exactly once
        <br><br>Click a cell, then press 1–9 (keyboard or pad). Press 0/Backspace to clear. Wrong entries are shown in red. Make 3 mistakes and the game ends.
        <br><br>Stuck? Use the <b>Hint</b> button (max 3 per game — reveals the correct value for the selected cell, doesn't count as a mistake) or <b>Solve</b> (fills the whole grid and ends the game as a loss).
        <br><br>Best solve time is tracked per difficulty.`);
    },
  });
})();
