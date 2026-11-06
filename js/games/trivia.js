/* Trivia Quiz — 10 multiple-choice questions, beat the clock. Optional Open Trivia DB source. */
(function () {
  const QUESTIONS = [
    {q: "How many continents are there on Earth?", a: ["5", "6", "7", "8"], c: 2},
    {q: "What is the capital of Australia?", a: ["Sydney", "Canberra", "Melbourne", "Perth"], c: 1},
    {q: "Which planet is known as the Red Planet?", a: ["Venus", "Mars", "Jupiter", "Saturn"], c: 1},
    {q: "Who painted the Mona Lisa?", a: ["Van Gogh", "Picasso", "Da Vinci", "Monet"], c: 2},
    {q: "What is the largest ocean on Earth?", a: ["Atlantic", "Indian", "Arctic", "Pacific"], c: 3},
    {q: "In which year did World War II end?", a: ["1943", "1945", "1947", "1950"], c: 1},
    {q: "What is the chemical symbol for gold?", a: ["Gd", "Au", "Ag", "Go"], c: 1},
    {q: "Which language has the most native speakers worldwide?", a: ["English", "Hindi", "Spanish", "Mandarin"], c: 3},
    {q: "What is the smallest prime number?", a: ["0", "1", "2", "3"], c: 2},
    {q: "Which animal is known as the King of the Jungle?", a: ["Tiger", "Lion", "Elephant", "Gorilla"], c: 1},
    {q: "How many sides does a hexagon have?", a: ["4", "5", "6", "7"], c: 2},
    {
      q: "What gas do plants absorb from the air for photosynthesis?",
      a: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
      c: 1
    },
    {q: "Which country gifted the Statue of Liberty to the US?", a: ["UK", "Spain", "France", "Italy"], c: 2},
    {q: "Who wrote 'Romeo and Juliet'?", a: ["Dickens", "Shakespeare", "Hemingway", "Tolstoy"], c: 1},
    {q: "What is the tallest mountain on Earth?", a: ["K2", "Everest", "Kilimanjaro", "Denali"], c: 1},
    {q: "Which element has the atomic number 1?", a: ["Helium", "Hydrogen", "Oxygen", "Carbon"], c: 1},
    {q: "What is the currency of Japan?", a: ["Won", "Yuan", "Yen", "Rupee"], c: 2},
    {q: "How many bones are in the adult human body?", a: ["206", "201", "210", "212"], c: 0},
    {q: "Which planet is closest to the Sun?", a: ["Venus", "Earth", "Mercury", "Mars"], c: 2},
    {q: "What is the largest mammal in the world?", a: ["Elephant", "Blue whale", "Giraffe", "Hippo"], c: 1},
    {q: "In what city would you find the Eiffel Tower?", a: ["London", "Rome", "Paris", "Berlin"], c: 2},
    {q: "Which is the longest river in the world?", a: ["Amazon", "Nile", "Yangtze", "Mississippi"], c: 1},
    {q: "What is the main ingredient in guacamole?", a: ["Tomato", "Avocado", "Onion", "Pepper"], c: 1},
    {q: "How many players are on a soccer team (on the field)?", a: ["9", "10", "11", "12"], c: 2},
    {
      q: "Who is known as the 'Father of Computers'?",
      a: ["Alan Turing", "Charles Babbage", "Bill Gates", "Steve Jobs"],
      c: 1
    },
  ];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Decode HTML entities from the Open Trivia DB response. Using a
  // <textarea> element means the entity-encoded text is parsed as plain
  // text rather than as HTML — so a hypothetical unescaped <script> tag
  // in the API response can't trigger an event handler via <img onerror>.
  function decode(s) {
    const t = document.createElement("textarea");
    t.innerHTML = s;
    return t.value;
  }

  // Live game state — set at mount time, cleared on cleanup.
  let live = null;

  GameRegistry.register({
    id: "trivia",
    name: "Trivia Quiz",
    icon: "🧠",
    category: "quiz",
    description: "10 multiple-choice questions against the clock",
    tags: ["quiz", "knowledge"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let loadId = 0;
      let questions, idx, score, time, timerInterval, answered, correctIdx, over;
      let useOnline = false;
      let hintsUsedThisQ = 0;
      let hintRemovedIdxs = [];
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

      async function fetchOnlineQuestions() {
        try {
          const res = await fetch("https://opentdb.com/api.php?amount=10&type=multiple");
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          if (!data.results || !data.results.length) throw new Error("No results");
          const out = [];
          for (const r of data.results) {
            const correct = decode(r.correct_answer);
            const incorrect = (r.incorrect_answers || []).map(decode);
            const options = [correct, ...incorrect];
            // Only keep "multiple"-style questions (4 options total)
            if (options.length !== 4) continue;
            // Shuffle
            for (let i = options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [options[i], options[j]] = [options[j], options[i]];
            }
            const c = options.indexOf(correct);
            out.push({q: decode(r.question), a: options, c});
          }
          if (out.length === 0) throw new Error("No valid questions");
          return out.slice(0, 10);
        } catch (e) {
          return null;
        }
      }

      async function newGame() {
        const myId = ++loadId;
        idx = 0;
        score = 0;
        over = false;
        time = 15;
        clearInterval(timerInterval);
        if (useOnline) {
          statusEl.textContent = "Loading from Open Trivia DB…";
          statusEl.className = "status info";
          root.querySelector("#tr-question").textContent = "";
          root.querySelector("#tr-options").innerHTML = "";
          const online = await fetchOnlineQuestions();
          if (!alive || myId !== loadId) return; // superseded or unmounted
          if (online && online.length > 0) {
            questions = online;
          } else {
            questions = shuffle(QUESTIONS).slice(0, 10);
            if (alive) App.toast("Online fetch failed — using bundled questions", "info");
          }
        } else {
          questions = shuffle(QUESTIONS).slice(0, 10);
        }
        render();
        startTimer();
      }

      root.innerHTML = `
        <div class="row" style="justify-content:center;margin-bottom:8px;">
          <label class="row gap-2 text-sm"><input type="checkbox" id="tr-online"/> Online source (Open Trivia DB)</label>
        </div>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="tr-q">1/10</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="tr-s">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="tr-t">15s</div></div>
        </div>
        <div class="progress"><div class="progress-bar" id="tr-prog" style="width:100%;"></div></div>
        <div class="status info" id="tr-status">Pick the correct answer!</div>
        <h3 id="tr-question" style="text-align:center;font-size:1.2rem;margin:14px 0;"></h3>
        <div class="quiz-options" id="tr-options"></div>
      `;

      const statusEl = root.querySelector("#tr-status");

      function startTimer() {
        clearInterval(timerInterval);
        time = 15;
        root.querySelector("#tr-t").textContent = time + "s";
        root.querySelector("#tr-prog").style.width = "100%";
        timerInterval = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          root.querySelector("#tr-t").textContent = time + "s";
          root.querySelector("#tr-prog").style.width = (time / 15 * 100) + "%";
          root.querySelector("#tr-t").style.color = time <= 5 ? "var(--danger)" : "";
          if (time <= 0) {
            clearInterval(timerInterval);
            // Reveal correct answer as if not answered
            showAnswer(-1);
            answered = true;
            statusEl.textContent = "⏰ Time's up!";
            statusEl.className = "status lose";
            AudioFX.lose();
            later(next, 1300);
          }
        }, 1000);
      }

      function render() {
        const q = questions[idx];
        root.querySelector("#tr-q").textContent = (idx + 1) + "/10";
        root.querySelector("#tr-s").textContent = score;
        root.querySelector("#tr-question").textContent = q.q;
        const opts = root.querySelector("#tr-options");
        opts.innerHTML = "";
        answered = false;
        correctIdx = q.c;
        hintRemovedIdxs = [];
        hintsUsedThisQ = 0;
        q.a.forEach((opt, i) => {
          const b = document.createElement("button");
          b.className = "quiz-opt";
          b.textContent = String.fromCharCode(65 + i) + ". " + opt;
          b.dataset.i = i;
          b.addEventListener("click", () => answer(i));
          opts.appendChild(b);
        });
      }

      function answer(i) {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        AudioFX.click();
        if (i === correctIdx) {
          score++;
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
          AudioFX.win();
        } else {
          statusEl.textContent = i === -1 ? "⏰ Time's up!" : "✗ Wrong!";
          statusEl.className = "status lose";
          AudioFX.lose();
        }
        showAnswer(i);
        later(next, 1300);
      }

      function showAnswer(picked) {
        root.querySelectorAll(".quiz-opt").forEach(b => {
          b.classList.add("disabled");
          const i = parseInt(b.dataset.i, 10);
          if (i === correctIdx) b.classList.add("correct");
          else if (i === picked) b.classList.add("wrong");
        });
      }

      function next() {
        if (!questions || !questions.length) return;
        idx++;
        if (idx >= questions.length) {
          over = true;
          statusEl.textContent = `🎯 Final score: ${score} / ${questions.length}`;
          statusEl.className = "status win";
          AudioFX.win();
          const best = Storage.getBest("trivia") || 0;
          if (score > best) {
            Storage.setBest("trivia", score);
            App.toast("New best: " + score + "/10", "success");
          }
          return;
        }
        render();
        startTimer();
      }

      function onKey(e) {
        if (over && (e.key === "r" || e.key === "R")) {
          newGame();
          return;
        }
        if (["1", "2", "3", "4"].includes(e.key)) {
          const i = parseInt(e.key, 10) - 1;
          const opts = root.querySelectorAll(".quiz-opt");
          if (opts[i]) answer(i);
        } else if (["a", "A", "b", "B", "c", "C", "d", "D"].includes(e.key)) {
          const i = e.key.toLowerCase().charCodeAt(0) - 97;
          const opts = root.querySelectorAll(".quiz-opt");
          if (opts[i]) answer(i);
        }
      }

      document.addEventListener("keydown", onKey);

      // Online source toggle
      root.querySelector("#tr-online").addEventListener("change", (e) => {
        AudioFX.click();
        useOnline = e.target.checked;
        newGame();
      });

      function doHint() {
        if (over) {
          App.toast("Quiz is over", "info");
          return;
        }
        if (!questions || !questions.length) {
          App.toast("Still loading…", "info");
          return;
        }
        if (answered) {
          App.toast("Already answered this question", "info");
          return;
        }
        if (hintsUsedThisQ >= 1) {
          App.toast("Only one hint per question", "warning");
          return;
        }
        // Find a wrong option that's still active
        const wrongOpts = [];
        root.querySelectorAll(".quiz-opt").forEach(b => {
          const i = parseInt(b.dataset.i, 10);
          if (i !== correctIdx && !hintRemovedIdxs.includes(i)) wrongOpts.push({b, i});
        });
        if (wrongOpts.length === 0) {
          App.toast("No more wrong options to remove", "info");
          return;
        }
        const pick = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
        hintRemovedIdxs.push(pick.i);
        hintsUsedThisQ++;
        pick.b.classList.add("disabled");
        pick.b.style.opacity = "0.35";
        pick.b.style.textDecoration = "line-through";
        pick.b.disabled = true;
        AudioFX.click();
        App.toast("Hint: removed one wrong option", "info");
      }

      function doSolve() {
        if (over) {
          App.toast("Quiz is over", "info");
          return;
        }
        if (!questions || !questions.length) {
          App.toast("Still loading…", "info");
          return;
        }
        if (answered) {
          App.toast("Already answered this question", "info");
          return;
        }
        // Auto-click the correct answer button (counts as wrong — no score)
        answered = true;
        clearInterval(timerInterval);
        AudioFX.lose();
        statusEl.textContent = "Solution revealed";
        statusEl.className = "status lose";
        showAnswer(correctIdx); // highlights the correct option, no "wrong" picked
        later(next, 1300);
      }

      live = {hint: doHint, solve: doSolve};

      newGame();
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
        clearInterval(timerInterval);
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Trivia Quiz",
        `Answer 10 random multiple-choice questions. Each question has a 15-second timer.
        <br><br>Click an option, or press 1/2/3/4 or A/B/C/D on your keyboard.
        <br><br>Toggle <b>Online source</b> to fetch fresh questions from the Open Trivia DB API (falls back to the bundled list if offline or the API is rate-limited).
        <br><br>Stuck? Use the <b>Hint</b> button (max 1 per question — removes one wrong option, dimming it) or <b>Solve</b> (highlights the correct answer, but counts as wrong — no score).
        <br><br>Correct answers light up green, wrong ones red. After the quiz, your score is shown. Beat your best score!`);
    },
  });
})();
