/* Hangman — guess the word letter by letter, 6 wrong guesses ends the game.
   Added: difficulty selector (Short 4-5 / Medium 6-8 / Long 9-12 chars),
   online Wikipedia option, proper status updates after loading.
*/
(function () {
  // Bundled word/hint pairs — used by default and as a fallback when Wikipedia
  // isn't available or doesn't return a usable title.
  const WORDS = [
    {word: "JAVASCRIPT", hint: "Programming language of the web"},
    {word: "GUITAR", hint: "Six-stringed musical instrument"},
    {word: "MOUNTAIN", hint: "A large natural elevation"},
    {word: "ELEPHANT", hint: "Large gray mammal with a trunk"},
    {word: "TELESCOPE", hint: "Optical instrument for distant objects"},
    {word: "OCTOPUS", hint: "Eight-armed sea creature"},
    {word: "PYRAMID", hint: "Ancient Egyptian monument"},
    {word: "RAINBOW", hint: "Multicolored arc in the sky"},
    {word: "BUTTERFLY", hint: "Colorful winged insect"},
    {word: "DIAMOND", hint: "Hardest natural mineral"},
    {word: "GALAXY", hint: "Huge system of stars"},
    {word: "VOLCANO", hint: "Mountain that erupts lava"},
    {word: "WHISPER", hint: "Speak very softly"},
    {word: "JOURNEY", hint: "A long trip"},
    {word: "WIZARD", hint: "Magical caster of spells"},
    {word: "PIRATE", hint: "Sea-faring robber"},
    {word: "ORCHESTRA", hint: "Large group of musicians"},
    {word: "MUSHROOM", hint: "Fungi with a cap"},
    {word: "PENGUIN", hint: "Flightless Antarctic bird"},
    {word: "KANGAROO", hint: "Australian hopping marsupial"},
    {word: "LIGHTHOUSE", hint: "Tower guiding ships at night"},
    {word: "CHOCOLATE", hint: "Sweet brown treat from cacao"},
    {word: "ASTRONAUT", hint: "Space traveler"},
    {word: "COMPUTER", hint: "Electronic data-processing device"},
    {word: "KEYBOARD", hint: "Typing input device"},
    {word: "DOLPHIN", hint: "Intelligent marine mammal"},
    {word: "HURRICANE", hint: "Powerful tropical storm"},
    {word: "TROPHY", hint: "Award for winning"},
    {word: "WATERFALL", hint: "Water cascading from a height"},
    {word: "SANDWICH", hint: "Food between two slices of bread"},
  ];

  // Difficulty presets. Each picks a Wikipedia title length range and filters
  // the bundled list to match — so even when Wiki is off, the difficulty does
  // what it says.
  const DIFFS = {
    easy: {min: 4, max: 5, label: "Short (4–5)"},
    medium: {min: 6, max: 8, label: "Medium (6–8)"},
    hard: {min: 9, max: 12, label: "Long (9–12)"},
  };

  const PARTS = ["head", "body", "arm-l", "arm-r", "leg-l", "leg-r"];
  const MAX_WRONG = 6;

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "hangman",
    name: "Hangman",
    icon: "🪢",
    category: "word",
    description: "Guess the word before the stick figure is complete",
    tags: ["word", "classic", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let loadId = 0;
      let entry = null, guessed, wrong, over, won;
      let wins = 0, losses = 0;
      let useOnline = false;
      let diff = "medium";

      root.innerHTML = `
        <div class="row" style="justify-content:center;gap:16px;flex-wrap:wrap;margin-bottom:8px;">
          <div class="difficulty" id="hm-diff">
            <button class="diff-btn" data-d="easy">Short (4–5)</button>
            <button class="diff-btn active" data-d="medium">Medium (6–8)</button>
            <button class="diff-btn" data-d="hard">Long (9–12)</button>
          </div>
          <label class="row gap-2 text-sm" style="align-items:center;">
            <input type="checkbox" id="hm-online"/> Wikipedia titles
          </label>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="hm-wins">0</div></div>
          <div class="score-cell"><div class="label">Losses</div><div class="val" id="hm-losses">0</div></div>
          <div class="score-cell"><div class="label">Streak</div><div class="val" id="hm-streak">0</div></div>
        </div>
        <div class="status" id="hm-status">Guess letters to reveal the word</div>
        <svg class="hangman-svg" viewBox="0 0 200 220" id="hm-svg">
          <line x1="20" y1="210" x2="120" y2="210"/>
          <line x1="60" y1="210" x2="60" y2="10"/>
          <line x1="60" y1="10" x2="140" y2="10"/>
          <line x1="140" y1="10" x2="140" y2="40"/>
          <circle cx="140" cy="55" r="15" id="hm-head" style="display:none"/>
          <line x1="140" y1="70" x2="140" y2="130" id="hm-body" style="display:none"/>
          <line x1="140" y1="90" x2="115" y2="105" id="hm-arm-l" style="display:none"/>
          <line x1="140" y1="90" x2="165" y2="105" id="hm-arm-r" style="display:none"/>
          <line x1="140" y1="130" x2="115" y2="170" id="hm-leg-l" style="display:none"/>
          <line x1="140" y1="130" x2="165" y2="170" id="hm-leg-r" style="display:none"/>
        </svg>
        <div id="hm-word" style="text-align:center;font-family:var(--font-mono);font-size:1.6rem;letter-spacing:0.3em;font-weight:700;"></div>
        <div class="text-muted text-sm center" id="hm-hint"></div>
        <div id="hm-keyboard" class="hm-keyboard"></div>
        <p class="hint">Type a letter on your keyboard or tap one below. Stuck? Tap the <b>Hint</b> button (reveals a letter, costs one mistake) or <b>Solve</b> to give up. After the game ends, press <b>R</b> or <b>Enter</b> for a new word.</p>
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

      const statusEl = root.querySelector("#hm-status");
      const wordEl = root.querySelector("#hm-word");
      const hintEl = root.querySelector("#hm-hint");
      const kbEl = root.querySelector("#hm-keyboard");

      function pickBundledForDiff() {
        const d = DIFFS[diff];
        const candidates = WORDS.filter(w => w.word.length >= d.min && w.word.length <= d.max);
        const pool = candidates.length ? candidates : WORDS;
        return pool[Math.floor(Math.random() * pool.length)];
      }

      function newGame() {
        if (useOnline) {
          const myId = ++loadId;
          statusEl.textContent = "Loading from Wikipedia…";
          statusEl.className = "status info";
          wordEl.textContent = "";
          hintEl.textContent = "";
          kbEl.innerHTML = "";
          entry = null;
          const d = DIFFS[diff];
          (async () => {
            let title = null, summary = null;
            try {
              if (typeof window !== "undefined" && window.Wiki && typeof window.Wiki.randomTitle === "function") {
                title = await window.Wiki.randomTitle(d.min, d.max);
              }
            } catch (e) {
              title = null;
            }
            if (title) {
              try {
                const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
                if (res.ok) {
                  const data = await res.json();
                  summary = data.extract || null;
                }
              } catch (e) {
                summary = null;
              }
            }
            if (!alive || myId !== loadId) return; // superseded or unmounted
            // Wiki.randomTitle returns the original title uppercased — strip to A-Z only
            const word = title ? title.replace(/[^A-Z]/g, "") : null;
            if (word && word.length >= d.min && word.length <= d.max) {
              entry = {word, hint: summary || "Wikipedia article title"};
            } else {
              entry = pickBundledForDiff();
            }
            guessed = new Set();
            wrong = 0;
            over = false;
            won = false;
            // CRITICAL: update the status now that loading is done. Previously
            // the "Loading from Wikipedia…" status stayed forever because
            // render() only updates word/hint/keyboard, not the status.
            statusEl.textContent = `Guess the ${entry.word.length}-letter word — ${MAX_WRONG} wrong guesses ends it`;
            statusEl.className = "status info";
            render();
          })();
          return;
        }
        entry = pickBundledForDiff();
        guessed = new Set();
        wrong = 0;
        over = false;
        won = false;
        statusEl.textContent = `Guess the ${entry.word.length}-letter word — ${MAX_WRONG} wrong guesses ends it`;
        statusEl.className = "status info";
        render();
      }

      function render() {
        if (!entry) return;
        // Word
        wordEl.textContent = entry.word.split("").map(c => guessed.has(c) ? c : "_").join(" ");
        // Hint: only show if the hint is meaningful (not the literal fallback
        // "Wikipedia article title", which we used to display verbatim).
        if (entry.hint && entry.hint !== "Wikipedia article title") {
          hintEl.textContent = "Hint: " + entry.hint;
        } else if (useOnline) {
          hintEl.textContent = "Hint: a Wikipedia article title";
        } else {
          hintEl.textContent = "Hint: " + entry.hint;
        }
        // Hangman parts
        PARTS.forEach((p, i) => {
          const el = root.querySelector("#hm-" + p);
          if (el) el.style.display = i < wrong ? "" : "none";
        });
        // Keyboard — QWERTY layout (horizontal rows)
        kbEl.innerHTML = "";
        const ROWS = ["QWERTYUIOP".split(""), "ASDFGHJKL".split(""), "ZXCVBNM".split("")];
        ROWS.forEach(line => {
          const row = document.createElement("div");
          row.className = "kb-row";
          line.forEach(letter => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = letter;
            btn.style.fontSize = "0.9rem";
            if (guessed.has(letter)) {
              btn.classList.add("disabled");
              btn.style.opacity = "0.5";
              if (entry.word.includes(letter)) {
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
        // Scoreboard
        root.querySelector("#hm-wins").textContent = wins;
        root.querySelector("#hm-losses").textContent = losses;
        const streak = root.querySelector("#hm-streak");
        streak.textContent = wins - losses;
        streak.style.color = (wins - losses) >= 0 ? "var(--success)" : "var(--danger)";
      }

      function guess(letter) {
        if (over || guessed.has(letter)) return;
        guessed.add(letter);
        if (entry.word.includes(letter)) {
          AudioFX.reveal();
        } else {
          wrong++;
          AudioFX.error();
        }
        checkEnd();
        render();
      }

      function checkEnd() {
        if (entry.word.split("").every(c => guessed.has(c))) {
          over = true;
          won = true;
          wins++;
          statusEl.textContent = `🎉 You won! The word was ${entry.word}`;
          statusEl.className = "status win";
          AudioFX.win();
          const cur = Storage.getBest("hangman") || 0;
          Storage.setBest("hangman", cur + 1);
        } else if (wrong >= MAX_WRONG) {
          over = true;
          won = false;
          losses++;
          statusEl.textContent = `💀 You lost. The word was ${entry.word}`;
          statusEl.className = "status lose";
          AudioFX.lose();
        }
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R" || e.key === "Enter")) {
          newGame();
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      // Difficulty selector
      root.querySelectorAll("#hm-diff .diff-btn").forEach(btn => btn.addEventListener("click", () => {
        AudioFX.click();
        root.querySelectorAll("#hm-diff .diff-btn").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        diff = btn.dataset.d;
        newGame();
      }));

      // Online source toggle
      root.querySelector("#hm-online").addEventListener("change", (e) => {
        AudioFX.click();
        useOnline = e.target.checked;
        newGame();
      });

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!entry) {
          App.toast("Still loading…", "info");
          return;
        }
        const unrevealed = entry.word.split("").filter(c => !guessed.has(c));
        if (unrevealed.length === 0) {
          App.toast("All letters already revealed", "info");
          return;
        }
        const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        guessed.add(letter);
        // Charge one mistake — same as a wrong guess, but we reveal a letter.
        wrong++;
        AudioFX.reveal();
        App.toast(`Hint: revealed the letter ${letter}`, "info");
        checkEnd();
        render();
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (!entry) {
          App.toast("Still loading…", "info");
          return;
        }
        // Reveal every letter and end the game as a loss
        entry.word.split("").forEach(c => guessed.add(c));
        over = true;
        won = false;
        losses++;
        statusEl.textContent = `Solution revealed: ${entry.word}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        render();
      }

      live = {hint: doHint, solve: doSolve};

      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Hangman",
        `Guess the hidden word, one letter at a time.
        <br><br>Pick a difficulty:
        <br>• <b>Short</b> — 4–5 letter words
        <br>• <b>Medium</b> — 6–8 letter words
        <br>• <b>Long</b> — 9–12 letter words
        <br><br>Each wrong guess draws a body part. Make <b>6 wrong guesses</b> and you lose.
        <br>Reveal every letter in the word before that happens to win.
        <br><br>Toggle <b>Wikipedia titles</b> to use real Wikipedia article titles as the word — the hint becomes the article's first sentence (when available). The status bar shows "Loading from Wikipedia…" while fetching, then updates to "Guess the N-letter word…" once the word is ready.
        <br><br>Use the on-screen keyboard or your physical keyboard. Stuck? Tap <b>Hint</b> in the header to reveal a letter (it costs one mistake) or <b>Solve</b> to give up. After the game ends, press <b>R</b> or <b>Enter</b> for a new word.`);
    },
  });
})();
