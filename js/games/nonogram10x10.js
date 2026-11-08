/* Nonogram 10×10 (Picross) — reveal the hidden picture using the row and column
   run-length clues.
   Generator: seed the grid with random rectangles plus a sprinkle of singles,
   then run one "growth" pass so the pattern forms blobby, picture-like clusters.
   Clues are computed from that pattern, which is kept as the known solution —
   any grid matching all 20 clues wins. */
(function () {
  "use strict";
  const N = 10;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function genPattern() {
    for (let attempt = 0; attempt < 200; attempt++) {
      const g = Array.from({length: N}, () => Array(N).fill(0));
      const rects = 5 + Math.floor(Math.random() * 3); // 5–7 blobs
      for (let i = 0; i < rects; i++) {
        const w = 1 + Math.floor(Math.random() * 4);
        const h = 1 + Math.floor(Math.random() * 4);
        const r = Math.floor(Math.random() * (N - h + 1));
        const c = Math.floor(Math.random() * (N - w + 1));
        for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) g[r + dr][c + dc] = 1;
      }
      const sprinkle = 5 + Math.floor(Math.random() * 8);
      for (let i = 0; i < sprinkle; i++) {
        g[Math.floor(Math.random() * N)][Math.floor(Math.random() * N)] = 1;
      }
      // growth pass: fill holes with ≥2 filled neighbours for blobbiness
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (g[r][c]) continue;
        let nb = 0;
        if (r > 0 && g[r - 1][c]) nb++;
        if (r < N - 1 && g[r + 1][c]) nb++;
        if (c > 0 && g[r][c - 1]) nb++;
        if (c < N - 1 && g[r][c + 1]) nb++;
        if (nb >= 2 && Math.random() < 0.55) g[r][c] = 1;
      }
      const count = g.flat().filter(v => v).length;
      if (count >= 34 && count <= 66) return g;
    }
    // Fallback: a diamond (never reached in practice)
    return Array.from({length: N}, (_, r) =>
      Array.from({length: N}, (_, c) => (Math.abs(r - 4.5) + Math.abs(c - 4.5) < 7.5) ? 1 : 0));
  }

  function cluesFromLine(line) {
    const c = [];
    let run = 0;
    for (const v of line) {
      if (v === 1) run++;
      else {
        if (run) c.push(run);
        run = 0;
      }
    }
    if (run) c.push(run);
    return c.length ? c : [0];
  }

  // runs of the player's FILLED cells (marks are ignored)
  function runsOfLine(line) {
    return cluesFromLine(line.map(v => (v === 1 ? 1 : 0)));
  }

  function linesMatch(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  let live = null;
  GameRegistry.register({
    id: "nonogram10x10",
    name: "Nonogram 10x10",
    icon: "⬜",
    category: "logic",
    description: "10×10 Picross — fill cells to match the row & column run clues and reveal a picture",
    tags: ["logic", "puzzle", "picross", "picture"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let sol = null, grid = null, over = false, sel = null;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="n10-filled">0</div></div>
          <div class="score-cell"><div class="label">Lines done</div><div class="val" id="n10-lines">0 / 20</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="n10-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="n10-best">—</div></div>
        </div>
        <div class="status info" id="n10-status">Click a cell to fill it, click again to mark it empty (✕). Satisfy every row &amp; column clue.</div>
        <div class="center" style="margin:12px 0;"><div class="n10-wrap" id="n10-wrap"></div></div>
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;">
          <button class="btn" id="n10-new">New puzzle</button>
          <button class="btn" id="n10-clear">Clear</button>
          <button class="btn primary" id="n10-check">Check</button>
        </div>
        <p class="hint">Numbers list the lengths of consecutive filled runs in that line, in order. Clues turn <b>green</b> when satisfied and <b>red</b> when over-filled. Arrow keys move, <b>F</b> fills, <b>X</b> marks, <b>Space</b> cycles.</p>
      `;
      const statusEl = root.querySelector("#n10-status");
      const wrapEl = root.querySelector("#n10-wrap");

      if (!document.getElementById("n10-style")) {
        const s = document.createElement("style");
        s.id = "n10-style";
        s.textContent = `
          .n10-wrap { display: inline-grid; grid-template-columns: 62px repeat(${N}, 32px); grid-template-rows: auto repeat(${N}, 32px); gap: 2px; }
          .n10-corner { width: 62px; }
          .n10-colclue { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 3px; font-family: var(--font-mono); font-size: 0.72rem; line-height: 1.15; color: var(--text-muted); }
          .n10-rowclue { display: flex; align-items: center; justify-content: flex-end; gap: 4px; padding-right: 5px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); }
          .n10-colclue.done, .n10-rowclue.done { color: var(--success); font-weight: 700; }
          .n10-colclue.over, .n10-rowclue.over { color: var(--danger); font-weight: 700; }
          .n10-cell { width: 32px; height: 32px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-size: 0.85rem; color: var(--text-muted); }
          .n10-cell.filled { background: var(--text); border-color: var(--text); }
          .n10-cell.marked::after { content: "✕"; }
          .n10-cell.active { outline: 2px solid var(--accent); outline-offset: -2px; }
          .n10-cell:hover { border-color: var(--accent); }
        `;
        document.head.appendChild(s);
      }

      function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#n10-time");
          if (t) t.textContent = time + "s";
        }, 1000);
      }

      function rowClue(r) {
        return cluesFromLine(sol[r]);
      }

      function colClue(c) {
        return cluesFromLine(sol.map(row => row[c]));
      }

      function lineStates() {
        const rows = [], cols = [];
        for (let r = 0; r < N; r++) {
          const need = rowClue(r).reduce((a, b) => a + b, 0);
          const filled = grid[r].filter(v => v === 1).length;
          rows.push({
            done: linesMatch(runsOfLine(grid[r]), rowClue(r)),
            over: filled > need,
          });
        }
        for (let c = 0; c < N; c++) {
          const col = grid.map(row => row[c]);
          const need = colClue(c).reduce((a, b) => a + b, 0);
          const filled = col.filter(v => v === 1).length;
          cols.push({
            done: linesMatch(runsOfLine(col), colClue(c)),
            over: filled > need,
          });
        }
        return {rows, cols};
      }

      function render() {
        wrapEl.innerHTML = "";
        const st = lineStates();
        wrapEl.appendChild(el("div", "n10-corner"));
        for (let c = 0; c < N; c++) {
          const d = el("div", "n10-colclue");
          if (st.cols[c].done) d.classList.add("done");
          else if (st.cols[c].over) d.classList.add("over");
          d.innerHTML = colClue(c).map(n => "<span>" + n + "</span>").join("");
          wrapEl.appendChild(d);
        }
        for (let r = 0; r < N; r++) {
          const rc = el("div", "n10-rowclue");
          if (st.rows[r].done) rc.classList.add("done");
          else if (st.rows[r].over) rc.classList.add("over");
          rc.textContent = rowClue(r).join(" ");
          wrapEl.appendChild(rc);
          for (let c = 0; c < N; c++) {
            const cell = el("div", "n10-cell");
            const v = grid[r][c];
            if (v === 1) cell.classList.add("filled");
            if (v === 2) cell.classList.add("marked");
            if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
            cell.addEventListener("click", () => onCell(r, c, "cycle"));
            cell.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              onCell(r, c, "mark");
            });
            wrapEl.appendChild(cell);
          }
        }
        root.querySelector("#n10-filled").textContent = grid.flat().filter(v => v === 1).length;
        const done = st.rows.filter(s => s.done).length + st.cols.filter(s => s.done).length;
        root.querySelector("#n10-lines").textContent = done + " / " + (2 * N);
      }

      function el(tag, cls) {
        const d = document.createElement(tag);
        d.className = cls;
        return d;
      }

      function onCell(r, c, mode) {
        if (over) return;
        sel = [r, c];
        if (mode === "mark") {
          grid[r][c] = grid[r][c] === 2 ? 0 : 2;
        } else {
          grid[r][c] = (grid[r][c] + 1) % 3; // 0 empty → 1 filled → 2 marked
        }
        AudioFX.tick();
        render();
        autoCheck();
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Picture complete in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("nonogram10x10");
        if (best === null || time < best) {
          Storage.setBest("nonogram10x10", time);
          root.querySelector("#n10-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function autoCheck() {
        if (over) return;
        const st = lineStates();
        if (st.rows.every(s => s.done) && st.cols.every(s => s.done)) win();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          if (!sel) {
            sel = [0, 0];
            render();
            return;
          }
          let r = sel[0], c = sel[1];
          if (e.key === "ArrowUp") r = Math.max(0, r - 1);
          if (e.key === "ArrowDown") r = Math.min(N - 1, r + 1);
          if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
          if (e.key === "ArrowRight") c = Math.min(N - 1, c + 1);
          sel = [r, c];
          AudioFX.tick();
          render();
          return;
        }
        if (!sel) return;
        const r = sel[0], c = sel[1];
        if (e.key === "f" || e.key === "F" || e.key === "Enter") {
          e.preventDefault();
          grid[r][c] = grid[r][c] === 1 ? 0 : 1;
        } else if (e.key === "x" || e.key === "X") {
          e.preventDefault();
          grid[r][c] = grid[r][c] === 2 ? 0 : 2;
        } else if (e.key === " ") {
          e.preventDefault();
          grid[r][c] = (grid[r][c] + 1) % 3;
        } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
          grid[r][c] = 0;
        } else return;
        AudioFX.tick();
        render();
        autoCheck();
      }

      document.addEventListener("keydown", onKey);

      function check() {
        if (over) return;
        const st = lineStates();
        const badRows = st.rows.filter(s => !s.done).length;
        const badCols = st.cols.filter(s => !s.done).length;
        if (badRows === 0 && badCols === 0) {
          win();
          return;
        }
        let wrongFills = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (grid[r][c] === 1 && !sol[r][c]) wrongFills++;
        }
        AudioFX.error();
        statusEl.textContent = badRows + " row" + (badRows === 1 ? "" : "s") + " and " + badCols + " column" + (badCols === 1 ? "" : "s") + " don't match"
          + (wrongFills ? " — " + wrongFills + " filled cell" + (wrongFills === 1 ? " is" : "s are") + " wrongly filled." : ".");
        statusEl.className = "status lose";
      }

      root.querySelector("#n10-check").addEventListener("click", check);
      root.querySelector("#n10-clear").addEventListener("click", () => {
        if (over) return;
        grid = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });
      root.querySelector("#n10-new").addEventListener("click", () => newGame());

      function newGame() {
        sol = genPattern();
        grid = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        sel = null;
        time = 0;
        recorded = false;
        startTimer();
        const best = Storage.getBest("nonogram10x10");
        root.querySelector("#n10-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#n10-time").textContent = "0s";
        statusEl.textContent = "Click a cell to fill it, click again to mark it empty (✕). Satisfy every row & column clue.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !sol) return;
          const cands = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            const isFilled = grid[r][c] === 1;
            if (isFilled !== (sol[r][c] === 1)) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          const r = pick[0], c = pick[1];
          grid[r][c] = sol[r][c] ? 1 : 2; // reveal the fill, or mark it known-empty
          AudioFX.reveal();
          App.toast("Hint: R" + (r + 1) + "C" + (c + 1) + " is " + (sol[r][c] ? "filled" : "empty"), "info");
          render();
          autoCheck();
        },
        solve: function () {
          if (over || !sol) return;
          grid = sol.map(row => row.slice());
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
      App.showModal("How to play Nonogram 10×10",
        `Reveal the hidden 10×10 picture using the clues:
        <br><br>• <b>Row clues</b> (left) list the lengths of consecutive filled runs in that row, in order.
        <br>• <b>Column clues</b> (top) do the same for each column.
        <br>• Runs are separated by at least one empty cell.
        <br><br><b>Click</b> a cell to fill it; click again to mark it as definitely empty (✕). <b>Right-click</b> toggles the ✕ mark directly.
        <br>Move with <b>arrow keys</b>, then <b>F</b> (fill), <b>X</b> (mark) or <b>Space</b> (cycle).
        <br><br>Clues turn <span style="color:var(--success)">green</span> when their line matches and <span style="color:var(--danger)">red</span> when it's over-filled. Win by satisfying all 20 clues.`);
    },
  });
})();
