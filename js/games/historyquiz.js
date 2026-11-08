/* History Quiz — 10 multiple-choice questions about world history. */
(function () {
  const QUESTIONS = [
    {q: "In which year did World War II end?", opts: ["1942", "1945", "1948", "1950"], a: 1},
    {q: "Who was the first Emperor of Rome?", opts: ["Julius Caesar", "Nero", "Augustus", "Caligula"], a: 2},
    {
      q: "The Great Wall of China was primarily built to defend against which group?",
      opts: ["Mongols", "Japanese", "Koreans", "Persians"],
      a: 0
    },
    {
      q: "Which ancient civilization built the pyramids at Giza?",
      opts: ["Romans", "Greeks", "Egyptians", "Persians"],
      a: 2
    },
    {
      q: "Who painted the ceiling of the Sistine Chapel?",
      opts: ["Da Vinci", "Raphael", "Michelangelo", "Donatello"],
      a: 2
    },
    {q: "The Berlin Wall fell in which year?", opts: ["1987", "1989", "1991", "1993"], a: 1},
    {q: "Which empire was ruled by Genghis Khan?", opts: ["Ottoman", "Mongol", "Roman", "Persian"], a: 1},
    {
      q: "Who was the first President of the United States?",
      opts: ["Jefferson", "Lincoln", "Adams", "Washington"],
      a: 3
    },
    {q: "The French Revolution began in which year?", opts: ["1776", "1789", "1804", "1812"], a: 1},
    {
      q: "Which civilization is credited with inventing paper?",
      opts: ["Egyptians", "Chinese", "Greeks", "Romans"],
      a: 1
    },
    {
      q: "Who discovered the sea route to India around Africa?",
      opts: ["Columbus", "Magellan", "Vasco da Gama", "Cook"],
      a: 2
    },
    {q: "The Renaissance began in which country?", opts: ["France", "Italy", "Germany", "Spain"], a: 1},
    {
      q: "Who was known as the 'Iron Lady'?",
      opts: ["Indira Gandhi", "Angela Merkel", "Margaret Thatcher", "Golda Meir"],
      a: 2
    },
    {q: "The Treaty of Versailles ended which war?", opts: ["WWI", "WWII", "Korean War", "Napoleonic Wars"], a: 0},
    {q: "Which ancient civilization developed democracy?", opts: ["Rome", "Egypt", "Greece", "China"], a: 2},
    {q: "Who wrote the Communist Manifesto with Karl Marx?", opts: ["Lenin", "Stalin", "Engels", "Trotsky"], a: 2},
    {q: "The Magna Carta was signed in which year?", opts: ["1066", "1215", "1492", "1620"], a: 1},
    {
      q: "Constantinople was the capital of which medieval empire?",
      opts: ["Roman", "Byzantine", "Ottoman", "Greek"],
      a: 1
    },
    {q: "Nelson Mandela was president of which country?", opts: ["Kenya", "Nigeria", "South Africa", "Egypt"], a: 2},
    {q: "The Industrial Revolution began in which country?", opts: ["France", "Britain", "Germany", "USA"], a: 1},
    {
      q: "Who was the first man to step on the Moon?",
      opts: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "Michael Collins"],
      a: 1
    },
    {q: "In which year did the Titanic sink?", opts: ["1905", "1912", "1918", "1923"], a: 1},
    {
      q: "Who was the leader of Nazi Germany during WWII?",
      opts: ["Himmler", "Adolf Hitler", "Goebbels", "Rommel"],
      a: 1
    },
    {
      q: "Which ancient wonder was located in Alexandria?",
      opts: ["Hanging Gardens", "Colossus", "Lighthouse", "Mausoleum"],
      a: 2
    },
    {
      q: "Who was the first female Prime Minister of the United Kingdom?",
      opts: ["Theresa May", "Margaret Thatcher", "Indira Gandhi", "Golda Meir"],
      a: 1
    },
    {q: "The Russian Revolution began in which year?", opts: ["1905", "1917", "1923", "1939"], a: 1},
    {
      q: "Which US president issued the Emancipation Proclamation?",
      opts: ["Washington", "Lincoln", "Roosevelt", "Kennedy"],
      a: 1
    },
    {
      q: "Who was the last Tsar of Russia?",
      opts: ["Peter the Great", "Nicholas II", "Alexander III", "Ivan the Terrible"],
      a: 1
    },
    {q: "Which country was the first to use paper money?", opts: ["India", "China", "Persia", "Greece"], a: 1},
    {q: "The Great Depression began with a crash in which year?", opts: ["1925", "1929", "1933", "1939"], a: 1},
    {q: "Who founded the Mongol Empire?", opts: ["Kublai Khan", "Genghis Khan", "Tamerlane", "Attila"], a: 1},
    {q: "Which empire built Machu Picchu?", opts: ["Aztec", "Mayan", "Incan", "Olmec"], a: 2},
    {
      q: "The Statue of Liberty was a gift from which country?",
      opts: ["Britain", "Spain", "France", "Netherlands"],
      a: 2
    },
    {
      q: "Which war was fought between the North and South in the United States?",
      opts: ["Revolutionary War", "Civil War", "War of 1812", "Mexican-American War"],
      a: 1
    },
    {
      q: "Who was the famous queen of ancient Egypt who allied with Mark Antony?",
      opts: ["Nefertiti", "Hatshepsut", "Cleopatra", "Nefertari"],
      a: 2
    },
    {q: "The Berlin Airlift occurred in which decade?", opts: ["1930s", "1940s", "1950s", "1960s"], a: 1},
    {
      q: "Who was the famous dictator of the Soviet Union during WWII?",
      opts: ["Lenin", "Stalin", "Khrushchev", "Brezhnev"],
      a: 1
    },
    {q: "Which civilization is known for its city of Tenochtitlan?", opts: ["Inca", "Maya", "Aztec", "Toltec"], a: 2},
    {
      q: "The Magna Carta limited the power of which English king?",
      opts: ["Henry II", "Richard I", "John", "Edward I"],
      a: 2
    },
    {
      q: "Who invented the printing press with movable type in Europe?",
      opts: ["Galileo", "Gutenberg", "Da Vinci", "Newton"],
      a: 1
    },
    {
      q: "Which country's capital was famously divided by a wall during the Cold War?",
      opts: ["Korea", "Vietnam", "Germany", "Yemen"],
      a: 2
    },
    {
      q: "Who was the longest-reigning British monarch before Elizabeth II?",
      opts: ["Victoria", "George III", "Elizabeth I", "Henry VIII"],
      a: 0
    },
    {q: "In which year did the United States declare independence?", opts: ["1776", "1789", "1812", "1865"], a: 0},
    {
      q: "Who delivered the famous 'I Have a Dream' speech?",
      opts: ["Malcolm X", "Martin Luther King Jr.", "Rosa Parks", "Frederick Douglass"],
      a: 1
    },
    {
      q: "Which empire was founded by Osman I in the late 13th century?",
      opts: ["Byzantine", "Ottoman", "Safavid", "Mughal"],
      a: 1
    },
    {
      q: "The Hundred Years' War was fought between which two countries?",
      opts: ["England and France", "Spain and Portugal", "France and Germany", "England and Spain"],
      a: 0
    },
    {
      q: "Who was the famous explorer who first circumnavigated the Earth?",
      opts: ["Columbus", "Magellan", "Cook", "Drake"],
      a: 1
    },
    {q: "The Wright brothers made their first flight in which year?", opts: ["1898", "1903", "1909", "1914"], a: 1},
    {
      q: "Which ancient Greek city-state was known for its military prowess?",
      opts: ["Athens", "Sparta", "Thebes", "Corinth"],
      a: 1
    },
    {q: "In which year did the Western Roman Empire fall?", opts: ["395 AD", "476 AD", "800 AD", "1453 AD"], a: 1},
    {
      q: "Which country was unified by Otto von Bismarck in 1871?",
      opts: ["Italy", "Germany", "France", "Austria"],
      a: 1
    },
    {q: "The Spanish Inquisition was established in which century?", opts: ["14th", "15th", "16th", "17th"], a: 1},
    {q: "Which US president resigned due to the Watergate scandal?", opts: ["Ford", "Nixon", "Carter", "Reagan"], a: 1},
    {q: "The Olympic Games originated in which ancient country?", opts: ["Rome", "Greece", "Egypt", "Persia"], a: 1},
    {
      q: "Who led India to independence through nonviolent resistance?",
      opts: ["Nehru", "Mahatma Gandhi", "Patel", "Bose"],
      a: 1
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "historyquiz",
    name: "History Quiz",
    icon: "📜",
    category: "quiz",
    description: "Test your knowledge of world history",
    tags: ["quiz", "history", "trivia"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="hq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="hq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="hq-best">—</div></div>
        </div>
        <div class="status info" id="hq-status">Pick the correct answer.</div>
        <div id="hq-question" style="text-align:center;font-size:1.2rem;font-weight:600;margin:18px 0;"></div>
        <div id="hq-opts" class="col" style="gap:8px;max-width:460px;margin:0 auto;"></div>
      `;
      const statusEl = root.querySelector("#hq-status");
      const qEl = root.querySelector("#hq-question");
      const optsEl = root.querySelector("#hq-opts");

      function render() {
        if (idx >= qs.length) {
          finish();
          return;
        }
        const cur = qs[idx];
        qEl.textContent = cur.q;
        optsEl.innerHTML = "";
        cur.opts.forEach((o, i) => {
          const b = document.createElement("button");
          b.className = "btn";
          b.textContent = o;
          b.style.cssText = "padding:12px;text-align:left;";
          b.addEventListener("click", () => answer(i, b));
          optsEl.appendChild(b);
        });
        root.querySelector("#hq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#hq-score").textContent = score;
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
        }, 1200);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}.`;
        statusEl.className = "status win";
        qEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("historyquiz");
        if (!best || score > best) {
          Storage.setBest("historyquiz", score);
          root.querySelector("#hq-best").textContent = score;
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
        root.querySelector("#hq-best").textContent = Storage.getBest("historyquiz") || "—";
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
      App.showModal("How to play History Quiz",
        `Answer ${10} multiple-choice questions about world history — from ancient civilizations to modern events.
        <br><br>10 points per correct answer. Your best score is saved.`);
    },
  });
})();
