/* Dice Roll (Yahtzee-lite) — 5 dice, 3 rolls, scoring categories. */
(function () {
  const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  function rollDice() {
    return 1 + Math.floor(Math.random() * 6);
  }

  function scoreCounts(dice) {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // index 1-6
    for (const d of dice) counts[d]++;
    return counts;
  }

  GameRegistry.register({
    id: "diceroll",
    name: "Dice Roll (Yahtzee-lite)",
    icon: "🎲",
    category: "arcade",
    description: "5 dice, 3 rolls per turn, score the best category",
    tags: ["dice", "classic"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let dice, holds, rollsLeft, total, round, used, over;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      const CATEGORIES = [
        {id: "ones", name: "Ones (sum of 1s)", score: d => scoreCounts(d)[1] * 1},
        {id: "twos", name: "Twos (sum of 2s)", score: d => scoreCounts(d)[2] * 2},
        {id: "threes", name: "Threes (sum of 3s)", score: d => scoreCounts(d)[3] * 3},
        {
          id: "threekind", name: "3-of-a-kind (sum)", score: d => {
            const c = scoreCounts(d);
            return c.some(x => x >= 3) ? d.reduce((a, b) => a + b, 0) : 0;
          }
        },
        {
          id: "fourkind", name: "4-of-a-kind (sum)", score: d => {
            const c = scoreCounts(d);
            return c.some(x => x >= 4) ? d.reduce((a, b) => a + b, 0) : 0;
          }
        },
        {
          id: "fullhouse", name: "Full House (25)", score: d => {
            const c = scoreCounts(d).slice(1);
            const has3 = c.includes(3);
            const has2 = c.includes(2);
            return (has3 && has2) ? 25 : 0;
          }
        },
        {
          id: "smallstr", name: "Small Straight (30)", score: d => {
            const s = new Set(d);
            let runs = 0, max = 0;
            for (let i = 1; i <= 6; i++) {
              if (s.has(i)) {
                runs++;
                max = Math.max(max, runs);
              } else runs = 0;
            }
            return max >= 4 ? 30 : 0;
          }
        },
        {
          id: "largestr", name: "Large Straight (40)", score: d => {
            const s = new Set(d);
            const has = (st) => st.every(x => s.has(x));
            return (has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6])) ? 40 : 0;
          }
        },
        {
          id: "yahtzee", name: "Yahtzee (50)", score: d => {
            const c = scoreCounts(d);
            return c.some(x => x === 5) ? 50 : 0;
          }
        },
        {id: "chance", name: "Chance (sum)", score: d => d.reduce((a, b) => a + b, 0)},
      ];

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="dc-round">1/10</div></div>
          <div class="score-cell"><div class="label">Total</div><div class="val" id="dc-total">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="dc-best">-</div></div>
        </div>
        <div class="status info" id="dc-status">Roll the dice up to 3 times, then score a category</div>
        <div class="center" id="dc-dice" style="margin:14px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn primary" id="dc-roll">Roll</button>
          <button class="btn" id="dc-reset">Reset Turn</button>
        </div>
        <div id="dc-cats" style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;"></div>
        <p class="hint">Tap dice to hold between rolls. Click a category to score it.</p>
      `;
      root.querySelector("#dc-best").textContent = Storage.getBest("diceroll") ?? "-";
      const diceEl = root.querySelector("#dc-dice");
      const statusEl = root.querySelector("#dc-status");
      const catsEl = root.querySelector("#dc-cats");

      function newGame() {
        dice = [1, 1, 1, 1, 1];
        holds = [false, false, false, false, false];
        rollsLeft = 3;
        total = 0;
        round = 0;
        used = new Set();
        over = false;
        statusEl.textContent = "Roll the dice up to 3 times, then score a category";
        statusEl.className = "status info";
        renderDice();
        renderCats();
        root.querySelector("#dc-total").textContent = 0;
        root.querySelector("#dc-round").textContent = "1/10";
        roll();
      }

      function renderDice() {
        diceEl.innerHTML = "";
        for (let i = 0; i < 5; i++) {
          const die = document.createElement("button");
          die.className = "btn" + (holds[i] ? " primary" : "");
          die.style.fontSize = "2.4rem";
          die.style.width = "60px";
          die.style.height = "60px";
          die.style.padding = "0";
          die.textContent = FACES[dice[i] - 1];
          die.dataset.i = i;
          die.title = holds[i] ? "Held (click to release)" : "Click to hold";
          die.addEventListener("click", () => {
            if (rollsLeft >= 3 || over) return;
            holds[i] = !holds[i];
            AudioFX.click();
            renderDice();
          });
          diceEl.appendChild(die);
        }
      }

      function renderCats() {
        catsEl.innerHTML = "";
        for (const cat of CATEGORIES) {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.style.textAlign = "left";
          btn.style.fontSize = "0.85rem";
          btn.style.padding = "8px 10px";
          const score = cat.score(dice);
          const usedC = used.has(cat.id);
          if (usedC) {
            btn.classList.add("disabled");
            btn.style.opacity = "0.4";
            btn.style.cursor = "not-allowed";
          }
          btn.innerHTML = `${cat.name} ${usedC ? "(scored: " + (cat._scored ?? 0) + ")" : `→ ${score}`} `;
          btn.addEventListener("click", () => {
            if (usedC || over) return;
            scoreCat(cat, score);
          });
          btn.disabled = usedC || over;
          catsEl.appendChild(btn);
        }
      }

      function roll() {
        if (rollsLeft <= 0 || over) return;
        for (let i = 0; i < 5; i++) if (!holds[i]) dice[i] = rollDice();
        rollsLeft--;
        AudioFX.tick();
        holds = holds.map((h, i) => rollsLeft > 0 ? h : false);
        renderDice();
        renderCats();
        statusEl.textContent = rollsLeft > 0 ? `${rollsLeft} roll(s) left — hold dice and roll again, or score` : "Out of rolls — choose a category to score";
        statusEl.className = "status info";
      }

      function scoreCat(cat, score) {
        cat._scored = score;
        used.add(cat.id);
        total += score;
        round++;
        AudioFX.win();
        root.querySelector("#dc-total").textContent = total;
        root.querySelector("#dc-round").textContent = (round + 1) + "/10";
        // reset for next round
        dice = [1, 1, 1, 1, 1];
        holds = [false, false, false, false, false];
        rollsLeft = 3;
        if (round >= 10) {
          over = true;
          statusEl.textContent = `Game over! Total: ${total}`;
          statusEl.className = "status win";
          AudioFX.win();
          if (total > (Storage.getBest("diceroll") || 0)) {
            Storage.setBest("diceroll", total);
            App.toast("New best: " + total, "success");
            root.querySelector("#dc-best").textContent = total;
          }
        } else {
          statusEl.textContent = `+${score}! ${10 - round} rounds left. Roll again.`;
          roll();
        }
        renderCats();
      }

      root.querySelector("#dc-roll").addEventListener("click", roll);
      root.querySelector("#dc-reset").addEventListener("click", () => {
        if (over) {
          newGame();
          return;
        }
        holds = [false, false, false, false, false];
        rollsLeft = 3;
        roll();
      });
      newGame();
      return function cleanup() {
        alive = false;
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Dice Roll (Yahtzee-lite)",
        `Each round, you get 3 rolls of 5 dice. After each roll you can tap dice to "hold" them, keeping their value for the next roll.
        <br>After up to 3 rolls, pick a scoring category to record your score for that round.
        <br><br>Categories include Ones/Twes/Threes, 3-of-a-kind, 4-of-a-kind, Full House, Small/Large Straight, Yahtzee (5 of a kind), and Chance (sum).
        <br>Each category can be used only once. 10 rounds total. Highest total wins.`);
    },
  });
})();
