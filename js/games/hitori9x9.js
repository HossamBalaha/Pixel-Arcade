/* Hitori 9×9 — shade cells so that no number repeats in any row or column among
   the UNSHADED cells, shaded cells are never orthogonally adjacent, and the
   unshaded cells stay connected.
   Generator: build a random 9×9 Latin square, pick a valid "shaded" set (an
   independent set that keeps unshaded cells connected), then overwrite each
   shaded cell with a duplicate of an unshaded cell in its row/column. The
   original Latin square minus the shaded set is the guaranteed solution. */
(function () {
  "use strict";
  const N = 9;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function genLatin() {
    const base = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const shifts = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const L = [];
    for (let r = 0; r < N; r++) {
      L.push(Array.from({length: N}, (_, c) => base[(c + shifts[r]) % N]));
    }
    return L; // cyclic shifts of a shuffled base = guaranteed Latin square
  }

  // Pick the shaded ("black") cell set: greedy random independent set that
  // always keeps the unshaded region connected.
  function genShaded() {
    const target = 20 + Math.floor(Math.random() * 7); // 20–26 shaded cells
    const S = new Set();
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    shuffle(cells);

    function connectedExcluding(Sset) {
      let start = null;
      for (let r = 0; r < N && !start; r++) for (let c = 0; c < N; c++) {
        if (!Sset.has(r * N + c)) {
          start = [r, c];
          break;
        }
      }
      if (!start) return false;
      const seen = new Set([start[0] * N + start[1]]);
      const stack = [start];
      while (stack.length) {
        const [r, c] = stack.pop();
        const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
        for (const [nr, nc] of nbrs) {
          if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
          const k = nr * N + nc;
          if (Sset.has(k) || seen.has(k)) continue;
          seen.add(k);
          stack.push([nr, nc]);
        }
      }
      return seen.size === N * N - Sset.size;
    }

    for (const [r, c] of cells) {
      if (S.size >= target) break;
      const k = r * N + c;
      if (S.has(k)) continue;
      // orthogonal adjacency
      const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      let adj = false;
      for (const [nr, nc] of nbrs) {
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && S.has(nr * N + nc)) {
          adj = true;
          break;
        }
      }
      if (adj) continue;
      S.add(k);
      if (!connectedExcluding(S)) S.delete(k);
    }
    return S;
  }

  // Latin square + shaded set -> playable puzzle with duplicates at shaded cells.
  function genPuzzle() {
    const L = genLatin();
    const S = genShaded();
    const P = L.map(row => row.slice());
    const shaded = shuffle(Array.from(S));
    for (const k of shaded) {
      const r = Math.floor(k / N), c = k % N;
      const options = [];
      if (Math.random() < 0.5) options.push("row", "col"); else options.push("col", "row");
      let done = false;
      for (const dir of options) {
        if (done) break;
        const targets = [];
        if (dir === "row") {
          for (let cc = 0; cc < N; cc++) if (cc !== c && !S.has(r * N + cc)) targets.push([r, cc]);
        } else {
          for (let rr = 0; rr < N; rr++) if (rr !== r && !S.has(rr * N + c)) targets.push([rr, c]);
        }
        if (targets.length) {
          const t = targets[Math.floor(Math.random() * targets.length)];
          P[r][c] = P[t[0]][t[1]];
          done = true;
        }
      }
      // every row/col has ≥4 unshaded cells, so a target always exists
    }
    const sol = Array.from({length: N}, (_, r) =>
      Array.from({length: N}, (_, c) => S.has(r * N + c) ? 1 : 0));
    return {grid: P, sol};
  }

  let live = null;
  GameRegistry.register({
    id: "hitori9x9",
    name: "Hitori 9x9",
    icon: "⬛",
    category: "logic",
    description: "9×9 Hitori — shade cells so unshaded numbers never repeat per row/column",
    tags: ["logic", "puzzle", "hitori", "numbers"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, state = null, over = false, sel = null;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Shaded</div><div class="val" id="h9-count">0</div></div>
          <div class="score-cell"><div class="label">Conflicts</div><div class="val" id="h9-conf">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="h9-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="h9-best">—</div></div>
        </div>
        <div class="status info" id="h9-status">Click cells to shade them. Unshaded numbers must not repeat in any row or column.</div>
        <div class="center" style="margin:12px 0;"><div class="h9-grid" id="h9-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;">
          <button class="btn" id="h9-new">New puzzle</button>
          <button class="btn" id="h9-clear">Clear</button>
          <button class="btn primary" id="h9-check">Check</button>
        </div>
        <p class="hint">Shade cells until: (1) no number repeats per <b>row</b> or <b>column</b> among unshaded cells, (2) shaded cells never touch <b>orthogonally</b>, (3) unshaded cells form <b>one connected group</b>. Arrows move, Space toggles.</p>
      `;
      const statusEl = root.querySelector("#h9-status");
      const gridEl = root.querySelector("#h9-grid");

      if (!document.getElementById("h9-style")) {
        const s = document.createElement("style");
        s.id = "h9-style";
        s.textContent = `
          .h9-grid { display: inline-grid; grid-template-columns: repeat(${N}, 40px); grid-auto-rows: 40px; gap: 3px; background: var(--border); padding: 6px; border-radius: var(--radius); }
          .h9-cell { width: 40px; height: 40px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.05rem; cursor: pointer; user-select: none; color: var(--text); transition: background 0.12s; }
          .h9-cell.shaded { background: var(--text); color: var(--bg-elev); }
          .h9-cell.active { outline: 3px solid var(--accent); outline-offset: -2px; }
          .h9-cell.conflict { outline: 3px solid var(--danger); outline-offset: -2px; }
          .h9-cell:hover { border-radius: var(--radius); }
        `;
        document.head.appendChild(s);
      }

      function startTimer() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#h9-time");
          if (t) t.textContent = time + "s";
        }, 1000);
      }

      function conflicts() {
        const cf = new Set();
        // unshaded duplicates in rows
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            if (state[r][c]) continue;
            const v = puz.grid[r][c];
            if (seen[v] !== undefined) {
              cf.add(r + "," + c);
              cf.add(r + "," + seen[v]);
            }
            seen[v] = c;
          }
        }
        // unshaded duplicates in columns
        for (let c = 0; c < N; c++) {
          const seen = {};
          for (let r = 0; r < N; r++) {
            if (state[r][c]) continue;
            const v = puz.grid[r][c];
            if (seen[v] !== undefined) {
              cf.add(r + "," + c);
              cf.add(seen[v] + "," + c);
            }
            seen[v] = r;
          }
        }
        // orthogonally adjacent shaded cells
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!state[r][c]) continue;
          if (r + 1 < N && state[r + 1][c]) {
            cf.add(r + "," + c);
            cf.add((r + 1) + "," + c);
          }
          if (c + 1 < N && state[r][c + 1]) {
            cf.add(r + "," + c);
            cf.add(r + "," + (c + 1));
          }
        }
        return cf;
      }

      function unshadedConnected() {
        let start = null;
        for (let r = 0; r < N && !start; r++) for (let c = 0; c < N; c++) {
          if (!state[r][c]) {
            start = [r, c];
            break;
          }
        }
        if (!start) return false;
        const seen = new Set([start[0] * N + start[1]]);
        const stack = [start];
        let count = 1;
        while (stack.length) {
          const [r, c] = stack.pop();
          const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
          for (const [nr, nc] of nbrs) {
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            const k = nr * N + nc;
            if (state[nr][nc] || seen.has(k)) continue;
            seen.add(k);
            count++;
            stack.push([nr, nc]);
          }
        }
        let total = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!state[r][c]) total++;
        return count === total;
      }

      function render() {
        gridEl.innerHTML = "";
        const cf = conflicts();
        let shaded = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "h9-cell" + (state[r][c] ? " shaded" : "");
            if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
            if (cf.has(r + "," + c)) cell.classList.add("conflict");
            cell.textContent = puz.grid[r][c];
            cell.addEventListener("click", () => {
              if (over) return;
              sel = [r, c];
              state[r][c] = state[r][c] ? 0 : 1;
              AudioFX.pop();
              render();
            });
            gridEl.appendChild(cell);
            if (state[r][c]) shaded++;
          }
        }
        root.querySelector("#h9-count").textContent = shaded;
        root.querySelector("#h9-conf").textContent = cf.size;
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Solved in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("hitori9x9");
        if (best === null || time < best) {
          Storage.setBest("hitori9x9", time);
          root.querySelector("#h9-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function check() {
        if (over) return;
        const cf = conflicts();
        if (cf.size > 0) {
          AudioFX.error();
          statusEl.textContent = cf.size + " conflict" + (cf.size === 1 ? "" : "s") + " — duplicates or touching shaded cells.";
          statusEl.className = "status lose";
          return;
        }
        if (!unshadedConnected()) {
          AudioFX.error();
          statusEl.textContent = "No conflicts, but the unshaded cells are split into separate groups.";
          statusEl.className = "status lose";
          return;
        }
        win();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          if (!sel) {
            sel = [4, 4];
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
        if (e.key === " " || e.key === "Enter") {
          if (!sel) return;
          e.preventDefault();
          state[sel[0]][sel[1]] = state[sel[0]][sel[1]] ? 0 : 1;
          AudioFX.pop();
          render();
        }
      }

      document.addEventListener("keydown", onKey);

      root.querySelector("#h9-check").addEventListener("click", check);
      root.querySelector("#h9-clear").addEventListener("click", () => {
        if (over) return;
        state = Array.from({length: N}, () => Array(N).fill(0));
        AudioFX.click();
        render();
      });
      root.querySelector("#h9-new").addEventListener("click", () => newGame());

      function newGame() {
        puz = genPuzzle();
        state = Array.from({length: N}, () => Array(N).fill(0));
        over = false;
        sel = null;
        time = 0;
        recorded = false;
        startTimer();
        const best = Storage.getBest("hitori9x9");
        root.querySelector("#h9-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#h9-time").textContent = "0s";
        statusEl.textContent = "Click cells to shade them. Unshaded numbers must not repeat in any row or column.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !puz) return;
          const cf = conflicts();
          const wrong = [];
          const conflicted = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (state[r][c] !== puz.sol[r][c]) {
              wrong.push([r, c]);
              if (cf.has(r + "," + c)) conflicted.push([r, c]);
            }
          }
          const pool = conflicted.length ? conflicted : wrong;
          if (!pool.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const pick = pool[Math.floor(Math.random() * pool.length)];
          state[pick[0]][pick[1]] = puz.sol[pick[0]][pick[1]];
          AudioFX.reveal();
          App.toast("Hint: R" + (pick[0] + 1) + "C" + (pick[1] + 1) + " should be " + (puz.sol[pick[0]][pick[1]] ? "shaded" : "unshaded"), "info");
          render();
        },
        solve: function () {
          if (over || !puz) return;
          state = puz.sol.map(row => row.slice());
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
      App.showModal("How to play Hitori 9×9",
        `Shade cells in the 9×9 grid so that:
        <br><br>1. No number appears more than once in any <b>row</b> among unshaded cells.
        <br>2. No number appears more than once in any <b>column</b> among unshaded cells.
        <br>3. Shaded cells are <b>never orthogonally adjacent</b> (no shared edges).
        <br>4. Unshaded cells form a <b>single connected group</b> (up/down/left/right).
        <br><br>Click a cell to toggle its shading (or move with <b>arrow keys</b> and press <b>Space</b>). Duplicate numbers and touching shaded cells are highlighted live in red.`);
    },
  });
})();
