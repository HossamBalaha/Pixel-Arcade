/* Tower of Hanoi — 3 pegs, 5 disks. Move all from peg 1 to peg 3. Hint: next optimal move. Solve: auto-solve. */
(function () {
  const N = 5;
  let live = null;

  function buildSolution(n, from, to, via, out) {
    if (n === 0) return;
    buildSolution(n - 1, from, via, to, out);
    out.push([from, to]);
    buildSolution(n - 1, via, to, from, out);
  }

  GameRegistry.register({
    id: "hanoi",
    name: "Tower of Hanoi",
    icon: "🗼",
    category: "logic",
    description: "Move 5 disks from peg 1 to peg 3 — no disk may sit on a smaller one",
    tags: ["puzzle", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pegs, sel, moves, time, timerInt, over, started;
      const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4"];
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="hn-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="hn-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hn-best">-</div></div>
        </div>
        <div class="status info" id="hn-status">Move all 5 disks to the right peg</div>
        <div class="center"><div id="hn-game" style="position:relative;width:340px;height:200px;"></div></div>
        <p class="hint">Click a peg to pick up its top disk, then click another peg to drop. <b>R</b> reset.</p>
      `;
      const gameEl = root.querySelector("#hn-game");
      const statusEl = root.querySelector("#hn-status");
      root.querySelector("#hn-best").textContent = Storage.getBest("hanoi") ?? "-";

      function newGame() {
        pegs = [[], [], []];
        for (let d = N; d >= 1; d--) pegs[0].push(d);
        sel = null;
        moves = 0;
        time = 0;
        over = false;
        started = false;
        clearInterval(timerInt);
        statusEl.textContent = "Move all 5 disks to the right peg";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gameEl.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "340");
        svg.setAttribute("height", "200");
        // base
        const base = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        base.setAttribute("x", "10");
        base.setAttribute("y", "180");
        base.setAttribute("width", "320");
        base.setAttribute("height", "6");
        base.setAttribute("fill", "var(--text)");
        svg.appendChild(base);
        for (let p = 0; p < 3; p++) {
          const cx = 56 + p * 112;
          // pole
          const pole = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          pole.setAttribute("x", cx - 3);
          pole.setAttribute("y", "30");
          pole.setAttribute("width", "6");
          pole.setAttribute("height", "150");
          pole.setAttribute("fill", "var(--border-strong)");
          pole.setAttribute("rx", "2");
          svg.appendChild(pole);
          // peg click area
          const clickArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          clickArea.setAttribute("x", cx - 50);
          clickArea.setAttribute("y", "10");
          clickArea.setAttribute("width", "100");
          clickArea.setAttribute("height", "180");
          clickArea.setAttribute("fill", "transparent");
          clickArea.style.cursor = "pointer";
          clickArea.dataset.p = p;
          if (sel === p) {
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            ring.setAttribute("x", cx - 50);
            ring.setAttribute("y", "10");
            ring.setAttribute("width", "100");
            ring.setAttribute("height", "180");
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "var(--warning)");
            ring.setAttribute("stroke-width", "3");
            ring.setAttribute("rx", "4");
            svg.appendChild(ring);
          }
          clickArea.addEventListener("click", () => onPeg(p));
          svg.appendChild(clickArea);
          // disks
          for (let i = 0; i < pegs[p].length; i++) {
            const d = pegs[p][i];
            const w = 24 + d * 12;
            const dy = 174 - i * 18;
            const disk = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            disk.setAttribute("x", cx - w / 2);
            disk.setAttribute("y", dy);
            disk.setAttribute("width", w);
            disk.setAttribute("height", "16");
            disk.setAttribute("fill", COLORS[d - 1]);
            disk.setAttribute("rx", "3");
            disk.setAttribute("stroke", sel === p && i === pegs[p].length - 1 ? "var(--warning)" : "var(--border)");
            disk.setAttribute("stroke-width", sel === p && i === pegs[p].length - 1 ? "3" : "1");
            svg.appendChild(disk);
          }
        }
        gameEl.appendChild(svg);
        root.querySelector("#hn-m").textContent = moves;
        root.querySelector("#hn-t").textContent = time + "s";
      }

      function onPeg(p) {
        if (over) return;
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        if (sel === null) {
          if (!pegs[p].length) {
            AudioFX.error();
            return;
          }
          sel = p;
          AudioFX.click();
          render();
          return;
        }
        // move top of sel to p
        const from = pegs[sel];
        const top = from[from.length - 1];
        const toTop = pegs[p][pegs[p].length - 1];
        if (toTop && top > toTop) {
          AudioFX.error();
          sel = null;
          render();
          return;
        }
        if (sel === p) {
          sel = null;
          render();
          return;
        } // cancel
        pegs[p].push(from.pop());
        moves++;
        sel = null;
        AudioFX.place();
        if (pegs[2].length === N) {
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Solved in ${moves} moves, ${time}s! (Min: 31)`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("hanoi");
          if (best === null || moves < best) {
            Storage.setBest("hanoi", moves);
            App.toast("New best: " + moves + " moves", "success");
            root.querySelector("#hn-best").textContent = moves;
          }
        }
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
        else if (e.key === "1") onPeg(0); else if (e.key === "2") onPeg(1); else if (e.key === "3") onPeg(2);
      }

      document.addEventListener("keydown", onKey);

      function optimalNextMove() {
        // Build full solution from current state — too complex; we'll use recursive standard algo from start
        // Simple heuristic: solve by checking current state. For now we recompute optimal from scratch and pick based on phase.
        // Standard approach: determine next move in optimal sequence given current peg positions:
        // Find smallest disk not in place; move it via the standard "Mover" pattern.
        // We use an iterative approach: simulate optimal from current state.
        const solution = [];
        buildSolution(N, 0, 2, 1, solution);
        // Replay solution from current state to find first divergence
        let cur = pegs.map(p => p.slice());
        for (const [f, t] of solution) {
          // check if state matches; we want the first move from current state.
          // We just verify the move is valid from current cur
          const top = cur[f][cur[f].length - 1];
          const tt = cur[t][cur[t].length - 1];
          if (top && (!tt || top < tt)) return [f, t]; // first valid move
          cur[t].push(cur[f].pop());
        }
        return null;
      }

      function doHint() {
        if (over) return;
        // Better: compute next optimal move from scratch
        const m = computeNext();
        if (m) {
          sel = m[0];
          AudioFX.reveal();
          render();
          // highlight target
          const svg = gameEl.querySelector("svg");
          if (svg) {
            const cx = 56 + m[1] * 112;
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            ring.setAttribute("x", cx - 50);
            ring.setAttribute("y", "10");
            ring.setAttribute("width", "100");
            ring.setAttribute("height", "180");
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "var(--success)");
            ring.setAttribute("stroke-width", "3");
            ring.setAttribute("rx", "4");
            svg.appendChild(ring);
          }
          App.toast(`Hint: move from peg ${m[0] + 1} to peg ${m[1] + 1}`, "info");
        }
      }

      function computeNext() {
        // Simulate the optimal solution from start and find where current state matches; return the next move.
        const solution = [];
        buildSolution(N, 0, 2, 1, solution);
        const isStart = pegs[0].length === N && pegs[1].length === 0 && pegs[2].length === 0;
        if (isStart) return solution[0];
        // Build statesArray from solution by replaying from start state
        const states = [];
        let s0 = [[], [], []];
        for (let i = N; i >= 1; i--) s0[0].push(i);
        states.push(s0.map(p => p.slice()));
        for (const [f, t] of solution) {
          const next = states[states.length - 1].map(p => p.slice());
          next[t].push(next[f].pop());
          states.push(next);
        }
        for (let i = 0; i < states.length; i++) {
          const matches = states[i].every((p, j) => p.length === pegs[j].length && p.every((v, k) => v === pegs[j][k]));
          if (matches) return i < solution.length ? solution[i] : null;
        }
        return null;
      }

      function doSolve() {
        if (over) return;
        const solution = [];
        buildSolution(N, 0, 2, 1, solution);
        let cur = pegs.map(p => p.slice());
        // find current position in solution by replay
        let startIdx = 0;
        for (let i = 0; i < solution.length; i++) {
          const [f, t] = solution[i];
          const top = cur[f][cur[f].length - 1];
          if (!top) break;
          cur[t].push(cur[f].pop());
          // Check if pegs matches cur
          const matches = cur.every((p, j) => p.length === pegs[j].length && p.every((v, k) => v === pegs[j][k]));
          if (matches) {
            startIdx = i + 1;
            break;
          }
        }
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        let i = startIdx;
        const step = () => {
          if (i >= solution.length) {
            if (pegs[2].length === N) {
              over = true;
              clearInterval(timerInt);
              statusEl.textContent = `Auto-solved in ${moves} moves, ${time}s`;
              statusEl.className = "status win";
              AudioFX.win();
              const best = Storage.getBest("hanoi");
              if (best === null || moves < best) {
                Storage.setBest("hanoi", moves);
                root.querySelector("#hn-best").textContent = moves;
              }
            }
            return;
          }
          const [f, t] = solution[i];
          i++;
          pegs[t].push(pegs[f].pop());
          moves++;
          AudioFX.tick();
          render();
          later(step, 250);
        };
        step();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    solve: function () {
      if (live) live.solve();
    },
    help: function () {
      App.showModal("How to play Tower of Hanoi",
        `Move all 5 disks from peg 1 (left) to peg 3 (right).
        <br><br>Rules: only one disk can be moved at a time, and a larger disk may never sit on top of a smaller one.
        <br><br>Click a peg to pick up its top disk, then click another peg to drop it. Minimum moves needed: 31.
        <br><b>Hint</b> shows the next optimal move. <b>Solve</b> animates the full optimal solution.`);
    },
  });
})();
