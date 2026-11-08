/* Word Search Junior — a friendly 8×8 word search for kids.
   7 easy words are hidden across (→) and down (↓) only — never diagonally.
   Tap the first and last letter of a word, or drag between them. Found
   words light up in their own color and get crossed off the list. */
(function () {
  "use strict";

  const N = 8;
  const WORDS_PER_PUZZLE = 7;
  const BANK = [
    "CAT", "DOG", "SUN", "HAT", "FISH", "STAR", "TREE", "BALL",
    "CAKE", "FROG", "MOON", "BIRD", "DUCK", "MILK", "BOOK", "RAIN",
    "SNOW", "BOAT", "KITE", "LEAF",
  ];
  const FOUND_COLORS = ["#2f9e55", "#3272c6", "#e2712b", "#8451c4", "#d6456e", "#0f9b8e", "#c9a227"];

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function same(a, b) {
    return a && b && a.r === b.r && a.c === b.c;
  }

  // Junior rules: straight horizontal or vertical lines only.
  function straightLine(a, b) {
    if (!a || !b) return null;
    if (a.r !== b.r && a.c !== b.c) return null;
    const len = Math.abs(a.r - b.r) + Math.abs(a.c - b.c) + 1;
    const sr = Math.sign(b.r - a.r), sc = Math.sign(b.c - a.c);
    const out = [];
    for (let i = 0; i < len; i++) out.push({r: a.r + sr * i, c: a.c + sc * i});
    return out;
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "wordsearchjunior",
    name: "Word Search Junior",
    icon: "🔍",
    category: "word",
    description: "Find 7 easy kid words hidden in an 8×8 grid — words run across and down only, never diagonally",
    tags: ["word", "kids", "search", "letters", "beginner"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid = [], words = [], placements = {}, found = new Set(), wordColor = {};
      let finished = false;
      let elapsed = 0, timerId = null;
      // Selection state (supports both tap-tap and drag):
      let anchor = null;          // confirmed first-letter tap
      let pressCell = null;       // cell under the current press
      let moveCell = null;        // latest cell the press moved over
      let anchorExisted = false;  // anchor already existed when the press began
      const timers = [];

      function later(fn, ms) {
        const t = setTimeout(() => {
          if (!alive) return;
          fn();
        }, ms);
        timers.push(t);
        return t;
      }

      if (!document.getElementById("wsj-style")) {
        const s = document.createElement("style");
        s.id = "wsj-style";
        s.textContent = `
          .wsj-grid { display:grid; grid-template-columns:repeat(${N}, 42px); grid-auto-rows:42px; gap:3px; background:var(--border); padding:5px; border-radius:var(--radius); width:max-content; margin:12px auto; user-select:none; -webkit-user-select:none; touch-action:none; }
          .wsj-cell { display:grid; place-items:center; background:var(--bg-elev); font-family:var(--font-mono); font-weight:700; font-size:1.2rem; color:var(--text); cursor:pointer; border-radius:5px; }
          .wsj-words { text-align:center; margin-top:10px; }
          .wsj-word { display:inline-block; padding:4px 12px; margin:3px; border-radius:999px; background:var(--bg-elev); border:1px solid var(--border); font-size:0.85rem; font-family:var(--font-mono); letter-spacing:0.08em; color:var(--text); }
          .wsj-word.got { color:#fff; border-color:transparent; text-decoration:line-through; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Found</div><div class="val" id="wsj-found">0/${WORDS_PER_PUZZLE}</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="wsj-time">0s</div></div>
          <div class="score-cell"><div class="label">Best time</div><div class="val" id="wsj-best">—</div></div>
        </div>
        <div class="status info" id="wsj-status">Tap the first and last letter of a word — or drag across it.</div>
        <div class="wsj-grid" id="wsj-grid"></div>
        <div class="wsj-words" id="wsj-words"></div>
        <div class="row center" style="gap:8px; margin-top:12px;">
          <button class="btn primary" id="wsj-new" type="button">New puzzle</button>
        </div>
        <p class="hint">Words hide <b>across</b> and <b>down</b> only. Tap the first letter, then the last — or drag. <b>N</b> = new puzzle.</p>
      `;

      const gridEl = root.querySelector("#wsj-grid");
      const statusEl = root.querySelector("#wsj-status");
      const wordsEl = root.querySelector("#wsj-words");
      const foundEl = root.querySelector("#wsj-found");
      const timeEl = root.querySelector("#wsj-time");
      const bestEl = root.querySelector("#wsj-best");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + cls;
      }

      function cellEl(r, c) {
        return gridEl.children[r * N + c];
      }

      // ---------- puzzle generation ----------
      function newPuzzle() {
        const bank = shuffled(BANK);
        grid = Array.from({length: N}, () => Array(N).fill(""));
        words = [];
        placements = {};
        found = new Set();
        wordColor = {};
        finished = false;
        clearSelection();

        for (const w of bank) {
          if (words.length >= WORDS_PER_PUZZLE) break;
          const cells = tryPlace(w);
          if (cells) {
            words.push(w);
            placements[w] = cells;
          }
        }
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!grid[r][c]) grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
        renderGrid();
        renderWords();
        const best = Storage.getBest("wordsearchjunior");
        bestEl.textContent = best != null ? best + "s" : "—";
        setStatus("Find " + words.length + " words — they go across ➡ and down ⬇. Tap first + last letter.", "info");
        stopTimer();
        elapsed = 0;
        timeEl.textContent = "0s";
        timerId = setInterval(() => {
          if (!alive || finished) return;
          elapsed++;
          timeEl.textContent = elapsed + "s";
        }, 1000);
      }

      function tryPlace(word) {
        // Across (→) and down (↓) only — junior rules.
        const dirs = [[0, 1], [1, 0]];
        for (let tries = 0; tries < 300; tries++) {
          const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
          const r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
          const endR = r0 + dr * (word.length - 1), endC = c0 + dc * (word.length - 1);
          if (endR >= N || endC >= N) continue;
          let ok = true;
          for (let i = 0; i < word.length; i++) {
            if (grid[r0 + dr * i][c0 + dc * i] && grid[r0 + dr * i][c0 + dc * i] !== word[i]) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          const cells = [];
          for (let i = 0; i < word.length; i++) {
            const r = r0 + dr * i, c = c0 + dc * i;
            grid[r][c] = word[i];
            cells.push({r, c});
          }
          return cells;
        }
        return null;
      }

      // ---------- rendering ----------
      function renderGrid() {
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "wsj-cell";
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.textContent = grid[r][c];
          gridEl.appendChild(cell);
        }
      }

      function renderWords() {
        wordsEl.innerHTML = "";
        for (const w of words) {
          const chip = document.createElement("span");
          chip.className = "wsj-word" + (found.has(w) ? " got" : "");
          chip.textContent = w;
          if (found.has(w)) chip.style.background = wordColor[w];
          wordsEl.appendChild(chip);
        }
        foundEl.textContent = found.size + "/" + words.length;
      }

      // ---------- selection (tap-tap and drag) ----------
      function paintSelection(cells) {
        for (const el of gridEl.children) {
          if (!el.dataset.found) el.style.background = "";
        }
        if (cells) {
          for (const {r, c} of cells) {
            const el = cellEl(r, c);
            if (el && !el.dataset.found) el.style.background = "var(--accent-soft)";
          }
        }
      }

      function clearSelection() {
        anchor = null;
        paintSelection(null);
      }

      function down(cell) {
        if (finished || !cell) return;
        pressCell = cell;
        moveCell = cell;
        anchorExisted = !!anchor;
        if (!anchor) {
          anchor = cell;
          AudioFX.tick();
          paintSelection([cell]);
        } else {
          paintSelection(straightLine(anchor, cell));
        }
      }

      function move(cell) {
        if (!pressCell || !cell || same(moveCell, cell)) return;
        moveCell = cell;
        paintSelection(straightLine(anchor || pressCell, cell));
      }

      function up() {
        if (!pressCell) return;
        const end = moveCell;
        const moved = end && !same(end, pressCell);
        if (anchorExisted) {
          if (!moved) {
            if (same(end, anchor)) {
              clearSelection(); // tapped the anchor again — deselect
              AudioFX.click();
            } else {
              attempt(anchor, end);
              anchor = null;
            }
          } else {
            attempt(pressCell, end); // drag overrides the old anchor
            anchor = null;
          }
        } else if (moved) {
          attempt(pressCell, end);
          anchor = null;
        }
        pressCell = null;
        moveCell = null;
      }

      function attempt(a, b) {
        if (finished) return;
        const cells = straightLine(a, b);
        if (!cells) {
          AudioFX.error();
          setStatus("Words go straight across or down — pick a straight line.", "info");
          paintSelection(null);
          return;
        }
        const letters = cells.map(({r, c}) => grid[r][c]).join("");
        const rev = letters.split("").reverse().join("");
        for (const w of words) {
          if (found.has(w)) continue;
          if (w === letters || w === rev) {
            foundWord(w, cells);
            return;
          }
        }
        AudioFX.error();
        setStatus("That's not one of the words — try again!", "info");
        paintSelection(null);
      }

      function foundWord(w, cells) {
        found.add(w);
        const color = FOUND_COLORS[(found.size - 1) % FOUND_COLORS.length];
        wordColor[w] = color;
        for (const {r, c} of cells) {
          const el = cellEl(r, c);
          if (el) {
            el.dataset.found = "1";
            el.style.background = color;
            el.style.color = "#fff";
          }
        }
        AudioFX.pop();
        renderWords();
        if (found.size === words.length) {
          finished = true;
          AudioFX.win();
          setStatus("🎉 All " + words.length + " words found in " + elapsed + "s!", "win");
          App.recordResult(true, words.length);
          const best = Storage.getBest("wordsearchjunior");
          if (best == null || elapsed < best) {
            Storage.setBest("wordsearchjunior", elapsed);
            bestEl.textContent = elapsed + "s";
            App.toast("New best time: " + elapsed + "s", "success");
          }
        } else {
          setStatus("✓ " + w + " found! " + (words.length - found.size) + " to go.", "win");
        }
      }

      // ---------- input events ----------
      function cellFromMouse(e) {
        const t = e.target.closest(".wsj-cell");
        return t ? {r: +t.dataset.r, c: +t.dataset.c} : null;
      }

      function cellFromTouch(e) {
        const t = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
        const cell = t && t.closest && t.closest(".wsj-cell");
        return cell ? {r: +cell.dataset.r, c: +cell.dataset.c} : null;
      }

      gridEl.addEventListener("mousedown", (e) => {
        down(cellFromMouse(e));
        e.preventDefault();
      });
      gridEl.addEventListener("mousemove", (e) => move(cellFromMouse(e)));
      gridEl.addEventListener("mouseup", up);
      gridEl.addEventListener("mouseleave", () => {
        if (pressCell) {
          pressCell = null;
          moveCell = null;
          if (anchor) paintSelection([anchor]);
        }
      });
      gridEl.addEventListener("touchstart", (e) => {
        down(cellFromTouch(e));
        e.preventDefault();
      }, {passive: false});
      gridEl.addEventListener("touchmove", (e) => {
        move(cellFromTouch(e));
        e.preventDefault();
      }, {passive: false});
      gridEl.addEventListener("touchend", (e) => {
        up();
        e.preventDefault();
      }, {passive: false});

      function onKey(e) {
        if (e.key === "n" || e.key === "N" || e.key === "r" || e.key === "R") newPuzzle();
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#wsj-new").addEventListener("click", () => {
        AudioFX.click();
        newPuzzle();
      });

      function stopTimer() {
        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }
      }

      // ---------- hint / solve ----------
      function doHint() {
        if (finished) {
          App.toast("Puzzle complete — press New puzzle!", "info");
          return;
        }
        const remaining = words.filter((w) => !found.has(w));
        if (!remaining.length) return;
        const w = remaining[Math.floor(Math.random() * remaining.length)];
        const first = placements[w][0];
        const el = cellEl(first.r, first.c);
        if (el && !el.dataset.found) {
          el.style.background = "var(--warning)";
          el.style.color = "#fff";
          later(() => {
            if (!el.dataset.found) {
              el.style.background = "";
              el.style.color = "";
            }
          }, 2000);
        }
        AudioFX.reveal();
        App.toast("Hint: \"" + w + "\" starts at row " + (first.r + 1) + ", column " + (first.c + 1), "info");
      }

      function doSolve() {
        if (finished) {
          App.toast("Puzzle complete — press New puzzle!", "info");
          return;
        }
        const remaining = words.filter((w) => !found.has(w));
        if (!remaining.length) {
          App.toast("Everything is already found!", "info");
          return;
        }
        for (const w of remaining) {
          for (const {r, c} of placements[w]) {
            const el = cellEl(r, c);
            if (el && !el.dataset.found) {
              el.style.background = "var(--warning)";
              el.style.color = "#fff";
            }
          }
        }
        AudioFX.reveal();
        App.toast("All words revealed for 3 seconds — mark them quickly!", "info");
        later(() => {
          for (const el of gridEl.children) {
            if (!el.dataset.found) {
              el.style.background = "";
              el.style.color = "";
            }
          }
        }, 3000);
      }

      live = {hint: doHint, solve: doSolve};

      newPuzzle();

      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        stopTimer();
        timers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Word Search Junior",
        `Find all the hidden words in the 8×8 letter grid. This is the junior version: words are short and easy, and they only run <b>across (→)</b> or <b>down (↓)</b> — never diagonally.
        <br><br>To mark a word, tap its <b>first letter</b>, then tap its <b>last letter</b> — or simply drag from one end to the other. You can also mark a word backwards.
        <br><br>Correct words light up in their own color and get crossed off the list. Find all ${WORDS_PER_PUZZLE} to win — your best time is remembered.
        <br><br>Press <b>New puzzle</b> (or the <b>N</b> key) any time for a fresh grid. <b>Hint</b> points out where one word starts.`);
    },
  });
})();
