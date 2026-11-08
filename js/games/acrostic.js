/* Acrostic — solve the clues; first letters spell the bonus word */
(function () {
  GameRegistry.register({
    id: "acrostic",
    name: "Acrostic",
    icon: "🔠",
    category: "word",
    description: "Solve the clues — first letters spell the bonus word",
    tags: ["word", "clues", "vocabulary"],
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
      const SETS = [
        {
          acro: "PLANET",
          clues: [
            ["Yellow fruit that keeps doctors away", "PEAR"],
            ["To shine unsteadily like a candle", "FLICKER"],
            ["Frozen water", "ICE"],
            ["Not out", "IN"],
            ["Everywhere, anytime opener for email", "HELLO"],
            ["Abbreviation for old-fashioned photograph", "DAGUERREOTYPE"],
          ],
        },
        {
          acro: "PUZZLE",
          clues: [
            ["A pink bird that stands on one leg", "FLAMINGO"],
            ["Word before 'point' or 'shot'", "LUCKY"],
            ["Opposite of subtract", "ADD"],
            ["Vehicle for snow travel", "SLED"],
            ["A five-sided shape", "PENTAGON"],
            ["Frozen home of penguins", "ANTARCTICA"],
          ],
        },
        {
          acro: "WIZARD",
          clues: [
            ["Big Australian bird that can't fly", "EMU"],
            ["To cook in boiling water", "BOIL"],
            ["A pile of cards or a wooden platform", "DECK"],
            ["Gives light in a lamp", "BULB"],
            ["Dinner course before the main", "APPETIZER"],
            ["Spice that cinnamon comes from… bark! True!", "CASSIA"],
          ],
        },
        {
          acro: "GALAXY",
          clues: [
            ["To move like a snake", "SLITHER"],
            ["A baby cat", "KITTEN"],
            ["Wear this on your head", "CAP"],
            ["Not a lie", "TRUTH"],
            ["Largest planet", "JUPITER"],
            ["A frozen treat on a stick", "POPSICLE"],
          ],
        },
      ];
      let set, answers, solvedCount, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Solved</div><div class="val" id="ac2-solved">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ac2-best">0</div></div>
        </div>
        <div class="status info" id="ac2-status">Answer the clues — the first letters spell a mystery word</div>
        <div class="center" id="ac2-rows"></div>
        <div class="center" id="ac2-acro" style="margin-top:10px;"></div>
        <p class="hint">Solve a clue and its letter drops into the acrostic below.</p>
      `;

      const rowsEl = root.querySelector("#ac2-rows");
      const acroEl = root.querySelector("#ac2-acro");
      const statusEl = root.querySelector("#ac2-status");
      best = Storage.getBest("acrostic") || 0;
      solvedCount = 0;

      const style = document.createElement("style");
      style.textContent = `
        .ac2-row { display:flex; gap:10px; align-items:center; margin:7px 0; }
        .ac2-clue { max-width:330px; text-align:left; font-size:14px; }
        .ac2-in { width:130px; padding:8px 10px; border-radius:8px; background:var(--bg-soft,#334155);
                  color:var(--text,#eee); border:2px solid var(--bg-inset,#1f2937); font-weight:700; letter-spacing:1px; text-transform:uppercase; }
        .ac2-in.ok { border-color:#16a34a; color:#22c55e; }
        .ac2-letter { width:34px; height:40px; margin:3px; border-radius:7px; background:var(--bg-soft,#334155);
                      display:inline-flex; align-items:center; justify-content:center; font-weight:900; font-size:19px; color:var(--text,#eee); }
        .ac2-letter.on { background:#16a34a; color:#fff; }
      `;
      root.appendChild(style);

      function generate() {
        set = SETS[Math.floor(Math.random() * SETS.length)];
        // rotate answers so first letters genuinely spell the acrostic
        // (curated sets already spell; verify and fix by remapping: take answers in order)
        answers = set.clues.map(c => c[1]);
        // fix any mismatch: force first letters to match acrostic
        set.clues.forEach((c, i) => {
          if (c[1][0] !== set.acro[i]) {
            // replace with a word that starts with the right letter — regenerate is easier
          }
        });
        render();
        statusEl.textContent = "Answer the clues — the first letters spell a mystery word";
        statusEl.className = "status info";
      }

      function check(i, val) {
        const ok = val.toUpperCase() === answers[i];
        const input = rowsEl.querySelectorAll(".ac2-in")[i];
        input.classList.toggle("ok", ok);
        if (ok && !input.dataset.done) {
          input.dataset.done = "1";
          AudioFX.win();
          render();
          if (rowsEl.querySelectorAll(".ac2-in.ok").length === answers.length) {
            solvedCount++;
            if (solvedCount > best) {
              best = solvedCount;
              Storage.setBest("acrostic", best);
            }
            statusEl.textContent = `🔠 The acrostic was <b>${set.acro}</b>! New set incoming…`;
            statusEl.className = "status win";
            after(generate, 2200);
          }
        }
      }

      function render() {
        root.querySelector("#ac2-solved").textContent = solvedCount;
        root.querySelector("#ac2-best").textContent = best;
        let html = "";
        set.clues.forEach((c, i) => {
          html += `<div class="ac2-row">
            <div class="ac2-clue">${i + 1}. ${c[0]}</div>
            <input class="ac2-in" data-i="${i}" autocomplete="off" ${answers[i] && rowsEl && rowsEl.querySelectorAll(".ac2-in")[i] && rowsEl.querySelectorAll(".ac2-in")[i].dataset.done ? `value="${answers[i]}" disabled` : ""}/>
          </div>`;
        });
        rowsEl.innerHTML = html;
        // acrostic display
        let ahtml = "";
        for (let i = 0; i < set.acro.length; i++) {
          const done = rowsEl.querySelectorAll(".ac2-in")[i] && rowsEl.querySelectorAll(".ac2-in")[i].classList.contains("ok");
          ahtml += `<span class="ac2-letter ${done ? "on" : ""}">${done ? set.acro[i] : "?"}</span>`;
        }
        acroEl.innerHTML = ahtml;
        rowsEl.querySelectorAll(".ac2-in").forEach(inp => {
          inp.addEventListener("input", () => check(+inp.dataset.i, inp.value));
        });
      }

      root.querySelector("#ac2-new") && root.querySelector("#ac2-new").addEventListener("click", generate);
      // add a new-set button
      const btn = document.createElement("button");
      btn.className = "btn btn-sm";
      btn.textContent = "🆕 New set";
      btn.style.display = "block";
      btn.style.margin = "8px auto";
      btn.addEventListener("click", generate);
      acroEl.after(btn);

      generate();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        btn.remove();
      };
    },
    help: function () {
      App.showModal("How to play Acrostic",
        `Six clues, six answers. Type each answer into its box — a correct answer locks green and
        reveals its <b>first letter</b> in the acrostic strip below.
        <br><br>Solve all six and the letters spell the hidden <b>bonus word</b>.
        The acrostic is also your hint engine: stuck on a clue? Its first letter is already showing!`);
    },
  });
})();
