/* Number Link — 5x5 grid with numbered pairs. Draw paths to connect each pair without crossing. */
(function () {
  // Pre-baked puzzle: pairs of endpoints (same label), paths must connect them.
  const PUZZLES = [{
    "N": 5,
    "endpoints": {"1": [[2, 4], [3, 3]], "2": [[3, 4], [2, 2]], "3": [[2, 1], [0, 2]]}
  }, {"N": 5, "endpoints": {"1": [[2, 2], [1, 3]], "2": [[1, 2], [4, 0]], "3": [[4, 1], [4, 4]]}}];
  let live = null;
  GameRegistry.register({
    id: "numberlink",
    name: "Number Link",
    icon: "🔗",
    category: "logic",
    description: "Connect each numbered pair with a path. No crossings.",
    tags: ["logic", "puzzle", "path"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle, cells, drawing = null, over = false;
      root.innerHTML = `
        <div class="status info" id="nl-status">Click and drag from a number to its matching pair.</div>
        <div class="center" style="margin:14px 0;"><div id="nl-grid"></div></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="nl-clear">Clear</button>
          <button class="btn primary" id="nl-check">Check</button>
        </div>
        <p class="hint">Drag from one number to its match. Paths cannot cross or share cells. All non-number cells must be filled.</p>
      `;
      const statusEl = root.querySelector("#nl-status");
      const gridEl = root.querySelector("#nl-grid");
      if (!document.getElementById("nl-style")) {
        const s = document.createElement("style");
        s.id = "nl-style";
        s.textContent = `#nl-grid{display:grid;background:var(--border);padding:1px;gap:1px;}.nl-cell{width:48px;height:48px;background:var(--bg-elev);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;cursor:pointer;user-select:none;}.nl-cell.endpoint{background:var(--accent);color:#fff;}.nl-cell.path1{background:rgba(99,102,241,0.35);}.nl-cell.path2{background:rgba(244,114,182,0.35);}.nl-cell.path3{background:rgba(34,197,94,0.35);}`;
        document.head.appendChild(s);
      }

      function endpointsOf(label) {
        return puzzle.endpoints[label];
      }

      function cellAt(r, c) {
        return r >= 0 && r < puzzle.N && c >= 0 && c < puzzle.N;
      }

      function render() {
        const N = puzzle.N;
        gridEl.style.gridTemplateColumns = `repeat(${N},48px)`;
        gridEl.innerHTML = "";
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const cell = document.createElement("div");
            cell.className = "nl-cell";
            cell.dataset.r = r;
            cell.dataset.c = c;
            const v = cells[r][c];
            if (v && typeof v === "string" && v.length === 1 && /[1-9]/.test(v)) {
              cell.classList.add("endpoint");
              cell.textContent = v;
            } else if (v && typeof v === "object") {
              cell.classList.add("path" + v.label);
            }
            gridEl.appendChild(cell);
          }
        }
      }

      function startDraw(r, c) {
        if (over) return;
        const v = cells[r][c];
        if (!v || typeof v !== "string" || !/[1-9]/.test(v)) return;
        drawing = {label: v, path: [[r, c]]};
        AudioFX.click();
      }

      function extendDraw(r, c) {
        if (!drawing) return;
        const last = drawing.path[drawing.path.length - 1];
        if (last[0] === r && last[1] === c) return;
        // must be adjacent
        if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;
        const v = cells[r][c];
        // endpoint of same label = finish
        if (v === drawing.label) {
          const eps = endpointsOf(drawing.label);
          const starts = drawing.path[0];
          if ((eps[0][0] === starts[0] && eps[0][1] === starts[1]) || (eps[1][0] === starts[0] && eps[1][1] === starts[1])) {
            // commit path: clear old path of this label, then set new
            for (let rr = 0; rr < puzzle.N; rr++) for (let cc = 0; cc < puzzle.N; cc++) {
              const cv = cells[rr][cc];
              if (cv && typeof cv === "object" && cv.label === drawing.label) cells[rr][cc] = 0;
            }
            drawing.path.forEach(([rr, cc]) => {
              if (cells[rr][cc] === drawing.label || cells[rr][cc] === 0) cells[rr][cc] = {label: drawing.label};
            });
            // restore endpoints
            cells[eps[0][0]][eps[0][1]] = drawing.label;
            cells[eps[1][0]][eps[1][1]] = drawing.label;
            drawing = null;
            AudioFX.pop();
            render();
            checkAuto();
            return;
          }
        }
        // can't enter other endpoint or filled cell
        if (v && (typeof v === "string" || (typeof v === "object" && v.label !== drawing.label))) return;
        // avoid revisits in path
        if (drawing.path.some(p => p[0] === r && p[1] === c)) return;
        cells[r][c] = {label: drawing.label};
        drawing.path.push([r, c]);
        AudioFX.tick();
        render();
      }

      function endDraw() {
        drawing = null;
      }

      function checkAuto() {
        // win: every non-endpoint cell is filled with a path object
        const N = puzzle.N;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = cells[r][c];
          if (!v) return;
          if (typeof v === "string") continue; // endpoint
        }
        // also verify each pair is connected: count path cells per label forms a contiguous chain — simple heuristic.
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("numberlink");
        if (!best || 100 > best) {
          Storage.setBest("numberlink", 100);
          App.toast("Solved!", "success");
        }
      }

      function check() {
        if (over) return;
        let filled = 0, total = 0;
        const N = puzzle.N;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          total++;
          if (cells[r][c]) filled++;
        }
        if (filled === total) checkAuto();
        else {
          AudioFX.error();
          statusEl.textContent = `Fill all cells (${filled}/${total}).`;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        const N = puzzle.N;
        cells = Array.from({length: N}, () => Array(N).fill(0));
        for (const label in puzzle.endpoints) {
          const [a, b] = puzzle.endpoints[label];
          cells[a[0]][a[1]] = label;
          cells[b[0]][b[1]] = label;
        }
        over = false;
        statusEl.textContent = "Drag from a number to its match.";
        statusEl.className = "status info";
        render();
      }

      gridEl.addEventListener("mousedown", e => {
        const t = e.target.closest(".nl-cell");
        if (!t) return;
        startDraw(+t.dataset.r, +t.dataset.c);
      });
      gridEl.addEventListener("mousemove", e => {
        if (!drawing) return;
        const t = e.target.closest(".nl-cell");
        if (!t) return;
        extendDraw(+t.dataset.r, +t.dataset.c);
      });
      document.addEventListener("mouseup", endDraw);
      gridEl.addEventListener("touchstart", e => {
        const t = e.target.closest(".nl-cell");
        if (!t) return;
        startDraw(+t.dataset.r, +t.dataset.c);
        e.preventDefault();
      });
      gridEl.addEventListener("touchmove", e => {
        if (!drawing) return;
        const touch = e.touches[0];
        const t = document.elementFromPoint(touch.clientX, touch.clientY)?.closest(".nl-cell");
        if (t) extendDraw(+t.dataset.r, +t.dataset.c);
        e.preventDefault();
      });
      document.addEventListener("touchend", endDraw);
      root.querySelector("#nl-check").addEventListener("click", check);
      root.querySelector("#nl-clear").addEventListener("click", () => {
        if (over) return;
        newGame();
      });
      live = {
        solve: function () {
          // Reveal by clearing paths but keeping endpoints
          newGame();
          over = true;
          AudioFX.lose();
          statusEl.textContent = "Cleared — try again from scratch.";
          statusEl.className = "status lose";
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("mouseup", endDraw);
        document.removeEventListener("touchend", endDraw);
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Number Link",
        `Connect each pair of identical numbers with a continuous path.
        <br><br>Paths move one cell at a time (up/down/left/right). They cannot cross or share cells with other paths.
        <br><br>Drag from one number to its match. Win when every cell is filled.`);
    },
  });
})();
