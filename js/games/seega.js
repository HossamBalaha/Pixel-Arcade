/* seega — Seega: ancient Egyptian capture game on a 5×5 board.
   Phase 1: players alternate placing their 12 stones on empty cells
   (the centre may not be used — the board ends full except the centre).
   Phase 2: players alternate sliding one stone one step orthogonally onto
   an empty cell. A move that sandwiches enemy stone(s) — a contiguous line
   of any length — between the moved stone and another friendly stone
   captures them (only via movement, in all four directions at once).
   A player with no legal move loses; a player with no stones loses. */
(function () {
  "use strict";

  const N = 5;
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  function inB(r, c) {
    return r >= 0 && r < N && c >= 0 && c < N;
  }

  // Custodian captures for `side` having just moved to (r,c): in each
  // direction, a contiguous run of enemy stones ended by one of side's stones.
  function capturesFor(b, side, r, c) {
    const foe = side === "P" ? "A" : "P";
    const out = [];
    for (const d of DIRS) {
      const run = [];
      let rr = r + d[0], cc = c + d[1];
      while (inB(rr, cc) && b[rr][cc] === foe) {
        run.push([rr, cc]);
        rr += d[0];
        cc += d[1];
      }
      if (run.length && inB(rr, cc) && b[rr][cc] === side) out.push.apply(out, run);
    }
    return out;
  }

  function movesFor(b, side) {
    const out = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (b[r][c] !== side) continue;
      for (const d of DIRS) {
        const nr = r + d[0], nc = c + d[1];
        if (inB(nr, nc) && b[nr][nc] === "") out.push({fr: r, fc: c, tr: nr, tc: nc});
      }
    }
    return out;
  }

  function clone(b) {
    return b.map(function (row) {
      return row.slice();
    });
  }

  // Best number of stones `side` could capture with a single move (used by AI).
  function bestCapture(b, side) {
    let best = 0;
    for (const m of movesFor(b, side)) {
      const b2 = clone(b);
      b2[m.fr][m.fc] = "";
      b2[m.tr][m.tc] = side;
      const n = capturesFor(b2, side, m.tr, m.tc).length;
      if (n > best) best = n;
    }
    return best;
  }

  GameRegistry.register({
    id: "seega",
    name: "Seega",
    icon: "⬛",
    category: "strategy",
    description: "Ancient Egyptian 5×5 game — place your 12 stones, then slide to sandwich enemy lines between yours and capture them. No moves left or no stones left means defeat.",
    tags: ["strategy", "ancient", "capture", "ai"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      const timers = [];

      function later(fn, ms) {
        const id = setTimeout(function () {
          if (alive) fn();
        }, ms);
        timers.push(id);
      }

      function clearTimers() {
        timers.forEach(clearTimeout);
        timers.length = 0;
      }

      let b, phase, toPlace, turn, over, sel, quiet, recorded;
      const QUIET_LIMIT = 40; // half-moves without a capture → draw

      root.innerHTML = `
        <style>
          .sg-board { display: grid; grid-template-columns: repeat(5, 56px); grid-template-rows: repeat(5, 56px); gap: 4px; justify-content: center; background: var(--border); padding: 4px; border-radius: var(--radius-sm, 8px); margin: 10px auto; }
          .sg-cell { position: relative; display: grid; place-items: center; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 6px; cursor: pointer; }
          .sg-center { background: var(--bg-soft); }
          .sg-centerglyph { position: absolute; font-size: 22px; color: var(--text-muted); opacity: 0.3; user-select: none; }
          .sg-stone { width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--bg-elev); box-shadow: 0 1px 3px rgba(0,0,0,0.35); z-index: 1; }
          .sg-p { background: var(--accent); }
          .sg-a { background: var(--danger); }
          .sg-sel { outline: 3px solid var(--warning); outline-offset: -3px; }
          .sg-dest { outline: 3px dashed var(--success); outline-offset: -3px; }
          .sg-destdot { width: 14px; height: 14px; border-radius: 50%; background: var(--success); opacity: 0.55; }
          .sg-open::after { content: ""; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); opacity: 0.18; }
        </style>
        <div class="status info" id="sg-status"></div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You on board</div><div class="val" id="sg-p">0</div></div>
          <div class="score-cell"><div class="label">Phase</div><div class="val" id="sg-phase" style="font-size:1rem;">Placing</div></div>
          <div class="score-cell"><div class="label">AI on board</div><div class="val" id="sg-a">0</div></div>
        </div>
        <div class="center"><div class="sg-board" id="sg-board"></div></div>
        <div class="row center" style="gap:10px;margin-top:6px;">
          <button class="btn" id="sg-new">New game</button>
        </div>
        <p class="hint" id="sg-hint"></p>
      `;

      const boardEl = root.querySelector("#sg-board");
      const statusEl = root.querySelector("#sg-status");
      const hintEl = root.querySelector("#sg-hint");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : " info");
      }

      function countStones(side) {
        let n = 0;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c] === side) n++;
        return n;
      }

      function newGame() {
        clearTimers();
        b = Array.from({length: N}, function () {
          return Array(N).fill("");
        });
        phase = 1;
        toPlace = {P: 12, A: 12};
        turn = "P";
        over = false;
        sel = null;
        quiet = 0;
        recorded = false;
        setStatus(placementStatus());
        hintEl.textContent = "The centre ◉ stays empty during placement. Tip: keep at least one stone beside the centre — the first move of the game must step into it!";
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        const myMoves = (phase === 2 && turn === "P" && !over) ? movesFor(b, "P") : [];
        const dests = sel ? myMoves.filter(function (m) {
          return m.fr === sel[0] && m.fc === sel[1];
        }) : [];
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const cell = document.createElement("div");
          cell.className = "sg-cell";
          const isCentre = r === 2 && c === 2;
          if (isCentre) {
            cell.classList.add("sg-center");
            const g = document.createElement("span");
            g.className = "sg-centerglyph";
            g.textContent = "◉";
            cell.appendChild(g);
          }
          const v = b[r][c];
          if (v) {
            const s = document.createElement("div");
            s.className = "sg-stone " + (v === "P" ? "sg-p" : "sg-a");
            cell.appendChild(s);
          }
          if (sel && sel[0] === r && sel[1] === c) cell.classList.add("sg-sel");
          if (dests.some(function (m) {
            return m.tr === r && m.tc === c;
          })) {
            cell.classList.add("sg-dest");
            const dot = document.createElement("div");
            dot.className = "sg-destdot";
            cell.appendChild(dot);
          }
          if (phase === 1 && turn === "P" && !over && !v && !isCentre) cell.classList.add("sg-open");
          cell.addEventListener("click", function () {
            onCell(r, c);
          });
          boardEl.appendChild(cell);
        }
        root.querySelector("#sg-p").textContent = countStones("P");
        root.querySelector("#sg-a").textContent = countStones("A");
        root.querySelector("#sg-phase").textContent = phase === 1 ? "Placing" : "Moving";
      }

      const CENTER_ADJ = [[1, 2], [3, 2], [2, 1], [2, 3]];

      function centreAdjCount(side) {
        let n = 0;
        for (const cc of CENTER_ADJ) if (b[cc[0]][cc[1]] === side) n++;
        return n;
      }

      // Status line for the human's placement turn, with a warning if the AI
      // is sweeping the squares beside the centre (first-move rights).
      function placementStatus() {
        const mine = centreAdjCount("P"), theirs = centreAdjCount("A");
        let t = "Placement — tap an empty cell to put down a stone (" + toPlace.P + " to go).";
        if (mine === 0 && theirs >= 2 && toPlace.P > 0) {
          t = "⚠️ The AI has taken " + theirs + " of the 4 squares beside the centre — claim one next to ◉ or you may not be able to move!";
        }
        return t;
      }

      function onCell(r, c) {
        if (over) return;
        if (turn !== "P") {
          AudioFX.error();
          return;
        }
        if (phase === 1) {
          if (r === 2 && c === 2) {
            AudioFX.error();
            setStatus("The centre ◉ may not be used while placing stones.", "info");
            return;
          }
          if (b[r][c]) {
            AudioFX.error();
            return;
          }
          b[r][c] = "P";
          toPlace.P--;
          AudioFX.place();
          sel = null;
          render();
          if (toPlace.P === 0 && toPlace.A === 0) {
            toPhase2();
            return;
          }
          turn = "A";
          setStatus("AI is placing a stone…");
          later(aiTurn, 650);
          return;
        }
        // phase 2 — movement
        if (b[r][c] === "P") {
          sel = [r, c];
          AudioFX.click();
          render();
          return;
        }
        if (sel && !b[r][c]) {
          const m = movesFor(b, "P").find(function (mv) {
            return mv.fr === sel[0] && mv.fc === sel[1] && mv.tr === r && mv.tc === c;
          });
          if (m) {
            doMove("P", m);
            return;
          }
        }
        if (b[r][c] === "A") {
          AudioFX.error();
          return;
        }
        sel = null;
        render();
      }

      function doMove(side, m) {
        b[m.fr][m.fc] = "";
        b[m.tr][m.tc] = side;
        const caps = capturesFor(b, side, m.tr, m.tc);
        for (const cap of caps) b[cap[0]][cap[1]] = "";
        sel = null;
        if (caps.length) {
          quiet = 0;
          AudioFX.pop();
        } else {
          quiet++;
          AudioFX.move();
        }
        render();
        let note = "";
        if (caps.length) {
          note = side === "P"
            ? "⚔️ You captured " + caps.length + (caps.length > 1 ? " stones! " : " stone! ")
            : "⚔️ The AI captured " + caps.length + " of your stones! ";
        }
        const foe = side === "P" ? "A" : "P";
        if (countStones(foe) === 0) {
          endGame(side, "all enemy stones are captured");
          return;
        }
        if (quiet >= QUIET_LIMIT) {
          drawGame();
          return;
        }
        if (!movesFor(b, foe).length) {
          endGame(side, foe === "P" ? "you have no legal move" : "the AI has no legal move");
          return;
        }
        turn = foe;
        if (foe === "P") setStatus(note + "Your move — tap a stone, then a dotted square.");
        else {
          setStatus(note + "AI is thinking…");
          later(aiTurn, 750);
        }
        render();
      }

      function toPhase2() {
        phase = 2;
        quiet = 0;
        turn = "P";
        hintEl.textContent = "Tap one of your stones, then a dotted square. Sandwich enemy stones between the stone you moved and another of yours — lines of any length, in any direction.";
        if (!movesFor(b, "P").length) {
          // Board is full except the centre: the first move must enter it.
          endGame("A", "you cannot make the first move into the centre");
          return;
        }
        setStatus("All stones placed — movement begins with you. Tap a stone beside the centre.");
        render();
      }

      function aiTurn() {
        if (over || !alive) return;
        if (phase === 1) {
          const spot = aiPlacePick();
          if (!spot) return;
          b[spot[0]][spot[1]] = "A";
          toPlace.A--;
          AudioFX.place();
          render();
          if (toPlace.P === 0 && toPlace.A === 0) {
            toPhase2();
            return;
          }
          turn = "P";
          setStatus(placementStatus());
          render();
          return;
        }
        const m = aiMovePick();
        if (!m) {
          endGame("P", "the AI has no legal move");
          return;
        }
        doMove("A", m);
      }

      // AI placement: fight for the cells beside the centre (first-move rights),
      // keep central, stay next to friends and foes for future sandwiches.
      function aiPlacePick() {
        let best = null, bestS = -Infinity;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (b[r][c] || (r === 2 && c === 2)) continue;
          let s = Math.random() * 2;
          const dc = Math.abs(r - 2) + Math.abs(c - 2);
          s += (4 - dc) * 1.5;
          if (dc === 1) s += 5; // centre-adjacent — valuable (first-move rights)
          for (const d of DIRS) {
            const nr = r + d[0], nc = c + d[1];
            if (!inB(nr, nc)) continue;
            if (b[nr][nc] === "A") s += 2;
            else if (b[nr][nc] === "P") s += 1.5;
          }
          if (s > bestS) {
            bestS = s;
            best = [r, c];
          }
        }
        return best;
      }

      // AI movement: prefer the most captures, then safe centre-ish moves,
      // while avoiding positions where the player can strike back.
      function aiMovePick() {
        const moves = movesFor(b, "A");
        if (!moves.length) return null;
        let best = null, bestS = -Infinity;
        for (const m of moves) {
          const b2 = clone(b);
          b2[m.fr][m.fc] = "";
          b2[m.tr][m.tc] = "A";
          const caps = capturesFor(b2, "A", m.tr, m.tc);
          for (const cap of caps) b2[cap[0]][cap[1]] = "";
          let s = caps.length * 100;
          s += (4 - (Math.abs(m.tr - 2) + Math.abs(m.tc - 2))) * 1.5;
          s -= bestCapture(b2, "P") * 20;
          s += Math.random() * 3;
          if (s > bestS) {
            bestS = s;
            best = m;
          }
        }
        return best;
      }

      function endGame(winner, reason) {
        over = true;
        sel = null;
        render();
        if (winner === "P") {
          setStatus("🎉 You win — " + reason + "!", "win");
          AudioFX.win();
          if (!recorded) {
            App.recordResult(true, countStones("P"));
            App.toast("Seega victory!", "success");
            recorded = true;
          }
        } else {
          setStatus("You lose — " + reason + ".", "lose");
          AudioFX.lose();
          if (!recorded) {
            App.recordResult(false, countStones("P"));
            App.toast("Seega — the AI wins.", "warning");
            recorded = true;
          }
        }
      }

      function drawGame() {
        over = true;
        sel = null;
        render();
        setStatus("Draw — " + QUIET_LIMIT + " moves without a capture.", "info");
        App.toast("Seega ends in a draw.", "info");
      }

      root.querySelector("#sg-new").addEventListener("click", function () {
        AudioFX.click();
        newGame();
      });
      newGame();

      return function cleanup() {
        alive = false;
        clearTimers();
      };
    },
    help: function () {
      App.showModal("How to play Seega",
        `Seega is an ancient Egyptian game of war played on a 5×5 board. You are <b style="color:var(--accent)">blue</b>, the AI is <b style="color:var(--danger)">red</b>.
        <br><br><b>Phase 1 — Placing:</b> starting with you, the players alternate placing their <b>12 stones</b> each on any empty square. The <b>centre ◉ may not be used</b> — when placement ends, the board is completely full except for the centre.
        <br><br><b>Phase 2 — Moving:</b> starting with you, each turn slide <b>one</b> of your stones one square <b>orthogonally</b> (up / down / left / right) onto an empty square. The first move of the game must step into the centre — so make sure you keep a stone beside it during placement!
        <br><br><b>Capturing:</b> captures happen <b>only by moving</b>. If, after your move, the moved stone and another of your stones sandwich enemy stones between them — horizontally or vertically, a contiguous line of <b>any length</b> — all those enemy stones are captured and removed. One move can capture in several directions at once. Moving a stone between two enemies is legal and does <b>not</b> sacrifice it.
        <br><br><b>Losing:</b> you lose if it is your turn and you have <b>no legal move</b>, or if all your stones have been <b>captured</b>. If ${40} half-moves pass with no capture, the game is declared a draw.`);
    },
  });
})();
