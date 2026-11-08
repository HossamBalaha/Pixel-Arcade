/* Mad Libs — fill in nouns, verbs and adjectives for a silly story */
(function () {
  GameRegistry.register({
    id: "madlibs",
    name: "Mad Libs",
    icon: "🎭",
    category: "word",
    description: "Fill in nouns, verbs and adjectives for a silly story",
    tags: ["word", "grammar", "fun"],
    mount: function (root, {App, AudioFX, Storage}) {
      const TEMPLATES = [
        {
          title: "The Dragon's Day Off",
          parts: ["ADJECTIVE", "NOUN", "VERB (PAST)", "ADJECTIVE", "NOUN", "VERB", "ADVERB"],
          text: (p) => `Once upon a time, a <b>${p[0]}</b> dragon decided to take a day off from guarding its <b>${p[1]}</b>.
It <b>${p[2]}</b> over to the village, where everyone was wearing <b>${p[3]}</b> hats.
The baker offered the dragon a <b>${p[4]}</b>, so it decided to <b>${p[5]}</b> <b>${p[6]}</b> all afternoon.
What a wonderful day!`
        },
        {
          title: "Space Adventure",
          parts: ["ADJECTIVE", "PLANET", "ALIEN NAME", "FOOD", "VERB", "ADJECTIVE", "NOUN"],
          text: (p) => `Captain Zoe piloted her <b>${p[0]}</b> rocket toward the planet <b>${p[1]}</b>.
There she met an alien named <b>${p[2]}</b> who offered her a plate of steaming <b>${p[3]}</b>.
They decided to <b>${p[4]}</b> together, which turned out to be <b>${p[5]}</b>.
By evening, Zoe had made a lifelong friend and acquired a souvenir <b>${p[6]}</b>.`
        },
        {
          title: "The World's Worst Recipe",
          parts: ["FOOD", "ADJECTIVE", "NUMBER", "NOUN", "ADJECTIVE", "VERB (PAST)", "BODY PART"],
          text: (p) => `To make the perfect <b>${p[0]}</b>, you will need <b>${p[1]}</b> ingredients and <b>${p[2]}</b> <b>${p[3]}</b>.
Mix everything until it becomes <b>${p[4]}</b>, then <b>${p[5]}</b> it gently with your <b>${p[6]}</b>.
Serve to guests you never want to see again.`
        },
        {
          title: "Sports Commentary",
          parts: ["ATHLETE NAME", "ADJECTIVE", "SPORT", "NUMBER", "ADJECTIVE", "NOUN", "ADVERB"],
          text: (p) => `<b>${p[0]}</b> stormed onto the <b>${p[1]}</b> field today ready for <b>${p[2]}</b>.
In the first minute, they scored <b>${p[3]}</b> points — a <b>${p[4]}</b> record!
The crowd threw <b>${p[5]}</b> onto the pitch while the commentators screamed <b>${p[6]}</b>.
Unforgettable.`
        },
      ];
      let tpl, values, madeN, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Stories</div><div class="val" id="ml-count">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ml-best">0</div></div>
        </div>
        <div class="status info" id="ml-status">Fill in the blanks — the sillier, the better</div>
        <div class="center" id="ml-body"></div>
        <p class="hint">Your words drop straight into the story. There are no wrong answers, only disturbing ones.</p>
      `;

      const bodyEl = root.querySelector("#ml-body");
      const statusEl = root.querySelector("#ml-status");
      best = Storage.getBest("madlibs") || 0;
      madeN = 0;

      function generate() {
        tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
        values = tpl.parts.map(() => "");
        statusEl.textContent = `“${tpl.title}” — fill in the blanks!`;
        statusEl.className = "status info";
        render();
      }

      function render() {
        root.querySelector("#ml-count").textContent = madeN;
        root.querySelector("#ml-best").textContent = best;
        let html = `<div style="max-width:440px;margin:0 auto;">`;
        tpl.parts.forEach((p, i) => {
          html += `<div style="display:flex;gap:8px;align-items:center;margin:7px 0;">
            <div style="min-width:130px;text-align:right;font-weight:700;font-size:13px;color:var(--text-muted,#94a3b8);">${p}:</div>
            <input class="ml-in" data-i="${i}" maxlength="22" style="flex:1;padding:9px 12px;border-radius:8px;border:2px solid var(--bg-inset,#1f2937);background:var(--bg-soft,#334155);color:var(--text,#eee);" autocomplete="off"/>
          </div>`;
        });
        html += `<div class="row gap-2" style="justify-content:center;margin-top:12px;">
          <button class="btn primary" id="ml-go">🎭 Make my story!</button>
        </div></div>`;
        bodyEl.innerHTML = html;
        bodyEl.querySelectorAll(".ml-in").forEach(inp => {
          inp.addEventListener("input", () => {
            values[+inp.dataset.i] = inp.value.trim();
          });
        });
        bodyEl.querySelector("#ml-go").addEventListener("click", build);
      }

      function build() {
        if (values.some(v => !v)) {
          AudioFX.error();
          statusEl.textContent = "Fill every blank first — imagination has no shortcuts!";
          statusEl.className = "status lose";
          return;
        }
        madeN++;
        AudioFX.win();
        if (madeN > best) {
          best = madeN;
          Storage.setBest("madlibs", best);
        }
        root.querySelector("#ml-count").textContent = madeN;
        root.querySelector("#ml-best").textContent = best;
        const story = tpl.text(values);
        bodyEl.innerHTML = `
          <div style="max-width:480px;margin:0 auto;padding:18px;border-radius:14px;background:var(--bg-soft,#334155);font-size:16px;line-height:1.8;text-align:left;">
            <h3 style="margin-top:0;text-align:center;">${tpl.title}</h3>
            <div>${story}</div>
          </div>
          <div class="row gap-2" style="justify-content:center;margin-top:12px;">
            <button class="btn" id="ml-copy">📋 Copy</button>
            <button class="btn primary" id="ml-again">🎭 Another one!</button>
          </div>`;
        statusEl.textContent = "🎭 Masterpiece complete!";
        statusEl.className = "status win";
        bodyEl.querySelector("#ml-again").addEventListener("click", generate);
        bodyEl.querySelector("#ml-copy").addEventListener("click", () => {
          const tmp = bodyEl.querySelector("h3").nextElementSibling;
          navigator.clipboard && navigator.clipboard.writeText(tmp.innerText).then(() => App.toast("Story copied!", "success"));
        });
      }

      generate();
      return function cleanup() {
      };
    },
    help: function () {
      App.showModal("How to play Mad Libs",
        `Type a word for each part of speech — noun, verb, adjective, adverb… get creative!
        Then hit <b>🎭 Make my story!</b> and your words are woven into a tale you definitely didn't expect.
        <br><br>Remix the same template with different words for wildly different results.
        Four story machines included; your creations are copyable for maximum embarrassment.`);
    },
  });
})();
