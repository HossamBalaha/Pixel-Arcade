/* dominosa — deduce the domino layout: pair adjacent numbers, use each domino once. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "dominosa",
    name: "Dominosa",
    icon: "🁫",
    category: "logic",
    description: "Tile the grid into dominoes — each domino value used exactly once",
    tags: ["logic", "dominoes", "deduction"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true;
      const W = 7, H = 6; // 42 cells = 21 dominoes (values 0..6)
      let grid = [];     // displayed numbers
      let solution = []; // for each cell: id of its domino
      let marked = [];   // player: -1 unpaired, else partner index
      let pairs = 0, mistakes = 0;

      function gen() {
        // random perfect matching of the W×H grid via simple backtracking
        const cells = [];
        for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) cells.push(r * W + c);
        const used = new Set();
        const edges = i => {
          const r = Math.floor(i / W), c = i % W, out = [];
          if (c < W - 1) out.push(i + 1);
          if (r < H - 1) out.push(i + W);
          return out;
        };
        const shuffled = a => {
          a = a.slice();
          for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
          }
          return a;
        };
        const match = new Map();

        function rec(remaining) {
          if (!remaining.length) return true;
          const i = remaining[0];
          const opts = shuffled(edges(i).filter(j => remaining.includes(j)));
          for (const j of opts) {
            match.set(i, j);
            match.set(j, i);
            const rest = remaining.filter(x => x !== i && x !== j);
            if (rec(rest)) return true;
            match.delete(i);
            match.delete(j);
          }
          return false;
        }

        rec(shuffled(cells));
        // assign numbers so each domino value pair is unique
        const want = [];
        for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) want.push([a, b]);
        for (let i = want.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [want[i], want[j]] = [want[j], want[i]];
        }
        grid = Array(H * W).fill(0);
        solution = Array(H * W).fill(-1);
        const dominoIdx = [...match.keys()].filter(i => i < match.get(i));
        dominoIdx.forEach((i, k) => {
          const j = match.get(i);
          const [a, b] = want[k];
          const flip = Math.random() < 0.5;
          grid[i] = flip ? b : a;
          grid[j] = flip ? a : b;
          solution[i] = k;
          solution[j] = k;
        });
      }

      function newGame() {
        gen();
        marked = Array(H * W).fill(-1);
        pairs = 0;
        mistakes = 0;
        setStatus("Click two adjacent numbers to pair them into a domino.");
        render();
      }

      function setStatus(t, cls) {
        const st = root.querySelector("#dm-status");
        if (st) {
          st.textContent = t;
          st.className = "status " + (cls || "info");
        }
      }

      function adjacent(i, j) {
        const r1 = Math.floor(i / W), c1 = i % W, r2 = Math.floor(j / W), c2 = j % W;
        return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
      }

      let selCell = -1;

      function click(i) {
        if (marked[i] >= 0) return;
        if (selCell === -1) {
          selCell = i;
          AudioFX.click();
          render();
          return;
        }
        if (selCell === i) {
          selCell = -1;
          render();
          return;
        }
        const j = selCell;
        selCell = -1;
        if (!adjacent(i, j)) {
          App.toast("Dominoes cover two adjacent cells", "warning");
          render();
          return;
        }
        marked[i] = j;
        marked[j] = i;
        pairs++;
        AudioFX.pop();
        if (solution[i] === solution[j]) {
          if (pairs === (H * W) / 2) {
            setStatus("🎉 Perfect tiling — all dominoes placed correctly!", "win");
            AudioFX.win();
            App.recordResult(true, mistakes);
          } else {
            setStatus("Correct domino! " + ((H * W) / 2 - pairs) + " to go.");
          }
        } else {
          mistakes++;
          // auto-reject wrong pairs after brief flash
          setStatus("Those two aren't the same domino — try again.", "");
          AudioFX.error();
          setTimeout(() => {
            if (alive) {
              marked[i] = -1;
              marked[j] = -1;
              pairs--;
              render();
            }
          }, 600);
        }
        render();
      }

      root.innerHTML = `
        <style>
          #dm-grid { display: grid; grid-template-columns: repeat(${W}, 46px); gap: 3px; justify-content: center; margin: 10px 0; }
          .dm-cell { width: 46px; height: 46px; background: var(--bg-elev); border: 1px solid var(--border);
            border-radius: 8px; display: grid; place-items: center; font-size: 1.2rem; font-weight: 800; cursor: pointer; }
          .dm-cell.sel { border-color: #f59e0b; box-shadow: 0 0 8px #f59e0b88; }
          .dm-cell.paired { background: #14532d; color: #fff; }
          .dm-cell.bad { background: #7f1d1d; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Dominoes</div><div class="val" id="dm-p">0/21</div></div>
          <div class="score-cell"><div class="label">Mistakes</div><div class="val" id="dm-m">0</div></div>
        </div>
        <div class="status info" id="dm-status"></div>
        <div id="dm-grid"></div>
        <div class="row" style="justify-content:center;"><button class="btn" id="dm-new">🔀 New puzzle</button></div>
      `;

      function render() {
        const el = root.querySelector("#dm-grid");
        if (!el) return;
        let h = "";
        for (let i = 0; i < H * W; i++) {
          let cls = "dm-cell";
          if (marked[i] >= 0) cls += " paired";
          if (i === selCell) cls += " sel";
          h += `<div class="${cls}" data-i="${i}">${grid[i]}</div>`;
        }
        el.innerHTML = h;
        const p = root.querySelector("#dm-p"), m = root.querySelector("#dm-m");
        if (p) p.textContent = `${pairs}/${(H * W) / 2}`;
        if (m) m.textContent = mistakes;
      }

      root.querySelector("#dm-grid").addEventListener("click", e => {
        const c = e.target.closest("[data-i]");
        if (c) click(+c.dataset.i);
      });
      root.querySelector("#dm-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Dominosa",
        "The grid hides a full set of 21 dominoes (0-0 up to 6-6), each used exactly once." +
        "<br>Click two <b>adjacent</b> numbers to claim they form one domino — correct pairs lock green." +
        "<br>Deduce the rest by elimination: every cell belongs to exactly one domino, and no domino value-pair repeats.");
    },
  });
})();
