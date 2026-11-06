/* Word Tower — stack words; each word must start with the last letter of the word below. */
(function () {
  const WORDS = ("apple bread chair dream eagle flute grape house image jewel knife lemon mango night ocean piano quiet river snake table under vine water xenon yacht zebra about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable cabin candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn scott sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer steve stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra").split(" ");
  const VALID = new Set(WORDS);

  let live = null;
  GameRegistry.register({
    id: "wordtower",
    name: "Word Tower",
    icon: "🗼",
    category: "word",
    description: "Stack words — each must start with the previous word's last letter",
    tags: ["word", "chain", "stacking"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let tower = [], last = "", over = false, timeLeft = 90, timer = null, score = 0;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Time</div><div class="val" id="wt-time">90</div></div>
          <div class="score-cell"><div class="label">Words</div><div class="val" id="wt-words">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wt-best">—</div></div>
        </div>
        <div class="status info" id="wt-status">Type a word, then chain words where each starts with the previous word's last letter.</div>
        <div id="wt-tower" class="col" style="gap:3px;max-width:280px;margin:14px auto;max-height:200px;overflow-y:auto;flex-direction:column-reverse;"></div>
        <div class="row" style="justify-content:center;gap:6px;">
          <input id="wt-input" placeholder="Type a word…" class="diff-btn" style="min-width:200px;text-transform:lowercase;" autocomplete="off" />
          <button class="btn primary" id="wt-go">Stack</button>
        </div>
        <p class="hint">Next word must start with: <b id="wt-next">anything</b>. 90 seconds. Each valid word = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#wt-status");
      const towerEl = root.querySelector("#wt-tower");
      const inputEl = root.querySelector("#wt-input");
      const nextEl = root.querySelector("#wt-next");
      root.querySelector("#wt-best").textContent = Storage.getBest("wordtower") || "—";

      function renderTower() {
        towerEl.innerHTML = "";
        tower.forEach((w, i) => {
          const row = document.createElement("div");
          row.style.cssText = "padding:6px 12px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);font-family:var(--font-mono);font-weight:700;text-align:center;";
          row.textContent = w.toUpperCase();
          if (i === tower.length - 1) {
            row.style.borderColor = "var(--accent)";
            row.style.background = "var(--bg-soft)";
          }
          towerEl.appendChild(row);
        });
        root.querySelector("#wt-words").textContent = tower.length;
        nextEl.textContent = last ? `letter "${last.toUpperCase()}"` : "anything";
      }

      function submit() {
        if (over) return;
        const v = inputEl.value.trim().toLowerCase();
        if (!v) return;
        if (!/^[a-z]+$/.test(v)) {
          AudioFX.error();
          statusEl.textContent = "Letters only";
          statusEl.className = "status lose";
          return;
        }
        if (v.length < 3) {
          AudioFX.error();
          statusEl.textContent = "Word too short (min 3 letters)";
          statusEl.className = "status lose";
          return;
        }
        if (last && v[0] !== last) {
          AudioFX.error();
          statusEl.textContent = `Must start with "${last.toUpperCase()}"!`;
          statusEl.className = "status lose";
          inputEl.value = "";
          return;
        }
        if (tower.includes(v)) {
          AudioFX.error();
          statusEl.textContent = "Already used!";
          statusEl.className = "status lose";
          inputEl.value = "";
          return;
        }
        if (!VALID.has(v)) {
          AudioFX.error();
          statusEl.textContent = `"${v.toUpperCase()}" isn't in our word list`;
          statusEl.className = "status lose";
          inputEl.value = "";
          return;
        }
        tower.push(v);
        last = v[v.length - 1];
        score += 10;
        AudioFX.place();
        statusEl.textContent = `✓ ${v.toUpperCase()} stacked! +10`;
        statusEl.className = "status win";
        inputEl.value = "";
        renderTower();
        later(() => {
          if (alive && !over) {
            statusEl.textContent = "Next word starts with: " + last.toUpperCase();
            statusEl.className = "status info";
          }
        }, 900);
      }

      function end() {
        over = true;
        clearInterval(timer);
        timer = null;
        statusEl.textContent = `⏰ Time! ${tower.length} words, score ${score}.`;
        statusEl.className = "status win";
        AudioFX.win();
        const best = Storage.getBest("wordtower");
        if (!best || score > best) {
          Storage.setBest("wordtower", score);
          root.querySelector("#wt-best").textContent = score;
          App.toast("New best: " + score, "success");
        }
      }

      function start() {
        tower = [];
        last = "";
        score = 0;
        timeLeft = 90;
        over = false;
        root.querySelector("#wt-time").textContent = 90;
        statusEl.textContent = "Type your first word to begin!";
        statusEl.className = "status info";
        renderTower();
        clearInterval(timer);
        timer = setInterval(() => {
          if (!alive) return;
          if (!alive) return;
          if (!alive || over) return;
          timeLeft--;
          root.querySelector("#wt-time").textContent = timeLeft;
          if (timeLeft <= 10 && timeLeft > 0) AudioFX.tick();
          if (timeLeft <= 0) end();
        }, 1000);
        inputEl.focus();
      }

      root.querySelector("#wt-go").addEventListener("click", submit);
      inputEl.addEventListener("keydown", e => {
        if (e.key === "Enter") submit();
      });

      live = {};
      start();
      return function cleanup() {
        alive = false;
        live = null;
        clearInterval(timer);
        pendingTimers.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Word Tower",
        `Build a tower of words! Each word must <b>start with the last letter</b> of the word below it.
        <br><br>Example: <b>apple → eagle → elephant → tiger → rabbit → …</b>
        <br><br>Rules: minimum 3 letters, only English letters, no repeats, word must be in our list.
        <br>90 seconds. Each valid word = <b>10 points</b>.`);
    },
  });
})();
