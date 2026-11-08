/* Ball Sort — pour balls between tubes until each holds a single color */
(function () {
  GameRegistry.register({
    id: "ballsort",
    name: "Ball Sort",
    icon: "🔴",
    category: "logic",
    description: "Pour balls between tubes until each holds a single color",
    tags: ["logic", "sorting", "puzzle"],
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
      const CAP = 4;
      let tubes, selected, moves, best, won, level;
      const COLORS = [
        {c: "#ef4444", n: "red"}, {c: "#3b82f6", n: "blue"}, {c: "#22c55e", n: "green"},
        {c: "#f59e0b", n: "amber"}, {c: "#a855f7", n: "purple"}, {c: "#ec4899", n: "pink"},
        {c: "#06b6d4", n: "cyan"}, {c: "#84cc16", n: "lime"},
      ];

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="bs2-lvl">1</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="bs2-moves">0</div></div>
          <div class="score-cell"><div class="label">Best lvl</div><div class="val" id="bs2-best">1</div></div>
        </div>
        <div class="status info" id="bs2-status">Tap a tube to pick up its top ball, tap another to pour</div>
        <div class="center"><div class="bs2-rack" id="bs2-rack"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="bs2-new">🆕 New puzzle</button>
          <button class="btn btn-sm" id="bs2-restart">↻ Restart</button>
        </div>
        <p class="hint">Pour only onto the same color or an empty tube. Sort every color into its own tube!</p>
      `;

      const rack = root.querySelector("#bs2-rack");
      const statusEl = root.querySelector("#bs2-status");
      best = Storage.getBest("ballsort") || 1;

      const style = document.createElement("style");
      style.textContent = `
        .bs2-rack { display:flex; gap:12px; justify-content:center; align-items:flex-end; padding:18px 8px; flex-wrap:wrap; }
        .bs2-tube { width:44px; height:160px; border:3px solid #475569; border-top:none; border-radius:0 0 22px 22px;
                    position:relative; cursor:pointer; display:flex; flex-direction:column-reverse; align-items:center;
                    background:rgba(255,255,255,0.06); transition:transform .12s; }
        .bs2-tube:hover { transform:translateY(-4px); }
        .bs2-tube.sel { border-color:#fbbf24; box-shadow:0 0 12px rgba(251,191,36,0.5); transform:translateY(-8px); }
        .bs2-ball { width:34px; height:34px; border-radius:50%; margin:2px 0; position:relative; }
      `;
      root.appendChild(style);

      function generate(lvl) {
        // difficulty: 3 colors + 2 empties at level 1, +1 color every level (max 8)
        const nColors = Math.min(COLORS.length, 2 + lvl);
        tubes = [];
        const balls = [];
        for (let i = 0; i < nColors; i++) for (let k = 0; k < CAP; k++) balls.push(i);
        // reverse-shuffle: start solved, do random valid reverse pours so it's always solvable
        tubes = Array.from({length: nColors}, (_, i) => Array(CAP).fill(i));
        tubes.push([], []);
        // scramble: repeatedly move random runs between tubes (any move is reversible)
        for (let s = 0; s < 60 + lvl * 20; s++) {
          const from = Math.floor(Math.random() * tubes.length);
          if (!tubes[from].length) continue;
          let to = Math.floor(Math.random() * tubes.length);
          if (to === from) continue;
          if (tubes[to].length >= CAP) continue;
          if (tubes[to].length && tubes[to][tubes[to].length - 1] !== tubes[from][tubes[from].length - 1]) continue;
          tubes[to].push(tubes[from].pop());
        }
        // ensure not already solved
        if (isSolved()) return generate(lvl);
        level = lvl;
        moves = 0;
        selected = null;
        won = false;
        updateHud();
        statusEl.textContent = `${nColors} colors to sort — good luck!`;
        statusEl.className = "status info";
      }

      function isSolved() {
        return tubes.every(t => t.length === 0 || (t.length === CAP && t.every(b => b === t[0])));
      }

      function updateHud() {
        root.querySelector("#bs2-lvl").textContent = level;
        root.querySelector("#bs2-moves").textContent = moves;
        root.querySelector("#bs2-best").textContent = best;
      }

      function render() {
        rack.innerHTML = "";
        tubes.forEach((t, i) => {
          const el = document.createElement("div");
          el.className = "bs2-tube" + (selected === i ? " sel" : "");
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", "Tube " + (i + 1));
          t.forEach(b => {
            const ball = document.createElement("div");
            ball.className = "bs2-ball";
            ball.style.background = COLORS[b].c;
            ball.style.boxShadow = "inset -4px -6px 8px rgba(0,0,0,0.35), inset 3px 4px 6px rgba(255,255,255,0.35)";
            el.appendChild(ball);
          });
          el.addEventListener("pointerdown", () => tap(i));
          rack.appendChild(el);
        });
      }

      function tap(i) {
        if (won) return;
        if (selected === null) {
          if (!tubes[i].length) {
            AudioFX.error();
            return;
          }
          selected = i;
          AudioFX.click();
        } else if (selected === i) {
          selected = null;
        } else {
          const from = tubes[selected], to = tubes[i];
          const ball = from[from.length - 1];
          const ok = !to.length || (to.length < CAP && to[to.length - 1] === ball);
          if (ok) {
            // pour the whole run of same-colored balls
            while (from.length && from[from.length - 1] === ball && to.length < CAP) {
              to.push(from.pop());
            }
            moves++;
            AudioFX.pop();
            selected = null;
            if (isSolved()) {
              won = true;
              AudioFX.win();
              if (level + 1 > best) {
                best = level + 1;
                Storage.setBest("ballsort", best);
              }
              statusEl.textContent = `🎉 Sorted in ${moves} moves! Starting level ${level + 1}…`;
              statusEl.className = "status win";
              after(() => generate(level + 1), 1200);
            }
          } else {
            AudioFX.error();
            selected = null;
          }
        }
        updateHud();
        render();
      }

      root.querySelector("#bs2-new").addEventListener("click", () => generate(1 + Math.floor(Math.random() * 3)));
      root.querySelector("#bs2-restart").addEventListener("click", () => generate(level));

      generate(1);
      render();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Ball Sort",
        `Tap a tube to lift its top ball, then tap another tube to pour. You can only pour onto:
        <br>• an <b>empty</b> tube, or
        <br>• a ball of the <b>same color</b>.
        <br><br>A whole run of same-colored balls pours at once. Sort every color into its own full tube to win
        and advance — each level adds one more color (up to 8). Every puzzle is guaranteed solvable.`);
    },
  });
})();
