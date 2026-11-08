/* ============================================================
   wikifetch.js — fetch random "non-predictable" content
   - Random 5-6 letter English words (from Wikipedia random article title)
   - Random trivia facts (Wikipedia REST summary)
   - Numbers API facts (offline-capable via large local set)
   - All requests use no API keys, only public CORS-friendly endpoints
   - Falls back to bundled lists when offline / blocked / rate-limited
   - 24h IndexedDB cache so the same session doesn't re-fetch

   Public endpoints used (no key, CORS-enabled):
   - https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=N&origin=*
   - https://en.wikipedia.org/api/rest_v1/page/summary/<title>

   ============================================================ */
(function (global) {
  "use strict";

  // Bundled fallback lists (used when network fails AND wordlist.js is
  // unavailable). These are large enough to feel "fresh" for casual play.
  const FALLBACK_4 = ("able acid also area army away baby back bake ball band bank base bath beam bean bear beat bell belt bend best bike bind bird bite blue boat body bold bone book boom born boss both bowl brew bulb bulk burn bush busy cage cake calm camp card care case cash cast cave cell chat chef chip city clay clip club coal coat code cold come cook cool cope copy cork corn cost crab crew crop cube cuff cult cute dark dart data date dawn dead deaf deal dear debt deck deep deer demo desk dial dice diet dime dine dish dive dock does doll done door dose down doze drab drag draw drop drug drum dual duck dude dull dump dust duty each earn ease east easy edge edit else ever evil exit face fact fade fail fair fall fame farm fast fate fear feat feed feel feet fell felt file fill film find fine fire firm fish five flag flat flaw fled flew flip flow foam fold folk food foot fork form fort four fowl free from fuel full fund gain game gate gave gear gene gift give glad glow glue goal goes gold golf gone good grab gray grew grid grip grow gulf hair half hall hand hang hard harm hate have head heal heat heir held hell help here hero high hike hill hint hire hold hole holy home hope horn host hour huge hung hunt hurt hush icon idea idle inch into iron item jail jazz join jolt joke jump just keep kept kick kind king kiss knee knew know lace lack lady laid lake lamb lamp land lane last late lava lawn lazy lead leaf lean leap left lend lens less lift like lime line link lion lips list live load loan lock logo long look loop lord lose loss lost loud love luck lump lung made mail main make male mall many mark mass mate math maze meal mean meat meet melt menu mile milk mill mind mine miss mode mold mood moon more most move much must nail name navy near neat neck need nest news next nice nine node none noon nose note noun oath odds ogre okay omen once only onto open opal oral ours oven owes over pace pack page paid pain pair pale palm park part pass past path peak pear peel peer perk pick pier pile pine pink pipe plan play plea plot plug plus poem poke pole poll pond pool poor pore port pose post pour pray prey pull pump punk pure push quit quiz race rage rail rain rank rare rate read real reap rear redo reed reef reek rely rent rest rice rich ride ring rise risk rite road roar robe rock role roll roof room root rope rose ruby rude rule rush rust safe sage said sail sake sale salt same sand sane sang save scan seal seat seed seek seen self sell send sent shed ship shoe shop shot show shut sick side sift sigh sign silk sing sink site size skin skip slam slap sled slim slip slow snap snow soap soda sofa soft soil sold sole some song soon sort soul soup sour sown span spin spot stab stag star stay stem step stir stop stub such suit sung sunk sure swap tail take tale talk tall tame tank tape task team tear tech teen tell tend tent term test text than that them then they thin this thus tide tied tire toad toll tone took tool toss tour town trap tree trim trip true tube tuna turn twig twin type ugly unit upon urge used user vain vary vase vast vein very veto vice view vile vine void vote wage wait wake walk wall want ward warm warn wart wash wasp wave weak wear week well went were west what when whim whip wide wife wild will wind wine wing wink wire wise wish with woke wolf wood wool word wore work worm worn wrap yard yarn yawn yeah year yell yoga yolk your zero zone zoom").split(" ");

  const FALLBACK_5 = ("about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alien align alike alive allow alone along alpha alter among anger angle angry apart apple apply arena argue arise array arrow aside asset audio audit avoid award aware badly baker basic basis beach began begin begun being below bench birth black blade blame blank blast blend bless blind block blood board boost booth bound brain brand brass brave bread break breed brick brief bring broad brown brush build built buyer cable candy carry catch cause chain chair chaos charm chart cheap check chest chief child china chose civic civil claim class clean clear click cliff climb clock close cloth cloud clown coach coast color could count court cover craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debit delay depth doing doubt dozen draft drama drank dream dress drift drive drove dryer dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flame flash fleet flesh float floor fluid focus force forge forty found frame frank fraud fresh front fruit fully funny giant given glass globe glory glove going grace grade grain grand grant grass grave great green grief gross group grown guard guess guest guide happy harsh heart heavy hello hence horse hotel house human ideal image imply index inner input inter issue ivory japan jewel joint judge juice known label labor large laser later laugh layer learn lease least leave legal level light limit linen liver local logic loose lower loyal lucky lunch lying magic major maker march match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noble noise north noted novel nurse occur ocean offer often order other ought outer owned paint paper paris party patch peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quest quick quiet quite radio raise range rapid ratio reach ready realm refer regal reign relax reply reset retro right rival river roast roman rough round route royal rural saint salad scale scene scope score scorn sense seven shade shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock shoot shore short shown sight sigma since sixth sixty sized skill sleep slide small smart smile smoke snake solar solid solve south space spare speak speed spend spent spite split spoke sport staff stage stake stand stark start state stays steam steel steep steer stick still stock stone stood store storm story strip study stuff style sugar suite super sweet swift swing sworn table taken taste teach teeth thank theft their theme there these thick thief thigh thing think third those three threw throw thumb tight times title today topic total touch tough tower toxic trace track trade trail train treat trend trial tribe trick tried truck truly trust truth twice under union unity until upper upset urban usage usual vague valid value video virus visit vital vivid vocal voice wagon waste watch water wedge weigh weird whale whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth zebra").split(" ");

  const FALLBACK_6 = ("absent accept access across action active advice advise affect afford afraid agency agenda almost always animal answer anyone appeal arrive artist aspect assess assist assume attack attend august author avenue backed backup banner barely barrel battle beauty become before behalf behave behind belief belong beside better beyond binary border bottle bottom branch breath bridge bright broken budget buried butter camera cancel cannot carbon career casino castle cause center certain change choice choose chosen church circle clean closed closer coffee column combat coming common cookie corner cottage couple county course create credit crisis custom damage danger decade defect defend define demand depend depart deploy deposit desert design desire detail detect device differ dinner direct divide dollar domain double driven driver during easily effect effort eighth either eleven emerge empire employ enable encore endure energy engine enough ensure entire equity escape estate ethics evolve excite expand expect expert extend extent fabric factor family famous fantasy father figure finger finish firing fiscal flight follow forest forget formal format foster fourth fragile freeze french friend future galaxy garden gather gender gentle global gospel govern ground growth hammer handle happen health heaven height hidden higher holder honest horror hunger hunted hunter ignore impact import income indeed infect inform inquiry insert inside insist instead intact intend intent invest island itself jacket junior kernel labour ladder launch layout leader league legend length lesson letter linear listen little living locally lonely luxury mainly manage mandate marble margin master matter medium member memory mental method middle minute mirror mobile modern modest module moment monster motion moving murder muscle mystery nearest neither nervous newest normal notice notify novelty number object obscure observe obtain obvious offset online openly option oracle orbit origin outcome output outside overcome overall parade parcel parent particle partner passage passive patent patience pattern people perfect period permit person phrase picnic pigeon pirate planet player please pocket pointer police policy ponder popular portrait possess prefer prepare present pretend pretty prince prison profit proper protect protest provide publish purpose qualify quality quarter racing rarely rather rating reader reason recall recent record reduce reform refuse region regret relate release relief remain remark remedy remind remote remove render repair repeat replace report require rescue resist result return reveal reverse review rhythm rocket rolling sample saving scheme school season second secret secure select senior series server settle severe shadow shaken shared shelter should shower signal silent silver simple single sister sketch sleep slight slowly smooth soccer social soften solidly solution somebody somehow someone something sometime sorting source spider spirit sponsor spring square stable stagger standard staring station statues steadily stomach storage stranger street stretch strikes stripes stroke strong struggle student stupid subject submit suburb sudden suffer suggest suited supply suppose surface survey suspect sustain symbol system talent target tender tennis terrible thanks theory therapy thereof thirst thirty thorough though thought threat thrive throat thrown ticket towards traffic trouble tunnel twice typical unique united uplift update upward useful usually utility vacancy valley varied vendor victim vision visual volume walker wanted wealth weapon weekly whether winner winter wisdom within wonder worker wreck yellow zombie").split(" ");

  const FALLBACK_TITLES = ("Eiffel Tower Statue of Liberty Great Wall of China Taj Mahal Pyramids of Giza Mount Everest Amazon Rainforest Sahara Desert Pacific Ocean Northern Lights Mona Lisa Starry Night The Last Supper Hamlet Romeo and Juliet War and Peace Crime and Punishment The Odyssey The Iliad Mount Rushmore Grand Canyon Niagara Falls Victoria Falls Great Barrier Reef Stonehenge Colosseum Parthenon Big Ben Tower of London Sydney Opera House Golden Gate Bridge Hoover Dam Panama Canal Suez Canal Titanic Apollo 11 International Space Station Hubble Space Telescope James Webb Space Telescope Gutenberg Bible Magna Carta Declaration of Independence United Nations World Health Organization Red Cross Olympic Games Tour de France Wimbledon Super Bowl World Cup Mona Lisa Sistine Chapel David Pieta Creation of Adam School of Athens Birth of Venus Primavera Garden of Earthly Delights Knight Watch Night Ambassadors Persistence of Memory Guernica Les Demoiselles d'Avignon The Scream The Kiss Water Lilies Sunflowers Irises Starry Night Over the Rhone Wheat Field with Cypresses Bedroom in Arles Cafe Terrace at Night Self-Portrait with Bandaged Ear The Hay Harvest The Card Players The Large Bathers Mont Sainte-Victoire The Basket of Apples The Yellow Christ The Talisman The Red Studio The Boating Party The Sleeping Gypsy The Dream The Son of Man Time Transfixed")
    .split(/\s+/).filter(s => s.length >= 4);

  const FALLBACK_TRIVIA = [
    "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.",
    "Octopuses have three hearts and blue blood.",
    "Bananas are berries, but strawberries are not.",
    "A group of flamingos is called a 'flamboyance'.",
    "Wombat poop is cube-shaped.",
    "The shortest war in history lasted 38 minutes — Britain vs Zanzibar in 1896.",
    "The unicorn is the national animal of Scotland.",
    "A day on Venus is longer than its year.",
    "Cows have best friends and become stressed when separated from them.",
    "The first computer programmer was Ada Lovelace, in the 1840s.",
    "Sharks existed before trees did — sharks are 400 million years old; trees 350 million.",
    "A bolt of lightning is five times hotter than the surface of the sun.",
    "There are more possible chess games than atoms in the observable universe.",
    "Hawai'i has its own time zone and does not observe Daylight Saving Time.",
    "The Eiffel Tower can be 15 cm taller during summer due to thermal expansion.",
    "Sea otters hold hands while sleeping so they don't drift apart.",
    "The first email was sent in 1971 by Ray Tomlinson to himself.",
    "A 'jiffy' is an actual unit of time: 1/100 of a second.",
    "Cockroaches can live for a week without their heads.",
    "The world's oldest known living tree is over 5000 years old.",
  ];

  // IndexedDB-backed cache (best-effort, falls back to memory)
  const DB_NAME = "pixel-arcade-cache";
  const STORE = "wiki";
  let db = null;

  function openDB() {
    return new Promise((resolve) => {
      if (!global.indexedDB) {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(STORE);
        };
        req.onsuccess = () => {
          db = req.result;
          resolve(db);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function cacheGet(key) {
    return new Promise((resolve) => {
      if (!db) {
        resolve(null);
        return;
      }
      try {
        const tx = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        tx.onsuccess = () => {
          const v = tx.result;
          if (v && v.expires > Date.now()) resolve(v.value);
          else resolve(null);
        };
        tx.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  function cacheSet(key, value, ttlMs) {
    if (!db) return;
    try {
      db.transaction(STORE, "readwrite").objectStore(STORE).put({
        value,
        expires: Date.now() + (ttlMs || 86400000)
      }, key);
    } catch (e) {
    }
  }

  function fetchJSON(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 4000;
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error("HTTP " + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Timeout"));
      xhr.send();
    });
  }

  function fetchText(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.timeout = 4000;
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 200) resolve(xhr.responseText);
        else reject(new Error("HTTP " + xhr.status));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Timeout"));
      xhr.send();
    });
  }

  function filterAsciiAlpha(s) {
    return s.toUpperCase().replace(/[^A-Z]/g, "");
  }

  // Curated answer dictionaries (from wordlist.js). A hidden word is only ever
  // drawn from these, so solutions are always real common English words —
  // never acronyms, proper nouns or mangled Wikipedia titles.
  function answerDict(len) {
    if (len === 4 && global.ANSWERS_4 && global.ANSWERS_4.length) return global.ANSWERS_4;
    if (len === 5 && global.ANSWERS_5 && global.ANSWERS_5.length) return global.ANSWERS_5;
    if (len === 6 && global.ANSWERS_6 && global.ANSWERS_6.length) return global.ANSWERS_6;
    return null;
  }

  // A Wikipedia title is a usable answer only when the title itself is a
  // single alphabetic word of the right length that IS a dictionary word
  // (e.g. "Tiger" → TIGER ✓; "HC Fyn" or "List of tigers" → rejected).
  function titleToAnswer(title, len) {
    if (!/^[A-Za-z]+$/.test(title)) return null; // no spaces, digits, punctuation
    if (title.length !== len) return null;
    const upper = title.toUpperCase();
    const dict = answerDict(len);
    if (dict) {
      return dict.indexOf(upper.toLowerCase()) !== -1 ? upper : null;
    }
    return upper; // wordlist.js unavailable — length-only check (bundled path still safe)
  }

  const Wiki = {
    // Random N-letter word. Tries Wikipedia "random article" → accept only
    // real single-word dictionary entries of the right length, then falls back
    // to the curated bundled answer lists.
    async randomWord(len) {
      len = len || 5;
      const key = "word" + len;
      await openDB();
      const cached = await cacheGet(key);
      if (cached && cached.length) {
        // rotate cache
        const w = cached.pop();
        cacheSet(key, cached, 3600000);
        if (cached.length < 5) Wiki._refillWords(len);
        return w;
      }
      // Try Wikipedia
      try {
        const data = await fetchJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=20&origin=*");
        const titles = (data.query.random || []).map(r => r.title);
        // Accept only titles that are genuine single-word dictionary entries
        const candidates = [];
        for (const t of titles) {
          const w = titleToAnswer(t, len);
          if (w && candidates.indexOf(w) === -1) candidates.push(w);
        }
        if (candidates.length > 0) {
          // also cache a few extras for next rounds
          cacheSet(key, candidates.slice(1), 3600000);
          return candidates[0];
        }
      } catch (e) { /* fall through */
      }
      // Fallback to the curated bundled answer list
      return Wiki.randomWordSync(len);
    },

    // Pre-fill the cache in the background (dictionary-validated words only)
    async _refillWords(len) {
      const key = "word" + len;
      try {
        const data = await fetchJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=50&origin=*");
        const titles = (data.query.random || []).map(r => r.title);
        const words = [];
        for (const t of titles) {
          const w = titleToAnswer(t, len);
          if (w && words.indexOf(w) === -1) words.push(w);
        }
        if (words.length) {
          const existing = (await cacheGet(key)) || [];
          const merged = Array.from(new Set([...existing, ...words]));
          cacheSet(key, merged, 3600000);
        }
      } catch (e) { /* ignore */
      }
    },

    // Random word from the curated bundled answer lists — synchronous,
    // used when the network is unavailable. Always a real common English word.
    randomWordSync(len) {
      const dict = answerDict(len);
      const list = dict || (len === 4 ? FALLBACK_4 : len === 6 ? FALLBACK_6 : FALLBACK_5);
      return list[Math.floor(Math.random() * list.length)].toUpperCase();
    },

    // Random trivia fact (Wikipedia REST summary). Falls back to bundled trivia list.
    async randomTrivia() {
      await openDB();
      const cached = await cacheGet("trivia");
      if (cached && cached.length) {
        const v = cached.pop();
        cacheSet("trivia", cached, 3600000);
        if (cached.length < 3) Wiki._refillTrivia();
        return v;
      }
      try {
        const data = await fetchJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=1&origin=*");
        const title = data.query.random[0].title;
        const summary = await fetchJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
        if (summary.extract) return summary.extract;
      } catch (e) { /* fall through */
      }
      return FALLBACK_TRIVIA[Math.floor(Math.random() * FALLBACK_TRIVIA.length)];
    },

    async _refillTrivia() {
      try {
        const data = await fetchJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=10&origin=*");
        const titles = data.query.random.map(r => r.title);
        const out = [];
        for (const t of titles) {
          try {
            const s = await fetchJSON("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t));
            if (s.extract && s.extract.length < 240) out.push(s.extract);
          } catch (e) {
          }
        }
        if (out.length) {
          const existing = (await cacheGet("trivia")) || [];
          cacheSet("trivia", [...existing, ...out], 3600000);
        }
      } catch (e) { /* ignore */
      }
    },

    // Random trivia fact, synchronous (uses bundled list)
    randomTriviaSync() {
      return FALLBACK_TRIVIA[Math.floor(Math.random() * FALLBACK_TRIVIA.length)];
    },

    // Random Wikipedia title (used by hangman-reverse and similar)
    async randomTitle(minLen, maxLen) {
      minLen = minLen || 4;
      maxLen = maxLen || 20;
      try {
        const data = await fetchJSON("https://en.wikipedia.org/w/api.php?action=query&format=json&list=random&rnnamespace=0&rnlimit=20&origin=*");
        const titles = (data.query.random || []).map(r => r.title);
        const valid = titles.filter(t => {
          const clean = filterAsciiAlpha(t);
          return clean.length >= minLen && clean.length <= maxLen && !t.includes("(") && !t.includes(",");
        });
        if (valid.length) return valid[0].toUpperCase();
      } catch (e) { /* fall through */
      }
      return FALLBACK_TITLES[Math.floor(Math.random() * FALLBACK_TITLES.length)].toUpperCase();
    },

    // Numbers API fact about a number. The external numbersapi.com endpoint
    // is HTTP-only and is blocked as mixed content on HTTPS origins (GitHub
    // Pages), so we use a small bundled fallback instead.
    async numberFact(n) {
      return n + " is a number.";
    },
  };

  global.Wiki = Wiki;
})(window);
