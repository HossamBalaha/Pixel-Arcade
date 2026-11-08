/* Fill-a-Pix — each number counts shaded neighbors; reveal the picture */
(function () {
  GameRegistry.register({
    id: "fillapix",
    name: "Fill-a-Pix",
    icon: "🖼️",
    category: "logic",
    description: "Each number counts shaded neighbors — reveal the picture",
    tags: ["logic", "picture", "puzzle"],
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
      const N = 10;
      let clues, shaded, solution, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="fp-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fp-best">0</div></div>
        </div>
        <div class="status info" id="fp-status">Make every number count its shaded 3×3 neighborhood</div>
        <div class="center"><div id="fp-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="fp-check">✔ Check</button>
          <button class="btn btn-sm" id="fp-clear">↻ Clear</button>
          <button class="btn btn-sm" id="fp-new">🆕 New puzzle</button>
        </div>
        <p class="hint">0 = nothing shaded around it, 9 = the whole 3×3 block. The shading hides a picture!</p>
      `;

      const gridEl = root.querySelector("#fp-grid");
      const statusEl = root.querySelector("#fp-status");
      best = Storage.getBest("fillapix") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #fp-grid { display:inline-grid; gap:1px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .fp-cell { width:30px; height:30px; display:flex; align-items:center; justify-content:center;
                   cursor:pointer; font-size:12px; font-weight:700; color:var(--text,#eee); border-radius:2px; user-select:none; }
        .fp-shaded { background:var(--text,#eee) !important; color:var(--bg,#111); }
      `;
      root.appendChild(style);

      // hidden pictures (10x10 bitmaps, 1 = shaded)
      const PICS = [
        ["..####....", "..#..##...", ".#....#...", ".#....##..", ".#.....#..", "..#...#...", "..##.#....", "...#......", "...####...", ".........."],
        ["....##....", "...####...", "..######..", ".########.", "..######..", "...####...", "....##....", "...#..#...", "..#....#..", ".........."],
        ["..#....#..", "..#.##.#..", "..#.##.#..", "..#....#..", "..######..", "...####...", "....##....", "....##....", "...####...", ".........."],
        ["...####...", "..#....#..", ".#..##..#.", ".#.#..#.#.", ".#..##..#.", ".#......#.", "..#....#..", "...####...", "....##....", "...####..."],
        ["##########", "#........#", "#..####..#", "#..#..#..#", "#..####..#", "#........#", "##########", "...####...", "....##....", "...####..."],
      ];

      function generate() {
        const pic = PICS[Math.floor(Math.random() * PICS.length)];
        solution = pic.map(r => r.split("").map(c => c === "#"));
        clues = Array.from({length: N}, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && solution[ny][nx]) c++;
          }
          clues[y][x] = c;
        }
        shaded = Array.from({length: N}, () => Array(N).fill(false));
        render();
        statusEl.textContent = "Make every number count its shaded 3×3 neighborhood";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        shaded[y][x] = !shaded[y][x];
        AudioFX.click();
        render();
        checkWin();
      }

      function checkWin() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && shaded[ny][nx]) c++;
          }
          if (c !== clues[y][x]) return;
        }
        AudioFX.win();
        solvedCount++;
        if (solvedCount > best) {
          best = solvedCount;
          Storage.setBest("fillapix", best);
        }
        statusEl.textContent = "🖼️ Picture revealed! New puzzle incoming…";
        statusEl.className = "status win";
        after(generate, 1600);
      }

      function render() {
        root.querySelector("#fp-solved").textContent = solvedCount;
        root.querySelector("#fp-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 30px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "fp-cell" + (shaded[y][x] ? " fp-shaded" : "");
          c.style.background = "var(--bg-soft,#334155)";
          c.textContent = clues[y][x];
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#fp-check").addEventListener("click", () => {
        let wrong = 0;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && shaded[ny][nx]) c++;
          }
          if (c !== clues[y][x]) wrong++;
        }
        if (wrong) {
          AudioFX.error();
          statusEl.textContent = `✗ ${wrong} cells still disagree with their clues`;
          statusEl.className = "status lose";
        } else {
          AudioFX.win();
          statusEl.textContent = "✔ Perfect!";
          statusEl.className = "status win";
        }
      });
      root.querySelector("#fp-clear").addEventListener("click", () => {
        shaded = shaded.map(r => r.map(() => false));
        render();
      });
      root.querySelector("#fp-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Fill-a-Pix",
        `Every cell shows how many of its <b>3×3 neighborhood</b> (itself included) must be <b>shaded</b>.
        <br><br>• <b>9</b> = shade all nine cells · <b>0</b> = shade none of them.
        <br>Click cells to toggle shading. When every number is satisfied, a hidden pixel picture appears!
        The grid auto-detects your win.`);
    },
  });
})();
