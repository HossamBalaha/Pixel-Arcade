/* Flag Quiz — match flag emoji to the country. Multiple choice. */
(function () {
  const QUESTIONS = [
    {q: "Which country's flag is 🇺🇸?", opts: ["UK", "USA", "Australia", "Canada"], a: 1},
    {q: "Which country's flag is 🇬🇧?", opts: ["UK", "USA", "France", "Germany"], a: 0},
    {q: "Which country's flag is 🇨🇦?", opts: ["USA", "Canada", "Australia", "Russia"], a: 1},
    {q: "Which country's flag is 🇯🇵?", opts: ["China", "South Korea", "Japan", "Vietnam"], a: 2},
    {q: "Which country's flag is 🇨🇳?", opts: ["China", "Japan", "Vietnam", "Thailand"], a: 0},
    {q: "Which country's flag is 🇫🇷?", opts: ["Italy", "France", "Belgium", "Spain"], a: 1},
    {q: "Which country's flag is 🇩🇪?", opts: ["Belgium", "Netherlands", "Germany", "Austria"], a: 2},
    {q: "Which country's flag is 🇮🇹?", opts: ["Italy", "Mexico", "Ireland", "Hungary"], a: 0},
    {q: "Which country's flag is 🇪🇸?", opts: ["Portugal", "Spain", "Mexico", "Argentina"], a: 1},
    {q: "Which country's flag is 🇧🇷?", opts: ["Argentina", "Brazil", "Portugal", "Colombia"], a: 1},
    {q: "Which country's flag is 🇦🇷?", opts: ["Argentina", "Brazil", "Chile", "Uruguay"], a: 0},
    {q: "Which country's flag is 🇲🇽?", opts: ["Spain", "Italy", "Mexico", "Portugal"], a: 2},
    {q: "Which country's flag is 🇮🇳?", opts: ["Pakistan", "India", "Sri Lanka", "Bangladesh"], a: 1},
    {q: "Which country's flag is 🇷🇺?", opts: ["Russia", "Slovakia", "Slovenia", "Bulgaria"], a: 0},
    {q: "Which country's flag is 🇰🇷?", opts: ["Japan", "China", "South Korea", "Mongolia"], a: 2},
    {q: "Which country's flag is 🇸🇪?", opts: ["Norway", "Sweden", "Finland", "Denmark"], a: 1},
    {q: "Which country's flag is 🇨🇭?", opts: ["Austria", "Switzerland", "Denmark", "Tunisia"], a: 1},
    {q: "Which country's flag is 🇦🇺?", opts: ["New Zealand", "Australia", "UK", "Fiji"], a: 1},
    {q: "Which country's flag is 🇿🇦?", opts: ["South Africa", "Zimbabwe", "Zambia", "Namibia"], a: 0},
    {q: "Which country's flag is 🇪🇬?", opts: ["Iraq", "Egypt", "Yemen", "Syria"], a: 1},
    {q: "Which country's flag is 🇳🇱?", opts: ["Luxembourg", "Netherlands", "France", "Russia"], a: 1},
    {q: "Which country's flag is 🇧🇪?", opts: ["Germany", "Belgium", "Netherlands", "France"], a: 1},
    {q: "Which country's flag is 🇵🇹?", opts: ["Spain", "Portugal", "Italy", "Brazil"], a: 1},
    {q: "Which country's flag is 🇸🇦?", opts: ["Iran", "Iraq", "Saudi Arabia", "Pakistan"], a: 2},
    {q: "Which country's flag is 🇮🇱?", opts: ["Israel", "Palestine", "Bahrain", "Qatar"], a: 0},
    {q: "Which country's flag is 🇹🇷?", opts: ["Greece", "Turkey", "Tunisia", "Algeria"], a: 1},
    {q: "Which country's flag is 🇬🇷?", opts: ["Greece", "Cyprus", "Croatia", "Malta"], a: 0},
    {q: "Which country's flag is 🇮🇪?", opts: ["Ireland", "Italy", "Ivory Coast", "India"], a: 0},
    {q: "Which country's flag is 🇳🇴?", opts: ["Sweden", "Norway", "Denmark", "Iceland"], a: 1},
    {q: "Which country's flag is 🇩🇰?", opts: ["Norway", "Sweden", "Denmark", "Finland"], a: 2},
    {q: "Which country's flag is 🇫🇮?", opts: ["Sweden", "Norway", "Iceland", "Finland"], a: 3},
    {q: "Which country's flag is 🇵🇱?", opts: ["Czech Republic", "Poland", "Monaco", "Indonesia"], a: 1},
    {q: "Which country's flag is 🇺🇦?", opts: ["Sweden", "Finland", "Ukraine", "Denmark"], a: 2},
    {q: "Which country's flag is 🇨🇿?", opts: ["Slovakia", "Czech Republic", "Slovenia", "Croatia"], a: 1},
    {q: "Which country's flag is 🇭🇺?", opts: ["Italy", "Mexico", "Hungary", "Iran"], a: 2},
    {q: "Which country's flag is 🇷🇴?", opts: ["Moldova", "Romania", "Chad", "Andorra"], a: 1},
    {q: "Which country's flag is 🇧🇬?", opts: ["Russia", "Bulgaria", "Slovakia", "Slovenia"], a: 1},
    {q: "Which country's flag is 🇮🇩?", opts: ["Poland", "Monaco", "Indonesia", "Singapore"], a: 2},
    {q: "Which country's flag is 🇹🇭?", opts: ["Laos", "Thailand", "Cambodia", "Vietnam"], a: 1},
    {q: "Which country's flag is 🇻🇳?", opts: ["China", "Vietnam", "North Korea", "Laos"], a: 1},
    {q: "Which country's flag is 🇵🇭?", opts: ["Philippines", "Indonesia", "Malaysia", "Brunei"], a: 0},
    {q: "Which country's flag is 🇲🇾?", opts: ["USA", "Malaysia", "Liberia", "Panama"], a: 1},
    {q: "Which country's flag is 🇸🇬?", opts: ["Indonesia", "Singapore", "Poland", "Monaco"], a: 1},
    {q: "Which country's flag is 🇵🇰?", opts: ["Pakistan", "India", "Bangladesh", "Sri Lanka"], a: 0},
    {q: "Which country's flag is 🇧🇩?", opts: ["Japan", "Bangladesh", "Palau", "China"], a: 1},
    {q: "Which country's flag is 🇮🇷?", opts: ["Iraq", "Iran", "Tajikistan", "Pakistan"], a: 1},
    {q: "Which country's flag is 🇮🇶?", opts: ["Egypt", "Iraq", "Syria", "Yemen"], a: 1},
    {q: "Which country's flag is 🇿🇼?", opts: ["Zimbabwe", "Zambia", "Botswana", "Mozambique"], a: 0},
    {q: "Which country's flag is 🇰🇪?", opts: ["Uganda", "Kenya", "Tanzania", "Rwanda"], a: 1},
    {q: "Which country's flag is 🇳🇬?", opts: ["Nigeria", "Niger", "Ghana", "Ivory Coast"], a: 0},
    {q: "Which country's flag is 🇲🇦?", opts: ["Algeria", "Morocco", "Tunisia", "Libya"], a: 1},
    {q: "Which country's flag is 🇺🇾?", opts: ["Argentina", "Uruguay", "Chile", "Paraguay"], a: 1},
    {q: "Which country's flag is 🇨🇱?", opts: ["Argentina", "Chile", "Peru", "Bolivia"], a: 1},
    {q: "Which country's flag is 🇵🇪?", opts: ["Peru", "Mexico", "Spain", "Italy"], a: 0},
  ];
  const PER_ROUND = 10;

  let live = null;
  GameRegistry.register({
    id: "flagquiz",
    name: "Flag Quiz",
    icon: "🚩",
    category: "quiz",
    description: "Match flag emojis to their countries",
    tags: ["quiz", "geography", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="fq-q">1 / ${PER_ROUND}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fq-best">—</div></div>
        </div>
        <div class="status info" id="fq-status">Pick the country that matches the flag.</div>
        <div id="fq-question" style="text-align:center;font-size:5rem;margin:20px 0;"></div>
        <div id="fq-options" class="col" style="gap:8px;max-width:400px;margin:0 auto;"></div>
        <p class="hint">10 questions per round. Each correct answer = 10 points.</p>
      `;
      const statusEl = root.querySelector("#fq-status");
      const qEl = root.querySelector("#fq-question");
      const optsEl = root.querySelector("#fq-options");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        // Extract the flag emoji from the question (use the segmenter if available, else brute-force match)
        const flagMatch = cur.q.match(/\uD83C[\uDDE6-\uDDFF]{2}/);
        qEl.textContent = flagMatch ? flagMatch[0] : "🏳️";
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#fq-q").textContent = `${idx + 1} / ${PER_ROUND}`;
        root.querySelector("#fq-score").textContent = score;
      }

      function answer(i, btn) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          btn.style.background = "var(--success)";
          btn.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          btn.style.background = "var(--danger)";
          btn.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((b, j) => {
            if (j === cur.a) {
              b.style.background = "var(--success)";
              b.style.color = "#fff";
            }
          });
          statusEl.textContent = `✗ The answer was "${cur.opts[cur.a]}".`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1200);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! You scored ${score} / ${PER_ROUND * 10}.`;
        statusEl.className = "status win";
        qEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("flagquiz");
        if (!best || score > best) {
          Storage.setBest("flagquiz", score);
          root.querySelector("#fq-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => {
          newRound();
        });
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        const shuffled = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER_ROUND);
        qs = shuffled;
        idx = 0;
        score = 0;
        answered = false;
        const best = Storage.getBest("flagquiz");
        root.querySelector("#fq-best").textContent = best || "—";
        statusEl.textContent = "Pick the country that matches the flag.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Flag Quiz",
        `A flag emoji is shown. Pick the matching country from 4 options.
        <br><br>${10} questions per round. Each correct answer = 10 points.`);
    },
  });
})();
