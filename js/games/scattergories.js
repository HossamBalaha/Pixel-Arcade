/* Scattergories — one letter, five categories, type a word for each */
(function () {
  GameRegistry.register({
    id: "scattergories",
    name: "Scattergories",
    icon: "📋",
    category: "word",
    description: "One letter, five categories — type a word for each",
    tags: ["word", "categories", "creativity"],
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
      const CATS = ["ANIMAL", "FRUIT", "COUNTRY", "COLOR", "VEHICLE", "SPORT", "JOB", "CITY", "FOOD", "INSTRUMENT",
        "PLANT", "MOVIE", "DRINK", "CLOTHING", "WEATHER", "BODY PART", "EMOTION", "HOBBY", "FURNITURE", "BIRD"];
      let letter, cats, answers, timeLeft, timer, round, score, best;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Round</div><div class="val" id="sc-round">1</div></div>
          <div class="score-cell"><div class="label">Time</div><div class="val" id="sc-time">90</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="sc-score">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="sc-best">0</div></div>
        </div>
        <div class="status info" id="sc-status">Fill each category with a word starting with the letter</div>
        <div class="center" id="sc-board"></div>
        <p class="hint">Be honest — no peeking at dictionaries! Validation checks first letter + word list.</p>
      `;

      const boardEl = root.querySelector("#sc-board");
      const statusEl = root.querySelector("#sc-status");
      best = Storage.getBest("scattergories") || 0;

      const style = document.createElement("style");
      style.textContent = `
        .sc-row { display:flex; gap:10px; align-items:center; margin:7px 0; }
        .sc-cat { min-width:130px; text-align:right; font-weight:700; font-size:14px; }
        .sc-in { flex:1; max-width:280px; padding:9px 12px; border-radius:8px; border:2px solid var(--bg-inset,#1f2937);
                 background:var(--bg-soft,#334155); color:var(--text,#eee); font-size:15px; text-transform:uppercase; }
        .sc-in.ok { border-color:#16a34a; }
        .sc-in.no { border-color:#ef4444; }
        .sc-letter { font-size:34px; font-weight:900; color:var(--accent,#6366f1); margin:8px auto; width:54px; height:54px;
                     display:flex; align-items:center; justify-content:center; background:var(--bg-soft,#334155); border-radius:12px; }
      `;
      root.appendChild(style);

      function start() {
        round = 1;
        score = 0;
        nextRound();
      }

      function nextRound() {
        letter = "ABCDEFGHIJKLMNOPRSTW"[Math.floor(Math.random() * 21)];
        cats = CATS.slice().sort(() => Math.random() - 0.5).slice(0, 5);
        answers = cats.map(() => "");
        timeLeft = 90;
        clearInterval(timer);
        timer = setInterval(() => {
          timeLeft--;
          root.querySelector("#sc-time").textContent = timeLeft;
          if (timeLeft <= 0) grade();
        }, 1000);
        statusEl.textContent = `Round ${round}: fill each category with a “${letter}” word`;
        statusEl.className = "status info";
        render();
      }

      function validWord(w) {
        if (!w) return false;
        if (w[0] !== letter) return false;
        const lower = w.toLowerCase();
        return (window.WORDS_ALL || []).includes(lower) || (window.ANSWERS_ALL || []).includes(lower);
      }

      function grade() {
        clearInterval(timer);
        let pts = 0;
        answers.forEach((a, i) => {
          const ok = validWord(a);
          if (ok) pts += 15;
          const input = boardEl.querySelectorAll(".sc-in")[i];
          if (input) input.classList.add(ok ? "ok" : "no");
        });
        // time bonus
        pts += Math.max(0, timeLeft);
        score += pts;
        AudioFX.win();
        if (score > best) {
          best = score;
          Storage.setBest("scattergories", score);
          App.toast("New best: " + best, "success");
        }
        statusEl.textContent = `Round ${round} scored ${pts} pts (15/answer + time bonus). Next round…`;
        statusEl.className = "status win";
        round++;
        updateHud();
        after(nextRound, 2600);
      }

      function updateHud() {
        root.querySelector("#sc-round").textContent = round;
        root.querySelector("#sc-time").textContent = timeLeft;
        root.querySelector("#sc-score").textContent = score;
        root.querySelector("#sc-best").textContent = best;
      }

      function render() {
        updateHud();
        let html = `<div class="sc-letter">${letter}</div>`;
        cats.forEach((c, i) => {
          html += `<div class="sc-row">
            <div class="sc-cat">${c}</div>
            <input class="sc-in" data-i="${i}" maxlength="18" placeholder="${letter}…" value="${answers[i]}" autocomplete="off"/>
          </div>`;
        });
        html += `<div class="row gap-2" style="justify-content:center;margin-top:10px;">
          <button class="btn btn-sm primary" id="sc-done">✔ Done — grade me!</button>
        </div>`;
        boardEl.innerHTML = html;
        boardEl.querySelectorAll(".sc-in").forEach(inp => {
          inp.addEventListener("input", () => {
            answers[+inp.dataset.i] = inp.value.toUpperCase().replace(/[^A-Z]/g, "");
            inp.value = answers[+inp.dataset.i];
          });
        });
        boardEl.querySelector("#sc-done").addEventListener("click", grade);
      }

      start();
      return function cleanup() {
        __t.forEach(clearTimeout);
        __t.forEach(clearTimeout);
        style.remove();
        clearInterval(timer);
      };
    },
    help: function () {
      App.showModal("How to play Scattergories",
        `A letter is drawn. You get <b>five categories</b> and 90 seconds — type one word per category,
        each starting with that letter.
        <br><br>Scoring: <b>15 points</b> per valid answer (right first letter + real dictionary word) plus
        <b>1 point per second left</b> on the clock. Rounds keep coming — how high can your total climb?`);
    },
  });
})();
