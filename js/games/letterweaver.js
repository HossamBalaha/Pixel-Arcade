/* Letter Weaver — a word is shown with some letters blanked; fill them in. Like Wheel of Fortune. */
(function () {
  const WORDS = [
    {word: "JAVASCRIPT", clue: "Programming language of the web"},
    {word: "ELEPHANT", clue: "Large gray mammal with a trunk"},
    {word: "TELESCOPE", clue: "Optical instrument for distant objects"},
    {word: "BUTTERFLY", clue: "Colorful winged insect"},
    {word: "MOUNTAIN", clue: "A large natural elevation"},
    {word: "RAINBOW", clue: "Multicolored arc in the sky"},
    {word: "PYRAMID", clue: "Ancient Egyptian monument"},
    {word: "VOLCANO", clue: "Mountain that erupts lava"},
    {word: "OCTOPUS", clue: "Eight-armed sea creature"},
    {word: "GALAXY", clue: "Huge system of stars"},
    {word: "ASTRONAUT", clue: "Space traveler"},
    {word: "COMPUTER", clue: "Electronic data-processing device"},
    {word: "KEYBOARD", clue: "Typing input device"},
    {word: "DOLPHIN", clue: "Intelligent marine mammal"},
    {word: "CHOCOLATE", clue: "Sweet brown treat from cacao"},
    {word: "PENGUIN", clue: "Flightless Antarctic bird"},
    {word: "HURRICANE", clue: "Powerful tropical storm"},
    {word: "WATERFALL", clue: "Water cascading from a height"},
    {word: "KANGAROO", clue: "Australian hopping marsupial"},
    {word: "LIGHTHOUSE", clue: "Tower guiding ships at night"},
    {word: "SANDWICH", clue: "Food between two slices of bread"},
    {word: "TROPHY", clue: "Award for winning"},
    {word: "ORCHESTRA", clue: "Large group of musicians"},
    {word: "WIZARD", clue: "Magical caster of spells"},
    {word: "PIRATE", clue: "Sea-faring robber"},
  ];
  const MAX_WRONG = 6;

  let live = null;
  GameRegistry.register({
    id: "letterweaver",
    name: "Letter Weaver",
    icon: "🧵",
    category: "word",
    description: "Fill in the missing letters — clue + word shape",
    tags: ["word", "thinking"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let entry = null, revealed = [], guessed = new Set(), wrong = 0, over = false, won = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wrong</div><div class="val" id="lw-wrong">0 / ${MAX_WRONG}</div></div>
          <div class="score-cell"><div class="label">Revealed</div><div class="val" id="lw-revealed">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lw-best">—</div></div>
        </div>
        <div class="status info" id="lw-status">Guess letters to fill in the word.</div>
        <div class="text-muted text-sm center" id="lw-clue" style="margin:8px 0;"></div>
        <div id="lw-word" style="text-align:center;font-family:var(--font-mono);font-size:1.8rem;letter-spacing:0.3em;font-weight:700;margin:18px 0;"></div>
        <div id="lw-keyboard" class="lw-keyboard"></div>
        <p class="hint">Each letter you guess that's <b>in the word</b> gets revealed everywhere it appears. Wrong guesses cost you. Make <b>${MAX_WRONG} wrong guesses</b> and you lose.</p>
      `;
      const statusEl = root.querySelector("#lw-status");
      const clueEl = root.querySelector("#lw-clue");
      const wordEl = root.querySelector("#lw-word");
      const kbEl = root.querySelector("#lw-keyboard");
      if (!document.getElementById("lw-style")) {
        const s = document.createElement("style");
        s.id = "lw-style";
        s.textContent = `
          .lw-keyboard { display: flex; flex-direction: column; gap: 6px; align-items: center; margin-top: 12px; }
          .lw-keyboard .kb-row { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
        `;
        document.head.appendChild(s);
      }

      function renderWord() {
        wordEl.textContent = entry.word.split("").map(c => guessed.has(c) ? c : "_").join(" ");
        const revCount = entry.word.split("").filter(c => guessed.has(c)).length;
        root.querySelector("#lw-revealed").textContent = revCount;
      }

      function renderKb() {
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
        root.querySelector("#lw-wrong").textContent = `${wrong} / ${MAX_WRONG}`;
      }

      function guess(letter) {
        if (over || guessed.has(letter)) return;
        guessed.add(letter);
        if (entry.word.includes(letter)) {
          AudioFX.reveal();
          if (entry.word.split("").every(c => guessed.has(c))) {
            over = true;
            won = true;
            statusEl.textContent = `🎉 Solved! The word was ${entry.word}.`;
            statusEl.className = "status win";
            AudioFX.win();
            const score = Math.max(0, 100 - wrong * 10);
            const best = Storage.getBest("letterweaver");
            if (!best || score > best) {
              Storage.setBest("letterweaver", score);
              root.querySelector("#lw-best").textContent = score;
              App.toast("New best: " + score, "success");
            }
          } else {
            statusEl.textContent = `"${letter}" is in the word!`;
            statusEl.className = "status win";
          }
        } else {
          wrong++;
          AudioFX.error();
          if (wrong >= MAX_WRONG) {
            over = true;
            won = false;
            statusEl.textContent = `Out of guesses. The word was "${entry.word}".`;
            statusEl.className = "status lose";
            AudioFX.lose();
            // Reveal the full word
            entry.word.split("").forEach(c => guessed.add(c));
          } else {
            statusEl.textContent = `No "${letter}". ${MAX_WRONG - wrong} guesses left.`;
            statusEl.className = "status lose";
          }
        }
        renderWord();
        renderKb();
      }

      function onKey(e) {
        if (over) return;
        if (/^[a-zA-Z]$/.test(e.key)) guess(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

      function doHint() {
        if (over) {
          App.toast("Game is over", "info");
          return;
        }
        const unrevealed = entry.word.split("").filter(c => !guessed.has(c));
        if (!unrevealed.length) {
          App.toast("All letters revealed", "info");
          return;
        }
        const letter = unrevealed[Math.floor(Math.random() * unrevealed.length)];
        guess(letter);
        App.toast(`Hint: revealed "${letter}"`, "info");
      }

      function doSolve() {
        if (over) return;
        entry.word.split("").forEach(c => guessed.add(c));
        over = true;
        won = false;
        statusEl.textContent = `Solution revealed: ${entry.word}`;
        statusEl.className = "status lose";
        AudioFX.lose();
        renderWord();
        renderKb();
      }

      function newGame() {
        entry = WORDS[Math.floor(Math.random() * WORDS.length)];
        guessed = new Set();
        wrong = 0;
        over = false;
        won = false;
        clueEl.textContent = "Clue: " + entry.clue;
        const best = Storage.getBest("letterweaver");
        root.querySelector("#lw-best").textContent = best || "—";
        statusEl.textContent = "Guess letters to fill in the word.";
        statusEl.className = "status info";
        renderWord();
        renderKb();
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
      App.showModal("How to play Letter Weaver",
        `A word is hidden, shown as blanks (one per letter). You're given a <b>clue</b>.
        <br><br>Guess letters one at a time. Correct letters appear in the word; wrong letters cost you a try.
        <br><br>Make <b>${MAX_WRONG} wrong guesses</b> and you lose. Use the on-screen keyboard or type on your physical keyboard.`);
    },
  });
})();
