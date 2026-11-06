/* Worldle — guess the country from its silhouette, with distance + direction hints */
(function () {
  // 30 countries with approximate capital lat/long, continent, aspect ratio for silhouette.
  const COUNTRIES = [
    {name: "USA", lat: 38.9, lon: -77.0, cont: "North America", ar: 1.7, shape: "rect"},
    {name: "Canada", lat: 45.4, lon: -75.7, cont: "North America", ar: 1.9, shape: "rect"},
    {name: "Brazil", lat: -15.8, lon: -47.9, cont: "South America", ar: 1.5, shape: "rect"},
    {name: "Argentina", lat: -34.6, lon: -58.4, cont: "South America", ar: 0.8, shape: "rect"},
    {name: "UK", lat: 51.5, lon: -0.1, cont: "Europe", ar: 0.95, shape: "rect"},
    {name: "France", lat: 48.9, lon: 2.3, cont: "Europe", ar: 1.05, shape: "rect"},
    {name: "Germany", lat: 52.5, lon: 13.4, cont: "Europe", ar: 0.95, shape: "rect"},
    {name: "Italy", lat: 41.9, lon: 12.5, cont: "Europe", ar: 0.7, shape: "rect"},
    {name: "Spain", lat: 40.4, lon: -3.7, cont: "Europe", ar: 1.05, shape: "rect"},
    {name: "Portugal", lat: 38.7, lon: -9.1, cont: "Europe", ar: 0.6, shape: "rect"},
    {name: "Russia", lat: 55.8, lon: 37.6, cont: "Europe", ar: 2.6, shape: "rect"},
    {name: "China", lat: 39.9, lon: 116.4, cont: "Asia", ar: 1.55, shape: "rect"},
    {name: "Japan", lat: 35.7, lon: 139.7, cont: "Asia", ar: 0.5, shape: "ellipse"},
    {name: "India", lat: 28.6, lon: 77.2, cont: "Asia", ar: 1.0, shape: "rect"},
    {name: "Australia", lat: -35.3, lon: 149.1, cont: "Oceania", ar: 1.45, shape: "rect"},
    {name: "Egypt", lat: 30.0, lon: 31.2, cont: "Africa", ar: 1.1, shape: "rect"},
    {name: "South Africa", lat: -25.7, lon: 28.2, cont: "Africa", ar: 1.1, shape: "rect"},
    {name: "Mexico", lat: 19.4, lon: -99.1, cont: "North America", ar: 1.0, shape: "rect"},
    {name: "Turkey", lat: 39.9, lon: 32.9, cont: "Asia", ar: 1.4, shape: "rect"},
    {name: "Greece", lat: 38.0, lon: 23.7, cont: "Europe", ar: 0.85, shape: "ellipse"},
    {name: "Norway", lat: 59.9, lon: 10.8, cont: "Europe", ar: 0.5, shape: "rect"},
    {name: "Sweden", lat: 59.3, lon: 18.1, cont: "Europe", ar: 0.45, shape: "rect"},
    {name: "Finland", lat: 60.2, lon: 24.9, cont: "Europe", ar: 0.55, shape: "rect"},
    {name: "Poland", lat: 52.2, lon: 21.0, cont: "Europe", ar: 0.95, shape: "rect"},
    {name: "Netherlands", lat: 52.4, lon: 4.9, cont: "Europe", ar: 1.0, shape: "rect"},
    {name: "Belgium", lat: 50.8, lon: 4.4, cont: "Europe", ar: 0.95, shape: "rect"},
    {name: "Switzerland", lat: 46.9, lon: 7.4, cont: "Europe", ar: 0.8, shape: "ellipse"},
    {name: "Austria", lat: 48.2, lon: 16.4, cont: "Europe", ar: 0.9, shape: "rect"},
    {name: "Ireland", lat: 53.3, lon: -6.3, cont: "Europe", ar: 0.85, shape: "ellipse"},
    {name: "Denmark", lat: 55.7, lon: 12.6, cont: "Europe", ar: 0.7, shape: "ellipse"},
  ];
  const MAX = 6;
  const MAX_HINTS = 2;
  const R_EARTH = 6371; // km

  function distance(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function bearing(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
    const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function dirName(b) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(b / 45) % 8];
  }

  function silhouetteSVG(c, w = 200, h = 160, color = "#000") {
    const padX = 16, padY = 16;
    const maxW = w - padX * 2, maxH = h - padY * 2;
    let cw, ch;
    if (c.ar >= 1) {
      cw = maxW;
      ch = maxW / c.ar;
      if (ch > maxH) {
        ch = maxH;
        cw = maxH * c.ar;
      }
    } else {
      ch = maxH;
      cw = maxH * c.ar;
      if (cw > maxW) {
        cw = maxW;
        ch = maxW / c.ar;
      }
    }
    const cx = w / 2, cy = h / 2;
    const x = cx - cw / 2, y = cy - ch / 2;
    const shape = c.shape === "ellipse"
      ? `<ellipse cx="${cx}" cy="${cy}" rx="${cw / 2}" ry="${ch / 2}" fill="${color}"/>`
      : `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${color}"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;max-width:280px;display:block;margin:0 auto;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius);">${shape}</svg>`;
  }

  let live = null;

  GameRegistry.register({
    id: "worldle",
    name: "Worldle",
    icon: "🌍",
    category: "word",
    description: "Guess the country from its silhouette — distance + direction hints",
    tags: ["geography", "word", "variant"],
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
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

      let target = null;
      let guesses = []; // [{name, dist, dir}]
      let over = false;
      let revealed = false;
      let hintsUsed = 0;
      let continentHinted = false;

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Guess</div><div class="val" id="wl-used">0</div></div>
          <div class="score-cell"><div class="label">Max</div><div class="val">${MAX}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="wl-best">—</div></div>
        </div>
        <div class="status info" id="wl-status">Guess the country from its silhouette — 6 tries</div>
        <div id="wl-shape"></div>
        <div class="wl-combo" style="position:relative;display:flex;justify-content:center;gap:8px;">
          <div class="wl-input-wrap" style="position:relative;flex:1;max-width:260px;">
            <input id="wl-input" type="text" autocomplete="off" placeholder="Type a country…"
              style="width:100%;padding:8px 12px;background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-family:inherit;" />
            <div id="wl-suggest" class="wl-suggest" style="display:none;"></div>
          </div>
          <button class="btn primary" id="wl-submit">Guess</button>
        </div>
        <div class="col" id="wl-past" style="gap:6px;"></div>
        <p class="hint">Type a country name — the list filters letter by letter as you type. Lower distance = closer. Direction points from your guess to the target. Stuck? Try <b>Hint</b> (continent) or <b>Solve</b>.</p>
      `;

      // Inject dropdown styles once
      if (!document.getElementById("wl-suggest-style")) {
        const s = document.createElement("style");
        s.id = "wl-suggest-style";
        s.textContent = `
          .wl-suggest {
            position: absolute; left: 0; right: 0; top: calc(100% + 2px);
            background: var(--bg-elev-2); border: 1px solid var(--border);
            border-radius: var(--radius-sm); box-shadow: var(--shadow-lg);
            max-height: 220px; overflow-y: auto; z-index: 50; padding: 4px 0;
          }
          .wl-suggest-item {
            padding: 7px 12px; cursor: pointer; font-size: 0.92rem;
            color: var(--text);
          }
          .wl-suggest-item:hover, .wl-suggest-item.active {
            background: var(--accent-soft); color: var(--accent);
          }
          .wl-suggest-empty { padding: 8px 12px; color: var(--text-muted); font-size: 0.88rem; }
        `;
        document.head.appendChild(s);
      }

      const statusEl = root.querySelector("#wl-status");
      const shapeEl = root.querySelector("#wl-shape");
      const pastEl = root.querySelector("#wl-past");
      const inputEl = root.querySelector("#wl-input");
      const submitBtn = root.querySelector("#wl-submit");
      const suggestEl = root.querySelector("#wl-suggest");
      let suggestActiveIdx = -1;
      let suggestList = [];

      function filteredCountries(q) {
        const s = q.toLowerCase().trim();
        if (!s) return COUNTRIES.slice();
        return COUNTRIES.filter(c => c.name.toLowerCase().includes(s));
      }

      function renderSuggest() {
        const q = inputEl.value;
        suggestList = filteredCountries(q);
        // Exclude already-guessed
        const guessedNames = new Set(guesses.map(g => g.name));
        const visible = suggestList.filter(c => !guessedNames.has(c.name)).slice(0, 30);
        suggestActiveIdx = -1;
        if (!inputEl.value.trim() || visible.length === 0) {
          suggestEl.style.display = "none";
          suggestEl.innerHTML = visible.length === 0 && inputEl.value.trim()
            ? '<div class="wl-suggest-empty">No matches</div>' : '';
          if (visible.length === 0 && inputEl.value.trim()) suggestEl.style.display = "block";
          return;
        }
        suggestEl.style.display = "block";
        suggestEl.innerHTML = visible.map((c, i) =>
          `<div class="wl-suggest-item" data-name="${c.name}" data-i="${i}">${c.name}</div>`
        ).join("");
      }

      function hideSuggest() {
        suggestEl.style.display = "none";
        suggestActiveIdx = -1;
      }

      function pickSuggestion(name) {
        inputEl.value = name;
        hideSuggest();
        submitGuess();
      }

      inputEl.addEventListener("input", renderSuggest);
      inputEl.addEventListener("focus", renderSuggest);
      inputEl.addEventListener("keydown", (e) => {
        if (suggestEl.style.display === "block") {
          const items = suggestEl.querySelectorAll(".wl-suggest-item");
          if (e.key === "ArrowDown") {
            e.preventDefault();
            suggestActiveIdx = Math.min(suggestActiveIdx + 1, items.length - 1);
            items.forEach((it, i) => it.classList.toggle("active", i === suggestActiveIdx));
            if (items[suggestActiveIdx]) items[suggestActiveIdx].scrollIntoView({block: "nearest"});
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            suggestActiveIdx = Math.max(suggestActiveIdx - 1, 0);
            items.forEach((it, i) => it.classList.toggle("active", i === suggestActiveIdx));
            if (items[suggestActiveIdx]) items[suggestActiveIdx].scrollIntoView({block: "nearest"});
            return;
          }
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (suggestActiveIdx >= 0) {
            const item = suggestEl.querySelectorAll(".wl-suggest-item")[suggestActiveIdx];
            if (item) {
              pickSuggestion(item.dataset.name);
              return;
            }
          }
          submitGuess();
        }
        if (e.key === "Escape") {
          hideSuggest();
        }
      });
      suggestEl.addEventListener("click", (e) => {
        const item = e.target.closest(".wl-suggest-item");
        if (item) pickSuggestion(item.dataset.name);
      });
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".wl-input-wrap")) hideSuggest();
      });
      submitBtn.addEventListener("click", submitGuess);

      function renderShape(c) {
        shapeEl.innerHTML = silhouetteSVG(c);
      }

      function renderPast() {
        pastEl.innerHTML = "";
        // Sort by distance (closest first) — show all past guesses
        const sorted = guesses.slice().sort((a, b) => a.dist - b.dist);
        for (const g of sorted) {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "space-between";
          row.style.padding = "8px 12px";
          row.style.background = "var(--bg-elev)";
          row.style.border = "1px solid var(--border)";
          row.style.borderRadius = "var(--radius-sm)";
          row.style.fontWeight = "500";
          row.innerHTML = `<span>${g.name === target.name ? "🎯 " : ""}<b>${g.name}</b></span>
            <span style="font-family:var(--font-mono);color:var(--text-muted);">
              ${g.dist.toLocaleString()} km · ${g.dir}
            </span>`;
          pastEl.appendChild(row);
        }
      }

      function submitGuess() {
        if (over) return;
        const name = inputEl.value.trim();
        inputEl.value = "";
        if (!name) return;
        const c = COUNTRIES.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (!c) {
          AudioFX.error();
          statusEl.textContent = `"${name}" isn't one of the 30 countries`;
          statusEl.className = "status lose";
          later(() => {
            if (alive && !over) {
              statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
              statusEl.className = "status info";
            }
          }, 1500);
          return;
        }
        if (guesses.some(g => g.name === c.name)) {
          AudioFX.error();
          App.toast("Already guessed " + c.name, "info");
          return;
        }
        const dist = distance(c.lat, c.lon, target.lat, target.lon);
        const b = bearing(c.lat, c.lon, target.lat, target.lon);
        const dir = dirName(b);
        guesses.push({name: c.name, dist, dir});
        AudioFX.flip();
        renderPast();
        root.querySelector("#wl-used").textContent = guesses.length;

        if (revealed) {
          over = true;
          statusEl.textContent = `Solution revealed: ${target.name}`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (c.name === target.name) {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}! It's ${target.name}.`;
          statusEl.className = "status win";
          AudioFX.win();
          renderShape(target); // show with label
          shapeEl.innerHTML += `<div style="text-align:center;font-weight:700;margin-top:6px;">${target.name}</div>`;
          const best = Storage.getBest("worldle");
          if (!best || guesses.length < best) {
            Storage.setBest("worldle", guesses.length);
            root.querySelector("#wl-best").textContent = guesses.length;
            App.toast("New best: " + guesses.length + " tries", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `Out of guesses. The country was ${target.name}.`;
          statusEl.className = "status lose";
          AudioFX.lose();
          renderShape(target);
          shapeEl.innerHTML += `<div style="text-align:center;font-weight:700;margin-top:6px;">${target.name}</div>`;
        } else {
          statusEl.textContent = `${c.name}: ${dist.toLocaleString()} km · ${dir} — try ${guesses.length + 1}/${MAX}`;
        }
      }

      function doHint() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        if (hintsUsed >= MAX_HINTS) {
          App.toast(`No hints left (max ${MAX_HINTS} per game)`, "warning");
          return;
        }
        hintsUsed++;
        AudioFX.reveal();
        if (!continentHinted) {
          continentHinted = true;
          App.toast(`Hint: it's in ${target.cont}`, "info");
        } else {
          // Reveal first letter of country name
          App.toast(`Hint: the name starts with "${target.name[0]}"`, "info");
        }
      }

      function doSolve() {
        if (over) {
          App.toast("Game is over — start a new one", "info");
          return;
        }
        revealed = true;
        over = true;
        AudioFX.lose();
        renderShape(target);
        shapeEl.innerHTML += `<div style="text-align:center;font-weight:700;margin-top:6px;">${target.name}</div>`;
        statusEl.textContent = `Solution revealed: ${target.name}`;
        statusEl.className = "status lose";
        App.showModal("Worldle solution", `The country was: <b>${target.name}</b> (${target.cont})`);
      }

      function newGame() {
        target = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        guesses = [];
        over = false;
        revealed = false;
        hintsUsed = 0;
        continentHinted = false;
        root.querySelector("#wl-used").textContent = "0";
        const best = Storage.getBest("worldle");
        root.querySelector("#wl-best").textContent = best || "—";
        statusEl.textContent = "Guess the country from its silhouette — 6 tries";
        statusEl.className = "status info";
        renderShape(target);
        renderPast();
        inputEl.focus();
      }

      live = {hint: doHint, solve: doSolve};
      newGame();

      return function cleanup() {
        alive = false;
        live = null;
        pendingTimers.forEach(clearTimeout);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Worldle",
        `Guess the hidden country from its silhouette. You have <b>6 tries</b>.
        <br><br>Type a country name into the input (autocomplete from the 30 supported countries) and hit <b>Enter</b> or click <b>Guess</b>.
        <br><br>After each guess you'll see:
        <br>• the <b>distance</b> from your guess's capital to the target's capital, in km
        <br>• the <b>direction</b> from your guess to the target (N / NE / E / SE / S / SW / W / NW)
        <br><br>Past guesses are sorted by distance — closest first. The closer the distance, the nearer you are.
        <br><br>Stuck? Use the <b>Hint</b> button (max 2 — first reveals the continent, second reveals the first letter) or <b>Solve</b> (reveals the country and ends the game as a loss).
        <br><br>Best score = fewest guesses, tracked across sessions.`);
    },
  });
})();
