/* aviationquiz — Aviation Quiz (generated from the quiz template) */
(function () {
  "use strict";
  const QUESTIONS = [["Who is credited with the first powered, controlled airplane flight in 1903?", ["Louis Blériot", "The Wright brothers", "Amelia Earhart", "Charles Lindbergh"], 1], ["What force keeps an airplane in the air?", ["Lift", "Drag", "Weight", "Thrust"], 0], ["What is the part of an aircraft that provides lift called, in its most general sense?", ["Nacelle", "Tail", "Wing", "Fuselage"], 2], ["Which part of the plane controls yaw?", ["Elevator", "Flaps", "Ailerons", "Rudder"], 3], ["What was the name of Charles Lindbergh's famous transatlantic aircraft?", ["Flyer I", "Voyager", "Enola Gay", "Spirit of St. Louis"], 3], ["What does ATC stand for in aviation?", ["Aviation Technical Center", "Airline Transport Certificate", "Air Travel Commission", "Air Traffic Control"], 3], ["Which British-French airliner was the first to carry paying passengers at supersonic speed?", ["DC-10", "Comet", "Boeing 747", "Concorde"], 3], ["What is the cockpit instrument that shows the aircraft's heading?", ["Attitude indicator", "Compass/heading indicator", "Vertical speed indicator", "Altimeter"], 1], ["Who was the first woman to fly solo across the Atlantic?", ["Harriet Quimby", "Jacqueline Cochran", "Bessie Coleman", "Amelia Earhart"], 3], ["What is the term for the rotating blades that provide lift on a helicopter?", ["Spoilers", "Propellers", "Turbines", "Rotors"], 3]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "aviationquiz", name: "Aviation Quiz", icon: "✈️", category: "quiz",
    description: "Aviation Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#aviationquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#aviationquiz-time");
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
        const opts = root.querySelectorAll("#aviationquiz .qo");
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
        root.querySelector("#aviationquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="aviationquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#aviationquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#aviationquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="aviationquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#aviationquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="aviationquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Aviation Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
