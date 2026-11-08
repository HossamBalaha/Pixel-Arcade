/* robotmaze — program a robot: queue moves, run the program, reach the goal. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "robotmaze", name: "Robot Programmer", icon: "🤖", category: "logic",
    description: "Write a move program and send the robot to its charger", tags: ["logic", "programming", "maze"],
    age: ["kids", "teens", "adults"], difficulty: "medium", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let level = 0, prog = [], running = false, runTimer = null;
      let grid, robot, goal, stepsUsed = 0;

      const LEVELS = [
        {w: 5, h: 4, walls: [[1, 1], [2, 1], [3, 1]], robot: [0, 0], goal: [4, 3]},
        {w: 6, h: 4, walls: [[1, 0], [1, 1], [3, 2], [3, 3], [4, 1]], robot: [0, 3], goal: [5, 0]},
        {w: 6, h: 5, walls: [[1, 1], [2, 1], [4, 1], [4, 2], [4, 3], [1, 3], [2, 3]], robot: [0, 0], goal: [5, 4]},
        {
          w: 7,
          h: 5,
          walls: [[1, 0], [1, 1], [3, 1], [3, 2], [5, 2], [5, 3], [2, 3], [2, 4]],
          robot: [0, 4],
          goal: [6, 0]
        },
      ];

      function loadLevel() {
        const L = LEVELS[level];
        grid = Array.from({length: L.h}, () => Array(L.w).fill(0));
        for (const [r, c] of L.walls) grid[r][c] = 1;
        robot = L.robot.slice();
        goal = L.goal.slice();
        prog = [];
        stepsUsed = 0;
        running = false;
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#rm-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function wallAt(r, c) {
        return r < 0 || c < 0 || r >= grid.length || c >= grid[0].length || grid[r][c] === 1;
      }

      function addCmd(d) {
        if (running) return;
        prog.push(d);
        AudioFX.click();
        render();
      }

      function run() {
        if (running || !prog.length) return;
        running = true;
        let i = 0;
        setStatus("Running program…");
        runTimer = setInterval(() => {
          if (!alive) {
            clearInterval(runTimer);
            return;
          }
          if (i >= prog.length) {
            clearInterval(runTimer);
            running = false;
            setStatus("Program finished — the robot didn't reach the charger. Edit and re-run!", "");
            AudioFX.error();
            render();
            return;
          }
          const d = prog[i++];
          const [dr, dc] = {u: [-1, 0], d: [1, 0], l: [0, -1], r: [0, 1]}[d];
          const nr = robot[0] + dr, nc = robot[1] + dc;
          if (!wallAt(nr, nc)) {
            robot = [nr, nc];
            stepsUsed++;
          }
          if (robot[0] === goal[0] && robot[1] === goal[1]) {
            clearInterval(runTimer);
            running = false;
            AudioFX.win();
            if (level < LEVELS.length - 1) {
              level++;
              setStatus(`🎉 Charged! Next level — ${level + 1}/${LEVELS.length}`, "win");
              App.recordResult(true, level);
              setTimeout(() => {
                if (alive) loadLevel();
              }, 1500);
            } else {
              setStatus("🏁 All robots charged — you win!", "win");
              App.recordResult(true, level + 1);
            }
            render();
            return;
          }
          render();
        }, 380);
      }

      function reset() {
        clearInterval(runTimer);
        loadLevel();
        setStatus("Cleared. Write a new program!");
      }

      root.innerHTML = `
        <style>
          #rm-grid { display: grid; margin: 8px auto; width: max-content; }
          .rm-cell { width: 44px; height: 44px; background: var(--bg-elev); border: 1px solid var(--border); display: grid; place-items: center; font-size: 1.2rem; }
          .rm-cell.wall { background: #334155; }
          .rm-prog { min-height: 2.4rem; display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap; margin: 8px 0; }
          .rm-cmd { padding: 6px 10px; border-radius: 8px; background: var(--bg-elev); border: 1px solid var(--border); font-weight: 800; cursor: pointer; }
          .rm-keys { display: grid; grid-template-columns: repeat(3, 46px); gap: 6px; justify-content: center; margin: 8px 0; }
          .rm-keys .btn { aspect-ratio: 1; font-size: 1.2rem; padding: 0; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Level</div><div class="val" id="rm-lv">1/4</div></div>
          <div class="score-cell"><div class="label">Program</div><div class="val" id="rm-pl">0</div></div>
        </div>
        <div class="status info" id="rm-status">Build a program, then press ▶ Run.</div>
        <div id="rm-grid"></div>
        <div class="rm-prog" id="rm-prog"></div>
        <div class="rm-keys">
          <span></span><button class="btn" data-d="u" title="up">▲</button><span></span>
          <button class="btn" data-d="l" title="left">◀</button>
          <button class="btn primary" id="rm-run" title="run">▶</button>
          <button class="btn" data-d="r" title="right">▶</button>
          <span></span><button class="btn" data-d="d" title="down">▼</button>
          <button class="btn" id="rm-clr" title="clear program">✕</button>
        </div>
      `;

      function render() {
        const el = root.querySelector("#rm-grid");
        const L = LEVELS[level];
        el.style.gridTemplateColumns = `repeat(${L.w}, 44px)`;
        let h = "";
        for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
          let cls = "rm-cell" + (grid[r][c] ? " wall" : "");
          let inner = "";
          if (robot[0] === r && robot[1] === c) inner = "🤖";
          else if (goal[0] === r && goal[1] === c) inner = "🔌";
          h += `<div class="${cls}">${inner}</div>`;
        }
        el.innerHTML = h;
        const pr = root.querySelector("#rm-prog");
        pr.innerHTML = prog.map((d, i) =>
          `<span class="rm-cmd" data-i="${i}">${{
            u: "▲",
            d: "▼",
            l: "◀",
            r: "▶"
          }[d]}</span>`).join("") || "<span style='opacity:.5'>empty program</span>";
        const lv = root.querySelector("#rm-lv"), pl = root.querySelector("#rm-pl");
        if (lv) lv.textContent = `${level + 1}/${LEVELS.length}`;
        if (pl) pl.textContent = prog.length;
      }

      root.querySelector(".rm-keys").addEventListener("click", e => {
        const b = e.target.closest("[data-d]");
        if (b) addCmd(b.dataset.d);
      });
      root.querySelector("#rm-prog").addEventListener("click", e => {
        const c = e.target.closest("[data-i]");
        if (c && !running) {
          prog.splice(+c.dataset.i, 1);
          AudioFX.click();
          render();
        }
      });
      root.querySelector("#rm-run").addEventListener("click", run);
      root.querySelector("#rm-clr").addEventListener("click", () => {
        if (!running) {
          prog = [];
          AudioFX.click();
          render();
        }
      });

      loadLevel();
      return function cleanup() {
        alive = false;
        clearInterval(runTimer);
      };
    },
    help: function () {
      App.showModal("How to play Robot Programmer",
        "The robot only obeys programs — it can't be steered live." +
        "<br>Build a sequence with ▲ ◀ ▶ ▼ (tap a command in the program to delete it), then press <b>▶ Run</b>." +
        "<br>Guide 🤖 around the walls to the charger 🔌. Walls just block it (no crashing) — if the program ends early, edit and re-run.");
    },
  });
})();
