/* fanorona — Fanorona (Madagascar) on the standard 5×9 board.
   Approach & withdrawal captures along lines; 22 pieces per side; multi-capture chains omitted. */
(function () {
  "use strict";
  const ROWS = 5, COLS = 9;

  // Lines: every row & column, plus the alternating block diagonals (each 2×2 block has one
  // diagonal, phase-shifted per band — this yields the classic long diagonals through the middle row).
  function conn(r1, c1, r2, c2) {
    const dr = r2 - r1, dc = c2 - c1;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
    if (dr === 0 || dc === 0) return true;      // orthogonal: always drawn
    return ((r1 + c1) % 2) === 0;               // diagonals exist from even-sum points
  }

  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

  function inB(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function startBoard() {
    const b = Array.from({length: ROWS}, function () {
      return Array(COLS).fill("");
    });
    // Black (AI) top: rows 0-1 full + middle row cols 0-3; White (player) mirrored; centre empty. 22 v 22.
    for (let c = 0; c < COLS; c++) {
      b[0][c] = "B";
      b[1][c] = "B";
      b[3][c] = "W";
      b[4][c] = "W";
    }
    for (let c = 0; c <= 3; c++) b[2][c] = "B";
    for (let c = 5; c <= 8; c++) b[2][c] = "W";
    return b;
  }

  // contiguous enemy pieces along (dr,dc) starting just beyond (sr,sc)
  function rayCaptures(b, sr, sc, dr, dc, foe) {
    const out = [];
    let pr = sr, pc = sc, r = sr + dr, c = sc + dc;
    while (inB(r, c) && conn(pr, pc, r, c) && b[r][c] === foe) {
      out.push([r, c]);
      pr = r;
      pc = c;
      r += dr;
      c += dc;
    }
    return out;
  }

  // all moves for a side: {fr,fc,tr,tc, app:[…]|null, wd:[…]|null}
  function allMoves(b, side) {
    const foe = side === "W" ? "B" : "W";
    const out = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (b[r][c] !== side) continue;
      for (const d of DIRS) {
        const tr = r + d[0], tc = c + d[1];
        if (!inB(tr, tc) || !conn(r, c, tr, tc) || b[tr][tc] !== "") continue;
        const app = rayCaptures(b, tr, tc, d[0], d[1], foe);
        const wd = rayCaptures(b, r, c, -d[0], -d[1], foe);
        out.push({fr: r, fc: c, tr: tr, tc: tc, app: app.length ? app : null, wd: wd.length ? wd : null});
      }
    }
    return out;
  }

  function applyMove(b, m, useApp) {
    b[m.tr][m.tc] = b[m.fr][m.fc];
    b[m.fr][m.fc] = "";
    const caps = useApp ? m.app : m.wd;
    if (caps) for (const p of caps) b[p[0]][p[1]] = "";
    return caps ? caps.length : 0;
  }

  function countPieces(b, side) {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (b[r][c] === side) n++;
    return n;
  }

  // AI: 1-ply — maximise immediate captures, small tiebreaks
  function aiPick(b) {
    const moves = allMoves(b, "B");
    if (!moves.length) return null;
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      const cap = Math.max(m.app ? m.app.length : 0, m.wd ? m.wd.length : 0);
      let s = cap * 100;
      s += (4 - Math.abs(m.tr - 2)) * 1.5;      // drift toward the middle rows
      s += (8 - Math.abs(m.tc - 4)) * 0.5;      // and centre columns
      s += Math.random() * 3;
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  GameRegistry.register({
    id: "fanorona",
    name: "Fanorona",
    icon: "⚔️",
    category: "strategy",
    description: "Madagascar's national game — approach and withdrawal captures on the 5×9 line board.",
    tags: ["strategy", "ancient", "ai", "board"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let b, turn, over, sel, pending, recorded;
      const timers = [];

      function later(fn, ms) {
        const id = setTimeout(function () {
          if (alive) fn();
        }, ms);
        timers.push(id);
        return id;
      }

      const M = 28, S = 46;
      const PX = function (r, c) {
        return [M + c * S, M + r * S];
      };
      const W = 2 * M + (COLS - 1) * S, H = 2 * M + (ROWS - 1) * S;

      function svgLines() {
        let s = "";
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const p = PX(r, c);
          if (c + 1 < COLS) {
            const q = PX(r, c + 1);
            s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '"/>';
          }
          if (r + 1 < ROWS) {
            const q = PX(r + 1, c);
            s += '<line x1="' + p[0] + '" y1="' + p[1] + '" x2="' + q[0] + '" y2="' + q[1] + '"/>';
          }
        }
        for (let i = 0; i < ROWS - 1; i++) for (let j = 0; j < COLS - 1; j++) {
          const tl = PX(i, j);
          if ((i + j) % 2 === 0) {
            const br = PX(i + 1, j + 1);
            s += '<line x1="' + tl[0] + '" y1="' + tl[1] + '" x2="' + br[0] + '" y2="' + br[1] + '"/>';
          } else {
            const tr = PX(i, j + 1), bl = PX(i + 1, j);
            s += '<line x1="' + tr[0] + '" y1="' + tr[1] + '" x2="' + bl[0] + '" y2="' + bl[1] + '"/>';
          }
        }
        return s;
      }

      root.innerHTML = `
        <style>
          .fa-board line { stroke: var(--text-muted, #64748b); stroke-width: 2; }
          .fa-pt { fill: var(--text-muted, #94a3b8); }
          .fa-piece { cursor: pointer; }
          .fa-piece.W { fill: #f1e9d2; stroke: #8a7a4f; stroke-width: 1.5; }
          .fa-piece.B { fill: #2b2b33; stroke: #000; stroke-width: 1.5; }
          .fa-hit { fill: transparent; cursor: pointer; }
          .fa-sel { fill: none; stroke: var(--accent, #3b82f6); stroke-width: 3.5; }
          .fa-dest { fill: none; stroke: var(--success, #22a34e); stroke-width: 3; stroke-dasharray: 5 4; }
          .fa-dest.cap { stroke: var(--danger, #dc2626); }
          .fa-last { fill: none; stroke: var(--warning, #f59e0b); stroke-width: 2.5; stroke-dasharray: 3 3; }
        </style>
        <div class="status info" id="fa-status">Your turn (White, bottom)</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Your pieces</div><div class="val" id="fa-pw">22</div></div>
          <div class="score-cell"><div class="label">You captured</div><div class="val" id="fa-cap">0</div></div>
          <div class="score-cell"><div class="label">AI pieces</div><div class="val" id="fa-pb">22</div></div>
        </div>
        <div class="center">
          <svg class="fa-board" id="fa-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Fanorona board">
            ${svgLines()}
            <g id="fa-dots"></g>
            <g id="fa-marks"></g>
            <g id="fa-pieces"></g>
            <g id="fa-hits"></g>
          </svg>
        </div>
        <div class="row center" id="fa-choice" style="gap:8px;margin-top:8px;display:none;"></div>
        <p class="hint">Move one step along a line. Capturing happens by <b>approach</b> (into) or <b>withdrawal</b> (away).</p>
        <div class="row center" style="gap:10px;margin-top:8px;">
          <button class="btn" id="fa-new">New game</button>
        </div>
      `;

      const svg = root.querySelector("#fa-svg");
      const dotsEl = root.querySelector("#fa-dots");
      const marksEl = root.querySelector("#fa-marks");
      const piecesEl = root.querySelector("#fa-pieces");
      const hitsEl = root.querySelector("#fa-hits");
      const choiceEl = root.querySelector("#fa-choice");
      const statusEl = root.querySelector("#fa-status");
      const NS = "http://www.w3.org/2000/svg";

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function newGame() {
        b = startBoard();
        turn = "W";
        over = false;
        sel = null;
        pending = null;
        recorded = false;
        setStatus("Your turn (White, bottom)");
        render();
      }

      function render() {
        dotsEl.innerHTML = "";
        marksEl.innerHTML = "";
        piecesEl.innerHTML = "";
        hitsEl.innerHTML = "";
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const p = PX(r, c);
          const d = document.createElementNS(NS, "circle");
          d.setAttribute("cx", p[0]);
          d.setAttribute("cy", p[1]);
          d.setAttribute("r", 3.5);
          d.setAttribute("class", "fa-pt");
          dotsEl.appendChild(d);
        }
        if (!over && turn === "W") {
          const moves = allMoves(b, "W");
          if (sel) {
            const s = document.createElementNS(NS, "circle");
            const sp = PX(sel[0], sel[1]);
            s.setAttribute("cx", sp[0]);
            s.setAttribute("cy", sp[1]);
            s.setAttribute("r", 17);
            s.setAttribute("class", "fa-sel");
            marksEl.appendChild(s);
            for (const m of moves) {
              if (m.fr !== sel[0] || m.fc !== sel[1]) continue;
              const dp = PX(m.tr, m.tc);
              const h = document.createElementNS(NS, "circle");
              h.setAttribute("cx", dp[0]);
              h.setAttribute("cy", dp[1]);
              h.setAttribute("r", 14);
              h.setAttribute("class", "fa-dest" + ((m.app || m.wd) ? " cap" : ""));
              marksEl.appendChild(h);
            }
          }
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const v = b[r][c];
          if (!v) continue;
          const p = PX(r, c);
          const pc = document.createElementNS(NS, "circle");
          pc.setAttribute("cx", p[0]);
          pc.setAttribute("cy", p[1]);
          pc.setAttribute("r", 13.5);
          pc.setAttribute("class", "fa-piece " + v);
          piecesEl.appendChild(pc);
        }
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const p = PX(r, c);
          const h = document.createElementNS(NS, "circle");
          h.setAttribute("cx", p[0]);
          h.setAttribute("cy", p[1]);
          h.setAttribute("r", 22);
          h.setAttribute("class", "fa-hit");
          h.addEventListener("click", function () {
            onPoint(r, c);
          });
          hitsEl.appendChild(h);
        }
        root.querySelector("#fa-pw").textContent = countPieces(b, "W");
        root.querySelector("#fa-pb").textContent = countPieces(b, "B");
      }

      function onPoint(r, c) {
        if (over || turn !== "W") return;
        if (b[r][c] === "W") {
          sel = (sel && sel[0] === r && sel[1] === c) ? null : [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (!sel || b[r][c] !== "") {
          sel = null;
          render();
          return;
        }
        const m = allMoves(b, "W").find(function (mv) {
          return mv.fr === sel[0] && mv.fc === sel[1] && mv.tr === r && mv.tc === c;
        });
        if (!m) {
          AudioFX.error();
          return;
        }
        sel = null;
        if (m.app && m.wd) {
          askChoice(m);
          return;
        }
        execMove(m, !!m.app);
      }

      function askChoice(m) {
        pending = m;
        choiceEl.style.display = "flex";
        choiceEl.innerHTML = "";
        const lbl = document.createElement("span");
        lbl.style.cssText = "color:var(--text-muted);font-size:0.9rem;";
        lbl.textContent = "Both captures are possible — choose:";
        choiceEl.appendChild(lbl);
        const ba = document.createElement("button");
        ba.className = "btn";
        ba.textContent = "Approach ⚔ capture " + m.app.length + " ahead";
        ba.addEventListener("click", function () {
          AudioFX.click();
          choiceEl.style.display = "none";
          execMove(pending, true);
        });
        const bw = document.createElement("button");
        bw.className = "btn";
        bw.textContent = "Withdrawal ⚭ capture " + m.wd.length + " behind";
        bw.addEventListener("click", function () {
          AudioFX.click();
          choiceEl.style.display = "none";
          execMove(pending, false);
        });
        choiceEl.appendChild(ba);
        choiceEl.appendChild(bw);
        render();
      }

      function execMove(m, useApp) {
        const caps = applyMove(b, m, useApp);
        if (caps) AudioFX.pop(); else AudioFX.move();
        // game end?
        if (countPieces(b, "B") === 0) {
          finish(true, "All black pieces captured!");
          return;
        }
        if (countPieces(b, "W") === 0) {
          finish(false, "All white pieces captured!");
          return;
        }
        if (!allMoves(b, "B").length) {
          finish(true, "Black has no moves!");
          return;
        }
        turn = "B";
        setStatus("AI is thinking…");
        render();
        later(aiTurn, 750);
      }

      function aiTurn() {
        if (over || turn !== "B") return;
        const m = aiPick(b);
        if (!m) {
          finish(true, "Black has no moves!");
          return;
        }
        const useApp = m.app ? (m.wd ? m.app.length >= m.wd.length : true) : false;
        const caps = applyMove(b, m, useApp);
        if (caps) AudioFX.pop(); else AudioFX.move();
        if (countPieces(b, "W") === 0) {
          finish(false, "All white pieces captured!");
          return;
        }
        if (countPieces(b, "B") === 0) {
          finish(true, "All black pieces captured!");
          return;
        }
        if (!allMoves(b, "W").length) {
          finish(false, "White has no moves!");
          return;
        }
        turn = "W";
        setStatus("Your turn (White)");
        render();
      }

      function finish(won, why) {
        over = true;
        const myCap = 22 - countPieces(b, "B");
        setStatus(won ? "🎉 You win — " + why : "💀 You lose — " + why, won ? "win" : "lose");
        if (won) AudioFX.win(); else AudioFX.lose();
        if (!recorded) {
          recorded = true;
          App.recordResult(won, won ? myCap : 0);
          App.toast(won ? "Fanorona victory!" : "The AI swept your pieces", won ? "success" : "warning");
        }
        render();
      }

      root.querySelector("#fa-new").addEventListener("click", function () {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Fanorona",
        `Fanorona is Madagascar's national board game, played on a 5×9 grid of points joined by lines: all rows and columns, plus the alternating diagonals (which form the long diagonals crossing the middle row). Pieces move <b>only along drawn lines</b>.
        <br><br><b>Setup:</b> 22 pieces each. Black (AI) holds the top two rows plus the left half of the middle row; White (you) mirrors it at the bottom. The centre point starts empty. You move first.
        <br><br><b>Moving:</b> slide one piece one step along a line to an adjacent empty point.
        <br><br><b>Capturing:</b> there are two ways, both along the line you just moved —
        <br>• <b>Approach:</b> move <i>toward</i> enemy pieces — every enemy piece contiguous in that direction is captured.
        <br>• <b>Withdrawal:</b> move <i>away</i> from enemy pieces standing directly behind you — every contiguous enemy piece in that direction is captured.
        <br>When a single move allows <i>both</i>, you choose which one applies. Your own pieces stop a capture ray. Plain moves with no capture are always allowed.
        <br><br><b>Win</b> by capturing every enemy piece, or leaving the enemy with no legal move.
        <br><br><i>Simplification:</i> the traditional optional multi-capture chains after a capture are omitted — one capture step per move.`);
    },
  });
})();
