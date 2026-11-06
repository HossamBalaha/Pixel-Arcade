/* Hangman Reverse — you ARE the hangman. AI picks a word from a category; you guess letters. AI reveals correct/incorrect. */
(function () {
  // categories with word lists
  const CATS = {
    animals: ["ELEPHANT", "GIRAFFE", "PENGUIN", "DOLPHIN", "KANGAROO", "OCTOPUS", "CHEETAH", "LEOPARD", "RACCOON", "SQUIRREL"],
    countries: ["BRAZIL", "CANADA", "FRANCE", "GERMANY", "JAPAN", "MOROCCO", "NORWAY", "PERU", "SWEDEN", "VIETNAM"],
    fruits: ["APPLE", "BANANA", "CHERRY", "MANGO", "ORANGE", "PEACH", "PLUM", "STRAWBERRY", "WATERMELON", "PINEAPPLE"],
    sports: ["SOCCER", "TENNIS", "HOCKEY", "CRICKET", "BASEBALL", "VOLLEYBALL", "SWIMMING", "BOXING", "RUGBY", "GOLF"],
    instruments: ["GUITAR", "VIOLIN", "PIANO", "DRUMS", "FLUTE", "HARP", "TRUMPET", "CLARINET", "SAXOPHONE", "TROMBONE"],
    planets: ["MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE"],
    colors: ["CRIMSON", "INDIGO", "MAGENTA", "TURQUOISE", "LAVENDER", "MAROON", "CORAL", "SAFFRON", "TEAL", "IVORY"],
  };
  let live = null;

  function pickWord(cat) {
    return cat[Math.floor(Math.random() * cat.length)];
  }

  GameRegistry.register({
    id: "hangmanreverse",
    name: "Hangman Reverse",
    icon: "🔄",
    category: "word",
    description: "You're the hangman — guess the AI's hidden word",
    tags: ["word", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let category, word, guessed, wrong, over, won, score, streak;
      const MAX_WRONG = 6;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="hr-wins">0</div></div>
          <div class="score-cell"><div class="label">Losses</div><div class="val" id="hr-losses">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="hr-streak">0</div></div>
        </div>
        <div class="status info" id="hr-status">Guess letters to reveal the AI's word</div>
        <div class="text-muted text-sm center" id="hr-cat" style="margin-top:6px;"></div>
        <div id="hr-word" style="text-align:center;font-family:var(--font-mono);font-size:1.6rem;letter-spacing:0.3em;font-weight:700;margin:10px 0;"></div>
        <div class="center" id="hr-hangman" style="margin:8px 0;"></div>
        <div id="hr-kb" class="hr-keyboard"></div>
        <p class="hint">Type a letter or tap a key. <b>R</b> for new word.</p>
      `;
      // Inject QWERTY keyboard styles once
      if (!document.getElementById("hm-kb-style")) {
        const s = document.createElement("style");
        s.id = "hm-kb-style";
        s.textContent = `
          .hm-keyboard, .hr-keyboard { display: flex; flex-direction: column; gap: 6px; align-items: center; margin-top: 12px; }
          .hm-keyboard .kb-row, .hr-keyboard .kb-row { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
        `;
        document.head.appendChild(s);
      }
      const statusEl = root.querySelector("#hr-status");
      const wordEl = root.querySelector("#hr-word");
      const catEl = root.querySelector("#hr-cat");
      const hmEl = root.querySelector("#hr-hangman");
      const kbEl = root.querySelector("#hr-kb");
      score = {wins: 0, losses: 0};
      streak = 0;

      function newGame() {
        const keys = Object.keys(CATS);
        const catKey = keys[Math.floor(Math.random() * keys.length)];
        category = CATS[catKey];
        catEl.textContent = "Category: " + catKey.charAt(0).toUpperCase() + catKey.slice(1);
        word = pickWord(category);
        guessed = new Set();
        wrong = 0;
        over = false;
        won = false;
        statusEl.textContent = "Guess letters to reveal the AI's word";
        statusEl.className = "status info";
        render();
      }

      function render() {
        wordEl.textContent = word.split("").map(c => guessed.has(c) ? c : "_").join(" ");
        // hangman drawing as text/emoji
        const stages = ["🙂", "😐", "🙁", "😨", "😱", "😵", "💀"];
        hmEl.textContent = stages[Math.min(wrong, stages.length - 1)] + "  (" + wrong + "/" + MAX_WRONG + ")";
        // keyboard — QWERTY layout (horizontal rows)
        kbEl.innerHTML = "";
        const ROWS = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];
        ROWS.forEach(line => {
          const row = document.createElement("div");
          row.className = "kb-row";
          line.forEach(letter => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = letter;
            btn.style.fontSize = "0.85rem";
            if (guessed.has(letter)) {
              btn.classList.add("disabled");
              btn.style.opacity = "0.5";
              if (word.includes(letter)) {
                btn.style.background = "var(--success)";
                btn.style.color = "#fff";
              } else {
                btn.style.background = "var(--bg-soft)";
                btn.style.color = "var(--danger)";
              }
            }
            btn.addEventListener("click", () => guess(letter));
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
        root.querySelector("#hr-wins").textContent = score.wins;
        root.querySelector("#hr-losses").textContent = score.losses;
        root.querySelector("#hr-streak").textContent = streak;
      }

      function guess(letter) {
        if (over || guessed.has(letter)) return;
        guessed.add(letter);
        if (word.includes(letter)) {
          AudioFX.reveal();
          if (word.split("").every(c => guessed.has(c))) {
            over = true;
            won = true;
            score.wins++;
            streak++;
            statusEl.textContent = `🎉 You revealed the word: ${word}!`;
            statusEl.className = "status win";
            AudioFX.win();
            Storage.submitScore("hangmanreverse", (Storage.getBest("hangmanreverse") || 0) + 1);
          }
        } else {
          wrong++;
          AudioFX.error();
          if (wrong >= MAX_WRONG) {
            over = true;
            won = false;
            score.losses++;
            streak = 0;
            statusEl.textContent = `💀 You failed. The word was ${word}`;
            statusEl.className = "status lose";
            AudioFX.lose();
          }
        }
        render();
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R" || e.key === "Enter")) {
          newGame();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (over) return;
        // Reveal an unrevealed vowel
        const remaining = word.split("").filter(c => !guessed.has(c));
        if (!remaining.length) return;
        // pick a vowel if any unrevealed, else a consonant
        const vowels = remaining.filter(c => "AEIOU".includes(c));
        const pick = vowels.length ? vowels[Math.floor(Math.random() * vowels.length)] : remaining[Math.floor(Math.random() * remaining.length)];
        App.toast(`Hint: "${pick}" is in the word`, "info");
        AudioFX.reveal();
      }

      live = {hint: doHint, solve: null};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live) live.hint();
    },
    help: function () {
      App.showModal("How to play Hangman Reverse",
        `A category is shown. The AI has picked a word from that category.
        <br><br>You're the hangman — guess letters one at a time. Correct letters are revealed in the word. Wrong guesses fill in your doomed figure.
        <br><br>Make 6 wrong guesses and you lose. Reveal all letters to win.
        <br><b>Hint</b> reveals one vowel. <b>R</b> for a new word.`);
    },
  });
})();
