/* dogsquiz — Dog Breeds Quiz (generated from the quiz template) */
(function () {
  "use strict";
  const QUESTIONS = [["Which breed is known as the fastest dog, often used in racing?", ["Beagle", "Border collie", "Greyhound", "Husky"], 2], ["Which large breed was originally bred in the Swiss Alps for mountain rescue?", ["Saint Bernard", "Rottweiler", "Mastiff", "Great Dane"], 0], ["Which small breed's name translates to 'lion dog' in Mandarin?", ["Shih Tzu", "Dachshund", "Pomeranian", "Poodle"], 0], ["Which breed is famous for its blue-black tongue?", ["Samoyed", "Chow Chow", "Akita", "Malamute"], 1], ["Which breed is generally considered the tallest of all dog breeds?", ["Newfoundland", "English mastiff", "Irish wolfhound", "Great Dane"], 2], ["Which herding breed is often considered the most intelligent dog?", ["German shepherd", "Golden retriever", "Poodle", "Border collie"], 3], ["Which breed has a distinctive ridge of hair along its spine growing backwards?", ["Vizsla", "Rhodesian ridgeback", "Pharaoh hound", "Weimaraner"], 1], ["Which dog breed is native to Japan and known for its curly tail?", ["Whippet", "Shiba Inu", "Corgi", "Basenji"], 1], ["Dalmatians are historically associated with which occupation?", ["Hunting retrievers", "Sled racing", "Sheep herding", "Firehouse dogs"], 3], ["Which tiny dog breed is named after a Mexican state?", ["Havanese", "Maltese", "Papillon", "Chihuahua"], 3]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "dogsquiz", name: "Dog Breeds Quiz", icon: "🐕", category: "quiz",
    description: "Dog Breeds Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
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
        const tEl = root.querySelector("#dogsquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#dogsquiz-time");
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
        const opts = root.querySelectorAll("#dogsquiz .qo");
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
        root.querySelector("#dogsquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="dogsquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#dogsquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#dogsquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="dogsquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#dogsquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="dogsquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Dog Breeds Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
