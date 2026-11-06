/* Letter Count — given a word, count how many of a specific letter it contains. Timed. */
(function () {
  const WORDS = [
    "abracadabra", "mississippi", "entertainment", "consciousness", "parliamentarian",
    "antidisestablishment", "pneumonoultramicroscopic", "incomprehensibilities", "characteristically", "responsibility",
    "internationalism", "representational", "extraordinarily", "simultaneously", "disenfranchisement",
    "constitutionalism", "uncharacteristically", "overenthusiastically", "counterrevolutionary", "indistinguishable",
    "commercialization", "incompatibility", "incomprehensible", "disproportionately", "incommensurability",
    "weather", "mountain", "celebration", "wonderful", "elephant",
    "strawberry", "chocolate", "adventure", "symphony", "dictionary",
    "knowledge", "adventure", "vegetable", "horizon", "whispering",
    "banana", "ananas", "pineapple", "coconut", "watermelon",
    "pomegranate", "blackberry", "raspberry", "blueberry", "cranberry",
    "cherry", "papaya", "mango", "peach", "apricot",
    "caterpillar", "butterfly", "grasshopper", "ladybug", "dragonfly",
    "kangaroo", "chimpanzee", "rhinoceros", "hippopotamus", "squirrel",
    "alligator", "crocodile", "flamingo", "pelican", "ostrich",
    "penguin", "dolphin", "octopus", "jellyfish", "starfish",
    "alphabet", "rhythm", "syllable", "paragraph", "sentence",
    "grammar", "vowel", "consonant", "language", "translation",
    "calendar", "February", "Wednesday", "Thursday", "Saturday",
    "galaxy", "telescope", "astronaut", "universe", "satellite",
    "kaleidoscope", "lighthouse", "chimney", "doorway", "staircase",
    "balcony", "backyard", "greenhouse", "windmill", "barnyard",
    "tambourine", "xylophone", "orchestra", "symphony", "harmonica",
    "puzzle", "marble", "checker", "backgammon", "dominoes",
    "cinnamon", "ginger", "turmeric", "cardamom", "saffron",
    "lavender", "sunflower", "daffodil", "tulip", "carnation",
    "avalanche", "earthquake", "tornado", "hurricane", "tsunami",
    "volcano", "geyser", "glacier", "waterfall", "rainbow",
    "cappuccino", "espresso", "latte", "macchiato", "frappuccino",
    "chrysanthemum", "begonia", "geranium", "hydrangea", "petunia",
    "ambidextrous", "conscientious", "supercalifragilistic", "incomprehensibilities", "extraterrestrial",
    "encyclopedia", "bibliography", "autobiography", "photography", "cinematography",
    "asteroid", "comet", "meteor", "nebula", "constellation",
    "treadmill", "dumbbell", "barbell", "kettlebell", "trampoline",
    "thermometer", "barometer", "chronometer", "altimeter", "seismograph"
  ];
  const PER = 10;
  const TIME_PER = 6; // seconds per question
  let live = null;
  GameRegistry.register({
    id: "lettercount",
    name: "Letter Count",
    icon: "🔢",
    category: "quiz",
    description: "Count how many of a given letter appear in the word — quick!",
    tags: ["quiz", "letters", "timed"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false, timer = null, timeLeft = TIME_PER;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="lc-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="lc-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="lc-time">${TIME_PER}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lc-best">—</div></div>
        </div>
        <div class="status info" id="lc-status">How many of the highlighted letter appear?</div>
        <div id="lc-word" style="text-align:center;font-size:1.6rem;font-weight:700;font-family:var(--font-mono);letter-spacing:0.1em;margin:18px 0;text-transform:uppercase;"></div>
        <div id="lc-letter" style="text-align:center;font-size:2.4rem;font-weight:700;color:var(--accent);margin:14px 0;"></div>
        <div id="lc-opts" class="row" style="gap:8px;justify-content:center;flex-wrap:wrap;"></div>
      `;
      const statusEl = root.querySelector("#lc-status");
      const wordEl = root.querySelector("#lc-word");
      const letterEl = root.querySelector("#lc-letter");
      const optsEl = root.querySelector("#lc-opts");

      function makeQuestion() {
        const word = WORDS[Math.floor(Math.random() * WORDS.length)];
        const letter = word[Math.floor(Math.random() * word.length)];
        const count = word.split("").filter(c => c === letter).length;
        const opts = new Set([count]);
        while (opts.size < 4) {
          const v = Math.max(0, count + Math.floor(Math.random() * 5 - 2));
          opts.add(v);
        }
        const optArr = Array.from(opts).sort((a, b) => a - b);
        return {word, letter, count, opts: optArr, a: optArr.indexOf(count)};
      }

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        // Render word with the target letter highlighted
        wordEl.innerHTML = cur.word.split("").map(c => c === cur.letter ? `<span style="color:var(--accent);font-weight:900;">${c.toUpperCase()}</span>` : c.toUpperCase()).join("");
        letterEl.textContent = '"' + cur.letter.toUpperCase() + '"';
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:14px 18px;min-width:60px;font-family:var(--font-mono);font-weight:700;font-size:1.2rem;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#lc-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#lc-score").textContent = score;
        startTimer();
      }

      function startTimer() {
        timeLeft = TIME_PER;
        root.querySelector("#lc-time").textContent = timeLeft;
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive) {
            clearInterval(timer);
            return;
          }
          timeLeft--;
          root.querySelector("#lc-time").textContent = timeLeft;
          if (timeLeft <= 0) {
            clearInterval(timer);
            answer(-1, null); // timeout = wrong
          }
        }, 1000);
      }

      function answer(i, b) {
        if (answered) return;
        answered = true;
        clearInterval(timer);
        const cur = qs[idx];
        if (i === cur.a) {
          if (b) {
            b.style.background = "var(--success)";
            b.style.color = "#fff";
          }
          const pts = 10 + timeLeft; // bonus for speed
          score += pts;
          AudioFX.pop();
          statusEl.textContent = `✓ +${pts} (${timeLeft}s left)!`;
          statusEl.className = "status win";
        } else {
          if (b) {
            b.style.background = "var(--danger)";
            b.style.color = "#fff";
          }
          AudioFX.error();
          Array.from(optsEl.children).forEach((bb, j) => {
            if (j === cur.a) bb.style.background = "var(--success)";
            bb.style.color = "#fff";
          });
          statusEl.textContent = `✗ Answer: ${cur.count}.`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1100);
      }

      function finish() {
        clearInterval(timer);
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}.`;
        statusEl.className = "status win";
        wordEl.textContent = "🎉";
        letterEl.textContent = "";
        optsEl.innerHTML = "";
        const best = Storage.getBest("lettercount");
        if (!best || score > best) {
          Storage.setBest("lettercount", score);
          root.querySelector("#lc-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const r = document.createElement("button");
        r.className = "btn primary";
        r.textContent = "Play again";
        r.addEventListener("click", newRound);
        optsEl.appendChild(r);
      }

      function newRound() {
        qs = Array.from({length: PER}, () => makeQuestion());
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#lc-best").textContent = Storage.getBest("lettercount") || "—";
        statusEl.textContent = "How many of the highlighted letter appear?";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Letter Count",
        `You'll see a word with the target letter highlighted in color, and a big quote of the target letter.
        <br><br>Count how many times that letter appears in the word — pick the right number fast!
        <br><br>${10} questions. Each correct answer earns <b>10 + seconds remaining</b>. You have ${6} seconds per question.`);
    },
  });
})();
