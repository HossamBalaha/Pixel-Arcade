/* synonymmatch — connect each word to its synonym against the clock. */
(function () {
  "use strict";
  const PAIRS = [
    ["happy", "joyful"], ["fast", "quick"], ["smart", "clever"], ["brave", "courageous"],
    ["calm", "serene"], ["eager", "keen"], ["strange", "odd"], ["honest", "truthful"],
    ["tired", "weary"], ["rich", "wealthy"], ["tiny", "minute"], ["fierce", "ferocious"],
    ["polite", "courteous"], ["sly", "cunning"], ["gloomy", "dreary"], ["stubborn", "obstinate"],
    ["shy", "timid"], ["angry", "furious"], ["neat", "tidy"], ["quiet", "silent"],
    ["funny", "amusing"], ["lazy", "idle"], ["kind", "caring"], ["loud", "noisy"],
    ["ancient", "old"], ["fake", "counterfeit"], ["huge", "enormous"], ["scared", "afraid"],
  ];

  GameRegistry.register({
    id: "synonymmatch", name: "Synonym Match", icon: "🔗", category: "word",
    description: "Link each word with its synonym before time runs out", tags: ["word", "vocabulary", "timed"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, timer = null;
      let round = 0, score = 0, timeLeft = 60, over = false;
      let words = [], syns = [], selW = -1, selS = -1, matched = new Set();

      function newRound() {
        const picks = PAIRS.slice();
        for (let i = picks.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [picks[i], picks[j]] = [picks[j], picks[i]];
        }
        picks.length = 4;
        words = picks.map(p => p[0]);
        syns = picks.map(p => p[1]);
        for (let i = syns.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [syns[i], syns[j]] = [syns[j], syns[i]];
        }
        selW = -1;
        selS = -1;
        matched.clear();
        render();
      }

      function clickW(i) {
        if (!matched.has(i)) {
          selW = i;
          AudioFX.click();
          render();
        }
      }

      function clickS(j) {
        if (selW < 0 || matched.has(selW)) return;
        const word = words[selW];
        const pair = PAIRS.find(p => p[0] === word);
        if (pair && pair[1] === syns[j]) {
          matched.add(selW);
          score += 10;
          AudioFX.pop();
          if (matched.size === 4) {
            round++;
            timeLeft = Math.min(60, timeLeft + 8);
            setTimeout(() => {
              if (alive && !over) newRound();
            }, 500);
          }
        } else {
          timeLeft = Math.max(1, timeLeft - 2);
          AudioFX.error();
        }
        selW = -1;
        render();
      }

      root.innerHTML = `
        <style>
          .sm-cols { display: flex; gap: 14px; justify-content: center; margin: 14px 0; }
          .sm-col { display: flex; flex-direction: column; gap: 8px; }
          .sm-word { padding: 10px 18px; border-radius: 10px; background: var(--bg-elev);
            border: 2px solid var(--border); cursor: pointer; font-weight: 700; }
          .sm-word.sel { border-color: #f59e0b; box-shadow: 0 0 8px #f59e0b66; }
          .sm-word.done { opacity: .35; cursor: default; text-decoration: line-through; }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sy-sc">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sy-tm">60s</div></div>
          <div class="score-cell"><div class="label">Rounds</div><div class="val" id="sy-r">0</div></div>
        </div>
        <div class="status info" id="sy-status">Click a word, then its synonym.</div>
        <div class="sm-cols">
          <div class="sm-col" id="sy-w"></div>
          <div class="sm-col" id="sy-s"></div>
        </div>
      `;

      function render() {
        const w = root.querySelector("#sy-w"), s = root.querySelector("#sy-s");
        w.innerHTML = words.map((x, i) =>
          `<div class="sm-word ${i === selW ? "sel" : ""} ${matched.has(i) ? "done" : ""}" data-w="${i}">${x}</div>`).join("");
        s.innerHTML = syns.map((x, j) =>
          `<div class="sm-word" data-s="${j}">${x}</div>`).join("");
        const sc = root.querySelector("#sy-sc"), tm = root.querySelector("#sy-tm"), r = root.querySelector("#sy-r");
        if (sc) sc.textContent = score;
        if (tm) tm.textContent = timeLeft + "s";
        if (r) r.textContent = round;
      }

      root.querySelector("#sy-w").addEventListener("click", e => {
        const b = e.target.closest("[data-w]");
        if (b) clickW(+b.dataset.w);
      });
      root.querySelector("#sy-s").addEventListener("click", e => {
        const b = e.target.closest("[data-s]");
        if (b) clickS(+b.dataset.s);
      });

      timer = setInterval(() => {
        if (!alive || over) return;
        timeLeft--;
        const tm = root.querySelector("#sy-tm");
        if (tm) tm.textContent = timeLeft + "s";
        if (timeLeft <= 0) {
          over = true;
          const st = root.querySelector("#sy-status");
          st.textContent = "⏰ Time's up! Final score: " + score;
          st.className = "status lose";
          AudioFX.lose();
          App.recordResult(false, score);
        }
      }, 1000);

      newRound();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Synonym Match",
        "Two columns: words on the left, their synonyms (shuffled) on the right." +
        "<br>Click a word, then click its matching synonym — correct links score 10 and clear the pair; a miss costs 2 seconds." +
        "<br>Clear all four to get a fresh set and +8s. How high can you score in 60 seconds?");
    },
  });
})();
