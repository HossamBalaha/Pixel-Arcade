/* inventionsquiz — Inventions Quiz (generated from the quiz template) */
(function () {
  "use strict";
  const QUESTIONS = [["Who is credited with inventing the practical incandescent light bulb?", ["Thomas Edison", "Nikola Tesla", "Alexander Bell", "Michael Faraday"], 0], ["Who invented the telephone?", ["Guglielmo Marconi", "James Watt", "Samuel Morse", "Alexander Graham Bell"], 3], ["What did Johannes Gutenberg invent?", ["The telescope", "The printing press with movable type", "The compass", "The microscope"], 1], ["Who is credited with developing the World Wide Web?", ["Tim Berners-Lee", "Steve Jobs", "Bill Gates", "Vint Cerf"], 0], ["Which antibiotic did Alexander Fleming accidentally discover?", ["X-rays discovery", "Insulin", "Aspirin", "Penicillin"], 3], ["Who invented the first practical airplane after studying birds and gliders?", ["Otto Lilienthal", "The Montgolfier brothers", "Samuel Langley", "The Wright brothers"], 3], ["What device did Guglielmo Marconi pioneer?", ["Television", "Telephone", "Radar", "Radio"], 3], ["Which company introduced the Macintosh computer in 1984?", ["Atari", "IBM", "Compaq", "Apple"], 3], ["Who invented dynamite, later establishing the prizes that bear his name?", ["Fritz Haber", "Alfred Nobel", "Dmitri Mendeleev", "Robert Bosch"], 1], ["The steam engine was greatly improved for industry by which Scottish inventor?", ["Robert Fulton", "James Watt", "Hero of Alexandria", "George Stephenson"], 1]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "inventionsquiz", name: "Inventions Quiz", icon: "💡", category: "quiz",
    description: "Inventions Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#inventionsquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#inventionsquiz-time");
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
        const opts = root.querySelectorAll("#inventionsquiz .qo");
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
        root.querySelector("#inventionsquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="inventionsquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#inventionsquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#inventionsquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="inventionsquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#inventionsquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="inventionsquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Inventions Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
