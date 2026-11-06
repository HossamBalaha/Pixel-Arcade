/* Sliding Puzzle — 3x3 (1-8). Click adjacent tile to slide. BFS solver for hint/solve. */
(function () {
  const N = 3;
  let live = null;

  function solved() {
    return [1, 2, 3, 4, 5, 6, 7, 8, 0];
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
    return s.join("");
  }

  function bfs(start, goal) {
    if (key(start) === key(goal)) return [];
    const q = [start];
    const seen = {[key(start)]: null};
    while (q.length) {
      const s = q.shift();
      for (const n of neighbors(s)) {
        if (seen[key(n)] !== undefined) continue;
        seen[key(n)] = key(s);
        if (key(n) === key(goal)) {
          // reconstruct
          const path = [];
          let cur = key(n);
          while (cur && cur !== key(start)) {
            path.push(cur);
            cur = seen[cur];
          }
          return path.reverse().map(k => k.split("").map(Number));
        }
        q.push(n);
      }
      if (q.length > 200000) break; // safety
    }
    return [];
  }

  GameRegistry.register({
    id: "slidingpuzzle",
    name: "Sliding Puzzle",
    icon: "🧩",
    category: "logic",
    description: "Slide the tiles to arrange 1–8 in order",
    tags: ["puzzle", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let state, moves, started, timer, timerInt;
      let hl = null;
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
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="sp-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sp-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sp-best">-</div></div>
        </div>
        <div class="status info" id="sp-status">Slide tiles to make 1-8 in order</div>
        <div class="center"><div id="sp-board" style="display:grid;grid-template-columns:repeat(3,80px);grid-template-rows:repeat(3,80px);gap:6px;"></div></div>
        <p class="hint">Click a tile adjacent to the empty space to slide. Press R to reshuffle.</p>
      `;
      const boardEl = root.querySelector("#sp-board");
      const statusEl = root.querySelector("#sp-status");
      root.querySelector("#sp-best").textContent = Storage.getBest("slidingpuzzle") ?? "-";

      function shuffleSolvable() {
        let s = solved();
        // do random valid moves to ensure solvable
        let z = s.indexOf(0);
        for (let i = 0; i < 200; i++) {
          const ns = neighbors(s);
          s = ns[Math.floor(Math.random() * ns.length)];
        }
        return s;
      }

      function newGame() {
        state = shuffleSolvable();
        moves = 0;
        started = false;
        hl = null;
        clearInterval(timerInt);
        timer = 0;
        statusEl.textContent = "Slide tiles to make 1-8 in order";
        statusEl.className = "status info";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let i = 0; i < N * N; i++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.style.fontSize = "2rem";
          const v = state[i];
          if (v === 0) {
            cell.style.background = "var(--bg-soft)";
            cell.style.borderStyle = "dashed";
          } else {
            cell.classList.add("filled");
            cell.textContent = v;
          }
          // mark correct position
          if (v !== 0 && v === i + 1) cell.style.color = "var(--success)";
          if (hl && hl.from === i) cell.style.outline = "3px solid var(--warning)";
          if (hl && hl.to === i) cell.style.outline = "3px solid var(--success)";
          cell.addEventListener("click", () => onTile(i));
          boardEl.appendChild(cell);
        }
        root.querySelector("#sp-m").textContent = moves;
        root.querySelector("#sp-t").textContent = timer + "s";
      }

      function canSlide(i) {
        const z = state.indexOf(0);
        const r1 = Math.floor(i / N), c1 = i % N, r2 = Math.floor(z / N), c2 = z % N;
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
      }

      function onTile(i) {
        if (!canSlide(i)) {
          AudioFX.error();
          return;
        }
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return;
            timer++;
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
        statusEl.textContent = `🎉 Solved in ${moves} moves, ${timer}s!`;
        statusEl.className = "status win";
        const best = Storage.getBest("slidingpuzzle");
        if (best === null || moves < best) {
          Storage.setBest("slidingpuzzle", moves);
          App.toast("New best: " + moves + " moves", "success");
          root.querySelector("#sp-best").textContent = moves;
        }
      }

      function nextMove() {
        const path = bfs(state, solved());
        if (!path.length) return null;
        // find which tile moves from where to where
        const cur = state, nxt = path[0];
        const z1 = cur.indexOf(0), z2 = nxt.indexOf(0);
        return {from: z2, to: z1}; // tile at z2 moves to z1 (empty)
      }

      function doHint() {
        const m = nextMove();
        if (m) {
          hl = m;
          AudioFX.reveal();
          render();
        } else App.toast("Already solved or no path", "info");
      }

      function doSolve() {
        // animate solution step by step
        const path = bfs(state, solved());
        if (!path.length) return;
        let i = 0;
        const step = () => {
          if (i >= path.length) {
            win();
            return;
          }
          state = path[i];
          i++;
          moves++;
          AudioFX.tick();
          render();
          later(step, 220);
        };
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return;
            timer++;
            render();
          }, 1000);
        }
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
      App.showModal("How to play Sliding Puzzle",
        `Click any tile that is directly adjacent (up, down, left, or right) to the empty square to slide it.
        <br><br>Arrange the tiles so the numbers read 1–8 in order with the empty square in the bottom-right.
        <br><br><b>Hint</b> highlights the next correct move. <b>Solve</b> animates the full solution.`);
    },
  });
})();
