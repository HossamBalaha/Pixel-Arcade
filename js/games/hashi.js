/* Hashi (Bridges) — connect numbered islands with bridges (1 or 2 per pair). All islands connected, no crossings. */
(function () {
  // Each puzzle: 5×5 grid; islands = list of {r,c,n}
  const PUZZLES = [{
    "size": 5,
    "islands": [{"r": 3, "c": 3, "n": 2}, {"r": 1, "c": 4, "n": 1}, {"r": 3, "c": 0, "n": 2}, {
      "r": 4,
      "c": 4,
      "n": 3
    }, {"r": 0, "c": 1, "n": 2}, {"r": 0, "c": 3, "n": 2}, {"r": 4, "c": 1, "n": 3}, {"r": 1, "c": 0, "n": 1}]
  }, {
    "size": 5,
    "islands": [{"r": 1, "c": 4, "n": 3}, {"r": 3, "c": 3, "n": 3}, {"r": 1, "c": 2, "n": 2}, {
      "r": 0,
      "c": 0,
      "n": 2
    }, {"r": 3, "c": 1, "n": 2}, {"r": 4, "c": 0, "n": 2}, {"r": 4, "c": 4, "n": 2}, {"r": 0, "c": 3, "n": 2}]
  }];

  let live = null;
  GameRegistry.register({
    id: "hashi",
    name: "Bridges (Hashi)",
    icon: "🌉",
    category: "logic",
    description: "Connect islands with bridges — each island's number = bridge count",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, bridges = {}, over = false;
      // bridges: keyed by "i-j" (sorted pair of island indices) → count (1 or 2)

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Bridges</div><div class="val" id="ha-bridges">0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="ha-errors">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ha-best">—</div></div>
        </div>
        <div class="status info" id="ha-status">Click between two islands to add a bridge. Connect all islands.</div>
        <div class="center" style="margin:14px 0;"><svg id="ha-svg" viewBox="0 0 260 260" style="max-width:380px;width:100%;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);"></svg></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="ha-clear">Clear</button>
          <button class="btn primary" id="ha-check">Check</button>
        </div>
        <p class="hint">Connect pairs of islands with <b>1 or 2 bridges</b>. Bridges go straight horizontally or vertically with no other island between. The number on each island = total bridges connected to it. All islands must be connected (reachable from any other).</p>
      `;
      const statusEl = root.querySelector("#ha-status");
      const svgEl = root.querySelector("#ha-svg");
      const CELL = 50, PAD = 15;

      function pos(r, c) {
        return [PAD + c * CELL + 15, PAD + r * CELL + 15];
      }

      function canConnect(i, j) {
        const a = puzzle.islands[i], b = puzzle.islands[j];
        if (a.r === b.r) {
          const lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c);
          for (let k = 0; k < puzzle.islands.length; k++) {
            if (k === i || k === j) continue;
            const o = puzzle.islands[k];
            if (o.r === a.r && o.c > lo && o.c < hi) return false;
          }
          return "h";
        }
        if (a.c === b.c) {
          const lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r);
          for (let k = 0; k < puzzle.islands.length; k++) {
            if (k === i || k === j) continue;
            const o = puzzle.islands[k];
            if (o.c === a.c && o.r > lo && o.r < hi) return false;
          }
          return "v";
        }
        return false;
      }

      function bridgeKey(i, j) {
        return i < j ? `${i}-${j}` : `${j}-${i}`;
      }

      function bridgesCross(i1, j1, i2, j2) {
        // Check if bridge (i1,j1) crosses bridge (i2,j2)
        const a = puzzle.islands[i1], b = puzzle.islands[j1];
        const c = puzzle.islands[i2], d = puzzle.islands[j2];
        const aH = a.r === b.r, cH = c.r === d.r;
        if (aH === cH) return false; // same direction, can't cross
        // One horizontal, one vertical
        const h = aH ? [a, b] : [c, d];
        const v = aH ? [c, d] : [a, b];
        const hY = h[0].r;
        const vX = v[0].c;
        const hXLo = Math.min(h[0].c, h[1].c), hXHi = Math.max(h[0].c, h[1].c);
        const vYLo = Math.min(v[0].r, v[1].r), vYHi = Math.max(v[0].r, v[1].r);
        return hY > vYLo && hY < vYHi && vX > hXLo && vX < hXHi;
      }

      function errors() {
        const errs = new Set();
        // Island count mismatches
        puzzle.islands.forEach((isl, i) => {
          let count = 0;
          Object.entries(bridges).forEach(([k, n]) => {
            const [a, b] = k.split("-").map(Number);
            if (a === i || b === i) count += n;
          });
          if (count > isl.n) errs.add(`island-${i}`);
        });
        // Crossings
        const keys = Object.keys(bridges);
        for (let x = 0; x < keys.length; x++) {
          for (let y = x + 1; y < keys.length; y++) {
            const [i1, j1] = keys[x].split("-").map(Number);
            const [i2, j2] = keys[y].split("-").map(Number);
            if (bridgesCross(i1, j1, i2, j2)) {
              errs.add(keys[x]);
              errs.add(keys[y]);
            }
          }
        }
        return errs;
      }

      function render() {
        svgEl.innerHTML = "";
        const errs = errors();
        // Draw bridges first (so islands appear on top)
        Object.entries(bridges).forEach(([k, n]) => {
          const [i, j] = k.split("-").map(Number);
          const a = puzzle.islands[i], b = puzzle.islands[j];
          const [x1, y1] = pos(a.r, a.c);
          const [x2, y2] = pos(b.r, b.c);
          const isErr = errs.has(k);
          for (let layer = 0; layer < n; layer++) {
            const offset = (layer - (n - 1) / 2) * 4;
            const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
            if (a.r === b.r) {
              ln.setAttribute("x1", x1);
              ln.setAttribute("y1", y1 + offset);
              ln.setAttribute("x2", x2);
              ln.setAttribute("y2", y2 + offset);
            } else {
              ln.setAttribute("x1", x1 + offset);
              ln.setAttribute("y1", y1);
              ln.setAttribute("x2", x2 + offset);
              ln.setAttribute("y2", y2);
            }
            ln.setAttribute("stroke", isErr ? "var(--danger)" : "var(--accent)");
            ln.setAttribute("stroke-width", "3");
            ln.setAttribute("stroke-linecap", "round");
            svgEl.appendChild(ln);
          }
        });
        // Draw islands
        puzzle.islands.forEach((isl, i) => {
          const [x, y] = pos(isl.r, isl.c);
          const isErr = errs.has(`island-${i}`);
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          circle.setAttribute("cx", x);
          circle.setAttribute("cy", y);
          circle.setAttribute("r", 16);
          circle.setAttribute("fill", isErr ? "var(--danger)" : "var(--bg-elev)");
          circle.setAttribute("stroke", "var(--text)");
          circle.setAttribute("stroke-width", "2");
          svgEl.appendChild(circle);
          const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
          txt.setAttribute("x", x);
          txt.setAttribute("y", y + 5);
          txt.setAttribute("text-anchor", "middle");
          txt.setAttribute("fill", isErr ? "#fff" : "var(--text)");
          txt.setAttribute("font-family", "var(--font-mono)");
          txt.setAttribute("font-size", "14");
          txt.setAttribute("font-weight", "700");
          txt.textContent = isl.n;
          svgEl.appendChild(txt);
        });
        // Invisible hit areas between connectable island pairs
        for (let i = 0; i < puzzle.islands.length; i++) {
          for (let j = i + 1; j < puzzle.islands.length; j++) {
            if (!canConnect(i, j)) continue;
            const a = puzzle.islands[i], b = puzzle.islands[j];
            const [x1, y1] = pos(a.r, a.c);
            const [x2, y2] = pos(b.r, b.c);
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
              const k = bridgeKey(i, j);
              const cur = bridges[k] || 0;
              if (cur === 0) bridges[k] = 1;
              else if (cur === 1) bridges[k] = 2;
              else delete bridges[k];
              AudioFX.tick();
              render();
            });
            svgEl.appendChild(hit);
          }
        }
        const totalBridges = Object.values(bridges).reduce((s, v) => s + v, 0);
        root.querySelector("#ha-bridges").textContent = totalBridges;
        root.querySelector("#ha-errors").textContent = errs.size;
      }

      function check() {
        const errs = errors();
        if (errs.size > 0) {
          AudioFX.error();
          statusEl.textContent = `${errs.size} error${errs.size === 1 ? "" : "s"} (over-connected or crossing)`;
          statusEl.className = "status lose";
          return;
        }
        // Verify all island counts match
        for (let i = 0; i < puzzle.islands.length; i++) {
          let count = 0;
          Object.entries(bridges).forEach(([k, n]) => {
            const [a, b] = k.split("-").map(Number);
            if (a === i || b === i) count += n;
          });
          if (count !== puzzle.islands[i].n) {
            AudioFX.error();
            statusEl.textContent = `Island at row ${puzzle.islands[i].r + 1}, col ${puzzle.islands[i].c + 1} needs ${puzzle.islands[i].n} bridges, has ${count}`;
            statusEl.className = "status lose";
            return;
          }
        }
        // Verify all islands connected (graph traversal)
        const adj = {};
        puzzle.islands.forEach((_, i) => adj[i] = []);
        Object.entries(bridges).forEach(([k, n]) => {
          const [a, b] = k.split("-").map(Number);
          adj[a].push(b);
          adj[b].push(a);
        });
        const visited = new Set([0]);
        const q = [0];
        while (q.length) {
          const cur = q.shift();
          adj[cur].forEach(n => {
            if (!visited.has(n)) {
              visited.add(n);
              q.push(n);
            }
          });
        }
        if (visited.size !== puzzle.islands.length) {
          AudioFX.error();
          statusEl.textContent = "Not all islands are connected";
          statusEl.className = "status lose";
          return;
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("hashi");
        if (!best || 100 > best) {
          Storage.setBest("hashi", 100);
          root.querySelector("#ha-best").textContent = 100;
        }
      }

      root.querySelector("#ha-check").addEventListener("click", check);
      root.querySelector("#ha-clear").addEventListener("click", () => {
        if (over) return;
        bridges = {};
        AudioFX.click();
        render();
      });

      function newGame() {
        puzzle = JSON.parse(JSON.stringify(PUZZLES[Math.floor(Math.random() * PUZZLES.length)]));
        bridges = {};
        over = false;
        const best = Storage.getBest("hashi");
        root.querySelector("#ha-best").textContent = best || "—";
        statusEl.textContent = "Click between two islands to add a bridge. Connect all islands.";
        statusEl.className = "status info";
        render();
      }

      live = {
        solve: function () {
          if (!over) App.toast("Try to solve it — use Check to validate.", "info");
        }
      };
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Bridges (Hashi)",
        `Connect pairs of <b>islands</b> with bridges so that:
        <br><br>• Each pair of islands has <b>1 or 2 bridges</b> between them (click the gap to cycle: 1 → 2 → none).
        <br>• Bridges run <b>straight horizontally or vertically</b> with no other island in between.
        <br>• The number on each island equals the <b>total bridges</b> connected to it.
        <br>• Bridges <b>never cross</b>.
        <br>• All islands are <b>connected</b> (reachable from any other).`);
    },
  });
})();
