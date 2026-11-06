/* Typing Speed — 60s test, count WPM. Bundled 50 sentences. */
(function () {
  const SENTENCES = [
    "the quick brown fox jumps over the lazy dog",
    "pack my box with five dozen liquor jugs",
    "she sells sea shells by the sea shore",
    "a journey of a thousand miles begins with a single step",
    "to be or not to be that is the question",
    "the early bird catches the worm",
    "actions speak louder than words",
    "all that glitters is not gold",
    "beauty is in the eye of the beholder",
    "every cloud has a silver lining",
    "the pen is mightier than the sword",
    "fortune favors the bold",
    "good things come to those who wait",
    "honesty is the best policy",
    "if at first you do not succeed try try again",
    "keep your friends close and your enemies closer",
    "let sleeping dogs lie",
    "misery loves company",
    "nothing ventured nothing gained",
    "once bitten twice shy",
    "practice makes perfect",
    "the squeaky wheel gets the grease",
    "time heals all wounds",
    "you cannot judge a book by its cover",
    "when in rome do as the romans do",
    "the best things in life are free",
    "love conquers all",
    "patience is a virtue",
    "the grass is always greener on the other side",
    "two heads are better than one",
    "where there is smoke there is fire",
    "you reap what you sow",
    "an apple a day keeps the doctor away",
    "better late than never",
    "curiosity killed the cat",
    "do not count your chickens before they hatch",
    "easy come easy go",
    "fight fire with fire",
    "great minds think alike",
    "hope for the best prepare for the worst",
    "ignorance is bliss",
    "knowledge is power",
    "look before you leap",
    "money does not grow on trees",
    "no pain no gain",
    "opposites attract",
    "the proof of the pudding is in the eating",
    "what goes around comes around",
    "you are never too old to learn",
    "the cat is out of the bag",
    "every dog has its day",
  ];

  GameRegistry.register({
    id: "typingspeed",
    name: "Typing Speed",
    icon: "⌨️",
    category: "arcade",
    description: "How many words per minute can you type in 60 seconds?",
    tags: ["typing", "timer"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let sentence, typed, time, started, timerInt, errors, over;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">WPM</div><div class="val" id="ty-wpm">0</div></div>
          <div class="score-cell"><div class="label">Errors</div><div class="val" id="ty-err">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="ty-time">60s</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ty-best">-</div></div>
        </div>
        <div class="status info" id="ty-status">Type the sentence below — 60 seconds</div>
        <div id="ty-target" style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);padding:16px;font-family:var(--font-mono);font-size:1.1rem;line-height:1.6;min-height:80px;margin:12px 0;"></div>
        <input id="ty-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Start typing…" style="width:100%;padding:12px;font-size:1.1rem;font-family:var(--font-mono);border:2px solid var(--border);border-radius:var(--radius);background:var(--bg-elev);color:var(--text);" />
        <p class="hint">Press <b>Tab</b> or click to focus the box. Best WPM is saved. <b>R</b> for new sentence.</p>
      `;
      const targetEl = root.querySelector("#ty-target");
      const inputEl = root.querySelector("#ty-input");
      const statusEl = root.querySelector("#ty-status");
      root.querySelector("#ty-best").textContent = Storage.getBest("typingspeed") ?? "-";

      function newGame() {
        sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
        typed = "";
        time = 60;
        started = false;
        errors = 0;
        over = false;
        clearInterval(timerInt);
        inputEl.value = "";
        inputEl.disabled = false;
        statusEl.textContent = "Type the sentence below — 60 seconds";
        statusEl.className = "status info";
        root.querySelector("#ty-time").textContent = time + "s";
        render();
        inputEl.focus();
      }

      function render() {
        targetEl.innerHTML = "";
        for (let i = 0; i < sentence.length; i++) {
          const ch = sentence[i];
          const span = document.createElement("span");
          span.textContent = ch === " " ? "\u00A0" : ch;
          if (i < typed.length) {
            if (typed[i] === ch) span.style.background = "var(--success-soft, rgba(34,197,94,0.25))";
            else {
              span.style.background = "var(--danger)";
              span.style.color = "#fff";
            }
          } else if (i === typed.length) {
            span.style.background = "var(--accent-soft)";
            span.style.borderBottom = "2px solid var(--accent)";
          }
          targetEl.appendChild(span);
        }
        const words = typed.trim().split(/\s+/).filter(Boolean).length;
        const elapsed = 60 - time || 0.0001;
        const wpm = Math.round((words / elapsed) * 60);
        root.querySelector("#ty-wpm").textContent = wpm;
        root.querySelector("#ty-err").textContent = errors;
      }

      function onInput() {
        if (over) return;
        if (!started) {
          started = true;
          timerInt = setInterval(() => {
            if (!alive) return;
            if (!alive) return;
            if (!alive) return clearInterval(timerInt);
            time--;
            root.querySelector("#ty-time").textContent = time + "s";
            if (time <= 0) finish();
          }, 1000);
        }
        // count errors (new characters that don't match)
        const newTyped = inputEl.value;
        if (newTyped.length < typed.length) {
          typed = newTyped;
          render();
          return;
        }
        for (let i = typed.length; i < newTyped.length; i++) {
          if (newTyped[i] !== sentence[i] && sentence[i] !== undefined) errors++;
        }
        typed = newTyped;
        if (typed === sentence) {
          finish(true);
        }
        render();
      }

      function finish(complete) {
        over = true;
        clearInterval(timerInt);
        const words = sentence.trim().split(/\s+/).length;
        const elapsed = 60 - time;
        const wpm = Math.round((words / Math.max(elapsed, 1)) * 60);
        inputEl.disabled = true;
        if (complete) {
          statusEl.textContent = `🎉 Done! ${wpm} WPM, ${errors} errors`;
          statusEl.className = "status win";
          AudioFX.win();
        } else {
          statusEl.textContent = `⏰ Time's up! ${wpm} WPM, ${errors} errors`;
          statusEl.className = "status info";
        }
        if (wpm > (Storage.getBest("typingspeed") || 0)) {
          Storage.setBest("typingspeed", wpm);
          App.toast("New best: " + wpm + " WPM", "success");
          root.querySelector("#ty-best").textContent = wpm;
        }
      }

      inputEl.addEventListener("input", onInput);

      function onKey(e) {
        if (e.key === "r" || e.key === "R") {
          if (e.target === inputEl) e.preventDefault();
          newGame();
        }
        if (e.key === "Tab") {
          e.preventDefault();
          inputEl.focus();
        }
      }

      document.addEventListener("keydown", onKey);

      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInt);
      };
    },
    help: function () {
      App.showModal("How to play Typing Speed",
        `Type the displayed sentence as fast and accurately as you can.
        <br><br>Correct characters are highlighted green, incorrect ones red. The current position is underlined.
        <br>You have 60 seconds. Words per minute (WPM) and error count are shown live. Best WPM is saved.`);
    },
  });
})();
