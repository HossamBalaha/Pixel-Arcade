/* wordjumblemedium — Word Jumble Medium (auto-generated word jumble) */
(function () {
  "use strict";
  const WORDS = ["GALAXY", "QUASAR", "COSMOS", "PLANET", "NEBULA", "METEOR", "SATURN", "URANUS", "PULSAR", "CRATER"];
  const SECS = 25;

  function shuffle(s) {
    const a = s.split("");
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.join("");
  }

  GameRegistry.register({
    id: "wordjumblemedium", name: "Word Jumble Medium", icon: "🔀", category: "word",
    description: "Unscramble 6-letter words, 25s.", tags: ["word", "scramble", "jumble"],
    age: ["teens", "adults"], difficulty: "medium", duration: "quick", players: "single",
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
          const tEl = root.querySelector("#wordjumblemedium-time");
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
        const inp = root.querySelector("#wordjumblemedium-inp");
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
        const stage = root.querySelector("#wordjumblemedium-stage");
        if (!stage) return;
        stage.innerHTML = `
          <style>
            .jum-scrambled { font-size:2rem; font-weight:700; letter-spacing:0.25em; text-align:center; padding:20px; font-family:var(--font-mono,monospace); color:var(--accent,#6366f1); }
            .jum-in { font-size:1.2rem; padding:8px 14px; text-align:center; width:200px; border:2px solid var(--border,#d1d5db); border-radius:8px; background:var(--bg-elev,#fff); color:var(--text,#111); }
          </style>
          <div style="display:flex; justify-content:space-between; padding:0 4px 10px; color:var(--text-muted,#64748b); font-size:0.95rem;">
            <span>Score: <strong id="wordjumblemedium-score">${score}</strong></span>
            <span>Time: <span id="wordjumblemedium-time">${time}s</span></span>
          </div>
          <div class="jum-scrambled">${scrambled}</div>
          <div style="text-align:center; margin-top:14px;">
            <input id="wordjumblemedium-inp" class="jum-in" placeholder="Type the word" autocomplete="off" />
            <div style="margin-top:14px;"><button class="btn primary" id="wordjumblemedium-go">Submit</button>
            <button class="btn" id="wordjumblemedium-skip">Skip</button></div>
          </div>
        `;
        const inp = stage.querySelector("#wordjumblemedium-inp");
        inp.focus();
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") submit();
        });
        stage.querySelector("#wordjumblemedium-go").addEventListener("click", submit);
        stage.querySelector("#wordjumblemedium-skip").addEventListener("click", () => {
          AudioFX.lose();
          nextWord();
        });
      }

      root.innerHTML = `<div id="wordjumblemedium-stage"></div><div style="text-align:center; margin-top:14px;"><button class="btn" id="wordjumblemedium-new">Restart</button></div>`;
      root.querySelector("#wordjumblemedium-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Word Jumble Medium", "Unscramble as many words as you can in 25 seconds. Type the answer and press Enter.");
    },
  });
})();
