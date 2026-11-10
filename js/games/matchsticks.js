/* Matchsticks — move or remove matches to fix the equation */
(function () {
  let live = null;
  GameRegistry.register({
    id: "matchsticks",
    name: "Matchsticks",
    icon: "🪵",
    category: "logic",
    description: "Move or remove matches to fix the equation",
    tags: ["logic", "classic", "equations"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      // digits rendered with 7-seg matches; puzzle = equation that is wrong, fix by moving N matches
      const SEGS = {
        "0": [1, 1, 1, 1, 1, 1, 0], "1": [0, 1, 1, 0, 0, 0, 0], "2": [1, 1, 0, 1, 1, 0, 1],
        "3": [1, 1, 1, 1, 0, 0, 1], "4": [0, 1, 1, 0, 0, 1, 1], "5": [1, 0, 1, 1, 0, 1, 1],
        "6": [1, 0, 1, 1, 1, 1, 1], "7": [1, 1, 1, 0, 0, 0, 0], "8": [1, 1, 1, 1, 1, 1, 1],
        "9": [1, 1, 1, 1, 0, 1, 1], "+": "op+", "-": "op-", "=": "op=",
      };
      let equation, targetMoves, moves, solvedCount, best, selected, won;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ms-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ms-best">0</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="ms-moves">0</div></div>
        </div>
        <div class="status info" id="ms-status">Click a match to remove it, click a gap to place one</div>
        <div class="center"><canvas id="ms-canvas" width="420" height="170"></canvas></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="ms-check">✔ Check</button>
          <button class="btn btn-sm" id="ms-reset">↻ Reset</button>
          <button class="btn btn-sm" id="ms-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Make the equation true using at most the suggested number of match moves.</p>
      `;

      const canvas = root.querySelector("#ms-canvas"), ctx = canvas.getContext("2d");
      const statusEl = root.querySelector("#ms-status");
      best = Storage.getBest("matchsticks") || 0;
      solvedCount = 0;

      // Build equation as list of symbols; each digit has 7 segments state
      // puzzles: [display, movesAllowed] — display is wrong equation
      const PUZZLES = [
        {disp: "6+4=4", moves: 1, hint: "turn a 6 into something smaller…"},
        {disp: "5+3=5", moves: 1, hint: "move one stick from a 5"},
        {disp: "9-6=3", moves: 1, hint: "it's already close — adjust the left"},
        {disp: "8-4=4", moves: 1, hint: "one match from the 8"},
        {disp: "3+3=9", moves: 1, hint: "rotate something"},
        {disp: "6-3=8", moves: 1, hint: "the 8 needs one less"},
        {disp: "7+2=8", moves: 1, hint: "the 7 can become a 6"},
        {disp: "4+1=7", moves: 2, hint: "rebuild the 7"},
        {disp: "9-9=9", moves: 1, hint: "two 9s become smaller"},
        {disp: "5+5=9", moves: 1, hint: "9 to 0? or fix the plus…"},
      ];

      let symbols = [];

      function parseEquation(disp) {
        symbols = disp.split("").map(ch => {
          if (SEGS[ch] === "op+" || ch === "+") return {ch: "+"};
          if (ch === "-") return {ch: "-"};
          if (ch === "=") return {ch: "="};
          return {ch, segs: SEGS[ch].slice()};
        });
      }

      function currentString() {
        // find what digit each segs pattern is (or "?" if invalid)
        return symbols.map(s => {
          if (!s.segs) return s.ch;
          const key = s.segs.join(",");
          for (const [d, pat] of Object.entries(SEGS)) {
            if (Array.isArray(pat) && pat.join(",") === key) return d;
          }
          return "?";
        }).join("");
      }

      function evaluate(str) {
        const m = str.match(/^(\S)([+\-])(\S)=(\S)$/);
        if (!m) return null;
        const [, a, op, b, c] = m;
        if (a === "?" || b === "?" || c === "?") return null;
        const L = Number(a), R = Number(b), Rr = Number(c);
        return op === "+" ? L + R === Rr : L - R === Rr;
      }

      function load(p) {
        parseEquation(p.disp);
        targetMoves = p.moves;
        moves = 0;
        selected = null;
        won = false;
        render();
        statusEl.textContent = `Fix the equation by moving at most <b>${p.moves}</b> match${p.moves > 1 ? "es" : ""}. ${p.hint}`;
        statusEl.className = "status info";
      }

      // geometry: each symbol slot 70px wide; segments positions
      function symbolPos(i) {
        return {x: 30 + i * 74, y: 40};
      }

      const SEGPOS = [ // for 7-seg digit at (x,y), segment index -> line coords (w=36 h=60)
        s => [s.x + 4, s.y, s.x + 32, s.y],           // top
        s => [s.x + 34, s.y + 2, s.x + 34, s.y + 28], // top-right
        s => [s.x + 34, s.y + 32, s.x + 34, s.y + 60],// bottom-right
        s => [s.x + 4, s.y + 62, s.x + 32, s.y + 62], // bottom
        s => [s.x + 2, s.y + 32, s.x + 2, s.y + 60],  // bottom-left
        s => [s.x + 2, s.y + 2, s.x + 2, s.y + 30],   // top-left
        s => [s.x + 4, s.y + 31, s.x + 32, s.y + 31], // middle
      ];

      let heldSeg = null; // {symIdx, segIdx} — a match picked up, to place elsewhere

      function render() {
        root.querySelector("#ms-solved").textContent = solvedCount;
        root.querySelector("#ms-best").textContent = best;
        root.querySelector("#ms-moves").textContent = moves;
        ctx.fillStyle = "#1e1b16";
        ctx.fillRect(0, 0, 420, 170);
        symbols.forEach((s, i) => {
          const p = symbolPos(i);
          if (!s.segs) {
            // operator
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 7;
            ctx.lineCap = "round";
            ctx.beginPath();
            if (s.ch === "+") {
              ctx.moveTo(p.x + 8, p.y + 30);
              ctx.lineTo(p.x + 40, p.y + 30);
              ctx.moveTo(p.x + 24, p.y + 14);
              ctx.lineTo(p.x + 24, p.y + 46);
            } else if (s.ch === "-") {
              ctx.moveTo(p.x + 8, p.y + 30);
              ctx.lineTo(p.x + 40, p.y + 30);
            } else { // =
              ctx.moveTo(p.x + 6, p.y + 22);
              ctx.lineTo(p.x + 42, p.y + 22);
              ctx.moveTo(p.x + 6, p.y + 38);
              ctx.lineTo(p.x + 42, p.y + 38);
            }
            ctx.stroke();
            return;
          }
          SEGPOS.forEach((seg, si) => {
            const on = s.segs[si] === 1;
            const [x1, y1, x2, y2] = seg(p);
            if (on) {
              const isHeld = heldSeg && heldSeg.symIdx === i && heldSeg.segIdx === si;
              ctx.strokeStyle = isHeld ? "rgba(245,158,11,0.3)" : "#f59e0b";
              ctx.lineWidth = 8;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.strokeStyle = "rgba(255,220,150,0.5)";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            } else {
              ctx.strokeStyle = "rgba(255,255,255,0.10)";
              ctx.lineWidth = 2;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });
        });
        if (heldSeg) {
          ctx.fillStyle = "#fbbf24";
          ctx.font = "13px sans-serif";
          ctx.fillText("Holding a match — click a dashed gap to place it (or same spot to cancel)", 30, 152);
        }
      }

      canvas.addEventListener("pointerdown", (e) => {
        if (won) return;
        const r = canvas.getBoundingClientRect();
        const mx = (e.clientX - r.left) * (420 / r.width);
        const my = (e.clientY - r.top) * (170 / r.height);
        // find nearest segment across digits
        let bestHit = null, bestD = 18;
        symbols.forEach((s, i) => {
          if (!s.segs) return;
          const p = symbolPos(i);
          SEGPOS.forEach((seg, si) => {
            const [x1, y1, x2, y2] = seg(p);
            // distance point-to-segment
            const dx = x2 - x1, dy = y2 - y1;
            const len2 = dx * dx + dy * dy || 1;
            let t = ((mx - x1) * dx + (my - y1) * dy) / len2;
            t = Math.max(0, Math.min(1, t));
            const d = Math.hypot(mx - (x1 + t * dx), my - (y1 + t * dy));
            if (d < bestD) {
              bestD = d;
              bestHit = {sym: i, seg: si};
            }
          });
        });
        if (!bestHit) return;
        const s = symbols[bestHit.sym];
        if (heldSeg) {
          // placing held match
          if (s.segs[bestHit.seg] === 0) {
            s.segs[bestHit.seg] = 1;
            symbols[heldSeg.sym].segs[heldSeg.seg] = 0;
            moves++;
            AudioFX.pop();
            heldSeg = null;
            render();
            checkWin();
          } else {
            // clicked an occupied spot — if it's the origin, cancel
            if (bestHit.sym === heldSeg.sym && bestHit.seg === heldSeg.seg) {
              heldSeg = null;
              render();
            } else AudioFX.error();
          }
        } else if (s.segs[bestHit.seg] === 1) {
          heldSeg = bestHit;
          AudioFX.click();
          render();
        }
      });

      function checkWin() {
        const str = currentString();
        const ok = evaluate(str);
        if (ok === true) {
          won = true;
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("matchsticks", best);
          }
          statusEl.innerHTML = `✔ <b>${str}</b> is true! Solved in ${moves} move${moves > 1 ? "s" : ""}. New puzzle…`;
          statusEl.className = "status win";
          after(() => load(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]), 2200);
        } else if (ok === false) {
          statusEl.textContent = `Current: ${str} — still false, keep going`;
          statusEl.className = "status info";
        } else {
          statusEl.textContent = `Current: ${str} — not a valid equation yet`;
          statusEl.className = "status info";
        }
      }

      root.querySelector("#ms-check").addEventListener("click", checkWin);
      root.querySelector("#ms-reset").addEventListener("click", () => {
        heldSeg = null;
        moves = 0;
        parseEquation(PUZZLES[curIdx].disp);
        render();
      });
      root.querySelector("#ms-new").addEventListener("click", () => {
        let i = Math.floor(Math.random() * PUZZLES.length);
        curIdx = i;
        load(PUZZLES[i]);
      });
      let curIdx = 0;

      live = {
        hint: function () {
          if (won) return;
          const segNames = ["top", "top-right", "bottom-right", "bottom", "bottom-left", "top-left", "middle"];
          const ords = ["1st", "2nd", "3rd"];
          const slots = [];
          symbols.forEach((s, i) => {
            if (s.segs) slots.push(i);
          });
          const opSym = symbols.find(s => s.ch === "+" || s.ch === "-");
          if (slots.length !== 3 || !opSym) {
            App.toast("Nothing more to reveal 💡", "info");
            return;
          }
          // nearest true equation reachable by moving matches (each move = take one, place one)
          let target = null, targetDist = Infinity;
          for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) {
            const c = opSym.ch === "+" ? a + b : a - b;
            if (c < 0 || c > 9) continue;
            const want = [SEGS[String(a)], SEGS[String(b)], SEGS[String(c)]];
            let rem = 0, add = 0;
            for (let k = 0; k < 3; k++) {
              const cur = symbols[slots[k]].segs;
              for (let si = 0; si < 7; si++) {
                if (cur[si] === 1 && want[k][si] === 0) rem++;
                else if (cur[si] === 0 && want[k][si] === 1) add++;
              }
            }
            const dist = (rem + add) / 2;
            if (rem === add && dist > 0 && dist < targetDist) {
              targetDist = dist;
              target = want;
            }
          }
          if (!target) {
            App.toast("💡 Hint: no clean fix from this position — try ↻ Reset", "info");
            return;
          }
          // reveal ONE match that has to move
          for (let k = 0; k < 3; k++) {
            const cur = symbols[slots[k]].segs;
            for (let si = 0; si < 7; si++) {
              if (cur[si] === 1 && target[k][si] === 0) {
                AudioFX.reveal();
                App.toast(`💡 Hint: the ${segNames[si]} match of the ${ords[k]} digit needs to move`, "info");
                return;
              }
            }
          }
          App.toast("Nothing more to reveal 💡", "info");
        },
      };

      curIdx = Math.floor(Math.random() * PUZZLES.length);
      load(PUZZLES[curIdx]);
      return function cleanup() {
        __t.forEach(clearTimeout);
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Matchsticks",
        `The equation shown is <b>false</b>. Fix it by moving matches:
        <br><br>1. Click a <b>lit match</b> to pick it up.
        <br>2. Click a <b>dashed gap</b> to place it there.
        <br><br>Transform digits into other digits (a 6 can become a 0, a 5 a 3 or a 2…), or get creative!
        The equation checks itself whenever it becomes mathematically valid — <b>make it true</b> to win.
        Fewer moves is better; each puzzle has a suggested maximum.`);
    },
  });
})();
