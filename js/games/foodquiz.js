/* Food Quiz — guess the dish from its ingredients list. */
(function () {
  const QUESTIONS = [
    {ingredients: "Tortilla, beef, cheese, lettuce, salsa", opts: ["Burrito", "Taco", "Quesadilla", "Enchilada"], a: 1},
    {
      ingredients: "Pasta, egg, cheese, black pepper, bacon",
      opts: ["Carbonara", "Alfredo", "Bolognese", "Cacio e Pepe"],
      a: 0
    },
    {
      ingredients: "Rice, raw fish, wasabi, soy sauce",
      opts: ["Sashimi", "Nigiri Sushi", "Maki Roll", "Tempura"],
      a: 1
    },
    {
      ingredients: "Bread, beef patty, cheese, lettuce, tomato, bun",
      opts: ["Hot Dog", "Cheeseburger", "Sandwich", "Sub"],
      a: 1
    },
    {
      ingredients: "Pizza dough, tomato, mozzarella, basil",
      opts: ["Margherita Pizza", "Pepperoni", "Calzone", "Marinara"],
      a: 0
    },
    {
      ingredients: "Avocado, lime, onion, tomato, cilantro, chili",
      opts: ["Salsa", "Guacamole", "Pico de Gallo", "Ceviche"],
      a: 1
    },
    {
      ingredients: "Chicken, butter, tomato, cream, spices",
      opts: ["Tikka Masala", "Butter Chicken", "Korma", "Vindaloo"],
      a: 1
    },
    {ingredients: "Soy sauce, noodles, pork, egg, scallions", opts: ["Ramen", "Udon", "Yakisoba", "Lo Mein"], a: 3},
    {
      ingredients: "Rice, saffron, chicken, seafood, vegetables",
      opts: ["Paella", "Risotto", "Biryani", "Jambalaya"],
      a: 0
    },
    {
      ingredients: "Beef, onion, mushroom, sour cream, egg noodles",
      opts: ["Stroganoff", "Goulash", "Beef Wellington", "Shepherd's Pie"],
      a: 0
    },
    {
      ingredients: "Corn tortilla, shredded chicken, mole sauce",
      opts: ["Enchilada", "Tamale", "Mole Poblano", "Tostada"],
      a: 0
    },
    {ingredients: "Phyllo dough, nuts, honey, cinnamon", opts: ["Baklava", "Knafeh", "Turkish Delight", "Halva"], a: 0},
    {
      ingredients: "Oats, milk, brown sugar, butter, baked",
      opts: ["Flapjack", "Oatmeal Cookies", "Crisp", "Granola"],
      a: 0
    },
    {
      ingredients: "Eggplant, tomato, garlic, olive oil, parmesan",
      opts: ["Caprese", "Parmigiana", "Ratatouille", "Moussaka"],
      a: 1
    },
    {ingredients: "Lentils, onion, spices, flatbread", opts: ["Dal", "Chana Masala", "Samosa", "Biryani"], a: 0},
    {
      ingredients: "Puffed rice, marshmallow, butter",
      opts: ["Rice Krispies Treats", "Flapjack", "Rocky Road", "S'mores"],
      a: 0
    },
    {
      ingredients: "Macaroni, cheese sauce, baked breadcrumb topping",
      opts: ["Mac and Cheese", "Lasagna", "Casserole", "Gratin"],
      a: 0
    },
    {
      ingredients: "Cucumber, tomato, onion, feta, olives, olive oil",
      opts: ["Caprese Salad", "Greek Salad", "Cobb Salad", "Niçoise"],
      a: 1
    },
    {
      ingredients: "Beef, beans, tomato, chili powder, onion",
      opts: ["Chili Con Carne", "Stew", "Bolognese", "Burrito Filling"],
      a: 0
    },
    {
      ingredients: "Flour, butter, sugar, chocolate chips",
      opts: ["Brownie", "Chocolate Chip Cookie", "Scone", "Shortbread"],
      a: 1
    },
    {
      ingredients: "Mashed chickpeas, tahini, olive oil, lemon, garlic",
      opts: ["Hummus", "Baba Ganoush", "Tzatziki", "Falafel"],
      a: 0
    },
    {
      ingredients: "Ground beef, onion, spices, baked in dough",
      opts: ["Meat Pie", "Empanada", "Shepherd's Pie", "Samosa"],
      a: 1
    },
    {
      ingredients: "Fish, chips (potatoes), fried in batter",
      opts: ["Fish and Chips", "Fried Calamari", "Tempura", "Clam Strips"],
      a: 0
    },
    {
      ingredients: "Cornmeal, water, salt, butter, parmesan — an Italian porridge",
      opts: ["Polenta", "Grits", "Couscous", "Porridge"],
      a: 0
    },
    {
      ingredients: "Whipped cream, condensed milk, sugar, frozen",
      opts: ["Ice Cream", "Semifreddo", "Gelato", "Mousse"],
      a: 0
    },
    {
      ingredients: "Corned beef, cabbage, potatoes, carrots, slow-boiled",
      opts: ["Stew", "Corned Beef & Cabbage", "Borscht", "Goulash"],
      a: 1
    },
    {
      ingredients: "Cooked rice, egg, vegetables, soy sauce, oil",
      opts: ["Fried Rice", "Risotto", "Congee", "Biryani"],
      a: 0
    },
    {ingredients: "Cucumber, yogurt, garlic, dill", opts: ["Tzatziki", "Raita", "Hummus", "Labneh"], a: 0},
    {
      ingredients: "Masa, meat or sweet filling, wrapped in corn husk",
      opts: ["Tamale", "Enchilada", "Taco", "Burrito"],
      a: 0
    },
    {
      ingredients: "Pumpkin or squash, eggs, condensed milk, pie crust",
      opts: ["Pumpkin Pie", "Sweet Potato Pie", "Pecan Pie", "Tart"],
      a: 0
    },
    {
      ingredients: "Tomato, mozzarella, basil, olive oil, balsamic glaze",
      opts: ["Greek Salad", "Caprese", "Cobb Salad", "Niçoise"],
      a: 1
    },
    {
      ingredients: "Pita bread, chickpea fritters, tahini, salad",
      opts: ["Falafel", "Shawarma", "Doner Kebab", "Gyro"],
      a: 0
    },
    {
      ingredients: "Beef or lamb skewer, vegetables, grilled",
      opts: ["Shish Kebab", "Souvlaki", "Satay", "Yakitori"],
      a: 0
    },
    {
      ingredients: "Star-piped dough, fried until crisp, rolled in cinnamon sugar",
      opts: ["Funnel Cake", "Churro", "Beignet", "Donut"],
      a: 1
    },
    {
      ingredients: "Shredded potato and onion pancake, fried in oil — a Hanukkah classic",
      opts: ["Hash Browns", "Latke", "Tater Tots", "Rösti"],
      a: 1
    },
    {
      ingredients: "Egg, flour, milk, baked in a hot pan, puffed",
      opts: ["Pancake", "Popover", "Crepe", "Yorkshire Pudding"],
      a: 3
    },
    {
      ingredients: "Beef, bun, special sauce, lettuce, cheese, pickle",
      opts: ["Big Mac", "Whopper", "Cheeseburger", "Double Double"],
      a: 0
    },
    {ingredients: "Tea, milk, tapioca pearls, sugar", opts: ["Bubble Tea", "Chai Latte", "Matcha", "Thai Tea"], a: 0},
    {
      ingredients: "Cooked dough, tomato sauce, mozzarella, pepperoni",
      opts: ["Pepperoni Pizza", "Margherita", "Calzone", "Stromboli"],
      a: 0
    },
    {
      ingredients: "Thin wrapper, pork and cabbage filling, pan-fried then steamed",
      opts: ["Dumpling", "Wonton", "Gyoza", "Baozi"],
      a: 2
    },
    {
      ingredients: "Cabbage, carrots, mayonnaise, sometimes vinegar",
      opts: ["Coleslaw", "Sauerkraut", "Kimchi", "Pickles"],
      a: 0
    },
    {ingredients: "Steamed milk, espresso, foam", opts: ["Cappuccino", "Latte", "Macchiato", "Mocha"], a: 0},
    {
      ingredients: "Beef brisket, smoked low and slow, BBQ sauce",
      opts: ["Burnt Ends", "Brisket", "Pulled Beef", "Corned Beef"],
      a: 1
    },
    {
      ingredients: "Spinach, eggs, cheese, pastry crust",
      opts: ["Quiche Lorraine", "Spanakopita", "Frittata", "Quiche Florentine"],
      a: 3
    },
    {ingredients: "Phyllo, spinach, feta, onion, herbs", opts: ["Spanakopita", "Burek", "Tiropita", "Baklava"], a: 0},
    {
      ingredients: "Rice, milk, sugar, cinnamon, raisins",
      opts: ["Rice Pudding", "Arroz con Leche", "Kheer", "All of these"],
      a: 3
    },
    {
      ingredients: "Beef mince, mashed potato topping, baked",
      opts: ["Shepherd's Pie", "Cottage Pie", "Pot Pie", "Poutine"],
      a: 1
    },
    {
      ingredients: "Steak, fries, peppercorn sauce",
      opts: ["Steak Frites", "Beef Wellington", "Steak Diane", "Tartare"],
      a: 0
    },
    {
      ingredients: "Black beans and white rice, cooked together with onion and spices",
      opts: ["Cuban Plate", "Moros y Cristianos", "Arroz con Pollo", "Maduros"],
      a: 1
    },
    {
      ingredients: "Coffee, hot water, whipped sugar, cream",
      opts: ["Dalgona Coffee", "Irish Coffee", "Affogato", "Espresso"],
      a: 0
    },
  ];
  const PER = 10;
  let live = null;
  GameRegistry.register({
    id: "foodquiz",
    name: "Food Quiz",
    icon: "🍽️",
    category: "quiz",
    description: "Guess the dish from its ingredients list",
    tags: ["quiz", "food", "trivia", "cooking"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let qs = [], idx = 0, score = 0, answered = false;
      root.innerHTML = `
        <div class="scoreboard">
          <div class="score-cell"><div class="label">Question</div><div class="val" id="fq-q">1/${PER}</div></div>
          <div class="score-cell"><div class="label">Score</div><div class="val" id="fq-s">0</div></div>
          <div class="score-cell"><div class="label">Best</div><div class="val" id="fq-b">—</div></div>
        </div>
        <div class="status info" id="fq-status">Guess the dish from its ingredients.</div>
        <div id="fq-ingredients" style="text-align:center;font-size:1.05rem;margin:20px 0;padding:14px;background:var(--bg-soft);border-radius:var(--radius);"></div>
        <div id="fq-options" class="col" style="gap:8px;max-width:440px;margin:0 auto;"></div>
        <p class="hint">${PER} dishes per round. Each correct = 10 pts.</p>
      `;
      const statusEl = root.querySelector("#fq-status");
      const ingEl = root.querySelector("#fq-ingredients");
      const optsEl = root.querySelector("#fq-options");
      root.querySelector("#fq-b").textContent = Storage.getBest("foodquiz") || "—";

      function render() {
        if (idx >= qs.length) return finish();
        const cur = qs[idx];
        ingEl.textContent = "🧾 " + cur.ingredients;
        optsEl.innerHTML = "";
        cur.opts.forEach((opt, i) => {
          const btn = document.createElement("button");
          btn.className = "btn";
          btn.textContent = opt;
          btn.style.cssText = "padding:12px;text-align:left;";
          btn.addEventListener("click", () => answer(i, btn));
          optsEl.appendChild(btn);
        });
        root.querySelector("#fq-q").textContent = `${idx + 1}/${PER}`;
        root.querySelector("#fq-s").textContent = score;
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
          statusEl.textContent = `✗ Dish: "${cur.opts[cur.a]}"`;
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
        ingEl.textContent = "🍽️";
        optsEl.innerHTML = "";
        const best = Storage.getBest("foodquiz");
        if (!best || score > best) {
          Storage.setBest("foodquiz", score);
          root.querySelector("#fq-b").textContent = score;
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
        root.querySelector("#fq-b").textContent = Storage.getBest("foodquiz") || "—";
        statusEl.textContent = "Guess the dish from its ingredients.";
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
      App.showModal("How to play Food Quiz",
        `Each round shows a list of ingredients. Pick the dish those ingredients are most famous for.
        <br><br>${PER} questions per round. Each correct answer = <b>10 points</b>.`);
    },
  });
})();
