/* Logic Grid — Einstein puzzle: use clues to match people to attributes in a grid. */
(function () {
  const PUZZLES = [
    {
      theme: "Pets & Houses",
      people: ["Alice", "Ben", "Cara"],
      attributes: [
        {name: "Pet", values: ["Cat", "Dog", "Fish"]},
        {name: "House", values: ["Red", "Blue", "Green"]},
        {name: "Drink", values: ["Tea", "Coffee", "Juice"]},
      ],
      solution: {
        Alice: {Pet: "Cat", House: "Red", Drink: "Tea"},
        Ben: {Pet: "Dog", House: "Blue", Drink: "Coffee"},
        Cara: {Pet: "Fish", House: "Green", Drink: "Juice"}
      },
      clues: [
        "Alice owns the Cat.",
        "The Coffee drinker lives in the Blue house.",
        "Cara drinks Juice.",
        "The Fish owner lives in the Green house.",
        "Ben does not own the Cat.",
      ],
    },
    {
      theme: "Hobbies & Ages",
      people: ["Dan", "Eve", "Finn"],
      attributes: [
        {name: "Hobby", values: ["Reading", "Painting", "Music"]},
        {name: "Age", values: ["20", "30", "40"]},
        {name: "City", values: ["Paris", "Rome", "Tokyo"]},
      ],
      solution: {
        Dan: {Hobby: "Reading", Age: "20", City: "Paris"},
        Eve: {Hobby: "Painting", Age: "30", City: "Rome"},
        Finn: {Hobby: "Music", Age: "40", City: "Tokyo"}
      },
      clues: [
        "Dan is 20 years old.",
        "The Painter lives in Rome.",
        "Finn enjoys Music.",
        "The 40-year-old lives in Tokyo.",
        "Eve is not 20.",
      ],
    },
    {
      theme: "Cars & Colors",
      people: ["Gus", "Hana", "Ivan"],
      attributes: [
        {name: "Car", values: ["Sedan", "SUV", "Sports"]},
        {name: "Color", values: ["Black", "White", "Yellow"]},
        {name: "Job", values: ["Doctor", "Lawyer", "Chef"]},
      ],
      solution: {
        Gus: {Car: "Sedan", Color: "Black", Job: "Doctor"},
        Hana: {Car: "SUV", Color: "White", Job: "Lawyer"},
        Ivan: {Car: "Sports", Color: "Yellow", Job: "Chef"}
      },
      clues: [
        "Gus drives the Sedan.",
        "The Lawyer drives the White car.",
        "Ivan is the Chef.",
        "The Sports car is Yellow.",
        "Hana is not the Doctor.",
      ],
    },
  ];

  let live = null;
  GameRegistry.register({
    id: "logicgrid",
    name: "Logic Grid",
    icon: "🧩",
    category: "logic",
    description: "Einstein puzzle — use clues to match people to attributes",
    tags: ["logic", "deduction", "einstein"],
    age: ["teens", "adults"],
    difficulty: "hard",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let p = null, picks = {}; // picks[person][attrName] = value

      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Theme</div><div class="val" id="lg-theme" style="font-size:0.9rem;">—</div></div>
          <div class="score-cell"><div class="label">Filled</div><div class="val" id="lg-filled">0/9</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lg-best">—</div></div>
        </div>
        <div class="status info" id="lg-status">Read the clues, then click empty cells to assign values.</div>
        <div id="lg-clues" class="col" style="gap:4px;max-width:520px;margin:10px auto;padding:10px;background:var(--bg-soft);border-radius:var(--radius);"></div>
        <div id="lg-grid" style="overflow-x:auto;margin:10px 0;"></div>
        <div class="row" style="justify-content:center;gap:8px;">
          <button class="btn" id="lg-new">New Puzzle</button>
          <button class="btn primary" id="lg-check">Check</button>
        </div>
        <p class="hint">Each row = person, each column = attribute. Click a cell to cycle through possible values.</p>
      `;
      const statusEl = root.querySelector("#lg-status");
      const cluesEl = root.querySelector("#lg-clues");
      const gridEl = root.querySelector("#lg-grid");
      root.querySelector("#lg-best").textContent = Storage.getBest("logicgrid") ?? "—";

      function newGame() {
        p = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
        picks = {};
        p.people.forEach(person => {
          picks[person] = {};
          p.attributes.forEach(a => picks[person][a.name] = null);
        });
        root.querySelector("#lg-theme").textContent = p.theme;
        cluesEl.innerHTML = p.clues.map(c => `<div style="padding:4px 8px;font-size:0.95rem;"><b>•</b> ${c}</div>`).join("");
        render();
      }

      function render() {
        const cols = p.attributes;
        const colW = Math.max(80, Math.floor(560 / (cols.length + 1)));
        let html = `<table style="border-collapse:collapse;margin:0 auto;font-size:0.85rem;"><thead><tr><th style="padding:6px;width:${colW}px;text-align:left;background:var(--bg-elev);">Person</th>`;
        cols.forEach(a => {
          html += `<th style="padding:6px;width:${colW}px;background:var(--bg-elev);">${a.name}</th>`;
        });
        html += "</tr></thead><tbody>";
        p.people.forEach(person => {
          html += `<tr><td style="padding:6px;font-weight:700;background:var(--bg-elev);">${person}</td>`;
          cols.forEach(a => {
            const v = picks[person][a.name];
            const idx = v ? a.values.indexOf(v) : -1;
            const ok = v && v === p.solution[person][a.name];
            const bg = v ? (ok ? "var(--success)" : "var(--danger)") : "var(--bg-soft)";
            const color = v ? "#fff" : "var(--text-muted)";
            html += `<td data-person="${person}" data-attr="${a.name}" style="padding:6px;text-align:center;background:${bg};color:${color};cursor:pointer;user-select:none;font-weight:600;">${v || "—"}</td>`;
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
        gridEl.innerHTML = html;
        gridEl.querySelectorAll("td[data-person]").forEach(td => {
          td.addEventListener("click", () => {
            const person = td.dataset.person, attr = td.dataset.attr;
            const a = p.attributes.find(x => x.name === attr);
            const cur = picks[person][attr];
            const idx = cur ? a.values.indexOf(cur) : -1;
            picks[person][attr] = a.values[(idx + 1) % a.values.length];
            AudioFX.tick();
            render();
          });
        });
        let filled = 0;
        p.people.forEach(person => p.attributes.forEach(a => {
          if (picks[person][a.name]) filled++;
        }));
        root.querySelector("#lg-filled").textContent = `${filled}/${p.people.length * p.attributes.length}`;
      }

      function check() {
        let allCorrect = true;
        p.people.forEach(person => {
          p.attributes.forEach(a => {
            if (picks[person][a.name] !== p.solution[person][a.name]) allCorrect = false;
          });
        });
        if (allCorrect) {
          AudioFX.win();
          statusEl.textContent = "🎉 Solved! All attributes match!";
          statusEl.className = "status win";
          const best = Storage.getBest("logicgrid");
          if (best === null) {
            Storage.setBest("logicgrid", 1);
            root.querySelector("#lg-best").textContent = 1;
            App.toast("Solved!", "success");
          }
        } else {
          AudioFX.error();
          statusEl.textContent = "Not yet — wrong cells are red, correct ones green.";
          statusEl.className = "status lose";
        }
      }

      root.querySelector("#lg-check").addEventListener("click", check);
      root.querySelector("#lg-new").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });

      function doSolve() {
        p.people.forEach(person => p.attributes.forEach(a => picks[person][a.name] = p.solution[person][a.name]));
        AudioFX.reveal();
        render();
        statusEl.textContent = "Solution revealed";
        statusEl.className = "status lose";
      }

      live = {solve: doSolve};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Logic Grid",
        `You're given a list of <b>clues</b> and a grid of people × attributes. Click a cell to cycle through possible values for that attribute.
        <br><br>Use the clues to deduce which value belongs to which person. Each attribute value is used exactly once.
        <br><br>Press <b>Check</b> — correct cells turn green, wrong ones turn red.`);
    },
  });
})();
