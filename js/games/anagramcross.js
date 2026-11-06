/* Anagram Crossword — a mini crossword where each clue gives an anagram of the answer. */
(function () {
  // Small crosswords (3-4 words). Each word's clue is its letters scrambled.
  const PUZZLES = [
    {
      size: 5,
      words: [
        {word: "HEART", row: 0, col: 0, dir: "across", clue: "RHEAT"},
        {word: "HAPPY", row: 0, col: 0, dir: "down", clue: "YPHAP"},
      ],
    },
    {
      size: 5,
      words: [
        {word: "PLATE", row: 0, col: 0, dir: "across", clue: "ETLAP"},
        {word: "PEARL", row: 0, col: 0, dir: "down", clue: "LRAEP"},
      ],
    },
    {
      size: 5,
      words: [
        {word: "STONE", row: 0, col: 0, dir: "across", clue: "OSENT"},
        {word: "SHARE", row: 0, col: 0, dir: "down", clue: "HARSE"},
      ],
    },
    {
      size: 5,
      words: [
        {word: "BREAD", row: 0, col: 0, dir: "across", clue: "BARED"},
        {word: "BLOOM", row: 0, col: 0, dir: "down", clue: "LOOMB"},
      ],
    },
    {
      size: 5,
      words: [
        {word: "LIGHT", row: 0, col: 0, dir: "across", clue: "GILTH"},
        {word: "LEMON", row: 0, col: 0, dir: "down", clue: "NELMO"},
      ],
    },
  ];

  let live = null;
  GameRegistry.register({
    id: "anagramcross",
    name: "Anagram Crossword",
    icon: "📖",
    category: "word",
    description: "Mini crossword — each clue is an anagram of the answer",
    tags: ["word", "thinking", "anagram"],
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
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="ac-filled">0 / 0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="ac-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ac-best">—</div></div>
        </div>
        <div class="status info" id="ac-status">Unscramble each clue to fill in the crossword.</div>
        <div class="row" style="justify-content:center;gap:24px;margin:10px 0;flex-wrap:wrap;">
          <div id="ac-clues-across" class="ac-clues"></div>
          <div id="ac-clues-down" class="ac-clues"></div>
        </div>
        <div class="center" style="margin:14px 0;"><div class="ac-grid" id="ac-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ac-clear">Clear</button>
          <button class="btn primary" id="ac-check">Check</button>
        </div>
        <p class="hint">Each clue is a scrambled version of the answer. Unscramble it and fill in the grid. <b>Across</b> words go left to right; <b>down</b> words go top to bottom. Letters at intersections must match.</p>
      `;
      const statusEl = root.querySelector("#ac-status");
      const gridEl = root.querySelector("#ac-grid");
      const acrossEl = root.querySelector("#ac-clues-across");
      const downEl = root.querySelector("#ac-clues-down");
      if (!document.getElementById("ac-style")) {
        const s = document.createElement("style");
        s.id = "ac-style";
        s.textContent = `
          .ac-grid { display: inline-grid; gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .ac-cell { width: 44px; height: 44px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.1rem; cursor: pointer; user-select: none; color: var(--text); position: relative; }
          .ac-cell.black { background: #000; cursor: default; }
          .ac-cell.active { outline: 3px solid var(--accent); }
          .ac-cell.error { color: var(--danger); }
          .ac-cell.correct { color: var(--success); }
          .ac-clues { font-size: 0.85rem; min-width: 200px; }
          .ac-clues h5 { font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; }
          .ac-clues div { padding: 2px 0; }
          .ac-clue-active { color: var(--accent); font-weight: 700; }
        `;
        document.head.appendChild(s);
      }

      function buildGrid() {
        // Build empty grid of size×size, with -1 for black squares
        const g = Array.from({length: puzzle.size}, () => Array(puzzle.size).fill(null));
        const lck = Array.from({length: puzzle.size}, () => Array(puzzle.size).fill(false));
        // Place each word
        puzzle.words.forEach(w => {
          for (let i = 0; i < w.word.length; i++) {
            const r = w.row + (w.dir === "down" ? i : 0);
            const c = w.col + (w.dir === "across" ? i : 0);
            if (g[r][c] === null) g[r][c] = "";
          }
        });
        // Mark cells outside any word as black (-1)
        for (let r = 0; r < puzzle.size; r++) {
          for (let c = 0; c < puzzle.size; c++) {
            if (g[r][c] === null) g[r][c] = -1;
          }
        }
        grid = g;
        locked = lck;
      }

      function errors() {
        const errs = new Set();
        for (const w of puzzle.words) {
          for (let i = 0; i < w.word.length; i++) {
            const r = w.row + (w.dir === "down" ? i : 0);
            const c = w.col + (w.dir === "across" ? i : 0);
            if (grid[r][c] && grid[r][c] !== w.word[i]) {
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
        let totalCells = 0;
        for (let r = 0; r < puzzle.size; r++) {
          for (let c = 0; c < puzzle.size; c++) {
            const cell = document.createElement("div");
            cell.className = "ac-cell";
            if (grid[r][c] === -1) {
              cell.classList.add("black");
              gridEl.appendChild(cell);
              continue;
            }
            totalCells++;
            if (activeCell && activeCell[0] === r && activeCell[1] === c) cell.classList.add("active");
            const v = grid[r][c];
            if (v) {
              cell.textContent = v;
              filled++;
              if (errs.has(`${r},${c}`)) cell.classList.add("error");
              else cell.classList.add("correct");
            }
            cell.addEventListener("click", () => {
              activeCell = (activeCell && activeCell[0] === r && activeCell[1] === c) ? null : [r, c];
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#ac-filled").textContent = `${filled} / ${totalCells}`;
        root.querySelector("#ac-errors").textContent = errs.size;
      }

      function renderClues() {
        acrossEl.innerHTML = "<h5>Across</h5>";
        downEl.innerHTML = "<h5>Down</h5>";
        puzzle.words.forEach((w, i) => {
          const el = document.createElement("div");
          el.textContent = `${i + 1}. ${w.clue} (${w.word.length} letters)`;
          if (w.dir === "across") acrossEl.appendChild(el);
          else downEl.appendChild(el);
        });
      }

      function onKey(e) {
        if (over || !activeCell) return;
        const [r, c] = activeCell;
        if (grid[r][c] === -1) return;
        if (e.key === "Backspace" || e.key === "Delete") {
          grid[r][c] = "";
          AudioFX.click();
          render();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) {
          grid[r][c] = e.key.toUpperCase();
          AudioFX.pop();
          // advance in direction of the active word (find which word contains this cell)
          const w = puzzle.words.find(w => {
            for (let i = 0; i < w.word.length; i++) {
              const rr = w.row + (w.dir === "down" ? i : 0);
              const cc = w.col + (w.dir === "across" ? i : 0);
              if (rr === r && cc === c) return true;
            }
            return false;
          });
          if (w) {
            const idx = w.dir === "down" ? r - w.row : c - w.col;
            if (idx + 1 < w.word.length) {
              activeCell = [w.row + (w.dir === "down" ? idx + 1 : 0), w.col + (w.dir === "across" ? idx + 1 : 0)];
            }
          }
          render();
          checkAuto();
        }
      }

      document.addEventListener("keydown", onKey);

      function checkAuto() {
        const allFilled = puzzle.words.every(w => {
          for (let i = 0; i < w.word.length; i++) {
            const r = w.row + (w.dir === "down" ? i : 0);
            const c = w.col + (w.dir === "across" ? i : 0);
            if (!grid[r][c]) return false;
          }
          return true;
        });
        if (!allFilled) return;
        if (errors().size === 0) {
          over = true;
          AudioFX.win();
          statusEl.textContent = "🎉 Solved!";
          statusEl.className = "status win";
          const best = Storage.getBest("anagramcross");
          if (!best || 100 > best) {
            Storage.setBest("anagramcross", 100);
            root.querySelector("#ac-best").textContent = 100;
          }
        }
      }

      function check() {
        const allFilled = puzzle.words.every(w => {
          for (let i = 0; i < w.word.length; i++) {
            const r = w.row + (w.dir === "down" ? i : 0);
            const c = w.col + (w.dir === "across" ? i : 0);
            if (!grid[r][c]) return false;
          }
          return true;
        });
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

      root.querySelector("#ac-check").addEventListener("click", check);
      root.querySelector("#ac-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < puzzle.size; r++) for (let c = 0; c < puzzle.size; c++) {
          if (grid[r][c] !== -1 && !locked[r][c]) grid[r][c] = "";
        }
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        buildGrid();
        activeCell = null;
        over = false;
        const best = Storage.getBest("anagramcross");
        root.querySelector("#ac-best").textContent = best || "—";
        statusEl.textContent = "Unscramble each clue to fill in the crossword.";
        statusEl.className = "status info";
        renderClues();
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          puzzle.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
              const r = w.row + (w.dir === "down" ? i : 0);
              const c = w.col + (w.dir === "across" ? i : 0);
              grid[r][c] = w.word[i];
            }
          });
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
    help: function () {
      App.showModal("How to play Anagram Crossword",
        `A tiny crossword where each <b>clue is an anagram</b> (scrambled letters) of the answer.
        <br><br>For example, clue "RHEAT" → answer "HEART".
        <br><br>Click a white cell, then type letters. <b>Arrow keys</b> not used — after typing a letter, the cursor auto-advances along the word. <b>Backspace</b> clears.
        <br><br>Black cells are not part of any word. Letters at intersections belong to both an across word and a down word.`);
    },
  });
})();
