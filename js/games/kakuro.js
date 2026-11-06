/* Kakuro Mini — 4x4 kakuro-style with sum clues. Hint reveals one cell. Solve completes. */
(function () {
  // 4x4 kakuro mini: pre-generated puzzles with row/column sum clues.
  // We use a known 4x4 layout: empty top-left cells, clues on top/left.
  // Each row's cells must sum to the row clue (rightmost); each column's cells to col clue (bottom).
  // Cells use digits 1-9, no repeats within a row or column segment.
  let live = null;

  function genPuzzle() {
    // Build a solvable 4x4 with row/col sums.
    // Choose random grid 1-9 no repeats in row/col, compute sums, then blank out 4-6 cells.
    while (true) {
      const g = Array.from({length: 4}, () => Array(4).fill(0));

      function place(r, c) {
        if (r >= 4) return true;
        const nr = c + 1 < 4 ? r : r + 1;
        const nc = c + 1 < 4 ? c + 1 : 0;
        for (let v = 1; v <= 9; v++) {
          let ok = true;
          for (let k = 0; k < 4; k++) if (g[r][k] === v || g[k][c] === v) {
            ok = false;
            break;
          }
          if (!ok) continue;
          g[r][c] = v;
          if (place(nr, nc)) return true;
          g[r][c] = 0;
        }
        return false;
      }

      if (!place(0, 0)) continue;
      // Row sums and col sums
      const rowSums = g.map(r => r.reduce((a, b) => a + b, 0));
      const colSums = [0, 1, 2, 3].map(c => g.reduce((s, r) => s + r[c], 0));
      // Blank cells: ~4-6
      const blanks = [];
      const cells = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) cells.push([r, c]);
      cells.sort(() => Math.random() - 0.5);
      const nb = 4 + Math.floor(Math.random() * 3);
      for (let i = 0; i < nb; i++) blanks.push(cells[i]);
      const blankSet = new Set(blanks.map(([r, c]) => r * 4 + c));
      return {solution: g.map(r => r.slice()), blanks: blankSet, rowSums, colSums};
    }
  }

  GameRegistry.register({
    id: "kakuro",
    name: "Kakuro Mini",
    icon: "➕",
    category: "logic",
    description: "4×4 kakuro — fill cells so rows and columns sum to the clues",
    tags: ["puzzle", "math", "logic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz, user, sel, mistakes, time, timerInt, over;
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
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="kk-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="kk-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="kk-best">-</div></div>
        </div>
        <div class="status info" id="kk-status">Fill blank cells so each row & column matches its sum</div>
        <div class="center"><div id="kk-grid" style="display:grid;grid-template-columns:50px repeat(4,60px);grid-template-rows:50px repeat(4,60px);gap:2px;background:var(--border-strong);padding:2px;border-radius:var(--radius-sm);"></div></div>
        <div class="row" style="justify-content:center;gap:6px;margin-top:8px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="btn" data-d="${d}" style="min-width:36px;padding:6px 8px;">${d}</button>`).join("")}
          <button class="btn" id="kk-erase" style="min-width:36px;padding:6px 8px;">⌫</button>
        </div>
        <p class="hint">Click a blank cell then a digit. <b>R</b> new puzzle. No repeats in any row/col.</p>
      `;
      const gridEl = root.querySelector("#kk-grid");
      const statusEl = root.querySelector("#kk-status");
      root.querySelector("#kk-best").textContent = Storage.getBest("kakuro") ?? "-";

      function newGame() {
        puz = genPuzzle();
        user = Array.from({length: 4}, () => Array(4).fill(0));
        // Fill in the non-blank cells from solution
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!puz.blanks.has(r * 4 + c)) user[r][c] = puz.solution[r][c];
        sel = null;
        mistakes = 0;
        time = 0;
        over = false;
        clearInterval(timerInt);
        timerInt = setInterval(() => {
          if (!alive) return;
          if (!alive) return clearInterval(timerInt);
          time++;
          root.querySelector("#kk-t").textContent = time + "s";
        }, 1000);
        statusEl.textContent = "Fill blank cells so each row & column matches its sum";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        // top-left corner + col clue cells
        const corner = document.createElement("div");
        corner.style.background = "var(--bg-soft)";
        gridEl.appendChild(corner);
        for (let c = 0; c < 4; c++) {
          const el = document.createElement("div");
          el.style.background = "var(--accent-soft)";
          el.style.color = "var(--accent)";
          el.style.display = "grid";
          el.style.placeItems = "center";
          el.style.fontWeight = "700";
          el.style.fontSize = "1.2rem";
          el.textContent = puz.colSums[c];
          gridEl.appendChild(el);
        }
        for (let r = 0; r < 4; r++) {
          // row clue
          const el = document.createElement("div");
          el.style.background = "var(--accent-soft)";
          el.style.color = "var(--accent)";
          el.style.display = "grid";
          el.style.placeItems = "center";
          el.style.fontWeight = "700";
          el.style.fontSize = "1.2rem";
          el.textContent = puz.rowSums[r];
          gridEl.appendChild(el);
          for (let c = 0; c < 4; c++) {
            const cell = document.createElement("div");
            cell.style.background = "var(--bg-elev)";
            cell.style.display = "grid";
            cell.style.placeItems = "center";
            cell.style.fontFamily = "var(--font-mono)";
            cell.style.fontWeight = "700";
            cell.style.fontSize = "1.3rem";
            cell.dataset.r = r;
            cell.dataset.c = c;
            const isBlank = puz.blanks.has(r * 4 + c);
            const v = user[r][c];
            if (v) {
              cell.textContent = v;
              if (!isBlank) cell.style.color = "var(--text)";
              else cell.style.color = (v === puz.solution[r][c]) ? "var(--accent)" : "var(--danger)";
            } else if (isBlank) cell.style.cursor = "pointer";
            if (isBlank && sel && sel[0] === r && sel[1] === c) cell.style.background = "var(--accent-soft)";
            if (!isBlank) cell.style.background = "var(--bg-soft)";
            if (isBlank) cell.addEventListener("click", () => {
              sel = [r, c];
              AudioFX.click();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#kk-m").textContent = mistakes;
      }

      function place(d) {
        if (over) return;
        if (!sel) {
          AudioFX.error();
          return;
        }
        const [r, c] = sel;
        if (!puz.blanks.has(r * 4 + c)) {
          AudioFX.error();
          return;
        }
        user[r][c] = d;
        if (d !== puz.solution[r][c]) {
          mistakes++;
          AudioFX.error();
        } else AudioFX.place();
        if (checkSolved()) {
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Solved in ${time}s with ${mistakes} mistakes!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("kakuro");
          if (best === null || (mistakes === 0 && time < best)) {
            Storage.setBest("kakuro", time);
            App.toast("New best: " + time + "s", "success");
            root.querySelector("#kk-best").textContent = time;
          }
        }
        render();
      }

      function checkSolved() {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (user[r][c] !== puz.solution[r][c]) return false;
        return true;
      }

      root.querySelectorAll("[data-d]").forEach(btn => btn.addEventListener("click", () => place(+btn.dataset.d)));
      root.querySelector("#kk-erase").addEventListener("click", () => {
        if (!sel) return;
        const [r, c] = sel;
        if (!puz.blanks.has(r * 4 + c)) return;
        user[r][c] = 0;
        AudioFX.click();
        render();
      });

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          newGame();
          return;
        }
        if (sel && /^[1-9]$/.test(e.key)) place(+e.key);
        if (sel && (e.key === "Backspace" || e.key === "Delete" || e.key === "0")) {
          const [r, c] = sel;
          if (!puz.blanks.has(r * 4 + c)) return;
          user[r][c] = 0;
          render();
        }
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (over) return;
        // Find first blank cell
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          if (puz.blanks.has(r * 4 + c) && user[r][c] !== puz.solution[r][c]) {
            sel = [r, c];
            place(puz.solution[r][c]);
            return;
          }
        }
      }

      function doSolve() {
        let order = [];
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          if (puz.blanks.has(r * 4 + c) && user[r][c] !== puz.solution[r][c]) order.push([r, c]);
        }
        let i = 0;
        const step = () => {
          if (i >= order.length) {
            over = true;
            clearInterval(timerInt);
            statusEl.textContent = `Solved! Time: ${time}s`;
            statusEl.className = "status win";
            AudioFX.win();
            return;
          }
          const [r, c] = order[i];
          i++;
          user[r][c] = puz.solution[r][c];
          AudioFX.tick();
          render();
          later(step, 150);
        };
        step();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
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
      App.showModal("How to play Kakuro Mini",
        `Fill the blank cells with digits 1–9 so that:
        <br>• Each row's digits sum to the clue shown on its left.
        <br>• Each column's digits sum to the clue shown above it.
        <br>• No digit repeats in any row or column.
        <br><br>Click a blank cell, then a digit. Backspace clears. <b>Hint</b> reveals one cell. <b>Solve</b> animates the solution.`);
    },
  });
})();
