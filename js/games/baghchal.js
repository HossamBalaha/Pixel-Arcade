/* baghchal — Bagh Chal (Nepal): 4 tigers vs 20 goats on the 5×5 alquerque star board.
   Goats place then move, tigers step or jump-capture. You are the goats, AI plays the tigers. */
(function () {
  "use strict";
  // Diagonal lines live on the alquerque "star" 2×2 blocks:
  // both main diagonals of the block grid (top-left coords) — rows & columns always connect.
  const XB = new Set(["0,0", "1,1", "2,2", "3,3", "0,3", "1,2", "2,1", "3,0"]);
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

  function inB(r, c) {
    return r >= 0 && r < 5 && c >= 0 && c < 5;
  }

  function conn(r1, c1, r2, c2) {
    if (!inB(r2, c2)) return false;
    const dr = r2 - r1, dc = c2 - c1;
    if (dr === 0 && Math.abs(dc) === 1) return true;   // rows
    if (dc === 0 && Math.abs(dr) === 1) return true;   // columns
    if (Math.abs(dr) === 1 && Math.abs(dc) === 1) {    // drawn diagonals only
      return XB.has(Math.min(r1, r2) + "," + Math.min(c1, c2));
    }
    return false;
  }

  function neighbors(r, c) {
    const out = [];
    for (const [dr, dc] of DIRS) {
      if (conn(r, c, r + dr, c + dc)) out.push([r + dr, c + dc]);
    }
    return out;
  }

  // ---- tiger moves: steps to empty connected points + single jumps over a goat ----
  function tigerMoves(b) {
    const out = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (b[r][c] !== "T") continue;
      for (const [dr, dc] of DIRS) {
        const mr = r + dr, mc = c + dc;
        if (!conn(r, c, mr, mc)) continue;
        if (b[mr][mc] === "") {
          out.push({fr: r, fc: c, tr: mr, tc: mc, cap: null});
        } else if (b[mr][mc] === "G") {
          const lr = r + 2 * dr, lc = c + 2 * dc;
          if (conn(mr, mc, lr, lc) && b[lr][lc] === "") {
            out.push({fr: r, fc: c, tr: lr, tc: lc, cap: [mr, mc]});
          }
        }
      }
    }
    return out;
  }

  function goatMoves(b) {
    const out = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      if (b[r][c] !== "G") continue;
      for (const [nr, nc] of neighbors(r, c)) {
        if (b[nr][nc] === "") out.push({fr: r, fc: c, tr: nr, tc: nc});
      }
    }
    return out;
  }

  // ---- AI: capture if possible, else keep tigers mobile & out of goat traps ----
  function aiTigerMove(b) {
    const moves = tigerMoves(b);
    if (!moves.length) return null;
    let best = null, bestS = -Infinity;
    for (const m of moves) {
      let s = 0;
      if (m.cap) {
        s = 1000;
        // prefer landings that stay mobile (harder to trap afterwards)
        let open = 0;
        for (const [nr, nc] of neighbors(m.tr, m.tc)) if (b[nr][nc] === "") open++;
        s += open * 2;
      } else {
        let open = 0, goatsNear = 0;
        for (const [nr, nc] of neighbors(m.tr, m.tc)) {
          if (b[nr][nc] === "") open++;
          else if (b[nr][nc] === "G") goatsNear++;
        }
        s = open * 5 - goatsNear * 2;             // mobility first, avoid being surrounded
        if (open <= 1) s -= 20;                    // nearly trapped — avoid
        if (m.fr === 0 || m.fr === 4 || m.fc === 0 || m.fc === 4) s -= 1; // don't camp edges forever
      }
      s += Math.random();
      if (s > bestS) {
        bestS = s;
        best = m;
      }
    }
    return best;
  }

  function svgLines() {
    let s = "";
    const P = (r, c) => [40 + c * 65, 40 + r * 65];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
      for (const [nr, nc] of neighbors(r, c)) {
        if (nr < r || (nr === r && nc < c)) continue; // draw each line once
        const [x1, y1] = P(r, c), [x2, y2] = P(nr, nc);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      }
    }
    return s;
  }

  GameRegistry.register({
    id: "baghchal",
    name: "Bagh Chal",
    icon: "🐅",
    category: "strategy",
    description: "Nepal's tigers-vs-goats game — place your 20 goats, corner the 4 jumping tigers.",
    tags: ["strategy", "ancient", "ai", "board"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let b, turn, over, toPlace, captured, sel, recorded;
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
          .bc-board line { stroke: var(--text-muted, #64748b); stroke-width: 2.5; }
          .bc-pt { fill: var(--text-muted, #94a3b8); }
          .bc-hit { fill: transparent; cursor: pointer; }
          .bc-piece { cursor: pointer; user-select: none; }
          .bc-hl { fill: none; stroke: var(--success, #22a34e); stroke-width: 3; stroke-dasharray: 5 4; }
          .bc-sel { fill: none; stroke: var(--warning, #f59e0b); stroke-width: 3.5; }
          .bc-cap { fill: none; stroke: var(--danger, #dc2626); stroke-width: 3; stroke-dasharray: 5 4; }
        </style>
        <div class="status info" id="bc-status">Your turn — place a goat</div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Goats to place</div><div class="val" id="bc-place">20</div></div>
          <div class="score-cell"><div class="label">Goats eaten</div><div class="val" id="bc-cap">0 / 5</div></div>
          <div class="score-cell"><div class="label">Phase</div><div class="val" id="bc-phase" style="font-size:1rem;">Placing</div></div>
        </div>
        <div class="center">
          <svg class="bc-board" id="bc-svg" viewBox="0 0 340 340" width="340" height="340" role="img" aria-label="Bagh Chal board">
            ${svgLines()}
            <g id="bc-dots"></g>
            <g id="bc-marks"></g>
            <g id="bc-pieces"></g>
            <g id="bc-hits"></g>
          </svg>
        </div>
        <p class="hint" id="bc-hint">Tap any empty point to place a goat. Tigers (AI) jump over lone goats to eat them.</p>
        <div class="row center" style="gap:10px;margin-top:10px;">
          <button class="btn" id="bc-new">New game</button>
        </div>
      `;

      const svg = root.querySelector("#bc-svg");
      const dotsEl = root.querySelector("#bc-dots");
      const marksEl = root.querySelector("#bc-marks");
      const piecesEl = root.querySelector("#bc-pieces");
      const hitsEl = root.querySelector("#bc-hits");
      const statusEl = root.querySelector("#bc-status");
      const NS = "http://www.w3.org/2000/svg";
      const PX = (r, c) => [40 + c * 65, 40 + r * 65];

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : "");
      }

      function phase() {
        return toPlace > 0 ? 1 : 2;
      }

      function newGame() {
        b = Array.from({length: 5}, () => Array(5).fill(""));
        b[0][0] = "T";
        b[0][4] = "T";
        b[4][0] = "T";
        b[4][4] = "T";
        turn = "G";
        over = false;
        toPlace = 20;
        captured = 0;
        sel = null;
        recorded = false;
        setStatus("Your turn — place a goat");
        root.querySelector("#bc-hint").textContent = "Tap any empty point to place a goat. Tigers (AI) jump over lone goats to eat them.";
        render();
      }

      function render() {
        dotsEl.innerHTML = "";
        marksEl.innerHTML = "";
        piecesEl.innerHTML = "";
        hitsEl.innerHTML = "";
        // intersection dots
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          const [x, y] = PX(r, c);
          const d = document.createElementNS(NS, "circle");
          d.setAttribute("cx", x);
          d.setAttribute("cy", y);
          d.setAttribute("r", 4);
          d.setAttribute("class", "bc-pt");
          dotsEl.appendChild(d);
        }
        // highlights
        if (!over && turn === "G") {
          if (phase() === 1) {
            for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
              if (b[r][c] !== "") continue;
              const [x, y] = PX(r, c);
              const h = document.createElementNS(NS, "circle");
              h.setAttribute("cx", x);
              h.setAttribute("cy", y);
              h.setAttribute("r", 15);
              h.setAttribute("class", "bc-hl");
              marksEl.appendChild(h);
            }
          } else {
            const gm = goatMoves(b);
            for (const m of gm) {
              const [x, y] = PX(m.tr, m.tc);
              const h = document.createElementNS(NS, "circle");
              h.setAttribute("cx", x);
              h.setAttribute("cy", y);
              h.setAttribute("r", 15);
              h.setAttribute("class", sel && sel[0] === m.fr && sel[1] === m.fc ? "bc-hl" : "bc-cap");
              if (sel && sel[0] === m.fr && sel[1] === m.fc) h.setAttribute("class", "bc-hl");
              marksEl.appendChild(h);
            }
            if (sel) {
              const [x, y] = PX(sel[0], sel[1]);
              const s = document.createElementNS(NS, "circle");
              s.setAttribute("cx", x);
              s.setAttribute("cy", y);
              s.setAttribute("r", 19);
              s.setAttribute("class", "bc-sel");
              marksEl.appendChild(s);
            }
          }
        }
        // pieces
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          const v = b[r][c];
          if (!v) continue;
          const [x, y] = PX(r, c);
          const t = document.createElementNS(NS, "text");
          t.setAttribute("x", x);
          t.setAttribute("y", y + 11);
          t.setAttribute("text-anchor", "middle");
          t.setAttribute("font-size", "30");
          t.setAttribute("class", "bc-piece");
          t.textContent = v === "T" ? "🐅" : "🐐";
          piecesEl.appendChild(t);
        }
        // hit targets (on top)
        for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
          const [x, y] = PX(r, c);
          const h = document.createElementNS(NS, "circle");
          h.setAttribute("cx", x);
          h.setAttribute("cy", y);
          h.setAttribute("r", 26);
          h.setAttribute("class", "bc-hit");
          h.addEventListener("click", () => onPoint(r, c));
          hitsEl.appendChild(h);
        }
        root.querySelector("#bc-place").textContent = toPlace;
        root.querySelector("#bc-cap").textContent = captured + " / 5";
        root.querySelector("#bc-phase").textContent = phase() === 1 ? "Placing" : "Moving";
      }

      function onPoint(r, c) {
        if (over || turn !== "G") return;
        if (phase() === 1) {
          if (b[r][c] !== "") {
            AudioFX.error();
            return;
          }
          b[r][c] = "G";
          toPlace--;
          AudioFX.place();
          afterGoat();
          return;
        }
        // phase 2 — move a goat
        if (b[r][c] === "G") {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (sel && b[r][c] === "") {
          const m = goatMoves(b).find(m => m.fr === sel[0] && m.fc === sel[1] && m.tr === r && m.tc === c);
          if (!m) {
            AudioFX.error();
            return;
          }
          b[sel[0]][sel[1]] = "";
          b[r][c] = "G";
          sel = null;
          AudioFX.move();
          afterGoat();
          return;
        }
        sel = null;
        render();
      }

      function afterGoat() {
        // goats win if every tiger is stuck
        if (tigerMoves(b).length === 0) {
          over = true;
          setStatus("🎉 Goats win — all tigers are trapped!", "win");
          AudioFX.win();
          if (!recorded) {
            App.recordResult(true, 20 - captured);
            App.toast("The goats corralled the tigers!", "success");
            recorded = true;
          }
          render();
          return;
        }
        turn = "T";
        setStatus("Tiger is prowling…");
        render();
        later(aiTurn, 750);
      }

      function aiTurn() {
        if (over) return;
        const m = aiTigerMove(b);
        if (!m) { // safety net — should have been caught in afterGoat
          over = true;
          setStatus("🎉 Goats win — tigers cannot move!", "win");
          AudioFX.win();
          if (!recorded) {
            App.recordResult(true, 20 - captured);
            recorded = true;
          }
          render();
          return;
        }
        b[m.fr][m.fc] = "";
        b[m.tr][m.tc] = "T";
        if (m.cap) {
          b[m.cap[0]][m.cap[1]] = "";
          captured++;
          AudioFX.pop();
          setStatus(captured >= 5 ? "" : "A goat was eaten! 🐅", "info");
        } else {
          AudioFX.move();
        }
        if (captured >= 5) {
          over = true;
          setStatus("Tigers ate 5 goats — you lose 💀", "lose");
          AudioFX.lose();
          if (!recorded) {
            App.recordResult(false, captured);
            App.toast("The tigers ate 5 goats!", "warning");
            recorded = true;
          }
          render();
          return;
        }
        // goats stuck in phase 2? (in phase 1 there is always a free point)
        if (phase() === 2 && goatMoves(b).length === 0) {
          over = true;
          setStatus("Goats cannot move — tigers win 💀", "lose");
          AudioFX.lose();
          if (!recorded) {
            App.recordResult(false, captured);
            recorded = true;
          }
          render();
          return;
        }
        turn = "G";
        setStatus(phase() === 1 ? "Your turn — place a goat" : "Your turn — move a goat");
        root.querySelector("#bc-hint").textContent = phase() === 1
          ? "Tap any empty point to place a goat."
          : "Tap one of your goats, then a dotted point to move. Never let a tiger stand next to a goat with an empty point behind it!";
        render();
      }

      root.querySelector("#bc-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      newGame();
      return function cleanup() {
        alive = false;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Bagh Chal",
        `Bagh Chal ("tiger game") from Nepal, played on the 5×5 alquerque star board — pieces move only along the <b>drawn lines</b>.
        <br><br><b>You are the Goats (20 of them), the AI plays the 4 Tigers</b> (they start on the corners). Goats move first.
        <br><br><b>Phase 1 — Placing:</b> on your turn, place one goat from your stock on any empty point. Goats cannot move yet.
        <br><b>Phase 2 — Moving:</b> once all 20 goats are placed, tap a goat then a connected empty point to slide it one step.
        <br><br><b>Tigers</b> either slide one step along a line, or <b>capture a goat by jumping over it</b> in a straight line to the empty point directly beyond. Jumps are single (no chains) and, as in the traditional rules, are not compulsory — but this AI loves to eat.
        <br><br><b>Goats win</b> by trapping all four tigers so none can move or jump. <b>Tigers win</b> by capturing 5 goats. (If the goats ever have no legal move in phase 2, the tigers win.)`);
    },
  });
})();
