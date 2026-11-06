/* Masyu — draw a single loop through all pearls. Black pearls: turn at pearl; white: go straight through. */
(function () {
  // 5×5 grid; cells contain: 0 = empty, 1 = white pearl, 2 = black pearl
  // Edges between cells (horizontal/vertical) can be toggled on/off
  const PUZZLES = [
    {
      size: 5,
      pearls: [[1, 1, "white"], [1, 3, "black"], [3, 1, "black"], [3, 3, "white"]],
    },
    {
      size: 5,
      pearls: [[0, 2, "white"], [2, 0, "black"], [2, 4, "white"], [4, 2, "black"]],
    },
  ];

  let live = null;
  GameRegistry.register({
    id: "masyu",
    name: "Masyu",
    icon: "⚪",
    category: "logic",
    description: "Draw a single loop through all pearls — follow the pearl rules",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, edges = {}, over = false;
      // edges keyed by "r,c,dir" where dir ∈ {N,S,E,W} but we store both directions

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Edges</div><div class="val" id="my-edges">0</div></div>
          <div class="score-cell"><div class="label">Violations</div><div class="val" id="my-violations">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="my-best">—</div></div>
        </div>
        <div class="status info" id="my-status">Click an edge between cells to add it to the loop.</div>
        <div class="center" style="margin:14px 0;"><svg id="my-svg" viewBox="0 0 280 280" style="max-width:380px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);"></svg></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="my-clear">Clear</button>
          <button class="btn primary" id="my-check">Check</button>
        </div>
        <p class="hint"><b>White pearl</b> ⚪: loop goes straight through, must turn at pearl or adjacent cell. <b>Black pearl</b> ⚫: loop must turn 90° at the pearl, then go straight at least one cell.</p>
      `;
      const statusEl = root.querySelector("#my-status");
      const svgEl = root.querySelector("#my-svg");
      const N = 5, CELL = 50, PAD = 15;

      function pos(r, c) {
        return [PAD + c * CELL + CELL / 2, PAD + r * CELL + CELL / 2];
      }

      function edgeKey(r1, c1, r2, c2) {
        return `${Math.min(r1, r2)},${Math.min(c1, c2)},${Math.max(r1, r2)},${Math.max(c1, c2)}`;
      }

      function isOn(r1, c1, r2, c2) {
        return edges[edgeKey(r1, c1, r2, c2)] === 1;
      }

      function render() {
        svgEl.innerHTML = "";
        // Cell grid (background)
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const [x, y] = pos(r, c);
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          rect.setAttribute("x", x - CELL / 2 + 2);
          rect.setAttribute("y", y - CELL / 2 + 2);
          rect.setAttribute("width", CELL - 4);
          rect.setAttribute("height", CELL - 4);
          rect.setAttribute("rx", 4);
          rect.setAttribute("fill", "var(--bg-soft)");
          rect.setAttribute("opacity", "0.5");
          svgEl.appendChild(rect);
        }
        // Edges
        const drawEdge = (r1, c1, r2, c2) => {
          const k = edgeKey(r1, c1, r2, c2);
          const [x1, y1] = pos(r1, c1);
          const [x2, y2] = pos(r2, c2);
          // Hit area
          const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hit.setAttribute("x1", x1);
          hit.setAttribute("y1", y1);
          hit.setAttribute("x2", x2);
          hit.setAttribute("y2", y2);
          hit.setAttribute("stroke", "transparent");
          hit.setAttribute("stroke-width", "20");
          hit.style.cursor = "pointer";
          hit.addEventListener("click", () => {
            if (over) return;
            const cur = edges[k] || 0;
            edges[k] = cur === 1 ? 0 : 1;
            AudioFX.tick();
            render();
          });
          svgEl.appendChild(hit);
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
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          if (c < N - 1) drawEdge(r, c, r, c + 1);
          if (r < N - 1) drawEdge(r, c, r + 1, c);
        }
        // Pearls
        puzzle.pearls.forEach(([r, c, type]) => {
          const [x, y] = pos(r, c);
          const pearl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          pearl.setAttribute("cx", x);
          pearl.setAttribute("cy", y);
          pearl.setAttribute("r", 12);
          pearl.setAttribute("fill", type === "white" ? "#fff" : "#000");
          pearl.setAttribute("stroke", "#000");
          pearl.setAttribute("stroke-width", "2");
          svgEl.appendChild(pearl);
        });
        // Count
        const onCount = Object.values(edges).filter(v => v === 1).length;
        root.querySelector("#my-edges").textContent = onCount;
        root.querySelector("#my-violations").textContent = violations().size;
      }

      function neighborEdges(r, c) {
        // Returns list of directions where there's an on-edge from this cell
        const out = [];
        if (r > 0 && isOn(r, c, r - 1, c)) out.push("N");
        if (r < N - 1 && isOn(r, c, r + 1, c)) out.push("S");
        if (c > 0 && isOn(r, c, r, c - 1)) out.push("W");
        if (c < N - 1 && isOn(r, c, r, c + 1)) out.push("E");
        return out;
      }

      function violations() {
        const v = new Set();
        // Each cell with edges must have 0 or 2 edges (loop constraint)
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const n = neighborEdges(r, c);
          if (n.length !== 0 && n.length !== 2) v.add(`cell-${r}-${c}`);
        }
        // Pearl constraints
        puzzle.pearls.forEach(([r, c, type]) => {
          const n = neighborEdges(r, c);
          if (n.length !== 2) {
            v.add(`pearl-${r}-${c}`);
            return;
          }
          const isStraight = (n.includes("N") && n.includes("S")) || (n.includes("E") && n.includes("W"));
          if (type === "white" && !isStraight) v.add(`pearl-${r}-${c}`); // white pearl: loop must go straight through
          if (type === "black" && isStraight) v.add(`pearl-${r}-${c}`); // black pearl: loop must turn
        });
        return v;
      }

      function check() {
        const v = violations();
        if (v.size > 0) {
          AudioFX.error();
          statusEl.textContent = `${v.size} violation${v.size === 1 ? "" : "s"}`;
          statusEl.className = "status lose";
          return;
        }
        // Check single loop (BFS)
        const onEdges = Object.entries(edges).filter(([k, v]) => v === 1).map(([k]) => k);
        if (onEdges.length === 0) {
          AudioFX.error();
          statusEl.textContent = "Draw something first";
          statusEl.className = "status lose";
          return;
        }
        // BFS from first edge
        const visited = new Set();
        const startKey = onEdges[0];
        const [r1, c1, r2, c2] = startKey.split(",").map(Number);
        const startCell = `${r1},${c1}`;
        visited.add(startCell);
        const queue = [startCell];
        while (queue.length) {
          const [r, c] = queue.shift().split(",").map(Number);
          const ns = neighborEdges(r, c);
          for (const dir of ns) {
            const [dr, dc] = {N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1]}[dir];
            const nr = r + dr, nc = c + dc;
            const key = `${nr},${nc}`;
            if (!visited.has(key)) {
              visited.add(key);
              queue.push(key);
            }
          }
        }
        // Verify all pearl cells are visited
        const allPearlsOn = puzzle.pearls.every(([r, c]) => visited.has(`${r},${c}`));
        if (!allPearlsOn) {
          AudioFX.error();
          statusEl.textContent = "Loop doesn't pass through every pearl";
          statusEl.className = "status lose";
          return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("masyu");
        if (!best || 100 > best) {
          Storage.setBest("masyu", 100);
          root.querySelector("#my-best").textContent = 100;
        }
      }

      root.querySelector("#my-check").addEventListener("click", check);
      root.querySelector("#my-clear").addEventListener("click", () => {
        if (over) return;
        edges = {};
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        edges = {};
        over = false;
        const best = Storage.getBest("masyu");
        root.querySelector("#my-best").textContent = best || "—";
        statusEl.textContent = "Click an edge between cells to add it to the loop.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (!over) App.toast("Try to draw the loop — use Check to validate.", "info");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Masyu",
        `Draw a <b>single closed loop</b> through every pearl, following these rules:
        <br><br>• <b>White pearl (⚪)</b>: the loop must go <b>straight through</b> the pearl (no turn), and must turn at the pearl or at one of the adjacent cells.
        <br>• <b>Black pearl (⚫)</b>: the loop must <b>turn 90°</b> at the pearl, and must go <b>straight</b> for at least one cell in both directions leaving the pearl.
        <br><br>Click edges between cells to add/remove them. The loop cannot branch or cross itself.`);
    },
  });
})();
