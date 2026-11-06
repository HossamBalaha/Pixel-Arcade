/* Crosswordle — 5 intersecting 5-letter words, guess each Wordle-style */
(function () {
  // Precomputed crossword layouts. Each is 5 words of 5 letters intersecting in a 5x5 grid.
  // Words have a direction (across/down) and a top-left cell (row, col).
  const LAYOUTS = [
    {
      name: "Layout A",
      words: [
        {word: "HELLO", dir: "across", row: 0, col: 0},
        {word: "HEART", dir: "down", row: 0, col: 0},
        {word: "AROMA", dir: "across", row: 2, col: 0},
        {word: "ORALS", dir: "down", row: 0, col: 4},
        {word: "TIRES", dir: "across", row: 4, col: 0},
      ],
    },
    {
      name: "Layout B",
      words: [
        {word: "CRANE", dir: "across", row: 0, col: 0},
        {word: "COACH", dir: "down", row: 0, col: 0},
        {word: "AROMA", dir: "across", row: 2, col: 0},
        {word: "ELATE", dir: "down", row: 0, col: 4},
        {word: "HOUSE", dir: "across", row: 4, col: 0},
      ],
    },
    {
      name: "Layout C",
      words: [
        {word: "STORK", dir: "across", row: 0, col: 0},
        {word: "SOLID", dir: "down", row: 0, col: 0},
        {word: "LOGIC", dir: "across", row: 2, col: 0},
        {word: "KICKS", dir: "down", row: 0, col: 4},
        {word: "DRESS", dir: "across", row: 4, col: 0},
      ],
    },
  ];
  const LEN = 5;
  const SIZE = 5;
  const MAX_HINTS = 3;

  function evaluate(guess, answer) {
    const res = Array(LEN).fill("absent");
    const a = answer.split("");
    for (let i = 0; i < LEN; i++) if (guess[i] === a[i]) {
      res[i] = "correct";
      a[i] = null;
    }
    for (let i = 0; i < LEN; i++) {
      if (res[i] === "correct") continue;
      const j = a.indexOf(guess[i]);
      if (j !== -1) {
        res[i] = "present";
        a[j] = null;
      }
    }
    return res;
  }

  let live = null;

  GameRegistry.register({
    id: "crosswordle",
    name: "Crosswordle",
    icon: "🔤",
    category: "word",
    description: "Solve 5 intersecting 5-letter words Wordle-style",
    tags: ["word", "variant", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
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

      let layout, cells, words; // cells: 5x5 {active, solution, words:[{wi,pos}]}, words: [{...layout, current, submitted, eval, solved, last}]
      let activeWord = 0;
      let over = false;
      let revealed = false;
      let hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cw-solved">0/5</div></div>
          <div class="score-cell"><div class="label">Submits</div><div class="val" id="cw-tries">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cw-best">—</div></div>
        </div>
        <div class="status info" id="cw-status">Solve all 5 intersecting words. Click a cell to switch word.</div>
        <div id="cw-grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:280px;margin:0 auto;"></div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:8px;">
          <span class="text-sm text-muted">Active word:</span>
          <b id="cw-active">#1</b>
          <button class="btn btn-sm" id="cw-next">Next word →</button>
        </div>
        <p class="hint">Type letters, <b>Enter</b> submits, <b>Backspace</b> deletes. <b>Tab</b> switches words. Click a cell to switch. Stuck? <b>Hint</b> (max 3) or <b>Solve</b>.</p>
      `;

      const gridEl = root.querySelector("#cw-grid");
      const statusEl = root.querySelector("#cw-status");

      function buildLayout(L) {
        layout = L;
        cells = [];
        for (let r = 0; r < SIZE; r++) {
          cells[r] = [];
          for (let c = 0; c < SIZE; c++) cells[r][c] = {active: false, solution: "", words: []};
        }
        words = L.words.map((w, wi) => ({
          ...w, current: Array(LEN).fill(""), submitted: null, eval: null, solved: false, last: 0,
        }));
        for (let wi = 0; wi < words.length; wi++) {
          const w = words[wi];
          for (let i = 0; i < LEN; i++) {
            const r = w.dir === "across" ? w.row : w.row + i;
            const c = w.dir === "across" ? w.col + i : w.col;
            cells[r][c].active = true;
            cells[r][c].solution = w.word[i];
            cells[r][c].words.push({wi, pos: i});
          }
        }
      }

      function cellFor(word, pos) {
        const w = words[word];
        const r = w.dir === "across" ? w.row : w.row + pos;
        const c = w.dir === "across" ? w.col + pos : w.col;
        return {r, c};
      }

      function cellView(r, c) {
        const cell = cells[r][c];
        if (!cell.active) return {letter: "", state: null};
        // Prefer active word
        const inActive = cell.words.find(x => x.wi === activeWord);
        if (inActive) {
          const w = words[activeWord];
          const letter = w.current[inActive.pos] !== "" ? w.current[inActive.pos] : (w.submitted ? w.submitted[inActive.pos] : "");
          const state = w.eval ? w.eval[inActive.pos] : null;
          return {letter, state};
        }
        // Otherwise, most recently submitted word containing this cell
        let best = null, bestLast = -1;
        for (const x of cell.words) {
          const w = words[x.wi];
          if (w.submitted && w.last > bestLast) {
            best = w;
            bestLast = w.last;
          }
        }
        if (best) {
          const pos = cell.words.find(x => x.wi === words.indexOf(best)).pos;
          return {letter: best.submitted[pos], state: best.eval[pos]};
        }
        return {letter: "", state: null};
      }

      function stateStyle(state) {
        if (state === "correct") return {bg: "var(--success)", fg: "#fff", border: "var(--success)"};
        if (state === "present") return {bg: "var(--warning)", fg: "#fff", border: "var(--warning)"};
        if (state === "absent") return {bg: "var(--bg-soft)", fg: "var(--text-muted)", border: "var(--border)"};
        return {bg: "var(--bg-elev)", fg: "var(--text)", border: "var(--border)"};
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        for (let r = 0; r < SIZE; r++) {
          for (let c = 0; c < SIZE; c++) {
            const cell = cells[r][c];
            const el = document.createElement("div");
            el.style.aspectRatio = "1";
            el.style.display = "grid";
            el.style.placeItems = "center";
            el.style.fontFamily = "var(--font-heading)";
            el.style.fontWeight = "700";
            el.style.fontSize = "1.2rem";
            el.style.textTransform = "uppercase";
            el.style.borderRadius = "5px";
            el.style.transition = "transform 0.15s, background 0.2s";
            if (!cell.active) {
              el.style.background = "var(--border-strong, var(--border))";
              el.style.border = "1px solid var(--border)";
            } else {
              const v = cellView(r, c);
              const s = stateStyle(v.state);
              el.style.background = s.bg;
              el.style.color = s.fg;
              el.style.border = "2px solid " + s.border;
              el.textContent = v.letter;
              // Highlight active word cells
              const inActive = cell.words.find(x => x.wi === activeWord);
              if (inActive) {
                el.style.outline = "2px solid var(--accent)";
                el.style.outlineOffset = "1px";
              }
              el.style.cursor = "pointer";
              el.addEventListener("click", () => {
                const opts = cell.words.map(x => x.wi).filter(wi => !words[wi].solved);
                if (opts.length === 0) return;
                // Toggle if intersection
                let pick = opts[0];
                if (opts.length > 1 && opts.includes(activeWord)) {
                  pick = opts.find(wi => wi !== activeWord);
                }
                if (pick !== activeWord) {
                  activeWord = pick;
                  AudioFX.click();
                  updateActiveLabel();
                  renderGrid();
                }
              });
            }
            gridEl.appendChild(el);
          }
        }
      }

      function updateActiveLabel() {
        const w = words[activeWord];
        root.querySelector("#cw-active").textContent = `${w.word[0]}${w.word[1]}${w.word[2]}… (${w.dir}) #${activeWord + 1}${w.solved ? " ✓" : ""}`;
      }

      function type(letter) {
        if (over) return;
        const w = words[activeWord];
        if (w.solved) return;
        for (let i = 0; i < LEN; i++) {
          if (w.current[i] === "") {
            w.current[i] = letter.toLowerCase();
            AudioFX.tick();
            renderGrid();
            return;
          }
        }
      }

      function back() {
        if (over) return;
        const w = words[activeWord];
        if (w.solved) return;
        for (let i = LEN - 1; i >= 0; i--) {
          if (w.current[i] !== "") {
            w.current[i] = "";
            AudioFX.click();
            renderGrid();
            return;
          }
        }
      }

      let submitCount = 0;
      let lastTime = 0;

      function submit() {
        if (over) return;
        const w = words[activeWord];
        if (w.solved) return;
        if (w.current.some(c => c === "")) {
          shake();
          AudioFX.error();
          return;
        }
        const guess = w.current.join("").toUpperCase();
        const ev = evaluate(guess, w.word);
        w.submitted = guess.split("");
        w.eval = ev;
        w.last = ++lastTime;
        w.current = Array(LEN).fill("");
        submitCount++;
        AudioFX.flip();
        if (guess === w.word) w.solved = true;
        renderGrid();
        updateActiveLabel();
        root.querySelector("#cw-tries").textContent = submitCount;
        const solved = words.filter(x => x.solved).length;
        root.querySelector("#cw-solved").textContent = solved + "/5";

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (solved === words.length) {
          over = true;
          statusEl.textContent = `🎉 All 5 words solved in ${submitCount} ${submitCount === 1 ? "submit" : "submits"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("crosswordle");
          if (!best || submitCount < best) {
            Storage.setBest("crosswordle", submitCount);
            root.querySelector("#cw-best").textContent = submitCount;
            App.toast("New best: " + submitCount + " submits", "success");
          }
        } else if (w.solved) {
          // Move to next unsolved
          const next = words.findIndex(x => !x.solved);
          if (next !== -1) {
            activeWord = next;
            updateActiveLabel();
            renderGrid();
          }
          statusEl.textContent = `✓ ${w.word} solved! ${solved}/5 done.`;
        } else {
          statusEl.textContent = `Not quite — try again or switch words (Tab).`;
        }
      }

      function shake() {
        gridEl.style.animation = "none";
        void gridEl.offsetWidth;
        gridEl.style.animation = "shake 0.3s";
      }

      if (!document.getElementById("cw-shake")) {
        const s = document.createElement("style");
        s.id = "cw-shake";
        s.textContent = "@keyframes shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}";
        document.head.appendChild(s);
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
        } else if (e.key === "Tab") {
          e.preventDefault();
          const start = activeWord;
          let i = (activeWord + 1) % words.length;
          while (i !== start && words[i].solved) i = (i + 1) % words.length;
          if (!words[i].solved) {
            activeWord = i;
            AudioFX.click();
            updateActiveLabel();
            renderGrid();
          }
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          type(e.key);
        }
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#cw-next").addEventListener("click", () => {
        const start = activeWord;
        let i = (activeWord + 1) % words.length;
        while (i !== start && words[i].solved) i = (i + 1) % words.length;
        if (!words[i].solved) {
          activeWord = i;
          AudioFX.click();
          updateActiveLabel();
          renderGrid();
        }
      });

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        const w = words[activeWord];
        if (w.solved) {
          App.toast("Active word already solved", "info");
          return;
        }
        // Find positions where current guess has wrong/empty letter
        const cand = [];
        for (let i = 0; i < LEN; i++) {
          if (w.current[i] !== w.word[i].toLowerCase()) cand.push(i);
        }
        if (cand.length === 0) {
          App.toast("Current guess already correct at every position", "info");
          return;
        }
        const p = cand[Math.floor(Math.random() * cand.length)];
        const letter = w.word[p];
        w.current[p] = letter.toLowerCase();
        hintsUsed++;
        AudioFX.reveal();
        renderGrid();
        App.toast(`Hint: position ${p + 1} of "${w.word}" is "${letter}"`, "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        const sol = words.map((w, i) => `<b>Word ${i + 1}:</b> ${w.word} (${w.dir})`).join("<br>");
        statusEl.textContent = `Solution revealed`;
        statusEl.className = "status lose";
        // Fill grid with all solutions
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
          if (cells[r][c].active) cells[r][c].revealedLetter = cells[r][c].solution;
        }
        renderGrid();
        App.showModal("Crosswordle solution", sol);
      }

      function newGame() {
        buildLayout(LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)]);
        activeWord = 0;
        over = false;
        revealed = false;
        hintsUsed = 0;
        submitCount = 0;
        root.querySelector("#cw-solved").textContent = "0/5";
        root.querySelector("#cw-tries").textContent = "0";
        const best = Storage.getBest("crosswordle");
        root.querySelector("#cw-best").textContent = best || "—";
        statusEl.textContent = "Solve all 5 intersecting words. Click a cell to switch word.";
        statusEl.className = "status info";
        updateActiveLabel();
        renderGrid();
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
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Crosswordle",
        `Solve <b>5 intersecting 5-letter words</b> arranged in a small crossword.
        <br><br>One word is "active" at a time (its cells are outlined). Type letters into the active word, then press <b>Enter</b> to submit.
        <br><br>After each submission, the active word's tiles change color:
        <br>🟩 <b>Green</b> — letter is correct and in the correct spot.
        <br>🟨 <b>Yellow</b> — letter is in the word but in the wrong spot.
        <br>⬛ <b>Gray</b> — letter is not in the word.
        <br><br>Intersecting cells are shared — solving one word gives you letters in another.
        <br><br>Switch words with <b>Tab</b>, the <b>Next word →</b> button, or by <b>clicking a cell</b> (clicks toggle intersections).
        <br><br>Win when all 5 words are correctly guessed. Unlimited submissions allowed. Stuck? Use <b>Hint</b> (max 3 — reveals one correct letter in the active word) or <b>Solve</b> (reveals all 5 words and ends the game as a loss).
        <br><br>Best score = fewest total submissions.`);
    },
  });
})();
