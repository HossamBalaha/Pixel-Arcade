/* Idiom Guess — given a literal description, pick the correct idiom from 4 choices. */
(function () {
  const QUESTIONS = [
    {
      desc: "Revealing a hidden secret",
      opts: ["Spill the beans", "Kick the bucket", "Hit the sack", "Break a leg"],
      a: 0
    },
    {
      desc: "Feeling extremely happy",
      opts: ["Down in the dumps", "On cloud nine", "Bite the bullet", "Cut corners"],
      a: 1
    },
    {
      desc: "Doing something effortlessly",
      opts: ["A piece of cake", "Cry over spilled milk", "Burn the midnight oil", "Once in a blue moon"],
      a: 0
    },
    {
      desc: "Costing a fortune",
      opts: ["Cost an arm and a leg", "Under the weather", "Bite off more than you can chew", "Beat around the bush"],
      a: 0
    },
    {
      desc: "Ignoring the main issue",
      opts: ["Cut to the chase", "Beat around the bush", "Let the cat out of the bag", "Hit the nail on the head"],
      a: 1
    },
    {
      desc: "Avoiding the topic",
      opts: ["Straight from the horse's mouth", "Beat around the bush", "Bring home the bacon", "Burn bridges"],
      a: 1
    },
    {
      desc: "Working late into the night",
      opts: ["Burn the midnight oil", "Call it a day", "Hit the sack", "Pull someone's leg"],
      a: 0
    },
    {
      desc: "Doing more than you can handle",
      opts: ["Bite off more than you can chew", "Piece of cake", "Hit the books", "Jump the gun"],
      a: 0
    },
    {
      desc: "Revealing a secret accidentally",
      opts: ["Let the cat out of the bag", "Bite the bullet", "Break the ice", "Cost an arm and a leg"],
      a: 0
    },
    {
      desc: "Starting a conversation socially",
      opts: ["Break the ice", "Cut corners", "Spill the beans", "Hit the roof"],
      a: 0
    },
    {desc: "To die", opts: ["Kick the bucket", "On cloud nine", "Bite the bullet", "Hit the sack"], a: 0},
    {
      desc: "Enduring something painful bravely",
      opts: ["Bite the bullet", "Piece of cake", "Under the weather", "Once in a blue moon"],
      a: 0
    },
    {desc: "Feeling unwell", opts: ["Under the weather", "On cloud nine", "Hit the roof", "Jump the gun"], a: 0},
    {
      desc: "Doing something before the right time",
      opts: ["Jump the gun", "Cut corners", "Hit the books", "Call it a day"],
      a: 0
    },
    {desc: "Studying hard", opts: ["Hit the books", "Spill the beans", "Kick the bucket", "Burn bridges"], a: 0},
    {
      desc: "Becoming very angry",
      opts: ["Hit the roof", "Down in the dumps", "Piece of cake", "Under the weather"],
      a: 0
    },
    {
      desc: "Doing poor quality work to save time",
      opts: ["Cut corners", "Burn the midnight oil", "Hit the nail on the head", "Call it a day"],
      a: 0
    },
    {
      desc: "Doing exactly the right thing",
      opts: ["Hit the nail on the head", "Beat around the bush", "Jump the gun", "Bite the bullet"],
      a: 0
    },
    {
      desc: "Going to bed / sleeping",
      opts: ["Hit the sack", "Spill the beans", "Bite the bullet", "Burn bridges"],
      a: 0
    },
    {
      desc: "Good luck (often said before a performance)",
      opts: ["Break a leg", "Kick the bucket", "Cut corners", "Hit the roof"],
      a: 0
    },
    {
      desc: "Stop working on something",
      opts: ["Call it a day", "Burn the midnight oil", "Jump the gun", "Spill the beans"],
      a: 0
    },
    {
      desc: "Suffering bad luck, then more bad luck",
      opts: ["When it rains, it pours", "A piece of cake", "Break the ice", "Hit the books"],
      a: 0
    },
    {
      desc: "Rarely happening",
      opts: ["Once in a blue moon", "Under the weather", "Bite the bullet", "Jump the gun"],
      a: 0
    },
    {
      desc: "Complaining about past mistakes",
      opts: ["Cry over spilled milk", "Burn the midnight oil", "Hit the sack", "Break the ice"],
      a: 0
    },
    {
      desc: "From a reliable source",
      opts: ["Straight from the horse's mouth", "Beat around the bush", "Cost an arm and a leg", "Piece of cake"],
      a: 0
    },
    {
      desc: "Earning money for the family",
      opts: ["Bring home the bacon", "Spill the beans", "Burn bridges", "Call it a day"],
      a: 0
    },
    {
      desc: "Damaging relationships permanently",
      opts: ["Burn bridges", "Break a leg", "Hit the sack", "Cost an arm and a leg"],
      a: 0
    },
    {
      desc: "Teasing someone playfully",
      opts: ["Pull someone's leg", "Hit the books", "Cut corners", "Spill the beans"],
      a: 0
    },
    {
      desc: "Doing something badly to begin with",
      opts: ["Get off on the wrong foot", "Under the weather", "Break the ice", "Cut to the chase"],
      a: 0
    },
    {
      desc: "Quickly getting to the point",
      opts: ["Cut to the chase", "Beat around the bush", "Once in a blue moon", "Hit the roof"],
      a: 0
    },
    {
      desc: "Someone who can't sit still",
      opts: ["Have ants in your pants", "Hit the sack", "Cost an arm and a leg", "Call it a day"],
      a: 0
    },
    {
      desc: "Being watched too closely",
      opts: ["Under a microscope", "Bite the bullet", "Burn bridges", "Spill the beans"],
      a: 0
    },
    {
      desc: "Reading only superficially",
      opts: ["Skim the surface", "Hit the books", "Bite the bullet", "Burn the midnight oil"],
      a: 0
    },
    {
      desc: "Working extremely hard",
      opts: ["Work your fingers to the bone", "Call it a day", "Spill the beans", "Break the ice"],
      a: 0
    },
    {
      desc: "Hidden disadvantage in an offer",
      opts: ["Catch-22", "Strings attached", "Cry over spilled milk", "Hit the sack"],
      a: 1
    },
    {
      desc: "Revealing a secret surprise",
      opts: ["Let the cat out of the bag", "Burn bridges", "Cost an arm and a leg", "Call it a day"],
      a: 0
    },
    {
      desc: "Treating someone coldly",
      opts: ["Give the cold shoulder", "Hit the roof", "Bite the bullet", "Jump the gun"],
      a: 0
    },
    {
      desc: "Being very careful with money",
      opts: ["Pinch pennies", "Burn bridges", "Break a leg", "Spill the beans"],
      a: 0
    },
    {
      desc: "Doing something at the last possible moment",
      opts: ["Eleventh hour", "Cut corners", "Hit the books", "Bite the bullet"],
      a: 0
    },
    {
      desc: "Focusing on the wrong part of a problem",
      opts: ["Barking up the wrong tree", "Hit the nail on the head", "Break the ice", "Jump the gun"],
      a: 0
    },
    {
      desc: "Feeling jealous of someone else's success",
      opts: ["Sour grapes", "Cut to the chase", "Bite the bullet", "Hit the sack"],
      a: 0
    },
    {
      desc: "A secret advantage held in reserve",
      opts: ["Ace up your sleeve", "Cost an arm and a leg", "Spill the beans", "Break the ice"],
      a: 0
    },
    {
      desc: "Doing the impossible",
      opts: ["Pull a rabbit out of a hat", "Jump the gun", "Hit the books", "Burn bridges"],
      a: 0
    },
    {
      desc: "Wasting your effort on something futile",
      opts: ["Wild goose chase", "Hit the sack", "Cost an arm and a leg", "Call it a day"],
      a: 0
    },
    {
      desc: "Avoiding responsibility",
      opts: ["Pass the buck", "Spill the beans", "Break a leg", "Bite the bullet"],
      a: 0
    },
    {
      desc: "Revealing the truth slowly",
      opts: ["Beat around the bush", "Cut to the chase", "Spill the beans", "Hit the roof"],
      a: 0
    },
    {
      desc: "Going above and beyond expectations",
      opts: ["Go the extra mile", "Hit the sack", "Cut corners", "Burn bridges"],
      a: 0
    },
    {
      desc: "Facing consequences of your actions",
      opts: ["Face the music", "Jump the gun", "Break the ice", "Hit the books"],
      a: 0
    },
    {
      desc: "Treating a problem at its source",
      opts: ["Nip it in the bud", "Burn the midnight oil", "Spill the beans", "Call it a day"],
      a: 0
    },
    {
      desc: "Quick to recover from setbacks",
      opts: ["Bounce back", "Cost an arm and a leg", "Cut corners", "Break a leg"],
      a: 0
    },
    {
      desc: "Pushed into a corner with no options",
      opts: ["Backed into a corner", "Hit the roof", "Spill the beans", "Bite the bullet"],
      a: 0
    },
    {
      desc: "Doing many things at once",
      opts: ["Wear many hats", "Burn bridges", "Hit the sack", "Call it a day"],
      a: 0
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "idiomguess",
    name: "Idiom Guess",
    icon: "💬",
    category: "word",
    description: "Pick the idiom that matches the literal description",
    tags: ["word", "language", "idiom"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="ig-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="ig-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ig-best">—</div></div>
        </div>
        <div class="status info" id="ig-status">Pick the idiom that fits the description.</div>
        <div id="ig-desc" style="text-align:center;font-size:1.3rem;font-weight:600;margin:18px 0;font-style:italic;"></div>
        <div id="ig-opts" class="col" style="gap:8px;max-width:440px;margin:0 auto;"></div>
      `;
      const statusEl = root.querySelector("#ig-status");
      const descEl = root.querySelector("#ig-desc");
      const optsEl = root.querySelector("#ig-opts");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        descEl.textContent = '"' + cur.desc + '"';
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:12px;text-align:left;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#ig-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#ig-score").textContent = score;
      }

      function answer(i, b) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          b.style.background = "var(--success)";
          b.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          b.style.background = "var(--danger)";
          b.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((bb, j) => {
            if (j === cur.a) bb.style.background = "var(--success)";
            bb.style.color = "#fff";
          });
          statusEl.textContent = `✗ Answer: "${cur.opts[cur.a]}".`;
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
        descEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("idiomguess");
        if (!best || score > best) {
          Storage.setBest("idiomguess", score);
          root.querySelector("#ig-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const r = document.createElement("button");
        r.className = "btn primary";
        r.textContent = "Play again";
        r.addEventListener("click", newRound);
        optsEl.appendChild(r);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#ig-best").textContent = Storage.getBest("idiomguess") || "—";
        statusEl.textContent = "Pick the idiom that fits the description.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Idiom Guess",
        `Each question gives a literal description of a common English idiom. Pick the idiom that matches it.
        <br><br>${PER} questions, 10 points each.`);
    },
  });
})();
