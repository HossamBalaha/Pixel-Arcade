/* Peg Solitaire — English board. Jump pegs, remove. Goal: 1 peg in center. */
(function () {
  // English cross board: 7x7 with corners cut
  // valid positions form a plus shape
  let live = null;
  const SIZE = 7;

  function isBoard(r, c) {
    // Cross: middle 3 columns/rows everywhere, plus center
    if ((r < 2 || r > 4) && (c < 2 || c > 4)) return false;
    return true;
  }

  function newBoard() {
    const b = Array.from({length: SIZE}, () => Array(SIZE).fill(-1)); // -1 invalid, 0 empty, 1 peg
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (isBoard(r, c)) b[r][c] = 1;
    }
    b[3][3] = 0; // center empty
    return b;
  }

  function countPegs(b) {
    let n = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (b[r][c] === 1) n++;
    return n;
  }

  function validMoves(b) {
    const out = [];
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (b[r][c] !== 1) continue;
      for (const [dr, dc] of dirs) {
        const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
        if (tr < 0 || tr >= SIZE || tc < 0 || tc >= SIZE) continue;
        if (!isBoard(tr, tc)) continue;
        if (b[mr][mc] === 1 && b[tr][tc] === 0) out.push({from: [r, c], over: [mr, mc], to: [tr, tc]});
      }
    }
    return out;
  }

  function inB(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE && isBoard(r, c);
  }

  GameRegistry.register({
    id: "pegsolitaire",
    name: "Peg Solitaire",
    icon: "🔵",
    category: "logic",
    description: "Jump pegs over each other to leave just one in the center",
    tags: ["puzzle", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, sel, moves, over, won;
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
          <div class="score-cell"><div class="label">Pegs</div><div class="val" id="ps-p">32</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="ps-m">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ps-best">-</div></div>
        </div>
        <div class="status info" id="ps-status">Jump pegs over each other — leave 1 in the center</div>
        <div class="center"><div id="ps-grid" style="display:grid;grid-template-columns:repeat(7,40px);grid-template-rows:repeat(7,40px);gap:4px;"></div></div>
        <p class="hint">Click a peg, then a valid landing spot 2 squares away. <b>R</b> restart.</p>
      `;
      const gridEl = root.querySelector("#ps-grid");
      const statusEl = root.querySelector("#ps-status");
      root.querySelector("#ps-best").textContent = Storage.getBest("pegsolitaire") ?? "-";

      function newGame() {
        b = newBoard();
        sel = null;
        moves = 0;
        over = false;
        won = false;
        statusEl.textContent = "Jump pegs over each other — leave 1 in the center";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        const valid = sel ? validMoves(b).filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]) : [];
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
          const cell = document.createElement("div");
          if (!isBoard(r, c)) {
            cell.style.background = "transparent";
            cell.style.cursor = "default";
          } else {
            cell.style.background = "var(--bg-elev)";
            cell.style.display = "grid";
            cell.style.placeItems = "center";
            cell.style.borderRadius = "50%";
            cell.style.cursor = "pointer";
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (b[r][c] === 1) {
              const dot = document.createElement("div");
              dot.style.width = "26px";
              dot.style.height = "26px";
              dot.style.borderRadius = "50%";
              dot.style.background = "var(--accent)";
              dot.style.boxShadow = "inset 0 -3px 4px rgba(0,0,0,0.2)";
              cell.appendChild(dot);
            }
            if (sel && sel[0] === r && sel[1] === c) cell.style.outline = "3px solid var(--warning)";
            if (valid.some(m => m.to[0] === r && m.to[1] === c)) cell.style.outline = "3px solid var(--success)";
            cell.addEventListener("click", () => onCell(r, c));
          }
          gridEl.appendChild(cell);
        }
        root.querySelector("#ps-p").textContent = countPegs(b);
        root.querySelector("#ps-m").textContent = moves;
      }

      function onCell(r, c) {
        if (over) return;
        if (!isBoard(r, c)) return;
        if (b[r][c] === 1) {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (sel && b[r][c] === 0) {
          const moves = validMoves(b);
          const m = moves.find(mv => mv.from[0] === sel[0] && mv.from[1] === sel[1] && mv.to[0] === r && mv.to[1] === c);
          if (m) {
            b[m.from[0]][m.from[1]] = 0;
            b[m.over[0]][m.over[1]] = 0;
            b[m.to[0]][m.to[1]] = 1;
            moves_count();
            AudioFX.place();
            sel = null;
            render();
            checkEnd();
            return;
          }
        }
        sel = null;
        render();
      }

      let moveCount = 0;

      function moves_count() {
        moveCount++;
        root.querySelector("#ps-m").textContent = moveCount;
      }

      function checkEnd() {
        const moves = validMoves(b);
        if (!moves.length) {
          over = true;
          const pegs = countPegs(b);
          if (pegs === 1 && b[3][3] === 1) {
            won = true;
            statusEl.textContent = `🎉 Perfect! 1 peg in the center in ${moveCount} moves!`;
            statusEl.className = "status win";
            AudioFX.win();
            const best = Storage.getBest("pegsolitaire");
            if (best === null || moveCount < best) {
              Storage.setBest("pegsolitaire", moveCount);
              App.toast("New best: " + moveCount + " moves", "success");
              root.querySelector("#ps-best").textContent = moveCount;
            }
          } else {
            statusEl.textContent = `Game over: ${pegs} pegs left. Try again.`;
            statusEl.className = "status lose";
            AudioFX.lose();
          }
        }
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (over) return;
        const moves = validMoves(b);
        if (!moves.length) {
          App.toast("No moves left", "info");
          return;
        }
        // pick a move that doesn't strand pegs in corners — simple heuristic: prefer center-preserving moves
        // for hint we just highlight a "good" move (one that ends closer to center)
        let best = null, bestScore = -Infinity;
        for (const m of moves) {
          const score = -Math.abs(m.to[0] - 3) - Math.abs(m.to[1] - 3) + Math.random();
          if (score > bestScore) {
            bestScore = score;
            best = m;
          }
        }
        if (best) {
          sel = best.from;
          AudioFX.reveal();
          render();
          // also outline the to cell
          const cell = gridEl.children[best.to[0] * SIZE + best.to[1]];
          if (cell) cell.style.outline = "3px solid var(--success)";
        }
      }

      function doSolve() {
        // Not implementing full solver — too complex. We'll do a simple "no-op + toast"
        App.toast("Auto-solve is not available for Peg Solitaire. Use Hint to find good moves.", "info");
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
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
      App.showModal("How to play Peg Solitaire",
        `Pegs sit on a cross-shaped board with the center peg removed.
        <br><br>Move a peg by jumping over an adjacent peg into an empty hole two squares away (horizontally or vertically). The jumped peg is removed.
        <br><br>Goal: leave a single peg in the center. <b>Hint</b> suggests a move that keeps the peg near the center.`);
    },
  });
})();
