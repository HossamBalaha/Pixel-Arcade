/* Word Waffle — swap letters until every row spells a word */
(function () {
  GameRegistry.register({
    id: "wordwaffle",
    name: "Word Waffle",
    icon: "🧇",
    category: "word",
    description: "Swap letters until every row spells a word",
    tags: ["word", "swap", "grid"],
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
      // Waffle shape: 5x5 board; rows 0, 2, 4 are 5-letter words (15 letters).
      // Holes elsewhere are decorative. Player swaps tiles to restore the words.
      let solution, letters, sel, solvedCount, best, moves;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="ww-moves">0</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ww-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ww-best">0</div></div>
        </div>
        <div class="status info" id="ww-status">Swap letters until all 3 rows spell words 🧇</div>
        <div class="center"><div id="ww-grid"></div></div>
        <div class="row gap-2" style="justify-content:center;">
          <button class="btn btn-sm" id="ww-new">🆕 New waffle</button>
        </div>
        <p class="hint">Letters in the right spot turn green. Fewer moves = crispier waffle!</p>
      `;

      const gridEl = root.querySelector("#ww-grid");
      const statusEl = root.querySelector("#ww-status");
      best = Storage.getBest("wordwaffle") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        #ww-grid { display:inline-grid; gap:4px; padding:14px; background:var(--bg-inset,#1f2937); border-radius:16px; }
        .ww-cell { width:46px; height:46px; display:flex; align-items:center; justify-content:center;
                   font-weight:700; font-size:20px; cursor:pointer; border-radius:8px; user-select:none;
                   text-transform:uppercase; }
        .ww-cell.tile { background:var(--bg-soft,#334155); color:var(--text,#eee); }
        .ww-cell.hole { background:transparent; cursor:default; }
        .ww-cell.right { background:#16a34a; color:#fff; }
        .ww-cell.sel { outline:3px solid #fbbf24; outline-offset:-3px; }
      `;
      root.appendChild(style);

      function generate() {
        // Build fast: index ANSWERS_5 by (w[0], w[2], w[4]) triple; pick a bucket with 3+ distinct words.
        const pool = (window.ANSWERS_5 || []).slice();
        const buckets = new Map();
        for (const w of pool) {
          const k = w[0] + w[2] + w[4];
          if (!buckets.has(k)) buckets.set(k, []);
          buckets.get(k).push(w);
        }
        const keys = [...buckets.entries()].filter(([, ws]) => ws.length >= 3)
          .sort(() => Math.random() - 0.5);
        if (!keys.length) return generate();
        const [, ws] = keys[0];
        const pick3 = ws.slice().sort(() => Math.random() - 0.5).slice(0, 3);
        // 5x5 board; solution rows at y = 0, 2, 4
        solution = Array.from({length: 5}, () => Array(5).fill(null));
        [0, 2, 4].forEach((y, i) => {
          for (let x = 0; x < 5; x++) solution[y][x] = pick3[i][x].toUpperCase();
        });
        // scramble the 15 letters across their positions
        const positions = [];
        [0, 2, 4].forEach(y => {
          for (let x = 0; x < 5; x++) positions.push([x, y]);
        });
        const chars = positions.map(([x, y]) => solution[y][x]);
        for (let i = chars.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chars[i], chars[j]] = [chars[j], chars[i]];
        }
        letters = {}; // "x,y" -> char
        positions.forEach(([x, y], i) => letters[x + "," + y] = chars[i]);
        // ensure it's not accidentally solved
        if (positions.every(([x, y], i) => letters[x + "," + y] === solution[y][x])) return generate();
        sel = null;
        moves = 0;
        render();
        statusEl.textContent = "Swap letters until all 3 rows spell words 🧇";
        statusEl.className = "status info";
      }

      function isWord(str) {
        const w = str.toLowerCase();
        return (window.ANSWERS_5 || []).includes(w) || (window.WORDS_5 || []).includes(w);
      }

      function checkWin() {
        return [0, 2, 4].every(y => {
          const word = [0, 1, 2, 3, 4].map(x => letters[x + "," + y]).join("");
          return isWord(word);
        });
      }

      function clickTile(x, y) {
        const k = x + "," + y;
        if (sel === null) {
          sel = k;
          AudioFX.click();
        } else if (sel === k) {
          sel = null;
        } else {
          const tmp = letters[sel];
          letters[sel] = letters[k];
          letters[k] = tmp;
          moves++;
          AudioFX.pop();
          sel = null;
          render();
          if (checkWin()) {
            AudioFX.win();
            solvedCount++;
            if (solvedCount > best) {
              best = solvedCount;
              Storage.setBest("wordwaffle", best);
            }
            statusEl.textContent = `🧇 Waffle solved in ${moves} moves! New one incoming…`;
            statusEl.className = "status win";
            after(generate, 1900);
          }
        }
        render();
      }

      function render() {
        root.querySelector("#ww-moves").textContent = moves;
        root.querySelector("#ww-solved").textContent = solvedCount;
        root.querySelector("#ww-best").textContent = best;
        gridEl.innerHTML = "";
        gridEl.style.gridTemplateColumns = "repeat(5, 46px)";
        for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
          const c = document.createElement("div");
          const isTile = solution[y][x] !== null;
          if (!isTile) {
            c.className = "ww-cell hole";
          } else {
            const right = letters[x + "," + y] === solution[y][x];
            c.className = "ww-cell tile" + (right ? " right" : "") + (sel === x + "," + y ? " sel" : "");
            c.textContent = letters[x + "," + y];
            const x0 = x, y0 = y;
            c.addEventListener("pointerdown", () => clickTile(x0, y0));
          }
          gridEl.appendChild(c);
        }
      }

      root.querySelector("#ww-new").addEventListener("click", generate);
      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
      };
    },
    help: function () {
      App.showModal("How to play Word Waffle",
        `Three five-letter words hide in the waffle rows — all 15 letters are on the board but <b>scrambled</b>.
        <b>Click two tiles to swap them</b> and rebuild every row into a real word.
        <br><br>Green tiles are already in their correct spot. The holes in the waffle are decoration.
        Fewer moves = crispier waffle. Puzzles are generated fresh from the dictionary.`);
    },
  });
})();
