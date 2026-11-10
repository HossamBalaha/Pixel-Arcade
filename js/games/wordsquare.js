/* Word Square — fill a 3×3 or 4×4 grid so the words read the same across and down. */
(function () {
  // Pre-baked word squares (each row is a word; columns form the same words).
  const SQUARES = [
    {size: 3, words: ["CAT", "ARE", "TEA"], clue: "Three 3-letter words"},
    {size: 3, words: ["DOG", "ORE", "GED"], clue: "Pet + mineral + name"},
    {size: 3, words: ["BEE", "EEL", "EYE"], clue: "Insect + fish + body part"},
    {size: 3, words: ["WAR", "ARC", "RED"], clue: "Conflict + curve + color"},
    {size: 3, words: ["SPA", "PAD", "HAD"], clue: "Retreat + cushion + past tense"},
    {size: 4, words: ["HEAR", "EARS", "AREA", "RASH"], clue: "Listen / plural body part / region / skin outbreak"},
    {size: 4, words: ["COST", "ORES", "SEAT", "TEST"], clue: "Price / minerals / chair / exam"},
    {size: 4, words: ["SHIP", "HARE", "IRON", "PEON"], clue: "Vessel / rabbit / metal / worker"},
    {size: 4, words: ["WALL", "ALSO", "LOST", "LOOK"], clue: "Barrier / additionally / misplaced / gaze"},
    {size: 4, words: ["PATH", "AREA", "TREE", "READ"], clue: "Trail / region / oak / book"},
  ];

  let live = null;
  GameRegistry.register({
    id: "wordsquare",
    name: "Word Square",
    icon: "🔳",
    category: "word",
    description: "Fill the grid so each row & column spells a word",
    tags: ["word", "thinking"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, grid = null, locked = null, over = false;
      let activeCell = null;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="ws-filled">0 / 0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="ws-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ws-best">—</div></div>
        </div>
        <div class="status info" id="ws-status">Click a cell, then type a letter. Rows and columns must each spell a word.</div>
        <div class="text-muted text-sm center" id="ws-clue" style="margin:8px 0;"></div>
        <div class="center" style="margin:14px 0;"><div class="ws-grid" id="ws-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ws-clear">Clear</button>
          <button class="btn primary" id="ws-check">Check</button>
        </div>
        <p class="hint">Each <b>row</b> spells a word (left to right). Each <b>column</b> spells a word (top to bottom). They share letters at intersections. Pre-filled letters are locked.</p>
      `;
      const statusEl = root.querySelector("#ws-status");
      const clueEl = root.querySelector("#ws-clue");
      const gridEl = root.querySelector("#ws-grid");
      if (!document.getElementById("ws-style")) {
        const s = document.createElement("style");
        s.id = "ws-style";
        s.textContent = `
          .ws-grid { display: inline-grid; gap: 3px; background: var(--border); padding: 6px; border-radius: var(--radius); }
          .ws-cell { width: 56px; height: 56px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.4rem; cursor: pointer; user-select: none; color: var(--text); }
          .ws-cell.locked { background: var(--bg-soft); cursor: default; color: var(--text); }
          .ws-cell.active { outline: 3px solid var(--accent); }
          .ws-cell.error { color: var(--danger); }
          .ws-cell.correct { color: var(--success); }
        `;
        document.head.appendChild(s);
      }

      function errors() {
        const errs = new Set();
        // A cell is "wrong" if it conflicts with the solution
        for (let r = 0; r < puzzle.size; r++) {
          for (let c = 0; c < puzzle.size; c++) {
            if (grid[r][c] && grid[r][c] !== puzzle.words[r][c]) {
              if (!locked[r][c]) errs.add(`${r},${c}`);
            }
          }
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        let filled = 0;
        for (let r = 0; r < puzzle.size; r++) {
          for (let c = 0; c < puzzle.size; c++) {
            const cell = document.createElement("div");
            cell.className = "ws-cell";
            if (locked[r][c]) cell.classList.add("locked");
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            const v = grid[r][c];
            if (v) {
              cell.textContent = v;
              filled++;
              if (locked[r][c]) cell.classList.add("correct");
              else if (errs.has(`${r},${c}`)) cell.classList.add("error");
            }
            if (!locked[r][c]) {
              cell.addEventListener("click", () => {
                activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
                AudioFX.tick();
                render();
              });
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#ws-filled").textContent = `${filled} / ${puzzle.size * puzzle.size}`;
        root.querySelector("#ws-errors").textContent = errs.size;
      }

      function onKey(e) {
        if (over || !activeCell) return;
        if (e.key === "Backspace" || e.key === "Delete") {
          grid[activeCell[0]][activeCell[1]] = null;
          AudioFX.click();
          render();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) {
          grid[activeCell[0]][activeCell[1]] = e.key.toUpperCase();
          AudioFX.pop();
          // advance to next empty unlocked cell
          const [r0, c0] = activeCell;
          let found = null;
          outer: for (let i = r0 * puzzle.size + c0 + 1; i < puzzle.size * puzzle.size; i++) {
            const rr = Math.floor(i / puzzle.size), cc = i % puzzle.size;
            if (!locked[rr][cc]) {
              found = [rr, cc];
              break outer;
            }
          }
          activeCell = found;
          render();
          checkAuto();
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = grid.every(r => r.every(v => v));
        if (!allFilled) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("wordsquare");
          if (!best || 100 > best) {
            Storage.setBest("wordsquare", 100);
            root.querySelector("#ws-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = grid.every(r => r.every(v => v));
        if (!allFilled) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first";
          statusEl.className = "status lose";
          return;
        }
        if (errors().size === 0) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = "Some letters are wrong";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#ws-check").addEventListener("click", check);
      root.querySelector("#ws-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) if (!locked[r][c]) grid[r][c] = null;
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(SQUARES[Math.floor(Math.random() * SQUARES.length)]));
        grid = puzzle.words.map(r => r.split("").map(c => c));
        locked = Array.from({length: puzzle.size}, () => Array(puzzle.size).fill(false));
        // Lock ~30% of cells as hints
        const cells = [];
        for (let r = 0; r < puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) cells.push([r, c]);
        for (let i = cells.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [cells[i], cells[j]] = [cells[j], cells[i]];
        }
        const lockCount = Math.floor(cells.length * 0.3);
        cells.slice(0, lockCount).forEach(([r, c]) => {
          locked[r][c] = true;
        });
        cells.slice(lockCount).forEach(([r, c]) => {
          grid[r][c] = null;
        });
        activeCell = null;
        over = false;
        clueEl.textContent = "Clue: " + puzzle.clue;
        const best = Storage.getBest("wordsquare");
        root.querySelector("#ws-best").textContent = best || "—";
        statusEl.textContent = "Click a cell, then type a letter. Rows and columns must each spell a word.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over) return;
          const cands = [];
          for (let r = 0; r < puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) {
            if (!locked[r][c] && grid[r][c] !== puzzle.words[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          const [r, c] = cands[Math.floor(Math.random() * cands.length)];
          const ch = puzzle.words[r][c];
          grid[r][c] = ch;
          AudioFX.reveal();
          render();
          App.toast(`💡 Row ${r + 1}, letter ${c + 1} is "${ch}"`, "info");
          checkAuto();
        },
        solve: function () {
          if (over) return;
          grid = puzzle.words.map(r => r.split(""));
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
      App.showModal("How to play Word Square",
        `Fill the grid with letters so that <b>every row</b> (read left to right) and <b>every column</b> (read top to bottom) spells a real word.
        <br><br>The trick: cells at intersections belong to both a row word and a column word, so they must satisfy both.
        <br><br>Click a cell to activate it, then type a letter. <b>Backspace</b> clears.`);
    },
  });
})();
