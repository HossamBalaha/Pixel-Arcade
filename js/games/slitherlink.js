/* Slitherlink — draw a single closed loop. Each clue says how many of its 4 edges are part of the loop. */
(function () {
  // 4×4 grid of clues (-1 = no clue). Loop runs on edges between dots.
  const PUZZLES = [
    {
      clues: [[2, 3, 2, -1], [3, -1, 3, 2], [2, 3, -1, 3], [-1, 2, 3, 2]],
    },
    {
      clues: [[3, 0, -1, 2], [-1, -1, 3, -1], [2, 3, -1, 3], [2, -1, 2, -1]],
    },
  ];
  const N = 4; // N×N clues; (N+1)×(N+1) dots; edges in 2 directions.

  let live = null;
  GameRegistry.register({
    id: "slitherlink",
    name: "Slitherlink",
    icon: "🔄",
    category: "logic",
    description: "Draw a single closed loop matching the number clues",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null;
      // edges: object keyed by "r1,c1,r2,c2" → 0 (none), 1 (on), 2 (off)
      let edges = {};
      let over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Edges</div><div class="val" id="sl-edges">0</div></div>
          <div class="score-cell"><div class="label">Conflicts</div><div class="val" id="sl-conflicts">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sl-best">—</div></div>
        </div>
        <div class="status info" id="sl-status">Click an edge to toggle it on. Form a single closed loop matching the clues.</div>
        <div class="center" style="margin:14px 0;"><svg id="sl-svg" viewBox="0 0 260 260" style="max-width:380px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);"></svg></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="sl-clear">Clear</button>
          <button class="btn primary" id="sl-check">Check</button>
        </div>
        <p class="hint">Click an <b>edge</b> between two dots to add it to the loop (click again to remove). Each clue (0-3) counts how many of its 4 surrounding edges are part of the loop. The loop must be a single closed shape.</p>
      `;
      const statusEl = root.querySelector("#sl-status");
      const svgEl = root.querySelector("#sl-svg");
      const CELL = 50, PAD = 20;

      function dotPos(r, c) {
        return [PAD + c * CELL, PAD + r * CELL];
      }

      function edgeKey(r1, c1, r2, c2) {
        return `${r1},${c1},${r2},${c2}`;
      }

      function isHorizontalEdge(r1, c1, r2, c2) {
        return r1 === r2;
      }

      function render() {
        svgEl.innerHTML = "";
        // Draw grid dots + clue cells
        for (let r = 0; r <= N; r++) {
          for (let c = 0; c <= N; c++) {
            const [x, y] = dotPos(r, c);
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", x);
            dot.setAttribute("cy", y);
            dot.setAttribute("r", 3);
            dot.setAttribute("fill", "var(--text)");
            svgEl.appendChild(dot);
          }
        }
        // Clue numbers in cells
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const v = puzzle.clues[r][c];
            if (v < 0) continue;
            const [x, y] = dotPos(r, c);
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", x + CELL / 2);
            txt.setAttribute("y", y + CELL / 2 + 5);
            txt.setAttribute("text-anchor", "middle");
            txt.setAttribute("fill", "var(--text-muted)");
            txt.setAttribute("font-family", "var(--font-mono)");
            txt.setAttribute("font-size", "16");
            txt.textContent = v;
            svgEl.appendChild(txt);
          }
        }
        // Edges — draw all clickable edges
        const drawEdge = (r1, c1, r2, c2) => {
          const k = edgeKey(r1, c1, r2, c2);
          const [x1, y1] = dotPos(r1, c1);
          const [x2, y2] = dotPos(r2, c2);
          // Hit area (transparent, wider)
          const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hit.setAttribute("x1", x1);
          hit.setAttribute("y1", y1);
          hit.setAttribute("x2", x2);
          hit.setAttribute("y2", y2);
          hit.setAttribute("stroke", "transparent");
          hit.setAttribute("stroke-width", "18");
          hit.style.cursor = "pointer";
          hit.addEventListener("click", () => {
            if (over) return;
            const cur = edges[k] || 0;
            edges[k] = (cur + 1) % 2;
            AudioFX.tick();
            render();
          });
          svgEl.appendChild(hit);
          // Visible edge if on
          if (edges[k] === 1) {
            const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
            ln.setAttribute("x1", x1);
            ln.setAttribute("y1", y1);
            ln.setAttribute("x2", x2);
            ln.setAttribute("y2", y2);
            ln.setAttribute("stroke", "var(--accent)");
            ln.setAttribute("stroke-width", "3");
            ln.setAttribute("stroke-linecap", "round");
            svgEl.appendChild(ln);
          }
        };
        for (let r = 0; r <= N; r++) {
          for (let c = 0; c <= N; c++) {
            if (c < N) drawEdge(r, c, r, c + 1); // horizontal
            if (r < N) drawEdge(r, c, r + 1, c); // vertical
          }
        }
        // Count + conflicts
        const onEdges = Object.values(edges).filter(v => v === 1).length;
        root.querySelector("#sl-edges").textContent = onEdges;
        // Check clue counts
        let conflicts = 0;
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const v = puzzle.clues[r][c];
            if (v < 0) continue;
            // 4 edges around cell (r,c)
            const around = [
              edgeKey(r, c, r, c + 1),     // top
              edgeKey(r + 1, c, r + 1, c + 1), // bottom
              edgeKey(r, c, r + 1, c),     // left
              edgeKey(r, c + 1, r + 1, c + 1), // right
            ];
            const count = around.filter(k => edges[k] === 1).length;
            if (count !== v) conflicts++;
          }
        }
        root.querySelector("#sl-conflicts").textContent = conflicts;
      }

      function check() {
        // Verify all clue counts match
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = puzzle.clues[r][c];
          if (v < 0) continue;
          const around = [edgeKey(r, c, r, c + 1), edgeKey(r + 1, c, r + 1, c + 1), edgeKey(r, c, r + 1, c), edgeKey(r, c + 1, r + 1, c + 1)];
          const count = around.filter(k => edges[k] === 1).length;
          if (count !== v) {
            AudioFX.error();
            statusEl.textContent = `Cell (${r + 1},${c + 1}) should have ${v} edges, has ${count}`;
            statusEl.className = "status lose";
            return;
          }
        }
        // Verify single closed loop: every "on" dot has exactly 2 edges
        const dotDegrees = {};
        Object.entries(edges).forEach(([k, v]) => {
          if (v !== 1) return;
          const [r1, c1, r2, c2] = k.split(",").map(Number);
          const d1 = `${r1},${c1}`, d2 = `${r2},${c2}`;
          dotDegrees[d1] = (dotDegrees[d1] || 0) + 1;
          dotDegrees[d2] = (dotDegrees[d2] || 0) + 1;
        });
        const badDots = Object.entries(dotDegrees).filter(([k, d]) => d !== 2);
        if (badDots.length > 0) {
          AudioFX.error();
          statusEl.textContent = `${badDots.length} dots don't have exactly 2 edges`;
          statusEl.className = "status lose";
          return;
        }
        // Verify single connected loop (BFS from any on-dot)
        const onDots = Object.keys(dotDegrees);
        if (onDots.length === 0) {
          AudioFX.error();
          statusEl.textContent = "Draw something first";
          statusEl.className = "status lose";
          return;
        }
        const visited = new Set([onDots[0]]);
        const queue = [onDots[0]];
        while (queue.length) {
          const d = queue.shift();
          const [r, c] = d.split(",").map(Number);
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nr = r + dr, nc = c + dc;
            const k = dr === -1 ? edgeKey(nr, nc, r, c) : dr === 1 ? edgeKey(r, c, nr, nc) : dc === -1 ? edgeKey(r, nc, r, c) : edgeKey(r, c, r, nc);
            if (edges[k] === 1) {
              const nd = `${nr},${nc}`;
              if (!visited.has(nd)) {
                visited.add(nd);
                queue.push(nd);
              }
            }
          }
        }
        if (visited.size !== onDots.length) {
          AudioFX.error();
          statusEl.textContent = "Loop is not connected";
          statusEl.className = "status lose";
          return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("slitherlink");
        if (!best || 100 > best) {
          Storage.setBest("slitherlink", 100);
          root.querySelector("#sl-best").textContent = 100;
        }
      }

      root.querySelector("#sl-check").addEventListener("click", check);
      root.querySelector("#sl-clear").addEventListener("click", () => {
        if (over) return;
        edges = {};
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        edges = {};
        over = false;
        const best = Storage.getBest("slitherlink");
        root.querySelector("#sl-best").textContent = best || "—";
        statusEl.textContent = "Click an edge to toggle it on. Form a single closed loop matching the clues.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (over) return;
          App.showModal("Slitherlink", "Try this puzzle — solution revealing is complex. Use the Check button to validate your loop.");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Slitherlink",
        `Draw a single closed loop along the edges of the grid.
        <br><br>Each number in a cell tells you how many of its 4 surrounding edges are part of the loop. Blank cells have no constraint.
        <br><br>The loop must be <b>one continuous closed curve</b> — every dot on the loop has exactly 2 edges, and you can walk the whole thing without lifting your finger.
        <br><br>Click an edge to toggle it. Use <b>Check</b> to validate.`);
    },
  });
})();
