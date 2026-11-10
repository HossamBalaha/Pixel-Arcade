/* snakesladders — Snakes & Ladders (Moksha Patam).
   10×10 board numbered 1-100 in boustrophedon rows (1 bottom-left, 100
   top-left). Fixed ladders: 1→38, 4→14, 9→31, 21→42, 28→84, 36→44, 51→67,
   71→91, 80→100. Fixed snakes: 16→6, 47→26, 49→11, 56→53, 62→19, 64→60,
   87→24, 93→73, 95→75, 98→78. Roll a d6 and move; overshooting 100 means
   no move; land on a ladder foot to climb, a snake head to slide.
   You (blue) vs the AI (red); first to land exactly on 100 wins. */
(function () {
  "use strict";

  const LADDERS = {1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100};
  const SNAKES = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78};
  const DIE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  GameRegistry.register({
    id: "snakesladders",
    name: "Snakes & Ladders",
    icon: "🐍",
    category: "strategy",
    description: "The ancient race of Moksha Patam — roll the die, climb the ladders 🪜, dodge the snakes 🐍, and land exactly on 100 to win. You vs the AI.",
    tags: ["strategy", "classic", "race", "dice", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
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

      let pos, turn, over, busy, rolls, die;
      // 2P hot-seat mode + pass-screen pref.
      let mode = "ai";
      let passOn = Storage.getPassPlay("snakesladders", true);

      root.innerHTML = `
        <style>
          .sl-board { display: grid; grid-template-columns: repeat(10, 38px); grid-template-rows: repeat(10, 38px); gap: 2px; justify-content: center; background: var(--border); padding: 3px; border-radius: var(--radius-sm, 8px); margin: 10px auto; }
          .sl-cell { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-elev); border-radius: 4px; }
          .sl-num { position: absolute; top: 1px; left: 3px; font-size: 8px; color: var(--text-muted); font-family: var(--font-mono); }
          .sl-mark { font-size: 15px; line-height: 1; }
          .sl-lad { background: rgba(22, 163, 74, 0.13); }
          .sl-snk { background: rgba(220, 38, 38, 0.11); }
          .sl-goal { background: rgba(245, 158, 11, 0.18); }
          .sl-tokens { display: flex; gap: 2px; position: absolute; bottom: 2px; }
          .sl-tok { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--bg-elev); box-shadow: 0 1px 2px rgba(0,0,0,0.4); }
          .sl-tok-p { background: var(--accent); }
          .sl-tok-a { background: var(--danger); }
          @keyframes sl-flash { 0% { transform: scale(1); } 50% { transform: scale(1.22); } 100% { transform: scale(1); } }
          .sl-flash { animation: sl-flash 0.5s ease; }
          .sl-die { font-size: 1.9rem; min-width: 56px; text-align: center; font-family: var(--font-mono); }
          .sl-log { height: 104px; overflow-y: auto; background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm, 8px); padding: 6px 10px; font-family: var(--font-mono); font-size: 12px; color: var(--text); max-width: 420px; margin: 8px auto 0; }
          .sl-log div { padding: 1px 0; border-bottom: 1px dotted var(--border); }
          .sl-log .sl-you { color: var(--accent); font-weight: 700; }
          .sl-log .sl-ai { color: var(--danger); font-weight: 700; }
        </style>
        <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px;">
          <div class="difficulty" id="snl-mode">
            <button class="diff-btn active" data-m="ai">vs AI</button>
            <button class="diff-btn" data-m="2p">2P</button>
          </div>
          <button class="diff-btn" id="snl-pass" title="Show a privacy screen between turns when playing 2P">🙈 Pass: ON</button>
        </div>
        <div class="status info" id="sl-status"></div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label" id="sl-p-label">You 🔵</div><div class="val" id="sl-p">start</div></div>
          <div class="score-cell"><div class="label">Rolls</div><div class="val" id="sl-r">0</div></div>
          <div class="score-cell"><div class="label" id="sl-a-label">AI 🔴</div><div class="val" id="sl-a">start</div></div>
        </div>
        <div class="center"><div class="sl-board" id="sl-board"></div></div>
        <div class="row center" style="gap:10px;margin-top:6px;flex-wrap:wrap;">
          <span class="sl-die" id="sl-die">-</span>
          <button class="btn primary" id="sl-roll">Roll the die</button>
          <button class="btn" id="sl-new">New game</button>
        </div>
        <div class="sl-log" id="sl-log"></div>
        <p class="hint">Roll the die and race the AI to square 100 — you need the <b>exact</b> roll to land on it. Ladder feet 🪜 climb, snake heads 🐍 slide you down.</p>
      `;

      const boardEl = root.querySelector("#sl-board");
      const statusEl = root.querySelector("#sl-status");
      const dieEl = root.querySelector("#sl-die");
      const logEl = root.querySelector("#sl-log");
      const rollBtn = root.querySelector("#sl-roll");
      const nameOf = side => mode === "2p"
        ? (side === "P" ? "P1 🔵" : "P2 🔴")
        : (side === "P" ? "You" : "AI");
      const syncPassBtn = () => {
        const pb = root.querySelector("#snl-pass");
        pb.textContent = "🙈 Pass: " + (passOn ? "ON" : "OFF");
        pb.classList.toggle("active", passOn);
      };
      syncPassBtn();
      root.querySelector("#snl-pass").addEventListener("click", () => {
        passOn = !passOn;
        Storage.setPassPlay("snakesladders", passOn);
        syncPassBtn();
        AudioFX.click();
      });
      root.querySelectorAll("#snl-mode .diff-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          root.querySelectorAll("#snl-mode .diff-btn").forEach(x => x.classList.remove("active"));
          btn.classList.add("active");
          mode = btn.dataset.m;
          AudioFX.click();
          root.querySelector("#sl-p-label").textContent = mode === "2p" ? "P1 🔵" : "You 🔵";
          root.querySelector("#sl-a-label").textContent = mode === "2p" ? "P2 🔴" : "AI 🔴";
          newGame();
        });
      });

      function setStatus(t, k) {
        statusEl.textContent = t;
        statusEl.className = "status" + (k ? " " + k : " info");
      }

      function log(text, cls) {
        const line = document.createElement("div");
        if (cls) line.className = cls;
        line.textContent = text;
        logEl.appendChild(line);
        while (logEl.childNodes.length > 40) logEl.removeChild(logEl.firstChild);
        logEl.scrollTop = logEl.scrollHeight;
      }

      // Visual row v (0 = top): row-from-bottom rb = 9 - v.
      // Even rb runs left→right, odd rb runs right→left (boustrophedon).
      function squareAt(v, col) {
        const rb = 9 - v;
        return rb % 2 === 0 ? rb * 10 + col + 1 : rb * 10 + (10 - col);
      }

      function newGame() {
        clearTimers();
        pos = {P: 0, A: 0};
        turn = "P";
        over = false;
        busy = false;
        rolls = {P: 0, A: 0};
        die = 0;
        dieEl.textContent = "-";
        logEl.innerHTML = "";
        log("You are 🔵 blue, the AI is 🔴 red. Roll to enter the board at square 1!");
        setStatus("Your turn — roll the die!");
        render();
      }

      function render() {
        boardEl.innerHTML = "";
        for (let v = 0; v < 10; v++) for (let col = 0; col < 10; col++) {
          const n = squareAt(v, col);
          const cell = document.createElement("div");
          cell.className = "sl-cell";
          cell.dataset.n = n;
          if (LADDERS[n] != null) cell.classList.add("sl-lad");
          else if (SNAKES[n] != null) cell.classList.add("sl-snk");
          if (n === 100) cell.classList.add("sl-goal");
          const num = document.createElement("span");
          num.className = "sl-num";
          num.textContent = n;
          cell.appendChild(num);
          let mark = "";
          if (LADDERS[n] != null) mark = "🪜";
          else if (SNAKES[n] != null) mark = "🐍";
          else if (n === 100) mark = "🏆";
          if (mark) {
            const m = document.createElement("span");
            m.className = "sl-mark";
            m.textContent = mark;
            cell.appendChild(m);
          }
          const tokens = document.createElement("div");
          tokens.className = "sl-tokens";
          if (pos.P === n) {
            const t = document.createElement("div");
            t.className = "sl-tok sl-tok-p";
            t.title = "You";
            tokens.appendChild(t);
          }
          if (pos.A === n) {
            const t = document.createElement("div");
            t.className = "sl-tok sl-tok-a";
            t.title = "AI";
            tokens.appendChild(t);
          }
          if (tokens.childNodes.length) cell.appendChild(tokens);
          boardEl.appendChild(cell);
        }
        root.querySelector("#sl-p").textContent = pos.P === 0 ? "start" : pos.P;
        root.querySelector("#sl-a").textContent = pos.A === 0 ? "start" : pos.A;
        root.querySelector("#sl-r").textContent = rolls.P;
        rollBtn.disabled = !(turn === "P" && !busy && !over) && !(mode === "2p" && !busy && !over);
      }

      function flashSquare(n) {
        const cell = boardEl.querySelector('.sl-cell[data-n="' + n + '"]');
        if (!cell) return;
        cell.classList.add("sl-flash");
        later(function () {
          cell.classList.remove("sl-flash");
        }, 550);
      }

      function onRoll() {
        if (over || busy) {
          AudioFX.error();
          return;
        }
        if (mode === "ai" && turn !== "P") {
          AudioFX.error();
          return;
        }
        takeTurn(turn);
      }

      function takeTurn(side) {
        if (over || !alive) return;
        const r = 1 + Math.floor(Math.random() * 6);
        die = r;
        rolls[side]++;
        dieEl.textContent = DIE_FACES[r - 1] + " " + r;
        AudioFX.flip();
        const name = nameOf(side);
        log(name + " rolled " + r, side === "P" ? "sl-you" : "sl-ai");
        const from = pos[side];
        const to = from + r;
        if (to > 100) {
          log("  …needs exactly " + (100 - from) + " to finish — stays on " + from);
          AudioFX.error();
          setStatus(name + " needs exactly " + (100 - from) + " — no move!");
          later(function () {
            endTurn(side);
          }, 900);
          return;
        }
        busy = true;
        render();
        setStatus(name + " rolled " + r + " — moving…");
        stepTo(side, from + 1, to);
      }

      function stepTo(side, next, target) {
        if (!alive || over) return;
        pos[side] = next;
        AudioFX.tick();
        render();
        if (next < target) {
          later(function () {
            stepTo(side, next + 1, target);
          }, 115);
          return;
        }
        later(function () {
          resolveLanding(side);
        }, 420);
      }

      function resolveLanding(side) {
        if (!alive || over) return;
        const s = pos[side];
        const name = side === "P" ? "You" : "AI";
        if (LADDERS[s] != null) {
          log("  🪜 Ladder! " + s + " climbs up to " + LADDERS[s]);
          setStatus(name + " hit a ladder — up to " + LADDERS[s] + "!");
          AudioFX.reveal();
          pos[side] = LADDERS[s];
          flashSquare(LADDERS[s]);
          render();
        } else if (SNAKES[s] != null) {
          log("  🐍 Snake! " + s + " slides down to " + SNAKES[s]);
          setStatus(name + " bit by a snake — down to " + SNAKES[s] + "!");
          AudioFX.pop();
          pos[side] = SNAKES[s];
          flashSquare(SNAKES[s]);
          render();
        }
        later(function () {
          afterLand(side);
        }, 500);
      }

      function afterLand(side) {
        if (over) return;
        if (pos[side] === 100) {
          endGame(side);
          return;
        }
        endTurn(side);
      }

      function endTurn(side) {
        busy = false;
        if (over) return;
        const next = side === "P" ? "A" : "P";
        turn = next;
        render();
        if (next === "A" && mode === "ai") {
          setStatus("AI is rolling…");
          later(function () {
            takeTurn("A");
          }, 850);
        } else {
          const label = nameOf(next);
          setStatus(label + " — roll the die!");
          if (mode === "2p" && passOn) App.passTurn(label);
        }
      }

      function endGame(side) {
        over = true;
        busy = false;
        render();
        if (mode === "2p") {
          const label = nameOf(side);
          setStatus("🏆 " + label + " landed exactly on 100 — " + label + " wins!", "win");
          AudioFX.win();
          App.recordResult(true, rolls.P);
          App.toast("🏆 Snakes & Ladders — " + label + " wins in " + rolls[side] + " rolls!", "success");
          return;
        }
        if (side === "P") {
          setStatus("🏆 You landed exactly on 100 — you win!", "win");
          AudioFX.win();
          App.recordResult(true, rolls.P);
          App.toast("🏆 Snakes & Ladders — you win in " + rolls.P + " rolls!", "success");
        } else {
          setStatus("The AI reached 100 first — you lose.", "lose");
          AudioFX.lose();
          App.recordResult(false, rolls.P);
          App.toast("The AI reached 100 first.", "warning");
        }
      }

      rollBtn.addEventListener("click", onRoll);
      root.querySelector("#sl-new").addEventListener("click", function () {
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
      App.showModal("How to play Snakes & Ladders",
        `The ancient Indian race game of Moksha Patam on a 10×10 board numbered <b>1-100</b> in boustrophedon rows (1 at the bottom-left, 100 at the top-left).
        <br><br>You are <b style="color:var(--accent)">🔵 blue</b>, the AI is <b style="color:var(--danger)">🔴 red</b>. Both tokens start off the board.
        <br><br><b>On your turn</b>, press <b>Roll the die</b> and move forward the number shown (your first roll lands you on that square).
        <br><br><b>Ladders 🪜:</b> end your move on a ladder foot and you climb straight up — 1→38, 4→14, 9→31, 21→42, 28→84, 36→44, 51→67, 71→91, 80→100.
        <br><b>Snakes 🐍:</b> end your move on a snake head and you slide all the way down — 16→6, 47→26, 49→11, 56→53, 62→19, 64→60, 87→24, 93→73, 95→75, 98→78.
        <br><br><b>Overshooting:</b> if the roll would take you past 100, you don't move at all — you need the <b>exact</b> roll to land on 100.
        <br><br><b>Winning:</b> the first player to stand exactly on square 100 (climbing the 80→100 ladder counts!) wins. No skill, no mercy — just dice, destiny and serpents.`);
    },
  });
})();
