/* Futoshiki 7×7 — fill every row and column with 1–7 (Latin square) while honoring
   the > and < signs between adjacent cells. Puzzles are generated from a known-valid
   solution (random Latin square + inequality clues taken from that solution), then
   cells are dug out for the player. Any complete grid satisfying all rules wins. */
(function () {
  "use strict";
  const N = 7;

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
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

  // Random Latin square: shuffled base symbol set + distinct cyclic row shifts,
  // then a random column permutation. Structurally always a Latin square; the
  // isLatin() assertion is belt-and-braces (retry, then safe fallback).
  function genLatin() {
    for (let attempt = 0; attempt < 100; attempt++) {
      const base = shuffle([1, 2, 3, 4, 5, 6, 7]);
      const shifts = shuffle([0, 1, 2, 3, 4, 5, 6]);
      const colPerm = shuffle([0, 1, 2, 3, 4, 5, 6]);
      const L = [];
      for (let r = 0; r < N; r++) {
        const row = [];
        for (let c = 0; c < N; c++) row.push(base[(colPerm[c] + shifts[r]) % N]);
        L.push(row);
      }
      if (isLatin(L)) return L;
    }
    return Array.from({length: N}, (_, r) =>
      Array.from({length: N}, (_, c) => ((r + c) % N) + 1));
  }

  // Generate-then-dig: solution Latin square, consistent inequality clues on
  // random internal edges, and a handful of given cells.
  function genPuzzle() {
    const sol = genLatin();
    const edges = [];
    for (let r = 0; r < N; r++) for (let c = 0; c + 1 < N; c++) edges.push({r1: r, c1: c, r2: r, c2: c + 1, dir: "h"});
    for (let r = 0; r + 1 < N; r++) for (let c = 0; c < N; c++) edges.push({r1: r, c1: c, r2: r + 1, c2: c, dir: "v"});
    shuffle(edges);
    const cons = [];
    const target = 18 + Math.floor(Math.random() * 6); // 18–23 signs
    for (const e of edges) {
      if (cons.length >= target) break;
      cons.push({
        r1: e.r1, c1: e.c1, r2: e.r2, c2: e.c2, dir: e.dir,
        op: sol[e.r1][e.c1] > sol[e.r2][e.c2] ? ">" : "<",
        key: e.r1 + "," + e.c1 + "," + e.dir,
      });
    }
    const cells = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) cells.push([r, c]);
    shuffle(cells);
    const givenCount = 16 + Math.floor(Math.random() * 5); // 16–20 givens
    const given = Array.from({length: N}, () => Array(N).fill(false));
    for (let i = 0; i < givenCount; i++) given[cells[i][0]][cells[i][1]] = true;
    const grid = Array.from({length: N}, (_, r) =>
      Array.from({length: N}, (_, c) => given[r][c] ? sol[r][c] : 0));
    return {sol, cons, given, grid};
  }

  let live = null;
  GameRegistry.register({
    id: "futoshiki7x7",
    name: "Futoshiki 7x7",
    icon: "⪌",
    category: "logic",
    description: "7×7 Latin square — place 1–7 in every row & column, obeying every > / < sign",
    tags: ["logic", "puzzle", "latin-square", "numbers"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puz = null, over = false, sel = null;
      let time = 0, timer = null, recorded = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="f77-filled">0 / 49</div></div>
          <div class="score-cell"><div class="label">Conflicts</div><div class="val" id="f77-conf">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="f77-time">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="f77-best">—</div></div>
        </div>
        <div class="status info" id="f77-status">Click a cell, then type or tap 1–7. Every row &amp; column needs 1–7 with no repeats, and all signs must hold.</div>
        <div class="center" style="margin:12px 0;"><div class="f77-grid" id="f77-grid"></div></div>
        <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap;" id="f77-pad">
          ${[1, 2, 3, 4, 5, 6, 7].map(d => `<button class="btn" data-d="${d}" style="min-width:42px;">${d}</button>`).join("")}
          <button class="btn" id="f77-erase" style="min-width:42px;">⌫</button>
        </div>
        <div class="row" style="justify-content:center;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn" id="f77-new">New puzzle</button>
          <button class="btn" id="f77-clear">Clear</button>
          <button class="btn primary" id="f77-check">Check</button>
        </div>
        <p class="hint">Each row &amp; column must contain 1–7 exactly once. Signs point from the <b>larger</b> to the <b>smaller</b> number (a wide end faces the bigger value). Arrow keys move, digits fill, Backspace clears.</p>
      `;
      const statusEl = root.querySelector("#f77-status");
      const gridEl = root.querySelector("#f77-grid");

      if (!document.getElementById("f77-style")) {
        const s = document.createElement("style");
        s.id = "f77-style";
        s.textContent = `
          .f77-grid { display: inline-grid; grid-template-columns: repeat(${N}, 44px); grid-auto-rows: 44px; gap: 12px; }
          .f77-cell { position: relative; background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 1.15rem; cursor: pointer; user-select: none; color: var(--text); }
          .f77-cell.given { color: var(--accent); cursor: default; }
          .f77-cell.active { outline: 3px solid var(--accent); outline-offset: -1px; }
          .f77-cell.err { color: var(--danger); border-color: var(--danger); }
          .f77-sign { position: absolute; display: grid; place-items: center; font-family: var(--font-mono); font-weight: 700; font-size: 0.85rem; line-height: 1; color: var(--warning); pointer-events: none; }
          .f77-sign.h { right: -12px; top: 0; width: 12px; height: 100%; }
          .f77-sign.v { bottom: -12px; left: 0; width: 100%; height: 12px; }
          .f77-sign.err { color: var(--danger); }
        `;
        document.head.appendChild(s);
      }

      timer = setInterval(() => {
        if (!alive) return;
        time++;
        const t = root.querySelector("#f77-time");
        if (t) t.textContent = time + "s";
      }, 1000);

      function conflicts() {
        const cells = new Set();
        for (let r = 0; r < N; r++) {
          const seen = {};
          for (let c = 0; c < N; c++) {
            const v = puz.grid[r][c];
            if (!v) continue;
            if (seen[v] !== undefined) {
              cells.add(r + "," + c);
              cells.add(r + "," + seen[v]);
            }
            seen[v] = c;
          }
        }
        for (let c = 0; c < N; c++) {
          const seen = {};
          for (let r = 0; r < N; r++) {
            const v = puz.grid[r][c];
            if (!v) continue;
            if (seen[v] !== undefined) {
              cells.add(r + "," + c);
              cells.add(seen[v] + "," + c);
            }
            seen[v] = r;
          }
        }
        const signs = new Set();
        for (const cs of puz.cons) {
          const a = puz.grid[cs.r1][cs.c1], b = puz.grid[cs.r2][cs.c2];
          if (a && b) {
            const bad = cs.op === ">" ? a <= b : a >= b;
            if (bad) {
              signs.add(cs.key);
              cells.add(cs.r1 + "," + cs.c1);
              cells.add(cs.r2 + "," + cs.c2);
            }
          }
        }
        return {cells, signs};
      }

      function filledCount() {
        return puz.grid.flat().filter(v => v).length;
      }

      function render() {
        gridEl.innerHTML = "";
        const cf = conflicts();
        const signMap = {};
        for (const cs of puz.cons) signMap[cs.key] = cs;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "f77-cell";
            if (puz.given[r][c]) cell.classList.add("given");
            if (sel && sel[0] === r && sel[1] === c) cell.classList.add("active");
            if (cf.cells.has(r + "," + c)) cell.classList.add("err");
            cell.textContent = puz.grid[r][c] || "";
            if (!puz.given[r][c]) cell.addEventListener("click", () => {
              if (over) return;
              sel = [r, c];
              AudioFX.tick();
              render();
            });
            const h = signMap[r + "," + c + ",h"];
            if (h) {
              const s = document.createElement("div");
              s.className = "f77-sign h" + (cf.signs.has(h.key) ? " err" : "");
              s.textContent = h.op;
              cell.appendChild(s);
            }
            const v = signMap[r + "," + c + ",v"];
            if (v) {
              const s = document.createElement("div");
              s.className = "f77-sign v" + (cf.signs.has(v.key) ? " err" : "");
              s.textContent = v.op === ">" ? "v" : "^";
              cell.appendChild(s);
            }
            gridEl.appendChild(cell);
          }
        }
        root.querySelector("#f77-filled").textContent = filledCount() + " / " + (N * N);
        root.querySelector("#f77-conf").textContent = cf.cells.size;
      }

      function win() {
        over = true;
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = "🎉 Solved in " + time + "s!";
        statusEl.className = "status win";
        const best = Storage.getBest("futoshiki7x7");
        if (best === null || time < best) {
          Storage.setBest("futoshiki7x7", time);
          root.querySelector("#f77-best").textContent = time + "s";
          App.toast("New best: " + time + "s", "success");
        }
        if (!recorded) {
          recorded = true;
          App.recordResult(true, time);
        }
      }

      function autoCheck() {
        if (over || filledCount() < N * N) return;
        if (conflicts().cells.size === 0) win();
      }

      function place(d) {
        if (over || !sel) return;
        const r = sel[0], c = sel[1];
        if (puz.given[r][c]) return;
        puz.grid[r][c] = d;
        AudioFX.pop();
        // advance to the next empty, non-given cell
        for (let i = r * N + c + 1; i < N * N; i++) {
          const rr = Math.floor(i / N), cc = i % N;
          if (!puz.given[rr][cc] && !puz.grid[rr][cc]) {
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
        if (puz.given[r][c]) return;
        puz.grid[r][c] = 0;
        AudioFX.click();
        render();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          if (!sel) {
            sel = [3, 3];
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
        if (/^[1-7]$/.test(e.key)) {
          place(parseInt(e.key, 10));
          return;
        }
        if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") erase();
      }

      document.addEventListener("keydown", onKey);

      function check() {
        if (over) return;
        const filled = filledCount();
        if (filled < N * N) {
          AudioFX.error();
          statusEl.textContent = "Fill every cell first (" + filled + " / " + (N * N) + ").";
          statusEl.className = "status lose";
          return;
        }
        const cf = conflicts();
        if (cf.cells.size > 0) {
          AudioFX.error();
          statusEl.textContent = cf.cells.size + " conflict" + (cf.cells.size === 1 ? "" : "s") + " — highlighted in red.";
          statusEl.className = "status lose";
          return;
        }
        win();
      }

      root.querySelector("#f77-check").addEventListener("click", check);
      root.querySelector("#f77-clear").addEventListener("click", () => {
        if (over) return;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (!puz.given[r][c]) puz.grid[r][c] = 0;
        }
        sel = null;
        AudioFX.click();
        render();
      });
      root.querySelector("#f77-new").addEventListener("click", () => newGame());
      root.querySelector("#f77-erase").addEventListener("click", erase);
      root.querySelectorAll("#f77-pad [data-d]").forEach(btn =>
        btn.addEventListener("click", () => place(parseInt(btn.dataset.d, 10))));

      function newGame() {
        puz = genPuzzle();
        over = false;
        sel = null;
        time = 0;
        recorded = false;
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          time++;
          const t = root.querySelector("#f77-time");
          if (t) t.textContent = time + "s";
        }, 1000);
        const best = Storage.getBest("futoshiki7x7");
        root.querySelector("#f77-best").textContent = best === null ? "—" : best + "s";
        root.querySelector("#f77-time").textContent = "0s";
        statusEl.textContent = "Click a cell, then type or tap 1–7. Every row & column needs 1–7 with no repeats, and all signs must hold.";
        statusEl.className = "status info";
        render();
      }

      live = {
        hint: function () {
          if (over || !puz) return;
          const cands = [];
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
            if (!puz.given[r][c] && puz.grid[r][c] !== puz.sol[r][c]) cands.push([r, c]);
          }
          if (!cands.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const pick = cands[Math.floor(Math.random() * cands.length)];
          const r = pick[0], c = pick[1];
          puz.grid[r][c] = puz.sol[r][c];
          puz.given[r][c] = true;
          AudioFX.reveal();
          App.toast("Hint: R" + (r + 1) + "C" + (c + 1) + " = " + puz.sol[r][c], "info");
          render();
          autoCheck();
        },
        solve: function () {
          if (over || !puz) return;
          for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) puz.grid[r][c] = puz.sol[r][c];
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
      App.showModal("How to play Futoshiki 7×7",
        `Fill the 7×7 grid so that:
        <br><br>• Each <b>row</b> contains the digits 1–7 exactly once.
        <br>• Each <b>column</b> contains the digits 1–7 exactly once.
        <br>• Every <b>inequality sign</b> between two cells holds — the wide end faces the larger number.
        <br><br>Click a cell (or move with the <b>arrow keys</b>), then type or tap a digit 1–7. <b>Backspace</b> clears.
        <br>Conflicts (repeats or broken signs) are highlighted live in red. The puzzle is won when the grid is complete and every rule holds.`);
    },
  });
})();
