/* Capitals Quiz — match capital cities to countries. Multiple choice. */
(function () {
  const QUESTIONS = [
    {q: "Capital of France?", opts: ["Paris", "Lyon", "Marseille", "Bordeaux"], a: 0},
    {q: "Capital of Japan?", opts: ["Osaka", "Kyoto", "Tokyo", "Nagoya"], a: 2},
    {q: "Capital of Brazil?", opts: ["Rio de Janeiro", "São Paulo", "Brasília", "Salvador"], a: 2},
    {q: "Capital of Australia?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], a: 2},
    {q: "Capital of Canada?", opts: ["Toronto", "Montreal", "Vancouver", "Ottawa"], a: 3},
    {q: "Capital of Russia?", opts: ["St. Petersburg", "Moscow", "Kazan", "Novosibirsk"], a: 1},
    {q: "Capital of Italy?", opts: ["Milan", "Naples", "Rome", "Turin"], a: 2},
    {q: "Capital of Spain?", opts: ["Barcelona", "Madrid", "Seville", "Valencia"], a: 1},
    {q: "Capital of Germany?", opts: ["Munich", "Hamburg", "Berlin", "Frankfurt"], a: 2},
    {q: "Capital of Egypt?", opts: ["Cairo", "Alexandria", "Giza", "Luxor"], a: 0},
    {q: "Capital of India?", opts: ["Mumbai", "Delhi", "Kolkata", "Chennai"], a: 1},
    {q: "Capital of China?", opts: ["Shanghai", "Hong Kong", "Beijing", "Guangzhou"], a: 2},
    {q: "Capital of Mexico?", opts: ["Cancún", "Guadalajara", "Mexico City", "Tijuana"], a: 2},
    {q: "Capital of Argentina?", opts: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], a: 1},
    {q: "Capital of South Korea?", opts: ["Busan", "Incheon", "Seoul", "Daegu"], a: 2},
    {q: "Capital of Norway?", opts: ["Bergen", "Stavanger", "Oslo", "Trondheim"], a: 2},
    {q: "Capital of Sweden?", opts: ["Gothenburg", "Malmö", "Stockholm", "Uppsala"], a: 2},
    {q: "Capital of Greece?", opts: ["Athens", "Thessaloniki", "Patras", "Heraklion"], a: 0},
    {q: "Capital of Turkey?", opts: ["Istanbul", "Ankara", "Izmir", "Bursa"], a: 1},
    {q: "Capital of Portugal?", opts: ["Porto", "Lisbon", "Braga", "Faro"], a: 1},
    {q: "Capital of Thailand?", opts: ["Phuket", "Bangkok", "Chiang Mai", "Pattaya"], a: 1},
    {q: "Capital of Saudi Arabia?", opts: ["Mecca", "Jeddah", "Riyadh", "Medina"], a: 2},
    {q: "Capital of South Africa (executive)?", opts: ["Cape Town", "Pretoria", "Bloemfontein", "Johannesburg"], a: 1},
    {q: "Capital of Iran?", opts: ["Tehran", "Shiraz", "Isfahan", "Tabriz"], a: 0},
    {q: "Capital of Ireland?", opts: ["Cork", "Galway", "Dublin", "Limerick"], a: 2},
    {q: "Capital of Poland?", opts: ["Kraków", "Warsaw", "Gdańsk", "Wrocław"], a: 1},
    {q: "Capital of Vietnam?", opts: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hue"], a: 1},
    {q: "Capital of Kenya?", opts: ["Mombasa", "Nairobi", "Kisumu", "Nakuru"], a: 1},
    {q: "Capital of Morocco?", opts: ["Casablanca", "Rabat", "Marrakesh", "Fez"], a: 1},
    {q: "Capital of Netherlands?", opts: ["Rotterdam", "The Hague", "Amsterdam", "Utrecht"], a: 2},
    {q: "Capital of Indonesia?", opts: ["Bali", "Jakarta", "Surabaya", "Bandung"], a: 1},
    {q: "Capital of Ukraine?", opts: ["Lviv", "Odessa", "Kyiv", "Kharkiv"], a: 2},
    {q: "Capital of Philippines?", opts: ["Cebu", "Manila", "Davao", "Quezon"], a: 1},
    {q: "Capital of Pakistan?", opts: ["Karachi", "Lahore", "Islamabad", "Peshawar"], a: 2},
    {q: "Capital of Belgium?", opts: ["Antwerp", "Brussels", "Ghent", "Bruges"], a: 1},
    {q: "Capital of Austria?", opts: ["Salzburg", "Vienna", "Graz", "Linz"], a: 1},
    {q: "Capital of Denmark?", opts: ["Aarhus", "Copenhagen", "Odense", "Aalborg"], a: 1},
    {q: "Capital of Finland?", opts: ["Tampere", "Espoo", "Helsinki", "Turku"], a: 2},
    {q: "Capital of Czech Republic?", opts: ["Brno", "Prague", "Ostrava", "Plzeň"], a: 1},
    {q: "Capital of Hungary?", opts: ["Debrecen", "Budapest", "Szeged", "Miskolc"], a: 1},
    {q: "Capital of Switzerland (de facto)?", opts: ["Zurich", "Geneva", "Bern", "Basel"], a: 2},
    {q: "Capital of New Zealand?", opts: ["Auckland", "Wellington", "Christchurch", "Hamilton"], a: 1},
    {q: "Capital of Chile?", opts: ["Valparaíso", "Santiago", "Concepción", "Viña del Mar"], a: 1},
    {q: "Capital of Peru?", opts: ["Cusco", "Lima", "Arequipa", "Trujillo"], a: 1},
    {q: "Capital of Colombia?", opts: ["Medellín", "Bogotá", "Cali", "Cartagena"], a: 1},
    {q: "Capital of Malaysia?", opts: ["Penang", "Kuala Lumpur", "Putrajaya", "Malacca"], a: 1},
    {q: "Capital of Iraq?", opts: ["Mosul", "Basra", "Baghdad", "Erbil"], a: 2},
    {q: "Capital of Cuba?", opts: ["Santiago de Cuba", "Havana", "Camagüey", "Holguín"], a: 1},
    {q: "Capital of Ethiopia?", opts: ["Gondar", "Addis Ababa", "Dire Dawa", "Mekelle"], a: 1},
    {q: "Capital of Romania?", opts: ["Cluj-Napoca", "Bucharest", "Iași", "Timișoara"], a: 1},
    {q: "Capital of Algeria?", opts: ["Oran", "Algiers", "Constantine", "Annaba"], a: 1},
    {q: "Capital of Bangladesh?", opts: ["Chittagong", "Dhaka", "Khulna", "Sylhet"], a: 1},
    {q: "Capital of Qatar?", opts: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor"], a: 0},
    {q: "Capital of Singapore?", opts: ["Jurong", "Singapore", "Tampines", "Woodlands"], a: 1},
    {q: "Capital of Uruguay?", opts: ["Punta del Este", "Montevideo", "Salto", "Paysandú"], a: 1},
  ];
  const PER_ROUND = 10;

  let live = null;
  GameRegistry.register({
    id: "capitalsquiz",
    name: "Capitals Quiz",
    icon: "🏛️",
    category: "quiz",
    description: "Match capital cities to their countries",
    tags: ["quiz", "geography", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="cq-q">1 / ${PER_ROUND}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="cq-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cq-best">—</div></div>
        </div>
        <div class="status info" id="cq-status">Pick the correct capital city.</div>
        <div id="cq-question" style="text-align:center;font-size:1.3rem;font-weight:600;margin:20px 0;"></div>
        <div id="cq-options" class="col" style="gap:8px;max-width:400px;margin:0 auto;"></div>
        <p class="hint">10 questions per round. Each correct answer = 10 points.</p>
      `;
      const statusEl = root.querySelector("#cq-status");
      const qEl = root.querySelector("#cq-question");
      const optsEl = root.querySelector("#cq-options");

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
        root.querySelector("#cq-q").textContent = `${idx + 1} / ${PER_ROUND}`;
        root.querySelector("#cq-score").textContent = score;
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
          // Highlight correct answer
          Array.from(optsEl.children).forEach((b, j) => {
            if (j === cur.a) b.style.background = "var(--success)";
            b.style.color = "#fff";
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
        const best = Storage.getBest("capitalsquiz");
        if (!best || score > best) {
          Storage.setBest("capitalsquiz", score);
          root.querySelector("#cq-best").textContent = score;
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
        // Shuffle and take PER_ROUND questions
        const shuffled = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER_ROUND);
        qs = shuffled;
        idx = 0;
        score = 0;
        answered = false;
        const best = Storage.getBest("capitalsquiz");
        root.querySelector("#cq-best").textContent = best || "—";
        statusEl.textContent = "Pick the correct capital city.";
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
      App.showModal("How to play Capitals Quiz",
        `Answer ${10} multiple-choice questions about world capital cities.
        <br><br>Each correct answer = <b>10 points</b>. Your best score is saved.`);
    },
  });
})();
