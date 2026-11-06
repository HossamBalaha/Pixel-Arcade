/* War — card game. Each player flips top card; higher wins both. Ties trigger war. vs AI. */
(function () {
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const SUITS = ["♠", "♥", "♦", "♣"];

  function rankVal(r) {
    return RANKS.indexOf(r);
  }

  function newDeck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push({r, s});
    return d.sort(() => Math.random() - 0.5);
  }

  let live = null;
  GameRegistry.register({
    id: "war",
    name: "War",
    icon: "🃏",
    category: "strategy",
    description: "Classic card game. Higher card wins. Ties trigger war!",
    tags: ["cards", "classic", "ai"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let you = [], ai = [], over = false, busy = false, round = 0;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="wr-round">0</div></div>
          <div class="score-cell"><div class="label">You</div><div class="val" id="wr-you">26</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="wr-ai">26</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="wr-wins">0</div></div>
        </div>
        <div class="status info" id="wr-status">Press Flip to draw cards.</div>
        <div class="center" style="margin:14px 0;">
          <div class="row" style="gap:32px;align-items:center;">
            <div class="col" style="align-items:center;gap:4px;"><div class="text-sm text-muted">You</div><div id="wr-youcard" class="wr-card back">?</div></div>
            <div id="wr-vs" style="font-size:1.4rem;color:var(--text-muted);">vs</div>
            <div class="col" style="align-items:center;gap:4px;"><div class="text-sm text-muted">AI</div><div id="wr-aicard" class="wr-card back">?</div></div>
          </div>
        </div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn primary" id="wr-flip">Flip</button>
          <button class="btn" id="wr-restart">Restart</button>
        </div>
        <p class="hint">Press Flip (or Space). On tie, each plays 3 face-down + 1 face-up — winner takes all 10.</p>
      `;
      const statusEl = root.querySelector("#wr-status");
      const youCard = root.querySelector("#wr-youcard");
      const aiCard = root.querySelector("#wr-aicard");
      if (!document.getElementById("wr-style")) {
        const s = document.createElement("style");
        s.id = "wr-style";
        s.textContent = `.wr-card{width:64px;height:90px;border-radius:8px;background:var(--bg-elev);border:2px solid var(--border);display:grid;place-items:center;font-size:1.5rem;font-family:var(--font-mono);font-weight:700;color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,0.2);}.wr-card.back{background:var(--accent);color:#fff;border-color:var(--accent);}.wr-card.red{color:var(--danger);}`;
        document.head.appendChild(s);
      }

      function showCard(el, card, faceUp) {
        if (!faceUp) {
          el.className = "wr-card back";
          el.textContent = "?";
          return;
        }
        el.className = "wr-card" + ((card.s === "♥" || card.s === "♦") ? " red" : "");
        el.textContent = card.r + card.s;
      }

      function updateScore() {
        root.querySelector("#wr-you").textContent = you.length;
        root.querySelector("#wr-ai").textContent = ai.length;
        root.querySelector("#wr-round").textContent = round;
      }

      function flip() {
        if (over || busy) return;
        if (you.length === 0 || ai.length === 0) return;
        busy = true;
        const yc = you.shift(), ac = ai.shift();
        showCard(youCard, yc, true);
        showCard(aiCard, ac, true);
        AudioFX.flip();
        round++;
        const pot = [yc, ac];

        function resolve() {
          const yv = rankVal(yc.r), av = rankVal(ac.r);
          if (yv > av) {
            you.push(...pot);
            statusEl.textContent = `You take it — ${yc.r} beats ${ac.r}!`;
            statusEl.className = "status win";
            AudioFX.win();
            busy = false;
            updateScore();
            checkEnd();
          } else if (av > yv) {
            ai.push(...pot);
            statusEl.textContent = `AI takes it — ${ac.r} beats ${yc.r}.`;
            statusEl.className = "status lose";
            AudioFX.lose();
            busy = false;
            updateScore();
            checkEnd();
          } else {
            // WAR
            statusEl.textContent = `⚔️ WAR! Both played ${yc.r}.`;
            statusEl.className = "status info";
            AudioFX.error();
            // 3 face-down + 1 face-up each
            const facedown = [];
            for (let i = 0; i < 3; i++) {
              if (you.length) facedown.push(you.shift());
              if (ai.length) facedown.push(ai.shift());
            }
            pot.push(...facedown);
            if (you.length === 0 || ai.length === 0) {
              // someone ran out
              you.push(...pot.filter(c => true)); // distribute fairly
              busy = false;
              checkEnd();
              return;
            }
            const ny = you.shift(), na = ai.shift();
            pot.push(ny, na);
            setTimeout(() => {
              if (!alive) return;
              if (!alive) return;
              showCard(youCard, ny, true);
              showCard(aiCard, na, true);
              AudioFX.flip();
              const yv2 = rankVal(ny.r), av2 = rankVal(na.r);
              if (yv2 > av2) {
                you.push(...pot);
                statusEl.textContent = `War won — ${ny.r} beats ${na.r}!`;
                statusEl.className = "status win";
                AudioFX.win();
              } else if (av2 > yv2) {
                ai.push(...pot);
                statusEl.textContent = `War lost — ${na.r} beats ${ny.r}.`;
                statusEl.className = "status lose";
                AudioFX.lose();
              } else {
                statusEl.textContent = `War tie again — split pot.`;
                you.push(...pot.splice(0, Math.ceil(pot.length / 2)));
                ai.push(...pot);
              }
              busy = false;
              updateScore();
              checkEnd();
            }, 800);
          }
        }

        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          resolve();
        }, 500);
      }

      function checkEnd() {
        if (you.length === 0) {
          over = true;
          statusEl.textContent = "AI wins the war!";
          statusEl.className = "status lose";
          AudioFX.lose();
        } else if (ai.length === 0) {
          over = true;
          statusEl.textContent = "🎉 You win the war!";
          statusEl.className = "status win";
          AudioFX.win();
          const w = (Storage.getBest("war") || 0) + 1;
          Storage.setBest("war", w);
          root.querySelector("#wr-wins").textContent = w;
          App.toast("You won!", "success");
        }
      }

      function newGame() {
        const d = newDeck();
        you = d.slice(0, 26);
        ai = d.slice(26);
        over = false;
        busy = false;
        round = 0;
        showCard(youCard, null, false);
        showCard(aiCard, null, false);
        statusEl.textContent = "Press Flip (or Space).";
        statusEl.className = "status info";
        root.querySelector("#wr-wins").textContent = Storage.getBest("war") || 0;
        updateScore();
      }

      root.querySelector("#wr-flip").addEventListener("click", flip);
      root.querySelector("#wr-restart").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function onKey(e) {
        if (e.key === " ") {
          e.preventDefault();
          flip();
        }
      }

      document.addEventListener("keydown", onKey);
      live = {newGame};
      newGame();
      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play War",
        `Each player flips the top card of their deck. The higher rank wins both cards.
        <br><br>If the ranks tie, it's <b>WAR</b>: each player puts 3 cards face down, then 1 face up. The higher face-up card wins all 10 cards (or recurse if another tie).
        <br><br>Win all 52 cards to win the game. <b>Space</b> or <b>Flip</b> button to draw.`);
    },
  });
})();
