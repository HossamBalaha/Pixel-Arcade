/* Word Wheel Classic — the classic British newspaper puzzle.
   Nine letters: eight around the ring plus the required centre letter, all
   taken from a 9-letter base word. Find words of 4+ letters that MUST use
   the centre letter, using each wheel letter at most as often as it appears.
   4 letters = 1 point, +1 per extra letter; a 9-letter pangram earns +10.
   You have two minutes per round. */
(function () {
  "use strict";

  const ROUND_SECONDS = 120;
  const WIN_SCORE = 15;

  // 9-letter base words, the required centre letter, and curated valid
  // 7–9 letter words that can be built from that base's letters (the shared
  // 4–6 letter dictionary lives in window.WORDS_ALL — see js/wordlist.js).
  const BASES = [
    {word: "WONDERFUL", center: "R", extra: ["FOUNDER", "ROUNDEL"]},
    {word: "EDUCATION", center: "A", extra: ["AUCTION", "CAUTION"]},
    {word: "CHRISTMAS", center: "S", extra: []},
    {word: "LANGUAGES", center: "A", extra: ["LANGUAGE"]},
    {word: "BREAKFAST", center: "A", extra: []},
    {word: "DANGEROUS", center: "R", extra: ["DANGERS", "GARDENS"]},
    {word: "MACHINERY", center: "E", extra: ["MACHINE"]},
    {word: "ADMIRABLE", center: "A", extra: ["ADMIRAL"]},
    {word: "HOSPITALS", center: "S", extra: ["HOSPITAL"]},
    {word: "WATERFALL", center: "A", extra: ["FLATWARE"]},
    {word: "COUNTRIES", center: "R", extra: ["COUNTERS", "RECOUNTS"]},
    {word: "BIRTHDAYS", center: "A", extra: ["BIRTHDAY"]},
    {word: "VOLCANOES", center: "O", extra: []},
    {word: "UNIVERSAL", center: "A", extra: ["UNRAVELS"]},
    {word: "ELEPHANTS", center: "A", extra: ["ELEPHANT"]},
    {word: "TRIANGLES", center: "A", extra: ["TRIANGLE"]},
    {word: "CHEMISTRY", center: "R", extra: []},
    {word: "DISCOVERY", center: "R", extra: ["DISCOVER"]},
    {word: "ORCHESTRA", center: "A", extra: ["ROACHES", "CARTHORSE"]},
    {word: "CARDIGANS", center: "A", extra: ["CARDIGAN"]},
    {word: "LEMONADES", center: "A", extra: ["LEMONADE"]},
    {word: "ORANGUTAN", center: "A", extra: ["ARGONAUT"]},
    {word: "DINOSAURS", center: "A", extra: ["DINOSAUR"]},
    {word: "HOUSEWORK", center: "O", extra: ["WORKHOUSE"]},
    {word: "FOOTBALLS", center: "A", extra: ["FOOTBALL"]},
    {word: "SUNFLOWER", center: "O", extra: ["FLOWERS"]},
    {word: "TREASURES", center: "A", extra: ["TREASURE"]},
    {word: "RAINCOATS", center: "A", extra: ["RAINCOAT"]},
    {word: "CHAMPIONS", center: "A", extra: []},
    {word: "SEASHELLS", center: "A", extra: ["SEASHELL"]},
    {word: "AVALANCHE", center: "A", extra: []},
    {word: "BLUEBERRY", center: "R", extra: ["RUBBERY"]},
    {word: "HALLOWEEN", center: "A", extra: []},
    {word: "MOUNTAINS", center: "A", extra: ["MOUNTAIN"]},
  ];

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
    id: "wordwheelclassic",
    name: "Word Wheel Classic",
    icon: "🎡",
    category: "word",
    description: "Classic newspaper wheel: make 4+ letter words from 9 letters — every word must use the centre letter. Pangram = +10!",
    tags: ["word", "anagram", "timer", "vocabulary", "pangram"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let base = null, center = "", counts = {}, outer = [];
      let dict = new Set(), targets = new Set(), found = new Set();
      let score = 0, over = false, timeLeft = ROUND_SECONDS, timerId = null;

      if (!document.getElementById("wwc-style")) {
        const s = document.createElement("style");
        s.id = "wwc-style";
        s.textContent = `
          .wwc-wrap { display:flex; gap:20px; align-items:center; justify-content:center; flex-wrap:wrap; margin:14px 0; }
          .wwc-wheel { position:relative; width:264px; height:264px; flex:none; }
          .wwc-tile { position:absolute; width:54px; height:54px; border-radius:50%; border:2px solid var(--border); background:var(--bg-elev); color:var(--text); font-family:var(--font-mono); font-weight:700; font-size:1.4rem; cursor:pointer; display:grid; place-items:center; padding:0; transition: transform 0.1s, border-color 0.15s; }
          .wwc-tile:hover { border-color:var(--accent); }
          .wwc-tile:active { transform:scale(0.92); }
          .wwc-center { width:62px; height:62px; font-size:1.6rem; background:var(--accent); border-color:var(--accent); color:#fff; box-shadow:0 0 0 4px var(--accent-soft); }
          .wwc-side { display:flex; flex-direction:column; gap:8px; min-width:210px; }
          .wwc-input { font-family:var(--font-mono); font-size:1.25rem; letter-spacing:0.22em; text-transform:uppercase; text-align:center; padding:10px 8px; border-radius:var(--radius); border:1px solid var(--border); background:var(--bg-elev); color:var(--text); width:100%; }
          .wwc-input:focus { outline:2px solid var(--accent); }
          .wwc-found { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; margin-top:10px; min-height:30px; }
          .wwc-chip { display:inline-block; padding:3px 10px; border-radius:999px; background:var(--bg-elev); border:1px solid var(--border); font-family:var(--font-mono); font-size:0.8rem; color:var(--text); }
          .wwc-chip b { color:var(--accent); margin-left:4px; }
          .wwc-chip.pangram { background:var(--success); border-color:var(--success); color:#fff; }
          .wwc-chip.pangram b { color:#fff; }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="wwc-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="wwc-time">2:00</div></div>
          <div class="score-cell"><div class="label">Words</div><div class="val" id="wwc-words">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wwc-best">—</div></div>
        </div>
        <div class="status info" id="wwc-status">Make words of 4+ letters — each must use the centre letter.</div>
        <div class="wwc-wrap">
          <div class="wwc-wheel" id="wwc-wheel"></div>
          <div class="wwc-side">
            <input id="wwc-input" class="wwc-input" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="9" placeholder="TYPE A WORD" aria-label="Your word"/>
            <div class="row" style="gap:8px;">
              <button class="btn" id="wwc-back" type="button" style="flex:1;">⌫ Delete</button>
              <button class="btn primary" id="wwc-enter" type="button" style="flex:1;">Enter</button>
            </div>
            <div class="row" style="gap:8px;">
              <button class="btn" id="wwc-shuffle" type="button" style="flex:1;">🔀 Shuffle</button>
              <button class="btn" id="wwc-new" type="button" style="flex:1;">New round</button>
            </div>
          </div>
        </div>
        <div class="wwc-found" id="wwc-found"><span class="wwc-chip" style="border-style:dashed; color:var(--text-muted);">Found words appear here…</span></div>
        <p class="hint">4 letters = 1 pt, each extra letter +1, 9-letter <b>pangram</b> = +10 bonus. Every word must contain the centre letter. Keyboard: type + <b>Enter</b>.</p>
      `;

      const wheelEl = root.querySelector("#wwc-wheel");
      const inputEl = root.querySelector("#wwc-input");
      const statusEl = root.querySelector("#wwc-status");
      const foundEl = root.querySelector("#wwc-found");
      const scoreEl = root.querySelector("#wwc-score");
      const timeEl = root.querySelector("#wwc-time");
      const wordsEl = root.querySelector("#wwc-words");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + cls;
      }

      function canMake(word) {
        const c = Object.assign({}, counts);
        for (const ch of word) {
          if (!c[ch]) return false;
          c[ch]--;
        }
        return true;
      }

      function fmtTime(s) {
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
      }

      function updateClock() {
        timeEl.textContent = fmtTime(Math.max(0, timeLeft));
      }

      function updateScoreboard() {
        scoreEl.textContent = score;
        wordsEl.textContent = found.size;
        const best = Storage.getBest("wordwheelclassic");
        root.querySelector("#wwc-best").textContent = best != null ? best : "—";
      }

      // ---------- round lifecycle ----------
      function startRound() {
        stopTimer();
        base = BASES[Math.floor(Math.random() * BASES.length)];
        // Letters are compared in lowercase throughout (display is uppercase).
        center = base.center.toLowerCase();
        counts = {};
        for (const ch of base.word.toLowerCase()) counts[ch] = (counts[ch] || 0) + 1;
        outer = base.word.split("");
        outer.splice(outer.indexOf(base.center), 1);
        outer = shuffled(outer);

        // Dictionary: shared 4–6 letter words + every curated 7–9 letter
        // extra (all real English) + the base word itself.
        dict = new Set();
        const WA = (typeof window !== "undefined" && Array.isArray(window.WORDS_ALL)) ? window.WORDS_ALL : [];
        for (const w of WA) dict.add(w);
        for (const b of BASES) for (const x of b.extra) dict.add(x.toLowerCase());
        dict.add(base.word.toLowerCase());

        // Precompute every legal word for this wheel (used by hint/solve).
        targets = new Set();
        for (const w of dict) {
          if (w.length >= 4 && w.length <= 9 && w.includes(center) && canMake(w)) targets.add(w);
        }

        found = new Set();
        score = 0;
        over = false;
        timeLeft = ROUND_SECONDS;
        inputEl.value = "";
        inputEl.disabled = false;
        renderWheel();
        renderFound();
        updateScoreboard();
        updateClock();
        setStatus("Make words of 4+ letters — each must use the centre letter " + center.toUpperCase() + ".", "info");
        timerId = setInterval(() => {
          if (!alive || over) return;
          timeLeft--;
          updateClock();
          if (timeLeft <= 0) endRound();
        }, 1000);
      }

      function stopTimer() {
        if (timerId !== null) {
          clearInterval(timerId);
          timerId = null;
        }
      }

      function endRound() {
        if (over) return;
        over = true;
        stopTimer();
        inputEl.disabled = true;
        inputEl.value = "";
        const won = score >= WIN_SCORE;
        const hadPangram = found.has(base.word.toLowerCase());
        AudioFX[won ? "win" : "lose"]();
        if (Storage.submitScore("wordwheelclassic", score)) {
          App.toast("New best score: " + score, "success");
        }
        updateScoreboard();
        setStatus(won
          ? "⏱ Time's up — " + score + " points from " + found.size + " words. Great round!"
          : "⏱ Time's up — " + score + " points from " + found.size + " words.", won ? "win" : "lose");
        App.recordResult(won, score);
        const best = Storage.getBest("wordwheelclassic");
        App.showModal("Time's up!",
          `You scored <b>${score} points</b> with <b>${found.size} word${found.size === 1 ? "" : "s"}</b>.
          <br>${hadPangram ? "🌟 You found the pangram <b>" + base.word + "</b>!" : "The 9-letter pangram was <b>" + base.word + "</b>."}
          <br><br>Best score: <b>${best != null ? best : 0}</b> · Press <b>New round</b> to spin again.`);
      }

      // ---------- wheel ----------
      function renderWheel() {
        wheelEl.innerHTML = "";
        const cx = 132, cy = 132, R = 94, tile = 54;
        // Centre letter (required in every word)
        const c = document.createElement("button");
        c.type = "button";
        c.className = "wwc-tile wwc-center";
        c.textContent = center.toUpperCase();
        c.title = "Centre letter — every word must use it";
        c.style.left = (cx - 31) + "px";
        c.style.top = (cy - 31) + "px";
        c.addEventListener("click", () => addLetter(center));
        wheelEl.appendChild(c);
        // Ring of 8 outer letters
        outer.forEach((ch, i) => {
          const ang = -Math.PI / 2 + (i / 8) * Math.PI * 2;
          const b = document.createElement("button");
          b.type = "button";
          b.className = "wwc-tile";
          b.textContent = ch;
          b.style.left = (cx + R * Math.cos(ang) - tile / 2) + "px";
          b.style.top = (cy + R * Math.sin(ang) - tile / 2) + "px";
          b.addEventListener("click", () => addLetter(ch));
          wheelEl.appendChild(b);
        });
      }

      function addLetter(ch) {
        if (over) return;
        inputEl.value = (inputEl.value + ch).toUpperCase().slice(0, 9);
        AudioFX.pop();
      }

      // ---------- found list ----------
      function renderFound() {
        foundEl.innerHTML = "";
        if (!found.size) {
          const ph = document.createElement("span");
          ph.className = "wwc-chip";
          ph.style.borderStyle = "dashed";
          ph.style.color = "var(--text-muted)";
          ph.textContent = "Found words appear here…";
          foundEl.appendChild(ph);
          return;
        }
        for (const w of found) {
          const chip = document.createElement("span");
          const pangram = w.length === 9;
          chip.className = "wwc-chip" + (pangram ? " pangram" : "");
          chip.innerHTML = w.toUpperCase() + "<b>+" + (w.length - 3 + (pangram ? 10 : 0)) + "</b>";
          foundEl.appendChild(chip);
        }
      }

      // ---------- guessing ----------
      function submit() {
        if (over) return;
        const word = inputEl.value.replace(/[^a-z]/gi, "").toLowerCase();
        if (!word) {
          setStatus("Type a word first — tap the wheel letters or use your keyboard.", "info");
          return;
        }
        inputEl.value = "";
        if (word.length < 4) {
          fail("“" + word.toUpperCase() + "” is too short — words need at least 4 letters.");
        } else if (!word.includes(center)) {
          fail("Every word must contain the centre letter " + center.toUpperCase() + ".");
        } else if (!canMake(word)) {
          fail("The wheel doesn't have enough letters for " + word.toUpperCase() + ".");
        } else if (found.has(word)) {
          fail(word.toUpperCase() + " is already on your list!");
        } else if (!dict.has(word)) {
          fail("“" + word.toUpperCase() + "” isn't in our word list.");
        } else {
          const pangram = word.length === 9;
          const gain = (word.length - 3) + (pangram ? 10 : 0);
          found.add(word);
          score += gain;
          AudioFX[pangram || word.length >= 7 ? "win" : "pop"]();
          if (pangram) App.toast("🌟 Pangram! +" + gain + " points", "success");
          setStatus("✓ " + word.toUpperCase() + " — +" + gain + (pangram ? " (pangram bonus!)" : " point" + (gain === 1 ? "" : "s")), "win");
          renderFound();
          updateScoreboard();
        }
      }

      function fail(msg) {
        AudioFX.error();
        setStatus(msg, "lose");
      }

      // ---------- input events ----------
      inputEl.addEventListener("input", () => {
        inputEl.value = inputEl.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 9);
      });
      root.querySelector("#wwc-back").addEventListener("click", () => {
        inputEl.value = inputEl.value.slice(0, -1);
        AudioFX.click();
      });
      root.querySelector("#wwc-enter").addEventListener("click", submit);
      root.querySelector("#wwc-shuffle").addEventListener("click", () => {
        outer = shuffled(outer);
        renderWheel();
        AudioFX.click();
      });
      root.querySelector("#wwc-new").addEventListener("click", () => {
        AudioFX.click();
        startRound();
      });

      function onKey(e) {
        if (!alive || over) return;
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.target === inputEl) {
          return; // native typing / backspace in the input
        } else if (/^[a-zA-Z]$/.test(e.key)) {
          e.preventDefault();
          inputEl.focus();
          inputEl.value = (inputEl.value + e.key).toUpperCase().slice(0, 9);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          inputEl.value = inputEl.value.slice(0, -1);
        }
      }

      document.addEventListener("keydown", onKey);

      // ---------- hint / solve ----------
      function doHint() {
        if (over) {
          App.toast("Round over — press New round", "info");
          return;
        }
        const unfound = [];
        for (const w of targets) if (!found.has(w)) unfound.push(w);
        if (!unfound.length) {
          App.toast("Incredible — you found every word!", "success");
          return;
        }
        const w = unfound[Math.floor(Math.random() * unfound.length)];
        AudioFX.tick();
        App.toast("Hint: there's a " + w.length + "-letter word starting “" + w.slice(0, 2).toUpperCase() + "”", "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Round over — press New round", "info");
          return;
        }
        const unfound = [];
        for (const w of targets) if (!found.has(w)) unfound.push(w);
        if (!unfound.length) {
          App.toast("You found every possible word!", "success");
          return;
        }
        const baseWord = base.word.toLowerCase();
        if (unfound.includes(baseWord)) {
          AudioFX.reveal();
          App.toast("The 9-letter pangram is " + base.word + " (+" + (9 - 3 + 10) + " points!)", "info");
          return;
        }
        unfound.sort((a, b) => b.length - a.length);
        const w = unfound[0];
        AudioFX.reveal();
        App.toast("Try " + w.toUpperCase() + " — worth " + (w.length - 3) + " points", "info");
      }

      live = {hint: doHint, solve: doSolve};

      startRound();

      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        stopTimer();
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Word Wheel Classic",
        `The classic British newspaper puzzle. The wheel holds <b>9 letters</b>: 8 around the ring plus the highlighted <b>centre letter</b> — together they spell a hidden 9-letter word.
        <br><br>Find as many words as you can in <b>2 minutes</b>:
        <br>• Each word needs <b>4+ letters</b> and <b>must contain the centre letter</b>.
        <br>• Use each wheel letter no more often than it appears (letters repeat when the wheel shows duplicates).
        <br>• Tap the wheel letters or just type, then press <b>Enter</b>.
        <br><br><b>Scoring:</b> 4 letters = 1 point, +1 per extra letter (5 letters = 2, 6 = 3 …). A 9-letter <b>pangram</b> that uses every letter earns a <b>+10 bonus</b>.
        <br><br>Words are checked against a real English dictionary (4–6 letter words from the shared corpus, plus curated longer words) — no junk accepted. Score <b>${WIN_SCORE}+</b> for a winning round.`);
    },
  });
})();
