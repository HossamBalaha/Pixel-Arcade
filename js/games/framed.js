/* Movie Emoji (Framed) — guess the movie title from emoji clues, 6 tries */
(function () {
  // 30 inline movies with up to 5 emojis each.
  const MOVIES = [
    {title: "Jaws", emojis: "🦈🌊👶🦷🩸"},
    {title: "The Lion King", emojis: "🦁👑🌍🐗💔"},
    {title: "Titanic", emojis: "🚢❄️💔💧💍"},
    {title: "Frozen", emojis: "❄️⛄👭🏰🎤"},
    {title: "Snow White", emojis: "🍎👸🌲👹💋"},
    {title: "The Matrix", emojis: "💊💻🕶️🤖📞"},
    {title: "Star Wars", emojis: "⭐⚔️🚀🤖👽"},
    {title: "Toy Story", emojis: "🤠🚀🦖🧸🪀"},
    {title: "Finding Nemo", emojis: "🐠🌊🐟👨‍🏫🎒"},
    {title: "Up", emojis: "🎈🏠🐕👴🦤"},
    {title: "Wall-E", emojis: "🤖🗑️🌱❤️🚀"},
    {title: "Coco", emojis: "💀🎸🌼🐶👨‍🎤"},
    {title: "Aladdin", emojis: "🧞🪔🧹🐒👸"},
    {title: "Beauty and the Beast", emojis: "🌹👹🏰📚❤️"},
    {title: "The Little Mermaid", emojis: "🧜‍♀️🦀🌊💍🦞"},
    {title: "Mulan", emojis: "⚔️🌸🗡️🎎🐉"},
    {title: "Tangled", emojis: "💇‍♀️🎯🏰🚣✨"},
    {title: "Brave", emojis: "🏹👩‍🦰🐻👑🐎"},
    {title: "Moana", emojis: "🌊🚣🏝️🐔🧭"},
    {title: "Zootopia", emojis: "🦊🐰👮🦷🏙️"},
    {title: "Inside Out", emojis: "🧠😀😢😡😱"},
    {title: "The Incredibles", emojis: "👨‍👩‍👧‍👦🦸💪💥🦸‍♀️"},
    {title: "Ratatouille", emojis: "🐀👨‍🍳🍲🇫🇷🥖"},
    {title: "Cars", emojis: "🏎️🚗🏁⛽🛞"},
    {title: "Shrek", emojis: "🟢👹🐴🐉🏰"},
    {title: "Kung Fu Panda", emojis: "🐼🥋🍜🥢🐉"},
    {title: "How to Train Your Dragon", emojis: "🐉🦴🪓⚔️🔥"},
    {title: "The Avengers", emojis: "🦸🦸🦸🛡️💥"},
    {title: "Harry Potter", emojis: "🧙⚡🦉📚🪄"},
    {title: "Spider-Man", emojis: "🕷️🦸🕸️🏙️💥"},
  ];

  const MAX = 6;
  const MAX_HINTS = 2;

  // Split a string of emojis into grapheme clusters so multi-codepoint
  // emojis (ZWJ sequences like 👨‍👩‍👧‍👦, flag pairs like 🇫🇷, emoji with
  // variation selectors like 🕷️) are NOT broken apart.
  let _segmenter = null;

  function splitEmojis(str) {
    if (!str) return [];
    try {
      if (!_segmenter && typeof Intl !== "undefined" && Intl.Segmenter) {
        _segmenter = new Intl.Segmenter("en", {granularity: "grapheme"});
      }
      if (_segmenter) {
        return Array.from(_segmenter.segment(str), s => s.segment);
      }
    } catch (e) { /* fall through */
    }
    // Fallback: Array.from at least keeps surrogate pairs together.
    return Array.from(str);
  }

  function normalize(s) {
    return s.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w && !["the", "a", "an"].includes(w))
      .join(" ")
      .trim();
  }

  let live = null;

  GameRegistry.register({
    id: "framed",
    name: "Movie Emoji",
    icon: "🎬",
    category: "word",
    description: "Guess the movie title from emoji clues — 6 tries",
    tags: ["movie", "word", "variant"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      let movie = null;
      let movieEmojis = []; // grapheme-cluster array of the movie's emojis
      let guesses = []; // [string]
      let revealedCount = 0;
      let over = false;
      let revealed = false;
      let hintsUsed = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Try</div><div class="val" id="fm-try">0</div></div>
          <div class="score-cell"><div class="label">Max</div><div class="val">${MAX}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fm-best">—</div></div>
        </div>
        <div class="status info" id="fm-status">Guess the movie from the emojis — 6 tries</div>
        <div id="fm-emojis" style="text-align:center;font-size:3rem;letter-spacing:0.3em;padding:24px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);min-height:96px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <input id="fm-input" type="text" autocomplete="off" placeholder="Type your guess…"
            style="padding:10px 14px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;flex:1;max-width:280px;" />
          <button class="btn primary" id="fm-submit">Guess</button>
        </div>
        <div class="col" id="fm-past" style="gap:6px;"></div>
        <p class="hint">Each wrong guess reveals one more emoji. <b>Hint</b> (max 2) reveals another. Match is case-insensitive (ignore "the", "a", punctuation).</p>
      `;

      const statusEl = root.querySelector("#fm-status");
      const emojiEl = root.querySelector("#fm-emojis");
      const inputEl = root.querySelector("#fm-input");
      const pastEl = root.querySelector("#fm-past");

      function renderEmojis() {
        const shown = movieEmojis.slice(0, revealedCount).join("");
        emojiEl.textContent = shown || "🎬";
      }

      function renderPast() {
        pastEl.innerHTML = "";
        for (const g of guesses) {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "space-between";
          row.style.padding = "8px 12px";
          row.style.background = "var(--bg-elev)";
          row.style.border = "1px solid var(--border)";
          row.style.borderRadius = "var(--radius-sm)";
          row.innerHTML = `<span>${g}</span><span style="color:var(--danger);">✗</span>`;
          pastEl.appendChild(row);
        }
      }

      function submitGuess() {
        if (over) return;
        const raw = inputEl.value.trim();
        if (!raw) return;
        inputEl.value = "";
        const guessNorm = normalize(raw);
        const targetNorm = normalize(movie.title);
        guesses.push(raw);
        AudioFX.flip();
        root.querySelector("#fm-try").textContent = guesses.length;
        renderPast();

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed: ${movie.title}`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (guessNorm === targetNorm && guessNorm !== "") {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}! It's "${movie.title}".`;
          statusEl.className = "status win";
          AudioFX.win();
          // Show all emojis
          revealedCount = movieEmojis.length;
          renderEmojis();
          const best = Storage.getBest("framed");
          if (!best || guesses.length < best) {
            Storage.setBest("framed", guesses.length);
            root.querySelector("#fm-best").textContent = guesses.length;
            App.toast("New best: " + guesses.length + " tries", "success");
          }
          return;
        }
        // Wrong guess — reveal one more emoji
        if (revealedCount < movieEmojis.length) {
          revealedCount++;
          AudioFX.reveal();
          renderEmojis();
        } else {
          AudioFX.error();
        }
        if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `Out of tries. The movie was "${movie.title}".`;
          statusEl.className = "status lose";
          AudioFX.lose();
          revealedCount = movieEmojis.length;
          renderEmojis();
        } else {
          const remaining = MAX - guesses.length;
          const moreEmojis = movieEmojis.length - revealedCount;
          statusEl.textContent = `Wrong. ${remaining} ${remaining === 1 ? "try" : "tries"} left${moreEmojis > 0 ? `, ${moreEmojis} more emoji${moreEmojis === 1 ? "" : "s"} to reveal` : ""}.`;
        }
      }

      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitGuess();
        }
      });
      root.querySelector("#fm-submit").addEventListener("click", submitGuess);

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        if (revealedCount >= movieEmojis.length) {
          App.toast("All emojis already revealed", "info");
          return;
        }
        hintsUsed++;
        revealedCount++;
        AudioFX.reveal();
        renderEmojis();
        App.toast("Hint: revealed one more emoji", "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        revealedCount = movieEmojis.length;
        renderEmojis();
        statusEl.textContent = `Solution revealed: "${movie.title}"`;
        statusEl.className = "status lose";
        App.showModal("Movie Emoji solution", `The movie was: <b>${movie.title}</b><br><br><span style="font-size:2rem;">${movieEmojis.join(" ")}</span>`);
      }

      function newGame() {
        movie = MOVIES[Math.floor(Math.random() * MOVIES.length)];
        movieEmojis = splitEmojis(movie.emojis);
        guesses = [];
        revealedCount = Math.min(3, movieEmojis.length);
        over = false;
        revealed = false;
        hintsUsed = 0;
        root.querySelector("#fm-try").textContent = "0";
        const best = Storage.getBest("framed");
        root.querySelector("#fm-best").textContent = best || "—";
        statusEl.textContent = "Guess the movie from the emojis — 6 tries";
        statusEl.className = "status info";
        renderEmojis();
        renderPast();
        inputEl.focus();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Movie Emoji",
        `Guess the hidden movie title from its emoji clues. You have <b>6 tries</b>.
        <br><br>Each round starts with <b>3 emojis</b> shown. Type a guess into the input and hit <b>Enter</b> or click <b>Guess</b>.
        <br><br>If your guess is wrong, <b>one more emoji</b> is revealed (up to all 5 emojis).
        <br><br>Matching is case-insensitive and ignores <b>the</b>, <b>a</b>, <b>an</b>, and punctuation — so "The Lion King", "lion king", and "Lion, King" all match.
        <br><br>Stuck? Use the <b>Hint</b> button (max 2 — reveals one more emoji) or <b>Solve</b> (reveals the title and ends the game as a loss).
        <br><br>Best score = fewest guesses, tracked across sessions.`);
    },
  });
})();
