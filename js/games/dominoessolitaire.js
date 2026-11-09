/* dominoessolitaire — the classic Domino Puzzle: a 7×8 grid of pip numbers that hides a tiling
   of all 28 double-six dominoes. Mark adjacent cells to rebuild the tiling. */
(function () {
  "use strict";
  const R = 7, C = 8, TOTAL = 28;
  const CELL = 42, GAP = 4, STEP = CELL + GAP;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  const key = function (a, b) {
    return Math.min(a, b) + "-" + Math.max(a, b);
  };

  // ---- generator: random tiling of 7x8 by all 28 dominoes (randomized backtracking), then random pair assignment
  function generatePuzzle() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const owner = Array.from({length: R}, function () {
        return Array(C).fill(-1);
      });
      const dominoes = [];

      function bt() {
        let r = -1, c = -1;
        outer: for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (owner[i][j] < 0) {
          r = i;
          c = j;
          break outer;
        }
        if (r < 0) return true;
        const dirs = [[0, 1], [1, 0]];
        if (Math.random() < 0.5) dirs.reverse();
        for (const d of dirs) {
          const r2 = r + d[0], c2 = c + d[1];
          if (r2 >= R || c2 >= C || owner[r2][c2] >= 0) continue;
          owner[r][c] = dominoes.length;
          owner[r2][c2] = dominoes.length;
          dominoes.push([r, c, r2, c2]);
          if (bt()) return true;
          dominoes.pop();
          owner[r][c] = -1;
          owner[r2][c2] = -1;
        }
        return false;
      }

      if (!bt() || dominoes.length !== TOTAL) continue;
      const pairs = [];
      for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) pairs.push([a, b]);
      shuffle(pairs);
      const values = Array.from({length: R}, function () {
        return Array(C).fill(0);
      });
      dominoes.forEach(function (d, i) {
        const pr = pairs[i];
        if (Math.random() < 0.5) {
          values[d[0]][d[1]] = pr[0];
          values[d[2]][d[3]] = pr[1];
        } else {
          values[d[0]][d[1]] = pr[1];
          values[d[2]][d[3]] = pr[0];
        }
      });
      return values;
    }
    return null; // practically unreachable
  }

  // ---- completer: extend the player's current marks to a full valid tiling (for hints)
  function completeTiling(values, markedIdx, used) {
    const owner = markedIdx.map(function (row) {
      return row.slice();
    });
    const out = [];
    let budget = {n: 200000};

    function bt() {
      if (budget.n-- <= 0) return false;
      let r = -1, c = -1;
      outer: for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) if (owner[i][j] === -1) {
        r = i;
        c = j;
        break outer;
      }
      if (r < 0) return true;
      const dirs = [[0, 1], [1, 0]];
      if (Math.random() < 0.5) dirs.reverse();
      for (const d of dirs) {
        const r2 = r + d[0], c2 = c + d[1];
        if (r2 >= R || c2 >= C || owner[r2][c2] !== -1) continue;
        const k = key(values[r][c], values[r2][c2]);
        if (used.has(k)) continue;
        owner[r][c] = 999;
        owner[r2][c2] = 999;
        out.push([r, c, r2, c2]);
        used.add(k);
        if (bt()) return true;
        used.delete(k);
        out.pop();
        owner[r][c] = -1;
        owner[r2][c2] = -1;
      }
      return false;
    }

    const ok = bt();
    if (!ok) return null;
    return out;
  }

  GameRegistry.register({
    id: "dominoessolitaire",
    name: "Dominoes Solitaire",
    icon: "🎲",
    category: "strategy",
    description: "The classic domino puzzle — find the hidden tiling of all 28 dominoes in the 7×8 pip grid.",
    tags: ["strategy", "puzzle", "dominoes", "solitaire"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let values, markedIdx, marks, used, sel, hintsUsed, recorded, won;

      root.innerHTML = `
        <style>
          #ds-grid-wrap { position:relative; width:${C * STEP - GAP}px; height:${R * STEP - GAP}px; margin:0 auto; }
          #ds-grid { display:grid; grid-template-columns:repeat(${C},${CELL}px); grid-template-rows:repeat(${R},${CELL}px);
            gap:${GAP}px; }
          .ds-cell { width:${CELL}px; height:${CELL}px; background:var(--bg-elev); border:1px solid var(--border);
            border-radius:8px; display:grid; place-items:center; font-family:var(--font-mono,monospace);
            font-size:1.35rem; font-weight:700; color:var(--text); cursor:pointer; user-select:none; }
          .ds-cell.sel { background:var(--accent); color:var(--bg-elev, #fff); }
          .ds-cell.err { animation:ds-err .45s; }
          @keyframes ds-err { 0%,100%{background:var(--bg-elev)} 30%{background:var(--danger); color:var(--text)} }
          .ds-mark { position:absolute; border:3px solid var(--accent); border-radius:10px; pointer-events:none;
            box-shadow:0 0 0 1px rgba(0,0,0,0.15) inset; background:rgba(127,127,127,0.07); }
          .ds-mark.hint { border-color:var(--warning); }
          .ds-mark.pulse { animation:ds-pulse .5s; }
          @keyframes ds-pulse { 50% { transform:scale(1.07); } }
          .ds-tracker { display:grid; grid-template-columns:repeat(7,1fr); gap:3px; max-width:${C * STEP - GAP}px; margin:10px auto 0; }
          .ds-mini { text-align:center; font-family:var(--font-mono,monospace); font-size:0.78rem; padding:2px 0;
            border-radius:5px; border:1px solid var(--border); background:var(--bg-soft); color:var(--text-muted); }
          .ds-mini.used { background:var(--accent); color:var(--bg-elev,#fff); border-color:var(--accent); font-weight:700; }
        </style>
        <div class="status info" id="ds-status">Find the hidden dominoes — 0 / 28 marked</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Marked</div><div class="val" id="ds-count">0 / 28</div></div>
          <div class="score-cell"><div class="label">Hints used</div><div class="val" id="ds-hints">0</div></div>
        </div>
        <div id="ds-grid-wrap">
          <div id="ds-grid"></div>
          <div id="ds-marks"></div>
        </div>
        <div class="ds-tracker" id="ds-tracker"></div>
        <p class="hint">Click two orthogonally adjacent cells to mark them as one domino. Each of the 28 dominoes may be used once.</p>
        <div class="row center" style="gap:10px;margin-top:10px;">
          <button class="btn" id="ds-new">New puzzle</button>
          <button class="btn" id="ds-undo">Undo</button>
          <button class="btn primary" id="ds-hint">Hint</button>
        </div>
      `;

      const gridEl = root.querySelector("#ds-grid");
      const marksEl = root.querySelector("#ds-marks");
      const trackerEl = root.querySelector("#ds-tracker");
      const statusEl = root.querySelector("#ds-status");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function newPuzzle() {
        values = generatePuzzle();
        markedIdx = Array.from({length: R}, function () {
          return Array(C).fill(-1);
        });
        marks = [];
        used = new Set();
        sel = null;
        hintsUsed = 0;
        recorded = false;
        won = false;
        setStatus("Find the hidden dominoes — 0 / 28 marked");
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        marksEl.innerHTML = "";
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
          const d = document.createElement("div");
          d.className = "ds-cell" + (sel && sel[0] === r && sel[1] === c ? " sel" : "");
          d.textContent = values[r][c];
          d.addEventListener("click", function () {
            onCell(r, c, d);
          });
          gridEl.appendChild(d);
        }
        marks.forEach(function (m, i) {
          const horiz = m.r1 === m.r2;
          const w = horiz ? CELL * 2 + GAP : CELL;
          const h = horiz ? CELL : CELL * 2 + GAP;
          const left = Math.min(m.c1, m.c2) * STEP, top = Math.min(m.r1, m.r2) * STEP;
          const box = document.createElement("div");
          box.className = "ds-mark" + (m.hint ? " hint" : "");
          box.style.cssText = "left:" + left + "px;top:" + top + "px;width:" + w + "px;height:" + h + "px;";
          box.dataset.i = i;
          marksEl.appendChild(box);
        });
        // tracker
        trackerEl.innerHTML = "";
        for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) {
          const t = document.createElement("div");
          t.className = "ds-mini" + (used.has(key(a, b)) ? " used" : "");
          t.textContent = a + "·" + b;
          trackerEl.appendChild(t);
        }
        root.querySelector("#ds-count").textContent = marks.length + " / " + TOTAL;
        root.querySelector("#ds-hints").textContent = hintsUsed;
      }

      function onCell(r, c, el) {
        if (won) return;
        const mi = markedIdx[r][c];
        if (mi >= 0) { // already marked — pulse its domino
          const box = marksEl.querySelector('[data-i="' + mi + '"]');
          if (box) {
            box.classList.remove("pulse");
            void box.offsetWidth;
            box.classList.add("pulse");
          }
          AudioFX.tick();
          return;
        }
        if (sel && sel[0] === r && sel[1] === c) {
          sel = null;
          render();
          return;
        }
        if (!sel) {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        const adj = Math.abs(sel[0] - r) + Math.abs(sel[1] - c) === 1;
        if (!adj) {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        const a = values[sel[0]][sel[1]], b = values[r][c];
        const k = key(a, b);
        if (used.has(k)) {
          AudioFX.error();
          setStatus("The " + Math.min(a, b) + "·" + Math.max(a, b) + " domino is already used — pick another pair", "warning");
          flash(sel, [r, c]);
          sel = null;
          render();
          return;
        }
        markDomino(sel[0], sel[1], r, c, false);
      }

      function flash(p1, p2) {
        [p1, p2].forEach(function (p) {
          const idx = p[0] * C + p[1];
          const cell = gridEl.children[idx];
          if (cell) {
            cell.classList.remove("err");
            void cell.offsetWidth;
            cell.classList.add("err");
          }
        });
      }

      function markDomino(r1, c1, r2, c2, isHint) {
        const a = values[r1][c1], b = values[r2][c2];
        used.add(key(a, b));
        marks.push({r1: r1, c1: c1, r2: r2, c2: c2, hint: !!isHint});
        markedIdx[r1][c1] = markedIdx[r2][c2] = marks.length - 1;
        sel = null;
        AudioFX.place();
        if (marks.length >= TOTAL) {
          won = true;
          setStatus("🎉 All 28 dominoes found — puzzle solved!", "win");
          AudioFX.win();
          if (!recorded) {
            recorded = true;
            const score = Math.max(20, 100 - hintsUsed * 10);
            App.recordResult(true, score);
            App.toast("Solved! " + (hintsUsed ? "with " + hintsUsed + " hint(s)" : "without hints"), "success");
          }
        } else {
          setStatus("Find the hidden dominoes — " + marks.length + " / " + TOTAL + " marked");
        }
        render();
      }

      function doHint() {
        if (won) return;
        // find an unmarked pair that keeps the puzzle completable (search on a COPY of the used set)
        const completion = completeTiling(values, markedIdx, new Set(used));
        let pick = null;
        if (completion && completion.length) {
          pick = completion[0];
        } else {
          // fallback: any adjacent unmarked pair forming an unused domino
          outer: for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
            if (markedIdx[r][c] >= 0) continue;
            for (const d of [[0, 1], [1, 0]]) {
              const r2 = r + d[0], c2 = c + d[1];
              if (r2 >= R || c2 >= C || markedIdx[r2][c2] >= 0) continue;
              if (!used.has(key(values[r][c], values[r2][c2]))) {
                pick = [r, c, r2, c2];
                break outer;
              }
            }
          }
        }
        if (!pick) {
          App.toast("No domino can be marked — this position is stuck. Undo some marks or start a New puzzle!", "warning");
          AudioFX.error();
          return;
        }
        if (!completion) setStatus("Couldn't verify a full solution from here — revealing a valid pair anyway", "warning");
        hintsUsed++;
        AudioFX.reveal();
        markDomino(pick[0], pick[1], pick[2], pick[3], true);
      }

      root.querySelector("#ds-new").addEventListener("click", function () {
        AudioFX.click();
        newPuzzle();
      });
      root.querySelector("#ds-hint").addEventListener("click", doHint);
      root.querySelector("#ds-undo").addEventListener("click", function () {
        if (won || !marks.length) return;
        const m = marks.pop();
        markedIdx[m.r1][m.c1] = -1;
        markedIdx[m.r2][m.c2] = -1;
        used.delete(key(values[m.r1][m.c1], values[m.r2][m.c2]));
        sel = null;
        AudioFX.flip();
        setStatus("Undone — " + marks.length + " / " + TOTAL + " marked");
        render();
      });

      newPuzzle();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Dominoes Solitaire",
        `This is the classic <b>domino puzzle</b>. The 7×8 grid of numbers was created by laying out <b>all 28 dominoes</b> of a double-six set (0·0 up to 6·6, each exactly once) and then hiding the borders.
        <br><br><b>Your job:</b> reconstruct the tiling. Click a cell, then click an orthogonally adjacent cell — the pair gets framed as one domino.
        <br><br><b>Rules:</b> the two numbers must form a domino that hasn't been used yet (each unordered pair 0·0 … 6·6 appears exactly once). Marking an already-used pair flashes red and is undone. Clicking a framed domino pulses it so you can see what you found.
        <br><br>The tracker under the grid shows all 28 dominoes — they light up as you use them.
        <br><br><b>Hint</b> reveals one domino that keeps the puzzle completable (each hint costs score). <b>Undo</b> removes your last mark if you hit a dead end. <b>New puzzle</b> generates a fresh random tiling. Solve all 28 to win!`);
    },
  });
})();
