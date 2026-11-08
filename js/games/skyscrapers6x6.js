/* Skyscrapers 6×6 — place buildings of height 1–6 in every row and column
   (a Latin square) so that the number of buildings VISIBLE from each edge
   matches the clue on that edge. Taller buildings hide shorter ones behind
   them; e.g. looking at 2 1 4 6 3 5 you see 2, then 4, then 6 → 3 visible.
   Generator: a random 6×6 Latin square (shuffled base digits + distinct cyclic
   row shifts + a column permutation, verified), from which the 24 edge clues
   are computed. The square is kept as the known solution — any grid satisfying
   all row/column and visibility rules wins. */
(function () {
  "use strict";
  const N = 6;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function visibility(line) {
    let count = 0, max = 0;
    for (const v of line) if (v > max) {
      max = v;
      count++;
    }
    return count;
  }

  function isLatin(L) {
    for (let r = 0; r < N; r++) if (new Set(L[r]).size !== N) return false;
    for (let c = 0; c < N; c++) {
      const s = new Set();
      for (let r = 0; r < N; r++) s.add(L[r][c]);
      if (s.size !== N) return false;
    }
    return true;
  }

  function genPuzzle() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const base = shuffle([1, 2, 3, 4, 5, 6]);
      const shifts = shuffle([0, 1, 2, 3, 4, 5]); // distinct → Latin square
      const colPerm = shuffle([0, 1, 2, 3, 4, 5]);
      const sol = [];
      for (let r = 0; r < N; r++) {
        sol.push(Array.from({length: N}, (_, c) => base[(colPerm[c] + shifts[r]) % N]));
      }
      if (!isLatin(sol)) continue; // verified permutations (always true)
      const top = [], bottom = [], left = [], right = [];
      for (let c = 0; c < N; c++) {
        const col = sol.map(row => row[c]);
        top.push(visibility(col));
        bottom.push(visibility(col.slice().reverse()));
      }
      for (let r = 0; r < N; r++) {
        left.push(visibility(sol[r]));
        right.push(visibility(sol[r].slice().reverse()));
      }
      return {sol, top, bottom, left, right};
    }
    // Mathematically unreachable fallback: cyclic square 1..6
    const sol = Array.from({length: N}, (_, r) =>
      Array.from({length: N}, (_, c) => ((r + c) % N) + 1));
    const top = [], bottom = [], left = [], right = [];
    for (let c = 0; c < N; c++) {
      const col = sol.map(row => row[c]);
      top.push(visibility(col));
      bottom.push(visibility(col.slice().reverse()));
    }
    for (let r = 0; r < N; r++) {
      left.push(visibility(sol[r]));
      right.push(visibility(sol[r].slice().reverse()));
    }
    return {sol, top, bottom, left, right};
  }

  let live = null;
  GameRegistry.register({
    id: "skyscrapers6x6",
    name: "Skyscrapers 6x6",
    icon: "🏙️",
    category: "logic",
    description: "6×6 skyscrapers — 1–6 per row & column, match every edge visibility clue",
    tags: ["logic", "puzzle", "latin-square", "numbers"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, grid = null, given = null, sel = null, over = false;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="sk6-filled">0 / 36</div></div>
          <div class="score-cell"><div class="label">Clues ok</div><div class="val" id="sk6-clues">0 / 24</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sk6-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk6-best">—</div></div>
        </div>
        <div class="status info" id="sk6-status">Each row &amp; column holds 1–6 once. Edge numbers count the buildings visible from that side.</div>
        <div class="center" style="margin:12px 0;"><div class="sk6-wrap" id="sk6-wrap"></div></div>
        <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="btn" id="sk6-new">New puzzle</button>
          <button class="btn" id="sk6-clear">Clear</button>
          <button class="btn primary" id="sk6-check">Check</button>
        </div>
        <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;margin-top:8px;" id="sk6-pad">
          ${[1, 2, 3, 4, 5, 6].map(d => `<button class="btn" data-d="${d}" style="min-width:40px;">${d}</button>`).join("")}
          <button class="btn" id="sk6-erase" style="min-width:40px;">⌫</button>
        </div>
        <p class="hint">Looking from an edge, you see a building only if it's <b>taller</b> than everything before it. Clues turn <b>green</b> when their line is complete &amp; correct, <b>red</b> when it's complete but wrong. Arrow keys move, digits fill, Backspace clears.</p>
      `;
      const statusEl = root.querySelector("#sk6-status");
      const wrapEl = root.querySelector("#sk6-wrap");

      if (!document.getElementById("sk6-style")) {
        const s = document.createElement("style");
        s.id = "sk6-style";
        s.textContent = `
          .sk6-wrap { display: inline-grid; grid-template-columns: 26px repeat(${N}, 46px) 26px; grid-template-rows: 26px repeat(${N}, 46px) 26px; gap: 3px; }
          .sk6-clue { display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; color: var(--accent); font-size: 0.9rem; }
          .sk6-clue.ok { color: var(--success); }
          .sk6-clue.bad { color: var(--danger); }
          .sk6-corner { }
          .sk6-cell { background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; cursor: pointer; user-select: none; font-family: var(--font-mono); font-weight: 700; font-size: 1.15rem; color: var(--text); border-radius: var(--radius); }
          .sk6-cell.given { color: var(--accent); }
          .sk6-cell.active { outline: 3px solid var(--accent); outline-offset: -2px; }
          .sk6-cell.error { color: var(--danger); border-color: var(--danger); }
        `;
        document.head.appendChild(s);
      }

      function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#sk6-time");
          if (t) t.textContent = time + "s";
        }, 1000);
      }

      function dupCells() {
        const errs = new Set();
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            const v = grid[r][c];
            if (!v) continue;
            if (seen[v] !== undefined) {
              errs.add(r + "," + c);
              errs.add(r + "," + seen[v]);
            }
            seen[v] = c;
          }
        }
        for (let c = 0; c < N; c++) {
          const seen = {};
          for (let r = 0; r < N; r++) {
            const v = grid[r][c];
            if (!v) continue;
            if (seen[v] !== undefined) {
              errs.add(r + "," + c);
              errs.add(seen[v] + "," + c);
            }
            seen[v] = r;
          }
        }
        return errs;
      }

      // Clue status per line: "ok" (complete & matches), "bad" (complete & wrong/dups), "" (incomplete)
      function clueStates() {
        const st = {top: [], bottom: [], left: [], right: [], okCount: 0};
        const dup = dupCells();
        for (let c = 0; c < N; c++) {
          const col = grid.map(row => row[c]);
          const complete = col.every(v => v);
          const colDup = grid.some((row, r) => dup.has(r + "," + c));
          const tv = visibility(col), bv = visibility(col.slice().reverse());
          st.top.push(complete ? ((tv === puz.top[c] && !colDup) ? "ok" : "bad") : "");
          st.bottom.push(complete ? ((bv === puz.bottom[c] && !colDup) ? "ok" : "bad") : "");
        }
        for (let r = 0; r < N; r++) {
          const row = grid[r];
          const complete = row.every(v => v);
          const rowDup = row.some((_, c) => dup.has(r + "," + c));
          const lv = visibility(row), rv = visibility(row.slice().reverse());
          st.left.push(complete ? ((lv === puz.left[r] && !rowDup) ? "ok" : "bad") : "");
          st.right.push(complete ? ((rv === puz.right[r] && !rowDup) ? "ok" : "bad") : "");
        }
        let ok = 0;
        ["top", "bottom", "left", "right"].forEach(k => st[k].forEach(v => {
          if (v === "ok") ok++;
        }));
        st.okCount = ok;
        return st;
      }

      function render() {
        wrapEl.innerHTML = "";
        const errs = dupCells();
        const st = clueStates();

        function clue(text, state) {
          const d = document.createElement("div");
          d.className = "sk6-clue" + (state === "ok" ? " ok" : state === "bad" ? " bad" : "");
          d.textContent = text;
          return d;
        }

        // top rail
        wrapEl.appendChild(Object.assign(document.createElement("div"), {className: "sk6-corner"}));
        for (let c = 0; c < N; c++) wrapEl.appendChild(clue(puz.top[c], st.top[c]));
        wrapEl.appendChild(Object.assign(document.createElement("div"), {className: "sk6-corner"}));
        // rows
        for (let r = 0; r < N; r++) {
          wrapEl.appendChild(clue(puz.left[r], st.left[r]));
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "sk6-cell";
            if (given[r][c]) cell.classList.add("given");
            if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
            if (errs.has(r + "," + c)) cell.classList.add("error");
            const v = grid[r][c];
            if (v) cell.textContent = v;
            cell.addEventListener("click", () => {
              if (over) return;
              sel = [r, c];
              AudioFX.tick();
              render();
            });
            wrapEl.appendChild(cell);
          }
          wrapEl.appendChild(clue(puz.right[r], st.right[r]));
        }
        // bottom rail
        wrapEl.appendChild(Object.assign(document.createElement("div"), {className: "sk6-corner"}));
        for (let c = 0; c < N; c++) wrapEl.appendChild(clue(puz.bottom[c], st.bottom[c]));
        wrapEl.appendChild(Object.assign(document.createElement("div"), {className: "sk6-corner"}));
        const filled = grid.flat().filter(v => v).length;
        root.querySelector("#sk6-filled").textContent = filled + " / " + (N * N);
        root.querySelector("#sk6-clues").textContent = st.okCount + " / " + (4 * N);
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Solved in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("skyscrapers6x6");
        if (best === null || time < best) {
          Storage.setBest("skyscrapers6x6", time);
          root.querySelector("#sk6-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function autoCheck() {
        if (over) return;
        if (!grid.every(row => row.every(v => v))) return;
        if (dupCells().size > 0) return;
        if (clueStates().okCount === 4 * N) win();
      }

      function place(d) {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (given[r][c]) return;
        grid[r][c] = d;
        AudioFX.pop();
        for (let i = r * N + c + 1; i < N * N; i++) {
          const rr = Math.floor(i / N), cc = i % N;
          if (!given[rr][cc] && !grid[rr][cc]) {
            sel = [rr, cc];
            break;
          }
        }
        render();
        autoCheck();
      }

      function erase() {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (given[r][c]) return;
        grid[r][c] = null;
        AudioFX.click();
        render();
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
        if (/^[1-6]$/.test(e.key)) {
          place(parseInt(e.key, 10));
          return;
        }
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      }

      document.addEventListener("keydown", onKey);

      function check() {
        if (over) return;
        const filled = grid.flat().filter(v => v).length;
        if (filled < N * N) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first (" + filled + " / " + (N * N) + ").";
          statusEl.className = "status lose";
          return;
        }
        const dup = dupCells().size;
        if (dup > 0) {
          AudioFX.error();
          statusEl.textContent = "Repeated numbers — every row & column needs 1–6 exactly once.";
          statusEl.className = "status lose";
          return;
        }
        const st = clueStates();
        if (st.okCount < 4 * N) {
          AudioFX.error();
          statusEl.textContent = (4 * N - st.okCount) + " visibility clue" + (4 * N - st.okCount === 1 ? "" : "s") + " not satisfied (shown in red).";
          statusEl.className = "status lose";
          return;
        }
        win();
      }

      root.querySelector("#sk6-check").addEventListener("click", check);
      root.querySelector("#sk6-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!given[r][c]) grid[r][c] = null;
        }
        sel = null;
        AudioFX.click();
        render();
      });
      root.querySelector("#sk6-new").addEventListener("click", () => newGame());
      root.querySelector("#sk6-erase").addEventListener("click", erase);
      root.querySelectorAll("#sk6-pad [data-d]").forEach(btn =>
        btn.addEventListener("click", () => place(parseInt(btn.dataset.d, 10))));

      function newGame() {
        puz = genPuzzle();
        grid = Array.from({length: N}, () => Array(N).fill(null));
        given = Array.from({length: N}, () => Array(N).fill(false));
        over = false;
        sel = null;
        time = 0;
        recorded = false;
        startTimer();
        const best = Storage.getBest("skyscrapers6x6");
        root.querySelector("#sk6-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#sk6-time").textContent = "0s";
        statusEl.textContent = "Each row & column holds 1–6 once. Edge numbers count the buildings visible from that side.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !puz) return;
          const cands = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (grid[r][c] !== puz.sol[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          const r = pick[0], c = pick[1];
          grid[r][c] = puz.sol[r][c];
          given[r][c] = true;
          AudioFX.reveal();
          App.toast("Hint: R" + (r + 1) + "C" + (c + 1) + " = " + puz.sol[r][c], "info");
          render();
          autoCheck();
        },
        solve: function () {
          if (over || !puz) return;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) grid[r][c] = puz.sol[r][c];
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
      App.showModal("How to play Skyscrapers 6×6",
        `Fill the 6×6 grid with buildings of heights <b>1–6</b>:
        <br><br>• Each <b>row</b> contains 1–6 exactly once.
        <br>• Each <b>column</b> contains 1–6 exactly once.
        <br>• Each number around the grid tells you how many buildings are <b>visible</b> from that side — a building is visible only if it is taller than every building before it in that line of sight.
        <br><br>Click a cell (or move with <b>arrow keys</b>), then type or tap a digit 1–6. <b>Backspace</b> clears.
        <br>Clues turn <span style="color:var(--success)">green</span> when their line is complete and correct, <span style="color:var(--danger)">red</span> when it's complete but wrong.`);
    },
  });
})();
