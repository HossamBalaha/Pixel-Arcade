/* oddoneout — spot the different emoji in the grid before it shrinks away. */
(function () {
  "use strict";
  GameRegistry.register({
    id: "oddoneout", name: "Odd One Out", icon: "🔍", category: "arcade",
    description: "Spot the one different emoji — grids grow, time melts", tags: ["arcade", "visual", "brain"],
    age: ["kids", "teens", "adults"], difficulty: "easy", duration: "quick", players: "single",
    mount: function (root, ctx) {
      const {App, AudioFX} = ctx;
      let alive = true, timer = null;
      let round = 1, score = 0, timeLeft = 60, over = false;
      let size, odd, base, oddStyle;

      const PAIRS = [
        ["🐶", "🐕"], ["🐱", "🐈"], ["🐭", "🐹"], ["🍎", "🍏"], ["😀", "😃"],
        ["🌑", "🌒"], ["🔶", "🔷"], ["🔵", "🟣"], ["⚪", "⚫"], ["🟥", "🟧"], ["🍌", "🍉"],
      ];

      function newRound() {
        size = Math.min(7, 2 + Math.floor((round - 1) / 2)); // 2x2 … 7x7
        [base, oddStyle] = PAIRS[Math.floor(Math.random() * PAIRS.length)];
        odd = Math.floor(Math.random() * size * size);
        render();
      }

      function render() {
        const grid = root.querySelector("#oo-grid");
        if (!grid) return;
        grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        let h = "";
        for (let i = 0; i < size * size; i++) {
          h += `<button class="oo-cell" data-i="${i}" style="font-size:${Math.max(20, 44 - size * 3)}px;">${i === odd ? oddStyle : base}</button>`;
        }
        grid.innerHTML = h;
        const sc = root.querySelector("#oo-sc"), tm = root.querySelector("#oo-tm"), lv = root.querySelector("#oo-lv");
        if (sc) sc.textContent = score;
        if (tm) tm.textContent = timeLeft + "s";
        if (lv) lv.textContent = round;
      }

      function click(i) {
        if (over) return;
        if (i === odd) {
          score += 10 + size * 2;
          round++;
          timeLeft = Math.min(60, timeLeft + 2);
          AudioFX.pop();
          newRound();
        } else {
          timeLeft = Math.max(1, timeLeft - 3);
          AudioFX.error();
          const st = root.querySelector("#oo-status");
          if (st) {
            st.textContent = "Not that one! −3s";
            st.className = "status";
          }
          render();
        }
      }

      root.innerHTML = `
        <style>
          #oo-grid { display: grid; gap: 6px; width: min(420px, 92vw); margin: 10px auto; }
          .oo-cell { aspect-ratio: 1; background: var(--bg-elev); border: 1px solid var(--border);
            border-radius: 10px; display: grid; place-items: center; cursor: pointer; }
          .oo-cell:hover { background: var(--bg); }
        </style>
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="oo-sc">0</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="oo-tm">60s</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="oo-lv">1</div></div>
        </div>
        <div class="status info" id="oo-status">Find the one emoji that is different!</div>
        <div id="oo-grid"></div>
      `;

      root.querySelector("#oo-grid").addEventListener("click", e => {
        const b = e.target.closest(".oo-cell");
        if (b) click(+b.dataset.i);
      });

      timer = setInterval(() => {
        if (!alive || over) return;
        timeLeft--;
        const tm = root.querySelector("#oo-tm");
        if (tm) tm.textContent = timeLeft + "s";
        if (timeLeft <= 0) {
          over = true;
          AudioFX.lose();
          App.recordResult(false, score);
          const st = root.querySelector("#oo-status");
          st.textContent = "⏰ Time's up! Final score: " + score;
          st.className = "status lose";
          const b = document.createElement("button");
          b.className = "btn primary";
          b.id = "oo-again";
          b.textContent = "↺ Play again";
          b.style.cssText = "display:block;margin:10px auto;";
          root.querySelector("#oo-grid").replaceWith(b);
          b.addEventListener("click", () => {
            round = 1;
            score = 0;
            timeLeft = 60;
            over = false;
            const grid2 = document.createElement("div");
            grid2.id = "oo-grid";
            b.replaceWith(grid2);
            grid2.addEventListener("click", e2 => {
              const c2 = e2.target.closest(".oo-cell");
              if (c2) click(+c2.dataset.i);
            });
            const st2 = root.querySelector("#oo-status");
            st2.textContent = "Find the one emoji that is different!";
            st2.className = "status info";
            newRound();
          });
        }
      }, 1000);

      newRound();
      return function cleanup() {
        alive = false;
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Odd One Out",
        "One emoji in the grid is subtly different from the rest — tap it." +
        "<br>Correct finds score points (bigger grids pay more) and add +2s; misses cost 3s." +
        "<br>The grid grows every couple of rounds. Rack up points before 60 seconds run out.");
    },
  });
})();
