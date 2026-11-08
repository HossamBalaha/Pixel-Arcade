/* senet — Senet: ancient Egyptian racing game (c. 3100 BCE), simplified.
   3×10 board (30 squares, serpentine path 1→30). Each player has 5 pawns,
   starting interleaved on squares 1-10 (you on odd, AI on even).
   4 binary throw-sticks: heads 1-4 = move that many; 0 = pass.
   Move a pawn forward; you cannot land on your own pawn or on a protected
   enemy pair; landing on a lone enemy pawn swaps it to your old square.
   Safe houses: 15 (House of Rebirth ♻), 28 and 29 (✦) — pawns there cannot
   be swapped. Square 26 (House of Water 💧) sends the pawn back to 15.
   The exact roll is needed to march off past 30; first to exit all 5 wins. */
(function () {
  "use strict";

  const SAFE = new Set([15, 28, 29]);
  const WATER = 26;
  const EXIT = 31;

  // Path square p (1-30) → [visualRow, col] on the 3×10 board:
  // row 0: 1→10 left-to-right, row 1: 11→20 right-to-left, row 2: 21→30 left-to-right.
  function rc(p) {
    if (p <= 10) return [0, p - 1];
    if (p <= 20) return [1, 20 - p];
    return [2, p - 21];
  }

  function glyph(p) {
    if (p === 15) return "♻";
    if (p === 26) return "💧";
    if (p === 28 || p === 29) return "✦";
    return "";
  }

  GameRegistry.register({
    id: "senet",
    name: "Senet",
    icon: "🔺",
    category: "strategy",
    description: "Egypt's 5,000-year-old board race — 5 pawns each, 4 throw-sticks, swap lone rivals back, shelter on the safe houses, dodge the House of Water. First to march all 5 pawns off the board wins.",
    tags: ["strategy", "ancient", "race", "dice", "ai"],
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

      let pawns, exited, turn, rolled, over;

      root.innerHTML = `
        <style>
          .sn-board { display: grid; grid-template-columns: repeat(10, 40px); grid-template-rows: repeat(3, 40px); gap: 3px; justify-content: center; background: var(--border); padding: 4px; border-radius: var(--radius-sm, 8px); margin: 10px auto; }
          .sn-cell { position: relative; display: grid; place-items: center; background: var(--bg-elev); border: 1px solid var(--border); border-radius: 5px; }
          .sn-num { position: absolute; top: 1px; left: 3px; font-size: 8px; color: var(--text-muted); font-family: var(--font-mono); }
          .sn-glyph { position: absolute; font-size: 15px; opacity: 0.4; user-select: none; }
          .sn-spec { background: var(--bg-soft); border-color: var(--warning); }
          .sn-pawn { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--bg-elev); box-shadow: 0 1px 3px rgba(0,0,0,0.35); z-index: 1; }
          .sn-p { background: var(--accent); }
          .sn-a { background: var(--danger); }
          .sn-movable { outline: 3px solid var(--accent); outline-offset: -3px; cursor: pointer; }
          .sn-sticks { font-family: var(--font-mono); font-size: 1.25rem; letter-spacing: 3px; min-width: 128px; text-align: center; }
          .sn-stick-on { color: var(--warning); }
          .sn-stick-off { color: var(--text-muted); opacity: 0.5; }
        </style>
        <div class="status info" id="sn-status"></div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You home</div><div class="val" id="sn-hp">0 / 5</div></div>
          <div class="score-cell"><div class="label">Turn</div><div class="val" id="sn-turn" style="font-size:1rem;">You</div></div>
          <div class="score-cell"><div class="label">AI home</div><div class="val" id="sn-ha">0 / 5</div></div>
        </div>
        <div class="center"><div class="sn-board" id="sn-board"></div></div>
        <div class="row center" style="gap:10px;margin-top:8px;flex-wrap:wrap;">
          <span class="sn-sticks" id="sn-sticks">· · · ·</span>
          <button class="btn primary" id="sn-throw">Throw the sticks</button>
          <button class="btn" id="sn-new">New game</button>
        </div>
        <p class="hint">Throw the 4 sticks (heads 1-4, blank = pass), then tap a glowing pawn. A lone enemy pawn is swapped back to your square; pairs are protected, and ♻15 ✦28 ✦29 are safe. 💧26 (House of Water) washes pawns back to ♻15. You need the exact roll to leave the board.</p>
      `;

      const boardEl = root.querySelector("#sn-board");
      const statusEl = root.querySelector("#sn-status");
      const sticksEl = root.querySelector("#sn-sticks");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : " info");
      }

      function newGame() {
        clearTimers();
        pawns = {P: [1, 3, 5, 7, 9], A: [2, 4, 6, 8, 10]};
        exited = {P: 0, A: 0};
        turn = "P";
        rolled = null;
        over = false;
        sticksEl.innerHTML = "· · · ·";
        setStatus("Your throw — press the sticks");
        render();
      }

      function occupant(t) {
        for (const s of ["P", "A"]) {
          const i = pawns[s].indexOf(t);
          if (i >= 0) return {side: s, idx: i};
        }
        return null;
      }

      function legalMoves(side, r) {
        const out = [];
        if (r <= 0) return out;
        const foe = side === "P" ? "A" : "P";
        for (let idx = 0; idx < 5; idx++) {
          const c = pawns[side][idx];
          if (c > 30) continue; // already home
          const t = c + r;
          if (t > EXIT) continue; // overshoot — exact roll needed to exit
          if (t === EXIT) {
            out.push({idx: idx, from: c, to: t, exit: true, swap: -1});
            continue;
          }
          const occ = occupant(t);
          if (!occ) {
            out.push({idx: idx, from: c, to: t, exit: false, swap: -1});
            continue;
          }
          if (occ.side === side) continue; // own pawn blocks
          if (SAFE.has(t)) continue;       // safe houses cannot be entered
          const protectedLeft = t - 1 >= 1 && pawns[foe].indexOf(t - 1) >= 0;
          const protectedRight = t + 1 <= 30 && pawns[foe].indexOf(t + 1) >= 0;
          if (protectedLeft || protectedRight) continue; // paired pawns are protected
          out.push({idx: idx, from: c, to: t, exit: false, swap: occ.idx});
        }
        return out;
      }

      // House of Water: land on 26 → go back to the House of Rebirth (15),
      // or the nearest free square before it.
      function waterDest(skipSide, skipIdx) {
        for (let t = 15; t >= 1; t--) {
          if (pawns.P.indexOf(t) >= 0) continue;
          let taken = false;
          for (let i = 0; i < 5; i++) {
            if (skipSide === "A" && i === skipIdx) continue;
            if (pawns.A[i] === t) {
              taken = true;
              break;
            }
          }
          if (!taken) return t;
        }
        return 15;
      }

      function throwSticks() {
        const sticks = [0, 0, 0, 0].map(function () {
          return Math.random() < 0.5 ? 1 : 0;
        });
        return {sticks: sticks, total: sticks[0] + sticks[1] + sticks[2] + sticks[3]};
      }

      function showSticks(sticks, total) {
        sticksEl.innerHTML = sticks.map(function (s) {
          return '<span class="' + (s ? "sn-stick-on" : "sn-stick-off") + '">' + (s ? "▰" : "▱") + "</span>";
        }).join(" ") + "  = <b>" + total + "</b>";
      }

      function render() {
        boardEl.innerHTML = "";
        const moves = (turn === "P" && !over && rolled > 0) ? legalMoves("P", rolled) : [];
        const movable = new Set(moves.map(function (m) {
          return m.from;
        }));
        // Build rows in visual order: row 0 = 1..10, row 1 = 20..11, row 2 = 21..30
        const order = [];
        for (let p = 1; p <= 10; p++) order.push(p);
        for (let p = 20; p >= 11; p--) order.push(p);
        for (let p = 21; p <= 30; p++) order.push(p);
        for (const p of order) {
          const cell = document.createElement("div");
          cell.className = "sn-cell";
          const num = document.createElement("span");
          num.className = "sn-num";
          num.textContent = p;
          cell.appendChild(num);
          const gl = glyph(p);
          if (gl) {
            cell.classList.add("sn-spec");
            const g = document.createElement("span");
            g.className = "sn-glyph";
            g.textContent = gl;
            cell.appendChild(g);
          }
          const occ = occupant(p);
          if (occ) {
            const d = document.createElement("div");
            d.className = "sn-pawn " + (occ.side === "P" ? "sn-p" : "sn-a");
            cell.appendChild(d);
            if (occ.side === "P" && movable.has(p)) {
              cell.classList.add("sn-movable");
              cell.addEventListener("click", function () {
                onPawn(p);
              });
            }
          }
          boardEl.appendChild(cell);
        }
        root.querySelector("#sn-hp").textContent = exited.P + " / 5";
        root.querySelector("#sn-ha").textContent = exited.A + " / 5";
        root.querySelector("#sn-turn").textContent = over ? "—" : (turn === "P" ? "You" : "AI");
      }

      function onPawn(p) {
        if (over || turn !== "P" || rolled == null || rolled <= 0) return;
        const m = legalMoves("P", rolled).find(function (mv) {
          return mv.from === p;
        });
        if (m) doMove("P", m);
        else AudioFX.error();
      }

      function onThrow() {
        if (over || turn !== "P" || rolled != null) {
          AudioFX.error();
          return;
        }
        const t = throwSticks();
        rolled = t.total;
        AudioFX.flip();
        showSticks(t.sticks, t.total);
        if (t.total === 0) {
          setStatus("Blank throw — no move, turn passes.");
          later(function () {
            passTo("A", "AI's throw…");
          }, 900);
          render();
          return;
        }
        if (!legalMoves("P", t.total).length) {
          setStatus("You threw " + t.total + " — no legal move, turn passes.");
          later(function () {
            passTo("A", "AI's throw…");
          }, 900);
          render();
          return;
        }
        setStatus("You threw " + t.total + " — tap a glowing pawn.");
        render();
      }

      function doMove(side, m) {
        const foe = side === "P" ? "A" : "P";
        let note = "";
        if (m.swap >= 0) {
          pawns[foe][m.swap] = m.from; // swap: enemy goes to my old square
          AudioFX.pop();
          note = side === "P"
            ? "🔄 Swap! The enemy pawn goes back to " + m.from + ". "
            : "🔄 Your pawn was swapped back to " + m.from + "! ";
        }
        if (m.exit) {
          exited[side]++;
          pawns[side][m.idx] = EXIT;
          AudioFX.reveal();
          note += (side === "P" ? "A pawn marched off the board" : "An AI pawn marched off the board") +
            " (" + exited[side] + "/5). ";
        } else if (m.to === WATER) {
          pawns[side][m.idx] = WATER;
          const d = waterDest(side, m.idx);
          pawns[side][m.idx] = d;
          AudioFX.tick();
          note += "💧 House of Water! The pawn swims back to " + d + ". ";
        } else {
          pawns[side][m.idx] = m.to;
          if (m.swap < 0) AudioFX.move();
        }
        rolled = null;
        render();
        if (exited[side] >= 5) {
          endGame(side);
          return;
        }
        if (side === "P") passTo("A", note + "AI's throw…");
        else passTo("P", note + "Your throw — press the sticks.");
      }

      function passTo(side, text) {
        turn = side;
        rolled = null;
        setStatus(text);
        render();
        if (side === "A") later(aiTurn, 800);
      }

      function aiTurn() {
        if (over || !alive) return;
        const t = throwSticks();
        AudioFX.flip();
        showSticks(t.sticks, t.total);
        setStatus("AI threw " + t.total + "…");
        later(function () {
          if (over || !alive) return;
          if (t.total === 0) {
            passTo("P", "AI threw 0 — pass. Your throw!");
            return;
          }
          const moves = legalMoves("A", t.total);
          if (!moves.length) {
            passTo("P", "AI has no legal move — your throw!");
            return;
          }
          doMove("A", aiPick(moves));
        }, 650);
      }

      // AI: exit > swap a rival back > safe/central progress; avoid the water
      // and avoid squares where a lone enemy pawn could swap it in reply.
      function aiPick(moves) {
        let best = null, bestS = -Infinity;
        for (const m of moves) {
          let s = Math.random() * 2;
          if (m.exit) {
            s += 120;
          } else {
            let eff = m.to;
            if (m.to === WATER) {
              eff = simulateWater(m);
              s -= 55;
            }
            if (m.swap >= 0) s += 25 + (m.to - m.from);
            if (m.to !== WATER && SAFE.has(m.to)) s += 8;
            s += (eff - m.from) * 2;
            // vulnerability check after the move
            const myPos = pawns.A.slice();
            myPos[m.idx] = eff;
            const enPos = pawns.P.slice();
            if (m.swap >= 0) enPos[m.swap] = m.from;
            if (!SAFE.has(eff) && eff <= 30) {
              let prot = false;
              for (let i = 0; i < 5; i++) {
                if (i !== m.idx && (myPos[i] === eff - 1 || myPos[i] === eff + 1)) {
                  prot = true;
                  break;
                }
              }
              if (!prot) {
                for (let d = 1; d <= 4; d++) if (enPos.indexOf(eff - d) >= 0) s -= 11;
              }
            }
          }
          if (s > bestS) {
            bestS = s;
            best = m;
          }
        }
        return best;
      }

      function simulateWater(m) {
        const myPos = pawns.A.slice();
        myPos[m.idx] = WATER;
        for (let t = 15; t >= 1; t--) {
          if (pawns.P.indexOf(t) >= 0) continue;
          let taken = false;
          for (let i = 0; i < 5; i++) {
            if (i === m.idx) continue;
            if (myPos[i] === t) {
              taken = true;
              break;
            }
          }
          if (!taken) return t;
        }
        return 15;
      }

      function endGame(side) {
        over = true;
        rolled = null;
        render();
        if (side === "P") {
          setStatus("🏆 All five of your pawns reached the afterlife — you win!", "win");
          AudioFX.win();
          App.recordResult(true, 5);
          App.toast("🏆 Senet — victory!", "success");
        } else {
          setStatus("The AI marched all its pawns off first — you lose.", "lose");
          AudioFX.lose();
          App.recordResult(false, exited.P);
          App.toast("The AI won the race.", "warning");
        }
      }

      root.querySelector("#sn-throw").addEventListener("click", onThrow);
      root.querySelector("#sn-new").addEventListener("click", function () {
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
      App.showModal("How to play Senet",
        `Senet is Egypt's oldest board game — a race along a serpentine path of 30 squares (the little numbers show the way: 1→10 along the top row, 11→20 back along the middle row, 21→30 along the bottom row). You are <b style="color:var(--accent)">blue</b> (odd squares 1-10), the AI is <b style="color:var(--danger)">red</b> (even squares).
        <br><br><b>Throwing:</b> four binary throw-sticks — the number of marked sides (▰) is your move, 1-4. A blank throw (0) passes the turn.
        <br><br><b>Moving:</b> move one of your pawns forward exactly that many squares. You may not land on your own pawn, nor on an enemy pawn that stands next to another enemy pawn (pairs are <b>protected</b>). Landing on a <b>lone enemy pawn swaps it back</b> to the square you came from.
        <br><br><b>Special houses:</b>
        <br>♻ <b>15 — House of Rebirth:</b> a safe square; pawns sent by the water land here.
        <br>💧 <b>26 — House of Water:</b> land here and your pawn is washed back to square 15 (or the nearest free square before it).
        <br>✦ <b>28 &amp; 29 — safe houses:</b> pawns on them can never be swapped.
        <br><br><b>Going home:</b> from square 30 you need an <b>exact roll of 1</b> to leave the board (square 29 needs exactly 2, and so on). You must move if you can.
        <br><br><b>Winning:</b> the first player to march all <b>5 pawns</b> off the board wins.`);
    },
  });
})();
