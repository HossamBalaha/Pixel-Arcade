/* 2048 — slide tiles to combine numbers, reach 2048.
   Board size is a variant: 3×3 Blitz / Classic 4×4 / 5×5 Marathon —
   selected from the game-header dropdown, persisted per player. */
(function () {
  let SIZE = 4; // set at mount from the stored variant

  function newBoard() {
    const b = Array(SIZE * SIZE).fill(0);
    addTile(b);
    addTile(b);
    return b;
  }

  function addTile(b) {
    const empty = [];
    for (let i = 0; i < SIZE * SIZE; i++) if (!b[i]) empty.push(i);
    if (empty.length === 0) return false;
    const i = empty[Math.floor(Math.random() * empty.length)];
    b[i] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function rows(b) {
    return Array.from({length: SIZE}, (_, r) => b.slice(r * SIZE, r * SIZE + SIZE));
  }

  function cols(b) {
    return Array.from({length: SIZE}, (_, c) =>
      Array.from({length: SIZE}, (_, k) => b[c + k * SIZE]));
  }

  function slide(line) {
    const a = line.filter(x => x);
    const out = [];
    let score = 0;
    for (let i = 0; i < a.length; i++) {
      if (i + 1 < a.length && a[i] === a[i + 1]) {
        out.push(a[i] * 2);
        score += a[i] * 2;
        i++;
      } else out.push(a[i]);
    }
    while (out.length < SIZE) out.push(0);
    return {line: out, score};
  }

  function move(b, dir) {
    let score = 0, moved = false;
    const newB = Array(SIZE * SIZE).fill(0);
    const apply = (idxs, line) => {
      const r = slide(line);
      r.line.forEach((v, i) => {
        newB[idxs[i]] = v;
        if (v !== b[idxs[i]]) moved = true;
      });
      score += r.score;
    };
    const rowIdxs = r => Array.from({length: SIZE}, (_, k) => r * SIZE + k);
    const colIdxs = c => Array.from({length: SIZE}, (_, k) => c + k * SIZE);
    if (dir === "left") rows(b).forEach((row, r) => apply(rowIdxs(r), row));
    if (dir === "right") rows(b).forEach((row, r) => apply(rowIdxs(r).slice().reverse(), row.slice().reverse()));
    if (dir === "up") cols(b).forEach((col, c) => apply(colIdxs(c), col));
    if (dir === "down") cols(b).forEach((col, c) => apply(colIdxs(c).slice().reverse(), col.slice().reverse()));
    return {board: newB, score, moved};
  }

  function canMove(b) {
    for (let i = 0; i < 4; i++) {
      if (move(b, ["left", "right", "up", "down"][i]).moved) return true;
    }
    return false;
  }

  function maxTile(b) {
    return Math.max.apply(null, b);
  }

  GameRegistry.register({
    id: "2048",
    name: "2048",
    icon: "🔢",
    category: "logic",
    description: "Combine matching tiles to reach 2048",
    tags: ["puzzle", "keyboard", "popular"],
    variants: [
      {key: "4", label: "Classic 4×4"},
      {key: "3", label: "3×3 Blitz"},
      {key: "5", label: "5×5 Marathon"},
    ],
    mount: function (root, {App, AudioFX, Storage}) {
      let b, score, best;
      // Variant: board size from the persisted choice.
      SIZE = parseInt(Storage.getVariant("2048", "4"), 10) || 4;

      function init() {
        b = newBoard();
        score = 0;
        best = Storage.getBest("2048") || 0;
        render();
      }

      function doMove(dir) {
        const r = move(b, dir);
        if (!r.moved) return;
        b = r.board;
        score += r.score;
        addTile(b);
        AudioFX.move();
        render();
        if (maxTile(b) === 2048 && !wonShown) {
          wonShown = true;
          App.toast("🎉 You reached 2048!", "success");
          AudioFX.win();
        }
        if (!canMove(b)) {
          AudioFX.lose();
          statusEl.textContent = "Game over! Final score: " + score;
          statusEl.className = "status lose";
          if (score > best) {
            Storage.setBest("2048", score);
            best = score;
            App.toast("New best! " + score, "success");
          }
        }
        if (score > best) {
          best = score;
          Storage.setBest("2048", score);
        }
      }

      let wonShown = false;
      let statusEl, boardEl;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="g-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="g-best">0</div></div>
          <div class="score-cell"><div class="label">Max</div><div class="val" id="g-max">2</div></div>
        </div>
        <div class="status" id="g-status">Combine tiles to reach 2048</div>
        <div class="t-2048" id="g-board"></div>
        <p class="hint">Use <b>arrow keys</b> or <b>WASD</b>. On mobile, swipe.</p>
        <div class="dpad" id="g-dpad">
          <button class="up">↑</button>
          <button class="left">←</button>
          <button class="right">→</button>
          <button class="down">↓</button>
        </div>
      `;

      boardEl = root.querySelector("#g-board");
      statusEl = root.querySelector("#g-status");

      function render() {
        boardEl.innerHTML = "";
        boardEl.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
        b.forEach(v => {
          const t = document.createElement("div");
          t.className = "tile-2048";
          if (v) {
            t.dataset.v = v;
            t.textContent = v;
          }
          boardEl.appendChild(t);
        });
        root.querySelector("#g-score").textContent = score;
        root.querySelector("#g-best").textContent = best;
        root.querySelector("#g-max").textContent = maxTile(b) || 2;
      }

      function onKey(e) {
        const map = {
          ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
          a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down"
        };
        const dir = map[e.key];
        if (dir) {
          e.preventDefault();
          doMove(dir);
        }
      }

      document.addEventListener("keydown", onKey);

      // D-pad
      root.querySelectorAll("#g-dpad button").forEach(btn => {
        btn.addEventListener("click", () => {
          const cls = btn.className;
          const dir = {up: "up", down: "down", left: "left", right: "right"}[cls];
          doMove(dir);
        });
      });

      // Swipe
      let ts = null;
      boardEl.addEventListener("touchstart", e => {
        ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      }, {passive: true});
      boardEl.addEventListener("touchend", e => {
        if (!ts) return;
        const dx = e.changedTouches[0].clientX - ts.x;
        const dy = e.changedTouches[0].clientY - ts.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (Math.abs(dx) > 20) doMove(dx > 0 ? "right" : "left");
        } else {
          if (Math.abs(dy) > 20) doMove(dy > 0 ? "down" : "up");
        }
        ts = null;
      });

      init();
      return function cleanup() {
        document.removeEventListener("keydown", onKey);
      };
    },
    help: function () {
      App.showModal("How to play 2048",
        `Use the arrow keys (or WASD, or swipe on touch screens) to slide all tiles.
        <br><br>When two tiles with the same number touch, they merge into one tile with double the value.
        <br>Keep merging to reach the <b>2048</b> tile — but you can keep going past it!
        <br><br>Game ends when no moves are possible.`);
    },
  });
})();
