/* Numbrix — fill the grid so the numbers 1..N form a single path where each
   consecutive pair is ORTHOGONALLY adjacent (no diagonals, unlike Hidato).
   Generator: a random Hamiltonian path is built on the 7×7 grid with a
   randomized DFS guided by the Warnsdorff heuristic (fewest onward moves
   first) with backtracking; ~60% of the numbers are then dug out, keeping the
   endpoints and a spread of anchors. The dug path is the known solution, so
   every puzzle is solvable. */
(function () {
  "use strict";
  const N = 7;
  const TOTAL = N * N; // 49

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function genPath() {
    for (let attempt = 0; attempt < 80; attempt++) {
      // A Hamiltonian path on a checkerboard must start on the majority colour
      const starts = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if ((r + c) % 2 === 0) starts.push([r, c]);
      }
      const start = starts[Math.floor(Math.random() * starts.length)];
      const visited = Array.from({length: N}, () => Array(N).fill(false));
      const path = [];
      let nodes = 0, aborted = false;

      function openNbrs(r, c) {
        const out = [];
        if (r > 0 && !visited[r - 1][c]) out.push([r - 1, c]);
        if (r < N - 1 && !visited[r + 1][c]) out.push([r + 1, c]);
        if (c > 0 && !visited[r][c - 1]) out.push([r, c - 1]);
        if (c < N - 1 && !visited[r][c + 1]) out.push([r, c + 1]);
        return out;
      }

      function dfs(r, c) {
        if (aborted) return false;
        if (++nodes > 150000) {
          aborted = true;
          return false;
        }
        visited[r][c] = true;
        path.push([r, c]);
        if (path.length === TOTAL) return true;
        const options = shuffle(openNbrs(r, c));
        options.sort((a, b) => openNbrs(a[0], a[1]).length - openNbrs(b[0], b[1]).length);
        for (const opt of options) {
          if (dfs(opt[0], opt[1])) return true;
          if (aborted) return false;
        }
        visited[r][c] = false;
        path.pop();
        return false;
      }

      if (dfs(start[0], start[1])) return path;
    }
    // Fallback (practically unreachable): serpentine path
    const path = [];
    for (let r = 0; r < N; r++) {
      for (let k = 0; k < N; k++) path.push([r, r % 2 === 0 ? k : N - 1 - k]);
    }
    return path;
  }

  function genPuzzle() {
    const path = genPath();
    const sol = Array.from({length: N}, () => Array(N).fill(null));
    path.forEach((cell, i) => {
      sol[cell[0]][cell[1]] = i + 1;
    });
    const keep = new Set([1, TOTAL]);
    const mid = [];
    for (let n = 2; n < TOTAL; n++) mid.push(n);
    shuffle(mid);
    for (let i = 0; i < 18; i++) keep.add(mid[i]); // ~20 anchors, ~60% blank
    const grid = Array.from({length: N}, () => Array(N).fill(null));
    const locked = Array.from({length: N}, () => Array(N).fill(false));
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const v = sol[r][c];
      if (keep.has(v)) {
        grid[r][c] = v;
        locked[r][c] = true;
      }
    }
    return {sol, grid, locked};
  }

  let live = null;
  GameRegistry.register({
    id: "numbrix",
    name: "Numbrix",
    icon: "🔢",
    category: "logic",
    description: "Connect 1 to 49 in order — consecutive numbers must be orthogonal neighbours",
    tags: ["logic", "puzzle", "numbers", "path"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, over = false, sel = null;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="nbx-filled">0 / ${TOTAL}</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="nbx-errors">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="nbx-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="nbx-best">—</div></div>
        </div>
        <div class="status info" id="nbx-status">Fill the empty cells so 1 → 2 → … → 49 forms one path. Consecutive numbers must touch <b>edge-to-edge</b> (no diagonals).</div>
        <div class="center" style="margin:12px 0;"><div class="nbx-grid" id="nbx-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;">
          <button class="btn" id="nbx-new">New puzzle</button>
          <button class="btn" id="nbx-clear">Clear inputs</button>
          <button class="btn primary" id="nbx-check">Check</button>
        </div>
        <p class="hint">Click a cell, then type a number 1–49 (two digits combine: 2 then 4 → 24). <b>Backspace</b> clears. Typing a number that's already on the board moves it. Arrow keys navigate.</p>
      `;
      const statusEl = root.querySelector("#nbx-status");
      const gridEl = root.querySelector("#nbx-grid");

      if (!document.getElementById("nbx-style")) {
        const s = document.createElement("style");
        s.id = "nbx-style";
        s.textContent = `
          .nbx-grid { display: grid; grid-template-columns: repeat(${N}, 46px); grid-auto-rows: 46px; gap: 4px; background: var(--bg-elev); padding: 8px; border-radius: var(--radius); }
          .nbx-cell { width: 46px; height: 46px; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem; cursor: pointer; user-select: none; color: var(--text); }
          .nbx-cell.locked { background: var(--accent); border-color: var(--accent); color: #fff; }
          .nbx-cell.active { outline: 3px solid var(--accent); outline-offset: -2px; }
          .nbx-cell.error { background: var(--danger); border-color: var(--danger); color: #fff; }
        `;
        document.head.appendChild(s);
      }

      function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#nbx-time");
          if (t) t.textContent = time + "s";
        }, 1000);
      }

      function posOf(n) {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (puz.grid[r][c] === n) return [r, c];
        }
        return null;
      }

      function orthAdj(a, b) {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
      }

      function errors() {
        const errs = new Set();
        for (let n = 1; n < TOTAL; n++) {
          const a = posOf(n), b = posOf(n + 1);
          if (a && b && !orthAdj(a, b)) {
            if (!puz.locked[a[0]][a[1]]) errs.add(a[0] + "," + a[1]);
            if (!puz.locked[b[0]][b[1]]) errs.add(b[0] + "," + b[1]);
          }
        }
        return errs;
      }

      function render() {
        gridEl.innerHTML = "";
        const errs = errors();
        let filled = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "nbx-cell";
            if (puz.locked[r][c]) cell.classList.add("locked");
            if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
            if (errs.has(r + "," + c)) cell.classList.add("error");
            const v = puz.grid[r][c];
            if (v !== null) {
              cell.textContent = v;
              filled++;
            }
            cell.addEventListener("click", () => {
              if (over) return;
              cancelAdvance();
              sel = [r, c];
              AudioFX.tick();
              render();
            });
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#nbx-filled").textContent = filled + " / " + TOTAL;
        root.querySelector("#nbx-errors").textContent = errs.size;
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Path complete in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("numbrix");
        if (best === null || time < best) {
          Storage.setBest("numbrix", time);
          root.querySelector("#nbx-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function autoCheck() {
        if (over) return;
        if (!puz.grid.every(row => row.every(v => v !== null))) return;
        if (errors().size === 0) win();
      }

      // Delayed auto-advance: after typing a 1–4 (a possible first digit), wait a
      // moment before moving on so two-digit numbers (e.g. 2 → 4 = 24) can be
      // typed naturally on the same cell.
      let advanceTimer = null;

      function cancelAdvance() {
        if (advanceTimer) {
          clearTimeout(advanceTimer);
          advanceTimer = null;
        }
      }

      function advance() {
        if (!sel) return;
        const r = sel[0], c = sel[1];
        for (let i = r * N + c + 1; i < N * N; i++) {
          const rr = Math.floor(i / N), cc = i % N;
          if (!puz.locked[rr][cc] && puz.grid[rr][cc] === null) {
            sel = [rr, cc];
            return;
          }
        }
        for (let i = 0; i < N * N; i++) {
          const rr = Math.floor(i / N), cc = i % N;
          if (!puz.locked[rr][cc] && puz.grid[rr][cc] === null) {
            sel = [rr, cc];
            return;
          }
        }
      }

      function typeDigit(d) {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (puz.locked[r][c]) return;
        cancelAdvance();
        const cur = puz.grid[r][c];
        let n = d, combined = false;
        if (cur !== null && cur <= 4) {
          n = cur * 10 + d;
          combined = true;
        } // two-digit numbers
        // move the number off any other non-locked cell
        for (let rr = 0; rr < N; rr++) for (let cc = 0; cc < N; cc++) {
          if (!puz.locked[rr][cc] && puz.grid[rr][cc] === n && !(rr === r && cc === c)) puz.grid[rr][cc] = null;
        }
        puz.grid[r][c] = n;
        AudioFX.pop();
        render();
        autoCheck();
        if (over) return;
        if (combined || d >= 5) {
          advance();
          render();
        } else {
          advanceTimer = setTimeout(() => {
            advanceTimer = null;
            if (!alive || over) return;
            advance();
            render();
          }, 900);
        }
      }

      function eraseCell() {
        if (over || !sel) return;
        cancelAdvance();
        const r = sel[0], c = sel[1];
        if (puz.locked[r][c]) return;
        puz.grid[r][c] = null;
        AudioFX.click();
        render();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          cancelAdvance();
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
        if (/^[1-9]$/.test(e.key)) {
          typeDigit(parseInt(e.key, 10));
          return;
        }
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") eraseCell();
      }

      document.addEventListener("keydown", onKey);

      function check() {
        if (over) return;
        const filled = puz.grid.flat().filter(v => v !== null).length;
        if (filled < TOTAL) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first (" + filled + " / " + TOTAL + ").";
          statusEl.className = "status lose";
          return;
        }
        const errs = errors();
        if (errs.size > 0) {
          AudioFX.error();
          statusEl.textContent = errs.size + " adjacency problem" + (errs.size === 1 ? "" : "s") + " — some consecutive numbers don't touch.";
          statusEl.className = "status lose";
          return;
        }
        win();
      }

      root.querySelector("#nbx-check").addEventListener("click", check);
      root.querySelector("#nbx-clear").addEventListener("click", () => {
        if (over) return;
        cancelAdvance();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!puz.locked[r][c]) puz.grid[r][c] = null;
        }
        AudioFX.click();
        render();
      });
      root.querySelector("#nbx-new").addEventListener("click", () => newGame());

      function newGame() {
        cancelAdvance();
        puz = genPuzzle();
        over = false;
        sel = null;
        time = 0;
        recorded = false;
        startTimer();
        const best = Storage.getBest("numbrix");
        root.querySelector("#nbx-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#nbx-time").textContent = "0s";
        statusEl.textContent = "Fill the empty cells so 1 → 2 → … → 49 forms one path. Consecutive numbers must touch edge-to-edge (no diagonals).";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !puz) return;
          // reveal the lowest number that isn't sitting at its solution cell
          for (let n = 1; n <= TOTAL; n++) {
            const at = posOf(n);
            const want = posOfInSol(n);
            if (!at || at[0] !== want[0] || at[1] !== want[1]) {
              cancelAdvance();
              if (at && !puz.locked[at[0]][at[1]]) puz.grid[at[0]][at[1]] = null;
              puz.grid[want[0]][want[1]] = n;
              puz.locked[want[0]][want[1]] = true;
              sel = null;
              AudioFX.reveal();
              App.toast("Hint: " + n + " placed", "info");
              render();
              autoCheck();
              return;
            }
          }
          App.toast("Nothing to reveal — you're on track!", "info");
        },
        solve: function () {
          if (over || !puz) return;
          cancelAdvance();
          puz.grid = puz.sol.map(row => row.slice());
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

      function posOfInSol(n) {
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (puz.sol[r][c] === n) return [r, c];
        }
        return null;
      }

      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        cancelAdvance();
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
      App.showModal("How to play Numbrix",
        `Fill the whole 7×7 grid with the numbers <b>1 to 49</b> so that they form one continuous path:
        <br><br>• Each consecutive pair (<b>n</b>, <b>n+1</b>) must be <b>orthogonally adjacent</b> — above, below, left or right. <b>No diagonals</b> (that's what makes it Numbrix rather than Hidato).
        <br>• Highlighted numbers are locked anchors.
        <br><br>Click a cell, then type a number (type two digits in a row to enter 10–49; e.g. <b>2</b> then <b>4</b> gives 24). <b>Backspace</b> clears. Typing a number that's already placed moves it to the new cell.
        <br><br>Arrow keys move between cells. The puzzle auto-completes when the path is valid.`);
    },
  });
})();
