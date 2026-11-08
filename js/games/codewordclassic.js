/* Codeword Classic — a themed mini-crossword with no clues: every letter is a number. */
(function () {
  // Themed word pools — 5 themes × 12 common words (all real English).
  const THEMES = [
    {
      name: "Animals",
      emoji: "🦁",
      words: "TIGER ZEBRA HORSE MOUSE SHEEP WHALE SHARK EAGLE CAMEL KOALA PANDA OTTER".split(" ")
    },
    {
      name: "Food",
      emoji: "🍎",
      words: "APPLE BANANA ORANGE GRAPE LEMON MANGO PEACH CHERRY OLIVE HONEY BREAD PASTA".split(" ")
    },
    {
      name: "Space",
      emoji: "🚀",
      words: "COMET PLANET ORBIT GALAXY ROCKET VENUS SATURN METEOR COSMOS NEBULA QUASAR APOLLO".split(" ")
    },
    {
      name: "Ocean",
      emoji: "🌊",
      words: "CORAL SHELL BEACH SQUID PEARL ANCHOR DOLPHIN MARLIN LAGOON URCHIN KELP SAILOR".split(" ")
    },
    {
      name: "Nature",
      emoji: "🌲",
      words: "FOREST MEADOW RIVER FLOWER CANYON RAINBOW VALLEY STREAM GLACIER JUNGLE DESERT SUMMIT".split(" ")
    },
  ];
  const WORDS_PER_PUZZLE = 6;
  const STARTERS = 3; // letters given for free
  const MAX_HINTS = 3;
  const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Pick 6 words that share many letters (so they actually interlock). */
  function pickWords(pool) {
    const sorted = shuffle(pool.slice()).sort((a, b) => b.length - a.length);
    const picked = [sorted[0]];
    const rest = sorted.slice(1);
    while (picked.length < WORDS_PER_PUZZLE && rest.length) {
      let best = [], bestScore = -1;
      for (const w of rest) {
        let s = 0;
        for (const L of new Set(w.split(""))) {
          if (picked.some(p => p.includes(L))) s++;
        }
        if (s > bestScore) {
          bestScore = s;
          best = [w];
        } else if (s === bestScore) best.push(w);
      }
      const w = best[Math.floor(Math.random() * best.length)];
      picked.push(w);
      rest.splice(rest.indexOf(w), 1);
    }
    return picked;
  }

  /* Build an interlocking layout: words cross where they share letters.
     Returns { cells: Map("r,c" -> {r,c,letter}), placements: [{word, cells:[...]}] } */
  function buildLayout(words) {
    const cells = new Map();
    const placements = [];
    const key = (r, c) => r + "," + c;

    function canPlace(word, r0, c0, dir) {
      const dr = dir === "V" ? 1 : 0, dc = dir === "H" ? 1 : 0;
      if (cells.has(key(r0 - dr, c0 - dc))) return false;
      if (cells.has(key(r0 + dr * word.length, c0 + dc * word.length))) return false;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        const ex = cells.get(key(r, c));
        if (ex) {
          if (ex.letter !== word[i]) return false;
        } else {
          // New cell: perpendicular neighbours must be empty (no accidental adjacencies)
          const pr = dir === "H" ? 1 : 0, pc = dir === "H" ? 0 : 1;
          if (cells.has(key(r + pr, c + pc))) return false;
          if (cells.has(key(r - pr, c - pc))) return false;
        }
      }
      return true;
    }

    function place(word, r0, c0, dir) {
      const dr = dir === "V" ? 1 : 0, dc = dir === "H" ? 1 : 0;
      const list = [];
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        let cell = cells.get(key(r, c));
        if (!cell) {
          cell = {r, c, letter: word[i]};
          cells.set(key(r, c), cell);
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
        }
        list.push(cell);
      }
      placements.push({word, cells: list});
    }

    // Try every crossing point; keep the placement that stays most compact.
    function tryBestPlace(word) {
      let best = null;
      for (const cell of cells.values()) {
        for (let i = 0; i < word.length; i++) {
          if (word[i] !== cell.letter) continue;
          for (const dir of ["H", "V"]) {
            const r0 = cell.r - (dir === "V" ? i : 0);
            const c0 = cell.c - (dir === "H" ? i : 0);
            if (!canPlace(word, r0, c0, dir)) continue;
            const dr = dir === "V" ? 1 : 0, dc = dir === "H" ? 1 : 0;
            const rEnd = r0 + dr * (word.length - 1), cEnd = c0 + dc * (word.length - 1);
            const h = Math.max(maxR, rEnd) - Math.min(minR, r0) + 1;
            const w = Math.max(maxC, cEnd) - Math.min(minC, c0) + 1;
            if (w > 13 || h > 12) continue; // keep the grid compact
            const area = w * h, aspect = Math.abs(w - h);
            if (!best || area < best.area - 2 || (area <= best.area + 2 && aspect < best.aspect)) {
              best = {r0, c0, dir, area, aspect};
            }
          }
        }
      }
      return best;
    }

    let minR = 0, maxR = 0, minC = 0, maxC = 0;
    place(words[0], 0, 0, "H");
    for (let w = 1; w < words.length; w++) {
      const word = words[w];
      const best = tryBestPlace(word);
      if (best) {
        place(word, best.r0, best.c0, best.dir);
      } else {
        // Fallback: own row band below the grid (still solvable via the mapping)
        let c0 = minC;
        for (const p of placements) {
          if (p.cells[0].r === maxR + 2) c0 = Math.max(c0, p.cells[p.cells.length - 1].c + 2);
        }
        place(word, maxR + 2, c0, "H");
      }
    }
    return {cells, placements};
  }

  let live = null;
  GameRegistry.register({
    id: "codewordclassic",
    name: "Codeword Classic",
    icon: "🔢",
    category: "word",
    description: "Crossword with no clues — every letter is a number; decode them all",
    tags: ["word", "puzzle", "crossword", "cipher"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let theme = null, cells = [], placements = [], letterNum = {};
      let assigned = {}, given = new Set(), activeNum = null;
      let over = false, hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Theme</div><div class="val" id="cw-theme">—</div></div>
          <div class="score-cell"><div class="label">Words</div><div class="val" id="cw-words">0/${WORDS_PER_PUZZLE}</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="cw-hints">${MAX_HINTS}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cw-best">—</div></div>
        </div>
        <div class="status info" id="cw-status">Each number always means the same letter. Tap a numbered square, then type or pick a letter.</div>
        <div class="center" style="margin:14px 0;overflow-x:auto;"><div class="cw-grid" id="cw-grid"></div></div>
        <div class="center text-muted text-sm" style="margin-bottom:8px;">letters — tap to place on the selected number</div>
        <div class="center"><div class="cw-tracker" id="cw-tracker"></div></div>
        <div class="center" style="margin:12px 0 4px;">
          <button class="btn" id="cw-new">🧩 New puzzle</button>
        </div>
        <p class="hint">The same letter is always the same number across the whole puzzle. Words turn <b style="color:var(--success)">green</b> when complete and correct. <b>Backspace</b> clears the selected number.</p>
      `;

      const statusEl = root.querySelector("#cw-status");
      const gridEl = root.querySelector("#cw-grid");
      const trackerEl = root.querySelector("#cw-tracker");

      if (!document.getElementById("cw-style")) {
        const s = document.createElement("style");
        s.id = "cw-style";
        s.textContent = `
          .cw-grid { display: inline-grid; gap: 3px; background: var(--bg-elev); padding: 8px; border-radius: var(--radius); box-shadow: var(--shadow); }
          .cw-cell { position: relative; width: 44px; height: 44px; background: var(--bg-soft); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 800; font-size: 1.25rem; color: var(--text); cursor: pointer; user-select: none; }
          .cw-cell .n { position: absolute; top: 1px; left: 4px; font-size: 0.55rem; font-weight: 700; color: var(--text-muted); }
          .cw-cell.active { outline: 3px solid var(--accent); }
          .cw-cell.given { background: var(--accent-soft); }
          .cw-cell.done { background: var(--success); border-color: var(--success); color: #fff; }
          .cw-cell.done .n { color: rgba(255,255,255,0.8); }
          .cw-cell.wrong { border-color: var(--danger); color: var(--danger); }
          .cw-empty { width: 44px; height: 44px; }
          .cw-tracker { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; max-width: 520px; }
          .cw-tkey { width: 30px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; cursor: pointer; }
          .cw-tkey:hover { border-color: var(--accent); }
          .cw-tkey.used { background: var(--accent); border-color: var(--accent); color: #fff; }
        `;
        document.head.appendChild(s);
      }

      function newPuzzle() {
        theme = THEMES[Math.floor(Math.random() * THEMES.length)];
        const words = pickWords(theme.words);
        const layout = buildLayout(words);
        cells = Array.from(layout.cells.values());
        placements = layout.placements;
        // Random letter → number mapping (1–26, consistent across the puzzle)
        const nums = shuffle(ALPHA.map((_, i) => i + 1));
        letterNum = {};
        ALPHA.forEach((L, i) => {
          letterNum[L] = nums[i];
        });
        for (const cell of cells) cell.num = letterNum[cell.letter];
        // Starter letters: 3 random distinct letters from the puzzle
        assigned = {};
        given = new Set();
        activeNum = null;
        over = false;
        hintsUsed = 0;
        const letters = shuffle(Array.from(new Set(cells.map(c => c.letter)))).slice(0, STARTERS);
        for (const L of letters) {
          assigned[letterNum[L]] = L;
          given.add(letterNum[L]);
        }
        root.querySelector("#cw-theme").textContent = theme.emoji + " " + theme.name;
        root.querySelector("#cw-hints").textContent = MAX_HINTS;
        const best = Storage.getBest("codewordclassic");
        root.querySelector("#cw-best").textContent = best || "—";
        statusEl.textContent = "Theme: " + theme.name + ". Each number always means the same letter — " + STARTERS + " are given for free.";
        statusEl.className = "status info";
        render();
      }

      function wordState(p) {
        let allAssigned = true, allCorrect = true;
        for (const cell of p.cells) {
          const L = assigned[cell.num];
          if (!L) {
            allAssigned = false;
            allCorrect = false;
          } else if (L !== cell.letter) allCorrect = false;
        }
        return allAssigned ? (allCorrect ? "done" : "wrong") : "open";
      }

      function render() {
        // Bounding box
        let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
        for (const cell of cells) {
          minR = Math.min(minR, cell.r);
          maxR = Math.max(maxR, cell.r);
          minC = Math.min(minC, cell.c);
          maxC = Math.max(maxC, cell.c);
        }
        const byPos = {};
        for (const cell of cells) byPos[cell.r + "," + cell.c] = cell;

        const states = placements.map(wordState);
        const doneWords = states.filter(s => s === "done").length;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = "repeat(" + (maxC - minC + 1) + ", 44px)";
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            const cell = byPos[r + "," + c];
            const div = document.createElement("div");
            if (!cell) {
              div.className = "cw-empty";
            } else {
              // Cell is green when ANY word through it is complete + correct
              let st = "open";
              placements.forEach((p, pi) => {
                if (p.cells.includes(cell)) {
                  if (states[pi] === "done") st = "done";
                  else if (states[pi] === "wrong" && st !== "done") st = "wrong";
                }
              });
              div.className = "cw-cell" +
                (given.has(cell.num) ? " given" : "") +
                (st === "done" ? " done" : "") +
                (st === "wrong" ? " wrong" : "") +
                (activeNum === cell.num ? " active" : "");
              div.innerHTML = '<span class="n">' + cell.num + "</span>" + (assigned[cell.num] || "");
              div.addEventListener("click", () => {
                if (over) return;
                activeNum = (activeNum === cell.num) ? null : cell.num;
                AudioFX.tick();
                render();
              });
            }
            gridEl.appendChild(div);
          }
        }
        root.querySelector("#cw-words").textContent = doneWords + "/" + WORDS_PER_PUZZLE;

        // Letter tracker
        trackerEl.innerHTML = "";
        const used = new Set(Object.values(assigned));
        for (const L of ALPHA) {
          const b = document.createElement("button");
          b.className = "cw-tkey" + (used.has(L) ? " used" : "");
          b.textContent = L;
          b.addEventListener("click", () => assign(L));
          trackerEl.appendChild(b);
        }
      }

      function assign(L) {
        if (over) return;
        if (activeNum === null) {
          App.toast("Tap a numbered square first", "info");
          return;
        }
        if (given.has(activeNum)) {
          App.toast("That letter was given — it can't change", "info");
          return;
        }
        // Keep the mapping one-to-one: remove L from any other number
        for (const n in assigned) {
          if (assigned[n] === L && Number(n) !== activeNum) delete assigned[n];
        }
        assigned[activeNum] = L;
        AudioFX.place();
        render();
        checkWin();
      }

      function clearActive() {
        if (over || activeNum === null) return;
        if (given.has(activeNum)) return;
        if (assigned[activeNum]) {
          delete assigned[activeNum];
          AudioFX.click();
          render();
        }
      }

      function checkWin() {
        const allCorrect = cells.every(c => assigned[c.num] === c.letter);
        if (!allCorrect) return;
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Puzzle decoded! All " + WORDS_PER_PUZZLE + " " + theme.name.toLowerCase() + " words cracked.";
        statusEl.className = "status win";
        const score = Math.max(30, 100 - hintsUsed * 10);
        App.recordResult(true, score);
        const best = Storage.getBest("codewordclassic");
        if (!best || score > best) {
          Storage.setBest("codewordclassic", score);
          root.querySelector("#cw-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        render();
      }

      function doHint() {
        if (over) {
          App.toast("Puzzle already solved", "info");
          return;
        }
        const left = MAX_HINTS - hintsUsed;
        if (left <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        const candidates = cells.filter(c => !given.has(c.num) && assigned[c.num] !== c.letter);
        if (!candidates.length) {
          App.toast("Nothing left to reveal", "info");
          return;
        }
        const cell = candidates[Math.floor(Math.random() * candidates.length)];
        hintsUsed++;
        root.querySelector("#cw-hints").textContent = MAX_HINTS - hintsUsed;
        assigned[cell.num] = cell.letter;
        activeNum = cell.num;
        AudioFX.reveal();
        render();
        App.toast("#" + cell.num + " is " + cell.letter, "info");
        checkWin();
      }

      function doSolve() {
        if (over) return;
        for (const cell of cells) assigned[cell.num] = cell.letter;
        over = true;
        AudioFX.lose();
        statusEl.textContent = "Solution revealed — all " + WORDS_PER_PUZZLE + " words shown.";
        statusEl.className = "status lose";
        App.recordResult(false, 0);
        render();
      }

      function onKey(e) {
        if (over) return;
        if (e.key === "Backspace") {
          e.preventDefault();
          clearActive();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) assign(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#cw-new").addEventListener("click", () => {
        AudioFX.click();
        newPuzzle();
      });

      live = {hint: doHint, solve: doSolve};
      newPuzzle();
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
      App.showModal("How to play Codeword Classic",
        `A mini-crossword where the clues are gone — every letter has been replaced by a <b>number</b>.
        <br><br>• The same number <b>always</b> stands for the same letter, everywhere in the puzzle.
        <br>• ${STARTERS} letters are given for free at the start.
        <br>• Tap a numbered square to select it, then type or tap a letter to place it there.
        <br>• Each letter is used only once — the A–Z tracker shows which are still free.
        <br>• Words turn <b>green</b> when they're complete and correct.
        <br><br>Decode all ${WORDS_PER_PUZZLE} themed words to win. <b>Hint</b> reveals one number (max ${MAX_HINTS}). <b>Backspace</b> clears the selected square.`);
    },
  });
})();
