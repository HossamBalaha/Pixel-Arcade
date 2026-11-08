/* True/False — 10 statements, decide if each is true or false. */
(function () {
  const STATEMENTS = [
    {s: "The Sun is a star.", t: true},
    {s: "Water boils at 100°C at sea level.", t: true},
    {s: "Sharks are mammals.", t: false},
    {s: "The Great Wall of China is visible from the Moon with the naked eye.", t: false},
    {s: "Humans have 206 bones in their body (adult).", t: true},
    {s: "Mount Everest is the tallest mountain in the universe.", t: false},
    {s: "Honey never spoils.", t: true},
    {s: "Bats are blind.", t: false},
    {s: "Australia is both a country and a continent.", t: true},
    {s: "Goldfish have a 3-second memory.", t: false},
    {s: "The Pacific Ocean is the largest ocean on Earth.", t: true},
    {s: "Lightning never strikes the same place twice.", t: false},
    {s: "An octopus has three hearts.", t: true},
    {s: "The Sahara is the world's largest desert.", t: false}, // Antarctica is the largest
    {s: "Sound travels faster in water than in air.", t: true},
    {s: "Bananas grow on trees.", t: false}, // they grow on herbaceous plants
    {s: "Vikings wore horned helmets in battle.", t: false},
    {s: "The Eiffel Tower can grow taller in summer due to heat expansion.", t: true},
    {s: "Chameleons change color mainly to camouflage.", t: false}, // mainly for mood/temperature
    {s: "A jiffy is an actual unit of time.", t: true},
    {s: "The Earth is flat.", t: false},
    {s: "Humans share about 60% of their DNA with bananas.", t: true},
    {s: "Antarctica is the driest continent on Earth.", t: true},
    {s: "A group of flamingos is called a 'flamboyance'.", t: true},
    {s: "The longest word in English has over 1000 letters.", t: false},
    {s: "Tomatoes are technically fruits.", t: true},
    {s: "Cracking your knuckles causes arthritis.", t: false},
    {s: "Bulls are enraged by the color red.", t: false},
    {s: "A bolt of lightning contains enough energy to toast about 100,000 slices of bread.", t: true},
    {s: "Snails can sleep for up to 3 years.", t: true},
    {s: "Humans only use 10% of their brains.", t: false},
    {s: "A baby puffin is called a 'puffling'.", t: true},
    {s: "The national animal of Scotland is the unicorn.", t: true},
    {s: "Polar bears' fur is actually white.", t: false}, // it's transparent/hollow
    {s: "Sharks existed before trees did.", t: true},
    {s: "Wombat poop is cube-shaped.", t: true},
    {s: "Mount Everest grows about 4 mm taller every year.", t: true},
    {s: "Cows can walk up stairs but not down them.", t: true},
    {s: "Octopuses have nine brains.", t: true}, // central + 8 in arms
    {s: "A single cloud can weigh more than a million pounds.", t: true},
    {s: "Dolphins are fish.", t: false},
    {s: "There are more stars in the universe than grains of sand on Earth.", t: true},
    {s: "The Statue of Liberty was originally copper-colored.", t: true},
    {s: "Bubble gum is pink because that was the only food dye available.", t: true},
    {s: "A shrimp's heart is in its head.", t: true},
    {s: "The shortest war in history lasted less than an hour.", t: true},
    {s: "Bananas are radioactive.", t: true},
    {s: "A day on Venus is longer than a year on Venus.", t: true},
    {s: "Crocodiles cannot stick their tongues out.", t: true},
    {s: "An ostrich's eye is bigger than its brain.", t: true},
    {s: "The Hawaiian alphabet has only 13 letters.", t: true},
    {s: "It's impossible to hum while holding your nose.", t: true},
    {s: "A group of crows is called a 'murder'.", t: true},
    {s: "Slugs have four noses.", t: true},
    {s: "A bolt of lightning is five times hotter than the surface of the Sun.", t: true},
    {s: "Bees can fly higher than Mount Everest.", t: true},
    {s: "The longest hiccup attack lasted over 60 years.", t: true},
    {s: "Ants can't chew.", t: false},
    {s: "The human eye can distinguish about 10 million colors.", t: true},
    {s: "Shark pregnancies can last over 3 years.", t: true},
    {s: "Pluto is classified as a planet.", t: false},
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "truefalse",
    name: "True or False",
    icon: "⚖️",
    category: "quiz",
    description: "Decide if each statement is true or false",
    tags: ["quiz", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="tf-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="tf-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tf-best">—</div></div>
        </div>
        <div class="status info" id="tf-status">Is the statement true or false?</div>
        <div id="tf-stmt" style="text-align:center;font-size:1.3rem;font-weight:600;margin:24px 0;min-height:60px;"></div>
        <div class="row" style="justify-content:center;gap:14px;">
          <button class="btn" id="tf-true" style="background:var(--success);color:#fff;min-width:120px;padding:14px;">✓ True</button>
          <button class="btn" id="tf-false" style="background:var(--danger);color:#fff;min-width:120px;padding:14px;">✗ False</button>
        </div>
      `;
      const statusEl = root.querySelector("#tf-status");
      const stmtEl = root.querySelector("#tf-stmt");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        stmtEl.textContent = '"' + cur.s + '"';
        root.querySelector("#tf-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#tf-score").textContent = score;
        root.querySelector("#tf-true").disabled = false;
        root.querySelector("#tf-false").disabled = false;
        root.querySelector("#tf-true").style.opacity = 1;
        root.querySelector("#tf-false").style.opacity = 1;
      }

      function answer(choice) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        const correct = choice === cur.t;
        const btn = root.querySelector(choice ? "#tf-true" : "#tf-false");
        const other = root.querySelector(choice ? "#tf-false" : "#tf-true");
        btn.disabled = true;
        other.disabled = true;
        other.style.opacity = 0.5;
        if (correct) {
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          AudioFX.error();
          statusEl.textContent = `✗ It was ${cur.t ? "TRUE" : "FALSE"}.`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1100);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}.`;
        statusEl.className = "status win";
        stmtEl.textContent = "🎉";
        const best = Storage.getBest("truefalse");
        if (!best || score > best) {
          Storage.setBest("truefalse", score);
          root.querySelector("#tf-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const r = document.createElement("button");
        r.className = "btn primary";
        r.textContent = "Play again";
        r.addEventListener("click", newRound);
        stmtEl.parentElement.appendChild(r);
      }

      function newRound() {
        qs = STATEMENTS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#tf-best").textContent = Storage.getBest("truefalse") || "—";
        statusEl.textContent = "Is the statement true or false?";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#tf-true").addEventListener("click", () => answer(true));
      root.querySelector("#tf-false").addEventListener("click", () => answer(false));

      function onKey(e) {
        if (answered) return;
        if (e.key === "t" || e.key === "T" || e.key === "1") answer(true);
        if (e.key === "f" || e.key === "F" || e.key === "2") answer(false);
      }

      document.addEventListener("keydown", onKey);
      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play True or False",
        `You'll see a statement. Decide whether it's <b>True</b> or <b>False</b>.
        <br><br>${10} statements per round, 10 points each.
        <br><br>Keyboard: <b>T</b> for true, <b>F</b> for false.`);
    },
  });
})();
