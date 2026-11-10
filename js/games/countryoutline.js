/* Country Shapes — name the country from its outline alone */
(function () {
  GameRegistry.register({
    id: "countryoutline",
    name: "Country Shapes",
    icon: "🗺️",
    category: "quiz",
    description: "Name the country from its outline alone",
    tags: ["quiz", "geography", "maps"],
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
      // simplified hand-drawn outlines (polygons in 0..100 space)
      const COUNTRIES = [
        {
          name: "Italy",
          hint: "The boot of Europe",
          poly: [[20, 10], [14, 22], [22, 30], [26, 42], [30, 55], [38, 70], [46, 90], [54, 88], [44, 66], [50, 60], [58, 44], [62, 30], [70, 20], [60, 12], [44, 14], [30, 8]]
        },
        {
          name: "France",
          hint: "Hexagon-shaped, in Western Europe",
          poly: [[12, 20], [30, 8], [55, 10], [78, 18], [88, 38], [70, 45], [75, 60], [60, 78], [42, 80], [30, 60], [18, 52], [8, 35]]
        },
        {
          name: "Australia",
          hint: "A continent of its own",
          poly: [[15, 35], [25, 18], [45, 10], [65, 12], [80, 25], [88, 45], [80, 65], [60, 78], [40, 80], [22, 68], [10, 52]]
        },
        {
          name: "Brazil",
          hint: "Largest country in South America",
          poly: [[22, 15], [45, 8], [62, 15], [70, 30], [75, 50], [85, 70], [70, 88], [50, 80], [35, 88], [20, 70], [12, 45], [15, 28]]
        },
        {
          name: "Japan",
          hint: "An island arc in the Pacific",
          poly: [[8, 60], [18, 45], [15, 30], [30, 18], [42, 25], [40, 12], [55, 8], [65, 20], [80, 15], [90, 28], [85, 40], [70, 38], [60, 50], [45, 55], [35, 68], [20, 70]]
        },
        {
          name: "Egypt",
          hint: "Nearly square, with a Red Sea coast",
          poly: [[15, 15], [60, 12], [80, 20], [85, 45], [70, 55], [65, 85], [45, 88], [40, 60], [20, 50], [10, 32]]
        },
        {
          name: "India",
          hint: "A diamond pointing south",
          poly: [[25, 12], [60, 8], [80, 20], [88, 40], [70, 55], [78, 70], [60, 90], [48, 60], [35, 55], [28, 35], [15, 25]]
        },
        {
          name: "United Kingdom",
          hint: "An island off northwest Europe",
          poly: [[20, 55], [15, 40], [25, 28], [40, 15], [55, 10], [68, 18], [75, 30], [85, 28], [90, 40], [80, 52], [65, 50], [55, 60], [40, 65], [28, 62]]
        },
        {
          name: "Mexico",
          hint: "A long wedge south of the USA",
          poly: [[10, 20], [30, 12], [50, 18], [65, 12], [80, 20], [88, 35], [70, 45], [60, 65], [45, 80], [35, 70], [30, 50], [15, 35]]
        },
        {
          name: "Greenland",
          hint: "The world's biggest island",
          poly: [[25, 20], [40, 8], [60, 5], [80, 12], [88, 25], [80, 40], [65, 50], [50, 45], [35, 55], [22, 42], [15, 30]]
        },
        {
          name: "Chile",
          hint: "A very long, thin South American strip",
          poly: [[40, 5], [48, 8], [45, 20], [52, 35], [48, 50], [55, 65], [50, 80], [55, 92], [42, 90], [40, 75], [32, 60], [38, 45], [30, 30], [35, 15]]
        },
        {
          name: "Norway",
          hint: "Fjord-rich Scandinavian",
          poly: [[15, 90], [20, 75], [12, 60], [18, 48], [10, 35], [20, 25], [15, 12], [28, 5], [40, 12], [32, 25], [40, 35], [32, 48], [42, 60], [35, 75], [45, 88], [30, 95]]
        },
      ];
      let item, opts, score, best, round, streak;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Score</div><div class="val" id="cs-score">0</div></div>
          <div class="score-cell"><div class="label">Round</div><div class="val" id="cs-round">1/10</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cs-best">0</div></div>
        </div>
        <div class="status info" id="cs-status">Which country has this outline?</div>
        <div class="center"><canvas id="cs-canvas" width="240" height="240" style="background:rgba(14,165,233,0.12);border-radius:12px;"></canvas></div>
        <div class="center" id="cs-opts" style="max-width:420px;"></div>
        <p class="hint" style="text-align:center;">Streak bonus: +5 for each consecutive hit.</p>
      `;

      const canvas = root.querySelector("#cs-canvas"), ctx = canvas.getContext("2d");
      const optsEl = root.querySelector("#cs-opts");
      const statusEl = root.querySelector("#cs-status");
      best = Storage.getBest("countryoutline") || 0;
      round = 1;
      score = 0;
      streak = 0;

      function drawOutline() {
        const st = getComputedStyle(document.documentElement);
        const text = st.getPropertyValue("--text").trim() || "#e2e8f0";
        ctx.clearRect(0, 0, 240, 240);
        ctx.save();
        ctx.scale(2.2, 2.2);
        ctx.translate(3, 3);
        ctx.beginPath();
        item.poly.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath();
        ctx.fillStyle = "rgba(120,113,108,0.35)";
        ctx.fill();
        // outline follows theme text so it reads on any page background
        ctx.strokeStyle = text;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      }

      function next() {
        const pool = COUNTRIES.slice().sort(() => Math.random() - 0.5);
        item = pool[0];
        opts = [item, ...pool.slice(1, 4)].sort(() => Math.random() - 0.5);
        drawOutline();
        statusEl.textContent = "Which country has this outline?";
        statusEl.className = "status info";
        render();
      }

      function pick(o) {
        const els = optsEl.querySelectorAll(".cs-opt");
        els.forEach(el => el.style.pointerEvents = "none");
        const i = opts.indexOf(o);
        if (o.name === item.name) {
          streak++;
          const pts = 25 + streak * 5;
          score += pts;
          AudioFX.win();
          els[i].classList.add("right");
          statusEl.textContent = `✔ ${item.name}! +${pts} (streak ×${streak})`;
          statusEl.className = "status win";
        } else {
          streak = 0;
          AudioFX.error();
          els[i].classList.add("wrong");
          els[opts.indexOf(item)].classList.add("right");
          statusEl.textContent = `It was ${item.name} — ${item.hint}.`;
          statusEl.className = "status lose";
        }
        round++;
        if (round > 10) {
          if (score > best) {
            best = score;
            Storage.setBest("countryoutline", score);
          }
          statusEl.textContent = `Game over — ${score} points. New game…`;
          statusEl.className = "status " + (score >= 150 ? "win" : "info");
          after(() => {
            round = 1;
            score = 0;
            streak = 0;
            next();
          }, 2800);
        } else {
          after(next, 1700);
        }
        updateHud();
      }

      function updateHud() {
        root.querySelector("#cs-score").textContent = score;
        root.querySelector("#cs-round").textContent = Math.min(round, 10) + "/10";
        root.querySelector("#cs-best").textContent = best;
      }

      function render() {
        updateHud();
        optsEl.innerHTML = "";
        opts.forEach(o => {
          const b = document.createElement("div");
          b.className = "cs-opt";
          b.style.cssText = "display:block;width:min(340px,90%);padding:11px;margin:5px auto;border-radius:9px;background:var(--bg-soft,#334155);color:var(--text,#eee);font-weight:600;cursor:pointer;border:2px solid transparent;";
          b.textContent = o.name;
          b.addEventListener("pointerdown", () => pick(o));
          optsEl.appendChild(b);
        });
      }

      next();
      return function cleanup() {
        __t.forEach(clearTimeout);
      };
    },
    help: function () {
      App.showModal("How to play Country Shapes",
        `A country's outline appears on the map — no labels, no borders, just the silhouette.
        Pick the right country from four candidates.
        <br><br><b>+25</b> per correct answer plus a growing streak bonus (<b>+5 per consecutive hit</b>).
        Ten rounds; outlines include classics like the Italian boot and trickier silhouettes.`);
    },
  });
})();
