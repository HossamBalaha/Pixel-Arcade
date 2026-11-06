/* Geography Quiz — geography trivia, multiple choice. */
(function () {
  const QUESTIONS = [
    {q: "Largest ocean on Earth?", opts: ["Atlantic", "Indian", "Arctic", "Pacific"], a: 3},
    {q: "Longest river in the world?", opts: ["Amazon", "Nile", "Yangtze", "Mississippi"], a: 1},
    {q: "Smallest country in the world?", opts: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], a: 1},
    {q: "Tallest mountain on Earth?", opts: ["K2", "Mount Everest", "Kangchenjunga", "Makalu"], a: 1},
    {q: "Largest desert in the world?", opts: ["Sahara", "Gobi", "Antarctic Desert", "Kalahari"], a: 2},
    {q: "Which continent has the most countries?", opts: ["Asia", "Africa", "Europe", "South America"], a: 1},
    {q: "Capital of Australia?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], a: 2},
    {q: "The Amazon rainforest is mostly in which country?", opts: ["Peru", "Colombia", "Brazil", "Venezuela"], a: 2},
    {q: "Which country has the most time zones?", opts: ["Russia", "USA", "France", "China"], a: 2},
    {q: "What is the driest place on Earth?", opts: ["Sahara", "Death Valley", "Atacama Desert", "Gobi Desert"], a: 2},
    {q: "Largest country by area?", opts: ["China", "USA", "Canada", "Russia"], a: 3},
    {q: "Strait between Europe and Africa?", opts: ["Bering", "Gibraltar", "Hormuz", "Malacca"], a: 1},
    {
      q: "Which African country was formerly known as Abyssinia?",
      opts: ["Sudan", "Ethiopia", "Somalia", "Eritrea"],
      a: 1
    },
    {q: "Largest island in the world?", opts: ["Madagascar", "Borneo", "Greenland", "New Guinea"], a: 2},
    {q: "Which country has the longest coastline?", opts: ["Australia", "Canada", "Russia", "Indonesia"], a: 1},
    {q: "Mount Kilimanjaro is in which country?", opts: ["Kenya", "Uganda", "Tanzania", "Ethiopia"], a: 2},
    {q: "Capital of South Korea?", opts: ["Busan", "Seoul", "Incheon", "Daegu"], a: 1},
    {
      q: "The Andes mountains run through which continent?",
      opts: ["North America", "South America", "Europe", "Asia"],
      a: 1
    },
    {q: "Lake Baikal is in which country?", opts: ["China", "Mongolia", "Russia", "Kazakhstan"], a: 2},
    {q: "Capital of Norway?", opts: ["Bergen", "Stavanger", "Oslo", "Trondheim"], a: 2},
    {q: "Which river flows through Egypt?", opts: ["Tigris", "Nile", "Euphrates", "Congo"], a: 1},
    {q: "What is the capital of Japan?", opts: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], a: 2},
    {
      q: "The Sahara Desert is located on which continent?",
      opts: ["Asia", "Africa", "Australia", "South America"],
      a: 1
    },
    {q: "Which country has the largest population?", opts: ["USA", "India", "China", "Indonesia"], a: 1},
    {q: "What is the capital of Canada?", opts: ["Toronto", "Montreal", "Ottawa", "Vancouver"], a: 2},
    {
      q: "Which ocean borders the east coast of the United States?",
      opts: ["Pacific", "Atlantic", "Indian", "Arctic"],
      a: 1
    },
    {q: "What is the smallest continent?", opts: ["Europe", "Antarctica", "Australia", "South America"], a: 2},
    {
      q: "The Great Barrier Reef is off the coast of which country?",
      opts: ["Brazil", "Australia", "Mexico", "Philippines"],
      a: 1
    },
    {q: "What is the capital of Russia?", opts: ["St. Petersburg", "Moscow", "Kazan", "Novosibirsk"], a: 1},
    {q: "Which mountain range separates Europe and Asia?", opts: ["Alps", "Andes", "Urals", "Himalayas"], a: 2},
    {q: "What is the capital of Brazil?", opts: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], a: 2},
    {q: "The river Danube flows through which city?", opts: ["Paris", "Vienna", "Rome", "Madrid"], a: 1},
    {q: "What is the official language of Egypt?", opts: ["English", "French", "Arabic", "Persian"], a: 2},
    {q: "Which country is home to the kangaroo?", opts: ["South Africa", "Australia", "India", "Brazil"], a: 1},
    {q: "What is the capital of Argentina?", opts: ["Lima", "Santiago", "Buenos Aires", "Quito"], a: 2},
    {
      q: "The Alps mountain range is primarily located on which continent?",
      opts: ["Asia", "Europe", "North America", "Africa"],
      a: 1
    },
    {
      q: "What is the largest country in South America by area?",
      opts: ["Argentina", "Peru", "Brazil", "Colombia"],
      a: 2
    },
    {q: "What is the capital of Italy?", opts: ["Milan", "Naples", "Rome", "Florence"], a: 2},
    {q: "Which country is the Taj Mahal located in?", opts: ["Iran", "India", "Pakistan", "Afghanistan"], a: 1},
    {q: "What is the capital of Germany?", opts: ["Munich", "Hamburg", "Berlin", "Frankfurt"], a: 2},
    {q: "Which country has Tokyo as its capital?", opts: ["China", "South Korea", "Japan", "Thailand"], a: 2},
    {q: "What is the longest mountain range in the world?", opts: ["Rockies", "Himalayas", "Andes", "Alps"], a: 2},
    {q: "The Caspian Sea is bordered by how many countries?", opts: ["3", "4", "5", "6"], a: 2},
    {q: "What is the capital of Thailand?", opts: ["Phuket", "Bangkok", "Chiang Mai", "Pattaya"], a: 1},
    {
      q: "Which African country was formerly known as Rhodesia?",
      opts: ["Zambia", "Zimbabwe", "Botswana", "Malawi"],
      a: 1
    },
    {
      q: "What is the deepest ocean trench in the world?",
      opts: ["Puerto Rico Trench", "Java Trench", "Mariana Trench", "Tonga Trench"],
      a: 2
    },
    {q: "Which country has the most volcanoes?", opts: ["Japan", "Indonesia", "USA", "Iceland"], a: 1},
    {q: "What is the capital of Spain?", opts: ["Barcelona", "Seville", "Madrid", "Valencia"], a: 2},
    {q: "Which country is the birthplace of football (soccer)?", opts: ["Italy", "Brazil", "England", "Germany"], a: 2},
    {q: "Which country has the Eiffel Tower?", opts: ["Italy", "France", "Spain", "Belgium"], a: 1},
    {q: "What is the capital of Egypt?", opts: ["Alexandria", "Giza", "Cairo", "Luxor"], a: 2},
    {
      q: "Which country borders only one other country?",
      opts: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"],
      a: 0
    },
    {
      q: "The Mississippi River flows into which gulf?",
      opts: ["Gulf of Mexico", "Gulf of California", "Gulf of Guinea", "Gulf of Aden"],
      a: 0
    },
    {
      q: "What is the smallest independent country in the world by area?",
      opts: ["Monaco", "Nauru", "Vatican City", "Tuvalu"],
      a: 2
    },
    {q: "Which country is shaped like a boot?", opts: ["Greece", "Spain", "Italy", "Portugal"], a: 2},
  ];
  const PER_ROUND = 10;
  let live = null;
  GameRegistry.register({
    id: "geographyquiz",
    name: "Geography Quiz",
    icon: "🌍",
    category: "quiz",
    description: "Test your knowledge of world geography",
    tags: ["quiz", "geography", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="gq-q">1 / ${PER_ROUND}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="gq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="gq-best">—</div></div>
        </div>
        <div class="status info" id="gq-status">Pick the correct answer.</div>
        <div id="gq-question" style="text-align:center;font-size:1.2rem;font-weight:600;margin:20px 0;padding:0 10px;"></div>
        <div id="gq-options" class="col" style="gap:8px;max-width:480px;margin:0 auto;"></div>
        <p class="hint">10 questions per round. Each correct answer = 10 points.</p>
      `;
      const statusEl = root.querySelector("#gq-status");
      const qEl = root.querySelector("#gq-question");
      const optsEl = root.querySelector("#gq-options");

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
        root.querySelector("#gq-q").textContent = `${idx + 1} / ${PER_ROUND}`;
        root.querySelector("#gq-score").textContent = score;
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
        const best = Storage.getBest("geographyquiz");
        if (!best || score > best) {
          Storage.setBest("geographyquiz", score);
          root.querySelector("#gq-best").textContent = score;
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
        const best = Storage.getBest("geographyquiz");
        root.querySelector("#gq-best").textContent = best || "—";
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
      App.showModal("How to play Geography Quiz", `Answer ${10} multiple-choice questions about world geography. Each correct answer = 10 points.`);
    },
  });
})();
