/* ancientquiz — Ancient History Quiz (auto-generated themed quiz) */
(function () {
  "use strict";
  const QUESTIONS = [["Which river was central to ancient Egyptian civilization?", ["Tigris", "Nile", "Amazon", "Indus"], 1], ["Who was the first emperor of unified China?", ["Gaozu", "Wu of Han", "Qin Shi Huang", "Kublai Khan"], 2], ["What does 'Pax Romana' refer to?", ["A Roman feast", "A Roman god", "A long period of peace in the Roman Empire", "A Roman law code"], 2], ["Which civilization built Machu Picchu?", ["Aztec", "Inca", "Maya", "Olmec"], 1], ["Where was the ancient city of Carthage located?", ["Modern Egypt", "Modern Greece", "Modern Libya", "Modern Tunisia"], 3], ["Who wrote 'The Republic'?", ["Aristotle", "Socrates", "Plato", "Pythagoras"], 2], ["What was the main writing system of ancient Mesopotamia?", ["Hieroglyphs", "Cuneiform", "Phoenician", "Linear B"], 1], ["Which Roman emperor legalized Christianity?", ["Nero", "Constantine", "Trajan", "Hadrian"], 1], ["The Rosetta Stone was the key to deciphering which ancient script?", ["Egyptian hieroglyphs", "Cuneiform", "Linear B", "Runes"], 0], ["Who was the king of Macedon who conquered the Persian Empire?", ["Philip II", "Darius III", "Xerxes I", "Alexander the Great"], 3]


    ,
    ["Who was the sun god in ancient Egypt?", ["Osiris", "Anubis", "Ra", "Horus"], 2],
    ["What is the writing system of ancient Egypt called?", ["Cuneiform", "Hieroglyphs", "Runes", "Latin"], 1],
    ["Who was the god of the afterlife?", ["Ra", "Anubis", "Osiris", "Horus"], 2],
    ["Whose nearly intact tomb was discovered in 1922?", ["Khufu", "Ramses II", "Tutankhamun", "Cleopatra"], 2],
    ["The Great Sphinx of Giza has the body of which animal?", ["A camel", "A falcon", "A crocodile", "A lion"], 3],
    ["Which river runs through Egypt?", ["Tigris", "Euphrates", "Nile", "Indus"], 2],
    ["What is the ancient Egyptian writing material made from reeds called?", ["Papyrus", "Parchment", "Vellum", "Slate"], 0],
    ["Who was the jackal-headed god of mummification?", ["Osiris", "Horus", "Set", "Anubis"], 3],
    ["What shape are Egypt's most famous royal tombs?", ["Cubes", "Pyramids", "Cylinders", "Domes"], 1],
    ["Who was the last active pharaoh of ancient Egypt?", ["Nefertiti", "Hatshepsut", "Ramses VI", "Cleopatra VII"], 3],
    ["Who was the first Roman emperor?", ["Julius Caesar", "Augustus", "Nero", "Trajan"], 1],
    ["What language did the Romans speak?", ["Greek", "Etruscan", "Latin", "Oscan"], 2],
    ["In which famous arena did gladiators fight in ancient Rome?", ["Pantheon", "Colosseum", "Roman Forum", "Vatican"], 1],
    ["Which Roman formation had soldiers lock their shields into a protective 'tortoise' shell?", ["Phalanx", "Wedge", "Skirmish line", "Testudo"], 3],
    ["What does 'Veni, vidi, vici' mean?", ["I came, I saw, I conquered", "I came, I saw, I ate", "We came, we saw, we won", "I came, I counted, I left"], 0],
    ["To which city did Constantine move the imperial capital in 330 AD?", ["Ravenna", "Alexandria", "Constantinople", "Antioch"], 2],
    ["Which Carthaginian general crossed the Alps with war elephants to attack Rome?", ["Julius Caesar", "Scipio", "Hannibal", "Pompey"], 2],
    ["What was a Roman mile called?", ["Mille passus", "Stade", "League", "Plethron"], 0],
    ["Which Roman emperor is famously said to have 'fiddled while Rome burned'?", ["Caligula", "Claudius", "Commodus", "Nero"], 3],
    ["Who led the conspiracy to assassinate Julius Caesar?", ["Augustus", "Brutus", "Mark Antony", "Cleopatra"], 1]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "ancientquiz", name: "Ancient History Quiz", icon: "📜", category: "quiz",
    description: "Ancient History Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#ancientquiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#ancientquiz-time");
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
        const opts = root.querySelectorAll("#ancientquiz .qo");
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
        root.querySelector("#ancientquiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="ancientquiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#ancientquiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#ancientquiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="ancientquiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#ancientquiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="ancientquiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Ancient History Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
