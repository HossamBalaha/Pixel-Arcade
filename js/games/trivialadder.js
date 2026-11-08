/* Trivia Ladder — climb twelve questions with three lifelines */
(function () {
  GameRegistry.register({
    id: "trivialadder",
    name: "Trivia Ladder",
    icon: "🪜",
    category: "quiz",
    description: "Climb twelve questions with three lifelines",
    tags: ["quiz", "ladder", "lifelines"],
    mount: function (root, {App, AudioFX, Storage}) {
      const BANK = [
        {q: "What color is a stop sign?", o: ["Red", "Blue", "Green", "Yellow"], a: 0, lvl: 1},
        {q: "How many days are in a week?", o: ["7", "5", "10", "12"], a: 0, lvl: 1},
        {q: "Which animal barks?", o: ["Dog", "Cat", "Cow", "Sheep"], a: 0, lvl: 1},
        {q: "What do bees make?", o: ["Honey", "Milk", "Silk", "Wax only"], a: 0, lvl: 1},
        {q: "Capital of France?", o: ["Paris", "Lyon", "Rome", "Berlin"], a: 0, lvl: 2},
        {q: "How many continents are there?", o: ["7", "5", "6", "4"], a: 0, lvl: 2},
        {q: "Which is the smallest planet?", o: ["Mercury", "Mars", "Venus", "Pluto"], a: 0, lvl: 2},
        {q: "What is 15% of 200?", o: ["30", "25", "35", "15"], a: 0, lvl: 2},
        {q: "Who wrote 'Romeo and Juliet'?", o: ["Shakespeare", "Dickens", "Austen", "Hemingway"], a: 0, lvl: 3},
        {q: "Which gas do plants absorb?", o: ["CO₂", "Oxygen", "Nitrogen", "Helium"], a: 0, lvl: 3},
        {q: "The currency of India?", o: ["Rupee", "Yen", "Won", "Ringgit"], a: 0, lvl: 3},
        {q: "How many strings does a violin have?", o: ["4", "5", "6", "7"], a: 0, lvl: 3},
        {q: "In which year did WWII end?", o: ["1945", "1939", "1950", "1918"], a: 0, lvl: 4},
        {q: "What's the hardest natural substance?", o: ["Diamond", "Steel", "Quartz", "Granite"], a: 0, lvl: 4},
        {q: "Which element has symbol 'Au'?", o: ["Gold", "Silver", "Aluminum", "Argon"], a: 0, lvl: 4},
        {q: "The largest desert on Earth?", o: ["Antarctic", "Sahara", "Gobi", "Arabian"], a: 0, lvl: 4},
        {q: "Who painted 'The Starry Night'?", o: ["Van Gogh", "Picasso", "Da Vinci", "Rembrandt"], a: 0, lvl: 5},
        {q: "What is the square root of 169?", o: ["13", "12", "14", "17"], a: 0, lvl: 5},
        {q: "Which country invented tea ceremonies?", o: ["Japan", "China", "India", "England"], a: 0, lvl: 5},
        {
          q: "What does 'www' stand for?",
          o: ["World Wide Web", "Web Wide World", "Wired World Web", "World Web Wide"],
          a: 0,
          lvl: 5
        },
        {q: "The speed of sound (m/s, air)?", o: ["343", "300", "500", "150"], a: 0, lvl: 6},
        {q: "Which sea is the saltiest?", o: ["Dead Sea", "Red Sea", "Baltic", "Caspian"], a: 0, lvl: 6},
        {q: "Who discovered penicillin?", o: ["Fleming", "Curie", "Pasteur", "Salk"], a: 0, lvl: 6},
        {q: "How many moons does Mars have?", o: ["2", "1", "3", "0"], a: 0, lvl: 6},
      ];
      const RUNGS = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000];
      let ladder, step, lifelines, over, banked, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Rung</div><div class="val" id="tl2-step">1/12</div></div>
          <div class="score-cell"><div class="label">Value</div><div class="val" id="tl2-val">100</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tl2-best">0</div></div>
        </div>
        <div class="status info" id="tl2-status">Climb the ladder — one wrong step and you fall!</div>
        <div class="center" id="tl2-q" style="font-size:18px;font-weight:700;margin:12px 0;"></div>
        <div class="center" id="tl2-opts" style="max-width:420px;"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:10px;flex-wrap:wrap;">
          <button class="btn btn-sm" id="tl2-5050">✂️ 50:50</button>
          <button class="btn btn-sm" id="tl2-ask">👥 Ask the crowd</button>
          <button class="btn btn-sm" id="tl2-phone">📞 Phone a friend</button>
          <button class="btn btn-sm" id="tl2-bank">🏦 Bank it & quit</button>
        </div>
      `;

      const qEl = root.querySelector("#tl2-q");
      const optsEl = root.querySelector("#tl2-opts");
      const statusEl = root.querySelector("#tl2-status");
      best = Storage.getBest("trivialadder") || 0;
      lifelines = {fifty: true, ask: true, phone: true};

      function start() {
        // build a 12-question ladder with increasing difficulty
        ladder = [];
        for (let lvl = 1; lvl <= 6; lvl++) {
          const pool = BANK.filter(q => q.lvl === lvl).sort(() => Math.random() - 0.5);
          ladder.push(pool[0], pool[1]);
        }
        step = 0;
        over = false;
        banked = 0;
        lifelines = {fifty: true, ask: true, phone: true};
        render();
      }

      function cur() {
        return ladder[step];
      }

      function pick(i) {
        if (over) return;
        const item = cur();
        if (i === item.a) {
          step++;
          AudioFX.win();
          if (step >= 12) {
            over = true;
            banked = RUNGS[11];
            finish("🏆 Top of the ladder — 125,000 points!");
          } else {
            statusEl.textContent = `✔ Correct! You're on rung ${step + 1} (${RUNGS[step]} pts)`;
            statusEl.className = "status win";
            render();
          }
        } else {
          over = true;
          const safe = step >= 4 ? 1000 : step >= 8 ? 32000 : 0;
          banked = safe;
          AudioFX.lose();
          finish(`💀 Wrong — you fall to ${safe} points. It was “${item.o[item.a]}”.`);
        }
      }

      function finish(msg) {
        statusEl.textContent = msg;
        statusEl.className = "status " + (banked >= 32000 ? "win" : "lose");
        if (banked > best) {
          best = banked;
          Storage.setBest("trivialadder", banked);
          App.toast("New best: " + banked.toLocaleString(), "success");
        }
        updateHud();
        optsEl.innerHTML = `<button class="btn primary" id="tl2-again">🪜 Climb again</button>`;
        optsEl.querySelector("#tl2-again").addEventListener("click", start);
      }

      function useFifty() {
        if (!lifelines.fifty || over) return;
        lifelines.fifty = false;
        AudioFX.click();
        const wrong = [0, 1, 2, 3].filter(i => i !== cur().a).sort(() => Math.random() - 0.5);
        hidden.add(wrong[0]);
        hidden.add(wrong[1]);
        render();
      }

      function useAsk() {
        if (!lifelines.ask || over) return;
        lifelines.ask = false;
        AudioFX.click();
        const a = cur().a;
        // crowd skews to right answer
        let dist = [0, 0, 0, 0].map(() => 5 + Math.floor(Math.random() * 15));
        dist[a] += 45 + Math.floor(Math.random() * 20);
        const total = dist.reduce((s, v) => s + v, 0);
        App.toast("Crowd: " + dist.map((v, i) => String.fromCharCode(65 + i) + " " + Math.round(v / total * 100) + "%").join(" · "), "info");
      }

      function usePhone() {
        if (!lifelines.phone || over) return;
        lifelines.phone = false;
        AudioFX.click();
        const right = Math.random() < 0.8;
        const item = cur();
        if (right) App.toast("📞 Friend: “I'm pretty sure it's " + item.o[item.a] + ".”", "info");
        else {
          const wrong = [0, 1, 2, 3].filter(i => i !== item.a);
          App.toast("📞 Friend: “Hmm… maybe " + item.o[wrong[Math.floor(Math.random() * 3)]] + "?”", "info");
        }
      }

      let hidden = new Set();

      function updateHud() {
        root.querySelector("#tl2-step").textContent = Math.min(step + 1, 12) + "/12";
        root.querySelector("#tl2-val").textContent = RUNGS[Math.min(step, 11)].toLocaleString();
        root.querySelector("#tl2-best").textContent = best.toLocaleString();
      }

      function render() {
        updateHud();
        const item = cur();
        qEl.textContent = "🪜 " + item.q;
        optsEl.innerHTML = "";
        item.o.forEach((o, i) => {
          const b = document.createElement("div");
          b.style.cssText = `display:block;width:min(400px,92%);padding:11px;margin:5px auto;border-radius:9px;
            background:var(--bg-soft,#334155);color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;`;
          if (hidden.has(i)) {
            b.style.opacity = "0.2";
            b.style.pointerEvents = "none";
            b.textContent = "—";
          } else {
            b.textContent = String.fromCharCode(65 + i) + ". " + o;
            b.addEventListener("pointerdown", () => pick(i));
          }
          optsEl.appendChild(b);
        });
        root.querySelector("#tl2-5050").disabled = !lifelines.fifty;
        root.querySelector("#tl2-ask").disabled = !lifelines.ask;
        root.querySelector("#tl2-phone").disabled = !lifelines.phone;
      }

      root.querySelector("#tl2-5050").addEventListener("click", useFifty);
      root.querySelector("#tl2-ask").addEventListener("click", useAsk);
      root.querySelector("#tl2-phone").addEventListener("click", usePhone);
      root.querySelector("#tl2-bank").addEventListener("click", () => {
        if (over) return;
        over = true;
        banked = step > 0 ? RUNGS[step - 1] : 0;
        AudioFX.pop();
        finish(`🏦 Banked ${banked.toLocaleString()} points — smart exit!`);
      });

      start();
      return function cleanup() {
      };
    },
    help: function () {
      App.showModal("How to play Trivia Ladder",
        `Millionaire-style climb: 12 questions of rising difficulty, worth 100 → 125,000 points.
        <br><br>Lifelines (one use each):
        <br>• ✂️ <b>50:50</b> — removes two wrong answers
        <br>• 👥 <b>Ask the crowd</b> — audience poll (usually right)
        <br>• 📞 <b>Phone a friend</b> — 80% reliable advice
        <br>• 🏦 <b>Bank it</b> — quit and keep your current rung's value
        <br>A wrong answer drops you to the last safe rung (1,000 at rung 4+, 32,000 at rung 8+).`);
    },
  });
})();
