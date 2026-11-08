/* othello10x10 — Wide Reversi 10×10: classic Othello rules on a big board, greedy corner-loving AI */
(function () {
  "use strict";
  const N = 10;
  const E = 0, P = 1, A = 2; // P = player (black), A = AI (white)
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  // positional weights mirrored from the top-left 5×5 quadrant
  const Q = [
    [120, -20, 20, 5, 5],
    [-20, -40, -5, -5, -5],
    [20, -5, 15, 3, 3],
    [5, -5, 3, 3, 3],
    [5, -5, 3, 3, 3],
  ];
  const W = [];
  for (let r = 0; r < N; r++) {
    W.push([]);
    for (let c = 0; c < N; c++) W[r].push(Q[Math.min(r, N - 1 - r)][Math.min(c, N - 1 - c)]);
  }

  function startBoard() {
    // classic 2×2 center pattern: 4 discs around the center point
    const b = Array.from({length: N}, () => Array(N).fill(E));
    b[4][4] = A;
    b[5][5] = A;
    b[4][5] = P;
    b[5][4] = P;
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

  function empties(b) {
    let n = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === E) n++;
    return n;
  }

  function discDiff(b) {
    let p = 0, a = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] === P) p++; else if (b[r][c] === A) a++;
    }
    return a - p;
  }

  function isCorner(r, c) {
    return (r === 0 || r === N - 1) && (c === 0 || c === N - 1);
  }

  function evalB(b) {
    if (empties(b) <= 8) return discDiff(b) * 20; // endgame: just count discs
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
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      const t = clone(b);
      applyM(t, m, A);
      let s = evalB(t);
      if (isCorner(m.r, m.c)) s += 60;               // corner priority
      s -= validMoves(t, P).length * 2;               // reduce player mobility
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
      let s = evalB(t) + validMoves(t, A).length * 2;
      if (isCorner(m.r, m.c)) s -= 60;
      s += Math.random();
      if (s < bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "othello10x10",
    name: "Reversi 10x10",
    icon: "⚪",
    category: "strategy",
    description: "Wide 10×10 Othello — outflank & flip discs on a big board; corners decide it. vs AI.",
    tags: ["strategy", "classic", "ai", "board"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, live = null;
      let b, turn, over, hl = null, recorded = false;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <style>
          .oa-cell { width:38px; height:38px; background:var(--bg-soft); border-radius:5px;
            display:grid; place-items:center; cursor:pointer; }
        </style>
        <div class="status info" id="oa-status">Your turn (Black)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Black (You)</div><div class="val" id="oa-p">2</div></div>
          <div class="score-cell"><div class="label">White (AI)</div><div class="val" id="oa-a">2</div></div>
        </div>
        <div class="center"><div id="oa-board" style="display:grid;grid-template-columns:repeat(10,38px);grid-template-rows:repeat(10,38px);gap:2px;background:var(--accent);padding:4px;border-radius:var(--radius);"></div></div>
        <p class="hint">Wide-board Othello — outflank the AI's discs to flip them. Grab the corners!</p>
        <div class="row center" style="gap:10px;margin-top:10px;">
          <button class="btn" id="oa-new">New game</button>
          <button class="btn" id="oa-hint">Hint</button>
        </div>
      `;
      const boardEl = root.querySelector("#oa-board");
      const statusEl = root.querySelector("#oa-status");

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
          cell.className = "oa-cell";
          const v = b[r][c];
          if (v) {
            const d = document.createElement("div");
            d.style.width = "28px";
            d.style.height = "28px";
            d.style.borderRadius = "50%";
            d.style.background = v === P ? "var(--text)" : "#fff";
            d.style.boxShadow = "inset 0 -2px 4px rgba(0,0,0,0.35)";
            cell.appendChild(d);
          } else if (moves.some(m => m.r === r && m.c === c)) {
            const dot = document.createElement("div");
            dot.style.width = "10px";
            dot.style.height = "10px";
            dot.style.borderRadius = "50%";
            dot.style.background = "var(--success, #22a34e)";
            dot.style.opacity = "0.65";
            cell.appendChild(dot);
          }
          if (hl && hl.r === r && hl.c === c) cell.style.outline = "3px solid var(--warning, #f59e0b)";
          cell.addEventListener("click", () => onCell(r, c));
          boardEl.appendChild(cell);
        }
        const ct = count();
        root.querySelector("#oa-p").textContent = ct.p;
        root.querySelector("#oa-a").textContent = ct.a;
      }

      function onCell(r, c) {
        if (over || turn !== P) return;
        const m = validMoves(b, P).find(x => x.r === r && x.c === c);
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
        later(aiTurn, 700);
      }

      function aiTurn() {
        if (over) return;
        const m = aiMove(b);
        if (!m) {
          if (validMoves(b, P).length) {
            setStatus("AI has no move and passes — your turn", "info");
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
          setStatus("You must pass — AI continues", "info");
          render();
          later(aiTurn, 700);
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
          setStatus(`🎉 You win ${ct.p}–${ct.a}!`, "win");
          AudioFX.win();
          if (!recorded) {
            App.recordResult(true, ct.p - ct.a);
            App.toast(`You win ${ct.p}–${ct.a}!`, "success");
            recorded = true;
          }
        } else if (ct.p < ct.a) {
          setStatus(`AI wins ${ct.a}–${ct.p} 💀`, "lose");
          AudioFX.lose();
          if (!recorded) {
            App.recordResult(false, ct.a - ct.p);
            App.toast(`AI wins ${ct.a}–${ct.p}`, "warning");
            recorded = true;
          }
        } else {
          setStatus(`Draw ${ct.p}–${ct.a}`, "info");
          if (!recorded) {
            App.recordResult(false, 0);
            App.toast("Draw!", "info");
            recorded = true;
          }
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

      function newGame() {
        b = startBoard();
        turn = P;
        over = false;
        hl = null;
        recorded = false;
        setStatus("Your turn (Black)");
        render();
      }

      root.querySelector("#oa-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#oa-hint").addEventListener("click", doHint);

      live = {hint: doHint};
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
    help: function () {
      App.showModal("How to play Reversi 10x10",
        `Full Othello rules on a wide 10×10 board with the classic 2×2 starting pattern in the center. You are <b>Black</b> and move first; the AI plays <b>White</b>.
        <br><br>Place a disc so that a straight unbroken line of AI discs is <b>outflanked</b> between your new disc and another disc of yours — the whole line flips. Dotted cells mark your legal moves.
        <br><br>A side with no legal move <b>passes</b>; the game ends when both pass or the board fills. <b>Most discs wins.</b>
        <br><br>On the big board mobility matters even more: the AI hunts corners, so claim them first and starve its moves along the edges.`);
    },
  });
})();
