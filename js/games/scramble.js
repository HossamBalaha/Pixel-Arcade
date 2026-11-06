/* Word Scramble — unscramble the letters before time runs out */
(function () {
  const WORDS = [
    {w: "JAVASCRIPT", h: "Web programming language"},
    {w: "GUITAR", h: "Six-stringed instrument"},
    {w: "PYTHON", h: "Snake or programming language"},
    {w: "ROCKET", h: "Vehicle that goes to space"},
    {w: "PYTHON", h: "Reptile or programming language"},
    {w: "ELEPHANT", h: "Large gray mammal"},
    {w: "TELESCOPE", h: "Device for viewing distant objects"},
    {w: "DIAMOND", h: "Hardest natural mineral"},
    {w: "VOLCANO", h: "Mountain that erupts lava"},
    {w: "WIZARD", h: "Magic user in fantasy"},
    {w: "ORCHESTRA", h: "Large musical ensemble"},
    {w: "PENGUIN", h: "Antarctic flightless bird"},
    {w: "ASTRONAUT", h: "Space traveler"},
    {w: "COMPUTER", h: "Calculating machine"},
    {w: "KEYBOARD", h: "Typing input device"},
    {w: "DOLPHIN", h: "Smart marine mammal"},
    {w: "HURRICANE", h: "Powerful tropical storm"},
    {w: "TROPHY", h: "Winning award"},
    {w: "WATERFALL", h: "Cascading water feature"},
    {w: "SANDWICH", h: "Food between bread slices"},
    {w: "RAINBOW", h: "Multicolored arc"},
    {w: "PYRAMID", h: "Egyptian monument"},
    {w: "GALAXY", h: "System of stars"},
    {w: "BUTTERFLY", h: "Colorful winged insect"},
    {w: "MOUNTAIN", h: "Tall landform"},
    {w: "OCTOPUS", h: "Eight-armed sea creature"},
    {w: "CHOCOLATE", h: "Sweet brown treat"},
    {w: "KANGAROO", h: "Hopping Australian animal"},
    {w: "LIGHTHOUSE", h: "Tower guiding ships"},
  ];

  function shuffle(s) {
    const a = s.split("");
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    let r = a.join("");
    if (r === s) return shuffle(s); // ensure scrambled
    return r;
  }

  GameRegistry.register({
    id: "scramble",
    name: "Word Scramble",
    icon: "🔀",
    category: "word",
    description: "Unscramble the letters before time runs out",
    tags: ["word", "timer", "keyboard"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let current, scrambled, answer, time, score, round, timerInterval, over;
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

      function newGame() {
        score = 0;
        round = 0;
        over = false;
        nextWord();
      }

      function nextWord() {
        current = WORDS[Math.floor(Math.random() * WORDS.length)];
        scrambled = shuffle(current.w);
        answer = "";
        time = 30;
        round++;
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive) return clearInterval(timerInterval);
          time--;
          root.querySelector("#sc-timer").textContent = time + "s";
          root.querySelector("#sc-timer").style.color = time <= 5 ? "var(--danger)" : "";
          if (time <= 0) {
            clearInterval(timerInterval);
            AudioFX.lose();
            over = true;
            statusEl.textContent = `Time's up! The word was ${current.w}. Score: ${score}`;
            statusEl.className = "status lose";
            if (score > (Storage.getBest("scramble") || 0)) {
              Storage.setBest("scramble", score);
              App.toast("New best: " + score + " words", "success");
            }
          }
        }, 1000);
        render();
      }

      function render() {
        root.querySelector("#sc-scrambled").textContent = scrambled.split("").join(" ");
        root.querySelector("#sc-answer").textContent = answer.split("").join(" ") || "_".repeat(current.w.length).split("").join(" ");
        root.querySelector("#sc-hint").textContent = "Hint: " + current.h;
        root.querySelector("#sc-round").textContent = round;
        root.querySelector("#sc-score").textContent = score;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="sc-round">1</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sc-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sc-timer">30s</div></div>
        </div>
        <div class="status info" id="sc-status">Unscramble the word!</div>
        <div style="text-align:center;font-family:var(--font-mono);font-size:1.8rem;letter-spacing:0.2em;font-weight:700;margin:10px 0;" id="sc-scrambled"></div>
        <div style="text-align:center;font-family:var(--font-mono);font-size:1.4rem;letter-spacing:0.2em;color:var(--accent);margin:6px 0;" id="sc-answer"></div>
        <div class="text-muted text-sm center" id="sc-hint"></div>
        <div class="row" style="justify-content:center;margin-top:14px;">
          <button class="btn" id="sc-skip">Skip (−1)</button>
          <button class="btn primary" id="sc-submit">Submit (Enter)</button>
          <button class="btn" id="sc-back">⌫ Backspace</button>
        </div>
        <p class="hint">Type letters on your keyboard. <b>Enter</b> to submit. <b>Backspace</b> to delete. <b>R</b> for new game.</p>
      `;

      const statusEl = root.querySelector("#sc-status");

      function submit() {
        if (over) return;
        if (answer === current.w) {
          score++;
          AudioFX.win();
          statusEl.textContent = `✓ Correct! Next word…`;
          statusEl.className = "status win";
          later(nextWord, 700);
        } else {
          AudioFX.error();
          statusEl.textContent = `✗ Wrong. Try again.`;
          statusEl.className = "status";
          later(() => {
            if (!over) {
              statusEl.textContent = "Unscramble the word!";
              statusEl.className = "status info";
            }
          }, 1200);
        }
      }

      root.querySelector("#sc-submit").addEventListener("click", submit);
      root.querySelector("#sc-back").addEventListener("click", () => {
        AudioFX.click();
        answer = answer.slice(0, -1);
        render();
      });
      root.querySelector("#sc-skip").addEventListener("click", () => {
        if (over) return;
        AudioFX.click();
        score = Math.max(0, score - 1);
        nextWord();
      });

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newGame();
          return;
        }
        if (over) return;
        if (e.key === "Enter") submit();
        else if (e.key === "Backspace") {
          e.preventDefault();
          answer = answer.slice(0, -1);
          AudioFX.click();
          render();
        } else if (/^[a-zA-Z]$/.test(e.key) && answer.length < current.w.length) {
          answer += e.key.toUpperCase();
          AudioFX.tick();
          render();
        }
      }

      document.addEventListener("keydown", onKey);

      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInterval);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Word Scramble",
        `Unscramble the letters to form a word. Each round you get 30 seconds.
        <br><br>Type letters with your keyboard. <b>Enter</b> to submit. <b>Backspace</b> to delete. <b>Skip</b> costs 1 point.
        <br><br>Every correct word adds 1 to your score. Wrong guesses are not penalized but waste time. Beat your best score across rounds!`);
    },
  });
})();
