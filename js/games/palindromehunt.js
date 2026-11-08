/* Palindrome Hunt — 17 rounds of clue-driven palindrome hunting.
   Each round shows the definition of a hidden word that reads the same
   forwards and backwards; type the palindrome to solve the round. */
(function () {
  "use strict";

  const ROUNDS = [
    {word: "LEVEL", clue: "A floor of a building"},
    {word: "ROTOR", clue: "The spinning part of a machine or helicopter"},
    {word: "CIVIC", clue: "Relating to a city or its citizens"},
    {word: "KAYAK", clue: "A slim paddle boat, pointed at both ends"},
    {word: "MADAM", clue: "A polite way to address a woman"},
    {word: "RADAR", clue: "A device that detects aircraft using radio waves"},
    {word: "REFER", clue: "To mention something, or send someone to a source"},
    {word: "NOON", clue: "Midday — twelve o'clock sharp"},
    {word: "DEED", clue: "An act that is done; also a property document"},
    {word: "SOLOS", clue: "Unaccompanied musical performances"},
    {word: "STATS", clue: "Sports numbers — short for statistics"},
    {word: "TENET", clue: "A core belief or principle"},
    {word: "MINIM", clue: "In music, a note worth half a semibreve"},
    {word: "ROTATOR", clue: "Something that rotates — think _ cuff"},
    {word: "RACECAR", clue: "A vehicle built to speed around a track"},
    {word: "REDDER", clue: "The comparative form of red"},
    {word: "SAGAS", clue: "Long tales of heroic deeds"},
  ];
  const WIN_THRESHOLD = 14; // solve ≥14 of 17 for a winning hunt
  const MAX_HINTS = 5;

  function shuffled(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "palindromehunt",
    name: "Palindrome Hunt",
    icon: "🔁",
    category: "word",
    description: "Hunt 17 hidden palindromes from their clues — words like ROTOR and LEVEL that read the same both ways",
    tags: ["word", "vocabulary", "palindromes", "typing", "quiz"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let order = shuffled(ROUNDS.map((_, i) => i));
      let idx = 0, solved = 0, wrongTotal = 0, hintsUsed = 0;
      let revealed = new Set(); // letter positions revealed for the current word
      let over = false, transitioning = false;
      const timers = [];

      function later(fn, ms) {
        const t = setTimeout(() => {
          if (!alive) return;
          fn();
        }, ms);
        timers.push(t);
        return t;
      }

      if (!document.getElementById("ph-style")) {
        const s = document.createElement("style");
        s.id = "ph-style";
        s.textContent = `
          .ph-card { background:var(--bg-elev); border:1px solid var(--border); border-radius:var(--radius); padding:18px 16px; margin:14px auto; max-width:480px; text-align:center; }
          .ph-clue { font-size:1.05rem; margin:0 0 14px; color:var(--text); }
          .ph-mask { display:flex; justify-content:center; gap:6px; flex-wrap:wrap; }
          .ph-letter { width:34px; height:42px; display:grid; place-items:center; font-family:var(--font-mono); font-weight:700; font-size:1.25rem; color:var(--text); background:var(--bg-soft); border:1px solid var(--border); border-bottom:3px solid var(--border-strong); border-radius:6px; }
          .ph-letter.on { background:var(--accent-soft); border-color:var(--accent); }
          .ph-input { font-family:var(--font-mono); font-size:1.1rem; letter-spacing:0.15em; text-transform:uppercase; text-align:center; padding:10px 12px; border-radius:var(--radius); border:1px solid var(--border); background:var(--bg-elev); color:var(--text); width:200px; }
          .ph-input:focus { outline:2px solid var(--accent); }
          @keyframes ph-shake {0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
          .ph-shake { animation: ph-shake 0.4s; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ph-round">1/${ROUNDS.length}</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ph-solved">0</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="ph-hints">${MAX_HINTS}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ph-best">—</div></div>
        </div>
        <div class="status info" id="ph-status">Read the clue and type the hidden palindrome.</div>
        <div class="ph-card" id="ph-card">
          <p class="ph-clue" id="ph-clue"></p>
          <div class="ph-mask" id="ph-mask"></div>
        </div>
        <div class="row center" id="ph-input-row" style="gap:8px; flex-wrap:wrap;">
          <input id="ph-input" class="ph-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="Palindrome…" aria-label="Your guess"/>
          <button class="btn primary" id="ph-guess" type="button">Guess</button>
          <button class="btn" id="ph-skip" type="button">Skip word</button>
        </div>
        <button class="btn primary" id="ph-again" type="button" style="display:none; margin:12px auto;">Play again</button>
        <p class="hint">A palindrome reads the same forwards and backwards (like NOON or RADAR). Press <b>Enter</b> to guess. Solve at least ${WIN_THRESHOLD} of ${ROUNDS.length} for a winning hunt.</p>
      `;

      const statusEl = root.querySelector("#ph-status");
      const cardEl = root.querySelector("#ph-card");
      const clueEl = root.querySelector("#ph-clue");
      const maskEl = root.querySelector("#ph-mask");
      const inputEl = root.querySelector("#ph-input");
      const guessBtn = root.querySelector("#ph-guess");
      const skipBtn = root.querySelector("#ph-skip");
      const againBtn = root.querySelector("#ph-again");
      const inputRow = root.querySelector("#ph-input-row");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + cls;
      }

      function updateScoreboard() {
        root.querySelector("#ph-round").textContent = Math.min(idx + 1, ROUNDS.length) + "/" + ROUNDS.length;
        root.querySelector("#ph-solved").textContent = solved;
        root.querySelector("#ph-hints").textContent = Math.max(0, MAX_HINTS - hintsUsed);
        const best = Storage.getBest("palindromehunt");
        root.querySelector("#ph-best").textContent = best != null ? best + "/" + ROUNDS.length : "—";
      }

      function cur() {
        return ROUNDS[order[idx]];
      }

      function renderRound() {
        const item = cur();
        clueEl.textContent = "“" + item.clue + "”";
        maskEl.innerHTML = "";
        for (let i = 0; i < item.word.length; i++) {
          const b = document.createElement("span");
          b.className = "ph-letter" + (revealed.has(i) ? " on" : "");
          b.textContent = revealed.has(i) ? item.word[i] : "";
          maskEl.appendChild(b);
        }
        inputEl.value = "";
        inputEl.disabled = false;
        guessBtn.disabled = false;
        skipBtn.disabled = false;
        updateScoreboard();
        inputEl.focus();
      }

      function revealAll() {
        const item = cur();
        for (let i = 0; i < item.word.length; i++) revealed.add(i);
        maskEl.innerHTML = "";
        for (let i = 0; i < item.word.length; i++) {
          const b = document.createElement("span");
          b.className = "ph-letter on";
          b.textContent = item.word[i];
          maskEl.appendChild(b);
        }
      }

      function shakeCard() {
        cardEl.classList.remove("ph-shake");
        void cardEl.offsetWidth;
        cardEl.classList.add("ph-shake");
      }

      function submit() {
        if (over || transitioning) return;
        const val = inputEl.value.replace(/[^a-z]/gi, "").toUpperCase();
        if (!val) {
          setStatus("Type your guess first — the word has " + cur().word.length + " letters.", "info");
          return;
        }
        const item = cur();
        if (val === item.word) {
          solved++;
          transitioning = true;
          AudioFX.win();
          setStatus("✓ " + item.word + " — a palindrome! Nice.", "win");
          revealAll();
          later(advance, 900);
        } else {
          wrongTotal++;
          AudioFX.error();
          shakeCard();
          const isPal = val === val.split("").reverse().join("");
          setStatus(isPal
            ? val + " is a palindrome — but not this one. Try again!"
            : "Not it — remember, it reads the same both ways. Try again!", "lose");
          inputEl.select();
        }
      }

      function skipRound() {
        if (over || transitioning) return;
        transitioning = true;
        AudioFX.reveal();
        setStatus("The word was " + cur().word + ".", "info");
        revealAll();
        later(advance, 1100);
      }

      function advance() {
        transitioning = false;
        revealed = new Set();
        idx++;
        if (idx >= ROUNDS.length) {
          finish();
          return;
        }
        renderRound();
      }

      function finish() {
        over = true;
        const won = solved >= WIN_THRESHOLD;
        App.recordResult(won, solved);
        if (Storage.submitScore("palindromehunt", solved)) {
          App.toast("New best: " + solved + " solved!", "success");
        }
        updateScoreboard();
        inputEl.value = "";
        inputEl.disabled = true;
        guessBtn.disabled = true;
        skipBtn.disabled = true;
        inputRow.style.display = "none";
        againBtn.style.display = "block";
        AudioFX[won ? "win" : "lose"]();
        setStatus(won
          ? "🎉 Hunt complete — " + solved + " of " + ROUNDS.length + " palindromes solved!"
          : "Hunt over — " + solved + " of " + ROUNDS.length + " solved. So close!", won ? "win" : "lose");
        App.showModal(won ? "A successful hunt!" : "Hunt over",
          `You solved <b>${solved} of ${ROUNDS.length}</b> palindromes with ${wrongTotal} wrong ${wrongTotal === 1 ? "guess" : "guesses"}.
          <br><br>${won ? "Nicely done — that's a winning hunt." : "Solve at least " + WIN_THRESHOLD + " next time for a winning hunt."}
          <br><br>Press <b>Play again</b> for a freshly shuffled hunt.`);
      }

      function restart() {
        order = shuffled(ROUNDS.map((_, i) => i));
        idx = 0;
        solved = 0;
        wrongTotal = 0;
        hintsUsed = 0;
        revealed = new Set();
        over = false;
        transitioning = false;
        inputRow.style.display = "";
        againBtn.style.display = "none";
        setStatus("Read the clue and type the hidden palindrome.", "info");
        renderRound();
      }

      function doHint() {
        if (over) {
          App.toast("The hunt is over — play again?", "info");
          return;
        }
        if (transitioning) return;
        if (hintsUsed >= MAX_HINTS) {
          App.toast("No hints left (max " + MAX_HINTS + " per hunt)", "warning");
          return;
        }
        const item = cur();
        const hidden = [];
        for (let i = 0; i < item.word.length; i++) if (!revealed.has(i)) hidden.push(i);
        if (!hidden.length) {
          App.toast("Every letter is already revealed!", "info");
          return;
        }
        const p = hidden[Math.floor(Math.random() * hidden.length)];
        revealed.add(p);
        hintsUsed++;
        AudioFX.tick();
        App.toast("Hint: letter " + (p + 1) + " is " + item.word[p], "info");
        renderRoundMaskOnly();
        updateScoreboard();
      }

      function renderRoundMaskOnly() {
        const item = cur();
        maskEl.innerHTML = "";
        for (let i = 0; i < item.word.length; i++) {
          const b = document.createElement("span");
          b.className = "ph-letter" + (revealed.has(i) ? " on" : "");
          b.textContent = revealed.has(i) ? item.word[i] : "";
          maskEl.appendChild(b);
        }
        inputEl.focus();
      }

      function onKey(e) {
        if (!alive || over) return;
        if (e.target === inputEl) {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          inputEl.focus();
          submit();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          inputEl.focus();
          inputEl.value = (inputEl.value + e.key).toUpperCase().slice(0, 12);
        }
      }

      document.addEventListener("keydown", onKey);
      guessBtn.addEventListener("click", submit);
      skipBtn.addEventListener("click", skipRound);
      againBtn.addEventListener("click", restart);

      live = {
        hint: doHint,
        solve: function () {
          if (over) {
            App.toast("The hunt is over — play again?", "info");
            return;
          }
          skipRound();
        },
      };

      updateScoreboard();
      renderRound();

      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        timers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Palindrome Hunt",
        `A palindrome is a word that reads the same forwards and backwards — like <b>NOON</b>, <b>RADAR</b> or <b>RACECAR</b>.
        <br><br>Each of the ${ROUNDS.length} rounds shows a clue (a definition) for a hidden palindrome. Type the word and press <b>Enter</b> (or <b>Guess</b>).
        <br><br>• Wrong guesses shake the card — no penalty except your pride.
        <br>• <b>Hint</b> reveals one letter of the current word (max ${MAX_HINTS} per hunt).
        <br>• <b>Skip word</b> / <b>Solve</b> shows the answer and moves on — that round stays unsolved.
        <br><br>Your score is the number of rounds solved. Solve at least <b>${WIN_THRESHOLD} of ${ROUNDS.length}</b> for a winning hunt.`);
    },
  });
})();
