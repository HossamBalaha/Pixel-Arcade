/* Kakuro 15 — a mini kakuro on a 6×6 grid whose clue sums stay small (≤ 15
   wherever the layout allows; that's the "15"). Fill every white cell with a
   digit 1–9 so each horizontal/vertical run of white cells has NO repeated
   digit and sums exactly to its clue.
   Generator: (1) search for a random white/black layout (row 0 & column 0 are
   the clue rail) where every run has 2–4 cells; (2) fill the white cells by
   randomized backtracking with distinct digits per run, preferring small digits
   and retrying until all run sums are ≤ 15; (3) blank the cells for the player.
   The generated fill is kept as the known solution, so the puzzle is always
   solvable; any fill satisfying all clues counts as a win. */
(function () {
  "use strict";
  const R = 6, C = 6, MAX_SUM = 15;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // Valid 5-cell row patterns for the interior (cols 1–5): every maximal white
  // run is 2–4 long. "0" = white, "1" = black.
  const ROW_PATTERNS = (function () {
    const pats = [];
    for (let m = 0; m < 32; m++) {
      const s = m.toString(2).padStart(5, "0");
      let ok = true, run = 0;
      for (let i = 0; i <= 5; i++) {
        const isBlack = i === 5 || s[i] === "1";
        if (!isBlack) run++;
        else {
          if (run === 1 || run > 4) {
            ok = false;
            break;
          }
          run = 0;
        }
      }
      if (ok) pats.push(s);
    }
    return pats;
  })();

  // Randomized backtracking over row patterns; column runs are checked as we go.
  // Tiers ask for progressively fuller layouts (min runs / min whites).
  function genLayout(minRuns, minWhites, attempts) {
    for (let attempt = 0; attempt < attempts; attempt++) {
      const black = Array.from({length: R}, () => Array(C).fill(false));
      for (let c = 0; c < C; c++) black[0][c] = true; // clue rail
      for (let r = 0; r < R; r++) black[r][0] = true; // clue rail
      let found = false;

      function bt(row, runLen) {
        if (found) return;
        if (row === R) {
          for (let c = 1; c < C; c++) if (runLen[c] === 1) return;
          found = true;
          return;
        }
        const pats = shuffle(ROW_PATTERNS.slice());
        for (const pat of pats) {
          if (found) return;
          const nr = runLen.slice();
          let ok = true;
          for (let i = 0; i < 5; i++) {
            if (pat[i] === "0") {
              nr[i + 1]++;
              if (nr[i + 1] > 4) {
                ok = false;
                break;
              }
            } else {
              if (nr[i + 1] === 1) {
                ok = false;
                break;
              }
              nr[i + 1] = 0;
            }
          }
          if (!ok) continue;
          for (let i = 0; i < 5; i++) black[row][i + 1] = pat[i] === "1";
          bt(row + 1, nr);
          if (found) return;
        }
      }

      bt(1, [0, 0, 0, 0, 0, 0]);
      if (!found) continue;
      const runs = extractRuns(black);
      let whites = 0;
      for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (!black[r][c]) whites++;
      if (whites < minWhites) continue;
      if (runs.across.length + runs.down.length < minRuns) continue;
      return {black, across: runs.across, down: runs.down, whites};
    }
    return null;
  }

  function extractRuns(black) {
    const across = [], down = [];
    for (let r = 1; r < R; r++) {
      let c = 1;
      while (c < C) {
        if (black[r][c]) {
          c++;
          continue;
        }
        let c2 = c;
        while (c2 < C && !black[r][c2]) c2++;
        const cells = [];
        for (let cc = c; cc < c2; cc++) cells.push([r, cc]);
        across.push({r, c, len: c2 - c, cells, clueAt: [r, c - 1]});
        c = c2;
      }
    }
    for (let c = 1; c < C; c++) {
      let r = 1;
      while (r < R) {
        if (black[r][c]) {
          r++;
          continue;
        }
        let r2 = r;
        while (r2 < R && !black[r2][c]) r2++;
        const cells = [];
        for (let rr = r; rr < r2; rr++) cells.push([rr, c]);
        down.push({r, c, len: r2 - r, cells, clueAt: [r - 1, c]});
        r = r2;
      }
    }
    return {across, down};
  }

  // Randomized backtracking fill: distinct digits within each run.
  function tryFill(layout) {
    const {black, across, down} = layout;
    const aId = {}, dId = {};
    across.forEach((run, i) => run.cells.forEach(([r, c]) => {
      aId[r + "," + c] = i;
    }));
    down.forEach((run, i) => run.cells.forEach(([r, c]) => {
      dId[r + "," + c] = i;
    }));
    const cells = [];
    for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (!black[r][c]) cells.push([r, c]);
    const usedA = across.map(() => new Set());
    const usedD = down.map(() => new Set());
    const G = Array.from({length: R}, () => Array(C).fill(0));
    let nodes = 0;

    function digitOrder() { // small digits first, randomly
      const pool = shuffle([1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9]);
      const seen = new Set(), out = [];
      for (const d of pool) if (!seen.has(d)) {
        seen.add(d);
        out.push(d);
      }
      return out;
    }

    function dfs(i) {
      if (i === cells.length) return true;
      if (++nodes > 120000) return false;
      const r = cells[i][0], c = cells[i][1];
      const a = aId[r + "," + c], d = dId[r + "," + c];
      for (const v of digitOrder()) {
        if (usedA[a].has(v) || usedD[d].has(v)) continue;
        usedA[a].add(v);
        usedD[d].add(v);
        G[r][c] = v;
        if (dfs(i + 1)) return true;
        usedA[a].delete(v);
        usedD[d].delete(v);
        G[r][c] = 0;
      }
      return false;
    }

    if (!dfs(0)) return null;
    return G;
  }

  function withSums(layout, G) {
    const across = layout.across.map(run => Object.assign({}, run, {sum: run.cells.reduce((s, [r, c]) => s + G[r][c], 0)}));
    const down = layout.down.map(run => Object.assign({}, run, {sum: run.cells.reduce((s, [r, c]) => s + G[r][c], 0)}));
    return {black: layout.black, across, down};
  }

  function genLayoutTiered() {
    // Prefer fuller layouts, then relax tier by tier until one is found.
    const tiers = [[12, 16, 250], [11, 15, 200], [10, 14, 150], [8, 12, 100]];
    for (const tier of tiers) {
      const layout = genLayout(tier[0], tier[1], tier[2]);
      if (layout) return layout;
    }
    return genLayout(0, 0, 200);
  }

  function genPuzzle() {
    for (let layoutAttempt = 0; layoutAttempt < 10; layoutAttempt++) {
      const layout = genLayoutTiered();
      if (!layout) break;
      let best = null, bestBad = Infinity;
      for (let t = 0; t < 90; t++) {
        const G = tryFill(layout);
        if (!G) break;
        const p = withSums(layout, G);
        const bad = p.across.concat(p.down).filter(run => run.sum > MAX_SUM).length;
        if (bad === 0) return {puz: p, sol: G};
        if (bad < bestBad) {
          bestBad = bad;
          best = {puz: p, sol: G};
        }
      }
      if (best) return best;
    }
    // Hand-verified fallback: four 2×2 blocks separated by a black cross.
    const black = Array.from({length: R}, () => Array(C).fill(false));
    for (let c = 0; c < C; c++) black[0][c] = true;
    for (let r = 0; r < R; r++) black[r][0] = true;
    for (let i = 0; i < 5; i++) {
      black[3][i + 1] = true;
      black[i + 1][3] = true;
    }
    const G = Array.from({length: R}, () => Array(C).fill(0));
    const blocks = [[1, 1], [1, 4], [4, 1], [4, 4]];
    const sets = [[1, 2, 3, 4], [2, 3, 4, 5], [1, 3, 5, 2], [4, 1, 2, 5]];
    blocks.forEach(([br, bc], i) => {
      G[br][bc] = sets[i][0];
      G[br][bc + 1] = sets[i][1];
      G[br + 1][bc] = sets[i][2];
      G[br + 1][bc + 1] = sets[i][3];
    });
    return {
      puz: withSums({black, across: extractRuns(black).across, down: extractRuns(black).down, whites: 16}, G),
      sol: G
    };
  }

  let live = null;
  GameRegistry.register({
    id: "kakuro15",
    name: "Kakuro 15",
    icon: "➕",
    category: "logic",
    description: "Mini kakuro with small sums — fill runs of distinct digits 1–9 to match every clue",
    tags: ["logic", "puzzle", "math", "kakuro"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, sol = null, user = null, locked = null, sel = null, over = false;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Runs done</div><div class="val" id="k15-runs">0 / 0</div></div>
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="k15-filled">0 / 0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="k15-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="k15-best">—</div></div>
        </div>
        <div class="status info" id="k15-status">Fill the white cells. Every run of white cells must sum to its clue with no repeated digit.</div>
        <div class="center" style="margin:12px 0;"><div class="k15-grid" id="k15-grid"></div></div>
        <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn" id="k15-new">New puzzle</button>
          <button class="btn" id="k15-clear">Clear</button>
          <button class="btn primary" id="k15-check">Check</button>
        </div>
        <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;margin-top:8px;" id="k15-pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button class="btn" data-d="${d}" style="min-width:38px;">${d}</button>`).join("")}
          <button class="btn" id="k15-erase" style="min-width:38px;">⌫</button>
        </div>
        <p class="hint">Digits 1–9, <b>no repeats within a run</b>. The clue in the top-left triangle of a dark cell applies to the run <b>below</b> it; the bottom-right triangle applies to the run to its <b>right</b>. Sums stay ≤ 15 wherever possible.</p>
      `;
      const statusEl = root.querySelector("#k15-status");
      const gridEl = root.querySelector("#k15-grid");

      if (!document.getElementById("k15-style")) {
        const s = document.createElement("style");
        s.id = "k15-style";
        s.textContent = `
          .k15-grid { display: inline-grid; grid-template-columns: repeat(${C}, 52px); grid-auto-rows: 52px; gap: 2px; background: var(--border); padding: 3px; border-radius: var(--radius); }
          .k15-black { background: var(--bg-soft); position: relative; }
          .k15-black.clue { background: linear-gradient(to bottom right, var(--bg-soft) 49.6%, var(--text-muted) 50%, var(--bg-soft) 50.4%); }
          .k15-down, .k15-across { position: absolute; font-family: var(--font-mono); font-weight: 700; font-size: 0.72rem; line-height: 1; }
          .k15-down { top: 4px; left: 5px; color: var(--accent); }
          .k15-across { bottom: 4px; right: 5px; color: var(--warning); }
          .k15-down.ok, .k15-across.ok { color: var(--success); }
          .k15-down.bad, .k15-across.bad { color: var(--danger); }
          .k15-white { background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.2rem; cursor: pointer; user-select: none; color: var(--text); }
          .k15-white.active { outline: 3px solid var(--accent); outline-offset: -2px; }
          .k15-white.hinted { color: var(--accent); }
          .k15-white.selhint { background: var(--bg-soft); }
        `;
        document.head.appendChild(s);
      }

      function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#k15-time");
          if (t) t.textContent = time + "s";
        }, 1000);
      }

      function whiteCellList() {
        const list = [];
        for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (!puz.black[r][c]) list.push([r, c]);
        return list;
      }

      // Per-run live status: done (complete + correct) / over (impossible)
      function runStates() {
        const states = [];
        for (const run of puz.across.concat(puz.down)) {
          const vals = run.cells.map(([r, c]) => user[r][c]);
          const filled = vals.filter(v => v).length;
          const sum = vals.reduce((a, b) => a + b, 0);
          const dup = new Set(vals.filter(v => v)).size !== filled;
          states.push({
            done: filled === run.len && sum === run.sum && !dup,
            over: dup || sum > run.sum || (filled === run.len && sum !== run.sum),
          });
        }
        return states;
      }

      function render() {
        gridEl.innerHTML = "";
        // clue lookup: "r,c" -> {down: run, across: run}
        const clueMap = {};
        puz.down.forEach(run => {
          const k = run.clueAt[0] + "," + run.clueAt[1];
          (clueMap[k] = clueMap[k] || {}).down = run;
        });
        puz.across.forEach(run => {
          const k = run.clueAt[0] + "," + run.clueAt[1];
          (clueMap[k] = clueMap[k] || {}).across = run;
        });
        const states = runStates();
        const allRuns = puz.across.concat(puz.down);
        const doneCount = states.filter(s => s.done).length;

        for (let r = 0; r < R; r++) {
          for (let c = 0; c < C; c++) {
            if (puz.black[r][c]) {
              const cell = document.createElement("div");
              const clue = clueMap[r + "," + c];
              if (clue) {
                cell.className = "k15-black clue";
                if (clue.down) {
                  const d = document.createElement("div");
                  d.className = "k15-down";
                  d.textContent = clue.down.sum;
                  const st = states[allRuns.indexOf(clue.down)];
                  if (st && st.done) d.classList.add("ok");
                  if (st && st.over) d.classList.add("bad");
                  cell.appendChild(d);
                }
                if (clue.across) {
                  const a = document.createElement("div");
                  a.className = "k15-across";
                  a.textContent = clue.across.sum;
                  const st = states[allRuns.indexOf(clue.across)];
                  if (st && st.done) a.classList.add("ok");
                  if (st && st.over) a.classList.add("bad");
                  cell.appendChild(a);
                }
              } else {
                cell.className = "k15-black";
              }
              gridEl.appendChild(cell);
            } else {
              const cell = document.createElement("div");
              cell.className = "k15-white";
              if (locked[r][c]) cell.classList.add("hinted");
              if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
              const v = user[r][c];
              if (v) cell.textContent = v;
              cell.addEventListener("click", () => {
                if (over) return;
                sel = [r, c];
                AudioFX.tick();
                render();
              });
              gridEl.appendChild(cell);
            }
          }
        }
        const whites = whiteCellList();
        const filled = whites.filter(([r, c]) => user[r][c]).length;
        root.querySelector("#k15-runs").textContent = doneCount + " / " + allRuns.length;
        root.querySelector("#k15-filled").textContent = filled + " / " + whites.length;
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Solved in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("kakuro15");
        if (best === null || time < best) {
          Storage.setBest("kakuro15", time);
          root.querySelector("#k15-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function autoCheck() {
        if (over) return;
        const whites = whiteCellList();
        if (!whites.every(([r, c]) => user[r][c])) return;
        if (runStates().every(s => s.done)) win();
      }

      function place(d) {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (puz.black[r][c] || locked[r][c]) return;
        user[r][c] = d;
        AudioFX.pop();
        // advance to the next empty white cell
        const whites = whiteCellList();
        for (let i = 0; i < whites.length; i++) {
          const [rr, cc] = whites[i];
          if (rr === r && cc === c) {
            for (let j = i + 1; j < whites.length; j++) {
              if (!user[whites[j][0]][whites[j][1]]) {
                sel = [whites[j][0], whites[j][1]];
                break;
              }
            }
            break;
          }
        }
        render();
        autoCheck();
      }

      function erase() {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (puz.black[r][c] || locked[r][c]) return;
        user[r][c] = 0;
        AudioFX.click();
        render();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          const whites = whiteCellList();
          if (!whites.length) return;
          if (!sel) {
            sel = whites[0];
            render();
            return;
          }
          let idx = whites.findIndex(([r, c]) => r === sel[0] && c === sel[1]);
          if (idx < 0) idx = 0;
          if (e.key === "ArrowUp") {
            for (let i = idx - 1; i >= 0; i--) if (whites[i][0] < sel[0] && whites[i][1] === sel[1]) {
              sel = whites[i];
              break;
            }
          }
          if (e.key === "ArrowDown") {
            for (let i = idx + 1; i < whites.length; i++) if (whites[i][0] > sel[0] && whites[i][1] === sel[1]) {
              sel = whites[i];
              break;
            }
          }
          if (e.key === "ArrowLeft") {
            for (let i = idx - 1; i >= 0; i--) if (whites[i][1] < sel[1] && whites[i][0] === sel[0]) {
              sel = whites[i];
              break;
            }
          }
          if (e.key === "ArrowRight") {
            for (let i = idx + 1; i < whites.length; i++) if (whites[i][1] > sel[1] && whites[i][0] === sel[0]) {
              sel = whites[i];
              break;
            }
          }
          AudioFX.tick();
          render();
          return;
        }
        if (/^[1-9]$/.test(e.key)) {
          place(parseInt(e.key, 10));
          return;
        }
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      }

      document.addEventListener("keydown", onKey);

      function check() {
        if (over) return;
        const whites = whiteCellList();
        const filled = whites.filter(([r, c]) => user[r][c]).length;
        if (filled < whites.length) {
          AudioFX.error();
          statusEl.textContent = "Fill every white cell first (" + filled + " / " + whites.length + ").";
          statusEl.className = "status lose";
          return;
        }
        const states = runStates();
        const bad = states.filter(s => !s.done).length;
        if (bad > 0) {
          AudioFX.error();
          statusEl.textContent = bad + " run" + (bad === 1 ? "" : "s") + " don't match their clues (shown in red).";
          statusEl.className = "status lose";
          return;
        }
        win();
      }

      root.querySelector("#k15-check").addEventListener("click", check);
      root.querySelector("#k15-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) if (!locked[r][c]) user[r][c] = 0;
        AudioFX.click();
        render();
      });
      root.querySelector("#k15-new").addEventListener("click", () => newGame());
      root.querySelector("#k15-erase").addEventListener("click", erase);
      root.querySelectorAll("#k15-pad [data-d]").forEach(btn =>
        btn.addEventListener("click", () => place(parseInt(btn.dataset.d, 10))));

      function newGame() {
        const g = genPuzzle();
        puz = g.puz;
        sol = g.sol;
        user = Array.from({length: R}, () => Array(C).fill(0));
        locked = Array.from({length: R}, () => Array(C).fill(false));
        sel = null;
        over = false;
        time = 0;
        recorded = false;
        startTimer();
        const best = Storage.getBest("kakuro15");
        root.querySelector("#k15-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#k15-time").textContent = "0s";
        statusEl.textContent = "Fill the white cells. Every run of white cells must sum to its clue with no repeated digit.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !puz) return;
          const cands = [];
          for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) {
            if (!puz.black[r][c] && user[r][c] !== sol[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          user[pick[0]][pick[1]] = sol[pick[0]][pick[1]];
          locked[pick[0]][pick[1]] = true;
          AudioFX.reveal();
          App.toast("Hint: R" + (pick[0] + 1) + "C" + (pick[1] + 1) + " = " + sol[pick[0]][pick[1]], "info");
          render();
          autoCheck();
        },
        solve: function () {
          if (over || !puz) return;
          for (let r = 1; r < R; r++) for (let c = 1; c < C; c++) {
            if (!puz.black[r][c]) user[r][c] = sol[r][c];
          }
          over = true;
          clearInterval(timer);
          AudioFX.lose();
          statusEl.textContent = "Solution revealed.";
          statusEl.className = "status lose";
          if (!recorded) {
            recorded = true;
            App.recordResult(false, time);
          }
          render();
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        clearInterval(timer);
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
      App.showModal("How to play Kakuro 15",
        `A mini kakuro with small sums:
        <br><br>• Fill every <b>white</b> cell with a digit 1–9.
        <br>• The number in the <b>top-left triangle</b> of a dark cell is the sum of the white run directly <b>below</b> it.
        <br>• The number in the <b>bottom-right triangle</b> is the sum of the white run to its <b>right</b>.
        <br>• Within one run, digits may <b>never repeat</b>.
        <br><br>Click a cell (or move with <b>arrow keys</b>), then type or tap a digit. <b>Backspace</b> clears.
        <br>Clues turn <span style="color:var(--success)">green</span> when their run is complete and correct, <span style="color:var(--danger)">red</span> when a run is impossible (wrong sum or repeated digit).`);
    },
  });
})();
