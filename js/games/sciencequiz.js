/* Science Quiz — science trivia, multiple choice. */
(function () {
  const QUESTIONS = [
    {
      q: "What gas do plants absorb during photosynthesis?",
      opts: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
      a: 1
    },
    {q: "How many bones are in the adult human body?", opts: ["186", "206", "226", "246"], a: 1},
    {q: "What is the chemical symbol for gold?", opts: ["Au", "Ag", "Gd", "Go"], a: 0},
    {q: "Which planet is known as the Red Planet?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], a: 1},
    {
      q: "What is the speed of light in vacuum (approx)?",
      opts: ["300,000 km/s", "150,000 km/s", "30,000 km/s", "3,000 km/s"],
      a: 0
    },
    {q: "What is the powerhouse of the cell?", opts: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi body"], a: 2},
    {q: "What is the pH of pure water?", opts: ["5", "6", "7", "8"], a: 2},
    {q: "How many continents are there on Earth?", opts: ["5", "6", "7", "8"], a: 2},
    {
      q: "What is the most abundant gas in Earth's atmosphere?",
      opts: ["Oxygen", "Nitrogen", "Carbon dioxide", "Argon"],
      a: 1
    },
    {q: "Who developed the theory of relativity?", opts: ["Newton", "Einstein", "Tesla", "Hawking"], a: 1},
    {q: "What is the largest organ in the human body?", opts: ["Liver", "Brain", "Skin", "Lungs"], a: 2},
    {q: "How many planets are in our solar system?", opts: ["7", "8", "9", "10"], a: 1},
    {q: "What is H2O commonly known as?", opts: ["Salt", "Water", "Hydrogen peroxide", "Acid"], a: 1},
    {q: "What force keeps us on the ground?", opts: ["Magnetism", "Gravity", "Friction", "Tension"], a: 1},
    {q: "What is the center of an atom called?", opts: ["Electron", "Nucleus", "Proton", "Neutron"], a: 1},
    {q: "Which is the largest planet in our solar system?", opts: ["Saturn", "Jupiter", "Earth", "Neptune"], a: 1},
    {q: "What is the freezing point of water in Celsius?", opts: ["0°C", "32°C", "100°C", "-10°C"], a: 0},
    {q: "What type of energy does a moving car have?", opts: ["Potential", "Kinetic", "Chemical", "Thermal"], a: 1},
    {q: "Which scientist proposed the three laws of motion?", opts: ["Einstein", "Newton", "Galileo", "Darwin"], a: 1},
    {q: "What is the boiling point of water at sea level (°C)?", opts: ["50", "75", "100", "120"], a: 2},
    {q: "What is the chemical symbol for silver?", opts: ["Si", "Ag", "Sv", "Au"], a: 1},
    {q: "What is the chemical symbol for sodium?", opts: ["So", "Na", "Sd", "Sn"], a: 1},
    {q: "Which blood type is the universal donor?", opts: ["A+", "B+", "O-", "AB+"], a: 2},
    {q: "Which blood type is the universal recipient?", opts: ["O-", "A-", "B-", "AB+"], a: 3},
    {q: "What is the hardest known natural material on Earth?", opts: ["Quartz", "Topaz", "Diamond", "Graphene"], a: 2},
    {q: "Which planet has the most moons (as of 2024)?", opts: ["Jupiter", "Saturn", "Uranus", "Neptune"], a: 1},
    {q: "What is the smallest planet in our solar system?", opts: ["Mars", "Mercury", "Venus", "Pluto"], a: 1},
    {
      q: "What gas do humans need to breathe to survive?",
      opts: ["Carbon dioxide", "Nitrogen", "Oxygen", "Helium"],
      a: 2
    },
    {q: "What is the most common element in the universe?", opts: ["Oxygen", "Carbon", "Hydrogen", "Helium"], a: 2},
    {q: "Which scientist developed the periodic table?", opts: ["Mendeleev", "Bohr", "Curie", "Rutherford"], a: 0},
    {q: "What is the atomic number of carbon?", opts: ["4", "6", "8", "12"], a: 1},
    {q: "What is the pH of lemon juice (approx)?", opts: ["2", "5", "7", "9"], a: 0},
    {q: "What part of the plant conducts photosynthesis?", opts: ["Roots", "Stem", "Leaves", "Flowers"], a: 2},
    {
      q: "Which scientist is known for the law of universal gravitation?",
      opts: ["Galileo", "Newton", "Kepler", "Copernicus"],
      a: 1
    },
    {q: "What is the largest artery in the human body?", opts: ["Pulmonary", "Aorta", "Carotid", "Femoral"], a: 1},
    {q: "What is the smallest unit of life?", opts: ["Atom", "Molecule", "Cell", "Tissue"], a: 2},
    {q: "Which metal is liquid at room temperature?", opts: ["Mercury", "Bromine", "Gallium", "Water"], a: 0},
    {q: "How many chambers does the human heart have?", opts: ["2", "3", "4", "5"], a: 2},
    {q: "What is the chemical formula for table salt?", opts: ["NaCl", "KCl", "CaCl", "MgCl"], a: 0},
    {
      q: "What is the closest star to Earth (besides the Sun)?",
      opts: ["Sirius", "Proxima Centauri", "Polaris", "Betelgeuse"],
      a: 1
    },
    {q: "Which planet is famous for its prominent rings?", opts: ["Jupiter", "Saturn", "Uranus", "Neptune"], a: 1},
    {q: "Roughly what percentage of the adult human body is water?", opts: ["30%", "50%", "60%", "90%"], a: 2},
    {q: "Which scientist developed the vaccine for rabies?", opts: ["Pasteur", "Fleming", "Salk", "Koch"], a: 0},
    {q: "What is the largest bone in the human body?", opts: ["Femur", "Tibia", "Humerus", "Fibula"], a: 0},
    {q: "What is the chemical symbol for iron?", opts: ["Ir", "Fe", "I", "In"], a: 1},
    {q: "How many bones are in the adult human hand?", opts: ["14", "19", "27", "32"], a: 2},
    {q: "What is the most abundant element in Earth's crust?", opts: ["Silicon", "Iron", "Oxygen", "Aluminum"], a: 2},
    {
      q: "Which scientist proposed the heliocentric model of the solar system?",
      opts: ["Ptolemy", "Copernicus", "Galileo", "Brahe"],
      a: 1
    },
    {
      q: "What is the function of red blood cells?",
      opts: ["Fight infection", "Carry oxygen", "Clot blood", "Store fat"],
      a: 1
    },
    {q: "What is the acceleration due to gravity on Earth (m/s²)?", opts: ["8.8", "9.8", "10.8", "11.8"], a: 1},
    {q: "What is the chemical symbol for potassium?", opts: ["P", "Po", "K", "Pt"], a: 2},
    {
      q: "Which part of the brain controls balance and coordination?",
      opts: ["Cerebrum", "Cerebellum", "Medulla", "Hypothalamus"],
      a: 1
    },
    {q: "How many pairs of chromosomes do humans have?", opts: ["21", "22", "23", "24"], a: 2},
    {q: "What is the chemical formula for glucose?", opts: ["C6H12O6", "C2H6O", "CH4", "H2O"], a: 0},
    {q: "Which scientist discovered penicillin?", opts: ["Pasteur", "Fleming", "Lister", "Koch"], a: 1},
    {q: "What is the freezing point of water in Fahrenheit?", opts: ["0°F", "32°F", "100°F", "212°F"], a: 1},
    {
      q: "What type of rock is formed from cooled lava?",
      opts: ["Sedimentary", "Metamorphic", "Igneous", "Mineral"],
      a: 2
    },
    {
      q: "What is the largest species of shark?",
      opts: ["Great white", "Tiger shark", "Whale shark", "Hammerhead"],
      a: 2
    },
    {q: "Which planet is the hottest in our solar system?", opts: ["Mercury", "Venus", "Mars", "Jupiter"], a: 1},

    ,
    {"q": "What is the SI unit of force?", "opts": ["Watt", "Joule", "Newton", "Pascal"], "a": 2},
    {
      "q": "Who proposed the theory of general relativity?",
      "opts": ["Isaac Newton", "Niels Bohr", "Albert Einstein", "Max Planck"],
      "a": 2
    },
    {
      "q": "What is the approximate speed of light in a vacuum?",
      "opts": ["300 km/s", "3,000 km/s", "300,000 km/s", "3 million km/s"],
      "a": 2
    },
    {
      "q": "Which law states that every action has an equal and opposite reaction?",
      "opts": ["Newton's first law", "Newton's second law", "Law of gravitation", "Newton's third law"],
      "a": 3
    },
    {
      "q": "What type of energy does a moving object have?",
      "opts": ["Chemical energy", "Kinetic energy", "Potential energy", "Thermal energy"],
      "a": 1
    },
    {"q": "What is the unit of electrical resistance?", "opts": ["Ohm", "Ampere", "Volt", "Coulomb"], "a": 0},
    {"q": "Which particle has a negative charge?", "opts": ["Positron", "Neutron", "Electron", "Proton"], "a": 2},
    {
      "q": "What happens to a sound wave as its frequency increases?",
      "opts": ["It slows down", "Its pitch gets higher", "Its wavelength increases", "It gets louder"],
      "a": 1
    },
    {
      "q": "What is the boiling point of water at sea level in Celsius?",
      "opts": ["90°", "50°", "100°", "120°"],
      "a": 2
    },
    {
      "q": "Magnets have two kinds of poles. What are they called?",
      "opts": ["East and west", "North and south", "Positive and negative", "Up and down"],
      "a": 1
    },
    {"q": "What is the chemical formula for water?", "opts": ["CO2", "NaCl", "H2O", "O2"], "a": 2},
    {"q": "What pH value is considered neutral?", "opts": ["0", "10", "14", "7"], "a": 3},
    {"q": "Which element has the atomic number 1?", "opts": ["Carbon", "Hydrogen", "Oxygen", "Helium"], "a": 1},
    {
      "q": "What kind of bond involves the sharing of electron pairs between atoms?",
      "opts": ["Ionic", "Covalent", "Hydrogen", "Metallic"],
      "a": 1
    },
    {
      "q": "Which gas do plants absorb from the atmosphere for photosynthesis?",
      "opts": ["Oxygen", "Methane", "Nitrogen", "Carbon dioxide"],
      "a": 3
    },
    {
      "q": "What is the lightest element in the periodic table?",
      "opts": ["Helium", "Hydrogen", "Lithium", "Beryllium"],
      "a": 1
    },
    {"q": "Which substance is known as common salt?", "opts": ["KCl", "NaHCO3", "NaCl", "CaCO3"], "a": 2},
    {
      "q": "What type of reaction releases heat?",
      "opts": ["Exothermic", "Endothermic", "Neutralization", "Catalytic"],
      "a": 0
    },
    {
      "q": "What organelle is known as the powerhouse of the cell?",
      "opts": ["Ribosome", "Mitochondrion", "Golgi apparatus", "Nucleus"],
      "a": 1
    },
    {
      "q": "What molecule carries genetic information in living things?",
      "opts": ["RNA only", "ATP", "Protein", "DNA"],
      "a": 3
    },
    {
      "q": "What is the process by which plants make food using sunlight?",
      "opts": ["Transpiration", "Photosynthesis", "Fermentation", "Respiration"],
      "a": 1
    },
    {
      "q": "Which blood cells help fight infection?",
      "opts": ["White blood cells", "Plasma", "Red blood cells", "Platelets"],
      "a": 0
    },
    {"q": "What is the largest organ of the human body?", "opts": ["Skin", "Lungs", "Liver", "Brain"], "a": 0},
    {
      "q": "Which gas do humans need to breathe in to survive?",
      "opts": ["Helium", "Nitrogen", "Carbon dioxide", "Oxygen"],
      "a": 3
    },
    {"q": "What is the basic unit of life?", "opts": ["Cell", "Molecule", "Organ", "Tissue"], "a": 0},
    {
      "q": "Which scientist proposed the theory of evolution by natural selection?",
      "opts": ["Louis Pasteur", "Charles Darwin", "James Watson", "Gregor Mendel"],
      "a": 1
    },
    {
      "q": "What is the name of the process by which cells divide to make new body cells?",
      "opts": ["Mitosis", "Fission only", "Fusion", "Meiosis"],
      "a": 0
    }];
  const PER_ROUND = 10;
  let live = null;
  GameRegistry.register({
    id: "sciencequiz",
    name: "Science Quiz",
    icon: "🔬",
    category: "quiz",
    description: "Test your knowledge of science facts",
    tags: ["quiz", "science", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="sq-q">1 / ${PER_ROUND}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sq-best">—</div></div>
        </div>
        <div class="status info" id="sq-status">Pick the correct answer.</div>
        <div id="sq-question" style="text-align:center;font-size:1.2rem;font-weight:600;margin:20px 0;padding:0 10px;"></div>
        <div id="sq-options" class="col" style="gap:8px;max-width:480px;margin:0 auto;"></div>
        <p class="hint">10 questions per round. Each correct answer = 10 points.</p>
      `;
      const statusEl = root.querySelector("#sq-status");
      const qEl = root.querySelector("#sq-question");
      const optsEl = root.querySelector("#sq-options");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        qEl.textContent = cur.q;
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#sq-q").textContent = `${idx + 1} / ${PER_ROUND}`;
        root.querySelector("#sq-score").textContent = score;
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
          statusEl.textContent = `✗ The answer was "${cur.opts[cur.a]}".`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1200);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! You scored ${score} / ${PER_ROUND * 10}.`;
        statusEl.className = "status win";
        qEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("sciencequiz");
        if (!best || score > best) {
          Storage.setBest("sciencequiz", score);
          root.querySelector("#sq-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => {
          newRound();
        });
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        const shuffled = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER_ROUND);
        qs = shuffled;
        idx = 0;
        score = 0;
        answered = false;
        const best = Storage.getBest("sciencequiz");
        root.querySelector("#sq-best").textContent = best || "—";
        statusEl.textContent = "Pick the correct answer.";
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
      App.showModal("How to play Science Quiz", `Answer ${10} multiple-choice questions about science. Each correct answer = 10 points.`);
    },
  });
})();
