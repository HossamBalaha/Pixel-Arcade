/* Reversi (Othello) — 8x8, flip opponent pieces, vs positional AI */
(function () {
  const N = 8;
  const E = 0, P = 1, A = 2; // P=player(black), A=AI(white)
  let live = null;
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  function startBoard() {
    const b = Array.from({length: N}, () => Array(N).fill(E));
    b[3][3] = A;
    b[4][4] = A;
    b[3][4] = P;
    b[4][3] = P;
    return b;
  }

  function inB(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  function flips(b, r, c, p) {
    if (b[r][c] !== E) return [];
    const opp = p === P ? A : P;
    const out = [];
    for (const [dr, dc] of DIRS) {
      const line = [];
      let nr = r + dr, nc = c + dc;
      while (inB(nr, nc) && b[nr][nc] === opp) {
        line.push([nr, nc]);
        nr += dr;
        nc += dc;
      }
      if (line.length && inB(nr, nc) && b[nr][nc] === p) out.push(...line);
    }
    return out;
  }

  function validMoves(b, p) {
    const m = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== E) continue;
      const f = flips(b, r, c, p);
      if (f.length) m.push({r, c, flips: f});
    }
    return m;
  }

  function applyM(b, m, p) {
    b[m.r][m.c] = p;
    for (const [r, c] of m.flips) b[r][c] = p;
  }

  function clone(b) {
    return b.map(r => r.slice());
  }

  // positional weights — corners best, edges good, X-squares bad
  const W = [
    [120, -20, 20, 5, 5, 20, -20, 120],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [5, -5, 3, 3, 3, 3, -5, 5],
    [20, -5, 15, 3, 3, 15, -5, 20],
    [-20, -40, -5, -5, -5, -5, -40, -20],
    [120, -20, 20, 5, 5, 20, -20, 120],
  ];

  function evalB(b) {
    let s = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] === A) s += W[r][c];
      else if (b[r][c] === P) s -= W[r][c];
    }
    return s;
  }

  function aiMove(b) {
    const moves = validMoves(b, A);
    if (!moves.length) return null;
    // 1-ply with corner-preference
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      const t = clone(b);
      applyM(t, m, A);
      let s = evalB(t);
      // also prefer if it reduces player's mobility
      const pm = validMoves(t, P).length;
      s -= pm * 2;
      s += Math.random();
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  function bestForPlayer(b) {
    const moves = validMoves(b, P);
    if (!moves.length) return null;
    let best = null, bestS = Infinity;
    for (const m of moves) {
      const t = clone(b);
      applyM(t, m, P);
      let s = evalB(t);
      const am = validMoves(t, A).length;
      s += am * 2;
      s += Math.random();
      if (s < bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "reversi",
    name: "Reversi (Othello)",
    icon: "⚪",
    category: "strategy",
    description: "Flip opponent pieces by outflanking them — vs AI",
    tags: ["strategy", "classic", "ai"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let b, turn, over, hl = null;
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
        <div class="status info" id="rv-status">Your turn (Black)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Black (You)</div><div class="val" id="rv-p">2</div></div>
          <div class="score-cell"><div class="label">White (AI)</div><div class="val" id="rv-a">2</div></div>
        </div>
        <div class="center"><div id="rv-board" style="display:grid;grid-template-columns:repeat(8,40px);grid-template-rows:repeat(8,40px);gap:2px;background:var(--accent);padding:4px;border-radius:var(--radius-sm);"></div></div>
        <p class="hint">Click a green dot to place. Outflank to flip. Most pieces wins.</p>
      `;
      const boardEl = root.querySelector("#rv-board");
      const statusEl = root.querySelector("#rv-status");

      function newGame() {
        b = startBoard();
        turn = P;
        over = false;
        hl = null;
        setStatus("Your turn (Black)");
        render();
      }

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function count() {
        let p = 0, a = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (b[r][c] === P) p++; else if (b[r][c] === A) a++;
        }
        return {p, a};
      }

      function render() {
        boardEl.innerHTML = "";
        const moves = (turn === P && !over) ? validMoves(b, P) : [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.style.background = "var(--bg-soft)";
          cell.style.display = "grid";
          cell.style.placeItems = "center";
          cell.style.cursor = "pointer";
          const v = b[r][c];
          if (v) {
            const d = document.createElement("div");
            d.style.width = "30px";
            d.style.height = "30px";
            d.style.borderRadius = "50%";
            d.style.background = v === P ? "var(--text)" : "#fff";
            d.style.boxShadow = "inset 0 -3px 5px rgba(0,0,0,0.3)";
            cell.appendChild(d);
          } else if (moves.some(m => m.r === r && m.c === c)) {
            const dot = document.createElement("div");
            dot.style.width = "12px";
            dot.style.height = "12px";
            dot.style.borderRadius = "50%";
            dot.style.background = "var(--success)";
            dot.style.opacity = "0.6";
            cell.appendChild(dot);
          }
          if (hl && hl.r === r && hl.c === c) cell.style.outline = "3px solid var(--warning)";
          cell.addEventListener("click", () => onCell(r, c));
          boardEl.appendChild(cell);
        }
        const ct = count();
        root.querySelector("#rv-p").textContent = ct.p;
        root.querySelector("#rv-a").textContent = ct.a;
      }

      function onCell(r, c) {
        if (over || turn !== P) return;
        const moves = validMoves(b, P);
        const m = moves.find(x => x.r === r && x.c === c);
        if (!m) {
          AudioFX.error();
          return;
        }
        applyM(b, m, P);
        AudioFX.place();
        hl = null;
        if (endCheck()) return;
        turn = A;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 500);
      }

      function aiTurn() {
        if (over) return;
        const m = aiMove(b);
        if (!m) {
          // AI passes
          if (validMoves(b, P).length) {
            setStatus("AI passes — your turn", "info");
            turn = P;
            render();
            return;
          }
          finish();
          return;
        }
        applyM(b, m, A);
        AudioFX.move();
        if (endCheck()) return;
        if (!validMoves(b, P).length) {
          if (!validMoves(b, A).length) {
            finish();
            return;
          }
          setStatus("You pass — AI continues", "info");
          render();
          later(aiTurn, 500);
          return;
        }
        turn = P;
        setStatus("Your turn (Black)");
        render();
      }

      function endCheck() {
        if (!validMoves(b, P).length && !validMoves(b, A).length) {
          finish();
          return true;
        }
        return false;
      }

      function finish() {
        over = true;
        const ct = count();
        if (ct.p > ct.a) {
          setStatus(`🎉 You win ${ct.p}-${ct.a}!`, "win");
          AudioFX.win();
          Storage.submitScore("reversi", (Storage.getBest("reversi") || 0) + 1);
        } else if (ct.p < ct.a) {
          setStatus(`AI wins ${ct.a}-${ct.p} 💀`, "lose");
          AudioFX.lose();
        } else {
          setStatus(`Draw ${ct.p}-${ct.a}`, "info");
          AudioFX.lose();
        }
        render();
      }

      function doHint() {
        if (over || turn !== P) return;
        const m = bestForPlayer(b);
        if (m) {
          hl = m;
          AudioFX.reveal();
          render();
        }
      }

      function doSolve() {
        if (over || turn !== P) return;
        const m = bestForPlayer(b);
        if (!m) return;
        applyM(b, m, P);
        AudioFX.place();
        hl = null;
        if (endCheck()) return;
        turn = A;
        setStatus("AI thinking…");
        render();
        later(aiTurn, 500);
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
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
      App.showModal("How to play Reversi (Othello)",
        `Place a disc so that you outflank one or more of your opponent's discs in a straight line (horizontal, vertical, or diagonal).
        <br>All outflanked discs flip to your color.
        <br><br>If you have no valid move, you pass. Game ends when neither side can move.
        <br><br>The side with the most discs wins. <b>Hint</b> highlights a strong move. <b>Solve</b> plays it for you.`);
    },
  });
})();
