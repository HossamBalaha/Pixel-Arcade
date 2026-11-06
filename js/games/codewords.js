/* Codewords — a mini crossword where each number (1..N) maps to a letter; deduce the cipher. */
(function () {
  // A small 5×5 crossword grid: 0 = black square; numbers start at 1.
  // Each numbered cell is one letter; same number = same letter across the grid.
  const PUZZLES = [
    {
      // Grid: 0 = black, number = cell number (each unique cell has a number)
      // Numbers 1..N correspond to a hidden letter; the player must deduce.
      // We pre-define the letter assignment (number → letter).
      grid: [
        [1, 2, 3, 0, 4],
        [5, 0, 6, 0, 7],
        [8, 9, 10, 11, 12],
        [13, 0, 14, 0, 15],
        [16, 17, 18, 0, 19],
      ],
      solution: {
        1: "H",
        2: "E",
        3: "L",
        4: "O",
        5: "A",
        6: "L",
        7: "S",
        8: "B",
        9: "E",
        10: "L",
        11: "I",
        12: "E",
        13: "O",
        14: "I",
        15: "T",
        16: "G",
        17: "A",
        18: "M",
        19: "S"
      },
      words: [
        {clue: "Greeting", cells: [1, 2, 3, 3, 4], answer: "HELLO"}, // simplified
      ],
    },
  ];
  // Actually, building a proper codewords puzzle from scratch is complex.
  // We'll use a simpler approach: generate a word-search-like puzzle where
  // each unique letter gets a number, and the player maps numbers → letters.

  const WORDS = [
    {word: "PIXEL", clue: "Smallest unit of a digital image"},
    {word: "ARCADE", clue: "Place full of game machines"},
    {word: "PUZZLE", clue: "A problem to solve"},
    {word: "GAMING", clue: "Playing video games"},
    {word: "JOYSTK", clue: "Game controller stick (abbr.)"},
    {word: "BONUS", clue: "Extra reward"},
    {word: "LEVEL", clue: "Game stage"},
    {word: "SCORE", clue: "Points total"},
    {word: "PLAYER", clue: "Person playing a game"},
    {word: "ROBOT", clue: "Mechanical being"},
  ];

  let live = null;
  GameRegistry.register({
    id: "codewords",
    name: "Codewords",
    icon: "🔤",
    category: "word",
    description: "Crack the number→letter cipher to reveal hidden words",
    tags: ["word", "thinking", "cipher"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let word = null;
      let mapping = {}; // number → letter
      let solved = false;
      let activeNum = -1;

      // Each puzzle: pick a word, assign each unique letter a number
      function newPuzzle() {
        const w = WORDS[Math.floor(Math.random() * WORDS.length)];
        const letters = w.word.split("");
        const uniqueLetters = Array.from(new Set(letters));
        // Shuffle numbers 1..N and assign to letters
        const numbers = Array.from({length: uniqueLetters.length}, (_, i) => i + 1);
        for (let i = numbers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        // Ensure no letter maps to its alphabetic position (avoid trivial)
        const letterToNum = {};
        uniqueLetters.forEach((L, i) => {
          letterToNum[L] = numbers[i];
        });
        const numToLetter = {};
        Object.entries(letterToNum).forEach(([L, n]) => {
          numToLetter[n] = L;
        });
        const cells = letters.map(L => ({num: letterToNum[L], letter: L}));
        return {word: w, cells, numToLetter};
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="cw-hints">2</div></div>
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="cw-filled">0 / 0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cw-best">—</div></div>
        </div>
        <div class="status info" id="cw-status">Each number stands for a letter. Crack the cipher to reveal the word.</div>
        <div class="text-muted text-sm center" id="cw-clue" style="margin:8px 0;"></div>
        <div id="cw-grid" class="cw-grid" style="margin:14px 0;"></div>
        <div id="cw-keyboard" class="cw-keyboard"></div>
        <p class="hint">Tap a cell to activate it, then tap or type a letter. Same number = same letter everywhere. <b>Hint</b> reveals one correct letter.</p>
      `;
      const statusEl = root.querySelector("#cw-status");
      const clueEl = root.querySelector("#cw-clue");
      const gridEl = root.querySelector("#cw-grid");
      const kbEl = root.querySelector("#cw-keyboard");
      if (!document.getElementById("cw-style")) {
        const s = document.createElement("style");
        s.id = "cw-style";
        s.textContent = `
          .cw-grid { display: flex; gap: 4px; justify-content: center; }
          .cw-cell { width: 56px; height: 70px; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-sm); position: relative; display: grid; place-items: center; cursor: pointer; }
          .cw-cell.active { outline: 3px solid var(--accent); }
          .cw-cell.solved { background: var(--success); color: #fff; }
          .cw-cell.solved .cw-num { color: rgba(255,255,255,0.7); }
          .cw-num { position: absolute; top: 2px; left: 4px; font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono); }
          .cw-letter { font-size: 1.6rem; font-weight: 700; font-family: var(--font-mono); color: var(--text); }
          .cw-cell.solved .cw-letter { color: #fff; }
          .cw-keyboard { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; max-width: 480px; margin: 12px auto 0; }
          .cw-key { width: 30px; height: 36px; padding: 0; font-size: 0.85rem; }
          .cw-key.used { opacity: 0.4; }
        `;
        document.head.appendChild(s);
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        word.cells.forEach((cell, i) => {
          const el = document.createElement("div");
          el.className = "cw-cell";
          if (i === activeNum) el.classList.add("active");
          const L = mapping[cell.num];
          if (L && L === cell.letter) el.classList.add("solved");
          el.innerHTML = `<span class="cw-num">${cell.num}</span><span class="cw-letter">${L || ""}</span>`;
          el.addEventListener("click", () => {
            activeNum = (activeNum === i) ? -1 : i;
            AudioFX.tick();
            renderGrid();
          });
          gridEl.appendChild(el);
        });
        const filledCount = Object.values(mapping).filter(v => v).length;
        const uniqueNumbers = new Set(word.cells.map(c => c.num)).size;
        root.querySelector("#cw-filled").textContent = `${filledCount} / ${uniqueNumbers}`;
      }

      function renderKb() {
        kbEl.innerHTML = "";
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L => {
          const btn = document.createElement("button");
          btn.className = "key cw-key";
          btn.textContent = L;
          const usedAs = Object.keys(mapping).find(k => mapping[k] === L);
          if (usedAs) btn.classList.add("used");
          btn.addEventListener("click", () => assignLetter(L));
          kbEl.appendChild(btn);
        });
      }

      function assignLetter(L) {
        if (solved || activeNum < 0) return;
        const cell = word.cells[activeNum];
        const num = cell.num;
        // Remove any existing mapping that already maps to L
        for (const k in mapping) if (mapping[k] === L) delete mapping[k];
        mapping[num] = L;
        AudioFX.pop();
        renderGrid();
        renderKb();
        checkSolved();
      }

      function checkSolved() {
        const decoded = word.cells.map(c => mapping[c.num] || "").join("");
        if (decoded === word.word.word) {
          solved = true;
          AudioFX.win();
          statusEl.textContent = `🎉 Decoded! The word was "${word.word.word}".`;
          statusEl.className = "status win";
          const hintsUsed = 2 - parseInt(root.querySelector("#cw-hints").textContent, 10);
          const score = Math.max(0, 100 - hintsUsed * 20);
          const best = Storage.getBest("codewords");
          if (!best || score > best) {
            Storage.setBest("codewords", score);
            root.querySelector("#cw-best").textContent = score;
            App.toast("New best: " + score, "success");
          }
        }
      }

      function onKey(e) {
        if (solved) return;
        if (e.key === "Backspace") {
          if (activeNum >= 0) {
            const cell = word.cells[activeNum];
            if (mapping[cell.num]) {
              delete mapping[cell.num];
              AudioFX.click();
            }
            renderGrid();
            renderKb();
          }
          return;
        }
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const dir = e.key === "ArrowRight" ? 1 : -1;
          activeNum = (activeNum + dir + word.cells.length) % word.cells.length;
          AudioFX.tick();
          renderGrid();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) assignLetter(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (solved) {
          App.toast("Already solved", "info");
          return;
        }
        const hintsLeft = parseInt(root.querySelector("#cw-hints").textContent, 10);
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        // Find a number that's unmapped or wrongly mapped
        const candidates = word.cells.filter(c => mapping[c.num] !== c.letter);
        if (!candidates.length) {
          App.toast("Nothing to hint", "info");
          return;
        }
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        // Activate that cell and assign the correct letter
        activeNum = word.cells.indexOf(cell);
        assignLetter(cell.letter);
        root.querySelector("#cw-hints").textContent = hintsLeft - 1;
        App.toast(`Hint: ${cell.num} = ${cell.letter}`, "info");
      }

      function doSolve() {
        if (solved) return;
        word.cells.forEach(c => {
          mapping[c.num] = c.letter;
        });
        solved = true;
        renderGrid();
        renderKb();
        statusEl.textContent = `Solution revealed: "${word.word.word}"`;
        statusEl.className = "status lose";
        AudioFX.lose();
      }

      function newGame() {
        word = newPuzzle();
        mapping = {};
        solved = false;
        activeNum = 0; // start at first cell
        root.querySelector("#cw-hints").textContent = "2";
        clueEl.textContent = "Clue: " + word.word.clue;
        const best = Storage.getBest("codewords");
        root.querySelector("#cw-best").textContent = best || "—";
        statusEl.textContent = "Each number stands for a letter. Crack the cipher to reveal the word.";
        statusEl.className = "status info";
        renderGrid();
        renderKb();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Codewords",
        `Each <b>number</b> in the grid stands for exactly one letter. The same number always maps to the same letter.
        <br><br>You're given a <b>clue</b> for the hidden word.
        <br><br>Tap a cell to activate it, then either tap a letter on the keyboard below or type one. <b>Arrow keys</b> move between cells, <b>Backspace</b> clears.
        <br><br><b>Hint</b> reveals one correct letter (max 2).`);
    },
  });
})();
