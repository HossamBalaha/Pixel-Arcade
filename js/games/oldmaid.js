/* Old Maid — pair off your cards and pass the queen to the AI */
(function () {
  GameRegistry.register({
    id: "oldmaid",
    name: "Old Maid",
    icon: "👰",
    category: "strategy",
    description: "Pair off your cards and pass the queen to the AI",
    tags: ["strategy", "cards", "classic"],
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
      let you, ai, turn, won, wins, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="om-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="om-best">0</div></div>
          <div class="score-cell"><div class="label">Your cards</div><div class="val" id="om-you">0</div></div>
        </div>
        <div class="status info" id="om-status">Discard pairs automatically — then pick from the AI's hand</div>
        <div class="center" id="om-hand"></div>
        <div class="center" id="om-ai" style="margin:10px 0;"></div>
        <p class="hint">One Queen was removed from the deck. Whoever holds her at the end is the Old Maid!</p>
      `;

      const handEl = root.querySelector("#om-hand");
      const aiEl = root.querySelector("#om-ai");
      const statusEl = root.querySelector("#om-status");
      best = Storage.getBest("oldmaid") || 0;
      wins = 0;

      function deal() {
        const deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        // remove one queen
        const qi = deck.findIndex(c => c.r === "Q" && c.s === "♠");
        deck.splice(qi, 1);
        deck.sort(() => Math.random() - 0.5);
        you = deck.splice(0, 25);
        ai = deck.splice(0, 26);
        turn = "you";
        won = null;
        autoPair();
        render();
      }

      function autoPair() {
        const pair = (hand) => {
          let removed = false;
          const byRank = {};
          hand.forEach(c => (byRank[c.r] = byRank[c.r] || []).push(c));
          const out = [];
          for (const r in byRank) {
            const group = byRank[r];
            while (group.length >= 2) {
              group.splice(0, 2);
              removed = true;
            }
            out.push(...group);
          }
          return {hand: out, removed};
        };
        let r1 = pair(you);
        you = r1.hand;
        let r2 = pair(ai);
        ai = r2.hand;
        if (r1.removed || r2.removed) AudioFX.pop();
        checkEnd();
      }

      function checkEnd() {
        if (you.length === 0 || ai.length === 0) {
          won = you.length === 0 ? "you" : "ai";
          if (won === "you") {
            wins++;
            AudioFX.win();
            if (wins > best) {
              best = wins;
              Storage.setBest("oldmaid", wins);
            }
          } else AudioFX.lose();
          statusEl.textContent = won === "you" ?
            "👰 The AI is stuck with the Old Maid — you escape!" :
            "💀 You're holding the Old Maid… better luck next time.";
          statusEl.className = "status " + (won === "you" ? "win" : "lose");
        }
      }

      function takeFromAI(i) {
        if (won || turn !== "you") return;
        const c = ai.splice(i, 1)[0];
        you.push(c);
        AudioFX.click();
        autoPair();
        render();
        if (won) return;
        turn = "ai";
        after(aiTake, 1100);
      }

      function aiTake() {
        if (won) return;
        // AI picks a random-ish card from your hand with slight suspicion of your newest card
        const i = Math.floor(Math.random() * you.length);
        const c = you.splice(i, 1)[0];
        ai.push(c);
        AudioFX.click();
        autoPair();
        render();
        if (won) return;
        statusEl.textContent = `🤖 The AI drew one of your cards… your move.`;
        statusEl.className = "status info";
        turn = "you";
      }

      function render() {
        root.querySelector("#om-wins").textContent = wins;
        root.querySelector("#om-best").textContent = best;
        root.querySelector("#om-you").textContent = you.length;
        handEl.innerHTML = "";
        you.slice().sort((a, b) => RANKS.indexOf(a.r) - RANKS.indexOf(b.r)).forEach(c => {
          const el = document.createElement("div");
          el.style.cssText = `display:inline-block;width:42px;height:60px;margin:3px;border-radius:7px;
            background:#f8fafc;color:${c.s === "♥" || c.s === "♦" ? "#dc2626" : "#0f172a"};
            font-weight:800;font-size:14px;text-align:center;padding-top:6px;${c.r === "Q" ? "border:2px solid #ec4899;box-shadow:0 0 8px rgba(236,72,153,0.5);" : "border:2px solid #cbd5e1;"}`;
          el.innerHTML = `${c.r}<br>${c.s}`;
          handEl.appendChild(el);
        });
        aiEl.innerHTML = "";
        if (turn === "you" && !won) {
          statusEl.textContent = "Pick a mystery card from the AI's hand 👇";
          ai.forEach((c, i) => {
            const el = document.createElement("div");
            el.style.cssText = `display:inline-block;width:42px;height:60px;margin:3px;border-radius:7px;
              background:#1e3a8a;color:#93c5fd;font-size:20px;text-align:center;padding-top:14px;cursor:pointer;
              border:2px solid #3b82f6;`;
            el.textContent = "🂠";
            el.addEventListener("pointerdown", () => takeFromAI(i));
            aiEl.appendChild(el);
          });
        } else if (!won) {
          ai.forEach(() => {
            const el = document.createElement("div");
            el.style.cssText = `display:inline-block;width:42px;height:60px;margin:3px;border-radius:7px;
              background:#1e3a8a;color:#93c5fd;font-size:20px;text-align:center;padding-top:14px;opacity:0.6;border:2px solid #3b82f6;`;
            el.textContent = "🂠";
            aiEl.appendChild(el);
          });
        }
        if (won) {
          aiEl.insertAdjacentHTML("beforeend", `<button class="btn btn-sm primary" id="om-again" style="margin-left:12px;">↻ Play again</button>`);
          aiEl.querySelector("#om-again").addEventListener("click", deal);
        }
      }

      deal();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Old Maid",
        `All pairs are stripped from the deal automatically. One <b>Queen is missing</b> from the deck —
        meaning her surviving sister can never be paired.
        <br><br>Players alternate drawing a <b>random card</b> from the other's hand (click a face-down card).
        Any pairs you form are discarded instantly. Empty your hand and you're safe —
        whoever ends up holding the unmatchable 👰 Queen is the <b>Old Maid</b>.`);
    },
  });
})();
