/* wordjumbleeasy — Word Jumble Easy (auto-generated word jumble) */
(function () {
  "use strict";
  const WORDS = ["BREAD", "PASTA", "SUSHI", "CURRY", "PIZZA", "BAGEL", "SALAD", "STEAK", "TACOS", "WOKHE", "HONEY", "MANGO", "LEMON", "BASIL", "THYME", "CUMIN", "APPLE", "OLIVE", "FUDGE", "DATES", "TIGER", "ZEBRA", "PANDA", "EAGLE", "HORSE", "SHARK", "KOALA", "LEMUR", "OTTER", "BISON", "CAMEL", "GECKO", "HIPPO", "RHINO", "SLOTH", "SNAKE", "WHALE", "HYENA", "MOOSE", "OKAPI", "VENUS", "PLUTO", "ORBIT", "COMET", "LUNAR", "SOLAR", "LUNAR"];
  const SECS = 30;

  function shuffle(s) {
    const a = s.split("");
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.join("");
  }

  GameRegistry.register({
    id: "wordjumbleeasy", name: "Word Jumble Easy", icon: "🔀", category: "word",
    description: "Unscramble 5-letter words, 30s.", tags: ["word", "scramble", "jumble"],
    age: ["teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, target = "", scrambled = "", score = 0, time = SECS, timer = null, over = false;

      function start() {
        score = 0;
        time = SECS;
        over = false;
        nextWord();
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive || over) return;
          time--;
          const tEl = root.querySelector("#wordjumbleeasy-time");
          if (tEl) tEl.textContent = time + "s";
          if (time <= 0) {
            clearInterval(timer);
            over = true;
            App.recordResult(true, score);
            AudioFX.win();
            App.toast("Time! Score: " + score, "success");
          }
        }, 1000);
      }

      function nextWord() {
        target = WORDS[Math.floor(Math.random() * WORDS.length)];
        scrambled = shuffle(target);
        while (scrambled === target) scrambled = shuffle(target);
        render();
      }

      function submit() {
        const inp = root.querySelector("#wordjumbleeasy-inp");
        if (!inp) return;
        if (inp.value.toUpperCase() === target) {
          score++;
          AudioFX.pop();
          App.toast("Correct!", "success");
          inp.value = "";
          nextWord();
        } else {
          AudioFX.lose();
          App.toast("Try again", "warning");
        }
      }

      function render() {
        const stage = root.querySelector("#wordjumbleeasy-stage");
        if (!stage) return;
        stage.innerHTML = `
          <style>
            .jum-scrambled { font-size:2rem; font-weight:700; letter-spacing:0.25em; text-align:center; padding:20px; font-family:var(--font-mono,monospace); color:var(--accent,#6366f1); }
            .jum-in { font-size:1.2rem; padding:8px 14px; text-align:center; width:200px; border:2px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff); color:var(--text,#111); }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 10px; color:var(--text-muted,#64748b); font-size:0.95rem;">
            <span>Score: <strong id="wordjumbleeasy-score">${score}</strong></span>
            <span>Time: <span id="wordjumbleeasy-time">${time}s</span></span>
          </div>
          <div class="jum-scrambled">${scrambled}</div>
          <div style="text-align:center; margin-top:14px;">
            <input id="wordjumbleeasy-inp" class="jum-in" placeholder="Type the word" autocomplete="off" />
            <div style="margin-top:14px;"><button class="btn primary" id="wordjumbleeasy-go">Submit</button>
            <button class="btn" id="wordjumbleeasy-skip">Skip</button></div>
          </div>
        `;
        const inp = stage.querySelector("#wordjumbleeasy-inp");
        inp.focus();
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
        stage.querySelector("#wordjumbleeasy-go").addEventListener("click", submit);
        stage.querySelector("#wordjumbleeasy-skip").addEventListener("click", () => {
          AudioFX.lose();
          nextWord();
        });
      }

      root.innerHTML = `<div id="wordjumbleeasy-stage"></div><div style="text-align:center; margin-top:14px;"><button class="btn" id="wordjumbleeasy-new">Restart</button></div>`;
      root.querySelector("#wordjumbleeasy-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Word Jumble Easy", "Unscramble as many words as you can in 30 seconds. Type the answer and press Enter.");
    },
  });
})();
