/* Nurikabe — shade cells so each numbered island has exactly that many cells,
   islands are separated, the sea is one connected group with no 2×2 pools.
   Generator: grow islands from random seeds first (never touching), then
   verify the remaining sea is connected and has no 2×2 pool — retry otherwise.
   The known solution satisfies every rule by construction. */
(function () {
  "use strict";

  const N = 7, ISLANDS = 6;

  function validLayout(sol, numbers) {
    // islands = connected components of island cells; each must carry exactly
    // one number equal to its size; sea must be connected with no 2x2 pool.
    const seen = new Set(), comps = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!sol[r][c] || seen.has(r + "," + c)) continue;
      const comp = [], stack = [[r, c]];
      seen.add(r + "," + c);
      while (stack.length) {
        const [cr, cc] = stack.pop();
        comp.push([cr, cc]);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && sol[nr][nc] && !seen.has(nr + "," + nc)) {
            seen.add(nr + "," + nc);
            stack.push([nr, nc]);
          }
        }
      }
      comps.push(comp);
    }
    for (const [nr, nc, sz] of numbers) {
      const comp = comps.find(c => c.some(([r, c2]) => r === nr && c2 === nc));
      if (!comp || comp.length !== sz) return false;
    }
    for (const comp of comps)
      if (!comp.some(([r, c]) => numbers.some(([nr, nc]) => nr === r && nc === c))) return false;
    const sea = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!sol[r][c]) sea.push([r, c]);
    if (!sea.length) return false;
    const sseen = new Set([sea[0].join(",")]), stack = [sea[0]];
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && !sol[nr][nc] && !sseen.has(nr + "," + nc)) {
          sseen.add(nr + "," + nc);
          stack.push([nr, nc]);
        }
      }
    }
    if (sseen.size !== sea.length) return false;
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++)
      if (!sol[r][c] && !sol[r][c + 1] && !sol[r + 1][c] && !sol[r + 1][c + 1]) return false;
    return true;
  }

  function generate() {
    // v2: seed ISLANDS non-touching islands, then REPAIR every 2x2 all-sea
    // block by growing an adjacent island; numbers come from final sizes.
    // (The old pure-rejection sampler never succeeded on 7x7.)
    for (let attempt = 0; attempt < 60; attempt++) {
      const sol = Array.from({length: N}, () => Array(N).fill(0));
      const islands = [];
      let ok = true;
      for (let i = 0; i < ISLANDS && ok; i++) {
        let placed = false;
        for (let tries = 0; tries < 80 && !placed; tries++) {
          const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
          if (sol[r][c]) continue;
          let touch = false;
          for (let dr = -1; dr <= 1 && !touch; dr++) for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && sol[nr][nc]) {
              touch = true;
              break;
            }
          }
          if (touch) continue;
          sol[r][c] = 1;
          islands.push([[r, c]]);
          placed = true;
        }
        if (!placed) ok = false;
      }
      if (!ok) continue;

      let repaired = true;
      for (let pass = 0; pass < 200; pass++) {
        const blocks = [];
        for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++)
          if (!sol[r][c] && !sol[r][c + 1] && !sol[r + 1][c] && !sol[r + 1][c + 1]) blocks.push([r, c]);
        if (!blocks.length) break;
        const [br, bc] = blocks[Math.floor(Math.random() * blocks.length)];
        const cand = [[br, bc], [br, bc + 1], [br + 1, bc], [br + 1, bc + 1]].filter(([r, c]) => !sol[r][c]);
        cand.sort(() => Math.random() - 0.5);
        let fixed = false;
        for (const [r, c] of cand) {
          const growers = [];
          for (const isl of islands) {
            if (isl.length >= 5) continue;
            if (!isl.some(([ir, ic]) => Math.abs(ir - r) + Math.abs(ic - c) === 1)) continue;
            let touchOther = false;
            for (let dr = -1; dr <= 1 && !touchOther; dr++) for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr < 0 || nr >= N || nc < 0 || nc >= N || (nr === r && nc === c)) continue;
              if (sol[nr][nc] && !isl.some(([ir, ic]) => ir === nr && ic === nc)) {
                touchOther = true;
                break;
              }
            }
            if (!touchOther) growers.push(isl);
          }
          if (growers.length) {
            const isl = growers[Math.floor(Math.random() * growers.length)];
            sol[r][c] = 1;
            isl.push([r, c]);
            fixed = true;
            break;
          }
        }
        if (!fixed) {
          repaired = false;
          break;
        }
      }
      if (!repaired) continue;

      const numbers = islands.map(isl => [isl[0][0], isl[0][1], isl.length]);
      if (!validLayout(sol, numbers)) continue;
      return {numbers, sol};
    }
    // fallback: hand-verified 7x7 layout (matches N)
    const sol = [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 1, 1],
      [0, 0, 0, 0, 0, 1, 1],
      [0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 1],
      [0, 1, 0, 0, 0, 1, 1],
      [0, 1, 1, 1, 0, 0, 0],
    ];
    const numbers = [[3, 3, 2], [1, 2, 3], [3, 1, 1], [5, 6, 4], [2, 6, 4], [6, 2, 4]];
    return {numbers, sol};
  }

  let live = null;
  GameRegistry.register({
    id: "nurikabe",
    name: "Nurikabe",
    icon: "🌊",
    category: "logic",
    description: "Shade the sea — each numbered island keeps its size",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, state = null, over = false; // state: 0 unknown, 1 sea, 2 island

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Sea</div><div class="val" id="nb2-sea">0</div></div>
          <div class="score-cell"><div class="label">Islands</div><div class="val" id="nb2-islands">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="nb2-best">—</div></div>
        </div>
        <div class="status info" id="nb2-status">Click cells to shade them as sea. Numbers start an island of exactly that many cells.</div>
        <div class="center" style="margin:14px 0;"><div class="nb2-grid" id="nb2-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="nb2-clear">Clear</button>
          <button class="btn primary" id="nb2-check">Check</button>
        </div>
        <p class="hint">Each number is an island of exactly that size. Islands (unshaded groups) can't touch. Shaded cells form one connected sea with <b>no 2×2 pools</b>.</p>
      `;
      const statusEl = root.querySelector("#nb2-status");
      const gridEl = root.querySelector("#nb2-grid");
      if (!document.getElementById("nb2-style")) {
        const s = document.createElement("style");
        s.id = "nb2-style";
        s.textContent = `
          .nb2-grid { display: inline-grid; grid-template-columns: repeat(${N}, 50px); gap: 2px; background: var(--border); padding: 4px; border-radius: var(--radius); }
          .nb2-cell { width: 50px; height: 50px; background: var(--bg-elev); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.2rem; cursor: pointer; user-select: none; }
          .nb2-cell.sea { background: #1e3a5f; color: #dbeafe; }
          .nb2-cell.island { background: #fef9c3; }
        `;
        document.head.appendChild(s);
      }

      function numAt(r, c) {
        return puzzle.numbers.find(([nr, nc]) => nr === r && nc === c);
      }

      function render() {
        gridEl.innerHTML = "";
        let sea = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "nb2-cell" + (state[r][c] === 1 ? " sea" : "") + (state[r][c] === 2 ? " island" : "");
          const num = numAt(r, c);
          if (num) cell.textContent = num[2];
          cell.addEventListener("click", () => {
            if (over || numAt(r, c)) return;
            state[r][c] = (state[r][c] + 1) % 3;
            AudioFX.pop();
            render();
          });
          gridEl.appendChild(cell);
          if (state[r][c] === 1) sea++;
        }
        root.querySelector("#nb2-sea").textContent = sea;
        const isl = countIslands();
        root.querySelector("#nb2-islands").textContent = isl;
      }

      function countIslands() {
        // islands = connected components of non-sea cells (unknown counts as island candidate)
        const seen = new Set();
        let n = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (state[r][c] === 1 || seen.has(r + "," + c)) continue;
          n++;
          const stack = [[r, c]];
          seen.add(r + "," + c);
          while (stack.length) {
            const [cr, cc] = stack.pop();
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < N && nc >= 0 && nc < N && state[nr][nc] !== 1 && !seen.has(nr + "," + nc)) {
                seen.add(nr + "," + nc);
                stack.push([nr, nc]);
              }
            }
          }
        }
        return n;
      }

      function check() {
        if (over) return;
        // islands: every non-sea cell belongs to an island with exactly one number of the right size
        const seen = new Set();
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (state[r][c] === 1 || seen.has(r + "," + c)) continue;
          const stack = [[r, c]], cells = [];
          seen.add(r + "," + c);
          while (stack.length) {
            const [cr, cc] = stack.pop();
            cells.push([cr, cc]);
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nr = cr + dr, nc = cc + dc;
              if (nr >= 0 && nr < N && nc >= 0 && nc < N && state[nr][nc] !== 1 && !seen.has(nr + "," + nc)) {
                seen.add(nr + "," + nc);
                stack.push([nr, nc]);
              }
            }
          }
          const nums = cells.filter(([cr, cc]) => numAt(cr, cc));
          if (nums.length === 0) return fail("An island has no number.");
          if (nums.length > 1) return fail("An island has multiple numbers.");
          const [nr, nc, val] = numAt(nums[0][0], nums[0][1]);
          if (cells.length !== val) return fail(`Island at (${nr + 1},${nc + 1}) has ${cells.length} cells — needs ${val}.`);
        }
        // sea: connected, no 2x2
        const sea = [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (state[r][c] === 1) sea.push([r, c]);
        if (!sea.length) return fail("Shade some sea cells.");
        const s2 = new Set(sea[0].join(","));
        const stack = [sea[0]];
        while (stack.length) {
          const [r, c] = stack.pop();
          for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && state[nr][nc] === 1 && !s2.has(nr + "," + nc)) {
              s2.add(nr + "," + nc);
              stack.push([nr, nc]);
            }
          }
        }
        if (s2.size !== sea.length) return fail("The sea must be one connected group.");
        for (let r = 0; r < N - 1; r++) for (let c = 0; c < N - 1; c++) {
          if (state[r][c] === 1 && state[r][c + 1] === 1 && state[r + 1][c] === 1 && state[r + 1][c + 1] === 1) {
            return fail("No 2×2 sea pools allowed.");
          }
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("nurikabe");
        if (!best || 100 > best) {
          Storage.setBest("nurikabe", 100);
          root.querySelector("#nb2-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        const size = puzzle.sol.length;
        state = Array.from({length: size}, () => Array(size).fill(0));
        puzzle.numbers.forEach(([r, c]) => state[r][c] = 2);
        over = false;
        const best = Storage.getBest("nurikabe");
        root.querySelector("#nb2-best").textContent = best || "—";
        statusEl.textContent = "Click cells to shade them as sea. Numbers start an island of exactly that many cells.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#nb2-check").addEventListener("click", check);
      root.querySelector("#nb2-clear").addEventListener("click", () => {
        if (over) return;
        const size = state.length;
        state = Array.from({length: size}, () => Array(size).fill(0));
        puzzle.numbers.forEach(([r, c]) => state[r][c] = 2);
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const size = puzzle.sol.length;
          const wrong = [];
          for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
            if (numAt(r, c)) continue;
            const want = puzzle.sol[r][c] ? 2 : 1;
            if (state[r][c] !== want) wrong.push([r, c, want]);
          }
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [r, c, want] = wrong[Math.floor(Math.random() * wrong.length)];
          state[r][c] = want;
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          const size = puzzle.sol.length;
          state = puzzle.sol.map(row => row.slice());
          puzzle.numbers.forEach(([r, c]) => state[r][c] = 2);
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        },
      };
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Nurikabe",
        `Shade cells to create the sea:
        <br><br>• Each <b>number</b> is an island containing exactly that many cells (including the numbered one).
        <br>• Islands may not touch each other, even diagonally? No — islands connect orthogonally; two islands can never share an edge.
        <br>• All shaded cells form <b>one connected sea</b>.
        <br>• The sea may not contain any <b>2×2 pool</b>.
        <br><br>Click a cell to cycle: empty → sea → island.`);
    },
  });
})();
