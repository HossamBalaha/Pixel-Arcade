/* Tents — place tents next to trees: each tree needs exactly 1 adjacent tent
   (orthogonally); tents never touch, not even diagonally.
   Generator: place tree+tent pairs directly so a valid arrangement exists by
   construction; row/column clue counts are derived from that arrangement. */
(function () {
  "use strict";

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  const N = 6, TREES = 8;

  function generate() {
    for (let attempt = 0; attempt < 400; attempt++) {
      const trees = [], tents = [];
      const used = new Set(); // "r,c" occupied by tree or tent
      const tentCells = new Set();
      const treeAdjTent = new Set(); // trees that already have a tent
      let ok = true;
      for (let t = 0; t < TREES && ok; t++) {
        let placed = false;
        for (let tries = 0; tries < 120 && !placed; tries++) {
          const r = Math.floor(Math.random() * N), c = Math.floor(Math.random() * N);
          if (used.has(r + "," + c)) continue;
          // candidate tent positions orth-adjacent
          const cand = shuffle([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
            .filter(([tr, tc]) => tr >= 0 && tr < N && tc >= 0 && tc < N && !used.has(tr + "," + tc)));
          for (const [tr, tc] of cand) {
            // tent must not touch any existing tent (8-dir)
            let touch = false;
            for (let dr = -1; dr <= 1 && !touch; dr++) for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue;
              if (tentCells.has((tr + dr) + "," + (tc + dc))) {
                touch = true;
                break;
              }
            }
            if (touch) continue;
            // this tree must not be adjacent to any existing tent (so each tree gets exactly one)
            let treeHasTent = false;
            for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              if (tentCells.has((r + dr) + "," + (c + dc))) {
                treeHasTent = true;
                break;
              }
            }
            if (treeHasTent) continue;
            trees.push([r, c]);
            tents.push([tr, tc]);
            used.add(r + "," + c);
            used.add(tr + "," + tc);
            tentCells.add(tr + "," + tc);
            placed = true;
            break;
          }
        }
        if (!placed) ok = false;
      }
      if (!ok) continue;
      // derive row/col counts
      const rowCount = Array(N).fill(0), colCount = Array(N).fill(0);
      for (const [r, c] of tents) {
        rowCount[r]++;
        colCount[c]++;
      }
      return {trees, tents, rowCount, colCount};
    }
    // deterministic fallback (verified by hand):
    // trees on (1,1),(1,4),(3,1),(3,4),(4,4) tents (0,1),(2,4),(4,1),(0,4)... use classic 4-tree pattern
    return {
      trees: [[1, 1], [1, 4], [4, 1], [4, 4]],
      tents: [[0, 1], [0, 4], [3, 1], [5, 4]],
      rowCount: [2, 0, 0, 1, 0, 1],
      colCount: [0, 2, 0, 0, 2, 0],
    };
  }

  let live = null;
  GameRegistry.register({
    id: "tents",
    name: "Tents",
    icon: "⛺",
    category: "logic",
    description: "Place a tent next to each tree — tents can't touch",
    tags: ["logic", "thinking", "puzzle"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let puzzle = null, tents = null, over = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Tents</div><div class="val" id="tn-tents">0 / ?</div></div>
          <div class="score-cell"><div class="label">Trees</div><div class="val" id="tn-trees">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tn-best">—</div></div>
        </div>
        <div class="status info" id="tn-status">Tap an empty cell to place a tent. Tap a tent to remove it.</div>
        <div class="center" style="margin:14px 0;">
          <table class="tn-table" id="tn-grid"></table>
        </div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="tn-clear">Clear</button>
          <button class="btn primary" id="tn-check">Check</button>
        </div>
        <p class="hint">Every tree needs <b>exactly one</b> orthogonally adjacent tent. Tents never touch — not even diagonally. Numbers on the edges show how many tents are in that row/column.</p>
      `;
      const statusEl = root.querySelector("#tn-status");
      const gridEl = root.querySelector("#tn-grid");
      if (!document.getElementById("tn-style")) {
        const s = document.createElement("style");
        s.id = "tn-style";
        s.textContent = `
          .tn-table { border-collapse: collapse; }
          .tn-td { width: 48px; height: 48px; border: 1px solid var(--border); background: var(--bg-elev); text-align: center; font-size: 1.6rem; cursor: pointer; user-select: none; padding: 0; }
          .tn-td.tree { cursor: default; }
          .tn-td.tent { background: var(--accent-soft, #dbeafe); }
          .tn-clue { width: 24px; color: var(--text-muted); font-weight: 700; font-size: 0.95rem; text-align: center; }
        `;
        document.head.appendChild(s);
      }

      function key(r, c) {
        return r + "," + c;
      }

      function render() {
        let html = "<tr><td></td>";
        for (let c = 0; c < N; c++) html += `<td class="tn-clue">${puzzle.colCount[c] || 0}</td>`;
        html += "<td></td></tr>";
        for (let r = 0; r < N; r++) {
          html += `<tr><td class="tn-clue">${puzzle.rowCount[r] || 0}</td>`;
          for (let c = 0; c < N; c++) {
            const isTree = puzzle.trees.some(([tr, tc]) => tr === r && tc === c);
            const isTent = tents[key(r, c)];
            html += `<td class="tn-td${isTree ? " tree" : ""}${isTent ? " tent" : ""}" data-r="${r}" data-c="${c}">${isTree ? "🌳" : (isTent ? "⛺" : "")}</td>`;
          }
          html += `<td class="tn-clue">${puzzle.rowCount[r] || 0}</td></tr>`;
        }
        html += "<tr><td></td>";
        for (let c = 0; c < N; c++) html += `<td class="tn-clue">${puzzle.colCount[c] || 0}</td>`;
        html += "<td></td></tr>";
        gridEl.innerHTML = html;
        gridEl.querySelectorAll(".tn-td:not(.tree)").forEach(td => {
          td.addEventListener("click", () => {
            if (over) return;
            const r = +td.dataset.r, c = +td.dataset.c;
            tents[key(r, c)] = !tents[key(r, c)];
            AudioFX.pop();
            render();
          });
        });
        const n = Object.values(tents).filter(Boolean).length;
        root.querySelector("#tn-tents").textContent = n + " / " + puzzle.trees.length;
        root.querySelector("#tn-trees").textContent = puzzle.trees.length;
      }

      function check() {
        if (over) return;
        const tentList = Object.entries(tents).filter(([, v]) => v).map(([k]) => k.split(",").map(Number));
        // tents don't touch
        for (let i = 0; i < tentList.length; i++) for (let j = i + 1; j < tentList.length; j++) {
          if (Math.abs(tentList[i][0] - tentList[j][0]) <= 1 && Math.abs(tentList[i][1] - tentList[j][1]) <= 1) {
            return fail("Two tents touch each other.");
          }
        }
        // row/col counts
        for (let r = 0; r < N; r++) {
          const cnt = tentList.filter(([tr]) => tr === r).length;
          if (cnt !== (puzzle.rowCount[r] || 0)) return fail(`Row ${r + 1} needs ${puzzle.rowCount[r] || 0} tents, has ${cnt}.`);
        }
        for (let c = 0; c < N; c++) {
          const cnt = tentList.filter(([, tc]) => tc === c).length;
          if (cnt !== (puzzle.colCount[c] || 0)) return fail(`Column ${c + 1} needs ${puzzle.colCount[c] || 0} tents, has ${cnt}.`);
        }
        // each tree exactly one adjacent tent
        for (const [tr, tc] of puzzle.trees) {
          const n = tentList.filter(([r, c]) => Math.abs(r - tr) + Math.abs(c - tc) === 1).length;
          if (n !== 1) return fail(`Tree at (${tr + 1},${tc + 1}) has ${n} adjacent tents — needs exactly 1.`);
        }
        // each tent adjacent to a tree
        for (const [r, c] of tentList) {
          if (!puzzle.trees.some(([tr, tc]) => Math.abs(r - tr) + Math.abs(c - tc) === 1)) {
            return fail(`Tent at (${r + 1},${c + 1}) isn't next to any tree.`);
          }
        }
        over = true;
        AudioFX.win();
        statusEl.textContent = "🎉 Solved!";
        statusEl.className = "status win";
        const best = Storage.getBest("tents");
        if (!best || 100 > best) {
          Storage.setBest("tents", 100);
          root.querySelector("#tn-best").textContent = 100;
        }

        function fail(msg) {
          AudioFX.error();
          statusEl.textContent = msg;
          statusEl.className = "status lose";
        }
      }

      function newGame() {
        puzzle = generate();
        tents = {};
        over = false;
        const best = Storage.getBest("tents");
        root.querySelector("#tn-best").textContent = best || "—";
        statusEl.textContent = "Tap an empty cell to place a tent. Tap a tent to remove it.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#tn-check").addEventListener("click", check);
      root.querySelector("#tn-clear").addEventListener("click", () => {
        if (over) return;
        tents = {};
        AudioFX.click();
        render();
      });

      newGame();
      live = {
        hint: function () {
          if (over || !puzzle) return;
          const wrong = Object.keys(tents).filter(k => tents[k] &&
            !puzzle.tents.some(([tr, tc]) => tr + "," + tc === k));
          const missing = puzzle.tents.filter(([tr, tc]) => !tents[key(tr, tc)]);
          if (!wrong.length && !missing.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          if (wrong.length && (Math.random() < 0.5 || !missing.length)) {
            delete tents[wrong[Math.floor(Math.random() * wrong.length)]];
          } else {
            const [r, c] = missing[Math.floor(Math.random() * missing.length)];
            tents[key(r, c)] = true;
          }
          AudioFX.reveal();
          render();
        },
        solve: function () {
          if (over) return;
          tents = {};
          puzzle.tents.forEach(([r, c]) => tents[key(r, c)] = true);
          over = true;
          render();
          statusEl.textContent = "Solution revealed";
          statusEl.className = "status lose";
          AudioFX.lose();
        },
      };
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Tents",
        `Place tents in empty cells so that:
        <br><br>• Every <b>tree</b> has <b>exactly one</b> tent orthogonally adjacent (above/below/left/right).
        <br>• <b>Tents never touch</b> — not even diagonally.
        <br>• Row and column numbers show exactly how many tents are in that line.
        <br><br>Tap a cell to place/remove a tent. Use <b>Check</b> to verify.`);
    },
  });
})();
