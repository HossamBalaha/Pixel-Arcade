/* Who Am I — guess the mystery figure from clues */
(function () {
  GameRegistry.register({
    id: "whoami",
    name: "Who Am I?",
    icon: "🕵️",
    category: "quiz",
    description: "Guess the mystery figure from clues — fewer clues, more points",
    tags: ["quiz", "clues", "deduction"],
    mount: function (root, {App, AudioFX, Storage}) {

      // tracked timers — all cleared on cleanup so no stale callback runs after close
      let __t = [];
      const after = (fn, ms) => {
        const h = setTimeout(() => {
          __t = __t.filter(x => x !== h);
          fn();
        }, ms);
        __t.push(h);
        return h;
      };
      const PEOPLE = [
        {
          name: "Albert Einstein",
          clues: ["I was born in Germany", "I worked at a patent office", "I won a Nobel Prize in 1921", "E = mc² is mine", "My hair is legendary"]
        },
        {
          name: "Cleopatra",
          clues: ["I was a queen", "I ruled over Egypt", "I spoke many languages", "I allied with Rome — then dated it", "My asp escape is famous"]
        },
        {
          name: "Leonardo da Vinci",
          clues: ["I was born in Italy", "I painted a famous smiling lady", "I also designed flying machines", "I wrote my notes backwards", "The Renaissance was my era"]
        },
        {
          name: "Marie Curie",
          clues: ["I was born in Poland", "I studied radioactivity", "I won two Nobel Prizes", "I discovered polonium and radium", "A university in Paris bears my name"]
        },
        {
          name: "William Shakespeare",
          clues: ["I was born in England", "I wrote 37-ish plays", "I coined words like 'bedazzled'", "My home town is on the Avon", "To be or not to be…"]
        },
        {
          name: "Napoleon Bonaparte",
          clues: ["I was born on an island", "I became Emperor of France", "I sold Louisiana to the USA", "I lost at Waterloo", "I was famously short (not really)"]
        },
        {
          name: "Ada Lovelace",
          clues: ["I lived in Victorian England", "My father was a poet", "I worked with Charles Babbage", "I wrote the first algorithm", "I'm called the first programmer"]
        },
        {
          name: "Abraham Lincoln",
          clues: ["I was born in a log cabin", "I wore a stovepipe hat", "I emancipated enslaved people", "I led during a civil war", "I was shot at a theater"]
        },
        {
          name: "Amelia Earhart",
          clues: ["I was an American pilot", "I flew across the Atlantic", "I set aviation records", "I vanished over the Pacific", "A lighthouse marks my last flight"]
        },
        {
          name: "Mahatma Gandhi",
          clues: ["I studied law in London", "I worked in South Africa", "I believed in nonviolence", "I led India to independence", "I spun my own cloth"]
        },
        {
          name: "Wolfgang Amadeus Mozart",
          clues: ["I was a child prodigy", "I was born in Salzburg", "I composed 600+ works", "My opera about a magic flute is famous", "I was buried in a common grave"]
        },
        {
          name: "Nikola Tesla",
          clues: ["I was born in Croatia (then Austria)", "I worked for Edison — briefly", "I championed AC power", "A car company bears my name", "I loved pigeons"]
        },
      ];
      let item, cluesShown, opts, score, best, round;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="wa2-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="wa2-round">1/6</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wa2-best">0</div></div>
        </div>
        <div class="status info" id="wa2-status">Guess from as few clues as possible!</div>
        <div class="center" id="wa2-clues" style="max-width:420px;margin:10px auto;text-align:left;"></div>
        <div class="center" id="wa2-opts" style="max-width:420px;"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:8px;">
          <button class="btn btn-sm" id="wa2-more">➕ Reveal another clue (−15)</button>
        </div>
      `;

      const cluesEl = root.querySelector("#wa2-clues");
      const optsEl = root.querySelector("#wa2-opts");
      const statusEl = root.querySelector("#wa2-status");
      best = Storage.getBest("whoami") || 0;
      round = 1;
      score = 0;

      function next() {
        const pool = PEOPLE.slice().sort(() => Math.random() - 0.5);
        item = pool[0];
        opts = [item, ...pool.slice(1, 4)].sort(() => Math.random() - 0.5);
        cluesShown = 1;
        statusEl.textContent = `Round ${round}: who am I?`;
        statusEl.className = "status info";
        render();
      }

      function reveal() {
        if (cluesShown >= item.clues.length) return;
        cluesShown++;
        score = Math.max(0, score - 15);
        AudioFX.click();
        render();
      }

      function guess(o) {
        const els = optsEl.querySelectorAll(".wa2-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        if (o.name === item.name) {
          const pts = Math.max(10, 100 - (cluesShown - 1) * 15);
          score += pts;
          AudioFX.win();
          els[opts.indexOf(o)].classList.add("right");
          statusEl.textContent = `🕵️ Correct with ${cluesShown} clue${cluesShown > 1 ? "s" : ""}! +${pts}`;
          statusEl.className = "status win";
        } else {
          AudioFX.error();
          els[opts.indexOf(o)].classList.add("wrong");
          els[opts.indexOf(item)].classList.add("right");
          statusEl.textContent = `It was ${item.name}.`;
          statusEl.className = "status lose";
        }
        round++;
        if (round > 6) {
          if (score > best) {
            best = score;
            Storage.setBest("whoami", score);
          }
          statusEl.textContent += ` — Game over: ${score} points.`;
          after(() => {
            round = 1;
            score = 0;
            next();
          }, 2800);
        } else {
          after(next, 2000);
        }
        updateHud();
      }

      function updateHud() {
        root.querySelector("#wa2-score").textContent = score;
        root.querySelector("#wa2-round").textContent = Math.min(round, 6) + "/6";
        root.querySelector("#wa2-best").textContent = best;
      }

      function render() {
        updateHud();
        cluesEl.innerHTML = item.clues.slice(0, cluesShown).map((c, i) =>
          `<div style="padding:7px 10px;margin:4px 0;border-radius:8px;background:var(--bg-soft,#334155);">
            💬 <b>Clue ${i + 1}:</b> “${c}”</div>`).join("");
        optsEl.innerHTML = "";
        opts.forEach(o => {
          const b = document.createElement("div");
          b.className = "wa2-opt";
          b.style.cssText = "display:block;width:min(380px,92%);padding:11px;margin:5px auto;border-radius:9px;background:var(--bg-soft,#334155);color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;";
          b.textContent = o.name;
          b.addEventListener("pointerdown", () => guess(o));
          optsEl.appendChild(b);
        });
      }

      root.querySelector("#wa2-more").addEventListener("click", reveal);
      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Who Am I?",
        `A mystery historical figure hides behind five clues. You start with one — the vaguest, of course.
        <br><br>Guess early for maximum points: the first clue is worth <b>100</b>, and each extra clue costs <b>15</b>.
        Four candidates, six rounds, famous scientists, rulers, artists and pioneers. Channel your inner detective!`);
    },
  });
})();
