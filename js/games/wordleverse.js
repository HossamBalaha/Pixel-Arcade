/* Wordleverse — Wordle but you choose the word length (3-8 letters). */
(function () {
  const LISTS = {
    3: "cat dog bat fox sun hat car box cup key run leg arm ear eye toe top pen map fan pig cow bug ant bee owl rat log jog hug tug wig tag wag dig fig big dim fin gin hip lip nip pit rim sip tip win yam zap zip".split(" "),
    4: "able acid area army away baby back bake ball band bank base bath beam bean bear beat beef beer bell belt bend best bike bind bird bite blew blow blue boat body bold bolt bone book boom born boss both bowl brew bulb bulk burn busy cafe cake calm came camp card care case cash cast cave cell chat chef chip city clay clip club coat code cold come cook cool cope copy core cost crab crew crop cube cult cute damn dark dart data date dawn dead deal dear debt deck deep deer demo desk dial dice diet dime dine dirt dish dive dock does done door dose down drag draw drew drop drug drum dual duck dude dull dump dust duty each earn ease east easy edge edit evil exit face fact fade fail fair fall fame fare farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flag flat flaw fled flew flex flip flow foam fold folk food foot fork form fort four fowl free from fuel full game gate gave gear gene gift give glad glow glue goal goes gold golf gone good grab gray grew grid grip grow hair half hall hand hang hard harm hate have head heal heat heir held help here hero high hike hill hint hire hold hole holy home hope horn host hour huge hung hunt hurt idea idle inch into iron item jail jazz join joke jump june just keep kept kick kind king kiss knee knew know lace lack lady laid lake lamb lamp land lane last late lava lawn lazy lead leaf lean leap left lend lens less lift like lime line link lion list live load loan lock logo long look loop lord lose loss lost loud love luck lump lung made mail main make male mall many mark mass mate math maze meal mean meat meet melt menu mile milk mill mind mine miss mode mold mood moon more most move much must nail name navy near neat neck need nest news next nice nine node none noon nose note noun oath odds okay omen once only onto open oral ours oven owes over pace pack page paid pain pair pale palm park part pass past path peak peal pear peel peer perk pick pier pile pine pink pipe plan play plot plug plus poem poke pole poll pond pool poor pore port pose post pour pray prey pull pump punk pure push quit quiz race rage rail rain rank rare rate read real reap rear redo reed reef rely rent rest rice rich ride ring rise risk road roar robe rock role roll roof room root rope rose ruby rude rule rush rust safe sage said sail sake sale salt same sand sane sang save scan seal seat seed seek seen self sell send sent shed ship shoe shop shot show shut sick side sift sigh sign silk sing sink site size skin skip slam slap sled slim slip slow snap snow soap soda sofa soft soil sold sole some song soon sort soul soup sour span spin spot star stay stem step stir stop stub such suit sung sunk sure swap tail take tale talk tall tame tank tape task team tear tech teen tell tend tent term test text than that them then they thin this tide tied tire toad toll tone took tool toss tour town trap tree trim trip true tube tuna turn twig twin type ugly unit upon urge used user vain vary vase vast vein very veto vice view vile vine void vote wage wait wake walk wall want ward warm warn wart wash wasp wave weak wear week well went were west what when whim whip wide wife wild will wind wine wing wink wire wise wish with woke wolf wood wool word wore work worm worn wrap yard yarn yawn yeah year yell yoga yolk your zero zone zoom".split(" "),
    5: "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable cabin candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence henry horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn scott sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer steve stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth terry texas thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra".split(" "),
    6: "accept access across action active actual advice afford afraid agency agenda almost always animal answer anyone appeal around arrest arrive artist aspect assess assist assume attack attend august author avenue backup banker barrel battle beauty became become before behalf behind belief belong beside better beyond bishop border bottle bottom bought branch breast breeze bridge bright broken bronze bubble budget bureau butter button camera cancel cancer canvas carbon career casino castle caught center chance change choice choose chosen church circle client closed closer coffee column combat coming common cookie corner couple course create credit critic cruise custom danger decide defeat defend define degree demand depend deploy derive desert design desire detail detect device dinner direct divide divine doctor domain double dragon driven driver during easily effect effort either eleven emerge empire employ enable encode energy engine ensure entity escape estate ethnic exceed except excuse exempt expect expert expire export expose extend extent fabric fairly family famous farmer father fellow female figure filter finger finish fiscal flight forbid forced forest forget formal format former foster fourth freeze french friend frozen future galaxy garden gather gender genius gentle global golden ground growth health height hidden highly holder honest horror humble hunter ignore impact import impose income indeed indoor injury inside insist intact intend invest invite island itself junior killer ladder latest launch leader league legacy length lesson letter likely liquid listen litter living locked longer lovers loving luxury mainly manage manner mantle manual margin marine master matter mature medium member memory mental merely method middle minute mirror mobile modern modest moment monkey mostly mother motion muscle myself narrow nation native nature nearly nectar needed ninety nobody normal notice notify number object obtain occupy offset online openly option orange orient output outfit packet palace parent patent patrol people period permit person phrase picked pigeon pirate planet please plenty pocket police policy polite ponder portal pretty prison proper public purple pursue puzzle quaint racial rather reason recall recent recipe record reform refuge refuse regard regent regret relate relief remain remark remote remove render repair repeat report rescue resent resist resort result resume retire return reveal review revise reward rhythm rocket rotten router runner safety sailor sample sanity scheme school screen season second secret secure select seller senior sensor serial series server settle severe shadow shaken shield should shower signal silent silver simple simply sinful sinner sister sketch skinny soccer softer softly solemn source sponge sprint square stable staged stains stairs stance staple status steady stolen strain stream street stress strict strike stripe stroke strong stupid submit subway sudden suffer summer sunset supper survey symbol system tactic talent target tender tenure thanks theory thirty though threat throat thrown ticket timbre tongue toward travel treaty trench triple trophy tunnel turkey turnip twelve twenty unfair unique united unless unfold unpack unused uphold upward urgent useful vanity vendor verbal verify vessel victim violet virgin vision visual volume walker wander wealth weapon weekly weight winner winter wisdom within wizard wonder worker writer yellow zenith zephyr".split(" "),
    7: "ability absence academy account achieve address advance advisor airline airport alcohol ancient another anxiety anybody anymore anytime apparel applied appoint approve arrange arrival article athlete attempt auction average baggage balance battery bearing because bedroom beneath between biology blessed booklet brigade broadly brought buddies buffalo builtin burdens captain caption capture carrier caravan careful catalog certain chamber channel chapter charity charter chicken chronic citizen clarity classic cleanly climate closely clothes coastal college combine comfort comment company compare compete complex compose conduct confirm conform connect consent consist contact contain content contest context control convert cooking correct corrupt cottage counsel counter country courage cricket culture current curtain cushion custody dancing dazzled declare decline deepest defense deposit deprive desktop despair despite destroy develop devoted dictate digital dilemma disable display disrupt distant divorce dolphin drained dressed drifted dropped drummer earnest eastern economy edition educate elderly elected elegant element elevate embargo embrace emerald emotion endless endorse enlarge episode equally equator essence ethical evening exactly examine example execute exhaust exhibit explain explore express extinct extreme failure fantasy fashion fatigue feeling fertile fervent festive finally finance fireman fishing fitness forever fortune forward fragile freezer funeral general genuine gesture getaway glamour gravity greatly grocery growing hallway handful harness haunted hearing heavily helpful hilltop holiday hopeful horizon hostage however hundred hygiene iceberg immense impulse incline include indulge inflate inherit inhibit initial inspect inspire install involve jealous jewelry jogging journal journey justice keeping ketchup keynote kindred kingdom knowing largely lasting lateral laughed lawsuit layered leather lecture letters lettuce liberal library licence lighter lineage linkage literal lobster located lodging looping loyalty machine magnify mandate mansion married maximum meaning measure meeting melodic mention monarch monitor monster monthly morning mounted musical mustard mystery neglect network neutron nightly nominal nothing novelty nowhere numeric nurture obscure observe obvious october offence officer operate oration orchard orderly organic outside overall overlap overrun oversee pacific package padlock painful painter palette parking partner passion passive patient pattern payment pending perfect perhaps persist persona phantom picture pigment pilgrim pillars pioneer pitched planner plaster plastic playoff plumber pointed pointer pollute polymer popular posture pottery poultry powered prairie precise predict premier premium prepare present pretend prevail prevent primary private problem proceed process produce profile program project promise promote propose protest provide provoke publish pumpkin purpose pyramid quality quantum quarter quickly raccoon rebound receive recover recycle regular release respect respond retreat ribbing riddled romance roughly rounded rupture salvage sarcasm savanna scallop scandal scarlet scatter scholar science scratch scruffy seagull section several shallow shelter shingle shopper shudder shuffle shunned shutter shuttle sidebar silicon silvery similar sincere sleeper slumber soldier sorcery special species spinach sponsor squeeze stadium stained startle steeple stirrup storage strange stretch student stumble stutter stylish subject succeed suggest support suppose supreme surface surgeon surplus survive suspect suspend swallow teacher tedious telling testify thought thunder tighten tobacco toddler toenail tonight topical tornado torpedo torrent torsion traffic transit tribute trickle triumph trolley trouble truffle turbine twinkle typhoon unclear undergo undress unhappy unicorn uniform unknown unusual upgrade upright upstart useless vampire various varnish venture verdict version veteran vitamin warrant warrior weather whether whisker whisper whistle worship wrestle wriggle written".split(" "),
    8: "absolute abstract academic accident accuracy achieved activist activity adequate adjacent advanced advisory advocate aircraft airplane alphabet although ambition analysis announce anything anywhere apparent appendix approach approval argument arranged arrested assemble assessed assigned assuming attorney audience backside backyard bacteria ballroom banished baseball basement baseline battlefi beautify becoming behavior belonged betrayed beverage birthday bookcase bookmark boundary bracelet brandnew breather brickbat briefing broadway bumperca business calendar campaign campfire capacity captains careless casualty catalyst catching category catholic ceremony chairman champion charcoal children civilize civilian claimant classify clearcut climatic clothing coarsely coercive coldness collapse colorful colossal combined comeback comedian competit composed compound computer conclude concrete corridor cosmetic crispest critical crossbar crossbow crowning crucifix crushing cultural currency customer database daylight deadwood deathbed deathrow decaying deceased decisive declared decrease dedicate deepened defender deferred defining definite delaware delegate delicacy delicate deliverd delusion democrat demolish demonize describe detached detected devising diabetes diagonal dialogue diameter dictator dietetic diligent diminish dinosaur director dirtiest disarmed disaster discount discover discreet discrete disliked disposed distance distinct district distrust diverged diverted dividend document domestic dominate doubtful downtown downturn drinking dripping droppers duration earnings educator eighteen eligible elongate emigrate employed employee employer endorsed endorser endpoint engaging enlisted enormous ensemble entrance entryway envelope envision equality erupting escaping estimate eternity ethereal evaluate everyday everyone evidence evicting examples excelled excepted exchange exciting excluded executor exercise existent expanded expected expedite explored exported exposure external fabulous facility fallible famished fastened fatalist fatigued favorite feasible feedback feminine festival firebomb firework fishhook flagpole flocking floodlit flowered follower football foothold footpath footrest footwear footwork forbiddi forecast forefoot forelock foremost forester foretold forgeman formless forsooth fostered fourfold fourteen franklin freezing frequent freshman fretwork frontier frostbit frothing fruitful fruition funniest gadgetry galloped gamblers gambling gamecock gangster gardener garments gasoline gathered gatherer gemstone gendered generate genocide genotype geranium gigantic gingerly glabella gluttony godspeed goldfish graceful graduate grafting grandeur grandkid granular graphics grateful graviton greenery greenest gridlock gridiron grilling grimoire grinning groaning groveled grumbler grumbled guardian guiltier handsome handwork hardware headache headwind heaviest heavenly heavyset helmsman heredity heritage highland highways historic homeless homework horrible hospital hostname hovering hundreds hungrily hygienic identity ignorant immanent immature immigrat impostor improved incident increase indicate indirect indulged industry infernal infinite informed infusing inherent instance instinct interest intimate intruder investor involved inviting isolated jealousy jiggling jingling journals journeys jubilant juggling juvenile keychain kidnaped killings kindling kindness kingfish kingship kinsfolk language latitude laudable laughter laziness lemonade lessened lettered libelous licensed lifelike lifelong lifetime lightest literate lobbying location lodgings longhand madhouse magazine magnetic maintain majority makeover merciful mergence midnight military modeling moderate motorcyc mournful movement nebulous neighbor nominate outdoors overcome overload overlook overseas paradise persuade petition platform platinum portrait powdered presence preserve previous profound progress property protocol purchase rehearse remember sapphire saturday shimmery shipyard squirrel straight syllable sympathy textbook tortoise transfer universe".split(" "),
  };

  function evaluate(guess, answer) {
    const res = Array(answer.length).fill("absent");
    const a = answer.split("");
    for (let i = 0; i < a.length; i++) if (guess[i] === a[i]) {
      res[i] = "correct";
      a[i] = null;
    }
    for (let i = 0; i < a.length; i++) {
      if (res[i] === "correct") continue;
      const j = a.indexOf(guess[i]);
      if (j !== -1) {
        res[i] = "present";
        a[j] = null;
      }
    }
    return res;
  }

  let live = null;
  GameRegistry.register({
    id: "wordleverse",
    name: "Wordleverse",
    icon: "🌌",
    category: "word",
    description: "Wordle with selectable word length (3–8 letters)",
    tags: ["word", "wordle", "popular"],
    age: ["kids", "teens", "adults"],
    difficulty: "easy",
    duration: "quick",
    players: "single",
    mount: function (root, {App, AudioFX, Storage}) {
      let alive = true;
      let LEN = 5, MAX = 6, answer = "", guesses = [], current = "", over = false, revealed = false;
      const keyState = {};
      const KBD = ["qwertyuiop".split(""), "asdfghjkl".split(""), ["ENTER", ..."zxcvbnm".split(""), "BACK"]];

      root.innerHTML = `
        <div class="row" style="justify-content:center;gap:4px;" id="wv-len"></div>
        <div class="status info" id="wv-status">Pick a word length to begin</div>
        <div class="col" id="wv-rows" style="gap:6px;align-items:center;"></div>
        <div class="col" id="wv-kb" style="gap:6px;margin-top:8px;align-items:center;"></div>
        <p class="hint">Choose 3-8 letters. Enter to submit, Backspace to delete.</p>
      `;
      const lenEl = root.querySelector("#wv-len");
      const rowsEl = root.querySelector("#wv-rows");
      const kbEl = root.querySelector("#wv-kb");
      const statusEl = root.querySelector("#wv-status");

      for (let L = 3; L <= 8; L++) {
        const b = document.createElement("button");
        b.className = "diff-btn" + (L === 5 ? " active" : "");
        b.textContent = L;
        b.dataset.l = L;
        b.addEventListener("click", () => {
          AudioFX.click();
          lenEl.querySelectorAll(".diff-btn").forEach(x => x.classList.remove("active"));
          b.classList.add("active");
          newGame(L);
        });
        lenEl.appendChild(b);
      }

      function renderRows() {
        rowsEl.innerHTML = "";
        for (let r = 0; r < MAX; r++) {
          const row = document.createElement("div");
          row.className = "word-row";
          for (let i = 0; i < LEN; i++) {
            const cell = document.createElement("div");
            cell.className = "letter";
            if (r < guesses.length) {
              const g = guesses[r].guess, e = guesses[r].eval;
              cell.textContent = g[i];
              cell.classList.add(e[i], "flip");
            } else if (r === guesses.length && !over) {
              cell.textContent = (current[i] || "").toUpperCase();
              if (current[i]) cell.classList.add("filled");
            }
            row.appendChild(cell);
          }
          rowsEl.appendChild(row);
        }
      }

      function renderKb() {
        kbEl.innerHTML = "";
        KBD.forEach(line => {
          const row = document.createElement("div");
          row.className = "row";
          row.style.justifyContent = "center";
          line.forEach(k => {
            const btn = document.createElement("button");
            btn.className = "key";
            btn.textContent = k === "BACK" ? "⌫" : k === "ENTER" ? "↵" : k.toUpperCase();
            if (k.length > 1) btn.style.minWidth = "56px";
            if (keyState[k]) btn.classList.add("used-" + keyState[k]);
            btn.addEventListener("click", () => {
              if (k === "ENTER") submit();
              else if (k === "BACK") back();
              else type(k);
            });
            row.appendChild(btn);
          });
          kbEl.appendChild(row);
        });
      }

      function type(l) {
        if (over) return;
        if (current.length >= LEN) return;
        current += l.toLowerCase();
        AudioFX.tick();
        renderRows();
      }

      function back() {
        if (over) return;
        current = current.slice(0, -1);
        AudioFX.click();
        renderRows();
      }

      function submit() {
        if (over) return;
        if (current.length !== LEN) {
          AudioFX.error();
          return;
        }
        const list = LISTS[LEN];
        if (!list.includes(current.toLowerCase())) {
          AudioFX.error();
          statusEl.textContent = `"${current.toUpperCase()}" isn't in our list`;
          statusEl.className = "status lose";
          return;
        }
        const guess = current.toUpperCase();
        const ev = evaluate(guess, answer);
        guesses.push({guess, eval: ev});
        for (let i = 0; i < LEN; i++) {
          const l = guess[i].toLowerCase();
          const order = {absent: 0, present: 1, correct: 2};
          if (!keyState[l] || order[ev[i]] > order[keyState[l]]) keyState[l] = ev[i];
        }
        current = "";
        AudioFX.flip();
        renderRows();
        renderKb();
        if (revealed) {
          over = true;
          statusEl.textContent = `Solution: ${answer}`;
          statusEl.className = "status lose";
          AudioFX.lose();
          return;
        }
        if (guess === answer) {
          over = true;
          statusEl.textContent = `🎉 Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}!`;
          statusEl.className = "status win";
          AudioFX.win();
          const key = "wordleverse_" + LEN;
          const best = Storage.getBest(key);
          if (!best || guesses.length < best) {
            Storage.setBest(key, guesses.length);
            App.toast("New best!", "success");
          }
        } else if (guesses.length >= MAX) {
          over = true;
          statusEl.textContent = `The word was ${answer}. Better luck next time!`;
          statusEl.className = "status lose";
          AudioFX.lose();
        } else {
          statusEl.textContent = `Guess ${guesses.length + 1} of ${MAX}`;
          statusEl.className = "status info";
        }
      }

      function onKey(e) {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        } else if (e.key === "Backspace") {
          e.preventDefault();
          back();
        } else if (/^[a-zA-Z]$/.test(e.key)) type(e.key);
      }

      document.addEventListener("keydown", onKey);

      function newGame(L) {
        LEN = L;
        MAX = L <= 4 ? 6 : L <= 5 ? 6 : L <= 6 ? 7 : 8;
        const list = LISTS[LEN];
        answer = list[Math.floor(Math.random() * list.length)].toUpperCase();
        guesses = [];
        current = "";
        over = false;
        revealed = false;
        for (const k in keyState) delete keyState[k];
        statusEl.textContent = `Guess the ${LEN}-letter word — ${MAX} tries`;
        statusEl.className = "status info";
        renderRows();
        renderKb();
      }

      function doHint() {
        if (over || !answer) return;
        const discovered = new Set();
        for (const g of guesses) for (let i = 0; i < LEN; i++) if (g.eval[i] === "correct") discovered.add(i);
        const unseen = [];
        for (let i = 0; i < LEN; i++) if (!discovered.has(i)) unseen.push(i);
        if (!unseen.length) return App.toast("All letters revealed", "info");
        const p = unseen[Math.floor(Math.random() * unseen.length)];
        if (current.length < LEN) {
          current += answer[p].toLowerCase();
          AudioFX.tick();
          renderRows();
        }
        App.toast(`Hint: letter "${answer[p]}"`, "info");
      }

      function doSolve() {
        if (over || !answer) return;
        revealed = true;
        current = answer.toLowerCase();
        AudioFX.click();
        renderRows();
        submit();
      }

      live = {hint: doHint, solve: doSolve};
      newGame(5);
      return function cleanup() {
        alive = false;
        live = null;
        document.removeEventListener("keydown", onKey);
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play Wordleverse",
        `Pick a word length (3–8 letters) and guess the hidden word.
        <br><br>After each guess, tiles change color:
        <br>🟩 <b>Green</b> — correct letter, correct spot.
        <br>🟨 <b>Yellow</b> — in the word, wrong spot.
        <br>⬛ <b>Gray</b> — not in the word.
        <br><br>Best score = fewest guesses, tracked per length.`);
    },
  });
})();
