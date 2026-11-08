/* Two Truths — spot the lie among three facts */
(function () {
  GameRegistry.register({
    id: "twotruths",
    name: "Two Truths",
    icon: "🤥",
    category: "quiz",
    description: "Three statements — spot the lie",
    tags: ["quiz", "facts", "deduction"],
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
          truths: ["Octopuses have three hearts", "Honey never spoils", "Bananas are berries"],
          lie: "Strawberries are berries",
          why: "Strawberries are actually 'accessory fruits' — but bananas, botanically, ARE berries!"
        },
        {
          truths: ["A day on Venus is longer than its year", "The Eiffel Tower grows in summer", "Sharks predate trees"],
          lie: "The Great Wall is visible from the Moon",
          why: "The Wall is far too thin to be seen from the Moon — a common myth."
        },
        {
          truths: ["Wombat poop is cube-shaped", "Sea otters hold hands while sleeping", "Flamingos can only eat with their heads upside down"],
          lie: "Penguins can fly short distances",
          why: "Penguins lost flight millions of years ago — they're champion swimmers instead."
        },
        {
          truths: ["There are more stars than grains of sand on Earth", "Neutron stars can spin 600 times a second", "One million Earths could fit in the Sun"],
          lie: "The Sun is yellow in space",
          why: "The Sun is actually white — our atmosphere makes it look yellow."
        },
        {
          truths: ["Your brain uses about 20% of your body's energy", "Bones are stronger than steel by weight", "Humans share ~60% of DNA with bananas"],
          lie: "Humans only use 10% of their brains",
          why: "The 10% myth is false — we use virtually all of our brain."
        },
        {
          truths: ["The first computer bug was a real moth", "The QWERTY layout was designed for telegraphs", "The first webcam watched a coffee pot"],
          lie: "The internet was invented in 1990",
          why: "ARPANET's first message was sent in 1969 — the web (1990) is just one layer."
        },
        {
          truths: ["Scotland's national animal is the unicorn", "Vikings never wore horned helmets", "Oxford University is older than the Aztec Empire"],
          lie: "Napoleon was unusually short",
          why: "Napoleon was about 1.69m — average for his era; British propaganda invented the myth."
        },
        {
          truths: ["Hot water can freeze faster than cold water", "Lightning strikes the Earth ~100 times per second", "A bolt of lightning is 5x hotter than the Sun's surface"],
          lie: "Lightning never strikes the same place twice",
          why: "The Empire State Building is struck about 25 times a year."
        },
        {
          truths: ["Cows have best friends", "Rats laugh when tickled", "Elephants can't jump"],
          lie: "Goldfish have a 3-second memory",
          why: "Goldfish remember things for months — the 3-second myth is彻底 wrong."
        },
        {
          truths: ["The inventor of the Pringles can is buried in one", "A cloud can weigh over a million pounds", "There's a 3D-printed wrench on the ISS"],
          lie: "Bubble wrap was invented for packaging",
          why: "Bubble wrap was originally invented as textured wallpaper!"
        },
      ];
      let item, order, score, best, round, streak;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="tt-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="tt-round">1/8</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="tt-best">0</div></div>
        </div>
        <div class="status info" id="tt-status">Two are true — one is a lie. Bust the lie!</div>
        <div class="center" id="tt-opts" style="max-width:440px;"></div>
        <div id="tt-why" style="text-align:center;min-height:44px;margin-top:8px;font-size:14px;color:var(--text-muted,#94a3b8);"></div>
      `;

      const optsEl = root.querySelector("#tt-opts");
      const statusEl = root.querySelector("#tt-status");
      const whyEl = root.querySelector("#tt-why");
      best = Storage.getBest("twotruths") || 0;
      round = 1;
      score = 0;
      streak = 0;

      function next() {
        item = SETS[Math.floor(Math.random() * SETS.length)];
        order = [{t: item.truths[0], lie: false}, {t: item.truths[1], lie: false}, {t: item.lie, lie: true}]
          .sort(() => Math.random() - 0.5);
        whyEl.textContent = "";
        statusEl.textContent = `Round ${round}: two truths and a lie`;
        statusEl.className = "status info";
        render();
      }

      function pick(i) {
        const els = optsEl.querySelectorAll(".tt-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        if (order[i].lie) {
          streak++;
          const pts = 20 + streak * 5;
          score += pts;
          AudioFX.win();
          els[i].classList.add("right");
          statusEl.textContent = `🤥 Busted! +${pts} (streak ×${streak})`;
          statusEl.className = "status win";
        } else {
          streak = 0;
          score = Math.max(0, score - 5);
          AudioFX.error();
          els[i].classList.add("wrong");
          const li = order.findIndex(o => o.lie);
          els[li].classList.add("right");
          statusEl.textContent = "That one was TRUE…";
          statusEl.className = "status lose";
        }
        whyEl.textContent = "💡 " + item.why;
        round++;
        if (round > 8) {
          if (score > best) {
            best = score;
            Storage.setBest("twotruths", score);
          }
          statusEl.textContent = `Game over — ${score} points! Restarting…`;
          statusEl.className = "status " + (score >= 120 ? "win" : "info");
          after(() => {
            round = 1;
            score = 0;
            streak = 0;
            next();
          }, 3200);
        } else {
          after(next, 2600);
        }
        updateHud();
      }

      function updateHud() {
        root.querySelector("#tt-score").textContent = score;
        root.querySelector("#tt-round").textContent = Math.min(round, 8) + "/8";
        root.querySelector("#tt-best").textContent = best;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        order.forEach((o, i) => {
          const b = document.createElement("div");
          b.className = "tt-opt";
          b.style.cssText = "display:block;width:min(420px,94%);padding:12px;margin:6px auto;border-radius:10px;background:var(--bg-soft,#334155);color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;";
          b.textContent = o.t;
          b.addEventListener("pointerdown", () => pick(i));
          optsEl.appendChild(b);
        });
      }

      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Two Truths",
        `Each round presents three fascinating statements — <b>two are true</b> (we promise) and <b>one is a lie</b>
        (usually a famous myth or misconception).
        <br><br>Click the statement you believe is FALSE. <b>+20 +5×streak</b> for busting the lie; −5 for false accusations.
        The explanation reveals the real story either way. Eight rounds of reality-checking.`);
    },
  });
})();
