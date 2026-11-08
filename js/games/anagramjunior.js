/* Anagram Junior — unscramble kid-friendly 3–5 letter words across 5 rounds. */
(function () {
  const WORDS = ("bat bee bed box bus car cat cow dog egg fox hat hen jam key owl pig pie sun " +
    "ball bear bell bird boat book cake corn deer duck farm fish frog goat hand kite lion milk moon nest rain ring rose ship shoe snow star toad tree " +
    "apple beach bread candy chair cloud eagle grape green happy heart horse koala lemon light mango mouse music panda pearl queen robot sheep shark snake smile tiger whale zebra").split(" ");
  const ROUNDS = 5;
  const MAX_HINTS = 3;
  const COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899"];

  function scramble(w) {
    if (w.length < 2) return w;
    let a = w.split("");
    for (let t = 0; t < 25; t++) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      if (a.join("") !== w) return a.join("");
    }
    return a.reverse().join("");
  }

  let live = null;
  GameRegistry.register({
    id: "anagramjunior",
    name: "Anagram Junior",
    icon: "🔤",
    category: "word",
    description: "Unscramble kid-friendly 3–5 letter words — 5 rounds, first-letter hints",
    tags: ["word", "kids", "anagram", "typing"],
    age: ["kids", "teens"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let pool = [], round = 0, score = 0, word = "", scram = "", typed = "";
      let hintsLeft = MAX_HINTS, showFirst = false, locked = false, finished = false;
      let wasSolved = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="aj-round">1/${ROUNDS}</div></div>
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="aj-score">0</div></div>
          <div class="score-cell"><div class="label">Hints</div><div class="val" id="aj-hints">${MAX_HINTS}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="aj-best">—</div></div>
        </div>
        <div class="status info" id="aj-status">The letters got all mixed up! Type the real word and press Enter.</div>
        <div class="center" style="margin:18px 0 6px;"><div class="aj-tiles" id="aj-tiles"></div></div>
        <div class="center" style="min-height:30px;"><span class="aj-firstchip" id="aj-first" style="display:none;"></span></div>
        <div class="center" style="margin:8px 0;"><div class="aj-slots" id="aj-slots"></div></div>
        <div class="center" style="margin:14px 0 4px;"><div class="aj-keys" id="aj-keys"></div></div>
        <p class="hint">Tap the letter buttons or type on your keyboard. <b>Enter</b> checks your answer, <b>Backspace</b> deletes. Stuck? Use the header <b>Hint</b> button to reveal the first letter.</p>
      `;

      const statusEl = root.querySelector("#aj-status");
      const tilesEl = root.querySelector("#aj-tiles");
      const firstEl = root.querySelector("#aj-first");
      const slotsEl = root.querySelector("#aj-slots");
      const keysEl = root.querySelector("#aj-keys");

      if (!document.getElementById("aj-style")) {
        const s = document.createElement("style");
        s.id = "aj-style";
        s.textContent = `
          .aj-tiles { display: inline-flex; gap: 8px; }
          .aj-tile { width: 52px; height: 52px; border-radius: 14px; display: grid; place-items: center; color: #fff; font-family: var(--font-mono); font-weight: 800; font-size: 1.6rem; box-shadow: var(--shadow); user-select: none; }
          .aj-firstchip { display: inline-block; padding: 4px 14px; border-radius: 999px; background: var(--bg-elev); border: 2px dashed var(--accent); color: var(--text); font-family: var(--font-mono); font-weight: 700; font-size: 1rem; }
          .aj-slots { display: inline-flex; gap: 6px; }
          .aj-slot { width: 42px; height: 50px; border-bottom: 4px solid var(--border-strong); display: grid; place-items: center; font-family: var(--font-mono); font-weight: 800; font-size: 1.5rem; color: var(--text); }
          .aj-slots.solved .aj-slot { background: var(--success); color: #fff; border-radius: 10px; border-color: var(--success); }
          .aj-slots.revealed .aj-slot { background: #f59e0b; color: #fff; border-radius: 10px; border-color: #f59e0b; }
          .aj-slots.aj-shake { animation: aj-shake 0.4s; }
          @keyframes aj-shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
          .aj-keys { display: grid; grid-template-columns: repeat(9, 40px); gap: 5px; justify-content: center; }
          .aj-key { width: 40px; height: 42px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-elev); color: var(--text); font-family: var(--font-mono); font-weight: 700; font-size: 0.95rem; cursor: pointer; }
          .aj-key:hover:not(:disabled) { border-color: var(--accent); }
          .aj-key:disabled { opacity: 0.35; cursor: default; }
          .aj-key.wide { width: 85px; grid-column: span 2; background: var(--bg-soft); }
          .aj-end { text-align: center; padding: 10px; }
          .aj-end-emoji { font-size: 3rem; }
        `;
        document.head.appendChild(s);
      }

      function renderScore() {
        root.querySelector("#aj-round").textContent = Math.min(round + 1, ROUNDS) + "/" + ROUNDS;
        root.querySelector("#aj-score").textContent = score;
        root.querySelector("#aj-hints").textContent = hintsLeft;
      }

      function renderTiles() {
        tilesEl.innerHTML = "";
        scram.split("").forEach((ch, i) => {
          const t = document.createElement("div");
          t.className = "aj-tile";
          t.textContent = ch;
          t.style.background = COLORS[i % COLORS.length];
          t.style.transform = "rotate(" + ((i % 2 ? 1 : -1) * (2 + (i % 3))) + "deg)";
          tilesEl.appendChild(t);
        });
      }

      function renderSlots() {
        slotsEl.className = "aj-slots";
        if (locked) slotsEl.classList.add(wasSolved ? "solved" : "revealed");
        slotsEl.innerHTML = "";
        for (let i = 0; i < word.length; i++) {
          const s = document.createElement("div");
          s.className = "aj-slot";
          s.textContent = typed[i] || "";
          slotsEl.appendChild(s);
        }
      }

      function renderKeys() {
        keysEl.innerHTML = "";
        const dis = locked || finished;
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(L => {
          const b = document.createElement("button");
          b.className = "aj-key";
          b.textContent = L;
          b.disabled = dis;
          b.addEventListener("click", () => addLetter(L));
          keysEl.appendChild(b);
        });
        const del = document.createElement("button");
        del.className = "aj-key wide";
        del.textContent = "⌫";
        del.disabled = dis;
        del.addEventListener("click", () => {
          AudioFX.click();
          typed = typed.slice(0, -1);
          renderSlots();
        });
        keysEl.appendChild(del);
        const ok = document.createElement("button");
        ok.className = "aj-key wide";
        ok.textContent = "✓";
        ok.disabled = dis;
        ok.addEventListener("click", check);
        keysEl.appendChild(ok);
      }

      function addLetter(L) {
        if (locked || finished) return;
        if (typed.length < word.length) {
          typed += L;
          AudioFX.tick();
          renderSlots();
        }
      }

      function check() {
        if (locked || finished) return;
        if (typed.length !== word.length) {
          App.toast("Type all " + word.length + " letters first!", "info");
          return;
        }
        if (typed === word) {
          locked = true;
          wasSolved = true;
          score++;
          AudioFX.win();
          statusEl.textContent = "🎉 " + word + "! Great job!";
          statusEl.className = "status win";
          renderScore();
          renderSlots();
          renderKeys();
          setTimeout(nextRound, 1400);
        } else {
          AudioFX.error();
          statusEl.textContent = "Not quite — try mixing the letters again!";
          statusEl.className = "status lose";
          slotsEl.classList.add("aj-shake");
          setTimeout(() => {
            if (!alive) return;
            slotsEl.classList.remove("aj-shake");
          }, 450);
        }
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
        const won = score >= 4;
        App.recordResult(won, score);
        const best = Storage.getBest("anagramjunior");
        if (!best || score > best) {
          Storage.setBest("anagramjunior", score);
          App.toast("New best: " + score + "/" + ROUNDS, "success");
        }
        root.querySelector("#aj-best").textContent = Storage.getBest("anagramjunior") || "—";
        statusEl.textContent = "🏁 All done! You solved " + score + " of " + ROUNDS + " words!";
        statusEl.className = "status " + (won ? "win" : "lose");
        firstEl.style.display = "none";
        tilesEl.innerHTML = "";
        const end = document.createElement("div");
        end.className = "aj-end";
        const emoji = score === ROUNDS ? "🏆" : (score >= 4 ? "🌟" : "💪");
        end.innerHTML = '<div class="aj-end-emoji">' + emoji + '</div>' +
          '<div style="font-size:1.2rem;font-weight:700;margin:6px 0;">' + score + " / " + ROUNDS + ' words unscrambled</div>';
        const again = document.createElement("button");
        again.className = "btn primary";
        again.textContent = "Play again";
        again.addEventListener("click", newGame);
        end.appendChild(again);
        tilesEl.appendChild(end);
        slotsEl.innerHTML = "";
        renderKeys();
      }

      function startRound() {
        word = pool[round].toUpperCase();
        scram = scramble(word);
        typed = "";
        showFirst = false;
        locked = false;
        wasSolved = false;
        firstEl.style.display = "none";
        statusEl.textContent = "Round " + (round + 1) + " of " + ROUNDS + " — unscramble the letters!";
        statusEl.className = "status info";
        renderScore();
        renderTiles();
        renderSlots();
        renderKeys();
      }

      function newGame() {
        pool = WORDS.slice().sort(() => Math.random() - 0.5).slice(0, ROUNDS);
        round = 0;
        score = 0;
        hintsLeft = MAX_HINTS;
        finished = false;
        root.querySelector("#aj-best").textContent = Storage.getBest("anagramjunior") || "—";
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
        hintsLeft--;
        showFirst = true;
        AudioFX.tick();
        firstEl.textContent = "Starts with " + word[0].toUpperCase() + "…";
        firstEl.style.display = "inline-block";
        renderScore();
        App.toast("The word starts with " + word[0].toUpperCase(), "info");
      }

      function doSolve() {
        if (finished) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (locked) return;
        locked = true;
        wasSolved = false;
        typed = word;
        AudioFX.lose();
        statusEl.textContent = "The word was " + word.toUpperCase() + " — let's try the next one!";
        statusEl.className = "status lose";
        renderSlots();
        renderKeys();
        setTimeout(nextRound, 1600);
      }

      function onKey(e) {
        if (finished) return;
        if (e.key === "Enter") {
          e.preventDefault();
          check();
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          if (!locked && typed.length) {
            typed = typed.slice(0, -1);
            AudioFX.click();
            renderSlots();
          }
          return;
        }
        if (/^[a-zA-Z]$/.test(e.key)) addLetter(e.key.toUpperCase());
      }

      document.addEventListener("keydown", onKey);

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
      App.showModal("How to play Anagram Junior",
        `The letters of a simple word are all mixed up!
        <br><br>• Type the unscrambled word (or tap the letter buttons).
        <br>• Press <b>Enter</b> (or ✓) to check your answer.
        <br>• Wrong answers just shake — try again as many times as you like.
        <br>• <b>Hint</b> reveals the word's first letter (max 3 per game).
        <br>• <b>Solve</b> shows the answer and moves on.
        <br><br>There are <b>5 rounds</b> — solve 4 or more to win!`);
    },
  });
})();
