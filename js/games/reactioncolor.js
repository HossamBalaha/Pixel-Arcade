/* reactioncolor — Reaction Color (auto-generated reaction test, stimulus=color) */
(function () {
  "use strict";
  const STIMULUS = "";
  const WAIT_TEXT = "Wait for green...";
  const GO_TEXT = "TAP!";
  GameRegistry.register({
    id: "reactioncolor", name: "Reaction Color", icon: "🔴", category: "arcade",
    description: "Tap when the screen turns green.", tags: ["arcade", "reaction"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, round = 0, sum = 0, n = 5, startTime = 0, waiting = false, timeout = null;

      function nextRound() {
        round++;
        if (round > n) {
          showEnd();
          return;
        }
        root.querySelector("#reactioncolor-round").textContent = round + "/" + n;
        const pad = root.querySelector("#reactioncolor-pad");
        pad.style.background = "#ef4444";
        pad.textContent = WAIT_TEXT;
        waiting = true;
        startTime = 0;
        const delay = 1000 + Math.random() * 2500;
        timeout = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          waiting = false;
          startTime = performance.now();
          pad.style.background = "#22c55e";
          pad.textContent = GO_TEXT;
        }, delay);
      }

      function padClick() {
        if (waiting) {
          clearTimeout(timeout);
          AudioFX.lose();
          App.toast("Too early!", "warning");
          const pad = root.querySelector("#reactioncolor-pad");
          pad.textContent = "Too early — click to retry";
          pad.style.background = "#f59e0b";
          waiting = false;
          return;
        }
        if (startTime === 0) {
          nextRound();
          return;
        }
        const ms = Math.round(performance.now() - startTime);
        sum += ms;
        AudioFX.pop();
        App.toast(ms + " ms", "info");
        startTime = 0;
        nextRound();
      }

      function showEnd() {
        const avg = Math.round(sum / n);
        App.recordResult(true, avg);
        AudioFX.win();
        const pad = root.querySelector("#reactioncolor-pad");
        pad.style.background = "var(--bg-elev,#fff)";
        pad.textContent = "Avg: " + avg + " ms — click to retry";
        root.querySelector("#reactioncolor-round").textContent = "Done!";
        round = 0;
        sum = 0;
        startTime = 0;
      }

      root.innerHTML = `
        <style>.rt-pad { width:100%; max-width:480px; height:300px; margin:0 auto; display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:700; color:#fff; cursor:pointer; border-radius:12px; user-select:none; }</style>
        <div style="text-align:center; padding:10px; color:var(--text-muted,#64748b);">Round: <span id="reactioncolor-round">1/5</span></div>
        <div id="reactioncolor-pad" class="rt-pad" style="background:#f59e0b;">Click to start</div>
      `;
      root.querySelector("#reactioncolor-pad").addEventListener("click", padClick);
      return function cleanup() {
        alive = false;
        clearTimeout(timeout);
      };
    },
    help: function () {
      App.showModal("How to play Reaction Color", "Wait for the stimulus, then tap as fast as you can. 5 rounds; final score is your average ms.");
    },
  });
})();
