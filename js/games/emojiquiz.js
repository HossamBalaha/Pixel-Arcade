/* Emoji Quiz — guess the movie/song/phrase from emoji clues. */
(function () {
  const QUESTIONS = [
    {cat: "Movies", q: "🦁👑", opts: ["Lion King", "Madagascar", "Tarzan", "Zootopia"], a: 0},
    {cat: "Movies", q: "❄️👸🏔️", opts: ["Moana", "Frozen", "Tangled", "Brave"], a: 1},
    {cat: "Movies", q: "🐠🔍", opts: ["Shark Tale", "Finding Nemo", "Aquaman", "Splash"], a: 1},
    {cat: "Movies", q: "🤖❤️🌻", opts: ["Wall-E", "Big Hero 6", "Robots", "A.I."], a: 0},
    {cat: "Movies", q: "🦇🃏", opts: ["Spider-Man", "Iron Man", "Batman", "Hulk"], a: 2},
    {cat: "Movies", q: "🦖🏝️", opts: ["King Kong", "Jurassic Park", "Godzilla", "Tremors"], a: 1},
    {cat: "Movies", q: "🚢💔", opts: ["Titanic", "Poseidon", "Speed", "Cast Away"], a: 0},
    {cat: "Movies", q: "👽📞", opts: ["Alien", "E.T.", "Arrival", "Signs"], a: 1},
    {cat: "Songs", q: "🌧️ mannen ☔", opts: ["Purple Rain", "Singing in the Rain", "Raindrops", "Umbrella"], a: 0},
    {cat: "Songs", q: "🎤🪩🕺", opts: ["YMCA", "Dancing Queen", "Boogie Nights", "Stayin' Alive"], a: 1},
    {cat: "Songs", q: "🪐🎷", opts: ["Fly Me to the Moon", "Space Oddity", "Rocket Man", "Starman"], a: 0},
    {cat: "Songs", q: "🔥🐉", opts: ["Roar", "Firework", "Baby One More Time", "Dark Horse"], a: 1},
    {
      cat: "Phrases",
      q: "🐱👜",
      opts: ["Cat in the Hat", "Cat got your tongue", "Cat in a bag", "Cats out of the bag"],
      a: 3
    },
    {
      cat: "Phrases",
      q: "🌧️🐈🶜",
      opts: ["Raining cats and dogs", "It's pouring", "Under the weather", "Cats and dogs"],
      a: 0
    },
    {cat: "Phrases", q: "🍎🌳", opts: ["Apple of my eye", "Bad apple", "Apple a day", "Tree of life"], a: 0},
    {
      cat: "Phrases",
      q: "🪨🪨🪨",
      opts: ["Between a rock and a hard place", "Solid as a rock", "Rock and roll", "Rock the boat"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🦴🐕",
      opts: ["Dog tired", "Barking up the wrong tree", "Throw me a bone", "Every dog has its day"],
      a: 2
    },
    {cat: "Songs", q: "🎆🎶", opts: ["Firework", "We Will Rock You", "September", "Don't Stop Believin'"], a: 0},
    {cat: "Movies", q: "🐷🐺🏠", opts: ["Three Little Pigs", "Babe", "Charlotte's Web", "Animal Farm"], a: 0},
    {cat: "Movies", q: "🐼🥋", opts: ["Kung Fu Panda", "Crouching Tiger", "IP Man", "The Karate Kid"], a: 0},
    {cat: "Movies", q: "🕷️👨", opts: ["Spider-Man", "Ant-Man", "Batman", "Iron Man"], a: 0},
    {cat: "Movies", q: "🤠🚀", opts: ["Toy Story", "Wall-E", "Up", "Monsters, Inc."], a: 0},
    {cat: "Movies", q: "👹🧅", opts: ["Shrek", "Trolls", "Coco", "Onward"], a: 0},
    {cat: "Movies", q: "🐠🐟🌊", opts: ["Finding Nemo", "The Little Mermaid", "Aquaman", "Moana"], a: 0},
    {
      cat: "Movies",
      q: "🧙‍♂️💍🌋",
      opts: ["The Lord of the Rings", "Harry Potter", "The Hobbit", "Game of Thrones"],
      a: 0
    },
    {cat: "Movies", q: "🕷️🕸️", opts: ["Spider-Man", "The Fly", "Arachnophobia", "Eight Legged Freaks"], a: 0},
    {cat: "Movies", q: "🚀🦁", opts: ["The Lion King", "Astro Boy", "Space Cats", "Treasure Planet"], a: 0},
    {
      cat: "Movies",
      q: "🐢🍕",
      opts: ["Teenage Mutant Ninja Turtles", "Pizza Planet", "Ratatouille", "Kung Fu Panda"],
      a: 0
    },
    {cat: "Movies", q: "🏰🧚‍♀️", opts: ["Tangled", "Sleeping Beauty", "Beauty and the Beast", "Cinderella"], a: 1},
    {cat: "Movies", q: "👨‍👩‍👧‍👦🦸‍♂️", opts: ["The Incredibles", "Despicable Me", "Big Hero 6", "Megamind"], a: 0},
    {cat: "Movies", q: "🐜🦸", opts: ["Ant-Man", "Spider-Man", "Iron Man", "Black Panther"], a: 0},
    {cat: "Movies", q: "🎭💑", opts: ["Romeo + Juliet", "Titanic", "La La Land", "The Notebook"], a: 0},
    {cat: "Movies", q: "👑👑👑", opts: ["Three Kings", "Three Queens", "Game of Thrones", "The Crown"], a: 2},
    {cat: "Movies", q: "🧊🚢", opts: ["Titanic", "The Perfect Storm", "Speed", "Poseidon"], a: 0},
    {cat: "Movies", q: "🐰🥕", opts: ["Peter Rabbit", "Zootopia", "Hop", "Who Framed Roger Rabbit"], a: 0},
    {cat: "Movies", q: "🧟‍♂️🔫", opts: ["Resident Evil", "World War Z", "Dawn of the Dead", "Shaun of the Dead"], a: 3},
    {cat: "Songs", q: "🌧️☂️", opts: ["Umbrella", "Singing in the Rain", "Purple Rain", "Raindrops"], a: 0},
    {cat: "Songs", q: "🎶✋", opts: ["Don't Stop Believin'", "Stop!", "Hold On", "Stayin' Alive"], a: 0},
    {
      cat: "Songs",
      q: "🎶🌊",
      opts: ["Sittin' on the Dock of the Bay", "Beyond the Sea", "Ocean Eyes", "Under the Sea"],
      a: 2
    },
    {
      cat: "Songs",
      q: "🦁👑🎵",
      opts: ["Hakuna Matata", "Circle of Life", "Can You Feel the Love Tonight", "Just Can't Wait to Be King"],
      a: 1
    },
    {cat: "Songs", q: "💃🕺", opts: ["Dancing Queen", "Stayin' Alive", "YMCA", "I Will Survive"], a: 0},
    {cat: "Songs", q: "🏍️🌬️", opts: ["Born to be Wild", "Highway to Hell", "Roadhouse Blues", "Wild Thing"], a: 0},
    {cat: "Songs", q: "🪐🚀", opts: ["Rocket Man", "Space Oddity", "Fly Me to the Moon", "Starman"], a: 0},
    {
      cat: "Phrases",
      q: "🐄🌙",
      opts: ["Over the moon", "Once in a blue moon", "Cry over spilled milk", "Holy cow"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🐴 gift",
      opts: ["Don't look a gift horse in the mouth", "Hold your horses", "Beat a dead horse", "Wild horses"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🪶🦜",
      opts: ["Birds of a feather flock together", "Kill two birds with one stone", "Free as a bird", "Early bird catches the worm"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🔥🔥",
      opts: ["Playing with fire", "Out of the frying pan", "Add fuel to the fire", "Where there's smoke, there's fire"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🐘 room",
      opts: ["Elephant in the room", "White elephant", "Memory like an elephant", "Pink elephant"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🚪🚶",
      opts: ["Show someone the door", "Foot in the door", "Knock on wood", "Door to door"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🐍👁️",
      opts: ["Snake in the grass", "As the crow flies", "As blind as a bat", "As slippery as an eel"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🍎 fall",
      opts: ["Bad apple", "Apple of my eye", "The apple doesn't fall far from the tree", "An apple a day"],
      a: 2
    },
    {
      cat: "Phrases",
      q: "🌧️🐕🐈",
      opts: ["It's raining cats and dogs", "It's pouring", "Under the weather", "Dogs and cats"],
      a: 0
    },
    {
      cat: "Phrases",
      q: "🐓⚔️",
      opts: ["Cock of the walk", "Cockfight", "As proud as a peacock", "Don't count your chickens before they hatch"],
      a: 3
    },
    {
      cat: "Phrases",
      q: "🦆 row",
      opts: ["Get your ducks in a row", "Like a duck to water", "Lame duck", "Duck out"],
      a: 0
    },
    {cat: "Phrases", q: "🦢 song", opts: ["Swan song", "Black swan", "Ugly duckling", "Wild goose chase"], a: 0},
  ];
  const PER = 10;

  let live = null;
  GameRegistry.register({
    id: "emojiquiz",
    name: "Emoji Quiz",
    icon: "🤔",
    category: "quiz",
    description: "Guess the movie, song or phrase from emoji clues",
    tags: ["quiz", "emoji", "trivia"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="eq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="eq-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="eq-b">—</div></div>
        </div>
        <div class="status info" id="eq-status">Pick the answer that matches the emoji clue.</div>
        <div id="eq-cat" style="text-align:center;color:var(--text-muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:2px;margin:6px 0;"></div>
        <div id="eq-emoji" style="text-align:center;font-size:3rem;margin:18px 0;"></div>
        <div id="eq-options" class="col" style="gap:8px;max-width:400px;margin:0 auto;"></div>
        <p class="hint">${PER} questions. Correct = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#eq-status");
      const emojiEl = root.querySelector("#eq-emoji");
      const catEl = root.querySelector("#eq-cat");
      const optsEl = root.querySelector("#eq-options");
      root.querySelector("#eq-b").textContent = Storage.getBest("emojiquiz") || "—";

      function render() {
        if (idx >= qs.length) return finish();
        const cur = qs[idx];
        emojiEl.textContent = cur.q;
        catEl.textContent = cur.cat;
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#eq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#eq-s").textContent = score;
      }

      function answer(i, btn) {
        if (answered) return;
        answered = true;
        const cur = qs[idx];
        if (i === cur.a) {
          btn.style.background = "var(--success)";
          btn.style.color = "#fff";
          score += 10;
          AudioFX.pop();
          statusEl.textContent = "✓ Correct!";
          statusEl.className = "status win";
        } else {
          btn.style.background = "var(--danger)";
          btn.style.color = "#fff";
          AudioFX.error();
          Array.from(optsEl.children).forEach((b, j) => {
            if (j === cur.a) {
              b.style.background = "var(--success)";
              b.style.color = "#fff";
            }
          });
          statusEl.textContent = `✗ Answer: "${cur.opts[cur.a]}"`;
          statusEl.className = "status lose";
        }
        setTimeout(() => {
          if (!alive) return;
          if (!alive) return;
          answered = false;
          idx++;
          render();
        }, 1300);
      }

      function finish() {
        AudioFX.win();
        statusEl.textContent = `🏁 Round complete! Score: ${score}/${PER * 10}`;
        statusEl.className = "status win";
        emojiEl.textContent = "🎉";
        catEl.textContent = "Game Over";
        optsEl.innerHTML = "";
        const best = Storage.getBest("emojiquiz");
        if (!best || score > best) {
          Storage.setBest("emojiquiz", score);
          root.querySelector("#eq-b").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => {
          newRound();
        });
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#eq-b").textContent = Storage.getBest("emojiquiz") || "—";
        statusEl.textContent = "Pick the answer that matches the emoji clue.";
        statusEl.className = "status info";
        render();
      }

      live = {};
      newRound();
      return function cleanup() {
        alive = false;
        live = null;
      };
    },
    help: function () {
      App.showModal("How to play Emoji Quiz",
        `Each round shows a clue made of emojis representing a movie, song, or common phrase.
        <br><br>Pick the right answer from the multiple-choice options. ${PER} questions per round, each correct answer = <b>10 points</b>.`);
    },
  });
})();
