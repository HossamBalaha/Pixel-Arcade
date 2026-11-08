/* modernhistoryquiz — Modern History Quiz (auto-generated themed quiz) */
(function () {
  "use strict";
  const QUESTIONS = [["In what year did World War II end?", ["1945", "1918", "1939", "1950"], 0], ["Who was the first person to walk on the Moon?", ["Buzz Aldrin", "Yuri Gagarin", "Michael Collins", "Neil Armstrong"], 3], ["In which year did the Berlin Wall fall?", ["1991", "1985", "1989", "1979"], 2], ["Who was Britain's Prime Minister for most of World War II?", ["Neville Chamberlain", "Winston Churchill", "Clement Attlee", "Anthony Eden"], 1], ["Where were the first modern Olympic Games held in 1896?", ["Paris", "Athens", "London", "Stockholm"], 1], ["In what year did the Soviet Union dissolve?", ["1991", "1989", "1985", "1993"], 0], ["Who was the foremost leader of India's independence movement?", ["Nehru", "Patel", "Mahatma Gandhi", "Bose"], 2], ["In what year did the Titanic sink?", ["1905", "1912", "1923", "1898"], 1], ["Which two Japanese cities were hit by atomic bombs in WWII?", ["Tokyo and Kyoto", "Osaka and Yokohama", "Berlin and Munich", "Hiroshima and Nagasaki"], 3], ["In what year did World War I begin?", ["1910", "1914", "1918", "1920"], 1]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "modernhistoryquiz", name: "Modern History Quiz", icon: "🕰️", category: "quiz",
    description: "Modern History Quiz \u2014 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, timer = null;
      let questions = [], idx = 0, score = 0, time = 15, answered = false, over = false;

      function start() {
        questions = shuffle(QUESTIONS).slice(0, Math.min(10, QUESTIONS.length));
        idx = 0;
        score = 0;
        over = false;
        render();
        startTimer();
      }

      function startTimer() {
        clearInterval(timer);
        time = 15;
        answered = false;
        const tEl = root.querySelector("#modernhistoryquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#modernhistoryquiz-time");
          if (t2) t2.textContent = time + "s";
          if (time <= 0) {
            clearInterval(timer);
            answer(-1);
          }
        }, 1000);
      }

      function answer(choice) {
        if (answered) return;
        answered = true;
        clearInterval(timer);
        const q = questions[idx];
        const correct = (choice === q[2]);
        if (correct) {
          score++;
          AudioFX.win();
        } else AudioFX.lose();
        const opts = root.querySelectorAll("#modernhistoryquiz .qo");
        opts.forEach((b, i) => {
          if (i === q[2]) b.style.background = "#22c55e";
          else if (i === choice) b.style.background = "#ef4444";
          b.disabled = true;
        });
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          idx++;
          if (idx >= questions.length) {
            over = true;
            App.recordResult(true, score);
            App.toast("Score: " + score + "/" + questions.length, "success");
            renderEnd();
          } else {
            render();
            startTimer();
          }
        }, 900);
      }

      function render() {
        const q = questions[idx];
        root.querySelector("#modernhistoryquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="modernhistoryquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#modernhistoryquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#modernhistoryquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="modernhistoryquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#modernhistoryquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="modernhistoryquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Modern History Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
