/* Go Fish — collect four of a kind against the AI */
(function () {
  GameRegistry.register({
    id: "gofish",
    name: "Go Fish",
    icon: "🐟",
    category: "strategy",
    description: "Ask the AI for ranks and collect four of a kind",
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
      let you, ai, pond, turn, books, msg, won, wins, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Your books</div><div class="val" id="gf-yb">0</div></div>
          <div class="score-cell"><div class="label">AI books</div><div class="val" id="gf-ab">0</div></div>
          <div class="score-cell"><div class="label">Wins</div><div class="val" id="gf-wins">0</div></div>
        </div>
        <div class="status info" id="gf-status">Ask the AI for a rank you already hold</div>
        <div class="center" id="gf-hand" style="min-height:110px;"></div>
        <div class="center" style="margin:8px 0;">
          <span style="opacity:0.85;">🤖 AI: <b id="gf-aih">7</b> cards · 🌊 Pond: <b id="gf-pond">0</b></span>
        </div>
        <p class="hint">Four of a kind = a book. Most books when the cards run out wins!</p>
      `;

      const handEl = root.querySelector("#gf-hand");
      const statusEl = root.querySelector("#gf-status");
      best = Storage.getBest("gofish") || 0;
      wins = 0;

      function deal() {
        const deck = [];
        RANKS.forEach(r => SUITS.forEach(s => deck.push({r, s})));
        deck.sort(() => Math.random() - 0.5);
        you = deck.splice(0, 7);
        ai = deck.splice(0, 7);
        pond = deck;
        books = {you: [], ai: []};
        turn = "you";
        won = null;
        settle("deal");
        render();
        statusEl.textContent = "Ask the AI for a rank you already hold";
        statusEl.className = "status info";
      }

      function settle() {
        // move 4-of-kinds into books
        for (const side of ["you", "ai"]) {
          const hand = side === "you" ? you : ai;
          const byRank = {};
          hand.forEach(c => (byRank[c.r] = byRank[c.r] || []).push(c));
          for (const r in byRank) {
            if (byRank[r].length === 4) {
              books[side].push(r);
              const set = new Set(byRank[r]);
              if (side === "you") you = you.filter(c => !set.has(c));
              else ai = ai.filter(c => !set.has(c));
              AudioFX.win();
              App.toast((side === "you" ? "You made" : "AI made") + " a book of " + r + "s!", "success");
            }
          }
        }
        // end?
        if (pond.length === 0 && (you.length === 0 || ai.length === 0)) {
          won = books.you.length > books.ai.length ? "you" : books.you.length < books.ai.length ? "ai" : "tie";
          if (won === "you") {
            wins++;
            AudioFX.win();
            if (wins > best) {
              best = wins;
              Storage.setBest("gofish", wins);
            }
          } else AudioFX.lose();
          statusEl.textContent = won === "you" ? `🏆 You win ${books.you.length}–${books.ai.length}!` :
            won === "ai" ? `The AI wins ${books.ai.length}–${books.you.length}.` : "A perfect tie!";
          statusEl.className = "status " + (won === "you" ? "win" : "info");
        }
      }

      function ask(r) {
        if (won || turn !== "you") return;
        if (!you.some(c => c.r === r)) {
          statusEl.textContent = "You must ask for a rank you already hold!";
          statusEl.className = "status lose";
          AudioFX.error();
          return;
        }
        const got = ai.filter(c => c.r === r);
        if (got.length) {
          ai = ai.filter(c => c.r !== r);
          you.push(...got);
          AudioFX.pop();
          statusEl.textContent = `The AI hands over ${got.length} ${r}${got.length > 1 ? "s" : ""} — go again!`;
          statusEl.className = "status win";
          settle();
          render();
        } else {
          statusEl.textContent = "🤖 “Go fish!” You draw from the pond…";
          AudioFX.click();
          if (pond.length) you.push(pond.pop());
          settle();
          render();
          turn = "ai";
          after(aiTurn, 1100);
        }
      }

      function aiTurn() {
        if (won) return;
        // pick rank in hand with most copies
        const byRank = {};
        ai.forEach(c => (byRank[c.r] = byRank[c.r] || []).push(c));
        const ranks = Object.keys(byRank).sort((a, b) => byRank[b].length - byRank[a].length);
        const r = ranks[Math.floor(Math.random() * Math.min(3, ranks.length))] || ai[0] && ai[0].r;
        if (!r) {
          render();
          return;
        }
        const got = you.filter(c => c.r === r);
        if (got.length) {
          you = you.filter(c => c.r !== r);
          ai.push(...got);
          statusEl.textContent = `🤖 The AI asked for ${r}s and took ${got.length} from you! It goes again…`;
          AudioFX.error();
          settle();
          render();
          after(aiTurn, 1300);
        } else {
          statusEl.textContent = `🤖 The AI asked for ${r}s — GO FISH!`;
          AudioFX.click();
          if (pond.length) ai.push(pond.pop());
          settle();
          render();
          turn = "you";
          if (!won) {
            statusEl.textContent = `🤖 The AI asked for ${r}s — go fish! Your turn.`;
            statusEl.className = "status info";
          }
        }
      }

      function render() {
        root.querySelector("#gf-yb").textContent = books.you.length;
        root.querySelector("#gf-ab").textContent = books.ai.length;
        root.querySelector("#gf-wins").textContent = wins;
        root.querySelector("#gf-aih").textContent = ai.length;
        root.querySelector("#gf-pond").textContent = pond.length;
        handEl.innerHTML = "";
        you.slice().sort((a, b) => RANKS.indexOf(a.r) - RANKS.indexOf(b.r)).forEach(c => {
          const el = document.createElement("div");
          el.style.cssText = `display:inline-block;width:44px;height:62px;margin:3px;border-radius:7px;
            background:#f8fafc;color:${c.s === "♥" || c.s === "♦" ? "#dc2626" : "#0f172a"};
            font-weight:800;font-size:15px;text-align:center;padding-top:5px;cursor:pointer;border:2px solid #cbd5e1;`;
          el.innerHTML = `${c.r}<br>${c.s}`;
          el.addEventListener("pointerdown", () => ask(c.r));
          handEl.appendChild(el);
        });
        if (books.you.length || books.ai.length) {
          handEl.insertAdjacentHTML("beforeend",
            `<div style="margin-top:8px;font-size:13px;">Your books: ${books.you.map(b => `<b>${b}s</b>`).join(" · ") || "—"} &nbsp;|&nbsp; AI books: ${books.ai.map(b => `<b>${b}s</b>`).join(" · ") || "—"}</div>`);
        }
      }

      deal();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Go Fish",
        `Classic card game vs the AI. Each side holds 7 cards; the rest is the pond.
        <br><br>On your turn, <b>click a card</b> in your hand to ask the AI for that rank (you may only ask for ranks you hold).
        If the AI has any, it must hand them <b>all</b> over — and you go again. Otherwise: <b>“Go fish!”</b> — draw from the pond
        and your turn ends.
        <br><br>Collect all four of a rank to make a <b>book</b>. When cards run out, the most books wins.
        Note: this AI has a decent memory for what you ask for!`);
    },
  });
})();
