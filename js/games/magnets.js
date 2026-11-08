/* Magnets — place +/− poles so rows and columns hit their counts */
(function () {
  GameRegistry.register({
    id: "magnets",
    name: "Magnets",
    icon: "🧲",
    category: "logic",
    description: "Place +/− magnets so rows and columns hit their counts",
    tags: ["logic", "deduction", "puzzle"],
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
      const R = 6, C = 8;
      let dominoes, state, rowPlus, colPlus, rowMinus, colMinus, solvedCount, best;
      // state per domino: 0 = unset, 1 = horizontal +- , 2 = horizontal -+, 3 = vertical +-, 4 = vertical -+ ... simpler:
      // we store per-cell: null / '+' / '-' / 'x' (blank domino). Click cycles whole domino.

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="mg2-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="mg2-best">0</div></div>
        </div>
        <div class="status info" id="mg2-status">Place magnets — match the +/− counts around the edges</div>
        <div class="center"><div id="mg2-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="mg2-check">✔ Check</button>
          <button class="btn btn-sm" id="mg2-clear">↻ Clear</button>
          <button class="btn btn-sm" id="mg2-new">🆕 New puzzle</button>
        </div>
        <p class="hint">Each domino holds one + and one − … or gets neutralized entirely (×). Same poles never touch.</p>
      `;

      const gridEl = root.querySelector("#mg2-grid");
      const statusEl = root.querySelector("#mg2-status");
      best = Storage.getBest("magnets") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #mg2-grid { display:inline-grid; gap:2px; padding:10px; background:var(--bg-inset,#1f2937); border-radius:12px; }
        .mg2-cell { width:38px; height:38px; display:flex; align-items:center; justify-content:center;
                    font-weight:700; font-size:20px; cursor:pointer; user-select:none; border-radius:6px; }
        .mg2-plus { background:#dc2626; color:#fff; }
        .mg2-minus { background:#2563eb; color:#fff; }
        .mg2-neutral { background:#4b5563; color:#9ca3af; }
        .mg2-empty { background:var(--bg-soft,#334155); }
        .mg2-clue { background:transparent; font-size:13px; color:var(--text-muted,#94a3b8); cursor:default; }
      `;
      root.appendChild(style);

      function generate() {
        // partition grid into dominoes (1x2 / 2x1) via greedy
        const used = Array.from({length: R}, () => Array(C).fill(false));
        dominoes = [];
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          if (used[y][x]) continue;
          const opts = [];
          if (x + 1 < C && !used[y][x + 1]) opts.push([x + 1, y]);
          if (y + 1 < R && !used[y + 1][x]) opts.push([x, y + 1]);
          if (!opts.length) {
            used[y][x] = true;
            continue;
          }
          const [ox, oy] = opts[Math.floor(Math.random() * opts.length)];
          used[y][x] = used[oy][ox] = true;
          dominoes.push({cells: [[x, y], [ox, oy]]});
        }
        // random solution: each domino is +/-, -/+, or neutral(2%)
        const sol = Array.from({length: R}, () => Array(C).fill(null));
        dominoes.forEach(d => {
          const r = Math.random();
          if (r < 0.06) {
            sol[d.cells[0][1]][d.cells[0][0]] = "x";
            sol[d.cells[1][1]][d.cells[1][0]] = "x";
          } else if (r < 0.53) {
            sol[d.cells[0][1]][d.cells[0][0]] = "+";
            sol[d.cells[1][1]][d.cells[1][0]] = "-";
          } else {
            sol[d.cells[0][1]][d.cells[0][0]] = "-";
            sol[d.cells[1][1]][d.cells[1][0]] = "+";
          }
        });
        // compute counts
        rowPlus = Array(R).fill(0);
        rowMinus = Array(R).fill(0);
        colPlus = Array(C).fill(0);
        colMinus = Array(C).fill(0);
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          if (sol[y][x] === "+") {
            rowPlus[y]++;
            colPlus[x]++;
          }
          if (sol[y][x] === "-") {
            rowMinus[y]++;
            colMinus[x]++;
          }
        }
        state = dominoes.map(() => 0); // 0 unset, 1 A+B (first +), 2 A-B, 3 neutral
        render();
        statusEl.textContent = "Place magnets — match the +/− counts around the edges";
        statusEl.className = "status info";
      }

      function cellFor(dIdx) {
        const d = dominoes[dIdx];
        return d.cells.map(([x, y]) => state[dIdx] === 0 ? null :
          state[dIdx] === 3 ? "x" :
            state[dIdx] === 1 ? (d.cells[0][0] === x && d.cells[0][1] === y ? "+" : "-") :
              (d.cells[0][0] === x && d.cells[0][1] === y ? "-" : "+"));
      }

      function clickDomino(i) {
        state[i] = (state[i] + 1) % 4;
        AudioFX.click();
        render();
      }

      function counts() {
        const rp = Array(R).fill(0), rm = Array(R).fill(0), cp = Array(C).fill(0), cm = Array(C).fill(0);
        dominoes.forEach((d, i) => {
          const vals = cellFor(i);
          d.cells.forEach(([x, y], k) => {
            if (vals[k] === "+") {
              rp[y]++;
              cp[x]++;
            }
            if (vals[k] === "-") {
              rm[y]++;
              cm[x]++;
            }
          });
        });
        return {rp, rm, cp, cm};
      }

      function validate() {
        const {rp, rm, cp, cm} = counts();
        for (let y = 0; y < R; y++) if (rp[y] !== rowPlus[y]) return `row ${y + 1} needs ${rowPlus[y]} plus`;
        for (let y = 0; y < R; y++) if (rm[y] !== rowMinus[y]) return `row ${y + 1} needs ${rowMinus[y]} minus`;
        for (let x = 0; x < C; x++) if (cp[x] !== colPlus[x]) return `col ${x + 1} needs ${colPlus[x]} plus`;
        for (let x = 0; x < C; x++) if (cm[x] !== colMinus[x]) return `col ${x + 1} needs ${colMinus[x]} minus`;
        // same poles can't touch
        const grid = Array.from({length: R}, () => Array(C).fill(null));
        dominoes.forEach((d, i) => {
          const vals = cellFor(i);
          d.cells.forEach(([x, y], k) => grid[y][x] = vals[k]);
        });
        for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
          const v = grid[y][x];
          if (v !== "+" && v !== "-") continue;
          for (const [dx, dy] of [[1, 0], [0, 1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < C && ny < R && grid[ny][nx] === v) return `same poles touch at ${v}`;
          }
        }
        return null;
      }

      function check() {
        const err = validate();
        if (!err) {
          AudioFX.win();
          solvedCount++;
          if (solvedCount > best) {
            best = solvedCount;
            Storage.setBest("magnets", best);
          }
          statusEl.textContent = "✔ Solved! New puzzle incoming…";
          statusEl.className = "status win";
          after(generate, 1400);
        } else {
          AudioFX.error();
          statusEl.textContent = "✗ " + err;
          statusEl.className = "status lose";
        }
      }

      function render() {
        root.querySelector("#mg2-solved").textContent = solvedCount;
        root.querySelector("#mg2-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = `34px repeat(${C}, 38px) 34px`;
        // header row: - clue, then column clues (+ / -), corner
        const hd = (t) => `<div class="mg2-cell mg2-clue">${t}</div>`;
        let html = `<div class="mg2-cell mg2-clue"></div>`;
        for (let x = 0; x < C; x++) html += `<div class="mg2-cell mg2-clue">${colPlus[x]}<br>${colMinus[x]}</div>`;
        html += `<div class="mg2-cell mg2-clue"></div>`;
        html += `<div class="mg2-cell mg2-clue">+−<br>−+</div>`;
        for (let x = 0; x < C; x++) html += hd("");
        html += hd("");
        gridEl.innerHTML = html;
        // body rows
        const grid = Array.from({length: R}, () => Array(C).fill(null));
        const domIdx = Array.from({length: R}, () => Array(C).fill(-1));
        dominoes.forEach((d, i) => d.cells.forEach(([x, y]) => domIdx[y][x] = i));
        for (let y = 0; y < R; y++) {
          const rc = document.createElement("div");
          rc.className = "mg2-cell mg2-clue";
          rc.textContent = rowPlus[y] + "/" + rowMinus[y];
          gridEl.appendChild(rc);
          for (let x = 0; x < C; x++) {
            const c = document.createElement("div");
            const i = domIdx[y][x];
            const v = i >= 0 ? cellFor(i)[dominoes[i].cells.findIndex(([cx, cy]) => cx === x && cy === y)] : null;
            c.className = "mg2-cell " + (v === "+" ? "mg2-plus" : v === "-" ? "mg2-minus" : v === "x" ? "mg2-neutral" : "mg2-empty");
            c.textContent = v === "x" ? "×" : v || "";
            if (i >= 0) c.addEventListener("pointerdown", () => clickDomino(i));
            gridEl.appendChild(c);
          }
          const rc2 = document.createElement("div");
          rc2.className = "mg2-cell mg2-clue";
          rc2.textContent = rowPlus[y] + "/" + rowMinus[y];
          gridEl.appendChild(rc2);
        }
      }

      root.querySelector("#mg2-check").addEventListener("click", check);
      root.querySelector("#mg2-clear").addEventListener("click", () => {
        state = state.map(() => 0);
        render();
      });
      root.querySelector("#mg2-new").addEventListener("click", generate);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Magnets",
        `The grid is tiled with dominoes. Click a domino to cycle its state:
        <br>• <b style="color:#dc2626">+</b> then <b style="color:#2563eb">−</b> &nbsp;·&nbsp; <b style="color:#2563eb">−</b> then <b style="color:#dc2626">+</b> &nbsp;·&nbsp; or <b>×</b> (neutral — no poles).
        <br><br>Constraints:
        <br>• The numbers around the edges count the <b>+</b> and <b>−</b> poles in each row/column.
        <br>• Equal poles <b>never touch</b> — not even diagonally-adjacent ones… well, orthogonally at least!
        <br>Every domino that isn't neutral holds exactly one of each pole. Press <b>Check</b> to verify.`);
    },
  });
})();
