/* othello6x6 — Mini Reversi 6×6: outflank & flip discs, pass when stuck, most discs wins. vs positional AI */
(function () {
  "use strict";
  const N = 6;
  const E = 0, P = 1, A = 2; // P = player (black), A = AI (white)
  const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  // positional weights — corners best, X-squares (diagonal to corner) worst
  const W = [
    [60, -20, 15, 15, -20, 60],
    [-20, -35, -5, -5, -35, -20],
    [15, -5, 5, 5, -5, 15],
    [15, -5, 5, 5, -5, 15],
    [-20, -35, -5, -5, -35, -20],
    [60, -20, 15, 15, -20, 60],
  ];

  function startBoard() {
    const b = Array.from({length: N}, () => Array(N).fill(E));
    b[2][2] = A;
    b[3][3] = A;
    b[2][3] = P;
    b[3][2] = P;
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

  function evalB(b) {
    if (empties(b) <= 6) return discDiff(b) * 20; // endgame: count discs
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
      let s = evalB(t) - validMoves(t, P).length * 3; // greedy + corner weights - player mobility
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
      let s = evalB(t) + validMoves(t, A).length * 3;
      s += Math.random();
      if (s < bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "othello6x6",
    name: "Mini Reversi 6x6",
    icon: "⚫",
    category: "strategy",
    description: "Compact 6×6 Othello — outflank the AI's discs and flip them; most discs wins.",
    tags: ["strategy", "classic", "ai", "board"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
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
          .o6-cell { width:48px; height:48px; background:var(--bg-soft); border-radius:6px;
            display:grid; place-items:center; cursor:pointer; }
        </style>
        <div class="status info" id="o6-status">Your turn (Black)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Black (You)</div><div class="val" id="o6-p">2</div></div>
          <div class="score-cell"><div class="label">White (AI)</div><div class="val" id="o6-a">2</div></div>
        </div>
        <div class="center"><div id="o6-board" style="display:grid;grid-template-columns:repeat(6,48px);grid-template-rows:repeat(6,48px);gap:3px;background:var(--accent);padding:5px;border-radius:var(--radius);"></div></div>
        <p class="hint">Click a dotted cell to place your disc and outflank the AI. Corners are gold!</p>
        <div class="row center" style="gap:10px;margin-top:10px;">
          <button class="btn" id="o6-new">New game</button>
          <button class="btn" id="o6-hint">Hint</button>
        </div>
      `;
      const boardEl = root.querySelector("#o6-board");
      const statusEl = root.querySelector("#o6-status");

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
          cell.className = "o6-cell";
          const v = b[r][c];
          if (v) {
            const d = document.createElement("div");
            d.style.width = "36px";
            d.style.height = "36px";
            d.style.borderRadius = "50%";
            d.style.background = v === P ? "var(--text)" : "#fff";
            d.style.boxShadow = "inset 0 -3px 5px rgba(0,0,0,0.35)";
            cell.appendChild(d);
          } else if (moves.some(m => m.r === r && m.c === c)) {
            const dot = document.createElement("div");
            dot.style.width = "13px";
            dot.style.height = "13px";
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
        root.querySelector("#o6-p").textContent = ct.p;
        root.querySelector("#o6-a").textContent = ct.a;
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
        later(aiTurn, 650);
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
          later(aiTurn, 650);
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

      root.querySelector("#o6-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#o6-hint").addEventListener("click", doHint);

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
      App.showModal("How to play Mini Reversi 6x6",
        `Real Othello rules on a 6×6 board. You are <b>Black</b>, the AI is <b>White</b>; Black moves first.
        <br><br>Place a disc so that one or more of the AI's discs are <b>outflanked</b> in a straight line (horizontally, vertically or diagonally) — all outflanked discs flip to your color. Dotted cells show your legal moves.
        <br><br>If a side has no legal move it must <b>pass</b>. The game ends when both sides pass or the board is full — <b>the most discs wins</b>.
        <br><br>Tip: grab the corners (they can never be flipped) and avoid the squares diagonally next to them.`);
    },
  });
})();
