/* Concentration — memory match where you match words to their definitions (not identical pairs). */
(function () {
  const PAIRS = [
    {word: "Photosynthesis", def: "Plants making food from sunlight"},
    {word: "Gravity", def: "Force pulling objects toward Earth"},
    {word: "Volcano", def: "Mountain that erupts lava"},
    {word: "Democracy", def: "Government by the people"},
    {word: "Equator", def: "Imaginary line around Earth's middle"},
    {word: "Hibernation", def: "Long winter sleep of some animals"},
    {word: "Constellation", def: "Pattern of stars in the sky"},
    {word: "Friction", def: "Resistance when things rub together"},
    {word: "Magnetism", def: "Force that pulls iron objects"},
    {word: "Evaporation", def: "Liquid turning into vapor"},
    {word: "Ecosystem", def: "Community of living organisms and environment"},
    {word: "Velocity", def: "Speed in a given direction"},
    {word: "Atmosphere", def: "Layer of gases surrounding Earth"},
    {word: "Symmetry", def: "Mirror-image balance across a line"},
    {word: "Perimeter", def: "Distance around the edge of a shape"},
    {word: "Solar system", def: "Sun and the planets orbiting it"},
    {word: "Carnivore", def: "Animal that eats only meat"},
    {word: "Herbivore", def: "Animal that eats only plants"},
    {word: "Omnivore", def: "Animal that eats both plants and meat"},
    {word: "Condensation", def: "Gas turning into liquid"},
    {word: "Peninsula", def: "Land surrounded by water on three sides"},
    {word: "Penumbra", def: "Partial shadow during an eclipse"},
    {word: "Mammal", def: "Warm-blooded animal that feeds its young milk"},
    {word: "Reptile", def: "Cold-blooded animal with scales"},
    {word: "Invertebrate", def: "Animal without a backbone"},
    {word: "Renewable", def: "Resource that can be replenished naturally"},
    {word: "Fossil fuel", def: "Energy source from ancient plant/animal remains"},
    {word: "Greenhouse effect", def: "Trapping of heat by atmospheric gases"},
    {word: "Tectonic plate", def: "Large slab of Earth's crust"},
    {word: "Metamorphic", def: "Rock changed by heat and pressure"},
    {word: "Sediment", def: "Particles deposited by water/wind"},
    {word: "Biodiversity", def: "Variety of life in an ecosystem"},
    {word: "Habitat", def: "Natural home of an organism"},
    {word: "Predator", def: "Animal that hunts other animals"},
    {word: "Prey", def: "Animal hunted by others for food"},
    {word: "Nocturnal", def: "Active at night"},
    {word: "Migrate", def: "Travel seasonally from one region to another"},
    {word: "Camouflage", def: "Blending in with the environment"},
    {word: "Symbiosis", def: "Close relationship between different species"},
    {word: "Latitude", def: "Distance north/south of the equator"},
    {word: "Longitude", def: "Distance east/west of the prime meridian"},
    {word: "Penicillin", def: "First antibiotic discovered by Fleming"},
    {word: "Velocity", def: "Speed in a specific direction"},
    {word: "Acceleration", def: "Rate of change of velocity"},
    {word: "Inertia", def: "Resistance to changes in motion"},
    {word: "Newton", def: "Unit of force (also the scientist)"},
    {word: "Molecule", def: "Group of atoms bonded together"},
    {word: "Isotope", def: "Atoms with same protons, different neutrons"},
    {word: "Nucleus", def: "Central core of an atom or cell"},
    {word: "Mitosis", def: "Process of cell division"},
  ];
  const PER_GAME = 8; // pairs
  let live = null;
  GameRegistry.register({
    id: "concentration",
    name: "Concentration",
    icon: "🧠",
    category: "strategy",
    description: "Memory match — pair each word with its definition",
    tags: ["memory", "vocabulary", "matching"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "medium",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let cards = [], flipped = [], matched = new Set(), moves = 0, over = false, lock = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Moves</div><div class="val" id="cn-moves">0</div></div>
          <div class="score-cell"><div class="label">Pairs</div><div class="val" id="cn-pairs">0/${PER_GAME}</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="cn-best">—</div></div>
        </div>
        <div class="status info" id="cn-status">Flip two cards: a word and its matching definition.</div>
        <div class="center" style="margin:14px 0;"><div id="cn-grid"></div></div>
        <button class="btn" id="cn-restart">Restart</button>
      `;
      const statusEl = root.querySelector("#cn-status");
      const gridEl = root.querySelector("#cn-grid");
      if (!document.getElementById("cn-style")) {
        const s = document.createElement("style");
        s.id = "cn-style";
        s.textContent = `#cn-grid{display:grid;grid-template-columns:repeat(4,120px);gap:8px;}.cn-card{height:80px;border-radius:var(--radius-sm);background:var(--accent);color:#fff;display:grid;place-items:center;cursor:pointer;font-weight:700;font-size:0.85rem;text-align:center;padding:6px;user-select:none;transition:transform 0.15s;}.cn-card.flipped{background:var(--bg-elev);color:var(--text);border:2px solid var(--accent);transform:rotateY(0);}.cn-card.matched{background:var(--success);color:#fff;border-color:var(--success);cursor:default;}`;
        document.head.appendChild(s);
      }

      function render() {
        gridEl.innerHTML = "";
        cards.forEach((c, i) => {
          const el = document.createElement("div");
          el.className = "cn-card";
          if (matched.has(i)) el.classList.add("matched");
          else if (flipped.includes(i)) el.classList.add("flipped");
          else el.textContent = "?";
          if (flipped.includes(i) || matched.has(i)) el.textContent = c.text;
          el.addEventListener("click", () => flip(i));
          gridEl.appendChild(el);
        });
        root.querySelector("#cn-moves").textContent = moves;
        root.querySelector("#cn-pairs").textContent = `${matched.size / 2}/${PER_GAME}`;
      }

      function flip(i) {
        if (over || lock) return;
        if (matched.has(i) || flipped.includes(i)) return;
        if (flipped.length >= 2) return;
        AudioFX.flip();
        flipped.push(i);
        if (flipped.length === 2) {
          moves++;
          const [a, b] = flipped;
          const ca = cards[a], cb = cards[b];
          if (ca.pairId === cb.pairId && ca.type !== cb.type) {
            // match!
            matched.add(a);
            matched.add(b);
            flipped = [];
            AudioFX.pop();
            statusEl.textContent = "✓ Match!";
            statusEl.className = "status win";
            if (matched.size === cards.length) {
              over = true;
              AudioFX.win();
              statusEl.textContent = `🎉 All pairs found in ${moves} moves!`;
              statusEl.className = "status win";
              const best = Storage.getBest("concentration");
              if (!best || moves < best) {
                Storage.setBest("concentration", moves);
                root.querySelector("#cn-best").textContent = moves;
                App.toast("New best!", "success");
              }
            }
          } else {
            lock = true;
            AudioFX.error();
            statusEl.textContent = "✗ Not a match.";
            statusEl.className = "status lose";
            setTimeout(() => {
              if (!alive) return;
              if (!alive) return;
              flipped = [];
              lock = false;
              render();
            }, 1100);
          }
        }
        render();
      }

      function newGame() {
        const pairs = PAIRS.slice().sort(() => Math.random() - 0.5).slice(0, PER_GAME);
        cards = [];
        pairs.forEach((p, id) => {
          cards.push({pairId: id, type: "word", text: p.word});
          cards.push({pairId: id, type: "def", text: p.def});
        });
        cards.sort(() => Math.random() - 0.5);
        flipped = [];
        matched = new Set();
        moves = 0;
        over = false;
        lock = false;
        root.querySelector("#cn-best").textContent = Storage.getBest("concentration") || "—";
        statusEl.textContent = "Flip two cards: a word and its definition.";
        statusEl.className = "status info";
        render();
      }

      root.querySelector("#cn-restart").addEventListener("click", () => {
        AudioFX.click();
        newGame();
      });
      live = {newGame};
      newGame();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Concentration",
        `This isn't your ordinary memory game — instead of matching identical cards, you must match each <b>word</b> with its <b>definition</b>.
        <br><br>Flip two cards per turn. If they form a word/definition pair, they stay flipped. Otherwise they flip back.
        <br><br>Find all ${8} pairs in as few moves as possible.`);
    },
  });
})();
