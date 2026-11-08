/* Mini Crossword — solve a classic crossword with wordplay clues */
(function () {
  GameRegistry.register({
    id: "crossword",
    name: "Mini Crossword",
    icon: "✏️",
    category: "word",
    description: "Solve a classic crossword with wordplay clues",
    tags: ["word", "crossword", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const ROWS = 7, COLS = 4;
      // Verified layouts: 3 across words (rows 0/3/6) + 4 down words (2 per ring).
      // Grid shape: full rows 0,3,6; only border cells (cols 0,3) in other rows.
      const SETS = [
        {
          A: ["PORT", "SLIP", "HANG"], D: ["PASS", "TRIP", "SUCH", "PLUG"],
          clues: {
            PORT: "Where ships dock", SLIP: "Lose your footing", HANG: "Suspend from above",
            PASS: "Succeed at a test", TRIP: "A journey", SUCH: "Of this very kind", PLUG: "Fills a socket",
          },
        },
        {
          A: ["BANK", "SHIP", "FACE"], D: ["BOSS", "KEEP", "SELF", "PILE"],
          clues: {
            BANK: "Money house", SHIP: "Ocean vessel", FACE: "Front of your head",
            BOSS: "Person in charge", KEEP: "Hold onto", SELF: "Your own person", PILE: "Stack of things",
          },
        },
        {
          A: ["PINK", "EDGE", "TINY"], D: ["PINE", "KNEE", "EAST", "EASY"],
          clues: {
            PINK: "Pale red", EDGE: "Border", TINY: "Very small",
            PINE: "Evergreen tree", KNEE: "Leg bend", EAST: "Sunrise direction", EASY: "Not difficult",
          },
        },
        {
          A: ["DREW", "TOLD", "MEET"], D: ["DIRT", "WOOD", "THEM", "DUST"],
          clues: {
            DREW: "Past of draw", TOLD: "Past of tell", MEET: "Come together",
            DIRT: "Soil", WOOD: "Tree material", THEM: "Those people", DUST: "Fine powder",
          },
        },
        {
          A: ["DUCK", "RISE", "NEXT"], D: ["DEAR", "KNEE", "RAIN", "EAST"],
          clues: {
            DUCK: "Water bird", RISE: "Get up", NEXT: "Following in order",
            DEAR: "Beloved", KNEE: "Leg bend", RAIN: "Water from clouds", EAST: "Sunrise direction",
          },
        },
        {
          A: ["SWIM", "FEEL", "TIDE"], D: ["SELF", "MAIL", "FLAT", "LIFE"],
          clues: {
            SWIM: "Move through water", FEEL: "Sense by touch", TIDE: "Ocean's rise and fall",
            SELF: "Your own person", MAIL: "Letters and parcels", FLAT: "Perfectly level", LIFE: "Being alive",
          },
        },
        {
          A: ["VERB", "WORE", "RISE"], D: ["VIEW", "BONE", "WEAR", "EASE"],
          clues: {
            VERB: "Action word", WORE: "Past of wear", RISE: "Get up",
            VIEW: "Sight or opinion", BONE: "Skeleton part", WEAR: "Have on clothing", EASE: "Without difficulty",
          },
        },
        {
          A: ["CAMP", "TOOK", "RAIN"], D: ["COST", "PINK", "TEAR", "KEEN"],
          clues: {
            CAMP: "Tents in the outdoors", TOOK: "Past of take", RAIN: "Water from clouds",
            COST: "Price tag amount", PINK: "Pale red", TEAR: "Rip apart", KEEN: "Eager or sharp",
          },
        },
        {
          A: ["MARK", "HERE", "FAIR"], D: ["MUCH", "KNEE", "HALF", "EVER"],
          clues: {
            MARK: "Spot or grade", HERE: "This very place", FAIR: "Just, or a carnival",
            MUCH: "A lot", KNEE: "Leg bend", HALF: "One of two equal parts", EVER: "At any time",
          },
        },
        {
          A: ["MAIL", "DAYS", "LIST"], D: ["MILD", "LESS", "DUAL", "SOFT"],
          clues: {
            MAIL: "Letters and parcels", DAYS: "24-hour periods", LIST: "Items in order",
            MILD: "Gentle, not extreme", LESS: "Not as much", DUAL: "Having two parts", SOFT: "Not hard",
          },
        },
      ];
      let set, grid, sel, dir, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="cw2-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cw2-best">0</div></div>
        </div>
        <div class="status info" id="cw2-status">Type letters into the grid — solve every word</div>
        <div class="center" id="cw2-wrap" style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;justify-content:center;"></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="cw2-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Click a square and type. Corner squares toggle across/down.</p>
      `;

      const wrap = root.querySelector("#cw2-wrap");
      const statusEl = root.querySelector("#cw2-status");
      best = Storage.getBest("crossword") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .cw2-grid { display:inline-grid; gap:3px; padding:8px; background:var(--bg-inset,#1f2937); border-radius:10px; }
        .cw2-cell { width:44px; height:44px; display:flex; align-items:center; justify-content:center; font-weight:700;
                    font-size:20px; text-transform:uppercase; position:relative; cursor:pointer; user-select:none; }
        .cw2-cell.block { background:#0b1220; cursor:default; }
        .cw2-cell.open { background:#f8fafc; color:#0f172a; }
        .cw2-cell.open.sel { outline:3px solid var(--accent,#6366f1); outline-offset:-3px; }
        .cw2-cell .num { position:absolute; top:1px; left:3px; font-size:9px; color:#475569; }
        .cw2-clues { max-width:250px; font-size:13px; line-height:1.55; text-align:left; }
        .cw2-clues h4 { margin:6px 0 2px; }
        .cw2-clue { padding:1px 4px; border-radius:4px; }
        .cw2-clue.done { text-decoration:line-through; opacity:0.5; }
        .cw2-clue.hot { background:var(--accent,#6366f1); color:#fff; }
      `;
      root.appendChild(style);

      // Build a layout descriptor: white cells + word placements + numbering
      function buildLayout(s) {
        const cells = Array.from({length: ROWS}, () => Array(COLS).fill(null));
        const words = [];
        // across words on rows 0, 3, 6
        [0, 3, 6].forEach((y, i) => {
          words.push({word: s.A[i], x: 0, y, d: "A"});
          for (let x = 0; x < COLS; x++) cells[y][x] = {sol: s.A[i][x], letter: "", num: null};
        });
        // down words: ring1 (rows 0-3) cols 0 and 3; ring2 (rows 3-6) cols 0 and 3
        const downs = [
          {word: s.D[0], x: 0, y: 0}, {word: s.D[1], x: 3, y: 0},
          {word: s.D[2], x: 0, y: 3}, {word: s.D[3], x: 3, y: 3},
        ];
        downs.forEach(dw => {
          words.push({word: dw.word, x: dw.x, y: dw.y, d: "D"});
          for (let k = 0; k < 4; k++) {
            const y = dw.y + k;
            cells[y][dw.x] = cells[y][dw.x] || {sol: "", letter: "", num: null};
            cells[y][dw.x].sol = dw.word[k];
          }
        });
        // numbering: reading order, cells that start a word
        let num = 1;
        const startKey = (w) => w.x + "," + w.y + "," + w.d;
        const startAt = {};
        words.forEach(w => {
          startAt[startKey(w)] = Infinity;
        });
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          if (!cells[y][x]) continue;
          let starts = false;
          words.forEach(w => {
            if (w.x === x && w.y === y) {
              starts = true;
              startAt[startKey(w)] = num;
            }
          });
          if (starts) {
            cells[y][x].num = num;
            num++;
          }
        }
        words.forEach(w => w.num = startAt[startKey(w)]);
        return {cells, words};
      }

      function generate() {
        set = SETS[Math.floor(Math.random() * SETS.length)];
        const layout = buildLayout(set);
        grid = layout.cells;
        words = layout.words;
        sel = null;
        dir = "A";
        render();
        statusEl.textContent = "Type letters into the grid — solve every word";
        statusEl.className = "status info";
      }

      let words = [];

      function wordCells(w) {
        const out = [];
        for (let i = 0; i < w.word.length; i++) {
          out.push([w.x + (w.d === "A" ? i : 0), w.y + (w.d === "D" ? i : 0)]);
        }
        return out;
      }

      function activeWord() {
        if (!sel) return null;
        const opts = words.filter(w => wordCells(w).some(([x, y]) => x === sel[0] && y === sel[1]));
        if (!opts.length) return null;
        return opts.find(w => w.d === dir) || opts[0];
      }

      function typeLetter(ch) {
        if (!sel) return;
        const c = grid[sel[1]][sel[0]];
        if (!c) return;
        c.letter = ch.toUpperCase();
        AudioFX.click();
        const w = activeWord();
        if (w) {
          const idx = wordCells(w).findIndex(([x, y]) => x === sel[0] && y === sel[1]);
          if (idx < w.word.length - 1) sel = wordCells(w)[idx + 1];
        }
        render();
        checkWin();
      }

      function checkWin() {
        const done = words.every(w => wordCells(w).every(([x, y], i) => grid[y][x].letter === w.word[i]));
        if (done) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("crossword", best);
          }
          statusEl.textContent = "✏️ Crossword solved! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 2100);
        }
      }

      function render() {
        root.querySelector("#cw2-solved").textContent = solvedCount;
        root.querySelector("#cw2-best").textContent = best;
        let html = `<div class="cw2-grid" style="grid-template-columns:repeat(${COLS},44px);">`;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
          const c = grid[y][x];
          const isSel = sel && sel[0] === x && sel[1] === y;
          html += `<div class="cw2-cell ${c ? "open" : "block"} ${isSel ? "sel" : ""}" data-x="${x}" data-y="${y}">
            ${c && c.num ? `<span class="num">${c.num}</span>` : ""}${c ? (c.letter || "") : ""}</div>`;
        }
        html += `</div>`;
        const w = activeWord();
        html += `<div class="cw2-clues"><h4>Across</h4>`;
        words.filter(x => x.d === "A").forEach(x => {
          const ok = wordCells(x).every(([cx, cy], i) => grid[cy][cx].letter === x.word[i]);
          html += `<div class="cw2-clue ${ok ? "done" : ""} ${w === x ? "hot" : ""}" data-w="${x.word}">${x.num}. ${set.clues[x.word]}</div>`;
        });
        html += `<h4>Down</h4>`;
        words.filter(x => x.d === "D").forEach(x => {
          const ok = wordCells(x).every(([cx, cy], i) => grid[cy][cx].letter === x.word[i]);
          html += `<div class="cw2-clue ${ok ? "done" : ""} ${w === x ? "hot" : ""}" data-w="${x.word}">${x.num}. ${set.clues[x.word]}</div>`;
        });
        html += `</div>`;
        wrap.innerHTML = html;
        wrap.querySelectorAll(".cw2-cell.open").forEach(el => {
          el.addEventListener("pointerdown", () => {
            const x = +el.dataset.x, y = +el.dataset.y;
            if (sel && sel[0] === x && sel[1] === y) dir = dir === "A" ? "D" : "A";
            const opts = words.filter(w2 => wordCells(w2).some(([cx, cy]) => cx === x && cy === y));
            if (opts.length) dir = opts.find(o => o.d === dir) ? dir : opts[0].d;
            sel = [x, y];
            render();
          });
        });
        wrap.querySelectorAll(".cw2-clue").forEach(el => {
          el.addEventListener("pointerdown", () => {
            const w2 = words.find(x => x.word === el.dataset.w);
            if (w2) {
              sel = [w2.x, w2.y];
              dir = w2.d;
              render();
            }
          });
        });
      }

      const onKey = (e) => {
        if (/^[a-zA-Z]$/.test(e.key)) typeLetter(e.key);
        if (e.key === "Backspace" && sel) {
          const c = grid[sel[1]][sel[0]];
          if (c) {
            c.letter = "";
            render();
          }
        }
      };
      document.addEventListener("keydown", onKey);
      root.querySelector("#cw2-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Mini Crossword",
        `A bite-sized crossword: three across words and four down words interlock in two square rings.
        Click a white square and <b>type</b> — the active clue lights up on the right. Click the same square again
        to flip between <b>across</b> and <b>down</b>, or click a clue directly.
        <br><br><b>Backspace</b> erases. Solved clues get struck through; fill everything correctly to win.
        Ten puzzles, rotated randomly.`);
    },
  });
})();
