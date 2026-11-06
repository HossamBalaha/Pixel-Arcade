/* 15 Puzzle — 4x4 sliding puzzle (1-15). Hint: best next move. Solve: animate solution. */
(function () {
  const N = 4;
  let live = null;

  function solved() {
    const a = [];
    for (let i = 1; i < N * N; i++) a.push(i);
    a.push(0);
    return a;
  }

  function neighbors(s) {
    const z = s.indexOf(0);
    const r = Math.floor(z / N), c = z % N;
    const out = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
      const nz = nr * N + nc;
      const t = s.slice();
      t[z] = t[nz];
      t[nz] = 0;
      out.push(t);
    }
    return out;
  }

  function key(s) {
    return s.join(",");
  }

  function manhattan(s) {
    let d = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === 0) continue;
      const v = s[i] - 1;
      const tr = Math.floor(v / N), tc = v % N;
      const cr = Math.floor(i / N), cc = i % N;
      d += Math.abs(tr - cr) + Math.abs(tc - cc);
    }
    return d;
  }

  // IDA* search (works for moderate puzzle depths)
  function idaStar(start) {
    if (key(start) === key(solved())) return [];
    let bound = manhattan(start);
    const path = [start];

    function search(g, bound, prev) {
      const node = path[path.length - 1];
      const h = manhattan(node);
      const f = g + h;
      if (f > bound) return f;
      if (h === 0) return -1; // found
      let min = Infinity;
      for (const n of neighbors(node)) {
        if (key(n) === prev) continue;
        path.push(n);
        const t = search(g + 1, bound, key(node));
        if (t === -1) return -1;
        if (t < min) min = t;
        path.pop();
      }
      return min;
    }

    while (path.length && path.length < 100) {
      const t = search(0, bound, "");
      if (t === -1) return path.slice(1); // skip start
      if (t === Infinity) return null;
      bound = t;
      path.length = 1;
      if (bound > 60) return null; // too deep, give up
    }
    return null;
  }

  function randomScramble() {
    let s = solved();
    for (let i = 0; i < 200; i++) {
      const ns = neighbors(s);
      s = ns[Math.floor(Math.random() * ns.length)];
    }
    return s;
  }

  GameRegistry.register({
    id: "fifteenpuzzle",
    name: "15 Puzzle",
    icon: "🔢",
    category: "logic",
    description: "Slide tiles 1–15 into order in a 4×4 grid",
    tags: ["puzzle", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let state, moves, started, time, timerInt, hl = null, solving = false;
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
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="fp-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="fp-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fp-best">-</div></div>
        </div>
        <div class="status info" id="fp-status">Slide tiles 1–15 into order</div>
        <div class="center"><div id="fp-board" style="display:grid;grid-template-columns:repeat(4,72px);grid-template-rows:repeat(4,72px);gap:6px;"></div></div>
        <p class="hint">Click a tile adjacent to the empty. <b>R</b> reshuffle. <b>Solve</b> may take a moment.</p>
      `;
      const boardEl = root.querySelector("#fp-board");
      const statusEl = root.querySelector("#fp-status");
      root.querySelector("#fp-best").textContent = Storage.getBest("fifteenpuzzle") ?? "-";

      function newGame() {
        state = randomScramble();
        moves = 0;
        started = false;
        hl = null;
        solving = false;
        time = 0;
        clearInterval(timerInt);
        statusEl.textContent = "Slide tiles 1–15 into order";
        statusEl.className = "status info";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let i = 0; i < N * N; i++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.style.fontSize = "1.5rem";
          const v = state[i];
          if (v === 0) {
            cell.style.background = "var(--bg-soft)";
            cell.style.borderStyle = "dashed";
          } else {
            cell.classList.add("filled");
            cell.textContent = v;
            if (v === i + 1) cell.style.color = "var(--success)";
          }
          if (hl && hl.from === i) cell.style.outline = "3px solid var(--warning)";
          if (hl && hl.to === i) cell.style.outline = "3px solid var(--success)";
          cell.addEventListener("click", () => onTile(i));
          boardEl.appendChild(cell);
        }
        root.querySelector("#fp-m").textContent = moves;
        root.querySelector("#fp-t").textContent = time + "s";
      }

      function canSlide(i) {
        const z = state.indexOf(0);
        const r1 = Math.floor(i / N), c1 = i % N, r2 = Math.floor(z / N), c2 = z % N;
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
      }

      function onTile(i) {
        if (solving) return;
        if (!canSlide(i)) {
          AudioFX.error();
          return;
        }
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        const z = state.indexOf(0);
        [state[i], state[z]] = [state[z], state[i]];
        moves++;
        hl = null;
        AudioFX.place();
        render();
        if (key(state) === key(solved())) win();
      }

      function win() {
        clearInterval(timerInt);
        AudioFX.win();
        statusEl.textContent = `🎉 Solved in ${moves} moves, ${time}s!`;
        statusEl.className = "status win";
        const best = Storage.getBest("fifteenpuzzle");
        if (best === null || moves < best) {
          Storage.setBest("fifteenpuzzle", moves);
          App.toast("New best: " + moves + " moves", "success");
          root.querySelector("#fp-best").textContent = moves;
        }
      }

      function nextMove() {
        // Try IDA* (limited depth) to find first step of solution
        const path = idaStar(state);
        if (!path || !path.length) return null;
        const cur = state, nxt = path[0];
        const z1 = cur.indexOf(0), z2 = nxt.indexOf(0);
        return {from: z2, to: z1};
      }

      function doHint() {
        if (solving) return;
        const m = nextMove();
        if (m) {
          hl = m;
          AudioFX.reveal();
          render();
        } else App.toast("Hint unavailable (try reshuffle)", "info");
      }

      function doSolve() {
        if (solving) return;
        // compute solution path
        const path = idaStar(state);
        if (!path || !path.length) {
          // fallback: just teleport to solved
          state = solved();
          moves += 0;
          render();
          if (key(state) === key(solved())) win();
          return;
        }
        solving = true;
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        let i = 0;
        const step = () => {
          if (i >= path.length) {
            solving = false;
            if (key(state) === key(solved())) win();
            return;
          }
          state = path[i];
          i++;
          moves++;
          AudioFX.tick();
          render();
          later(step, 150);
        };
        step();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);
      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
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
      App.showModal("How to play 15 Puzzle",
        `Slide the numbered tiles around the 4×4 grid by clicking a tile adjacent to the empty space.
        <br><br>Arrange them so 1–15 are in order, with the empty space in the bottom-right.
        <br><br><b>Hint</b> highlights the next move toward the solution (uses IDA*, may be slow on hard scrambles). <b>Solve</b> animates the full solution.`);
    },
  });
})();
