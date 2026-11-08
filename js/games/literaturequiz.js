/* literaturequiz — Literature Quiz (auto-generated themed quiz) */
(function () {
  "use strict";
  const QUESTIONS = [["Who wrote 'Romeo and Juliet'?", ["Marlowe", "Chaucer", "Shakespeare", "Dickens"], 2], ["What is the first book of the Harry Potter series?", ["Chamber of Secrets", "Prisoner of Azkaban", "Philosopher's Stone", "Goblet of Fire"], 2], ["Who wrote '1984'?", ["Aldous Huxley", "George Orwell", "Ray Bradbury", "H.G. Wells"], 1], ["What is the name of the detective in 'The Hound of the Baskervilles'?", ["Hercule Poirot", "Sherlock Holmes", "Miss Marple", "C. Auguste Dupin"], 1], ["Who wrote 'To Kill a Mockingbird'?", ["Mark Twain", "F. Scott Fitzgerald", "John Steinbeck", "Harper Lee"], 3], ["Who wrote the seven-volume novel 'In Search of Lost Time'?", ["Marcel Proust", "Victor Hugo", "Gustave Flaubert", "Emile Zola"], 0], ["Who wrote 'Don Quixote'?", ["Gabriel Garcia Marquez", "Jorge Luis Borges", "Miguel de Cervantes", "Mario Vargas Llosa"], 2], ["Who wrote 'The Odyssey'?", ["Virgil", "Homer", "Sophocles", "Euripides"], 1], ["Which novel begins with the line 'Call me Ishmael'?", ["The Old Man and the Sea", "Treasure Island", "The Odyssey", "Moby-Dick"], 3], ["Who wrote 'The Lord of the Rings'?", ["C.S. Lewis", "J.K. Rowling", "J.R.R. Tolkien", "George R.R. Martin"], 2]

    ,
    ["How many lines does a sonnet traditionally have?", ["Fourteen", "Twelve", "Sixteen", "Ten"], 0],
    ["Who wrote the collection 'Leaves of Grass'?", ["Langston Hughes", "Emily Dickinson", "Walt Whitman", "Robert Frost"], 2],
    ["What is a haiku?", ["A 14-line Italian poem", "A poem without any words", "A Japanese 3-line poem with a 5-7-5 syllable pattern", "A rhyming couplet"], 2],
    ["Which poet wrote 'The Raven'?", ["William Wordsworth", "Samuel Coleridge", "Edgar Allan Poe", "Henry Longfellow"], 2],
    ["What is the term for a repeated line or phrase at the end of stanzas?", ["Caesura", "Cadence", "Anaphora", "Refrain"], 3],
    ["Who wrote the epic poems 'The Iliad' and 'The Odyssey'?", ["Sophocles", "Ovid", "Homer", "Virgil"], 2],
    ["What is a stanza of two lines called?", ["Octave", "Quatrain", "Tercet", "Couplet"], 3],
    ["How many lines does a limerick have?", ["Ten", "Five", "Seven", "Four"], 1],
    ["Who wrote 'Because I could not stop for Death'?", ["Elizabeth Bishop", "Sylvia Plath", "Marianne Moore", "Emily Dickinson"], 3],
    ["What is unrhymed iambic pentameter called?", ["Heroic couplet", "Spenserian stanza", "Blank verse", "Free verse"], 2]];

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  GameRegistry.register({
    id: "literaturequiz", name: "Literature Quiz", icon: "📚", category: "quiz",
    description: "Literature Quiz — 10 multiple-choice questions, 15s each.", tags: ["quiz", "themed"],
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
        const tEl = root.querySelector("#literaturequiz-time");
        if (tEl) tEl.textContent = "15s";
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          const t2 = root.querySelector("#literaturequiz-time");
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
        const opts = root.querySelectorAll("#literaturequiz .qo");
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
        root.querySelector("#literaturequiz").innerHTML = `
          <style>
            .qo { display:block; width:100%; text-align:left; padding:10px 14px; margin:6px 0;
                   border:1px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff);
                   color:var(--text,#111); cursor:pointer; font-size:1rem; }
            .qo:hover:not(:disabled) { background:var(--bg-soft,#f1f5f9); }
            .qo:disabled { cursor:default; opacity:0.85; }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 8px; font-size:0.9rem; color:var(--text-muted,#64748b);">
            <span>Q${idx + 1}/${questions.length}</span><span>Score: ${score}</span><span id="literaturequiz-time">15s</span>
          </div>
          <h3 style="margin:8px 0 14px; font-size:1.05rem;">${q[0]}</h3>
        `;
        q[1].forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "qo";
          b.textContent = o;
          b.addEventListener("click", () => answer(i));
          root.querySelector("#literaturequiz").appendChild(b);
        });
      }

      function renderEnd() {
        root.querySelector("#literaturequiz").innerHTML = `
          <div style="text-align:center; padding:30px 20px;">
            <div style="font-size:3rem;">${score >= questions.length * 0.7 ? "🏆" : "📊"}</div>
            <h3 style="margin:10px 0;">You scored ${score}/${questions.length}</h3>
            <button class="btn primary" id="literaturequiz-again" style="margin-top:14px;">Try again</button>
          </div>
        `;
        root.querySelector("#literaturequiz-again").addEventListener("click", start);
      }

      root.innerHTML = `
        <p style="text-align:center; color:var(--text-muted,#64748b); margin-bottom:12px;">10 questions, 15s each.</p>
        <div id="literaturequiz"></div>
      `;
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Literature Quiz", "10 multiple-choice questions, 15 seconds each. Tap the answer you think is correct.");
    },
  });
})();
