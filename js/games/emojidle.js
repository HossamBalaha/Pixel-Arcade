/* Emojidle — guess the word/phrase from a sequence of emoji clues. */
(function () {
  const PUZZLES = [
    {e: "🦁👑", a: "Lion King"},
    {e: "🕷️🕸️🖊️", a: "Charlotte's Web"},
    {e: "🐝🎬", a: "Bee Movie"},
    {e: "❄️👸", a: "Frozen"},
    {e: "🐠🔍", a: "Finding Nemo"},
    {e: "🐜🐜🐜🐜", a: "Antz"},
    {e: "🐭👨🍳", a: "Ratatouille"},
    {e: "🐠🐠🐠", a: "Finding Dory"},
    {e: "🦊🤝🐰", a: "Zootopia"},
    {e: "🐼🥋", a: "Kung Fu Panda"},
    {e: "🐲❤️", a: "Dragon Heart"},
    {e: "🤖❤️🌻", a: "Wall-E"},
    {e: "🚪🦁📚", a: "Chronicles of Narnia"},
    {e: "🧙‍♂️💍🌋", a: "Lord of the Rings"},
    {e: "⚡👓", a: "Harry Potter"},
    {e: "🦇🃏", a: "Batman"},
    {e: "🐜🦸", a: "Ant-Man"},
    {e: "🕷️🦸", a: "Spider-Man"},
    {e: "🔨⚡", a: "Thor"},
    {e: "🦸‍♂️🛡️", a: "Captain America"},
    {e: "🧛‍♂️🧛‍♂️🧛‍♂️", a: "Twilight"},
    {e: "🚢💔", a: "Titanic"},
    {e: "👻🔪", a: "Scream"},
    {e: "🦈👹", a: "Jaws"},
    {e: "🦖🏝️", a: "Jurassic Park"},
    {e: "👽📞", a: "ET"},
    {e: "🤖❌", a: "Terminator"},
    {e: "🌵🤠", a: "Rango"},
    {e: "🐢🦸", a: "Teenage Mutant Ninja Turtles"},
    {e: "🐷🐺", a: "Three Little Pigs"},
    {e: "👸🐸", a: "Princess and the Frog"},
    {e: "🏰 Beast🌹", a: "Beauty and the Beast"},
    {e: "🌹🦔", a: "Hedgehog"},
    {e: "🚿🔪👁️", a: "Psycho"},
    {e: "🦸‍♂️🪖", a: "Captain America"},
    {e: "🚢🧊", a: "Titanic"},
    {e: "👑💍🌋", a: "Lord of the Rings"},
    {e: "👧🏻🕵️", a: "Nancy Drew"},
    {e: "🦁🧙", a: "Chronicles of Narnia"},
    {e: "🏹👧🔥", a: "Hunger Games"},
    {e: "🎻🦇", a: "Dracula"},
    {e: "🐧🥜", a: "Peanut"},
    {e: "👨‍🚀⭐", a: "Toy Story"},
    {e: "🐜🦸", a: "Ant-Man"},
    {e: "🤠🚀", a: "Toy Story"},
    {e: "🎩🐰", a: "Alice in Wonderland"},
    {e: "🦄🌈", a: "My Little Pony"},
    {e: "🦖🗼", a: "Godzilla"},
    {e: "🍔🍟", a: "Fast Food"},
    {e: "🐍🐍🐍", a: "Anaconda"},
    {e: "🦈🌊", a: "Jaws"},
    {e: "👻👻", a: "Ghostbusters"},
    {e: "🧜‍♀️🧜‍♀️", a: "Little Mermaid"},
    {e: "🦸‍♀️⚓", a: "Aquaman"},
    {e: "🐰🥚", a: "Peter Rabbit"},
    {e: "🪄🧙‍♀️", a: "Harry Potter"},
    {e: "🏰👑", a: "Frozen"},
    {e: "🐉🥋", a: "Mulan"},
    {e: "🦊🔥", a: "Zootopia"},
    {e: "🧚‍♀️✨", a: "Tinkerbell"},
    {e: "🐲🐲", a: "How to Train Your Dragon"},
    {e: "🦕🕰️", a: "Land Before Time"},
    {e: "🎩🐀", a: "Pied Piper"},
    {e: "🪡👗", a: "Cinderella"},
    {e: "🐢🐢🍕", a: "Ninja Turtles"},
    {e: "🦇🦇🦇", a: "Dark Knight"},
    {e: "🐠🐠", a: "Finding Nemo"},
    {e: "🎅🎁", a: "Santa Claus"},
    {e: "🦝🚯", a: "Guardians of the Galaxy"},
    {e: "🧜‍♂️🌊", a: "Aquaman"},
    {e: "👑🏰❤️", a: "Frozen"},
    {e: "🥋🐼", a: "Kung Fu Panda"},
    {e: "🌋🦖", a: "Jurassic Park"},
    {e: "🌍🐘", a: "Madagascar"},
    {e: "🐝👦", a: "Bee Movie"},
    {e: "🐉📖", a: "Eragon"},
    {e: "🧙‍♀️🐕", a: "Wizard of Oz"},
    {e: "👑💔", a: "Princess Diaries"},
    {e: "🧛🧛", a: "Hotel Transylvania"},
  ];

  let live = null;
  GameRegistry.register({
    id: "emojidle",
    name: "Emojidle",
    icon: "🎭",
    category: "word",
    description: "Guess the phrase from emoji clues",
    tags: ["emoji", "movies", "guessing"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let cur = null, guesses = [], over = false, score = 0, idx = 0;
      const PER = 10;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ej-r">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ej-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ej-b">—</div></div>
        </div>
        <div class="status info" id="ej-status">Guess the phrase from these emoji clues.</div>
        <div id="ej-emoji" style="text-align:center;font-size:3rem;margin:18px 0;"></div>
        <div class="row" style="justify-content:center;gap:6px;">
          <input id="ej-input" placeholder="Your guess…" class="diff-btn" style="min-width:200px;text-transform:capitalize;" autocomplete="off" />
          <button class="btn primary" id="ej-go">Guess</button>
        </div>
        <div id="ej-hist" class="col" style="gap:4px;max-width:400px;margin:14px auto 0;"></div>
        <p class="hint">${PER} rounds. Each correct guess = 10 points. Typos ok — close spelling accepted.</p>
      `;
      const emojiEl = root.querySelector("#ej-emoji");
      const statusEl = root.querySelector("#ej-status");
      const inputEl = root.querySelector("#ej-input");
      const histEl = root.querySelector("#ej-hist");
      root.querySelector("#ej-b").textContent = Storage.getBest("emojidle") || "—";

      function normalize(s) {
        return s.toLowerCase().replace(/[^a-z0-9]/g, "");
      }

      function next() {
        if (idx >= PER) return finish();
        cur = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        guesses = [];
        over = false;
        emojiEl.textContent = cur.e;
        statusEl.textContent = "Guess the phrase!";
        statusEl.className = "status info";
        histEl.innerHTML = "";
        inputEl.value = "";
        inputEl.focus();
        root.querySelector("#ej-r").textContent = `${idx + 1}/${PER}`;
      }

      function guess() {
        if (over) return;
        const v = inputEl.value.trim();
        if (!v) return;
        guesses.push(v);
        AudioFX.flip();
        const correct = normalize(v) === normalize(cur.a);
        const row = document.createElement("div");
        row.style.cssText = "padding:6px 10px;background:var(--bg-elev);border-radius:var(--radius);font-family:var(--font-mono);";
        if (correct) {
          row.style.color = "var(--success)";
          row.textContent = `✓ ${v} → ${cur.a}`;
          histEl.prepend(row);
          score += 10;
          idx++;
          over = true;
          AudioFX.win();
          statusEl.textContent = "✓ Correct! +10";
          statusEl.className = "status win";
          root.querySelector("#ej-s").textContent = score;
          setTimeout(() => {
            if (!alive) return;
            if (!alive) return;
            if (alive) next();
          }, 1400);
        } else {
          row.style.color = "var(--text-muted)";
          row.textContent = `✗ ${v}`;
          histEl.prepend(row);
          statusEl.textContent = "Not quite — try again!";
          statusEl.className = "status lose";
          AudioFX.error();
          if (guesses.length >= 3) {
            over = true;
            idx++;
            statusEl.textContent = `Answer: ${cur.a}`;
            statusEl.className = "status lose";
            setTimeout(() => {
              if (!alive) return;
              if (!alive) return;
              if (alive) next();
            }, 1800);
          }
        }
        inputEl.value = "";
        inputEl.focus();
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}`;
        statusEl.className = "status win";
        emojiEl.textContent = "🎉";
        const best = Storage.getBest("emojidle");
        if (!best || score > best) {
          Storage.setBest("emojidle", score);
          root.querySelector("#ej-b").textContent = score;
          App.toast("New best: " + score, "success");
        }
        histEl.innerHTML = "";
        const again = document.createElement("button");
        again.className = "btn primary";
        again.textContent = "Play again";
        again.addEventListener("click", () => {
          score = 0;
          idx = 0;
          root.querySelector("#ej-s").textContent = 0;
          next();
        });
        histEl.appendChild(again);
      }

      root.querySelector("#ej-go").addEventListener("click", guess);
      inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") guess();
      });

      live = {};
      next();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Emojidle",
        `Each round you'll see a sequence of emoji clues. Type the phrase (usually a movie or story title) you think they represent.
        <br><br>You get up to <b>3 guesses</b> per round. Each correct answer = <b>10 points</b>.
        <br><br>Spelling doesn't need to be perfect — punctuation and case are ignored. ${10} rounds per game.`);
    },
  });
})();
