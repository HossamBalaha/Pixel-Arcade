/* Liar's Dice (Dudo) — Perudo bluff game: bid counts of a face across ALL dice,
   raise or call "Liar!". 1s are wild. Lose dice until someone runs out. */
(function () {
  "use strict";

  const PIP = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [30, 70], [70, 30], [70, 70]],
    5: [[30, 30], [30, 70], [50, 50], [70, 30], [70, 70]],
    6: [[30, 30], [30, 70], [50, 30], [50, 70], [70, 30], [70, 70]],
  };

  function faceHTML(v) {
    return PIP[v].map(p => `<span class="ld-pip" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
  }

  const rnd6 = () => 1 + Math.floor(Math.random() * 6);
  const RANK = f => (f === 1 ? 7 : f); // faces rank 2 < 3 < 4 < 5 < 6 < 1 (aces high & wild)

  // Count of face f across all dice; 1s are wild for any non-ace face.
  function countFace(f, all) {
    let n = 0;
    for (const d of all) if (d === f || (f !== 1 && d === 1)) n++;
    return n;
  }

  GameRegistry.register({
    id: "liarsdice",
    name: "Liar's Dice (Dudo)",
    icon: "🎲",
    category: "strategy",
    description: "Perudo bluff dice vs the dudo-bot: bid how many of a face hide under all 10 dice, raise or call Liar — 1s are wild, and every lost call costs a die.",
    tags: ["dice", "bluffing", "ai", "classic"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "medium",
    players: "either",
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true, gen = 0;
      let over = false, busy = false;
      let youDice = [1, 1, 1, 1, 1], botDice = [1, 1, 1, 1, 1];
      let roundN = 0, youRounds = 0, botRounds = 0;
      let bid = null;            // {q, f}
      let bids = [];             // {who, q, f} | {who, call:true}
      let turn = "you", starter = "you";
      let phase = "bid";         // "bid" | "reveal"
      let revealed = false;
      let selQ = 1, selF = 2;
      const timeouts = [];
      const intervals = [];

      function later(fn, ms) {
        const g = gen;
        const id = setTimeout(() => {
          if (alive && g === gen) fn();
        }, ms);
        timeouts.push(id);
        return id;
      }

      if (!document.getElementById("ld-style")) {
        const s = document.createElement("style");
        s.id = "ld-style";
        s.textContent = `
          .ld-row { display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin:6px 0; min-height:52px; align-items:center; }
          .ld-die { width:48px; height:48px; background:var(--bg-elev); border:2px solid var(--border); border-radius:10px;
            position:relative; padding:0; }
          .ld-pip { position:absolute; width:20%; height:20%; background:var(--text); border-radius:50%; transform:translate(-50%,-50%); }
          .ld-back { background:var(--bg-soft); display:grid; place-items:center; font-family:var(--font-mono);
            font-size:1.4rem; font-weight:700; color:var(--text-muted); }
          .ld-hit { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); }
          .ld-miss { opacity:.45; }
          .ld-lab { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); text-align:center; margin-top:8px; }
          .ld-ctl button { min-width:44px; min-height:40px; }
          .ld-facebtn { width:44px; height:44px; background:var(--bg-elev); border:2px solid var(--border); border-radius:9px;
            position:relative; padding:0; cursor:pointer; }
          .ld-facebtn.ld-on { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent); }
          .ld-fp { position:absolute; width:22%; height:22%; background:var(--text); border-radius:50%; transform:translate(-50%,-50%); }
          .ld-bids { font-family:var(--font-mono); font-size:.8rem; background:var(--bg-soft); border:1px solid var(--border);
            border-radius:var(--radius); padding:8px 10px; margin-top:12px; text-align:left; min-height:40px; }
          .ld-bids div { padding:1px 0; color:var(--text-muted); }
          .ld-bids div:first-child { color:var(--text); font-weight:700; }
          .ld-bids .ld-you { border-left:3px solid var(--accent); padding-left:6px; }
          .ld-bids .ld-call { color:var(--danger); }
          .ld-req { font-size:.78rem; color:var(--text-muted); text-align:center; min-height:1.2em; margin:4px 0; font-family:var(--font-mono); }
        `;
        document.head.appendChild(s);
      }

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Your dice</div><div class="val" id="ld-yc">5</div></div>
          <div class="score-cell"><div class="label">Bot dice</div><div class="val" id="ld-bc">5</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="ld-rd">1</div></div>
          <div class="score-cell"><div class="label">Current bid</div><div class="val" id="ld-cb" style="font-size:1.05rem;">—</div></div>
          <div class="score-cell"><div class="label">Rounds won</div><div class="val" id="ld-rw">0</div></div>
        </div>
        <div class="status info" id="ld-status">Rolling dice…</div>
        <div class="ld-lab">Your dice</div>
        <div class="ld-row" id="ld-you"></div>
        <div class="ld-lab">Dudo-bot's dice (hidden)</div>
        <div class="ld-row" id="ld-ai"></div>
        <div class="ld-ctl">
          <div class="ld-lab">Bid quantity (all dice)</div>
          <div class="row" id="ld-qty" style="justify-content:center;flex-wrap:wrap;gap:6px;"></div>
          <div class="ld-lab">Bid face (1s are wild aces — highest)</div>
          <div class="row" id="ld-face" style="justify-content:center;flex-wrap:wrap;gap:6px;"></div>
          <div class="ld-req" id="ld-req"></div>
          <div class="row" style="justify-content:center;gap:10px;flex-wrap:wrap;">
            <button class="btn primary" id="ld-bidbtn">Place bid</button>
            <button class="btn danger" id="ld-liar">Liar!</button>
            <button class="btn" id="ld-new">New game</button>
          </div>
        </div>
        <p class="hint">Bid how many of a face are hidden under <b>all</b> dice (yours + the bot's). Each turn you must <b>raise</b> — more dice,
        or the same count of a higher face (2&lt;3&lt;4&lt;5&lt;6&lt;1) — or call <b>Liar!</b>. When called, all dice reveal: 1s count as any face.</p>
        <div class="ld-bids" id="ld-bids"></div>
      `;

      const statusEl = root.querySelector("#ld-status");
      const youEl = root.querySelector("#ld-you");
      const aiEl = root.querySelector("#ld-ai");
      const qtyEl = root.querySelector("#ld-qty");
      const faceEl = root.querySelector("#ld-face");
      const reqEl = root.querySelector("#ld-req");
      const bidsEl = root.querySelector("#ld-bids");
      const bidBtn = root.querySelector("#ld-bidbtn");
      const liarBtn = root.querySelector("#ld-liar");

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = "status " + (cls || "info");
      }

      const totalDice = () => youDice.length + botDice.length;

      function isRaise(q, f) {
        if (!bid) return true;
        return q > bid.q || (q === bid.q && RANK(f) > RANK(bid.f));
      }

      function countsToward(d, f) {
        return d === f || (f !== 1 && d === 1);
      }

      function render() {
        root.querySelector("#ld-yc").textContent = youDice.length;
        root.querySelector("#ld-bc").textContent = botDice.length;
        root.querySelector("#ld-rd").textContent = roundN;
        root.querySelector("#ld-cb").textContent = bid ? `${bid.q}× ${bid.f}${bid.f === 1 ? " (aces)" : "s"}` : "—";
        root.querySelector("#ld-rw").textContent = youRounds;

        // your dice — highlight those counting toward the bid during a reveal
        youEl.innerHTML = "";
        youDice.forEach(d => {
          const el = document.createElement("div");
          const hit = phase === "reveal" && countsToward(d, bid.f);
          el.className = "ld-die" + (phase === "reveal" ? (hit ? " ld-hit" : " ld-miss") : "");
          el.innerHTML = faceHTML(d);
          youEl.appendChild(el);
        });

        // bot dice — hidden until the reveal
        aiEl.innerHTML = "";
        botDice.forEach(d => {
          const el = document.createElement("div");
          if (revealed) {
            const hit = phase === "reveal" && countsToward(d, bid.f);
            el.className = "ld-die" + (phase === "reveal" ? (hit ? " ld-hit" : " ld-miss") : "");
            el.innerHTML = faceHTML(d);
          } else {
            el.className = "ld-die ld-back";
            el.textContent = "?";
          }
          aiEl.appendChild(el);
        });

        // bid history
        bidsEl.innerHTML = bids.length
          ? bids.slice().reverse().map(b => b.call
            ? `<div class="${b.who === "you" ? "ld-you" : ""} ld-call">${b.who === "you" ? "You" : "Bot"}: LIAR!</div>`
            : `<div class="${b.who === "you" ? "ld-you" : ""}">${b.who === "you" ? "You" : "Bot"}: ${b.q}× ${b.f}${b.f === 1 ? " (aces)" : "s"}</div>`).join("")
          : "<div>No bids yet this round.</div>";

        // bid controls
        const myTurn = !over && phase === "bid" && turn === "you" && !busy;
        qtyEl.innerHTML = "";
        for (let q = 1; q <= totalDice(); q++) {
          const b = document.createElement("button");
          b.className = "btn" + (q === selQ ? " primary" : "");
          b.textContent = q;
          b.style.minWidth = "40px";
          b.disabled = !myTurn;
          b.addEventListener("click", () => {
            selQ = q;
            AudioFX.click();
            render();
          });
          qtyEl.appendChild(b);
        }
        faceEl.innerHTML = "";
        for (const f of [2, 3, 4, 5, 6, 1]) {
          const b = document.createElement("button");
          b.className = "ld-facebtn" + (f === selF ? " ld-on" : "");
          b.title = f === 1 ? "Aces — wild, highest face" : "Face " + f;
          b.innerHTML = PIP[f].map(p => `<span class="ld-fp" style="left:${p[0]}%;top:${p[1]}%"></span>`).join("");
          b.disabled = !myTurn;
          b.addEventListener("click", () => {
            selF = f;
            AudioFX.click();
            render();
          });
          faceEl.appendChild(b);
        }

        reqEl.textContent = bid
          ? `Raise: more than ${bid.q} dice, or ${bid.q}× of a face above ${bid.f} (2<3<4<5<6<1)`
          : "Opening bid: any quantity and any face.";
        bidBtn.textContent = bid ? "Raise" : "Place bid";
        bidBtn.disabled = !myTurn || !isRaise(selQ, selF);
        liarBtn.disabled = !myTurn || !bid;
      }

      // ~400ms shuffle of your dice before settling.
      function animateYours(done) {
        const g = gen;
        const els = Array.from(root.querySelectorAll("#ld-you .ld-die"));
        AudioFX.tick();
        let n = 0;
        const iv = setInterval(() => {
          if (!alive || g !== gen) {
            clearInterval(iv);
            return;
          }
          els.forEach(el => {
            el.innerHTML = faceHTML(rnd6());
          });
          if (++n >= 7) {
            clearInterval(iv);
            els.forEach((el, i) => {
              el.innerHTML = faceHTML(youDice[i]);
            });
            AudioFX.pop();
            if (done) done();
          }
        }, 55);
        intervals.push(iv);
      }

      function newRound(first) {
        if (over) return;
        roundN++;
        starter = first;
        youDice = youDice.map(rnd6);
        botDice = botDice.map(rnd6);
        bid = null;
        bids = [];
        turn = first;
        phase = "bid";
        revealed = false;
        selQ = 1;
        selF = 2;
        render();
        animateYours(() => {
          if (over) return;
          if (first === "ai") {
            setStatus(`Round ${roundN}: the bot bids first…`, "info");
            later(aiAct, 1100);
          } else {
            setStatus(`Round ${roundN}: you bid first — pick a quantity and a face.`, "info");
          }
        });
      }

      // ---- player actions ----
      function onBid() {
        if (over || busy || phase !== "bid" || turn !== "you") return;
        if (!isRaise(selQ, selF)) {
          App.toast("You must raise the bid", "warning");
          return;
        }
        bid = {q: selQ, f: selF};
        bids.push({who: "you", q: selQ, f: selF});
        AudioFX.place();
        turn = "ai";
        render();
        setStatus(`You bid ${selQ}× ${selF}${selF === 1 ? " (aces)" : "s"}. Bot is thinking…`, "info");
        later(aiAct, 1200);
      }

      function onLiar() {
        if (over || busy || phase !== "bid" || turn !== "you" || !bid) return;
        doCall("you");
      }

      // ---- resolve a "Liar!" call ----
      function doCall(who) {
        phase = "reveal";
        busy = true;
        bids.push({who, call: true});
        render();
        setStatus(who === "you" ? "You call LIAR! Revealing all dice…" : "Bot calls LIAR! Revealing all dice…", "info");
        AudioFX.reveal();
        later(() => {
          if (over) return;
          revealed = true;
          render();
          const all = youDice.concat(botDice);
          const n = countFace(bid.f, all);
          const met = n >= bid.q;
          const loser = met ? who : (who === "you" ? "ai" : "you"); // if the bid holds, the caller loses a die
          setStatus(`${n}× ${bid.f}${bid.f === 1 ? " (aces)" : "s, with 1s wild"} on the table vs the bid of ${bid.q}. ` +
            `${met ? "Bid met" : "Bid NOT met"} — ${loser === "you" ? "you lose" : "the bot loses"} a die.`,
            loser === "you" ? "lose" : "win");
          later(() => resolveLoss(loser), 2100);
        }, 1000);
      }

      function resolveLoss(loser) {
        if (over) return;
        if (loser === "you") {
          youDice.pop();
          botRounds++;
        } else {
          botDice.pop();
          youRounds++;
        }
        if (youDice.length === 0) return endGame(false);
        if (botDice.length === 0) return endGame(true);
        AudioFX.place();
        App.toast(loser === "you" ? "You lose a die!" : "Bot loses a die!", loser === "you" ? "warning" : "success");
        render();
        later(() => newRound(loser), 1400); // the player who lost a die starts the next round
      }

      // ---- AI: estimates expected counts from its own dice + unknown dice; bluffs a bit ----
      function bestFaceFor(my) {
        let best = {f: 2, eff: -1};
        for (const f of [2, 3, 4, 5, 6, 1]) {
          const eff = countFace(f, my);
          if (eff > best.eff) best = {f, eff};
        }
        return best;
      }

      function makeAIBid(q, f) {
        bid = {q, f};
        bids.push({who: "ai", q, f});
        AudioFX.place();
        turn = "you";
        render();
        setStatus(`Bot bids ${q}× ${f}${f === 1 ? " (aces)" : "s"}. Your move — raise or call liar.`, "info");
      }

      function aiAct() {
        if (over || phase !== "bid" || turn !== "ai") return;
        const my = botDice;
        const unknown = youDice.length; // the AI only knows how many dice you hold, never their faces
        if (!bid) {
          const bf = bestFaceFor(my);
          const p = bf.f === 1 ? 1 / 6 : 1 / 3; // wilds make non-ace faces twice as likely
          let q = Math.max(1, Math.ceil(bf.eff + unknown * p) - 1);
          if (Math.random() < 0.15) q += 1; // occasional bluff
          q = Math.max(1, Math.min(q, my.length + unknown));
          makeAIBid(q, bf.f);
          return;
        }
        const f = bid.f;
        const myEff = countFace(f, my);
        const p = f === 1 ? 1 / 6 : 1 / 3;
        const expected = myEff + unknown * p;
        const maxPossible = myEff + unknown;
        if (bid.q > maxPossible || bid.q >= expected + (1.1 + Math.random() * 0.9)) {
          doCall("ai");
          return;
        }
        // raise: prefer the same quantity on a higher face it holds, else bump the quantity
        let hiFace = null, hiEff = -1;
        for (const f2 of [2, 3, 4, 5, 6, 1]) {
          if (RANK(f2) > RANK(f)) {
            const e = countFace(f2, my);
            if (e > hiEff) {
              hiEff = e;
              hiFace = f2;
            }
          }
        }
        let q, nf;
        if (hiFace !== null && hiEff >= Math.max(1, bid.q - 1) && Math.random() > 0.25) {
          q = bid.q;
          nf = hiFace;
        } else {
          q = bid.q + 1;
          nf = (hiFace !== null && Math.random() < 0.5) ? hiFace : bestFaceFor(my).f;
          if (Math.random() < 0.15) q += 1; // bluff bump
          q = Math.min(q, my.length + unknown);
        }
        makeAIBid(q, nf);
      }

      function endGame(won) {
        over = true;
        busy = false;
        phase = "bid";
        render();
        App.recordResult(won, youRounds);
        const best = Storage.getBest("liarsdice");
        if (youRounds > (best != null ? best : 0)) {
          Storage.setBest("liarsdice", youRounds);
          App.toast("New best: " + youRounds + " rounds won", "success");
        }
        if (won) {
          AudioFX.win();
          setStatus(`The bot is out of dice — you win after ${roundN} rounds (${youRounds}-${botRounds})!`, "win");
          App.toast("You out-bluffed the dudo-bot!", "success");
        } else {
          AudioFX.lose();
          setStatus(`You're out of dice — the bot wins after ${roundN} rounds (${youRounds}-${botRounds}).`, "lose");
        }
        render();
      }

      function newGame() {
        gen++;
        over = false;
        busy = false;
        youDice = [1, 1, 1, 1, 1];
        botDice = [1, 1, 1, 1, 1];
        roundN = 0;
        youRounds = 0;
        botRounds = 0;
        bid = null;
        bids = [];
        revealed = false;
        turn = "you";
        newRound("you");
      }

      bidBtn.addEventListener("click", onBid);
      liarBtn.addEventListener("click", onLiar);
      root.querySelector("#ld-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      newGame();
      return function cleanup() {
        alive = false;
        timeouts.forEach(clearTimeout);
        intervals.forEach(clearInterval);
      };
    },
    help: function () {
      App.showModal("How to play Liar's Dice (Dudo)",
        `A 2-player Perudo-style bluff game against the dudo-bot. You each start with <b>5 hidden dice</b>.
        <br><br><b>Each round:</b>
        <br>1. Both players roll. You see only <b>your</b> dice; the bot's stay hidden behind "?".
        <br>2. The starting player <b>bids</b> a quantity of a face across <b>all</b> dice in play — e.g. "three 4s".
        <br>3. Players alternate. On your turn you must either:
        <br>&nbsp;&nbsp;• <b>Raise</b> — bid a <b>higher quantity</b> (any face), or the <b>same quantity of a higher face</b> (faces rank 2&lt;3&lt;4&lt;5&lt;6&lt;1; aces are highest), or
        <br>&nbsp;&nbsp;• call <b>"Liar!"</b> — challenging the last bid.
        <br>4. On a call, <b>all dice reveal</b>. Count the bid's face across every die — <b>1s are wild</b> and count as any face (a bid of aces counts only real 1s).
        <br>&nbsp;&nbsp;• If the bid count is <b>met or exceeded</b>, the <b>caller</b> loses a die.
        <br>&nbsp;&nbsp;• If it is <b>not met</b>, the <b>bidder</b> loses a die.
        <br>5. Whoever lost a die <b>starts the next round</b> (all remaining dice reroll).
        <br><br><b>Losing:</b> the first player reduced to <b>0 dice</b> loses the game.
        <br><br><b>Bot policy:</b> it estimates the expected count of the bid face from its own dice plus the probability from your unknown dice, calls liar when a bid runs well past that estimate, and throws in the occasional bluff.`);
    },
  });
})();
