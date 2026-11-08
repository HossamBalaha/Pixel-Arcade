/* Memory Match — flip cards to find pairs */
(function () {
  const DECKS = {
    classic: {
      label: "Classic",
      emojis: ["🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🦄", "🐙", "🦋", "🐝", "🐞", "🐢", "🦖", "🐳", "🐬", "🦩", "🔥", "⭐", "🌈", "🍕", "🎮", "🎸", "🎨", "🚀"]
    },
    animals: {
      label: "Animals",
      emojis: ["\\ud83e\\udd81", "\\ud83d\\udc2f", "\\ud83d\\udc18", "\\ud83e\\udd92", "\\ud83e\\udd93", "\\ud83e\\udd8c", "\\ud83d\\udc2a", "\\ud83e\\udd98", "\\ud83e\\udda5", "\\ud83e\\udda6", "\\ud83e\\udd87", "\\ud83d\\udc3f\\ufe0f", "\\ud83e\\udd94", "\\ud83d\\udc30", "\\ud83d\\udc2d", "\\ud83d\\udc3c"]
    },
    color: {
      label: "Colors",
      emojis: ["\\ud83d\\udd34", "\\ud83d\\udfe0", "\\ud83d\\udfe1", "\\ud83d\\udfe2", "\\ud83d\\udd35", "\\ud83d\\udfe3", "\\u26ab", "\\u26aa", "\\ud83d\\udfe4", "\\ud83d\\udd3a", "\\ud83d\\udd38", "\\ud83d\\udd39", "\\u2663\\ufe0f", "\\u2665\\ufe0f", "\\u2666\\ufe0f", "\\u2660\\ufe0f"]
    },
    flag: {
      label: "Flags",
      emojis: ["\\ud83c\\uddfa\\ud83c\\uddf8", "\\ud83c\\uddec\\ud83c\\udde7", "\\ud83c\\uddeb\\ud83c\\uddf7", "\\ud83c\\udde9\\ud83c\\uddea", "\\ud83c\\uddef\\ud83c\\uddf5", "\\ud83c\\uddee\\ud83c\\uddf3", "\\ud83c\\udde8\\ud83c\\uddf3", "\\ud83c\\uddee\\ud83c\\uddf9", "\\ud83c\\uddea\\ud83c\\uddf8", "\\ud83c\\uddf2\\ud83c\\uddfd", "\\ud83c\\udde7\\ud83c\\uddf7", "\\ud83c\\udde8\\ud83c\\udde6", "\\ud83c\\uddf7\\ud83c\\uddfa", "\\ud83c\\uddf0\\ud83c\\uddf7", "\\ud83c\\udde6\\ud83c\\uddfa", "\\ud83c\\uddea\\ud83c\\uddec"]
    },
    food: {
      label: "Food",
      emojis: ["\\ud83c\\udf55", "\\ud83c\\udf54", "\\ud83c\\udf2e", "\\ud83c\\udf2f", "\\ud83c\\udf5c", "\\ud83c\\udf5d", "\\ud83c\\udf63", "\\ud83c\\udf71", "\\ud83c\\udf64", "\\ud83e\\udd5f", "\\ud83e\\udd58", "\\ud83e\\udd57", "\\ud83e\\udd59", "\\ud83e\\udd53", "\\ud83e\\udd69", "\\ud83c\\udf73"]
    },
    fruit: {
      label: "Fruit",
      emojis: ["\\ud83c\\udf4e", "\\ud83c\\udf50", "\\ud83c\\udf4a", "\\ud83c\\udf4b", "\\ud83c\\udf4c", "\\ud83c\\udf49", "\\ud83c\\udf47", "\\ud83c\\udf53", "\\ud83e\\uded0", "\\ud83c\\udf48", "\\ud83c\\udf52", "\\ud83c\\udf51", "\\ud83e\\udd6d", "\\ud83c\\udf4d", "\\ud83e\\udd65", "\\ud83e\\udd5d"]
    },
    instrument: {
      label: "Instruments",
      emojis: ["\\ud83c\\udfb8", "\\ud83c\\udfb9", "\\ud83c\\udfba", "\\ud83c\\udfbb", "\\ud83e\\udd41", "\\ud83c\\udfb7", "\\ud83e\\ude95", "\\ud83e\\ude97", "\\ud83c\\udfa4", "\\ud83c\\udfa7", "\\ud83c\\udfbc", "\\ud83e\\ude98", "\\ud83d\\udcef", "\\ud83e\\ude88", "\\ud83e\\ude89", "\\ud83d\\udd14"]
    },
    myth: {
      label: "Mythology",
      emojis: ["\\ud83d\\udc09", "\\ud83e\\udd84", "\\ud83e\\udddc\\u200d\\u2640\\ufe0f", "\\ud83e\\uddde", "\\ud83e\\uddde\\u200d\\u2642\\ufe0f", "\\ud83e\\uddda", "\\ud83e\\uddda\\u200d\\u2640\\ufe0f", "\\ud83d\\udc79", "\\ud83d\\udc7a", "\\ud83d\\udc7b", "\\ud83d\\udc80", "\\u2620\\ufe0f", "\\ud83d\\udc7d", "\\ud83e\\udd16", "\\ud83c\\udf83", "\\ud83e\\udddf"]
    },
    place: {
      label: "Places",
      emojis: ["\\ud83c\\udfdb\\ufe0f", "\\ud83c\\udfef", "\\ud83c\\udff0", "\\ud83d\\uddfc", "\\ud83d\\uddfd", "\\u26f2", "\\ud83c\\udf09", "\\ud83c\\udf03", "\\ud83c\\udf0c", "\\ud83c\\udf20", "\\ud83c\\udf0b", "\\u26f0\\ufe0f", "\\ud83c\\udfd4\\ufe0f", "\\ud83d\\uddfb", "\\ud83c\\udfdc\\ufe0f", "\\ud83c\\udfdd\\ufe0f"]
    },
    sport: {
      label: "Sports",
      emojis: ["\\u26bd", "\\ud83c\\udfc0", "\\ud83c\\udfc8", "\\u26be", "\\ud83e\\udd4e", "\\ud83c\\udfbe", "\\ud83c\\udfd0", "\\ud83c\\udfc9", "\\ud83e\\udd4f", "\\ud83c\\udfb1", "\\ud83c\\udfd3", "\\ud83c\\udff8", "\\ud83e\\udd45", "\\ud83c\\udfd2", "\\ud83c\\udfd1", "\\ud83e\\udd4d"]
    },
    symbol: {
      label: "Symbols",
      emojis: ["\\u2764\\ufe0f", "\\ud83d\\udc9a", "\\ud83d\\udc99", "\\ud83d\\udc9b", "\\ud83e\\udde1", "\\ud83d\\udc9c", "\\ud83d\\udda4", "\\ud83e\\udd0d", "\\ud83e\\udd0e", "\\ud83d\\udc94", "\\ud83d\\udc95", "\\ud83d\\udc9e", "\\ud83d\\udc93", "\\ud83d\\udc97", "\\ud83d\\udc96", "\\ud83d\\udc9d"]
    },
    transport: {
      label: "Transport",
      emojis: ["\\ud83d\\ude97", "\\ud83d\\ude95", "\\ud83d\\ude99", "\\ud83d\\ude8c", "\\ud83d\\ude8e", "\\ud83c\\udfce\\ufe0f", "\\ud83d\\ude93", "\\ud83d\\ude91", "\\ud83d\\ude92", "\\ud83d\\ude90", "\\ud83d\\ude9a", "\\ud83d\\ude9b", "\\ud83d\\ude9c", "\\ud83d\\udef5", "\\ud83d\\udeb2", "\\ud83d\\ude82"]
    },
    veggies: {
      label: "Veggies",
      emojis: ["\\ud83e\\udd55", "\\ud83e\\udd6c", "\\ud83e\\udd66", "\\ud83e\\udd52", "\\ud83e\\udd54", "\\ud83c\\udf60", "\\ud83e\\uddc5", "\\ud83e\\uddc4", "\\ud83c\\udf3d", "\\ud83c\\udf45", "\\ud83e\\uded1", "\\ud83e\\udd52", "\\ud83e\\udd51", "\\ud83e\\udd57", "\\ud83e\\udd58", "\\ud83c\\udf46"]
    },
    weather: {
      label: "Weather",
      emojis: ["\\u2600\\ufe0f", "\\ud83c\\udf24\\ufe0f", "\\u26c5", "\\ud83c\\udf25\\ufe0f", "\\u2601\\ufe0f", "\\ud83c\\udf26\\ufe0f", "\\ud83c\\udf27\\ufe0f", "\\u26c8\\ufe0f", "\\ud83c\\udf29\\ufe0f", "\\ud83c\\udf28\\ufe0f", "\\u2744\\ufe0f", "\\ud83c\\udf2c\\ufe0f", "\\ud83d\\udca8", "\\ud83c\\udf2a\\ufe0f", "\\ud83c\\udf2b\\ufe0f", "\\u2614"]
    },
  };
  const DECK_IDS = Object.keys(DECKS);

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
    description: "Flip cards and find all the matching pairs — 14 themed decks",
    tags: ["memory", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let cards = [], first = null, lock = false, moves = 0, matches = 0, totalPairs = 8, started = false,
        startTime = 0;
      let level = "easy"; // easy=4x3 (6 pairs), med=4x4 (8), hard=6x4 (12)
      let deck = "classic";
      let flipTimer = null;

      const LAYOUTS = {
        easy: {cols: 4, rows: 3, pairs: 6},
        medium: {cols: 4, rows: 4, pairs: 8},
        hard: {cols: 6, rows: 4, pairs: 12},
      };

      function newGame() {
        const L = LAYOUTS[level];
        totalPairs = L.pairs;
        const pool = shuffle(DECKS[deck].emojis.slice()).slice(0, L.pairs);
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
        <div class="row" style="justify-content:center; margin-top:6px;">
          <label for="mem-deck" style="font-size:.85rem; opacity:.8;">Deck:</label>
          <select id="mem-deck" style="background:var(--bg-elev); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:4px 8px; font-size:.85rem;"></select>
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
            const key = "memory_" + level + "_" + deck;
            const best = Storage.getBest(key);
            const score = moves; // lower is better
            if (!best || score < best) {
              Storage.setBest(key, score);
              App.toast("New best (" + level + ", " + DECKS[deck].label + "): " + moves + " moves!", "success");
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

      const deckSel = root.querySelector("#mem-deck");
      DECK_IDS.forEach(d => {
        const o = document.createElement("option");
        o.value = d;
        o.textContent = DECKS[d].label;
        if (d === deck) o.selected = true;
        deckSel.appendChild(o);
      });
      deckSel.addEventListener("change", () => {
        AudioFX.click();
        deck = deckSel.value;
        newGame();
      });

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
