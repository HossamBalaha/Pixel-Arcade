/* musictheoryquiz — Music Theory Quiz (generated from the quiz template) */
(function () {
  "use strict";
  const QUESTIONS = [["How many lines does a musical staff have?", ["Five", "Four", "Seven", "Six"], 0], ["What does the term 'forte' (f) tell a musician to do?", ["Speed up", "Play loudly", "Play softly", "Slow down"], 1], ["How many beats does a half note get in 4/4 time?", ["Two", "One", "Three", "Four"], 0], ["What is the sequence of white keys in one octave on a piano, starting from C?", ["Do re mi fa sol la si only", "C D E F G A B", "A B C D E F G", "C D E F G H I"], 1], ["What does a sharp (♯) symbol do to a note?", ["Doubles its length", "Raises it a half step", "Makes it louder", "Lowers it a half step"], 1], ["In 3/4 time, how many beats are in each measure?", ["Three", "Six", "Two", "Four"], 0], ["What is the Italian term for gradually getting louder?", ["Crescendo", "Ritardando", "Accelerando", "Diminuendo"], 0], ["Which interval is called a 'perfect fifth' above C?", ["B", "G", "F", "E"], 1], ["What is a chord?", ["Two or more notes played together", "A single sustained note", "A pause in the music", "The speed of a piece"], 0], ["What does 'allegro' mean as a tempo marking?", ["Fast and lively", "Moderately", "At a walking pace", "Slow and solemn"], 0]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "musictheoryquiz", name: "Music Theory Quiz", icon: "🎼", category: "quiz",
    description: "Music Theory Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#musictheoryquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#musictheoryquiz-time");
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
        const opts = root.querySelectorAll("#musictheoryquiz .qo");
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
        root.querySelector("#musictheoryquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="musictheoryquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#musictheoryquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#musictheoryquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="musictheoryquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#musictheoryquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="musictheoryquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Music Theory Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
