/* Sokoban — push every crate onto a target spot */
(function () {
  GameRegistry.register({
    id: "sokoban",
    name: "Sokoban",
    icon: "📦",
    category: "logic",
    description: "Push every crate onto a target spot — no pulling!",
    tags: ["logic", "classic", "puzzle"],
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
      // Hand-authored levels. # wall, @ player, $ box, . target, * box-on-target, + player-on-target
      const LEVELS = [
        {
          name: "First Steps", map: [
            "########",
            "#      #",
            "# .$@  #",
            "#      #",
            "########",
          ]
        },
        {
          name: "Two Boxes", map: [
            "##########",
            "#        #",
            "#  $  $  #",
            "#  .. .. #",
            "#   @    #",
            "##########",
          ]
        },
        {
          name: "Corner Pocket", map: [
            "#########",
            "#   #   #",
            "# $   $ #",
            "#.  @  .#",
            "#   #   #",
            "#########",
          ]
        },
        {
          name: "The Corridor", map: [
            "###########",
            "#.   #    #",
            "# $  # $  #",
            "#  $ @  ..#",
            "#    #    #",
            "###########",
          ]
        },
        {
          name: "Crossroads", map: [
            "###########",
            "#    .    #",
            "#  $# $   #",
            "# . @   $ #",
            "#    #   .#",
            "##  #######",
            "###########",
          ]
        },
        {
          name: "Warehouse", map: [
            "############",
            "#..  #     #",
            "#**  # $   #",
            "#..  $  $  #",
            "#  $  @    #",
            "#    #     #",
            "############",
          ]
        },
        {
          name: "The Vault", map: [
            "##########",
            "#        #",
            "# $$  $$ #",
            "# #@  .. #",
            "# ..     #",
            "#   $$   #",
            "##########",
          ]
        },
        {
          name: "Grand Finale", map: [
            "############",
            "#   ...    #",
            "#  $$$$    #",
            "#    @     #",
            "#  $    $  #",
            "#  .    .  #",
            "############",
          ]
        },
      ];
      let level, moves, pushes, grid, won, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="so-lvl">1/8</div></div>
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="so-moves">0</div></div>
          <div class="score-cell"><div class="label">Cleared</div><div class="val" id="so-best">0</div></div>
        </div>
        <div class="status info" id="so-status">Arrow keys / WASD to push the crates onto the dots</div>
        <div class="center"><div class="board" id="so-board"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="so-undo">↩ Undo</button>
          <button class="btn btn-sm" id="so-restart">↻ Restart level</button>
          <button class="btn btn-sm" id="so-prev">← Prev</button>
          <button class="btn btn-sm" id="so-next">Skip →</button>
        </div>
        <p class="hint">You can only PUSH crates — plan ahead, a crate in a corner is stuck!</p>
      `;

      const boardEl = root.querySelector("#so-board");
      const statusEl = root.querySelector("#so-status");
      best = Storage.getBest("sokoban") || 0;
      let history = [];

      function load(i) {
        level = i;
        const L = LEVELS[i];
        grid = L.map.map(r => r.split(""));
        moves = 0;
        pushes = 0;
        won = false;
        history = [];
        statusEl.textContent = `Level ${i + 1}: “${L.name}” — push all crates onto targets`;
        statusEl.className = "status info";
        render();
      }

      function render() {
        root.querySelector("#so-lvl").textContent = (level + 1) + "/" + LEVELS.length;
        root.querySelector("#so-moves").textContent = moves;
        root.querySelector("#so-best").textContent = best;
        boardEl.innerHTML = "";
        const rows = grid.length, cols = grid[0].length;
        boardEl.style.gridTemplateColumns = `repeat(${cols}, 34px)`;
        boardEl.style.display = "inline-grid";
        boardEl.style.gap = "2px";
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const c = document.createElement("div");
            c.style.cssText = "width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:19px;border-radius:5px;";
            const ch = grid[y][x];
            const isWall = ch === "#";
            const isTarget = ch === "." || ch === "*" || ch === "+";
            const isBox = ch === "$" || ch === "*";
            const isPlayer = ch === "@" || ch === "+";
            c.style.background = isWall ? "var(--bg-inset,#1f2937)" : isTarget ? "rgba(52,211,153,0.16)" : "var(--bg-soft,#f1f5f9)";
            if (isWall) {
              c.textContent = "🧱";
              c.style.fontSize = "15px";
            }
            if (isTarget && !isBox && !isPlayer) {
              c.style.boxShadow = "inset 0 0 0 3px rgba(52,211,153,0.65)";
              c.style.borderRadius = "50%";
            }
            if (isBox) {
              c.textContent = ch === "*" ? "✅" : "📦";
            }
            if (isPlayer) c.textContent = "🧑";
            boardEl.appendChild(c);
          }
        }
      }

      function move(dx, dy) {
        if (won) return;
        let px, py;
        grid.forEach((r, y) => r.forEach((c, x) => {
          if (c === "@" || c === "+") {
            px = x;
            py = y;
          }
        }));
        const nx = px + dx, ny = py + dy;
        const t = (x, y) => grid[y] && grid[y][x];
        const dest = t(nx, ny);
        if (dest === "#") return;
        if (dest === "$" || dest === "*") {
          const bx = nx + dx, by = ny + dy;
          const bdest = t(bx, by);
          if (bdest === "#" || bdest === "$" || bdest === "*") return;
          history.push(JSON.stringify(grid));
          grid[by][bx] = bdest === "." ? "*" : "$";
          grid[ny][nx] = dest === "*" ? "." : " ";
          grid[py][px] = grid[py][px] === "+" ? "." : " ";
          grid[py][px] = " "; // player leaves (if on target handled above)
          grid[ny][nx] = dest === "*" ? "+" : "@";
          pushes++;
          moves++;
          AudioFX.click();
        } else if (dest === " " || dest === "." || dest === "+") {
          history.push(JSON.stringify(grid));
          grid[py][px] = grid[py][px] === "+" ? "." : " ";
          grid[ny][nx] = dest === "." ? "+" : "@";
          moves++;
        } else return;
        render();
        checkWin();
      }

      function checkWin() {
        const boxesLeft = grid.flat().filter(c => c === "$").length;
        if (boxesLeft === 0 && grid.flat().some(c => c === "*")) {
          won = true;
          AudioFX.win();
          App.toast(`Level ${level + 1} cleared in ${moves} moves!`, "success");
          if (level + 1 > best) {
            best = level + 1;
            Storage.setBest("sokoban", best);
          }
          after(() => {
            if (level + 1 < LEVELS.length) load(level + 1);
            else {
              statusEl.textContent = "🏆 All levels cleared — you are the warehouse master!";
              statusEl.className = "status win";
            }
          }, 800);
        }
      }

      const onKey = (e) => {
        const k = e.key.toLowerCase();
        const m = {
          arrowup: [0, -1],
          w: [0, -1],
          arrowdown: [0, 1],
          s: [0, 1],
          arrowleft: [-1, 0],
          a: [-1, 0],
          arrowright: [1, 0],
          d: [1, 0]
        };
        if (m[k]) {
          e.preventDefault();
          move(m[k][0], m[k][1]);
        }
        if (k === "u") undo();
        if (k === "r") load(level);
      };

      function undo() {
        if (!history.length) return;
        grid = JSON.parse(history.pop());
        moves = Math.max(0, moves - 1);
        render();
      }

      document.addEventListener("keydown", onKey);
      root.querySelector("#so-undo").addEventListener("click", undo);
      root.querySelector("#so-restart").addEventListener("click", () => load(level));
      root.querySelector("#so-prev").addEventListener("click", () => load(Math.max(0, level - 1)));
      root.querySelector("#so-next").addEventListener("click", () => load(Math.min(LEVELS.length - 1, level + 1)));
      // swipe support
      let ts = null;
      boardEl.addEventListener("pointerdown", (e) => ts = {x: e.clientX, y: e.clientY});
      boardEl.addEventListener("pointerup", (e) => {
        if (!ts) return;
        const dx = e.clientX - ts.x, dy = e.clientY - ts.y;
        if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
          if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0); else move(0, Math.sign(dy));
        }
        ts = null;
      });

      load(0);
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play Sokoban",
        `Move with arrow keys / WASD (or swipe) and <b>push</b> every 📦 crate onto a green target dot.
        <br><br>You can only push — never pull — and only one crate at a time. A crate pushed into a corner can never leave,
        so think before you shove. <b>U</b> / Undo rewinds one move; <b>R</b> restarts the level.
        Eight hand-crafted levels from gentle to grand.`);
    },
  });
})();
