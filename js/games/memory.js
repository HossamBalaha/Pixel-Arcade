/* Memory Match — flip cards to find pairs */
(function () {
  const EMOJIS = ["🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🦄", "🐙", "🦋", "🐝", "🐞", "🐢", "🦖", "🐳", "🐬", "🦩", "🔥", "⭐", "🌈", "🍕", "🎮", "🎸", "🎨", "🚀"];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  GameRegistry.register({
    id: "memory",
    name: "Memory Match",
    icon: "🃏",
    category: "logic",
    description: "Flip cards and find all the matching pairs",
    tags: ["memory", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let cards = [], first = null, lock = false, moves = 0, matches = 0, totalPairs = 8, started = false,
        startTime = 0;
      let level = "easy"; // easy=4x3 (6 pairs), med=4x4 (8), hard=6x4 (12)
      let flipTimer = null;

      const LAYOUTS = {
        easy: {cols: 4, rows: 3, pairs: 6},
        medium: {cols: 4, rows: 4, pairs: 8},
        hard: {cols: 6, rows: 4, pairs: 12},
      };

      function newGame() {
        const L = LAYOUTS[level];
        totalPairs = L.pairs;
        const pool = shuffle(EMOJIS.slice()).slice(0, L.pairs);
        cards = shuffle(pool.concat(pool)).map((emoji, i) => ({i, emoji, flipped: false, matched: false}));
        first = null;
        lock = false;
        moves = 0;
        matches = 0;
        started = false;
        startTime = 0;
        render();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;">
          <div class="difficulty" id="mem-diff">
            <button class="diff-btn ${level === "easy" ? "active" : ""}" data-l="easy">Easy</button>
            <button class="diff-btn ${level === "medium" ? "active" : ""}" data-l="medium">Med</button>
            <button class="diff-btn ${level === "hard" ? "active" : ""}" data-l="hard">Hard</button>
          </div>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="mem-moves">0</div></div>
          <div class="score-cell"><div class="label">Pairs</div><div class="val" id="mem-pairs">0 / 0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="mem-time">0s</div></div>
        </div>
        <div class="status info" id="mem-status">Find all the matching pairs!</div>
        <div id="mem-board"></div>
      `;

      const boardEl = root.querySelector("#mem-board");
      const statusEl = root.querySelector("#mem-status");
      let timerInterval = null;

      function render() {
        const L = LAYOUTS[level];
        boardEl.innerHTML = "";
        const grid = document.createElement("div");
        grid.className = "mem-grid";
        grid.style.gridTemplateColumns = `repeat(${L.cols}, 1fr)`;
        grid.style.width = (L.cols * 80) + "px";
        grid.style.maxWidth = "100%";
        cards.forEach(card => {
          const el = document.createElement("div");
          el.className = "mem-card" + (card.flipped ? " flipped" : "") + (card.matched ? " matched" : "");
          el.innerHTML = `<div class="mem-inner">
            <div class="mem-face mem-front">?</div>
            <div class="mem-face mem-back">${card.emoji}</div>
          </div>`;
          el.addEventListener("click", () => flip(card));
          grid.appendChild(el);
        });
        boardEl.appendChild(grid);

        root.querySelector("#mem-moves").textContent = moves;
        root.querySelector("#mem-pairs").textContent = `${matches} / ${totalPairs}`;
      }

      function flip(card) {
        if (lock || card.matched || card.flipped) return;
        if (!started) {
          started = true;
          startTime = Date.now();
          startTimer();
        }
        card.flipped = true;
        AudioFX.flip();
        render();
        if (!first) {
          first = card;
          return;
        }
        // Second card
        moves++;
        if (first.emoji === card.emoji) {
          // Match
          first.matched = true;
          card.matched = true;
          first = null;
          matches++;
          AudioFX.pop();
          if (matches === totalPairs) {
            const secs = Math.floor((Date.now() - startTime) / 1000);
            clearInterval(timerInterval);
            statusEl.textContent = `🎉 Won in ${moves} moves and ${secs}s!`;
            statusEl.className = "status win";
            AudioFX.win();
            const key = "memory_" + level;
            const best = Storage.getBest(key);
            const score = moves; // lower is better
            if (!best || score < best) {
              Storage.setBest(key, score);
              App.toast("New best for " + level + " difficulty: " + moves + " moves!", "success");
            }
          } else {
            statusEl.textContent = "Match! Find the next pair";
            statusEl.className = "status info";
          }
          render();
        } else {
          // No match
          lock = true;
          statusEl.textContent = "No match — try again";
          statusEl.className = "status";
          AudioFX.error();
          flipTimer = setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (!alive) return;
            first.flipped = false;
            card.flipped = false;
            first = null;
            lock = false;
            render();
          }, 800);
        }
      }

      function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          const secs = Math.floor((Date.now() - startTime) / 1000);
          root.querySelector("#mem-time").textContent = secs + "s";
        }, 200);
      }

      root.querySelectorAll("#mem-diff .diff-btn").forEach(b => b.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#mem-diff .diff-btn").forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        level = b.dataset.l;
        newGame();
      }));

      newGame();
      return function cleanup() {
        alive = false;
        clearInterval(timerInterval);
        if (flipTimer) clearTimeout(flipTimer);
      };
    },
    help: function () {
      App.showModal("How to play Memory Match",
        `Flip two cards at a time. If the emojis match, they stay face up.
        <br>If they don't, they flip back. Match all pairs to win.
        <br><br>Try to win in as few moves and as little time as possible.
        <br><b>Easy</b>: 6 pairs (4×3). <b>Medium</b>: 8 pairs (4×4). <b>Hard</b>: 12 pairs (6×4).
        <br>Best score is tracked per difficulty.`);
    },
  });
})();
