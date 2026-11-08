/* royalur — Royal Game of Ur: the Sumerian race game (c. 2600 BCE).
   7 pieces per player, 4 binary dice (sum of heads 0-4; 0 = pass turn).
   20-square board: a 4-square private entry lane → an 8-square shared bridge
   → a 2-square private exit lane, then off the board. Rosettes (✤) are safe
   and grant an extra roll; landing on an enemy piece (never on a rosette)
   sends it back off the board; the exact roll is needed to bear off.
   First player to bear all 7 pieces off wins. */
(function () {
  "use strict";

  // 3×8 conceptual grid. Playable squares: row 1 (shared bridge) = all 8
  // columns; rows 0/2 = columns 0-3 (entry lanes) + 6-7 (exit lanes).
  // Columns 4-5 of the outer rows are the gaps that give the board its
  // classic two-blocks-plus-bridge shape.
  const P1_PATH = [[2, 3], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [2, 7], [2, 6]];
  const P2_PATH = [[0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [0, 7], [0, 6]];
  const ROSETTES = new Set(["2,0", "0,0", "1,3", "1,7"]);
  const OFF = 15; // path position 15 = borne off; 0 = waiting to enter
  const ARROWS = {
    "2,3": "‹", "2,2": "‹", "2,1": "‹", "2,0": "˄",
    "0,3": "‹", "0,2": "‹", "0,1": "‹", "0,0": "˅",
    "1,0": "›", "1,1": "›", "1,2": "›", "1,3": "›", "1,4": "›", "1,5": "›", "1,6": "›", "1,7": "↕"
  };

  function K(r, c) {
    return r + "," + c;
  }

  function pathCell(side, p) {
    return side === 1 ? P1_PATH[p - 1] : P2_PATH[p - 1];
  }

  GameRegistry.register({
    id: "royalur",
    name: "Royal Game of Ur",
    icon: "🏺",
    category: "strategy",
    description: "Sumerian dice race from 2600 BCE — 7 pieces each, 4 binary dice, captures on the shared bridge, rosettes are safe + extra roll, first to bear all 7 pieces off wins.",
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

      let pos, turn, rolled, over;
      // pos[1] / pos[2]: arrays of 7 path positions each.
      // 0 = waiting to enter, 1-14 = square on the board, 15 = borne off.

      root.innerHTML = `
        <style>
          .ur-board { display: grid; grid-template-columns: repeat(8, 46px); grid-template-rows: repeat(3, 46px); gap: 4px; justify-content: center; margin: 10px auto; }
          .ur-cell { position: relative; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-elev); cursor: pointer; }
          .ur-mid { background: var(--bg-soft); }
          .ur-p1lane { box-shadow: inset 0 0 0 100px rgba(99,102,241,0.10); }
          .ur-p2lane { box-shadow: inset 0 0 0 100px rgba(220,38,38,0.09); }
          .ur-rose { border-color: var(--warning); box-shadow: inset 0 0 0 2px var(--warning); }
          .ur-roseglyph { position: absolute; font-size: 20px; color: var(--warning); opacity: 0.55; user-select: none; }
          .ur-arrow { position: absolute; top: 1px; right: 4px; font-size: 10px; color: var(--text-muted); opacity: 0.8; user-select: none; }
          .ur-piece { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--bg-elev); box-shadow: 0 1px 3px rgba(0,0,0,0.35); z-index: 1; }
          .ur-p1p { background: var(--accent); }
          .ur-p2p { background: var(--danger); }
          .ur-movable { outline: 3px solid var(--accent); outline-offset: -3px; }
          .ur-dest { outline: 3px dashed var(--success); outline-offset: -3px; }
          .ur-destcap { outline: 3px dashed var(--danger); outline-offset: -3px; }
          .ur-ghost { width: 16px; height: 16px; border-radius: 50%; background: var(--success); opacity: 0.45; }
          .ur-ghostcap { color: var(--danger); font-size: 17px; font-weight: bold; }
          .ur-pool { display: flex; gap: 6px; justify-content: center; align-items: center; min-height: 32px; margin: 2px 0; flex-wrap: wrap; }
          .ur-pool-label { font-size: 12px; color: var(--text-muted); }
          .ur-mini { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--bg-elev); box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
          .ur-mini-p { background: var(--accent); }
          .ur-mini-a { background: var(--danger); }
          .ur-mini.go { outline: 3px solid var(--accent); outline-offset: 1px; cursor: pointer; }
          .ur-dice { font-family: var(--font-mono); font-size: 1.25rem; letter-spacing: 3px; min-width: 132px; text-align: center; }
          .ur-coin-on { color: var(--warning); }
          .ur-coin-off { color: var(--text-muted); opacity: 0.5; }
        </style>
        <div class="status info" id="ur-status"></div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">You home</div><div class="val" id="ur-h1">0 / 7</div></div>
          <div class="score-cell"><div class="label">AI home</div><div class="val" id="ur-h2">0 / 7</div></div>
        </div>
        <div class="ur-pool" id="ur-poolA"></div>
        <div class="center"><div class="ur-board" id="ur-board"></div></div>
        <div class="ur-pool" id="ur-poolP"></div>
        <div class="row center" style="gap:10px;margin-top:8px;flex-wrap:wrap;">
          <span class="ur-dice" id="ur-dice">· · · ·</span>
          <button class="btn primary" id="ur-roll">Roll the dice</button>
          <button class="btn" id="ur-new">New game</button>
        </div>
        <p class="hint">Roll the 4 binary dice (0-4). Tap a glowing piece — or its dashed target square — to move; tap a glowing piece in your start row to enter the board. Land on an enemy to send it home; ✤ rosettes are safe and roll again; exact roll to bear off.</p>
      `;

      const boardEl = root.querySelector("#ur-board");
      const statusEl = root.querySelector("#ur-status");
      const diceEl = root.querySelector("#ur-dice");

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : " info");
      }

      function newGame() {
        clearTimers();
        pos = {1: [0, 0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0, 0]};
        turn = 1;
        rolled = null;
        over = false;
        diceEl.innerHTML = "· · · ·";
        setStatus("Your turn — roll the dice");
        render();
      }

      function rollDice() {
        const coins = [0, 0, 0, 0].map(function () {
          return Math.random() < 0.5 ? 1 : 0;
        });
        return {coins: coins, total: coins[0] + coins[1] + coins[2] + coins[3]};
      }

      function showCoins(coins, total) {
        diceEl.innerHTML = coins.map(function (c) {
          return '<span class="' + (c ? "ur-coin-on" : "ur-coin-off") + '">' + (c ? "●" : "○") + "</span>";
        }).join(" ") + "  = <b>" + total + "</b>";
      }

      function indexOfAt(side, r, c) {
        const k = K(r, c);
        for (let i = 0; i < 7; i++) {
          const p = pos[side][i];
          if (p >= 1 && p <= 14 && K(pathCell(side, p)[0], pathCell(side, p)[1]) === k) return i;
        }
        return -1;
      }

      function legalMoves(side, r) {
        const out = [];
        if (r <= 0) return out;
        const foe = side === 1 ? 2 : 1;
        for (let i = 0; i < 7; i++) {
          const from = pos[side][i];
          if (from >= OFF) continue;
          const to = from + r;
          if (to > OFF) continue; // overshoot — exact roll needed to bear off
          if (to === OFF) {
            out.push({i: i, from: from, to: to, capture: -1, rosette: false});
            continue;
          }
          const cell = pathCell(side, to);
          const rosette = ROSETTES.has(K(cell[0], cell[1]));
          if (indexOfAt(side, cell[0], cell[1]) >= 0) continue; // own piece blocks
          const foeIdx = indexOfAt(foe, cell[0], cell[1]);
          if (foeIdx >= 0 && rosette) continue; // enemies are safe on rosettes
          out.push({i: i, from: from, to: to, capture: foeIdx, rosette: rosette});
        }
        return out;
      }

      function render() {
        boardEl.innerHTML = "";
        const moves = (turn === 1 && !over && rolled > 0) ? legalMoves(1, rolled) : [];
        const movable = new Set();
        const dests = new Map();
        let entryLegal = false;
        for (const m of moves) {
          if (m.from === 0) entryLegal = true;
          else movable.add(K(pathCell(1, m.from)[0], pathCell(1, m.from)[1]));
          if (m.to >= 1 && m.to <= 14) {
            const k = K(pathCell(1, m.to)[0], pathCell(1, m.to)[1]);
            if (!dests.has(k)) dests.set(k, m);
          }
        }
        for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
          const cell = document.createElement("div");
          const playable = r === 1 || c <= 3 || c >= 6;
          if (!playable) {
            cell.className = "ur-gap";
            boardEl.appendChild(cell);
            continue;
          }
          const k = K(r, c);
          cell.className = "ur-cell" + (r === 1 ? " ur-mid" : (r === 2 ? " ur-p1lane" : " ur-p2lane"));
          if (ROSETTES.has(k)) {
            cell.classList.add("ur-rose");
            const g = document.createElement("span");
            g.className = "ur-roseglyph";
            g.textContent = "✤";
            cell.appendChild(g);
          }
          if (ARROWS[k]) {
            const a = document.createElement("span");
            a.className = "ur-arrow";
            a.textContent = ARROWS[k];
            cell.appendChild(a);
          }
          const p1i = indexOfAt(1, r, c), p2i = indexOfAt(2, r, c);
          if (p1i >= 0 || p2i >= 0) {
            const d = document.createElement("div");
            d.className = "ur-piece " + (p1i >= 0 ? "ur-p1p" : "ur-p2p");
            cell.appendChild(d);
          }
          if (movable.has(k)) cell.classList.add("ur-movable");
          const dm = dests.get(k);
          if (dm) {
            cell.classList.add(dm.capture >= 0 ? "ur-destcap" : "ur-dest");
            if (p1i < 0 && p2i < 0) {
              const g = document.createElement("div");
              g.className = dm.capture >= 0 ? "ur-ghost ur-ghostcap" : "ur-ghost";
              g.textContent = dm.capture >= 0 ? "⚔" : "";
              cell.appendChild(g);
            }
          }
          cell.addEventListener("click", function () {
            onCell(r, c);
          });
          boardEl.appendChild(cell);
        }
        renderPool(root.querySelector("#ur-poolA"), 2, false);
        renderPool(root.querySelector("#ur-poolP"), 1, entryLegal);
        root.querySelector("#ur-h1").textContent = pos[1].filter(function (p) {
          return p === OFF;
        }).length + " / 7";
        root.querySelector("#ur-h2").textContent = pos[2].filter(function (p) {
          return p === OFF;
        }).length + " / 7";
      }

      function renderPool(el, side, clickable) {
        el.innerHTML = "";
        const label = document.createElement("span");
        label.className = "ur-pool-label";
        label.textContent = (side === 1 ? "Your start (tap to enter): " : "AI start: ");
        el.appendChild(label);
        const waiting = pos[side].filter(function (p) {
          return p === 0;
        }).length;
        if (waiting === 0) {
          const none = document.createElement("span");
          none.className = "ur-pool-label";
          none.textContent = "—";
          el.appendChild(none);
          return;
        }
        for (let i = 0; i < waiting; i++) {
          const d = document.createElement("div");
          d.className = "ur-mini " + (side === 1 ? "ur-mini-p" : "ur-mini-a") + (clickable ? " go" : "");
          if (clickable) d.addEventListener("click", onPool);
          el.appendChild(d);
        }
      }

      function onPool() {
        if (over || turn !== 1 || rolled == null || rolled <= 0) return;
        const m = legalMoves(1, rolled).find(function (mv) {
          return mv.from === 0;
        });
        if (m) executeMove(1, m);
      }

      function onCell(r, c) {
        if (over || turn !== 1 || rolled == null || rolled <= 0) return;
        const k = K(r, c);
        const moves = legalMoves(1, rolled);
        const byPiece = moves.find(function (m) {
          return m.from >= 1 && m.from <= 14 && K(pathCell(1, m.from)[0], pathCell(1, m.from)[1]) === k;
        });
        if (byPiece) {
          executeMove(1, byPiece);
          return;
        }
        const byDest = moves.find(function (m) {
          return m.to >= 1 && m.to <= 14 && K(pathCell(1, m.to)[0], pathCell(1, m.to)[1]) === k;
        });
        if (byDest) {
          executeMove(1, byDest);
          return;
        }
        AudioFX.error();
      }

      function onRoll() {
        if (over || turn !== 1 || rolled != null) {
          AudioFX.error();
          return;
        }
        const d = rollDice();
        rolled = d.total;
        AudioFX.flip();
        showCoins(d.coins, d.total);
        if (d.total === 0) {
          setStatus("Blank throw — no move, turn passes.");
          later(function () {
            passTo(2, "AI's turn…");
          }, 900);
          render();
          return;
        }
        if (!legalMoves(1, d.total).length) {
          setStatus("You rolled " + d.total + " — no legal move, turn passes.");
          later(function () {
            passTo(2, "AI's turn…");
          }, 900);
          render();
          return;
        }
        setStatus("You rolled " + d.total + " — tap a glowing piece or its target square.");
        render();
      }

      function executeMove(side, m) {
        const foe = side === 1 ? 2 : 1;
        let note = "";
        if (m.capture >= 0) {
          pos[foe][m.capture] = 0; // knocked back off the board
          AudioFX.pop();
          note = side === 1 ? "⚔️ Capture! The AI piece goes back to the start. " : "⚔️ The AI captured your piece! ";
        }
        pos[side][m.i] = m.to;
        rolled = null;
        if (pos[side].every(function (p) {
          return p === OFF;
        })) {
          render();
          endGame(side);
          return;
        }
        if (m.to === OFF) {
          AudioFX.reveal();
          note += side === 1 ? "A piece bore off! " : "The AI bore off a piece. ";
        } else if (m.rosette) {
          AudioFX.reveal();
          note += "✤ Rosette — extra roll! ";
        } else if (m.capture < 0) {
          AudioFX.move();
        }
        render();
        if (m.to <= 14 && m.rosette) {
          if (side === 1) setStatus(note + "Roll again!");
          else {
            setStatus(note + "The AI rolls again…");
            later(aiRoll, 850);
          }
          return;
        }
        if (side === 1) passTo(2, note + "AI's turn…");
        else passTo(1, note + "Your turn — roll the dice.");
      }

      function passTo(side, text) {
        turn = side;
        rolled = null;
        setStatus(text);
        render();
        if (side === 2) later(aiRoll, 800);
      }

      function aiRoll() {
        if (over || !alive) return;
        const d = rollDice();
        AudioFX.flip();
        showCoins(d.coins, d.total);
        setStatus("AI rolled " + d.total + "…");
        later(function () {
          if (over || !alive) return;
          const moves = legalMoves(2, d.total);
          if (!moves.length) {
            passTo(1, "AI rolled " + d.total + " — no legal move. Your turn!");
            return;
          }
          executeMove(2, aiPick(moves));
        }, 700);
      }

      // Simple AI: capture > rosette > advance (with a light danger check).
      function aiPick(moves) {
        let best = null, bestS = -Infinity;
        for (const m of moves) {
          let s = Math.random() * 3;
          if (m.capture >= 0) s += 100 + 4 * pos[1][m.capture];
          if (m.to === OFF) s += 90;
          if (m.rosette) s += 45;
          if (m.from === 0) s += 4;
          s += m.to * 1.2;
          if (m.to <= 14 && !m.rosette) {
            // could the human capture this piece with their next throw?
            const cell = pathCell(2, m.to);
            for (let q = 1; q <= 14; q++) {
              if (K(pathCell(1, q)[0], pathCell(1, q)[1]) !== K(cell[0], cell[1])) continue;
              for (let dd = 1; dd <= 4; dd++) {
                const p = q - dd;
                if (p === 0) {
                  s -= 8;
                  continue;
                }
                if (p >= 1 && pos[1].indexOf(p) >= 0) s -= 16;
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

      function endGame(side) {
        over = true;
        rolled = null;
        render();
        if (side === 1) {
          setStatus("🏆 You bore all 7 pieces off the board — you win!", "win");
          AudioFX.win();
          App.recordResult(true, 7);
          App.toast("🏆 Royal Game of Ur — victory!", "success");
        } else {
          setStatus("The AI bore all 7 pieces off first — you lose.", "lose");
          AudioFX.lose();
          App.recordResult(false, pos[1].filter(function (p) {
            return p === OFF;
          }).length);
          App.toast("The AI won the race.", "warning");
        }
      }

      root.querySelector("#ur-roll").addEventListener("click", onRoll);
      root.querySelector("#ur-new").addEventListener("click", function () {
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
      App.showModal("How to play the Royal Game of Ur",
        `A Sumerian race game, over 4500 years old. You are <b style="color:var(--accent)">blue</b> (bottom lane), the AI is <b style="color:var(--danger)">red</b> (top lane).
        <br><br><b>The route (14 squares):</b> enter your 4-square private lane (bottom row, arrows ‹), race across the 8-square <b>shared bridge</b> (middle row — both players fight over it, in the same direction), then take your 2 private exit squares (bottom-right) and bear off. The little arrows show the direction of travel.
        <br><br><b>Dice:</b> four binary dice — the sum of the heads (●) is your move, 0-4. A blank throw (0) passes the turn.
        <br><br><b>Moving:</b> move one piece exactly the number thrown, or bring a new piece onto the square matching the throw (tap your start row). You may not overshoot the exit — from the last square only a throw of 1 bears off. You must move if you can; if no piece can legally move, the turn passes.
        <br><br><b>Capturing:</b> land on a lone enemy piece to send it back off the board (it must start over). You can never land on an occupied <b>rosette ✤</b>.
        <br><br><b>Rosettes ✤ (4 of them):</b> safe squares — a piece on one cannot be captured, and landing on one earns another roll immediately.
        <br><br><b>Winning:</b> the first player to bear all <b>7 pieces</b> off the end of the route wins.`);
    },
  });
})();
