/* Sukoro — every cell tells how many numbered neighbors it has */
(function () {
  let live = null;
  GameRegistry.register({
    id: "sukoro",
    name: "Sukoro",
    icon: "🔢",
    category: "logic",
    description: "Every cell tells how many numbered neighbors it has",
    tags: ["logic", "numbers", "puzzle"],
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
      const N = 7;
      let nums, given, target, solvedCount, best, sel;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="sk2-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sk2-best">0</div></div>
        </div>
        <div class="status info" id="sk2-status">Enter 1–4 so every cell's number equals its numbered neighbors</div>
        <div class="center"><div id="sk2-grid"></div></div>
        <div class="row gap-2" id="sk2-pad" style="justify-content:center;"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:6px;">
          <button class="btn btn-sm" id="sk2-new">🆕 New puzzle</button>
        </div>
        <p class="hint">A cell with "2" needs exactly two orthogonal neighbors that also contain numbers.</p>
      `;

      const gridEl = root.querySelector("#sk2-grid");
      const padEl = root.querySelector("#sk2-pad");
      const statusEl = root.querySelector("#sk2-status");
      best = Storage.getBest("sukoro") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #sk2-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .sk2-cell { width:42px; height:42px; display:flex; align-items:center; justify-content:center;
                    font-weight:700; font-size:19px; cursor:pointer; user-select:none; }
        .sk2-btn { width:40px; height:40px; border-radius:8px; border:none; font-weight:700; font-size:17px; cursor:pointer; background:var(--bg-soft,#334155); color:var(--text,#eee); }
      `;
      root.appendChild(style);

      function generate() {
        // random partial fill then complete by greedy/backtracking; then blank ~55%
        const grid = Array.from({length: N}, () => Array(N).fill(0)); // 0 = empty
        // pre-place some seeds
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (Math.random() < 0.55) grid[y][x] = 1 + Math.floor(Math.random() * 4);
        }
        // fix counts: iterate — recompute each numbered cell's count and rewrite its number
        // (numbers describe neighbors, so we can adjust numbers rather than the fill)
        for (let pass = 0; pass < 30; pass++) {
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
            if (!grid[y][x]) continue;
            let c = 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < N && ny < N && grid[ny][nx]) c++;
            }
            grid[y][x] = c || 0; // if count drops to 0, cell must empty
          }
        }
        target = grid;
        // givens: keep ~45% of numbered cells
        given = grid.map(r => r.map(v => Math.random() < 0.45 ? v : 0));
        // player state: numbers visible only where given; empties as "filled" (unknown)
        // representation: playerState 0=empty, 1..4 = number
        nums = given.map(r => r.map(v => v ? v : (Math.random() < 0.5 ? 1 : 0) ? 0 : 0));
        // simpler: player must place numbers; empties are theirs to decide
        nums = given.map(r => r.map(() => 0));
        // copy givens
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) nums[y][x] = given[y][x];
        sel = null;
        render();
        statusEl.textContent = "Enter 1–4 so every cell's number equals its numbered neighbors";
        statusEl.className = "status info";
      }

      function toggle(x, y) {
        if (given[y][x]) return;
        // cycle: 0 -> 1 -> 2 -> 3 -> 4 -> 0
        nums[y][x] = (nums[y][x] + 1) % 5;
        AudioFX.click();
        sel = null;
        render();
        checkWin();
      }

      function checkWin() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const v = nums[y][x];
          if (!v) return false;
          let c = 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < N && ny < N && nums[ny][nx]) c++;
          }
          if (c !== v) return false;
        }
        AudioFX.win();
        solvedCount++;
        if (solvedCount > best) {
          best = solvedCount;
          Storage.setBest("sukoro", best);
        }
        statusEl.textContent = "✔ Solved! New puzzle incoming…";
        statusEl.className = "status win";
        after(generate, 1400);
        return true;
      }

      function render() {
        root.querySelector("#sk2-solved").textContent = solvedCount;
        root.querySelector("#sk2-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `repeat(${N}, 42px)`;
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          const c = document.createElement("div");
          c.className = "sk2-cell";
          c.style.background = given[y][x] ? "#0f766e" : "var(--bg-soft,#334155)";
          c.style.color = given[y][x] ? "#fff" : "var(--text,#eee)";
          c.style.borderRadius = given[y][x] ? "50%" : "8px";
          c.textContent = nums[y][x] || "";
          c.addEventListener("pointerdown", () => toggle(x, y));
          gridEl.appendChild(c);
        }
      }

      const onKey = (e) => { /* keyboard not primary here */
      };
      document.addEventListener("keydown", onKey);
      root.querySelector("#sk2-new").addEventListener("click", generate);

      live = {
        hint: function () {
          if (!target) return;
          const wrong = [];
          for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!given[y][x] && nums[y][x] !== target[y][x]) wrong.push([x, y]);
          if (!wrong.length) {
            App.toast("Nothing to reveal — you're on track!", "info");
            return;
          }
          const [x, y] = wrong[Math.floor(Math.random() * wrong.length)];
          nums[y][x] = target[y][x];
          AudioFX.reveal();
          render();
          App.toast(`💡 Hint: row ${y + 1}, column ${x + 1} ${target[y][x] ? "should hold " + target[y][x] : "should stay blank"}`, "info");
        },
      };
      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        document.removeEventListener("keydown", onKey);
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    help: function () {
      App.showModal("How to play Sukoro",
        `Fill <b>every cell</b> with a number 1–4 (or leave it blank by cycling past 4) so that each number
        equals the <b>count of its orthogonal neighbors that contain numbers</b>.
        <br><br>• Green circle numbers are fixed clues.
        • Click a grey cell to cycle its value: blank → 1 → 2 → 3 → 4 → blank.
        <br>A "3" on the edge is powerful — it needs almost every neighbor numbered. The board validates itself on every click.`);
    },
  });
})();
