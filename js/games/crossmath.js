/* Cross Math — a mini crossword where answers are numbers (from clues). */
(function () {
  // 3×3 mini grid where the across/down answers share digits at intersections.
  const PUZZLES = [
    {
      grid: [
        [{v: 1, clue: "2 − 1"}, {v: 2, clue: "1 + 1"}, {v: 3, clue: "1 + 2"}],
        [{v: 4, clue: "2 × 2"}, {v: 5, clue: "2 + 3"}, {v: 6, clue: "2 × 3"}],
        [{v: 7, clue: "3 + 4"}, {v: 8, clue: "2 × 4"}, {v: 9, clue: "3 × 3"}],
      ],
    },
    {
      grid: [
        [{v: 5, clue: "10 / 2"}, {v: 0, clue: "5 − 5"}, {v: 5, clue: "25 / 5"}],
        [{v: 1, clue: "5 − 4"}, {v: 2, clue: "1 + 1"}, {v: 3, clue: "6 / 2"}],
        [{v: 9, clue: "27 / 3"}, {v: 4, clue: "12 / 3"}, {v: 9, clue: "3 × 3"}],
      ],
    },
  ];
  const N = 3;

  let live = null;
  GameRegistry.register({
    id: "crossmath",
    name: "Cross Math",
    icon: "➗",
    category: "logic",
    description: "Mini crossword with math-clued number answers",
    tags: ["math", "logic", "thinking"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, over = false;
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="cm-filled">0 / 9</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="cm-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cm-best">—</div></div>
        </div>
        <div class="status info" id="cm-status">Click a cell, then type a digit (0-9). Each clue gives the answer.</div>
        <div class="center" style="margin:14px 0;"><div class="cm-grid" id="cm-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="cm-clear">Clear</button>
          <button class="btn primary" id="cm-check">Check</button>
        </div>
        <p class="hint">Each cell has a math clue. Solve the clue to get the digit. Click a cell and type 0-9. <b>Backspace</b> clears.</p>
      `;
      const statusEl = root.querySelector("#cm-status");
      const gridEl = root.querySelector("#cm-grid");
      if (!document.getElementById("cm-style")) {
        const s = document.createElement("style");
        s.id = "cm-style";
        s.textContent = `
          .cm-grid { display: inline-grid; grid-template-columns: repeat(${N}, 80px); gap: 4px; background: var(--border); padding: 6px; border-radius: var(--radius); }
          .cm-cell { width: 80px; height: 80px; background: var(--bg-elev); border-radius: var(--radius-sm); position: relative; display: grid; place-items: center; cursor: pointer; user-select: none; }
          .cm-cell.active { outline: 3px solid var(--accent); }
          .cm-cell.error { color: var(--danger); }
          .cm-cell.correct { color: var(--success); }
          .cm-clue { position: absolute; top: 2px; left: 4px; font-size: 0.6rem; color: var(--text-muted); font-family: var(--font-mono); }
          .cm-val { font-size: 1.6rem; font-weight: 700; font-family: var(--font-mono); color: var(--text); }
        `;
        document.head.appendChild(s);
      }

      function errors() {
        const errs = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (grid[r][c] !== null && grid[r][c] !== puzzle.grid[r][c].v) errs.add(`${r},${c}`);
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        let filled = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "cm-cell";
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            const v = grid[r][c];
            if (v !== null) {
              filled++;
              if (errs.has(`${r},${c}`)) cell.classList.add("error");
              else cell.classList.add("correct");
            }
            cell.innerHTML = `<span class="cm-clue">${puzzle.grid[r][c].clue}</span><span class="cm-val">${v !== null ? v : ""}</span>`;
            cell.addEventListener("click", () => {
              activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#cm-filled").textContent = `${filled} / 9`;
        root.querySelector("#cm-errors").textContent = errs.size;
      }

      function onKey(e) {
        if (over || !activeCell) return;
        if (e.key === "Backspace" || e.key === "Delete") {
          grid[activeCell[0]][activeCell[1]] = null;
          AudioFX.click();
          render();
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          grid[activeCell[0]][activeCell[1]] = parseInt(e.key, 10);
          AudioFX.pop();
          // advance
          let [r, c] = activeCell;
          let found = null;
          for (let i = r * N + c + 1; i < N * N; i++) {
            const rr = Math.floor(i / N), cc = i % N;
            found = [rr, cc];
            break;
          }
          activeCell = found;
          render();
          checkAuto();
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("crossmath");
          if (!best || 100 > best) {
            Storage.setBest("crossmath", 100);
            root.querySelector("#cm-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v !== null));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        if (errors().size === 0) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Some digits are wrong";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#cm-check").addEventListener("click", check);
      root.querySelector("#cm-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: N}, () => Array(N).fill(null));
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        grid = Array.from({length: N}, () => Array(N).fill(null));
        activeCell = null;
        over = false;
        const best = Storage.getBest("crossmath");
        root.querySelector("#cm-best").textContent = best || "—";
        statusEl.textContent = "Click a cell, then type a digit (0-9). Each clue gives the answer.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < grid.length; r++) for (let c = 0; c < grid.length; c++) {
            if (grid[r][c] !== puzzle.grid[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Everything is correct so far 💡", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          grid[pick[0]][pick[1]] = puzzle.grid[pick[0]][pick[1]].v;
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${pick[0] + 1}, column ${pick[1] + 1} revealed`, "info");
        },
        solve: function () {
          if (over) return;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = puzzle.grid[r][c].v;
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Cross Math",
        `Each cell in the 3×3 grid shows a small math clue in the corner.
        <br><br>Solve the clue (e.g. "2 + 3") to get the answer (5). Click the cell, then type the digit on your keyboard.
        <br><br>Fill every cell correctly to win. <b>Backspace</b> clears the active cell.`);
    },
  });
})();
