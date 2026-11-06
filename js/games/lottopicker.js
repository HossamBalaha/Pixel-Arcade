/* Lotto Picker — pick 6 numbers 1-49, generate draw, count matches. */
(function () {
  const MAX = 49, PICK = 6;

  GameRegistry.register({
    id: "lottopicker",
    name: "Lotto Picker",
    icon: "🎰",
    category: "arcade",
    description: "Pick 6 numbers 1–49, draw 6, count your matches",
    tags: ["arcade", "luck"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let picks, drawn, over, best, draws = 0, totalMatches = 0;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Draws</div><div class="val" id="lp-draws">0</div></div>
          <div class="score-cell"><div class="label">Best Match</div><div class="val" id="lp-best">0</div></div>
          <div class="score-cell"><div class="label">Avg</div><div class="val" id="lp-avg">0.0</div></div>
        </div>
        <div class="status info" id="lp-status">Pick ${PICK} numbers (1–${MAX}), then click Draw</div>
        <div class="center"><div id="lp-grid" style="display:grid;grid-template-columns:repeat(7,40px);grid-template-rows:repeat(7,40px);gap:4px;"></div></div>
        <div id="lp-picks" style="text-align:center;margin:8px 0;font-family:var(--font-mono);font-size:1.2rem;"></div>
        <div id="lp-drawn" style="text-align:center;margin:8px 0;font-family:var(--font-mono);font-size:1.2rem;color:var(--accent);"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="lp-clear">Clear</button>
          <button class="btn primary" id="lp-draw">Draw</button>
          <button class="btn" id="lp-auto">Auto-pick</button>
        </div>
        <p class="hint">Click numbers to toggle. Match all 6 to win! Best match saved.</p>
      `;
      const gridEl = root.querySelector("#lp-grid");
      const statusEl = root.querySelector("#lp-status");
      best = Storage.getBest("lottopicker") || 0;
      root.querySelector("#lp-best").textContent = best;

      picks = new Set();

      function buildGrid() {
        gridEl.innerHTML = "";
        for (let n = 1; n <= MAX; n++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.style.fontSize = "0.9rem";
          cell.textContent = n;
          cell.dataset.n = n;
          updateCell(cell, n);
          cell.addEventListener("click", () => toggle(n));
          gridEl.appendChild(cell);
        }
      }

      function updateCell(cell, n) {
        if (picks.has(n)) {
          cell.classList.add("filled");
          cell.style.background = "var(--accent)";
          cell.style.color = "#fff";
        } else {
          cell.classList.remove("filled");
          cell.style.background = "";
          cell.style.color = "";
        }
        if (drawn && drawn.has(n)) {
          cell.style.outline = "3px solid var(--success)";
        } else cell.style.outline = "";
      }

      function toggle(n) {
        if (over && drawn) {
          newRound();
          return;
        }
        if (drawn) {
          newRound();
          picks.add(n);
          renderPicks();
          updateGrid();
          return;
        }
        if (picks.has(n)) picks.delete(n);
        else if (picks.size < PICK) picks.add(n);
        else {
          AudioFX.error();
          App.toast("You can only pick " + PICK + " numbers", "info");
          return;
        }
        AudioFX.click();
        updateGrid();
        renderPicks();
      }

      function updateGrid() {
        gridEl.querySelectorAll("[data-n]").forEach(c => updateCell(c, +c.dataset.n));
      }

      function renderPicks() {
        root.querySelector("#lp-picks").textContent = "Your picks: " + (picks.size ? [...picks].sort((a, b) => a - b).join(", ") : "—");
        root.querySelector("#lp-drawn").textContent = drawn ? "Drawn: " + [...drawn].sort((a, b) => a - b).join(", ") : "";
      }

      function draw() {
        if (picks.size !== PICK) {
          AudioFX.error();
          statusEl.textContent = `Pick exactly ${PICK} numbers first`;
          statusEl.className = "status lose";
          return;
        }
        drawn = new Set();
        while (drawn.size < PICK) {
          drawn.add(1 + Math.floor(Math.random() * MAX));
        }
        const matches = [...picks].filter(n => drawn.has(n)).length;
        draws++;
        totalMatches += matches;
        if (matches > best) {
          best = matches;
          Storage.setBest("lottopicker", best);
          root.querySelector("#lp-best").textContent = best;
        }
        AudioFX.win();
        const won = matches === PICK;
        statusEl.textContent = won ? `🎉 JACKPOT! All ${PICK} match!` : `Matched ${matches}/${PICK} — click any number or Draw again`;
        statusEl.className = "status " + (won ? "win" : (matches >= 3 ? "win" : "info"));
        root.querySelector("#lp-draws").textContent = draws;
        root.querySelector("#lp-avg").textContent = (totalMatches / draws).toFixed(1);
        over = true;
        updateGrid();
        renderPicks();
      }

      function newRound() {
        picks = new Set();
        drawn = null;
        over = false;
        statusEl.textContent = `Pick ${PICK} numbers (1–${MAX}), then click Draw`;
        statusEl.className = "status info";
        updateGrid();
        renderPicks();
      }

      function autoPick() {
        newRound();
        while (picks.size < PICK) picks.add(1 + Math.floor(Math.random() * MAX));
        AudioFX.pop();
        updateGrid();
        renderPicks();
      }

      root.querySelector("#lp-draw").addEventListener("click", draw);
      root.querySelector("#lp-clear").addEventListener("click", newRound);
      root.querySelector("#lp-auto").addEventListener("click", autoPick);
      buildGrid();
      return function cleanup() {
        alive = false;
      };
    },
    help: function () {
      App.showModal("How to play Lotto Picker",
        `Pick ${6} numbers between 1 and ${49}. Then click <b>Draw</b> to generate the lottery draw.
        <br><br>Match all 6 for the jackpot! Best match count and average matches per draw are tracked.
        <br>Use <b>Auto-pick</b> for a random selection. <b>Clear</b> starts a new round.`);
    },
  });
})();
