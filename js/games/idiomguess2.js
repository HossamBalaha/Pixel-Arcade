/* Idiom Guess Jr. — read the clue and fill in the idiom's blanks letter by letter. */
(function () {
  // 15 idioms — a different set from idiomguess.js (no overlap)
  const IDIOMS = [
    {text: "RAINING CATS AND DOGS", clue: "Raining very, very heavily"},
    {text: "HOLD YOUR HORSES", clue: "Slow down and be patient"},
    {text: "TWO BIRDS WITH ONE STONE", clue: "Get two things done with a single action"},
    {text: "LET SLEEPING DOGS LIE", clue: "Leave an old argument alone to avoid trouble"},
    {text: "A BLESSING IN DISGUISE", clue: "A good thing that seemed bad at first"},
    {text: "THE ELEPHANT IN THE ROOM", clue: "A big obvious problem nobody wants to mention"},
    {text: "THE LAST STRAW", clue: "The final annoyance that uses up all your patience"},
    {text: "AGAINST THE CLOCK", clue: "Rushing to finish before time runs out"},
    {text: "THE BALL IS IN YOUR COURT", clue: "It is your turn to act or make the decision"},
    {text: "EVERY CLOUD HAS A SILVER LINING", clue: "Every trouble has a hopeful side"},
    {text: "A DIME A DOZEN", clue: "So common that it is nothing special"},
    {text: "SNAKE IN THE GRASS", clue: "A sneaky person who cannot be trusted"},
    {text: "THE EARLY BIRD CATCHES THE WORM", clue: "Whoever starts first gets the reward"},
    {text: "SMOOTH SAILING", clue: "Easy going, with no problems at all"},
    {text: "COLD FEET", clue: "Sudden nervousness before a big commitment"},
  ];
  const ROUNDS = 5;
  const MAX_MISSES = 8;
  const MAX_HINTS = 3;
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let live = null;
  GameRegistry.register({
    id: "idiomguess2",
    name: "Idiom Guess Jr.",
    icon: "💬",
    category: "word",
    description: "Fill in the idiom blanks from the clue — letter by letter or the whole phrase",
    tags: ["word", "language", "idiom", "hangman"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pool = [], round = 0, score = 0, idiom = "", clue = "";
      let revealed = new Set(), wrong = new Set(), misses = 0;
      let hintsLeft = MAX_HINTS, locked = false, finished = false, wasSolved = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ij2-round">1/${ROUNDS}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ij2-score">0</div></div>
          <div class="score-cell"><div class="label">Misses</div><div class="val" id="ij2-miss">0/${MAX_MISSES}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ij2-best">—</div></div>
        </div>
        <div class="status info" id="ij2-status">Read the clue and type letters to fill the blanks — or type the whole idiom!</div>
        <div id="ij2-clue" style="text-align:center;font-size:1.25rem;font-weight:600;font-style:italic;margin:16px 0;"></div>
        <div class="center" style="margin:10px 0;"><div id="ij2-board"></div></div>
        <div class="center text-muted text-sm" id="ij2-wrong" style="min-height:1.4em;margin:6px 0;"></div>
        <div class="center" style="margin:10px 0;">
          <div class="row" style="justify-content:center;gap:8px;flex-wrap:wrap;">
            <input id="ij2-input" class="ij2-input" type="text" autocomplete="off" spellcheck="false" placeholder="a letter or the whole idiom…" />
            <button class="btn primary" id="ij2-go">Guess ⏎</button>
          </div>
        </div>
        <div class="center" style="margin:8px 0 4px;"><div class="ij2-keys" id="ij2-keys"></div></div>
        <p class="hint">Type one letter to fill every matching blank, or type the <b>whole phrase</b> and press Enter. Wrong guesses cost a miss — ${MAX_MISSES} misses and the round is lost. <b>Hint</b> reveals a letter.</p>
      `;

      const statusEl = root.querySelector("#ij2-status");
      const clueEl = root.querySelector("#ij2-clue");
      const boardEl = root.querySelector("#ij2-board");
      const wrongEl = root.querySelector("#ij2-wrong");
      const inputEl = root.querySelector("#ij2-input");
      const keysEl = root.querySelector("#ij2-keys");

      if (!document.getElementById("ij2-style")) {
        const s = document.createElement("style");
        s.id = "ij2-style";
        s.textContent = `
          .ij2-word { display: inline-flex; margin: 4px 8px; vertical-align: top; }
          .ij2-slot { width: 26px; height: 36px; border-bottom: 3px solid var(--border-strong); margin: 0 2px; display: grid; place-items: center; font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; color: var(--text); }
          .ij2-slot.on { color: var(--accent); border-color: var(--accent); }
          .ij2-slot.hint { color: var(--warning); }
          .ij2-slot.reveal { color: var(--text-muted); }
          .ij2-board-ok .ij2-slot { color: var(--success); border-color: var(--success); }
          .ij2-input { padding: 10px 14px; font-size: 1rem; border: 2px solid var(--border-strong); border-radius: var(--radius); background: var(--bg-elev); color: var(--text); width: 280px; text-align: center; }
          .ij2-input:focus { outline: none; border-color: var(--accent); }
          .ij2-keys { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; max-width: 520px; }
          .ij2-key { width: 32px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); font-family: var(--font-mono); font-weight: 700; font-size: 0.9rem; cursor: pointer; }
          .ij2-key:hover:not(:disabled) { border-color: var(--accent); }
          .ij2-key.hit { background: var(--success); border-color: var(--success); color: #fff; }
          .ij2-key.miss { background: var(--danger); border-color: var(--danger); color: #fff; opacity: 0.7; }
          .ij2-key:disabled { cursor: default; }
        `;
        document.head.appendChild(s);
      }

      function renderScore() {
        root.querySelector("#ij2-round").textContent = Math.min(round + 1, ROUNDS) + "/" + ROUNDS;
        root.querySelector("#ij2-score").textContent = score;
        root.querySelector("#ij2-miss").textContent = misses + "/" + MAX_MISSES;
      }

      function renderBoard() {
        boardEl.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "ij2-board" + (locked && wasSolved ? " ij2-board-ok" : "");
        idiom.split(" ").forEach(word => {
          const w = document.createElement("div");
          w.className = "ij2-word";
          for (const ch of word) {
            const slot = document.createElement("div");
            slot.className = "ij2-slot";
            if (revealed.has(ch)) {
              slot.textContent = ch;
              slot.classList.add("on");
            } else if (locked) {
              slot.textContent = ch;
              slot.classList.add("reveal");
            }
            w.appendChild(slot);
          }
          wrap.appendChild(w);
        });
        boardEl.appendChild(wrap);
        wrongEl.innerHTML = wrong.size
          ? "missed letters: " + Array.from(wrong).map(L => '<b style="color:var(--danger)">' + L + "</b>").join(" ")
          : "";
      }

      function renderKeys() {
        keysEl.innerHTML = "";
        for (const L of LETTERS) {
          const b = document.createElement("button");
          let cls = "ij2-key";
          if (revealed.has(L)) cls += " hit";
          else if (wrong.has(L)) cls += " miss";
          b.className = cls;
          b.textContent = L;
          b.disabled = locked || finished || revealed.has(L) || wrong.has(L);
          b.addEventListener("click", () => guessLetter(L));
          keysEl.appendChild(b);
        }
      }

      function guessLetter(L) {
        if (locked || finished) return;
        if (revealed.has(L) || wrong.has(L)) return;
        if (idiom.includes(L)) {
          revealed.add(L);
          AudioFX.pop();
          if (idiom.split("").every(ch => !/[A-Z]/.test(ch) || revealed.has(ch))) {
            roundWon();
          } else {
            statusEl.textContent = "Yes! " + L + " is in the idiom.";
            statusEl.className = "status win";
          }
        } else {
          wrong.add(L);
          misses++;
          AudioFX.error();
          statusEl.textContent = "No " + L + " in this one — be careful!";
          statusEl.className = "status lose";
          if (misses >= MAX_MISSES) {
            roundLost("Too many misses");
            return;
          }
        }
        renderScore();
        renderBoard();
        renderKeys();
      }

      function guessPhrase(raw) {
        if (locked || finished) return;
        const norm = s => s.toUpperCase().replace(/[^A-Z]/g, "");
        if (norm(raw).length < 2) return;
        if (norm(raw) === norm(idiom)) {
          for (const ch of new Set(idiom.split(""))) {
            if (/[A-Z]/.test(ch)) revealed.add(ch);
          }
          roundWon();
        } else {
          misses++;
          AudioFX.error();
          statusEl.textContent = "Not the phrase — one more miss!";
          statusEl.className = "status lose";
          if (misses >= MAX_MISSES) {
            roundLost("Too many misses");
            return;
          }
        }
        renderScore();
        renderBoard();
        renderKeys();
      }

      function submit() {
        if (locked || finished) return;
        const v = inputEl.value.trim();
        inputEl.value = "";
        if (!v) return;
        const letters = v.toUpperCase().replace(/[^A-Z]/g, "");
        if (letters.length === 1) guessLetter(letters);
        else if (letters.length > 1) guessPhrase(v);
        inputEl.focus();
      }

      function roundWon() {
        locked = true;
        wasSolved = true;
        score += 20;
        AudioFX.win();
        statusEl.textContent = "✅ " + idiom + " — you got it!";
        statusEl.className = "status win";
        renderScore();
        renderBoard();
        renderKeys();
        setTimeout(nextRound, 1600);
      }

      function roundLost(reason) {
        locked = true;
        wasSolved = false;
        AudioFX.lose();
        statusEl.textContent = (reason ? reason + " — " : "") + "it was \"" + idiom + "\".";
        statusEl.className = "status lose";
        renderScore();
        renderBoard();
        renderKeys();
        setTimeout(nextRound, 2000);
      }

      function nextRound() {
        if (!alive) return;
        round++;
        if (round >= ROUNDS) {
          finish();
          return;
        }
        startRound();
      }

      function finish() {
        finished = true;
        const won = score >= 60;
        App.recordResult(won, score);
        const best = Storage.getBest("idiomguess2");
        if (!best || score > best) {
          Storage.setBest("idiomguess2", score);
          App.toast("New best: " + score, "success");
        }
        root.querySelector("#ij2-best").textContent = Storage.getBest("idiomguess2") || "—";
        statusEl.textContent = "🏁 Round complete! You guessed " + (score / 20) + " of " + ROUNDS + " idioms.";
        statusEl.className = "status " + (won ? "win" : "lose");
        clueEl.textContent = won ? "🏆 Great idiom detective!" : "💪 Practice makes perfect!";
        boardEl.innerHTML = "";
        wrongEl.textContent = "";
        const again = document.createElement("button");
        again.className = "btn primary";
        again.style.margin = "10px auto";
        again.textContent = "Play again";
        again.addEventListener("click", newGame);
        boardEl.appendChild(again);
        renderKeys();
        inputEl.disabled = true;
      }

      function startRound() {
        idiom = pool[round].text;
        clue = pool[round].clue;
        revealed = new Set();
        wrong = new Set();
        misses = 0;
        locked = false;
        wasSolved = false;
        inputEl.disabled = false;
        clueEl.textContent = "“" + clue + "”";
        statusEl.textContent = "Read the clue and type letters to fill the blanks — or type the whole idiom!";
        statusEl.className = "status info";
        renderScore();
        renderBoard();
        renderKeys();
        inputEl.value = "";
        inputEl.focus();
      }

      function newGame() {
        pool = IDIOMS.slice().sort(() => Math.random() - 0.5).slice(0, ROUNDS);
        round = 0;
        score = 0;
        hintsLeft = MAX_HINTS;
        finished = false;
        root.querySelector("#ij2-best").textContent = Storage.getBest("idiomguess2") || "—";
        startRound();
      }

      function doHint() {
        if (finished) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (locked) {
          App.toast("Round already finished", "info");
          return;
        }
        if (hintsLeft <= 0) {
          App.toast("No hints left", "warning");
          return;
        }
        const missing = [];
        for (const ch of new Set(idiom.split(""))) {
          if (/[A-Z]/.test(ch) && !revealed.has(ch)) missing.push(ch);
        }
        if (!missing.length) {
          App.toast("Everything is already revealed", "info");
          return;
        }
        const L = missing[Math.floor(Math.random() * missing.length)];
        revealed.add(L);
        hintsLeft--;
        AudioFX.reveal();
        statusEl.textContent = "Hint: the idiom contains " + L + "!";
        statusEl.className = "status info";
        renderBoard();
        renderKeys();
        if (idiom.split("").every(ch => !/[A-Z]/.test(ch) || revealed.has(ch))) roundWon();
      }

      function doSolve() {
        if (finished) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (locked) return;
        roundLost("Revealed");
      }

      inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      root.querySelector("#ij2-go").addEventListener("click", submit);

      live = {hint: doHint, solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Idiom Guess Jr.",
        `Read the <b>clue</b> — a plain-English description of a common idiom — then fill in the blanks!
        <br><br>• Type a <b>single letter</b> (or tap one) to fill every matching blank — hangman style.
        • Or type the <b>whole phrase</b> and press Enter to go for it directly.
        <br>• Wrong letters and wrong phrases cost a <b>miss</b>; ${MAX_MISSES} misses lose the round.
        <br>• ${ROUNDS} rounds, 20 points per idiom you crack.
        <br><br><b>Hint</b> reveals one letter (max ${MAX_HINTS} per game). <b>Solve</b> reveals the idiom and moves on.`);
    },
  });
})();
