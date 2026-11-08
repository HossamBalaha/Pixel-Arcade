/* artquiz — Art Quiz (auto-generated themed quiz) */
(function () {
  "use strict";
  const QUESTIONS = [["Who painted the Sistine Chapel ceiling?", ["Da Vinci", "Raphael", "Michelangelo", "Donatello"], 2], ["Pointillism is a painting technique that uses what?", ["Thick brush strokes", "Black and white only", "Small dots of pure color", "A single shade"], 2], ["Which painter famously cut off part of his own ear in 1888?", ["Picasso", "Monet", "Cezanne", "Van Gogh"], 3], ["Which art movement is Salvador Dalí associated with?", ["Cubism", "Surrealism", "Impressionism", "Realism"], 1], ["Where is the Mona Lisa displayed?", ["Uffizi, Florence", "Prado, Madrid", "Louvre, Paris", "MoMA, New York City"], 2], ["What is 'cubism' most associated with?", ["Monet and Renoir", "Picasso and Braque", "Van Gogh and Gauguin", "Dalí and Magritte"], 1], ["Who sculpted the famous marble 'David' completed in Florence in 1504?", ["Michelangelo", "Bernini", "Donatello", "Rodin"], 0], ["Which artist is famous for painting water lilies?", ["Edouard Manet", "Claude Monet", "Edgar Degas", "Pierre Renoir"], 1], ["What is 'The Persistence of Memory' famous for depicting?", ["Floating apples", "Burning giraffes", "Melting clocks", "Walking men"], 2], ["Which Dutch master painted 'The Night Watch'?", ["Vermeer", "Rembrandt", "Van Gogh", "Frans Hals"], 1]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "artquiz", name: "Art Quiz", icon: "🎨", category: "quiz",
    description: "Art Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#artquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#artquiz-time");
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
        const opts = root.querySelectorAll("#artquiz .qo");
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
        root.querySelector("#artquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="artquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#artquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#artquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="artquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#artquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="artquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Art Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
