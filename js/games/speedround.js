/* Speed Round — 30 seconds, endless questions */
(function () {
  GameRegistry.register({
    id: "speedround",
    name: "Speed Round",
    icon: "⏱️",
    category: "quiz",
    description: "30 seconds, endless questions — how many can you nail?",
    tags: ["quiz", "speed", "mixed"],
    mount: function (root, {App, AudioFX, Storage}) {
      const QS = [
        {q: "5 × 7?", o: ["35", "30", "42", "45"], a: 0},
        {q: "Capital of Japan?", o: ["Tokyo", "Kyoto", "Osaka", "Seoul"], a: 0},
        {q: "Largest ocean?", o: ["Pacific", "Atlantic", "Indian", "Arctic"], a: 0},
        {q: "H2O is…", o: ["Water", "Salt", "Oxygen", "Gold"], a: 0},
        {q: "Red + Blue paint = ", o: ["Purple", "Green", "Orange", "Brown"], a: 0},
        {q: "A triangle has ___ angles", o: ["3", "2", "4", "1"], a: 0},
        {q: "Fastest land animal?", o: ["Cheetah", "Lion", "Horse", "Ostrich"], a: 0},
        {q: "12 × 12?", o: ["144", "124", "132", "148"], a: 0},
        {q: "Planet known as the Red Planet?", o: ["Mars", "Venus", "Jupiter", "Mercury"], a: 0},
        {q: "Currency of the UK?", o: ["Pound", "Euro", "Dollar", "Yen"], a: 0},
        {q: "9 − 4 × 2?", o: ["1", "10", "8", "2"], a: 0},
        {q: "How many legs does a spider have?", o: ["8", "6", "10", "4"], a: 0},
        {q: "The Sun is a…", o: ["Star", "Planet", "Comet", "Moon"], a: 0},
        {q: "Boiling point of water (°C)?", o: ["100", "90", "110", "80"], a: 0},
        {q: "Opposite of 'ancient'?", o: ["Modern", "Old", "Rusty", "Vast"], a: 0},
        {q: "Square root of 81?", o: ["9", "8", "7", "6"], a: 0},
        {q: "Which is a prime number?", o: ["13", "15", "21", "27"], a: 0},
        {q: "Language with the most native speakers?", o: ["Mandarin", "English", "Spanish", "Hindi"], a: 0},
        {q: "The Great Wall is in…", o: ["China", "Japan", "India", "Korea"], a: 0},
        {q: "A group of lions is a…", o: ["Pride", "Flock", "School", "Herd"], a: 0},
        {q: "100 ÷ 4?", o: ["25", "20", "40", "50"], a: 0},
        {q: "Vitamin D comes from…", o: ["Sunlight", "Rocks", "Water", "Air"], a: 0},
        {q: "Longest river in the world?", o: ["Nile", "Amazon", "Yangtze", "Danube"], a: 0},
        {q: "Olympics happen every ___ years", o: ["4", "2", "3", "5"], a: 0},
        {q: "The heart pumps…", o: ["Blood", "Air", "Water", "Lymph only"], a: 0},
        {q: "3 cubed?", o: ["27", "9", "6", "81"], a: 0},
        {q: "Mount Everest is in the…", o: ["Himalayas", "Andes", "Alps", "Rockies"], a: 0},
        {q: "A hexagon has ___ sides", o: ["6", "5", "7", "8"], a: 0},
        {q: "Who painted the Mona Lisa?", o: ["Da Vinci", "Picasso", "Van Gogh", "Monet"], a: 0},
        {q: "Ice is frozen…", o: ["Water", "Air", "Carbon", "Salt"], a: 0},
      ];
      let item, score, best, timeLeft, timer, order;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sr2-score">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sr2-time">30</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sr2-best">0</div></div>
        </div>
        <div class="status info" id="sr2-status">GO! Answer as fast as you can!</div>
        <div class="center" id="sr2-q" style="font-size:19px;font-weight:700;margin:12px 0;"></div>
        <div class="center" id="sr2-opts" style="max-width:400px;"></div>
      `;

      const qEl = root.querySelector("#sr2-q");
      const optsEl = root.querySelector("#sr2-opts");
      const statusEl = root.querySelector("#sr2-status");
      best = Storage.getBest("speedround") || 0;
      order = QS.map((q, i) => i).sort(() => Math.random() - 0.5);
      let qi = 0;

      function next() {
        item = QS[order[qi % order.length]];
        qi++;
        // shuffle options with tracked answer
        const idx = item.o.map((_, i) => i).sort(() => Math.random() - 0.5);
        item.shuffled = idx.map(i => item.o[i]);
        item.shuffledA = idx.indexOf(item.a);
        qEl.textContent = item.q;
        render();
      }

      function pick(i) {
        if (i === item.shuffledA) {
          score += 10;
          AudioFX.pop();
        } else {
          score = Math.max(0, score - 5);
          AudioFX.error();
        }
        updateHud();
        next();
      }

      function end() {
        clearInterval(timer);
        AudioFX.lose();
        statusEl.textContent = `⏱️ Time! You scored ${score} points (${Math.floor(score / 10)} correct)`;
        statusEl.className = "status " + (score >= 100 ? "win" : "info");
        if (score > best) {
          best = score;
          Storage.setBest("speedround", score);
          App.toast("New best: " + score, "success");
        }
        qEl.textContent = "—";
        optsEl.innerHTML = `<button class="btn primary" id="sr2-again">⏱️ Go again</button>`;
        optsEl.querySelector("#sr2-again").addEventListener("click", start);
      }

      function updateHud() {
        root.querySelector("#sr2-score").textContent = score;
        root.querySelector("#sr2-time").textContent = timeLeft;
        root.querySelector("#sr2-best").textContent = best;
      }

      function render() {
        optsEl.innerHTML = "";
        item.shuffled.forEach((o, i) => {
          const b = document.createElement("div");
          b.style.cssText = "display:block;width:min(340px,90%);padding:11px;margin:5px auto;border-radius:9px;background:var(--bg-soft,#334155);color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;";
          b.textContent = o;
          b.addEventListener("pointerdown", () => pick(i));
          optsEl.appendChild(b);
        });
      }

      function start() {
        score = 0;
        timeLeft = 30;
        qi = 0;
        order = order.sort(() => Math.random() - 0.5);
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          updateHud();
          if (timeLeft <= 0) end();
        }, 1000);
        statusEl.textContent = "GO! Answer as fast as you can!";
        statusEl.className = "status info";
        next();
      }

      start();
      return function cleanup() {
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Speed Round",
        `Thirty seconds on the clock, rapid-fire mixed trivia: math, geography, science, vocabulary — everything goes.
        <br><br><b>+10</b> for a correct answer, <b>−5</b> for a miss — wrong guesses cost you, but hesitation costs more.
        The 30-question deck is shuffled every game. Pure reflex quizzing!`);
    },
  });
})();
