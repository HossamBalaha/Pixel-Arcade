/* Lights Out — 5x5 grid, click toggles cell + 4 neighbors. Hint: show one move. Solve: animate solution. */
(function () {
  const N = 5;
  let live = null;

  // Solve lights out using Gaussian elimination over GF(2). puzzle (on cells) -> list of cells to press.
  function toggle(s, r, c) {
    s[r][c] ^= 1;
    if (r > 0) s[r - 1][c] ^= 1;
    if (r < N - 1) s[r + 1][c] ^= 1;
    if (c > 0) s[r][c - 1] ^= 1;
    if (c < N - 1) s[r][c + 1] ^= 1;
  }

  function solvableSolution(state) {
    // Build matrix A (25x25) where each row corresponds to a cell press effect.
    // We solve Ax = b (b = state vector). Use Gaussian elimination over GF(2).
    const sz = N * N;
    // build augmented matrix [A | b]
    const A = [];
    for (let i = 0; i < sz; i++) {
      const row = new Uint8Array(sz + 1);
      const r = Math.floor(i / N), c = i % N;
      row[i] = 1;
      if (r > 0) row[i - N] = 1;
      if (r < N - 1) row[i + N] = 1;
      if (c > 0) row[i - 1] = 1;
      if (c < N - 1) row[i + 1] = 1;
      A.push(row);
    }
    for (let i = 0; i < sz; i++) A[i][sz] = state[i];
    // Gauss
    let pivotCol = [];
    let row = 0;
    for (let col = 0; col < sz && row < sz; col++) {
      let p = -1;
      for (let r = row; r < sz; r++) if (A[r][col]) {
        p = r;
        break;
      }
      if (p === -1) continue;
      [A[row], A[p]] = [A[p], A[row]];
      for (let r = 0; r < sz; r++) if (r !== row && A[r][col]) {
        for (let k = col; k <= sz; k++) A[r][k] ^= A[row][k];
      }
      pivotCol[col] = row;
      row++;
    }
    // Read solution
    const x = new Uint8Array(sz);
    for (let c = 0; c < sz; c++) {
      if (pivotCol[c] !== undefined) {
        x[c] = A[pivotCol[c]][sz];
      }
    }
    return x;
  }

  GameRegistry.register({
    id: "lightsout",
    name: "Lights Out",
    icon: "💡",
    category: "logic",
    description: "Toggle lights off — every click affects neighbors too",
    tags: ["puzzle", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let grid, moves, over, hl = null;
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

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="lo-m">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lo-best">-</div></div>
        </div>
        <div class="status info" id="lo-status">Turn all the lights off!</div>
        <div class="center"><div id="lo-board" style="display:grid;grid-template-columns:repeat(5,60px);grid-template-rows:repeat(5,60px);gap:6px;"></div></div>
        <p class="hint">Click a light to toggle it and its 4 neighbors. Press R to reshuffle.</p>
      `;
      const boardEl = root.querySelector("#lo-board");
      const statusEl = root.querySelector("#lo-status");
      root.querySelector("#lo-best").textContent = Storage.getBest("lightsout") ?? "-";

      function newPuzzle() {
        grid = Array.from({length: N}, () => Array(N).fill(0));
        // scramble from solved by random clicks — guarantees solvable
        let clicks = 6 + Math.floor(Math.random() * 4);
        while (clicks--) {
          const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
          toggle(grid, r, c);
        }
        // ensure not already solved
        if (grid.flat().every(v => v === 0)) toggle(grid, 2, 2);
        moves = 0;
        over = false;
        hl = null;
        statusEl.textContent = "Turn all the lights off!";
        statusEl.className = "status info";
        render();
      }

      function isSolved() {
        return grid.flat().every(v => v === 0);
      }

      function render() {
        boardEl.innerHTML = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.style.background = grid[r][c] ? "var(--warning)" : "var(--bg-soft)";
          cell.style.boxShadow = grid[r][c] ? "0 0 12px var(--warning)" : "";
          if (hl && hl[0] === r && hl[1] === c) cell.style.outline = "3px solid var(--accent)";
          cell.addEventListener("click", () => onClick(r, c));
          boardEl.appendChild(cell);
        }
        root.querySelector("#lo-m").textContent = moves;
      }

      function onClick(r, c) {
        if (over) return;
        toggle(grid, r, c);
        AudioFX.flip();
        moves++;
        hl = null;
        render();
        if (isSolved()) {
          over = true;
          AudioFX.win();
          statusEl.textContent = `🎉 Solved in ${moves} moves!`;
          statusEl.className = "status win";
          const best = Storage.getBest("lightsout");
          if (best === null || moves < best) {
            Storage.setBest("lightsout", moves);
            App.toast("New best: " + moves + " moves", "success");
            root.querySelector("#lo-best").textContent = moves;
          }
        }
      }

      function solution() {
        const flat = grid.flat();
        const x = solvableSolution(flat);
        const cells = [];
        for (let i = 0; i < x.length; i++) if (x[i]) cells.push([Math.floor(i / N), i % N]);
        return cells;
      }

      function doHint() {
        if (over) return;
        const cells = solution();
        if (!cells.length) {
          App.toast("Already solved!", "info");
          return;
        }
        hl = cells[0];
        AudioFX.reveal();
        render();
      }

      function doSolve() {
        if (over) return;
        const cells = solution();
        let i = 0;
        const step = () => {
          if (i >= cells.length) {
            return;
          }
          const [r, c] = cells[i];
          i++;
          toggle(grid, r, c);
          moves++;
          AudioFX.tick();
          hl = null;
          render();
          if (isSolved()) {
            over = true;
            AudioFX.win();
            statusEl.textContent = `🎉 Auto-solved in ${moves} moves!`;
            statusEl.className = "status win";
            return;
          }
          later(step, 250);
        };
        step();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newPuzzle();
      }

      document.addEventListener("keydown", onKey);
      live = {hint: doHint, solve: doSolve};
      newPuzzle();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Lights Out",
        `Click a cell to toggle it and its four direct neighbors (above, below, left, right).
        <br><br>Goal: turn <b>all lights off</b>.
        <br><br><b>Hint</b> reveals one cell to click that's part of the optimal solution. <b>Solve</b> animates the full optimal solution.`);
    },
  });
})();
