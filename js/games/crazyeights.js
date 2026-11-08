/* Crazy Eights — shed your cards by matching rank or suit */
(function () {
  GameRegistry.register({
    id: "crazyeights",
    name: "Crazy Eights",
    icon: "8️⃣",
    category: "strategy",
    description: "Shed your cards by matching rank or suit",
    tags: ["strategy", "cards", "shedding"],
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
      const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const SUITS = ["♠", "♥", "♦", "♣"];
      let deck, you, ai, discard, suit, turn, won, wins, best, msg;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="ce-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="ce-best">0</div></div>
          <div class="score-cell"><div class="label">AI hand</div><div class="val" id="ce-ai">7</div></div>
        </div>
        <div class="status info" id="ce-status">Match the top card's rank or suit — 8s are wild!</div>
        <div class="center" id="ce-table" style="margin:8px 0;"></div>
        <div class="center" id="ce-hand"></div>
        <div class="row gap-2" id="ce-suits" style="justify-content:center;margin-top:6px;"></div>
        <p class="hint">Playing an 8 lets you name the next suit. First empty hand wins!</p>
      `;

      const tableEl = root.querySelector("#ce-table");
      const handEl = root.querySelector("#ce-hand");
      const suitsEl = root.querySelector("#ce-suits");
      const statusEl = root.querySelector("#ce-status");
      best = Storage.getBest("crazyeights") || 0;
      wins = 0;

      function deal() {
        deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        deck.sort(() => Math.random() - 0.5);
        you = deck.splice(0, 7);
        ai = deck.splice(0, 7);
        discard = [deck.pop()];
        suit = discard[0].s;
        turn = "you";
        won = null;
        render();
      }

      function playable(c) {
        return c.r === "8" || c.r === discard[0].r || c.s === suit;
      }

      function playCard(c) {
        if (won || turn !== "you") return;
        if (!playable(c)) {
          AudioFX.error();
          return;
        }
        you = you.filter(x => x !== c);
        discard.push(c);
        AudioFX.pop();
        if (c.r === "8") {
          // choose suit
          statusEl.textContent = "You played an 8 — choose the next suit!";
          statusEl.className = "status info";
          render();
          chooseSuit();
          return;
        }
        suit = c.s;
        afterMove("you");
      }

      function chooseSuit() {
        suitsEl.innerHTML = "";
        SUITS.forEach(s => {
          const b = document.createElement("button");
          b.className = "btn btn-sm";
          b.textContent = s;
          b.addEventListener("click", () => {
            suit = s;
            suitsEl.innerHTML = "";
            AudioFX.click();
            afterMove("you");
          });
          suitsEl.appendChild(b);
        });
      }

      function afterMove(side) {
        if (side === "you" && you.length === 0) return doWin("you");
        if (side === "ai" && ai.length === 0) return doWin("ai");
        render();
        if (side === "you") {
          turn = "ai";
          after(aiTurn, 1000);
        } else {
          turn = "you";
        }
      }

      function doWin(w) {
        won = w;
        if (w === "you") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("crazyeights", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "you" ? "8️⃣ You shed everything — win!" : "The AI went out first…";
        statusEl.className = "status " + (w === "you" ? "win" : "lose");
        render();
      }

      function drawCard() {
        if (won || turn !== "you") return;
        if (!deck.length) {
          // reshuffle discard except top
          const top = discard.pop();
          deck = discard.splice(0).sort(() => Math.random() - 0.5);
          discard = [top];
          if (!deck.length) {
            statusEl.textContent = "Deck exhausted — pass.";
            turn = "ai";
            render();
            after(aiTurn, 900);
            return;
          }
        }
        you.push(deck.pop());
        AudioFX.click();
        turn = "ai";
        render();
        after(aiTurn, 1000);
      }

      function aiTurn() {
        if (won) return;
        const playableCards = ai.filter(playable);
        if (playableCards.length) {
          // prefer 8 last, prefer matching rank
          playableCards.sort((a, b) => (a.r === "8" ? 1 : 0) - (b.r === "8" ? 1 : 0));
          const c = playableCards[0];
          ai = ai.filter(x => x !== c);
          discard.push(c);
          AudioFX.pop();
          if (c.r === "8") {
            // pick suit it holds most of
            const counts = {};
            ai.forEach(x => counts[x.s] = (counts[x.s] || 0) + 1);
            suit = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
            statusEl.textContent = "🤖 AI played an 8 and named " + suit;
          } else {
            suit = c.s;
            statusEl.textContent = `🤖 AI played ${c.r}${c.s}`;
          }
          statusEl.className = "status info";
          afterMove("ai");
        } else {
          if (deck.length) {
            ai.push(deck.pop());
            statusEl.textContent = "🤖 AI draws a card…";
            statusEl.className = "status info";
          }
          // try again once
          if (ai.some(playable)) after(aiTurn, 800);
          else {
            statusEl.textContent = "🤖 AI passes — your turn.";
            turn = "you";
            render();
          }
        }
      }

      function render() {
        root.querySelector("#ce-wins").textContent = wins;
        root.querySelector("#ce-best").textContent = best;
        root.querySelector("#ce-ai").textContent = ai.length;
        // table: deck + discard
        tableEl.innerHTML = `
          <div style="display:inline-block;width:48px;height:68px;border-radius:7px;background:#1e3a8a;color:#93c5fd;
                      font-size:24px;line-height:68px;margin:4px;cursor:pointer;border:2px solid #3b82f6;" id="ce-deck" title="Draw">🂠</div>
          <div style="display:inline-block;width:48px;height:68px;border-radius:7px;background:#f8fafc;color:${discard[0].s === "♥" || discard[0].s === "♦" ? "#dc2626" : "#0f172a"};
                      font-weight:800;font-size:15px;text-align:center;padding-top:8px;margin:4px;">${discard[0].r}<br>${discard[0].s}</div>
          <div style="display:inline-block;margin-left:12px;font-size:14px;">Current suit: <b style="font-size:20px;">${suit}</b></div>
        `;
        tableEl.querySelector("#ce-deck").addEventListener("pointerdown", drawCard);
        // hand
        handEl.innerHTML = "";
        you.forEach(c => {
          const el = document.createElement("div");
          const can = playable(c) && turn === "you";
          el.style.cssText = `display:inline-block;width:46px;height:64px;margin:3px;border-radius:7px;
            background:#f8fafc;color:${c.s === "♥" || c.s === "♦" ? "#dc2626" : "#0f172a"};
            font-weight:800;font-size:15px;text-align:center;padding-top:6px;cursor:pointer;
            border:2px solid ${can ? "#16a34a" : "#cbd5e1"};${can ? "" : "opacity:0.6;"}`;
          el.innerHTML = `${c.r}<br>${c.s}`;
          el.addEventListener("pointerdown", () => playCard(c));
          handEl.appendChild(el);
        });
      }

      deal();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Crazy Eights",
        `Uno's grandfather! Shed your hand by playing a card that matches the top of the discard pile's
        <b>rank</b> or the <b>current suit</b>.
        <br><br>• <b>8s are wild</b> — play one on anything and name the next suit.
        <br>• No move? Click the blue deck to <b>draw</b>.
        <br>First player with an empty hand wins. The deck reshuffles automatically if it runs dry.`);
    },
  });
})();
