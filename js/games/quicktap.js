/* quicktap — Quick Tap (auto-generated mini arcade) */
(function () {
  "use strict";
  const DURATION = 30;
  const TARGET_EMOJI = "\ud83c\udfaf";
  GameRegistry.register({
    id: "quicktap", name: "Quick Tap", icon: "👆", category: "arcade",
    description: "Tap targets fast \u2014 30s.", tags: ["arcade", "mini"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, score = 0, time = DURATION, timer = null;

      function start() {
        score = 0;
        time = DURATION;
        root.querySelector("#quicktap-score").textContent = "0";
        root.querySelector("#quicktap-time").textContent = DURATION + "s";
        if (timer) clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          time--;
          root.querySelector("#quicktap-time").textContent = time + "s";
          if (time <= 0) {
            clearInterval(timer);
            App.recordResult(true, score);
            AudioFX.win();
            App.toast("Time! Score: " + score, "success");
            spawnEnd();
          }
        }, 1000);
        spawn();
      }

      function spawn() {
        if (!alive || time <= 0) return;
        const t = document.createElement("button");
        t.className = "am-target";
        t.textContent = TARGET_EMOJI;
        const board = root.querySelector("#quicktap-board");
        if (!board) return;
        const w = board.clientWidth - 60, h = board.clientHeight - 60;
        t.style.left = Math.max(0, Math.floor(Math.random() * w)) + "px";
        t.style.top = Math.max(0, Math.floor(Math.random() * h)) + "px";
        t.addEventListener("click", () => {
          score++;
          AudioFX.pop();
          root.querySelector("#quicktap-score").textContent = score;
          t.remove();
          spawn();
        });
        board.appendChild(t);
        setTimeout(() => {
          if (!alive) return;
          if (t.parentNode) {
            t.remove();
            spawn();
          }
        }, 1200);
      }

      function spawnEnd() {
        const board = root.querySelector("#quicktap-board");
        if (board) board.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted,#64748b); font-size:1.2rem;">Game over — score: ' + score + '</div>';
      }

      root.innerHTML = `
        <style>
          .am-board { position:relative; width:100%; max-width:520px; height:340px; margin:0 auto;
                       background:var(--bg-elev,#fff); border:1px solid var(--border,#d1d5db); border-radius:12px; overflow:hidden; }
          .am-target { position:absolute; width:54px; height:54px; font-size:1.8rem; cursor:pointer;
                        border-radius:50%; background:var(--accent,#6366f1); color:#fff; border:none;
                        display:flex; align-items:center; justify-content:center;
                        box-shadow:0 2px 10px rgba(0,0,0,0.2); transition: transform 0.1s; }
          .am-target:hover { transform: scale(1.1); }
        </style>
        <div style="display:flex; justify-content:space-between; padding:0 4px 10px; font-size:1rem; color:var(--text-muted,#64748b);">
          <span>Score: <strong id="quicktap-score" style="color:var(--text,#111);">0</strong></span>
          <span>Time: <span id="quicktap-time">30s</span></span>
        </div>
        <div id="quicktap-board" class="am-board"></div>
        <div style="text-align:center; margin-top:14px;"><button class="btn primary" id="quicktap-new">Restart</button></div>
      `;
      root.querySelector("#quicktap-new").addEventListener("click", start);
      start();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Quick Tap", "Tap as many " + TARGET_EMOJI + " targets as you can in " + DURATION + " seconds. Targets move after 1.2s.");
    },
  });
})();
