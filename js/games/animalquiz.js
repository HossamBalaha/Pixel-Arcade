/* Animal Quiz — guess the animal from a fun fact. */
(function () {
  const QUESTIONS = [
    {
      fact: "I'm the only mammal capable of true flight.",
      opts: ["Flying squirrel", "Bat", "Sugar glider", "Colugo"],
      a: 1
    },
    {fact: "My heart can be the size of a small car.", opts: ["Elephant", "Blue whale", "Giraffe", "Hippo"], a: 1},
    {fact: "I have three hearts and blue blood.", opts: ["Starfish", "Octopus", "Sea urchin", "Jellyfish"], a: 1},
    {fact: "I sleep up to 22 hours a day and eat eucalyptus.", opts: ["Sloth", "Koala", "Panda", "Possum"], a: 1},
    {
      fact: "I'm a toothless mammal of the Americas — I slurp ants and termites with my long, sticky tongue.",
      opts: ["Anteater", "Chameleon", "Pangolin", "Frog"],
      a: 0
    },
    {
      fact: "I'm a Mexican salamander that can regenerate lost limbs — even my heart.",
      opts: ["Lizard", "Starfish", "Newt", "Axolotl"],
      a: 3
    },
    {fact: "I can run up to 70 mph — fastest land animal.", opts: ["Lion", "Cheetah", "Pronghorn", "Ostrich"], a: 1},
    {fact: "I never sleep — I just rest half my brain at a time.", opts: ["Shark", "Dolphin", "Whale", "Eel"], a: 1},
    {
      fact: "I'm the largest animal that hops, and my baby rides in my pouch.",
      opts: ["Wallaby", "Kangaroo", "Koala", "Wombat"],
      a: 1
    },
    {fact: "My group is called a 'murder'.", opts: ["Wolves", "Crows", "Magpies", "Ravens"], a: 1},
    {
      fact: "I dangle a glowing lure from my head to attract prey in the deep sea.",
      opts: ["Jellyfish", "Anglerfish", "Lanternfish", "Hatchetfish"],
      a: 1
    },
    {
      fact: "I can lift around 50 times my own body weight — and I live in a colony ruled by a queen.",
      opts: ["Elephant", "Ant", "Rhinoceros beetle", "Gorilla"],
      a: 1
    },
    {
      fact: "My black-and-white stripes cover my whole body — no two of us share the same pattern.",
      opts: ["Tiger", "Zebra", "Leopard", "Okapi"],
      a: 1
    },
    {
      fact: "I have no brain, no heart, and no bones — I just drift with the currents, but I can sting.",
      opts: ["Jellyfish", "Sponge", "Starfish", "Sea anemone"],
      a: 0
    },
    {
      fact: "My single spiral tusk is actually a tooth that grew through my upper lip.",
      opts: ["Elephant", "Walrus", "Narwhal", "Hippo"],
      a: 2
    },
    {fact: "I'm the largest land animal and have a trunk.", opts: ["Rhino", "Hippo", "Elephant", "Giraffe"], a: 2},
    {
      fact: "I'm a lizard famous for changing my skin color.",
      opts: ["Flounder", "Chameleon", "Cuttlefish", "Octopus"],
      a: 1
    },
    {
      fact: "My neck can be 6 feet long but I only have 7 neck bones.",
      opts: ["Giraffe", "Ostrich", "Camel", "Llama"],
      a: 0
    },
    {fact: "I can roar so loudly it can be heard 5 miles away.", opts: ["Tiger", "Lion", "Elephant", "Wolf"], a: 1},
    {
      fact: "I'm a bird that cannot fly, but I can swim like a fish.",
      opts: ["Penguin", "Ostrich", "Emu", "Kiwi"],
      a: 0
    },
    {fact: "I'm the tallest land animal alive today.", opts: ["Elephant", "Giraffe", "Bear", "Horse"], a: 1},
    {fact: "I store fat in my hump(s) to survive desert trips.", opts: ["Horse", "Llama", "Camel", "Donkey"], a: 2},
    {
      fact: "I'm the largest big cat species (by length, including tail).",
      opts: ["Lion", "Tiger", "Leopard", "Jaguar"],
      a: 1
    },
    {fact: "I build dams and lodges out of sticks.", opts: ["Otter", "Beaver", "Muskrat", "Mink"], a: 1},
    {fact: "My babies are called joeys.", opts: ["Koala", "Kangaroo", "Wombat", "All of these"], a: 3},
    {fact: "I'm known as 'man's best friend'.", opts: ["Cat", "Horse", "Dog", "Parrot"], a: 2},
    {fact: "I'm a nocturnal bird known for my hoot.", opts: ["Eagle", "Owl", "Hawk", "Falcon"], a: 1},
    {fact: "I spin webs to catch my prey.", opts: ["Ant", "Spider", "Beetle", "Wasp"], a: 1},
    {fact: "I'm a fish famous for my sword-like bill.", opts: ["Marlin", "Swordfish", "Sailfish", "Tarpon"], a: 1},
    {
      fact: "I'm a turtle that lives on land, not water.",
      opts: ["Tortoise", "Terrapin", "Sea turtle", "Snapper"],
      a: 0
    },
    {
      fact: "My stripes help me hide in tall grass and confuse predators.",
      opts: ["Tiger", "Zebra", "Hyena", "Leopard"],
      a: 1
    },
    {fact: "I'm an insect that produces honey.", opts: ["Wasp", "Hornet", "Bee", "Fly"], a: 2},
    {fact: "I'm the largest rodent in the world.", opts: ["Beaver", "Capybara", "Porcupine", "Guinea pig"], a: 1},
    {fact: "I have a mane and live in prides.", opts: ["Tiger", "Lion", "Cheetah", "Leopard"], a: 1},
    {fact: "I'm a marsupial that eats mostly eucalyptus leaves.", opts: ["Koala", "Wombat", "Possum", "Quokka"], a: 0},
    {fact: "I'm a bird that can mimic human speech.", opts: ["Crow", "Parrot", "Sparrow", "Robin"], a: 1},
    {fact: "I'm a snake that kills prey by constriction.", opts: ["Cobra", "Python", "Viper", "Mamba"], a: 1},
    {
      fact: "I'm a slow-moving mammal that hangs upside down in trees.",
      opts: ["Monkey", "Sloth", "Lemur", "Panda"],
      a: 1
    },
    {
      fact: "I use my long, tubular snout and bushy tail to feast on ants and termites.",
      opts: ["Aardvark", "Anteater", "Pangolin", "Armadillo"],
      a: 1
    },
    {fact: "I'm a domesticated relative of the wolf.", opts: ["Fox", "Dog", "Coyote", "Jackal"], a: 1},
    {
      fact: "I'm a farm animal known for giving us milk and going 'moo'.",
      opts: ["Sheep", "Cow", "Goat", "Horse"],
      a: 1
    },
    {fact: "I'm the largest species of bear.", opts: ["Grizzly", "Polar bear", "Black bear", "Panda"], a: 1},
    {
      fact: "I'm an African animal with a long neck and a long blue tongue.",
      opts: ["Giraffe", "Okapi", "Zebra", "Camel"],
      a: 0
    },
    {fact: "I can jump out of the water and seem to fly.", opts: ["Tuna", "Flying fish", "Marlin", "Salmon"], a: 1},
    {fact: "I'm a small flying mammal that uses echolocation.", opts: ["Bird", "Bat", "Owl", "Moth"], a: 1},
    {
      fact: "I have a hard shell and can roll into a ball for defense.",
      opts: ["Pangolin", "Armadillo", "Hedgehog", "Porcupine"],
      a: 1
    },
    {fact: "I'm a domesticated fowl that lays eggs for breakfast.", opts: ["Duck", "Chicken", "Goose", "Turkey"], a: 1},
    {fact: "I'm the fastest bird in level flight.", opts: ["Peregrine falcon", "Swift", "Albatross", "Eagle"], a: 1},
    {fact: "I'm a marine mammal trained to do tricks at aquariums.", opts: ["Shark", "Dolphin", "Whale", "Tuna"], a: 1},
    {fact: "I'm known to laugh, even though it's a territorial call.", opts: ["Hyena", "Fox", "Otter", "Seal"], a: 0},
    {fact: "I have tusks made of ivory and large floppy ears.", opts: ["Hippo", "Elephant", "Rhino", "Walrus"], a: 1},
    {
      fact: "I'm a reptile with a long snout and live in rivers and swamps.",
      opts: ["Crocodile", "Iguana", "Gecko", "Turtle"],
      a: 0
    },
    {
      fact: "I'm a herding animal famous for producing cashmere wool.",
      opts: ["Sheep", "Goat", "Llama", "Alpaca"],
      a: 1
    },
    {
      fact: "I'm a flightless bird of the Southern Hemisphere with black and white feathers.",
      opts: ["Puffin", "Penguin", "Polar bear", "Seal"],
      a: 1
    },
    {
      fact: "I make the longest migration of any animal — flying from the Arctic to Antarctica and back each year.",
      opts: ["Arctic tern", "Swallow", "Sparrow", "Robin"],
      a: 0
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "animalquiz",
    name: "Animal Quiz",
    icon: "🦁",
    category: "quiz",
    description: "Guess the animal from a fun fact",
    tags: ["quiz", "animals", "nature", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="aq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="aq-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="aq-b">—</div></div>
        </div>
        <div class="status info" id="aq-status">Read the fun fact, then pick the matching animal.</div>
        <div id="aq-fact" style="text-align:center;font-size:1.1rem;margin:20px 0;padding:18px;background:var(--bg-soft);border-radius:var(--radius);font-style:italic;"></div>
        <div id="aq-options" class="col" style="gap:8px;max-width:440px;margin:0 auto;"></div>
        <p class="hint">${PER} fun facts per round. Each correct = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#aq-status");
      const factEl = root.querySelector("#aq-fact");
      const optsEl = root.querySelector("#aq-options");
      root.querySelector("#aq-b").textContent = Storage.getBest("animalquiz") || "—";

      function render() {
        if (idx >= qs.length) return finish();
        const cur = qs[idx];
        factEl.textContent = "🐾 \"" + cur.fact + "\"";
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#aq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#aq-s").textContent = score;
      }

      function answer(i, btn) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          btn.style.background = "var(--success)";
          btn.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          btn.style.background = "var(--danger)";
          btn.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((b, j) => {
            if (j === cur.a) {
              b.style.background = "var(--success)";
              b.style.color = "#fff";
            }
          });
          statusEl.textContent = `✗ Animal: "${cur.opts[cur.a]}"`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1300);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}`;
        statusEl.className = "status win";
        factEl.textContent = "🐾";
        optsEl.innerHTML = "";
        const best = Storage.getBest("animalquiz");
        if (!best || score > best) {
          Storage.setBest("animalquiz", score);
          root.querySelector("#aq-b").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => newRound());
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#aq-b").textContent = Storage.getBest("animalquiz") || "—";
        statusEl.textContent = "Read the fun fact, then pick the matching animal.";
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
      App.showModal("How to play Animal Quiz",
        `Each round shows a fun fact about an animal. Pick the matching animal from the multiple-choice options.
        <br><br>${PER} questions per round. Each correct answer = <b>10 points</b>.`);
    },
  });
})();
