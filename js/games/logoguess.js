/* Logo Guess — guess the brand from a text description (no actual logos for copyright). */
(function () {
  const QUESTIONS = [
    {
      q: "Red-and-white soft drink brand from Atlanta, founded 1892",
      opts: ["Pepsi", "Coca-Cola", "Dr Pepper", "Fanta"],
      a: 1
    },
    {
      q: "Golden arches — fast-food burger chain from the USA",
      opts: ["Burger King", "Wendy's", "McDonald's", "KFC"],
      a: 2
    },
    {q: "Tech giant from Cupertino, known for iPhone & Mac", opts: ["Microsoft", "Apple", "Google", "Samsung"], a: 1},
    {q: "Search giant whose name became a verb, colorful logo", opts: ["Yahoo", "Bing", "DuckDuckGo", "Google"], a: 3},
    {q: "Swoosh logo, sports apparel giant from Oregon", opts: ["Adidas", "Nike", "Puma", "Reebok"], a: 1},
    {q: "Three-stripe brand, German sportswear maker", opts: ["Adidas", "Nike", "Under Armour", "Fila"], a: 0},
    {q: "Luxury car maker with four interlocking rings", opts: ["BMW", "Mercedes", "Audi", "Volkswagen"], a: 2},
    {q: "Bavarian car maker with a round blue-and-white logo", opts: ["BMW", "Audi", "Porsche", "Opel"], a: 0},
    {q: "Starbucks uses this sea-creature on its logo", opts: ["Mermaid", "Octopus", "Whale", "Dolphin"], a: 0},
    {q: "Online retailer whose smile arrow goes A to Z", opts: ["eBay", "Amazon", "Alibaba", "Walmart"], a: 1},
    {q: "Streaming giant with the red 'N' logo on black", opts: ["Hulu", "Disney+", "Netflix", "Prime Video"], a: 2},
    {q: "Social app with the blue bird mascot (now X)", opts: ["Twitter", "Instagram", "Snapchat", "TikTok"], a: 0},
    {q: "Coffee chain named after a Moby Dick character", opts: ["Costa", "Starbucks", "Tim Hortons", "Dunkin'"], a: 1},
    {q: "Toyota's luxury brand, name means 'law' in Latin", opts: ["Acura", "Lexus", "Infiniti", "Genesis"], a: 1},
    {q: "Iconic red tractor-bean coffee can, Italian brand", opts: ["Lavazza", "Illy", "Segafredo", "Kimbo"], a: 1},
    {q: "Ride-sharing app with a black-and-white wheel logo", opts: ["Lyft", "Uber", "Bolt", "DiDi"], a: 1},
    {q: "Swedish furniture giant, blue-and-yellow logo, flat-pack", opts: ["IKEA", "Wayfair", "Muji", "Tesco"], a: 0},
    {q: "Camera film brand with red-and-yellow block logo", opts: ["Kodak", "Fujifilm", "Polaroid", "Leica"], a: 0},
    {q: "Sportswear brand with a puma leaping logo", opts: ["Puma", "Adidas", "Reebok", "New Balance"], a: 0},
    {q: "French yogurt brand whose logo is a little boy", opts: ["Yoplait", "Danone", "Activia", "Liberté"], a: 0},
    {q: "Cola brand with a red-and-white swirl logo", opts: ["Pepsi", "Coca-Cola", "RC Cola", "Dr Pepper"], a: 0},
    {q: "Soda brand with a blue-red-blue circle logo", opts: ["Pepsi", "Coke", "Sprite", "7Up"], a: 0},
    {
      q: "Lemon-lime soda, green bottle, clear caffeine-free",
      opts: ["Sprite", "7Up", "Mountain Dew", "Sierra Mist"],
      a: 0
    },
    {
      q: "Tech giant whose logo is 4 colored squares (red, green, blue, yellow)",
      opts: ["Apple", "Microsoft", "Google", "IBM"],
      a: 1
    },
    {q: "Social network with a blue 'f' logo", opts: ["Facebook", "Twitter", "LinkedIn", "TikTok"], a: 0},
    {
      q: "Photo-sharing app with a Polaroid-like camera logo",
      opts: ["Instagram", "Snapchat", "Pinterest", "Flickr"],
      a: 0
    },
    {
      q: "App whose logo is a friendly ghost on a yellow background",
      opts: ["Snapchat", "WhatsApp", "TikTok", "Discord"],
      a: 0
    },
    {q: "Streaming service with a green play-button on black", opts: ["Netflix", "Hulu", "Spotify", "Disney+"], a: 2},
    {q: "Music streaming service known for green logo", opts: ["Pandora", "Spotify", "Apple Music", "Tidal"], a: 1},
    {q: "Computer brand with a pear-like fruit logo (similar to Apple)", opts: ["Pear", "Acer", "Asus", "HP"], a: 0},
    {q: "Car brand with an oval blue logo and name across it", opts: ["Ford", "Chevy", "Tesla", "Honda"], a: 0},
    {q: "EV maker whose logo is a stylized 'T' for a vertical motor", opts: ["Tesla", "Rivian", "Lucid", "Nio"], a: 0},
    {q: "Luxury car maker with a silver three-pointed star", opts: ["Audi", "BMW", "Mercedes-Benz", "Porsche"], a: 2},
    {
      q: "Sports car maker with a black prancing horse logo",
      opts: ["Ferrari", "Lamborghini", "Porsche", "Maserati"],
      a: 0
    },
    {
      q: "Italian supercar maker with a yellow-and-black bull logo",
      opts: ["Ferrari", "Lamborghini", "Pagani", "Alfa Romeo"],
      a: 1
    },
    {q: "Video game console brand with a green 'X' logo", opts: ["Xbox", "PlayStation", "Nintendo", "Atari"], a: 0},
    {q: "Japanese console brand with the letters PS", opts: ["Xbox", "PlayStation", "Sega", "Nintendo"], a: 1},
    {
      q: "Gaming company whose logo has a red 'N' in a white square",
      opts: ["Nintendo", "PlayStation", "Xbox", "Sega"],
      a: 0
    },
    {q: "Phone brand whose logo is a half-eaten apple", opts: ["Apple", "Samsung", "Huawei", "Nokia"], a: 0},
    {q: "Phone maker with a blue 'S' logo, Galaxy series", opts: ["Sony", "Samsung", "Siemens", "Sharp"], a: 1},
    {
      q: "Finnish phone brand known for its tough 'bricks', blue logo",
      opts: ["Ericsson", "Nokia", "Motorola", "Siemens"],
      a: 1
    },
    {
      q: "Bluetooth company known for its enterprise phones, Canadian",
      opts: ["BlackBerry", "Nokia", "Apple", "Samsung"],
      a: 0
    },
    {q: "Software giant whose logo is a 4-color window flag", opts: ["Apple", "Microsoft", "Linux", "Sun"], a: 1},
    {q: "Browser company whose logo is a red dinosaur-like dino", opts: ["Firefox", "Chrome", "Safari", "Edge"], a: 0},
    {q: "Browser whose logo is a red, yellow, green, blue circle", opts: ["Firefox", "Chrome", "Edge", "Brave"], a: 1},
    {
      q: "Bank with a brown-and-yellow credit-card shaped 'C' logo",
      opts: ["Chase", "Capital One", "Citi", "Bank of America"],
      a: 1
    },
    {q: "Card brand with overlapping red-and-yellow circles", opts: ["Visa", "Mastercard", "Amex", "Discover"], a: 1},
    {q: "Card brand with blue-white-blue stripes", opts: ["Visa", "Mastercard", "Amex", "Discover"], a: 0},
    {q: "Sportswear brand with a checkmark-style 'swoosh'", opts: ["Adidas", "Nike", "Puma", "Reebok"], a: 1},
    {q: "Sportswear brand with a leaping cat logo", opts: ["Puma", "Adidas", "Nike", "Fila"], a: 0},
    {q: "Sportswear brand with a 'RBK' or Union Jack flag", opts: ["Reebok", "Nike", "Adidas", "Umbro"], a: 0},
    {
      q: "Pizza chain known for red roof and 'Pizza Pizza' slogan",
      opts: ["Domino's", "Pizza Hut", "Papa John's", "Little Caesars"],
      a: 3
    },
    {
      q: "Pizza chain with a red domino tile logo",
      opts: ["Domino's", "Pizza Hut", "Papa John's", "Little Caesars"],
      a: 0
    },
    {
      q: "Fried chicken chain with the Colonel's face on logo",
      opts: ["Chick-fil-A", "KFC", "Popeyes", "Church's"],
      a: 1
    },
    {
      q: "Burger chain with a crown logo and 'Have it your way'",
      opts: ["McDonald's", "Burger King", "Wendy's", "Five Guys"],
      a: 1
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "logoguess",
    name: "Logo Guess",
    icon: "🏷️",
    category: "quiz",
    description: "Guess the brand from a text description (no logos for copyright)",
    tags: ["quiz", "brands", "trivia"],
    age: ["teens", "adults"],
    difficulty: "medium",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="lg-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="lg-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="lg-b">—</div></div>
        </div>
        <div class="status info" id="lg-status">Read the description, then pick the matching brand.</div>
        <div id="lg-q-text" style="text-align:center;font-size:1.15rem;font-weight:600;margin:20px 0;padding:14px;background:var(--bg-soft);border-radius:var(--radius);"></div>
        <div id="lg-options" class="col" style="gap:8px;max-width:440px;margin:0 auto;"></div>
        <p class="hint">${PER} brand descriptions. Each correct = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#lg-status");
      const qEl = root.querySelector("#lg-q-text");
      const optsEl = root.querySelector("#lg-options");
      root.querySelector("#lg-b").textContent = Storage.getBest("logoguess") || "—";

      function render() {
        if (idx >= qs.length) return finish();
        const cur = qs[idx];
        qEl.textContent = cur.q;
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#lg-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#lg-s").textContent = score;
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
        qEl.textContent = "🎉";
        optsEl.innerHTML = "";
        const best = Storage.getBest("logoguess");
        if (!best || score > best) {
          Storage.setBest("logoguess", score);
          root.querySelector("#lg-b").textContent = score;
          App.toast("New best: " + score, "success");
        }
        const replayBtn = document.createElement("button");
        replayBtn.className = "btn primary";
        replayBtn.textContent = "Play again";
        replayBtn.addEventListener("click", () => newRound());
        optsEl.appendChild(replayBtn);
      }

      function newRound() {
        qs = QUESTIONS.slice().sort(() => Math.random() - 0.5).slice(0, PER);
        idx = 0;
        score = 0;
        answered = false;
        root.querySelector("#lg-b").textContent = Storage.getBest("logoguess") || "—";
        statusEl.textContent = "Read the description, then pick the matching brand.";
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
      App.showModal("How to play Logo Guess",
        `Read a short description of a famous brand and pick the matching name from the multiple-choice options.
        <br><br>No logos are shown (for copyright reasons) — it's all about recognizing brands by their traits and histories.
        <br><br>${PER} questions per round. Each correct = <b>10 points</b>.`);
    },
  });
})();
