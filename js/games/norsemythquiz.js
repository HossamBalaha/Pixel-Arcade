/* norsemythquiz — Norse Mythology Quiz (auto-generated themed quiz) */
(function () {
  "use strict";
  const QUESTIONS = [["Who is the chief god in Norse mythology?", ["Odin", "Thor", "Loki", "Freyr"], 0], ["What is the name of Thor's hammer?", ["Gungnir", "Draupnir", "Mjolnir", "Hofund"], 2], ["What is the name of the great hall where warriors slain in battle feast with Odin?", ["Asgard", "Midgard", "Helheim", "Valhalla"], 3], ["What is the world tree of Norse mythology called?", ["Bifrost", "Ragnarok", "Yggdrasil", "Ginnungagap"], 2], ["Who is the trickster god?", ["Thor", "Odin", "Tyr", "Loki"], 3], ["What is the Norse end-of-the-world event called?", ["Valhalla", "Ragnarok", "Fimbulwinter", "Midgard"], 1], ["Who guards the Bifrost bridge?", ["Heimdall", "Thor", "Odin", "Baldur"], 0], ["What is the name of Odin's eight-legged horse?", ["Fenrir", "Sleipnir", "Jormungandr", "Hugin"], 1], ["Who is the god of thunder?", ["Odin", "Loki", "Thor", "Tyr"], 2], ["Which giant wolf, a son of Loki, is destined to kill Odin at Ragnarok?", ["Sleipnir", "Jormungandr", "Skoll", "Fenrir"], 3]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "norsemythquiz", name: "Norse Mythology Quiz", icon: "🔨", category: "quiz",
    description: "Norse Mythology Quiz \u2014 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#norsemythquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#norsemythquiz-time");
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
        const opts = root.querySelectorAll("#norsemythquiz .qo");
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
        root.querySelector("#norsemythquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="norsemythquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#norsemythquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#norsemythquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="norsemythquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#norsemythquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="norsemythquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Norse Mythology Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
