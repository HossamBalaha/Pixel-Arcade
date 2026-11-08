/* Speed — shed your cards faster than the AI */
(function () {
  GameRegistry.register({
    id: "speedcards",
    name: "Speed",
    icon: "⚡",
    category: "strategy",
    description: "Shed your cards faster than the AI — first empty hand wins",
    tags: ["strategy", "cards", "speed"],
    mount: function (root, {App, AudioFX, Storage}) {
      const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
      const SUITS = ["♠", "♥", "♦", "♣"];
      let deck, you, ai, piles, won, wins, best, aiTimer;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="sp-wins">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sp-best">0</div></div>
          <div class="score-cell"><div class="label">You</div><div class="val" id="sp-you">5</div></div>
          <div class="score-cell"><div class="label">AI</div><div class="val" id="sp-ai">5</div></div>
        </div>
        <div class="status info" id="sp-status">Play a card ±1 rank from either center pile. No thinking time!</div>
        <div class="center" id="sp-board"></div>
        <div class="center" id="sp-hand"></div>
        <div class="row gap-2" style="justify-content:center;margin-top:6px;">
          <button class="btn btn-sm" id="sp-flip">⚡ Flip new centers</button>
        </div>
        <p class="hint">Both stuck? Flip two new center cards from the reserves. Aces wrap: A ↔ K.</p>
      `;

      const boardEl = root.querySelector("#sp-board");
      const handEl = root.querySelector("#sp-hand");
      const statusEl = root.querySelector("#sp-status");
      best = Storage.getBest("speedcards") || 0;
      wins = 0;

      function deal() {
        deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        deck.sort(() => Math.random() - 0.5);
        you = deck.splice(0, 5);
        ai = deck.splice(0, 5);
        piles = [deck.pop(), deck.pop()];
        won = null;
        render();
        scheduleAI();
      }

      function adjRank(a, b) {
        const ia = RANKS.indexOf(a), ib = RANKS.indexOf(b);
        const d = Math.abs(ia - ib);
        return d === 1 || d === 12; // A-K wrap
      }

      function playableOn(c) {
        return piles.some(p => adjRank(c.r, p.r));
      }

      function playCard(c) {
        if (won) return;
        const pi = piles.findIndex(p => adjRank(c.r, p.r));
        if (pi < 0) {
          AudioFX.error();
          return;
        }
        you = you.filter(x => x !== c);
        piles[pi] = c;
        AudioFX.pop();
        if (refill()) return;
        if (you.length === 0) return doWin("you");
        render();
      }

      function refill() {
        // draw up to 5 from deck (shared stock: player takes from front, ai from back)
        while (you.length < 5 && deck.length) you.push(deck.shift());
        while (ai.length < 5 && deck.length) ai.push(deck.pop());
        return false;
      }

      function doWin(w) {
        won = w;
        clearInterval(aiTimer);
        if (w === "you") {
          wins++;
          AudioFX.win();
          if (wins > best) {
            best = wins;
            Storage.setBest("speedcards", wins);
          }
        } else AudioFX.lose();
        statusEl.textContent = w === "you" ? "⚡ You shed everything — lightning win!" : "The AI emptied its hand first…";
        statusEl.className = "status " + (w === "you" ? "win" : "lose");
        render();
      }

      function scheduleAI() {
        clearInterval(aiTimer);
        aiTimer = setInterval(() => {
          if (won) return clearInterval(aiTimer);
          // can either side move?
          const youCan = you.some(playableOn);
          const aiCan = ai.some(playableOn);
          if (!youCan && !aiCan) return; // wait for flip
          if (aiCan && Math.random() < 0.75) {
            const c = ai.find(playableOn);
            const pi = piles.findIndex(p => adjRank(c.r, p.r));
            ai = ai.filter(x => x !== c);
            piles[pi] = c;
            AudioFX.click();
            refill();
            if (ai.length === 0) return doWin("ai");
            render();
          }
        }, 900);
      }

      function flip() {
        if (won || !deck.length) {
          AudioFX.error();
          return;
        }
        piles = [deck.pop(), deck.pop()];
        AudioFX.click();
        render();
      }

      function render() {
        root.querySelector("#sp-wins").textContent = wins;
        root.querySelector("#sp-best").textContent = best;
        root.querySelector("#sp-you").textContent = you.length;
        root.querySelector("#sp-ai").textContent = ai.length;
        boardEl.innerHTML = `
          <div style="display:inline-block;min-width:120px;padding:8px 12px;border-radius:10px;background:var(--bg-soft,#334155);">
            🤖 AI: ${"🂠 ".repeat(Math.min(ai.length, 5))} (${ai.length})
          </div>
          <div style="display:inline-flex;gap:14px;margin:10px 0;">
            ${piles.map(p => `
              <div style="width:50px;height:70px;border-radius:8px;background:#f8fafc;color:${p.s === "♥" || p.s === "♦" ? "#dc2626" : "#0f172a"};
                font-weight:800;font-size:16px;text-align:center;padding-top:9px;border:2px solid #64748b;">${p.r}<br>${p.s}</div>
            `).join("")}
          </div>
          <div style="font-size:12px;color:var(--text-muted,#94a3b8);">stock: ${deck.length} · centers flip when both stuck</div>
        `;
        handEl.innerHTML = "";
        you.forEach(c => {
          const can = playableOn(c);
          const el = document.createElement("div");
          el.style.cssText = `display:inline-block;width:46px;height:64px;margin:3px;border-radius:7px;
            background:#f8fafc;color:${c.s === "♥" || c.s === "♦" ? "#dc2626" : "#0f172a"};
            font-weight:800;font-size:15px;text-align:center;padding-top:6px;cursor:pointer;
            border:2px solid ${can ? "#16a34a" : "#cbd5e1"};${can ? "" : "opacity:0.6;"}`;
          el.innerHTML = `${c.r}<br>${c.s}`;
          el.addEventListener("pointerdown", () => playCard(c));
          handEl.appendChild(el);
        });
        if (won) {
          handEl.insertAdjacentHTML("beforeend", `<button class="btn btn-sm primary" id="sp-again" style="margin-left:12px;">↻ Rematch</button>`);
          handEl.querySelector("#sp-again").addEventListener("click", deal);
        }
      }

      root.querySelector("#sp-flip").addEventListener("click", flip);
      deal();
      return function cleanup() {
        clearInterval(aiTimer);
      };
    },
    help: function () {
      App.showModal("How to play Speed",
        `Real-time card duel! You hold up to five cards; two center piles are face up.
        <br><br>Play any card that is <b>exactly one rank above or below</b> a center card (suits don't matter; A wraps to K).
        The center pile becomes your card — opportunities shift constantly.
        <br><br>If <b>both players are stuck</b>, press <b>⚡ Flip</b> to replace the centers from the stock.
        The AI plays on a timer, so move fast — first empty hand wins.`);
    },
  });
})();
