/* Tower of Hanoi (3 discs) — easy version for kids: move 3 discs from peg 1 to peg 3. */
(function () {
  const N = 3;
  let live = null;

  function buildSolution(n, from, to, via, out) {
    if (n === 0) return;
    buildSolution(n - 1, from, via, to, out);
    out.push([from, to]);
    buildSolution(n - 1, via, to, from, out);
  }

  const COLORS = ["#ef4444", "#f97316", "#eab308"];

  GameRegistry.register({
    id: "towersofhanoi3",
    name: "Tower of Hanoi (3 Discs)",
    icon: "🗼",
    category: "logic",
    description: "Easy 3-disc Tower of Hanoi — perfect for beginners",
    tags: ["hanoi", "logic", "kids"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pegs, sel, moves, over, started, time, timerInt;
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
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="hn3-m">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="hn3-t">0s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hn3-best">—</div></div>
        </div>
        <div class="status info" id="hn3-status">Move all 3 discs to the right peg (min 7 moves).</div>
        <div class="center"><div id="hn3-game" style="position:relative;width:300px;height:160px;"></div></div>
        <p class="hint">Click a peg to lift its top disc, then click another peg to drop it. <b>R</b> = new game.</p>
      `;
      const gameEl = root.querySelector("#hn3-game");
      const statusEl = root.querySelector("#hn3-status");
      root.querySelector("#hn3-best").textContent = Storage.getBest("towersofhanoi3") ?? "—";

      function newGame() {
        pegs = [[3, 2, 1], [], []];
        sel = null;
        moves = 0;
        over = false;
        started = false;
        time = 0;
        clearInterval(timerInt);
        statusEl.textContent = "Move all 3 discs to the right peg (min 7 moves).";
        statusEl.className = "status info";
        render();
      }

      function render() {
        gameEl.innerHTML = "";
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "300");
        svg.setAttribute("height", "160");
        const base = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        base.setAttribute("x", "10");
        base.setAttribute("y", "144");
        base.setAttribute("width", "280");
        base.setAttribute("height", "6");
        base.setAttribute("fill", "var(--text)");
        svg.appendChild(base);
        for (let p = 0; p < 3; p++) {
          const cx = 56 + p * 94;
          const pole = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          pole.setAttribute("x", cx - 3);
          pole.setAttribute("y", "20");
          pole.setAttribute("width", "6");
          pole.setAttribute("height", "124");
          pole.setAttribute("fill", "var(--border)");
          pole.setAttribute("rx", "2");
          svg.appendChild(pole);
          if (sel === p) {
            const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            ring.setAttribute("x", cx - 42);
            ring.setAttribute("y", "10");
            ring.setAttribute("width", "84");
            ring.setAttribute("height", "140");
            ring.setAttribute("fill", "none");
            ring.setAttribute("stroke", "var(--warning)");
            ring.setAttribute("stroke-width", "3");
            ring.setAttribute("rx", "4");
            svg.appendChild(ring);
          }
          const clickArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          clickArea.setAttribute("x", cx - 42);
          clickArea.setAttribute("y", "10");
          clickArea.setAttribute("width", "84");
          clickArea.setAttribute("height", "140");
          clickArea.setAttribute("fill", "transparent");
          clickArea.style.cursor = "pointer";
          clickArea.addEventListener("click", () => onPeg(p));
          svg.appendChild(clickArea);
          for (let i = 0; i < pegs[p].length; i++) {
            const d = pegs[p][i];
            const w = 30 + d * 18;
            const dy = 138 - i * 24;
            const disk = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            disk.setAttribute("x", cx - w / 2);
            disk.setAttribute("y", dy);
            disk.setAttribute("width", w);
            disk.setAttribute("height", "20");
            disk.setAttribute("fill", COLORS[d - 1]);
            disk.setAttribute("rx", "4");
            disk.setAttribute("stroke", sel === p && i === pegs[p].length - 1 ? "var(--warning)" : "var(--border)");
            disk.setAttribute("stroke-width", sel === p && i === pegs[p].length - 1 ? "3" : "1");
            svg.appendChild(disk);
          }
        }
        gameEl.appendChild(svg);
        root.querySelector("#hn3-m").textContent = moves;
        root.querySelector("#hn3-t").textContent = time + "s";
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
        }
        pegs[p].push(from.pop());
        moves++;
        sel = null;
        AudioFX.place();
        if (pegs[2].length === N) {
          over = true;
          clearInterval(timerInt);
          statusEl.textContent = `🎉 Solved in ${moves} moves, ${time}s! (Min: 7)`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("towersofhanoi3");
          if (best === null || moves < best) {
            Storage.setBest("towersofhanoi3", moves);
            root.querySelector("#hn3-best").textContent = moves;
            App.toast("Solved in " + moves + " moves!", "success");
          }
        }
        render();
      }

      function onKey(e) {
        if (e.key === "r" || e.key === "R") newGame();
        else if (e.key === "1") onPeg(0);
        else if (e.key === "2") onPeg(1);
        else if (e.key === "3") onPeg(2);
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (over) return;
        const solution = [];
        buildSolution(N, 0, 2, 1, solution);
        // Find current state in the replay
        const states = [];
        let s0 = [[3, 2, 1], [], []];
        states.push(s0.map(p => p.slice()));
        for (const [f, t] of solution) {
          const next = states[states.length - 1].map(p => p.slice());
          next[t].push(next[f].pop());
          states.push(next);
        }
        for (let i = 0; i < states.length; i++) {
          const matches = states[i].every((pp, j) => pp.length === pegs[j].length && pp.every((v, k) => v === pegs[j][k]));
          if (matches && i < solution.length) {
            const m = solution[i];
            sel = m[0];
            AudioFX.reveal();
            render();
            App.toast(`Hint: move from peg ${m[0] + 1} to peg ${m[1] + 1}`, "info");
            return;
          }
        }
      }

      function doSolve() {
        if (over) return;
        const solution = [];
        buildSolution(N, 0, 2, 1, solution);
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time++;
            render();
          }, 1000);
        }
        let i = 0;
        const step = () => {
          if (i >= solution.length) {
            if (pegs[2].length === N) {
              over = true;
              clearInterval(timerInt);
              statusEl.textContent = `Auto-solved in ${moves} moves`;
              statusEl.className = "status win";
              AudioFX.win();
            }
            return;
          }
          const [f, t] = solution[i];
          i++;
          pegs[t].push(pegs[f].pop());
          moves++;
          AudioFX.tick();
          render();
          later(step, 400);
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
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Tower of Hanoi (3 Discs)",
        `Move all 3 discs from peg 1 (left) to peg 3 (right).
        <br><br>Rules: only one disc can be moved at a time, and a larger disc may never sit on a smaller one.
        <br><br>Click a peg to pick up its top disc, then click another peg to drop it. Minimum moves: <b>7</b>.`);
    },
  });
})();
