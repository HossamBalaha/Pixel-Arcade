/* chesstinychess — Tiny Chess: Gardner-style 4×4 minichess vs AI.
   Full legal moves; object = CAPTURE the enemy king (no check/checkmate rules). */
(function () {
  "use strict";
  const N = 4;
  const VAL = {p: 1, n: 3, r: 5, q: 9, k: 1000};
  const GLYPH = {P: "♙", N: "♘", R: "♖", Q: "♕", K: "♔", p: "♟", n: "♞", r: "♜", q: "♛", k: "♚"};

  function inB(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  function isWhite(p) {
    return p !== "" && p === p.toUpperCase();
  }

  function sideOf(p) {
    return p === "" ? "" : (isWhite(p) ? "w" : "b");
  }

  // Gardner 4x4: white R N Q K + pawns on the bottom two ranks, black mirrored on top.
  function startBoard() {
    return [
      ["r", "n", "q", "k"],
      ["p", "p", "p", "p"],
      ["P", "P", "P", "P"],
      ["R", "N", "Q", "K"],
    ].map(function (row) {
      return row.slice();
    });
  }

  function genMoves(b, r, c) {
    // returns [{r,c}] destinations (pseudo-legal — capture-the-king variant needs no check filter)
    const p = b[r][c];
    if (!p) return [];
    const white = isWhite(p);
    const foe = white ? "b" : "w";
    const out = [];
    const push = function (tr, tc) {
      if (!inB(tr, tc)) return;
      const t = b[tr][tc];
      if (t === "" || sideOf(t) === foe) out.push({r: tr, c: tc});
    };
    const t = p.toLowerCase();
    if (t === "p") {
      const dr = white ? -1 : 1;
      if (inB(r + dr, c) && b[r + dr][c] === "") out.push({r: r + dr, c: c});
      for (const dc of [-1, 1]) {
        const tr = r + dr, tc = c + dc;
        if (inB(tr, tc) && b[tr][tc] !== "" && sideOf(b[tr][tc]) === foe) out.push({r: tr, c: tc});
      }
    } else if (t === "n") {
      for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) push(r + dr, c + dc);
    } else if (t === "k") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) push(r + dr, c + dc);
    } else {
      const dirs = t === "r" ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
        : t === "b" ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
          : [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        let tr = r + dr, tc = c + dc;
        while (inB(tr, tc)) {
          if (b[tr][tc] === "") {
            out.push({r: tr, c: tc});
          } else {
            if (sideOf(b[tr][tc]) === foe) out.push({r: tr, c: tc});
            break;
          }
          tr += dr;
          tc += dc;
        }
      }
    }
    return out;
  }

  function allMoves(b, side) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (sideOf(b[r][c]) !== side) continue;
      for (const to of genMoves(b, r, c)) out.push({from: [r, c], to: [to.r, to.c]});
    }
    return out;
  }

  function applyMove(b, m) {
    let p = b[m.from[0]][m.from[1]];
    b[m.from[0]][m.from[1]] = "";
    if (p.toLowerCase() === "p" && (m.to[0] === 0 || m.to[0] === N - 1)) p = isWhite(p) ? "Q" : "q";
    b[m.to[0]][m.to[1]] = p;
    return b;
  }

  function cloneApply(b, m) {
    return applyMove(b.map(function (row) {
      return row.slice();
    }), m);
  }

  function evalBoard(b) { // material from AI (black) perspective
    let s = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (!p) continue;
      const v = VAL[p.toLowerCase()];
      s += isWhite(p) ? -v : v;
    }
    return s;
  }

  function hasKing(b, side) {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const p = b[r][c];
      if (p && p.toLowerCase() === "k" && sideOf(p) === side) return true;
    }
    return false;
  }

  // 2-ply AI: take the king if possible, never hang the king, maximise material after best reply.
  function aiPick(b, side) {
    const moves = allMoves(b, side);
    if (!moves.length) return null;
    const opp = side === "b" ? "w" : "b";
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      const cap = b[m.to[0]][m.to[1]];
      let s;
      if (cap && cap.toLowerCase() === "k") {
        s = 100000; // king capture = instant win
      } else {
        const b2 = cloneApply(b, m);
        const replies = allMoves(b2, opp);
        if (!replies.length) {
          s = 50000; // opponent is stuck
        } else {
          s = Infinity;
          for (const rm of replies) {
            let e;
            if (b2[rm.to[0]][rm.to[1]] && b2[rm.to[0]][rm.to[1]].toLowerCase() === "k") e = -100000;
            else e = evalBoard(cloneApply(b2, rm));
            if (e < s) s = e;
          }
        }
        if (cap) s += VAL[cap.toLowerCase()] * 0.01; // tiny tiebreak for captures
        s += (side === "b" ? m.to[0] : (N - 1 - m.to[0])) * 0.02; // tiny advance tiebreak
      }
      s += Math.random() * 0.05;
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "chesstinychess",
    name: "Tiny Chess",
    icon: "♟️",
    category: "strategy",
    description: "Gardner-style 4×4 minichess — full piece moves, capture the enemy king to win.",
    tags: ["strategy", "chess", "classic", "ai"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "short",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let b, turn, over, sel, recorded;
      const capturedByP = [], capturedByA = [];
      const timers = [];

      function later(fn, ms) {
        const id = setTimeout(function () {
          if (alive) fn();
        }, ms);
        timers.push(id);
        return id;
      }

      root.innerHTML = `
        <style>
          #tc-grid { display:grid; grid-template-columns:repeat(4,72px); grid-template-rows:repeat(4,72px); gap:3px;
            background:var(--border); padding:3px; border-radius:var(--radius); width:max-content; }
          .tc-cell { position:relative; display:grid; place-items:center; border-radius:4px; cursor:pointer;
            background:var(--bg-elev); font-size:40px; line-height:1; user-select:none; }
          .tc-cell.dark { background:var(--bg-soft); }
          .tc-piece-w { color:var(--text); text-shadow:0 1px 0 rgba(0,0,0,0.45); }
          .tc-piece-b { color:var(--text); filter:drop-shadow(0 0 1.5px var(--accent)); opacity:0.92; }
          .tc-dot { position:absolute; width:16px; height:16px; border-radius:50%; background:var(--accent); opacity:0.55; }
          .tc-cap-dot { position:absolute; inset:6px; border-radius:6px; border:3px solid var(--danger); box-sizing:border-box; }
          .tc-sel { outline:3px solid var(--accent); outline-offset:-3px; }
          .tc-tray { display:flex; flex-wrap:wrap; gap:2px; min-height:30px; font-size:22px; align-items:center; }
        </style>
        <div class="status info" id="tc-status">Your move (White)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You captured</div><div class="val tc-tray" id="tc-tray-p"></div></div>
          <div class="score-cell"><div class="label">Material</div><div class="val" id="tc-mat">0</div></div>
          <div class="score-cell"><div class="label">AI captured</div><div class="val tc-tray" id="tc-tray-a"></div></div>
        </div>
        <div class="center" style="margin-top:10px;"><div id="tc-grid"></div></div>
        <p class="hint">Click a white piece, then a highlighted square. Goal: <b>capture the black king</b> ♚.</p>
        <div class="row center" style="gap:10px;margin-top:8px;">
          <button class="btn" id="tc-new">New game</button>
          <button class="btn primary" id="tc-hint">Hint</button>
        </div>
      `;

      const gridEl = root.querySelector("#tc-grid");
      const statusEl = root.querySelector("#tc-status");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function newGame() {
        b = startBoard();
        turn = "w";
        over = false;
        sel = null;
        recorded = false;
        capturedByP.length = 0;
        capturedByA.length = 0;
        setStatus("Your move (White)");
        render();
      }

      function render() {
        gridEl.innerHTML = "";
        const legal = !over && turn === "w" ? allMoves(b, "w") : [];
        const selMoves = sel ? legal.filter(function (m) {
          return m.from[0] === sel[0] && m.from[1] === sel[1];
        }) : [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "tc-cell" + ((r + c) % 2 ? " dark" : "");
          const p = b[r][c];
          if (p) {
            const sp = document.createElement("span");
            sp.className = isWhite(p) ? "tc-piece-w" : "tc-piece-b";
            sp.textContent = GLYPH[p];
            cell.appendChild(sp);
          }
          if (sel && sel[0] === r && sel[1] === c) cell.classList.add("tc-sel");
          if (selMoves.some(function (m) {
            return m.to[0] === r && m.to[1] === c;
          })) {
            if (b[r][c]) {
              const d = document.createElement("div");
              d.className = "tc-cap-dot";
              cell.appendChild(d);
            } else {
              const d = document.createElement("div");
              d.className = "tc-dot";
              cell.appendChild(d);
            }
          }
          cell.addEventListener("click", function () {
            onCell(r, c);
          });
          gridEl.appendChild(cell);
        }
        root.querySelector("#tc-tray-p").textContent = capturedByP.map(function (p) {
          return GLYPH[p];
        }).join("");
        root.querySelector("#tc-tray-a").textContent = capturedByA.map(function (p) {
          return GLYPH[p];
        }).join("");
        const mat = -evalBoard(b);
        root.querySelector("#tc-mat").textContent = (mat > 0 ? "+" : "") + mat;
      }

      function onCell(r, c) {
        if (over || turn !== "w") return;
        const p = b[r][c];
        if (p && sideOf(p) === "w") {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (!sel) return;
        const m = allMoves(b, "w").find(function (mv) {
          return mv.from[0] === sel[0] && mv.from[1] === sel[1] && mv.to[0] === r && mv.to[1] === c;
        });
        if (!m) {
          sel = null;
          render();
          return;
        }
        playMove(m, "w");
      }

      function playMove(m, side) {
        const cap = b[m.to[0]][m.to[1]];
        applyMove(b, m);
        sel = null;
        if (cap) {
          (side === "w" ? capturedByP : capturedByA).push(cap);
          AudioFX.pop();
        } else {
          AudioFX.move();
        }
        // king captured?
        const opp = side === "w" ? "b" : "w";
        if (!hasKing(b, opp)) {
          over = true;
          finish(side === "w", "The " + (side === "w" ? "black" : "white") + " king is captured!");
          render();
          return;
        }
        if (!allMoves(b, opp).length) {
          over = true;
          finish(side === "w", (side === "w" ? "Black" : "White") + " has no legal moves!");
          render();
          return;
        }
        turn = opp;
        if (side === "w") {
          setStatus("AI is thinking…");
          render();
          later(aiTurn, 700);
        } else {
          setStatus("Your move (White)");
          render();
        }
      }

      function aiTurn() {
        if (over || turn !== "b") return;
        const m = aiPick(b, "b");
        if (!m) {
          finish(true, "AI has no legal moves!");
          return;
        }
        playMove(m, "b");
      }

      function finish(won, why) {
        setStatus(won ? "🎉 You win — " + why : "💀 You lose — " + why, won ? "win" : "lose");
        if (won) AudioFX.win(); else AudioFX.lose();
        if (!recorded) {
          recorded = true;
          App.recordResult(won, won ? Math.max(1, 16 - capturedByA.length) : 0);
          App.toast(won ? "You captured the king! ♛" : "The AI captured your king!", won ? "success" : "warning");
        }
      }

      root.querySelector("#tc-new").addEventListener("click", function () {
        AudioFX.click();
        newGame();
      });
      root.querySelector("#tc-hint").addEventListener("click", function () {
        if (over || turn !== "w") return;
        const m = aiPick(b, "w");
        if (!m) return;
        sel = [m.from[0], m.from[1]];
        AudioFX.reveal();
        render();
        later(function () {
          if (!over && turn === "w") {
            sel = null;
            render();
          }
        }, 1600);
      });

      newGame();
      return function cleanup() {
        alive = false;
        timers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Tiny Chess",
        `A Gardner-style <b>4×4 minichess</b> against the AI.
        <br><br><b>Setup:</b> White (you, bottom): Rook ♖ Knight ♘ Queen ♕ King ♔ on the first rank, 4 pawns in front. Black (AI) mirrors them at the top.
        <br><br><b>All pieces move with normal chess rules:</b> rooks slide orthogonally, the knight jumps, the queen slides in all 8 directions, the king steps one square any direction. Pawns move one square forward and capture one square diagonally; on the last rank a pawn <b>promotes to a queen</b>. There is no castling and no en-passant.
        <br><br><b>Object: CAPTURE the enemy king</b> — this variant skips check &amp; checkmate entirely: you win the moment you take the king (so beware leaving yours defenceless!). If a side has no legal move at all, it loses.
        <br><br>Click a white piece to see its legal moves (dots = moves, red boxes = captures), then click a destination. The trays show captured pieces.`);
    },
  });
})();
