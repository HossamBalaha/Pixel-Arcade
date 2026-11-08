/* knightstour — guide the knight to visit every square exactly once. */
(function () {
  "use strict";
  const MOVES = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  GameRegistry.register({
    id: "knightstour", name: "Knight's Tour", icon: "♞", category: "logic",
    description: "Visit every square exactly once with chess-knight moves", tags: ["chess", "logic", "classic"],
    age: ["teens", "adults"], difficulty: "hard", duration: "medium", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      let N = 5, visited, pos, steps, over;

      function reset() {
        N = 5;
        visited = Array.from({length: N}, () => Array(N).fill(false));
        pos = [Math.floor(N / 2), Math.floor(N / 2)];
        visited[pos[0]][pos[1]] = true;
        steps = 1;
        over = false;
        setStatus("Tap a highlighted square — visit all " + (N * N) + "!");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#kt-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function moves(r, c) {
        const out = [];
        for (const [dr, dc] of MOVES) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < N && nc >= 0 && nc < N && !visited[nr][nc]) out.push([nr, nc]);
        }
        return out;
      }

      function clickCell(r, c) {
        if (over) return;
        if (!moves(pos[0], pos[1]).some(([a, b]) => a === r && b === c)) {
          if (!visited[r][c]) App.toast("A knight can't reach that square", "warning");
          return;
        }
        pos = [r, c];
        visited[r][c] = true;
        steps++;
        AudioFX.pop();
        if (steps === N * N) {
          over = true;
          setStatus("🎉 Full tour — every square visited!", "win");
          AudioFX.win();
          App.recordResult(true, steps);
          if (N < 8) {
            setTimeout(() => {
              if (!alive) return;
              N += 1; // next size up
              visited = Array.from({length: N}, () => Array(N).fill(false));
              pos = [Math.floor(N / 2), Math.floor(N / 2)];
              visited[pos[0]][pos[1]] = true;
              steps = 1;
              over = false;
              setStatus("Bigger board! Visit all " + (N * N) + " squares.");
              render();
            }, 1800);
          }
          render();
          return;
        }
        if (!moves(r, c).length) {
          over = true;
          setStatus(`💀 Stranded at step ${steps}/${N * N}. Try again!`, "lose");
          AudioFX.lose();
          App.recordResult(false, steps);
        }
        render();
      }

      root.innerHTML = `
        <style>
          #kt-grid { display: grid; margin: 8px auto; width: max-content; }
          .kt-cell { width: 44px; height: 44px; display: grid; place-items: center; font-size: .8rem; font-weight: 700; }
          .kt-light { background: #e8e0cc; color: #333; }
          .kt-dark { background: #9a7b4f; color: #fff; }
          .kt-cell.done { opacity: .45; }
          .kt-cell.tgt { cursor: pointer; box-shadow: inset 0 0 0 3px #22c55e; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Board</div><div class="val" id="kt-n">5×5</div></div>
          <div class="score-cell"><div class="label">Visited</div><div class="val" id="kt-s">1/25</div></div>
        </div>
        <div class="status info" id="kt-status"></div>
        <div id="kt-grid"></div>
        <div class="row" style="justify-content:center;"><button class="btn" id="kt-new">↺ Restart</button></div>
      `;

      function render() {
        const el = root.querySelector("#kt-grid");
        if (!el) return;
        el.style.gridTemplateColumns = `repeat(${N}, 44px)`;
        const tg = moves(pos[0], pos[1]);
        let h = "";
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const shade = (r + c) % 2 === 0 ? "kt-light" : "kt-dark";
          const done = visited[r][c] ? " done" : "";
          const tgt = tg.some(([a, b]) => a === r && b === c) ? " tgt" : "";
          const inner = pos[0] === r && pos[1] === c ? "♞" : "";
          h += `<div class="kt-cell ${shade}${done}${tgt}" data-r="${r}" data-c="${c}">${inner}</div>`;
        }
        el.innerHTML = h;
        const n = root.querySelector("#kt-n"), s = root.querySelector("#kt-s");
        if (n) n.textContent = `${N}×${N}`;
        if (s) s.textContent = `${steps}/${N * N}`;
      }

      root.querySelector("#kt-grid").addEventListener("click", e => {
        const c = e.target.closest("[data-r]");
        if (c) clickCell(+c.dataset.r, +c.dataset.c);
      });
      root.querySelector("#kt-new").addEventListener("click", () => {
        AudioFX.click();
        reset();
      });

      reset();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Knight's Tour",
        "Move the knight ♞ like in chess: two squares one way, one square sideways (an L-shape)." +
        "<br>Visit <b>every square exactly once</b> — highlighted cells are your legal moves." +
        "<br>Clear the 5×5 board to unlock a bigger one. The classic puzzle dates back to Euler!");
    },
  });
})();
