# Pixel Arcade 🕹️

> **300 classic browser games in one place** — Wordle, Quordle, Octordle, Nerdle, Worldle, Crosswordle, Movie Emoji,
> Tone Memory, Word Ladder, Word Chain, 2048, Snake, Sudoku, Memory Match, Minesweeper, Hangman, Connect Four,
> Battleship,
> and 285 more. Built with pure HTML, CSS &amp; JavaScript. No build step. No backend. No dependencies. Just push to
> GitHub Pages and play.

<p align="center">
  <img src="assets/icons/android-chrome-192x192.png" alt="Pixel Arcade logo" width="96" height="96" />
</p>

<p align="center">
  <!-- Category icons — click any to jump to that section -->
  <a href="#-live-games-300">📝 Word (57)</a> ·
  <a href="#-live-games-300">🧩 Logic (77)</a> ·
  <a href="#-live-games-300">👾 Arcade (63)</a> ·
  <a href="#-live-games-300">♟️ Strategy (57)</a> ·
  <a href="#-live-games-300">🧠 Quiz (46)</a>
</p>

<p align="center">
  <a href="#-live-games-300">🎮 Games</a> ·
  <a href="#-features">✨ Features</a> ·
  <a href="#-quickstart">🚀 Quickstart</a> ·
  <a href="#-add-a-new-game">➕ Add a game</a> ·
  <a href="#-about-the-author">👤 Author</a> ·
  <a href="#-disclaimer">⚠️ Disclaimer</a>
</p>

---

## ⚠️ Disclaimer

**Trademark notice** — Game names like *Wordle*, *Quordle*, *Octordle*, *Nerdle*, *Worldle*, *Heardle*, *Framed*,
*Contexto*, *Semantle*, *Connections*, and *Spelling Bee* are trademarks of their respective owners (NYT, etc.). Pixel
Arcade is an **independent, fan-made clone** that is not affiliated with, endorsed by, or sponsored by any of those
rights holders. Each game here is a re-implementation of the genre's mechanics built from scratch under the MIT license;
the original names are used only to indicate the gameplay style. If you are a rights holder and want a name removed,
please open an issue.

**Content sources** — Some games fetch live content from public APIs at runtime:

- Wikipedia (`en.wikipedia.org`) for random article titles and summaries (Wordle, Hangman, Trivia)
- Open Trivia DB (`opentdb.com`) for trivia questions

These are public, CORS-enabled APIs with no API keys. All requests are made client-side; no data is sent to any server.
When offline, games fall back to bundled word lists and questions. The comprehensive English word list used for Wordle
validation (~8,500 five-letter words) is sourced from the [NLTK words corpus](https://www.nltk.org/nltk_data/) and
bundled locally in `js/wordlist.js`.

**No warranty** — This software is provided "as is" under the MIT license, without warranty of any kind. The games are
provided for entertainment and educational purposes only.

---

## 📋 Table of contents

- [🎯 Live games (300)](#-live-games-300)
- [✨ Features](#-features)
- [🚀 Quickstart](#-quickstart)
- [📂 Project structure](#-project-structure)
- [➕ Add a new game](#-add-a-new-game)
- [🎨 Theming](#-theming)
- [♿ Accessibility](#-accessibility)
- [📦 Tech stack](#-tech-stack)
- [👤 About the author](#-about-the-author)
- [📄 License &amp; community files](#-license--community-files)
- [🙋 FAQ](#-faq)
- [⚠️ Disclaimer](#-disclaimer)

---

## 🎯 Live games (300)

Each card on the home page has a unique thumbnail (see `assets/thumbnails/`). Click any card to play. Use the filter
chips to browse by category, or the search box to find a game by name. Share any game with its `( ?game=id )` deep link.

<details>
<summary><b>📝 Word games (57)</b> — click to expand</summary>

| #  | Game                      | Highlights                                                                                                           |
|----|---------------------------|----------------------------------------------------------------------------------------------------------------------|
| 1  | **🔠 Acrostic**           | Solve the clues — first letters spell the bonus word                                                                 |
| 2  | **🔤 Alphabetize**        | Sort the words into order before the clock runs out                                                                  |
| 3  | **📖 Anagram Crossword**  | Mini crossword — each clue is an anagram of the answer                                                               |
| 4  | **🎲 Boggle**             | Find words (≥3 letters) in the 4×4 letter grid                                                                       |
| 5  | **🔤 Codewords**          | Crack the number→letter cipher to reveal hidden words                                                                |
| 6  | **🍔 Compound Words**     | Match the halves to build compound words                                                                             |
| 7  | **🔗 Connections**        | Group 16 words into 4 hidden categories                                                                              |
| 8  | **🔤 Crosswordle**        | Solve 5 intersecting 5-letter words Wordle-style                                                                     |
| 9  | **🔒 Cryptogram**         | Decode a famous quote — every letter has been swapped by a substitution cipher                                       |
| 10 | **📖 Define Me**          | Guess the word from its dictionary definition                                                                        |
| 11 | **🎭 Emojidle**           | Guess the phrase from emoji clues                                                                                    |
| 12 | **🧷 Fill-In Crossword**  | Fit the given words into the empty grid                                                                              |
| 13 | **👻 Ghost Word**         | Add letters without completing a word — vs AI                                                                        |
| 14 | **🪢 Hangman**            | Guess the word before the stick figure is complete                                                                   |
| 15 | **🔄 Hangman Reverse**    | You                                                                                                                  |
| 16 | **🗝️ Hidden Proverb**     | Fill in the missing letters to uncover the saying                                                                    |
| 17 | **💬 Idiom Guess**        | Pick the idiom that matches the literal description                                                                  |
| 18 | **🔤 Jotto**              | Guess the 5-letter word; matches tell you how many letters are right                                                 |
| 19 | **🔲 Letter Boxed**       | Chain words around a square — each letter from a different side                                                      |
| 20 | **📥 Letter Drop**        | Catch the falling letters to spell the target word                                                                   |
| 21 | **🧵 Letter Weaver**      | Fill in the missing letters — clue + word shape                                                                      |
| 22 | **🎭 Mad Libs**           | Fill in nouns, verbs and adjectives for a silly story                                                                |
| 23 | **✏️ Mini Crossword**     | Solve a classic crossword with wordplay clues                                                                        |
| 24 | **🅰️ Missing Vowels**      | The vowels ran away — type the phrase back                                                                           |
| 25 | **🎬 Movie Emoji**        | Guess the movie title from emoji clues — 6 tries                                                                     |
| 26 | **🧮 Nerdle**             | Guess the 8-character math equation in 6 tries                                                                       |
| 27 | **🔁 Palindrome Hunt**    | Hunt 17 hidden palindromes from their clues — words like ROTOR and LEVEL that read the same both ways                |
| 28 | **🅿️ Pangram Hunt**        | Find pangrams (words using all 7 letters)                                                                            |
| 29 | **💬 Phrazle**            | Guess the hidden phrase — Wheel-of-Fortune style                                                                     |
| 30 | **🐷 Pig Latin**          | Decode phrases written in Pig Latin                                                                                  |
| 31 | **🔀 Portmanteau**        | Brunch = breakfast + lunch — build the blended words                                                                 |
| 32 | **🔗 Prefix & Suffix**    | Grow the root word with prefixes and suffixes                                                                        |
| 33 | **📜 Proverb Match**      | Match first and second halves of classic proverbs across 2 rounds of 8 — wrong pairs cost points                     |
| 34 | **🔲 Quordle**            | Solve 4 Wordle boards at once with 9 shared guesses                                                                  |
| 35 | **📋 Scattergories**      | One letter, five categories — type a word for each                                                                   |
| 36 | **🌀 Scrambled Reading**  | Read words with jumbled middles — against the clock                                                                  |
| 37 | **🌡️ Semantle**           | Guess the secret word — similarity percentage tells you how close you are                                            |
| 38 | **🧱 Sentence Builder**   | Click the words in order to rebuild the sentence                                                                     |
| 39 | **🐝 Spelling Bee**       | Form words (≥4 letters) from 7 letters — center letter required                                                      |
| 40 | **🔍 Spelling Detective** | Spot the misspelled word among the four                                                                              |
| 41 | **🔗 Synonym Match**      | Link each word with its synonym before time runs out                                                                 |
| 42 | **📚 Vocabulary Quiz**    | Pick the right definition for each word                                                                              |
| 43 | **🎱 Word Bingo**         | Letters are drawn — complete your word before the AI does                                                            |
| 44 | **🔗 Word Chain**         | Each word starts with the previous word                                                                              |
| 45 | **🎯 Word Hunt**          | Find all dictionary words from 7 scrambled letters — 90 seconds                                                      |
| 46 | **🪜 Word Ladder**        | Change one word into another, one letter at a time                                                                   |
| 47 | **🔺 Word Pyramid**       | Build words one letter at a time — A → AT → CAT → CHAT                                                               |
| 48 | **🧠 Word Recall**        | Memorize the word list, then write it all back                                                                       |
| 49 | **🔀 Word Scramble**      | Unscramble the letters before time runs out                                                                          |
| 50 | **🔍 Word Search**        | Find 8 hidden words in the letter grid                                                                               |
| 51 | **🔳 Word Square**        | Fill the grid so each row & column spells a word                                                                     |
| 52 | **🗼 Word Tower**         | Stack words — each must start with the previous word                                                                 |
| 53 | **🧇 Word Waffle**        | Swap letters until every row spells a word                                                                           |
| 54 | **🎡 Word Wheel Classic** | Classic newspaper wheel: make 4+ letter words from 9 letters — every word must use the centre letter. Pangram = +10! |
| 55 | **🔤 Wordle**             | Guess the word — Easy 4 / Classic 5 / Hard 6 letters, live Wikipedia answers                                         |
| 56 | **🎨 Wordle Themes**      | Wordle with a twist — pick from 24 themed answer pools                                                               |
| 57 | **🌍 Worldle**            | Guess the country from its silhouette — distance + direction hints                                                   |

</details>

<details>
<summary><b>🧩 Logic games (77)</b> — click to expand</summary>

| #  | Game                    | Highlights                                                                             |
|----|-------------------------|----------------------------------------------------------------------------------------|
| 1  | **🔢 15 Puzzle**        | Slide tiles 1–15 into order in a 4×4 grid                                              |
| 2  | **🔢 2048**             | Combine matching tiles to reach 2048                                                   |
| 3  | **🔢 24 Game**          | Combine 4 numbers with +, -, ×, ÷ to make 24                                           |
| 4  | **🔳 Aqre**             | Shade cells to match room counts — four in a row is too many                           |
| 5  | **➡️ Arrow Maze**       | Walk the arrows — visit every cell exactly once                                        |
| 6  | **⚖️ Balance Scale**    | One of nine coins is fake — find it in three weighings                                 |
| 7  | **🔴 Ball Sort**        | Pour balls between tubes until each holds a single color                               |
| 8  | **🔢 Binairo**          | Fill the grid with 0s and 1s — no 3 in a row, balanced                                 |
| 9  | **🕳️ Black Box**        | Probe with rays to locate the hidden atoms                                             |
| 10 | **🌉 Bridges (Hashi)**  | Connect islands with bridges — each island                                             |
| 11 | **🐂 Bulls and Cows**   | Crack the 4-digit code — bulls: right digit right place, cows: right digit wrong place |
| 12 | **🍌 Choco Banana**     | Shade cells to match area clues — no 2×2 blocks                                        |
| 13 | **☁️ Clouds**           | Place clouds to match the row and column counts                                        |
| 14 | **⚖️ Coin Weighing**    | Find the fake coin in three balance weighings                                          |
| 15 | **🎨 Color Match**      | Are the two colors the same? Build a streak.                                           |
| 16 | **➗ Cross Math**       | Mini crossword with math-clued number answers                                          |
| 17 | **🁫 Dominosa**          | Tile the grid into dominoes — each domino value used exactly once                      |
| 18 | **🧮 Equation Builder** | Arrange numbers & operators to hit the target                                          |
| 19 | **🖼️ Fill-a-Pix**       | Each number counts shaded neighbors — reveal the picture                               |
| 20 | **🧩 Fillomino**        | Fill regions so each group                                                             |
| 21 | **📐 Futoshiki**        | Fill the grid so each row/col has 1-4, respecting inequality signs                     |
| 22 | **⚙️ Gear Puzzle**      | Place gears on pegs to drive the wheel from the crank                                  |
| 23 | **⬡ Hex Puzzle**        | Swap hex tiles so no two neighbors share a color                                       |
| 24 | **🏠 Heyawake**         | Shade rooms to their counts — never three shaded in a row                              |
| 25 | **🧩 Hidato**           | Connect numbers 1..N in sequence on the grid                                           |
| 26 | **⬛ Hitori**           | Shade cells so no number repeats per row/column; shaded can                            |
| 27 | **🟦 Hyper Sudoku**     | 4x4 Sudoku plus 2 extra 2x2 regions                                                    |
| 28 | **📏 Kakurasu**         | Shade cells so row and column weights add up                                           |
| 29 | **➕ Kakuro Mini**      | 4×4 kakuro — fill cells so rows and columns sum to the clues                           |
| 30 | **➗ KenKen**           | 6×6 arithmetic sudoku — cages hit the target with +, −, ×, ÷                           |
| 31 | **♞ Knight**           | Visit every square exactly once with chess-knight moves                                |
| 32 | **🔦 Laser Maze**       | Rotate the mirrors and light every target                                              |
| 33 | **💡 Light Up (Akari)** | Place bulbs to light every white cell — no two bulbs see each other                    |
| 34 | **💡 Lights Out**       | Toggle lights off — every click affects neighbors too                                  |
| 35 | **🧩 LITS**             | Shade one tetromino per region — no same shapes touching                               |
| 36 | **🧩 Logic Grid**       | Einstein puzzle — use clues to match people to attributes                              |
| 37 | **🔢 Magic Square**     | Arrange 1–9 in a 3×3 grid so every row, column & diagonal sums to 15                   |
| 38 | **🧲 Magnets**          | Place +/− magnets so rows and columns hit their counts                                 |
| 39 | **🎨 Mastermind**       | Crack the secret 4-color code in 8 tries                                               |
| 40 | **⚪ Masyu**            | Draw a single loop through all pearls — follow the pearl rules                         |
| 41 | **🪵 Matchsticks**      | Move or remove matches to fix the equation                                             |
| 42 | **🃏 Memory Match**     | Flip cards and find all the matching pairs — 14 themed decks                           |
| 43 | **💣 Minesweeper**      | Clear the board without detonating any mines                                           |
| 44 | **🚪 Monty Hall**       | Three doors, one goat-free car — is switching worth it?                                |
| 45 | **🧠 N-Back**           | Does the current letter match the one 2 steps back?                                    |
| 46 | **👑 N-Queens**         | Place queens so no two attack each other                                               |
| 47 | **🔲 Nonogram**         | 5×5 Picross — fill cells per the row/column clues                                      |
| 48 | **🍫 Norinori**         | Shade dominoes so every region holds exactly one half                                  |
| 49 | **🎯 Number Guess**     | Guess the secret number with hot/cold hints                                            |
| 50 | **🔗 Number Link**      | Connect each numbered pair with a path. No crossings.                                  |
| 51 | **🔢 Numbrix**          | Connect 1 to 49 in order — consecutive numbers must be orthogonal neighbours           |
| 52 | **🌊 Nurikabe**         | Shade the sea — each numbered island keeps its size                                    |
| 53 | **🛤️ Path Puzzle**      | Draw a path from start to end, visiting every cell once                                |
| 54 | **🔵 Peg Solitaire**    | Jump pegs over each other to leave just one in the center                              |
| 55 | **🧊 Picross 3D**       | 3×3×3 cube — deduce filled cells from face clues                                       |
| 56 | **🚰 Pipe Connect**     | Rotate the pipes to link the water source to the sink                                  |
| 57 | **🌊 Ripple Effect**    | Fill regions with 1..N; no two same numbers touch (incl. diagonally)                   |
| 58 | **🚣 River Crossing**   | Ferry the wolf, goat and cabbage — the boat holds one                                  |
| 59 | **🤖 Robot Programmer** | Write a move program and send the robot to its charger                                 |
| 60 | **🚗 Rush Hour**        | Slide the cars and trucks to free the red car                                          |
| 61 | **🃏 SET**              | Spot triples where every feature is all-same or all-different                          |
| 62 | **▭ Shikaku**           | Divide the grid into rectangles — each holds one number = area                         |
| 63 | **🏙️ Skyscrapers**      | Place buildings 1–4 in each row/col so the visibility clues work                       |
| 64 | **🔄 Slitherlink**      | Draw a single closed loop matching the number clues                                    |
| 65 | **📦 Sokoban**          | Push every crate onto a target spot — no pulling!                                      |
| 66 | **⭐ Star Battle**      | Place 1 star per row, column, and region — no touching                                 |
| 67 | **🔢 Sudoku**           | Fill the 9×9 grid — every row, column & box has 1-9                                    |
| 68 | **✖️ Sudoku X**         | 4×4 Sudoku — rows, cols, 2×2 boxes, AND both diagonals                                 |
| 69 | **🔢 Suguru**           | Fill regions with 1…N — neighbors can never repeat a digit                             |
| 70 | **🔢 Sukoro**           | Every cell tells how many numbered neighbors it has                                    |
| 71 | **➕ Sumplete**         | Delete numbers so each row & column sums to target                                     |
| 72 | **⬛ Tapa**             | Shade cells so each clue                                                               |
| 73 | **⛺ Tents**            | Place a tent next to each tree — tents can                                             |
| 74 | **🌡️ Thermometer**      | Fill thermometers so rows and columns reach their sums                                 |
| 75 | **🗼 Tower of Hanoi**   | Move 5 disks from peg 1 to peg 3 — no disk may sit on a smaller one                    |
| 76 | **🫗 Water Jugs**       | Fill, empty and pour to measure the exact target                                       |
| 77 | **🔄 Yajilin**          | Draw a single loop through all cells; numbers count shaded cells in their direction    |

</details>

<details>
<summary><b>👾 Arcade games (63)</b> — click to expand</summary>

| #  | Game                            | Highlights                                                                        |
|----|---------------------------------|-----------------------------------------------------------------------------------|
| 1  | **🏒 Air Hockey**               | Slide, block and smash past the AI goalie                                         |
| 2  | **🏹 Archery**                  | Compensate for wind and distance to hit the gold                                  |
| 3  | **🚀 Asteroids**                | Shoot asteroids; they split when hit                                              |
| 4  | **🎈 Balloon Pop**              | Pop balloons before they float away — avoid bombs, speed increases                |
| 5  | **🧱 Block Stacker**            | Time your taps to stack blocks perfectly — misaligned edges get trimmed           |
| 6  | **🧱 Breakout**                 | Bounce the ball, smash all the bricks                                             |
| 7  | **🫧 Bubble Shooter**           | Aim and fire bubbles — pop clusters of three or more                              |
| 8  | **💫 Bullet Dodge**             | Weave your ship through an ever-denser bullet storm                               |
| 9  | **🦇 Cave Flyer**               | Hold to rise, release to fall — thread the cave                                   |
| 10 | **🪙 Coin Flip**                | Predict heads or tails — build a streak                                           |
| 11 | **🌈 Color Switch**             | Tap to jump — pass through obstacles of matching color, avoid mismatches          |
| 12 | **🎯 Darts**                    | Steady the wobbling crosshair and hit the bullseye                                |
| 13 | **🎲 Dice Roll (Yahtzee-lite)** | 5 dice, 3 rolls per turn, score the best category                                 |
| 14 | **⛏️ Digger**                   | Tunnel through the dirt for gems — rocks fall, beware                             |
| 15 | **⚾ Dodge Ball**               | Survive 30s — dodge falling balls that spawn faster and fall quicker every second |
| 16 | **🦘 Doodle Jump**              | Bounce up endless platforms — don                                                 |
| 17 | **🔢 Dot Dash Mini**            | Tap the numbered dots in order 1-2-3… — rounds grow, wrong taps cost a second     |
| 18 | **🏃 Endless Runner**           | Jump the boxes, duck the bars — how far can you go?                               |
| 19 | **🎣 Fishing Frenzy**           | Drop the hook, reel the fish, dodge the junk                                      |
| 20 | **🐤 Flappy Bird**              | Tap to flap; avoid the pipes                                                      |
| 21 | **🐸 Frogger**                  | Hop across the road and river to the goal                                         |
| 22 | **🍉 Fruit Slice**              | Swipe to slice flying fruit — never the bombs                                     |
| 23 | **🔄 Gravity Flip**             | Flip between floor and ceiling to dodge the spikes                                |
| 24 | **🔷 Hex Dodge**                | Spin through the closing walls at hyper speed                                     |
| 25 | **📈 Higher or Lower**          | Guess if the next number will be higher or lower                                  |
| 26 | **🏀 Hoop Shot**                | Set angle and power to sink the basket                                            |
| 27 | **🤹 Juggler**                  | Keep every ball in the air as they keep coming                                    |
| 28 | **🦘 Jump Catch**               | Time your jumps to grab coins flying past at three heights — 30 seconds           |
| 29 | **🏎️ Lane Runner**              | Three lanes, full speed — dodge the traffic                                       |
| 30 | **🎰 Lotto Picker**             | Pick 6 numbers 1–49, draw 6, count your matches                                   |
| 31 | **🌕 Lunar Lander**             | Fuel, gravity, one landing pad — touch down softly                                |
| 32 | **💎 Match 3 Classic**          | Swap tiles to form 3-in-a-row.                                                    |
| 33 | **🌀 Maze Escape**              | Escape procedurally generated mazes against the clock                             |
| 34 | **😋 Maze Muncher**             | Eat every dot before the chasers corner you                                       |
| 35 | **🔢 Memory Sequence**          | Watch the growing number sequence, then repeat it                                 |
| 36 | **⛳ Mini Golf**                | Drag to aim and putt through walls and sand traps                                 |
| 37 | **🚀 Missile Command**          | Fire missiles to intercept incoming threats. Protect your cities!                 |
| 38 | **🌙 Moon Buggy**               | Jump the craters and collect moon rocks                                           |
| 39 | **🔍 Odd One Out**              | Spot the one different emoji — grids grow, time melts                             |
| 40 | **🗑️ Paper Toss**               | Arc your throw into the bin — the fan changes the wind                            |
| 41 | **🕹️ Pinball**                  | Bounce the ball off bumpers and flippers for points                               |
| 42 | **🎰 Plinko**                   | Drop the chip and ride the pegs to a jackpot slot                                 |
| 43 | **🏓 Pong**                     | Classic Pong — bounce the ball past the AI paddle                                 |
| 44 | **👆 Quick Tap**                | Tap targets fast — 30s.                                                           |
| 45 | **⚡ Reaction Test**            | Wait for green, then click as fast as you can — 5 rounds                          |
| 46 | **🧱 Reaction Wall**            | Stop the wall at the perfect moment as it approaches                              |
| 47 | **🐔 Road Crosser**             | Hop across busy roads and rivers — one hop at a time                              |
| 48 | **✊ Rock Paper Scissors**      | Best of 5 — pick your move, beat the AI                                           |
| 49 | **🎵 Simon Says**               | Repeat the growing color sequence from memory                                     |
| 50 | **🥏 Skeet Shoot**              | Track the clay pigeons across the sky and shoot them down                         |
| 51 | **🎿 Slalom**                   | Ski down the slope — thread every gate, dodge the trees                           |
| 52 | **🎰 Slot Machine**             | 3-reel slot machine — start with 100 credits, 5 per spin                          |
| 53 | **🐍 Snake**                    | Eat food, grow longer — don                                                       |
| 54 | **👾 Space Invaders**           | Blast the marching alien formation before it lands                                |
| 55 | **🎯 Stop the Bar**             | Stop the needle in the zone — it shrinks and speeds up                            |
| 56 | **🚜 Tank Duel**                | Turn-based artillery — pick angle and power to hit the AI tank                    |
| 57 | **🧱 Tetris**                   | Simplified Tetris — drop pieces, clear rows                                       |
| 58 | **🎵 Tone Memory**              | Listen to the growing tone sequence, guess the next note — 3 lives                |
| 59 | **🏍️ Tron Light Cycles**        | Outride the AI — don                                                              |
| 60 | **⌨️ Typing Speed**              | How many words per minute can you type in 60 seconds?                             |
| 61 | **🔨 Whack-a-Mole**             | Bonk the moles before they duck back down                                         |
| 62 | **🚲 Wheelie**                  | Hold the front wheel up — too far and you tip                                     |
| 63 | **⚡ Zigzag**                   | Tap to turn as the ball races along the zigzag wall                               |

</details>

<details>
<summary><b>♟️ Strategy games (57)</b> — click to expand</summary>

| #  | Game                         | Highlights                                                                                                                                                                                  |
|----|------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | **🏹 Amazons**               | Queens move and shoot arrows — claim the last territory                                                                                                                                     |
| 2  | **🚧 Avoidance**             | Place tokens avoiding your own color — trap opponents to capture them                                                                                                                       |
| 3  | **🎲 Backgammon**            | Race your checkers home, then bear them all off                                                                                                                                             |
| 4  | **🐅 Bagh Chal**             | Nepal                                                                                                                                                                                       |
| 5  | **🚢 Battleship**            | Sink all 5 enemy ships before AI sinks yours                                                                                                                                                |
| 6  | **🃏 Blackjack**             | Beat the dealer to 21 — blackjack pays 3 to 2                                                                                                                                               |
| 7  | **🛡️ Breakthrough**          | Punch through the enemy line with your pawn army                                                                                                                                            |
| 8  | **⚫ Checkers**              | Classic 8×8 checkers vs a greedy AI                                                                                                                                                         |
| 9  | **🧠 Concentration**         | Memory match — pair each word with its definition                                                                                                                                           |
| 10 | **🔴 Connect Four**          | Drop discs to make 4 in a row vs AI                                                                                                                                                         |
| 11 | **8️⃣ Crazy Eights**           | Shed your cards by matching rank or suit                                                                                                                                                    |
| 12 | **🁣 Domino Chain**           | Classic draw dominoes — match the open ends of the chain, empty your hand first.                                                                                                            |
| 13 | **🁢 Dominoes Solitaire**     | The classic domino puzzle — find the hidden tiling of all 28 dominoes in the 7×8 pip grid.                                                                                                  |
| 14 | **⬜ Dots and Boxes**        | Draw lines, complete boxes — vs AI                                                                                                                                                          |
| 15 | **🇲🇬 Fanorona**              | Madagascar                                                                                                                                                                                  |
| 16 | **🎲 Farkle**                | Medieval greed dice: set aside 1s, 5s and combos each roll, then push your luck — a scoreless roll is a Farkle and wipes your turn. Race the bot to 10,000.                                 |
| 17 | **🐟 Go Fish**               | Ask the AI for ranks and collect four of a kind                                                                                                                                             |
| 18 | **🏌️ Golf**                  | Clear the columns by playing one rank up or down                                                                                                                                            |
| 19 | **⚫ Gomoku**                | Five in a row on a 9x9 board. vs AI.                                                                                                                                                        |
| 20 | **🏁 Halma**                 | Hop your pieces across the board to the opposite camp                                                                                                                                       |
| 21 | **🎴 Hasami Shogi**          | Sandwich enemy pieces between yours to capture them                                                                                                                                         |
| 22 | **⬡ Hex**                    | Connect your two sides of the hex board                                                                                                                                                     |
| 23 | **🌺 Konane**                | Hawaiian checkers — jump your opponent clean off the board                                                                                                                                  |
| 24 | **🎲 Liar**                  | Perudo bluff dice vs the dudo-bot: bid how many of a face hide under all 10 dice, raise or call Liar — 1s are wild, and every lost call costs a die.                                        |
| 25 | **➕ Lines of Action**       | Move exactly as many squares as pieces in the line                                                                                                                                          |
| 26 | **🀄 Mahjong Solitaire**      | Match pairs of free tiles and clear the 72-tile two-layer layout — every deal is solvable.                                                                                                  |
| 27 | **🫘 Mancala**               | Ancient seed-sowing strategy game vs AI                                                                                                                                                     |
| 28 | **🚢 Memory Battleship**     | See the ships for 3 seconds — then remember and sink them all!                                                                                                                              |
| 29 | **🇲🇽 Mexico Dice**           | Dice climbing vs the bot: roll 2 dice up to 3 times, keeping what you like — highest total takes the round, but 2-1 (Mexico!) beats everything and costs two strikes. Three strikes and you |
| 30 | **⚫ Mini Go**               | Surround territory on a 9×9 board — ancient game, tiny package                                                                                                                              |
| 31 | **🪨 Nim**                   | Take stones from one pile — last stone wins or loses (you pick)                                                                                                                             |
| 32 | **🎯 Nine Men**              | The classic mill game — form 3-in-a-line to capture enemy pieces                                                                                                                            |
| 33 | **🙅 Notakto**               | 3 boards, both players place X — complete a line to kill a board, complete the LAST line and you lose                                                                                       |
| 34 | **👰 Old Maid**              | Pair off your cards and pass the queen to the AI                                                                                                                                            |
| 35 | **🎲 Pachisi Lite**          | The royal Indian race game — cowries, captures and a dash to home                                                                                                                           |
| 36 | **🐷 Pig Dice**              | Jeopardy dice vs the pig-bot: roll to grow your turn total, hold to bank it — but roll a 1 and lose it all. First to 100 wins.                                                              |
| 37 | **🃏 Poker Dice**            | Poker hands with dice: five 9/10/J/Q/K/A dice, 3 rolls per hand with holds, then score the hand — five of a kind 50 down to one pair 2. Five hands per game.                                |
| 38 | **🔺 Pyramid Solitaire**     | Uncover and remove card pairs that add to thirteen                                                                                                                                          |
| 39 | **🧱 Quoridor**              | Race to the far side — place fences to slow the AI                                                                                                                                          |
| 40 | **⚪ Reversi (Othello)**     | Flip opponent pieces by outflanking them — vs AI                                                                                                                                            |
| 41 | **🏺 Royal Game of Ur**      | Sumerian dice race from 2600 BCE — 7 pieces each, 4 binary dice, captures on the shared bridge, rosettes are safe + extra roll, first to bear all 7 pieces off wins.                        |
| 42 | **⬛ Seega**                 | Ancient Egyptian 5×5 game — place your 12 stones, then slide to sandwich enemy lines between yours and capture them. No moves left or no stones left means defeat.                          |
| 43 | **🔺 Senet**                 | Egypt                                                                                                                                                                                       |
| 44 | **📦 Shut the Box**          | Flip tiles to match your dice rolls — shut all nine!                                                                                                                                        |
| 45 | **🐍 Snakes & Ladders**      | The ancient race of Moksha Patam — roll the die, climb the ladders 🪜, dodge the snakes 🐍, and land exactly on 100 to win. You vs the AI.                                                  |
| 46 | **🂠 Solitaire**              | Klondike patience — build foundations by suit                                                                                                                                               |
| 47 | **⚡ Speed**                 | Shed your cards faster than the AI — first empty hand wins                                                                                                                                  |
| 48 | **🌱 Sprouts**               | Conway                                                                                                                                                                                      |
| 49 | **🛡️ Tablut (Viking Chess)** | Escort the king to a corner — attackers surround him to win                                                                                                                                 |
| 50 | **🔺 Tangram**               | Drag, rotate and flip the 7 tans to rebuild the square                                                                                                                                      |
| 51 | **⭕ Tic Tac Toe**           | Classic 3-in-a-row vs smart AI or a friend                                                                                                                                                  |
| 52 | **⚡ Tic Tac Toe Extreme**   | Tic Tac Toe with a twist — only 3 pieces per player, oldest disappears                                                                                                                      |
| 53 | **🪢 Tic-Tac-Toe Tie**       | Misère TTT — first to 3-in-a-row LOSES.                                                                                                                                                     |
| 54 | **♟️ Tiny Chess**            | Gardner-style 4×4 minichess — full piece moves, capture the enemy king to win.                                                                                                              |
| 55 | **🎰 Video Poker**           | Jacks or Better — hold cards, draw, and hit the paytable                                                                                                                                    |
| 56 | **🃏 War**                   | Classic card game. Higher card wins. Ties trigger war!                                                                                                                                      |
| 57 | **🛥️ Yacht Dice**            | The pre-Yahtzee classic: 5 dice, 3 rolls per turn, and a full 13-category scorecard — upper bonus at 63, straights, full house and the 50-point Yacht. 13 turns, aim high.                  |

</details>

<details>
<summary><b>🧠 Quiz games (46)</b> — click to expand</summary>

| #  | Game                        | Highlights                                                       |
|----|-----------------------------|------------------------------------------------------------------|
| 1  | **📜 Ancient History Quiz** | Ancient History Quiz — 10 multiple-choice questions, 15s each.   |
| 2  | **🦁 Animal Quiz**          | Guess the animal from a fun fact                                 |
| 3  | **🎨 Art Quiz**             | Art Quiz — 10 multiple-choice questions, 15s each.               |
| 4  | **🔭 Astronomy Quiz**       | Astronomy Quiz — 10 multiple-choice questions, 15s each.         |
| 5  | **✈️ Aviation Quiz**        | Aviation Quiz — 10 multiple-choice questions, 15s each.          |
| 6  | **🏛️ Capitals Quiz**        | Match capital cities to their countries                          |
| 7  | **🚗 Car Trivia Quiz**      | Car Trivia Quiz — 10 multiple-choice questions, 15s each.        |
| 8  | **♞ Chess Quiz**           | Chess Quiz — 10 multiple-choice questions, 15s each.             |
| 9  | **🕰️ Chronology**           | Put the four events in the right time order                      |
| 10 | **🎨 Color Quiz**           | Identify the color name from a swatch                            |
| 11 | **🗺️ Country Shapes**       | Name the country from its outline alone                          |
| 12 | **🦕 Dinosaur Quiz**        | Dinosaur Quiz — 10 multiple-choice questions, 15s each.          |
| 13 | **🐕 Dog Breeds Quiz**      | Dog Breeds Quiz — 10 multiple-choice questions, 15s each.        |
| 14 | **🤔 Emoji Quiz**           | Guess the movie, song or phrase from emoji clues                 |
| 15 | **🤔 Estimation**           | Closest guess wins — numbers too big to know exactly             |
| 16 | **🚩 Flag Quiz**            | Match flag emojis to their countries                             |
| 17 | **🍽️ Food Quiz**            | Guess the dish from its ingredients list                         |
| 18 | **🌍 Geography Quiz**       | Test your knowledge of world geography                           |
| 19 | **⚡ Greek Mythology Quiz** | Greek Mythology Quiz — 10 multiple-choice questions, 15s each.   |
| 20 | **📜 History Quiz**         | Test your knowledge of world history                             |
| 21 | **💡 Inventions Quiz**      | Inventions Quiz — 10 multiple-choice questions, 15s each.        |
| 22 | **🔢 Letter Count**         | Count how many of a given letter appear in the word — quick!     |
| 23 | **📚 Literature Quiz**      | Literature Quiz — 10 multiple-choice questions, 15s each.        |
| 24 | **🏷️ Logo Guess**           | Guess the brand from a text description (no logos for copyright) |
| 25 | **🎵 Lyrics Quiz**          | Guess the song from a famous lyric snippet                       |
| 26 | **➕ Math Quiz**            | Solve as many arithmetic problems as you can in 60s              |
| 27 | **🎬 Movie Trivia Quiz**    | Movie Trivia Quiz — 10 multiple-choice questions, 15s each.      |
| 28 | **🎼 Music Theory Quiz**    | Music Theory Quiz — 10 multiple-choice questions, 15s each.      |
| 29 | **🎶 Music Trivia Quiz**    | Music Trivia Quiz — 10 multiple-choice questions, 15s each.      |
| 30 | **🌊 Ocean Life Quiz**      | Ocean Life Quiz — 10 multiple-choice questions, 15s each.        |
| 31 | **🏅 Olympics Quiz**        | Olympics Quiz — 10 multiple-choice questions, 15s each.          |
| 32 | **💭 Philosophy Quiz**      | Philosophy Quiz — 10 multiple-choice questions, 15s each.        |
| 33 | **🔬 Science Quiz**         | Test your knowledge of science facts                             |
| 34 | **⏱️ Speed Round**           | 30 seconds, endless questions — how many can you nail?           |
| 35 | **🏆 Sports Trivia Quiz**   | Sports Trivia Quiz — 10 multiple-choice questions, 15s each.     |
| 36 | **🌈 Stroop Test**          | Click the COLOR of the text — not the word it spells             |
| 37 | **💻 Tech Trivia Quiz**     | Tech Trivia Quiz — 10 multiple-choice questions, 15s each.       |
| 38 | **📅 Timeline**             | Guess the year each event happened — closest wins                |
| 39 | **🪜 Trivia Ladder**        | Climb twelve questions with three lifelines                      |
| 40 | **🧠 Trivia Quiz**          | 10 multiple-choice questions against the clock                   |
| 41 | **⚖️ True or False**        | Decide if each statement is true or false                        |
| 42 | **🤥 Two Truths**           | Three statements — spot the lie                                  |
| 43 | **🎮 Video Games Quiz**     | Video Games Quiz — 10 multiple-choice questions, 15s each.       |
| 44 | **🕵️ Who Am I?**            | Guess the mystery figure from clues — fewer clues, more points   |
| 45 | **🍜 World Cuisines Quiz**  | World Cuisines Quiz — 10 multiple-choice questions, 15s each.    |
| 46 | **🗣️ World Languages Quiz** | World Languages Quiz — 10 multiple-choice questions, 15s each.   |

</details>

## ✨ Features

- **300 games across 5 categories** — word, logic, arcade, strategy, quiz. See the full list below.
- **Recently played rail** — every game you open is remembered. A "Recently played" rail appears at the top of the home
  view (quick re-entry) and at the bottom of each game view (jump to another recently played game without going back to
  the hub). Capped at 20 most-recent-first.
- **Similar games suggestions** — each game view shows a "You might also like" rail with up to 6 similar games, scored
  by category, difficulty, duration, player count, and shared tags. Click any card to jump straight in.
- **Daily challenge** — a banner on the home view features one game per day, picked deterministically by date. Everyone
  gets the same featured game on the same day.
- **Recommended for you** — a home rail merging your most-played games from the last 7 days (trending) with personalized
  picks from your most-played category (for-you). Capped at 8 cards, appears once you've played enough to make a
  suggestion.
- **Stats dashboard** — click the 📊 icon in the topbar to see total plays, wins, win rate, current + longest day streak,
  favorites count, recent count, achievements unlocked, and a per-category bar breakdown.
- **Achievements** — 26 unlockable badges (First Win, Centurion, Word Wizard, On a Roll, Night Owl, Marathon Runner,
  etc.). Click the 🏅 icon to see them all; unlocked ones are highlighted. A dot on the button appears when you have any
  unlocked.
- **Share result** — every game has a 🔗 Share button in the header that copies a result line to the clipboard (includes
  the game name, your best score, and a link back to the game).
- **Hide games** — right-click (or long-press on mobile) any game card to hide it from your grid. Hidden games are still
  reachable via the favorites filter.
- **Keyboard navigation** — arrow keys move focus between game cards on the home grid; Enter opens the focused card.
  Works alongside the existing keyboard shortcuts inside games.
- **Advanced multi-dimensional filters** — filter by Type (Word/Logic/Arcade/Strategy/Quiz), Age (Kids 6+/Teens
  13+/Adults 18+), Difficulty (Easy/Medium/Hard), Length (Quick <2 min/Medium 2–10/Long >10 min), and Players
  (1-Player/2-Player). Reset button clears all filters at once. Live count shows how many games match.
- **24 visual themes** switchable in-app (retro, modern, aesthetic, seasonal):
    - **Modern Minimal** — clean, indigo accent (Inter)
    - **Retro Arcade** — dark with neon glow + pixel fonts (Press Start 2P / VT323)
    - **Playful Cartoon** — bright gradients, big rounded shapes (Baloo 2 / Nunito)
    - **Dark Neon Casino** — dark slate with gold accents + serif headings (Playfair Display)
    - **Forest** — green/brown nature theme (light) or dark forest (dark)
    - **Sunset** — warm orange/pink (light) or deep amber (dark)
    - **Cyberpunk** — magenta/cyan on dark (Orbitron mono font)
    - **Mono Print** — high-contrast B&amp;W like a newspaper (Playfair Display + Inter)
    - **8-Bit NES** — limited 8-bit palette, pixelated
    - **Game Boy** — 4-shade green monochrome
    - **CGA Palette** — IBM PC CGA cyan/magenta on black
    - **MS-DOS** — gray-on-black terminal look
    - **Matrix** — green-on-black with text glow
    - **CRT Amber** — amber phosphor monitor with scanlines
    - **Vaporwave** — pink/cyan/purple gradient aesthetic
    - **Paperwhite** — e-reader clean B/W (light + dark)
    - **Sepia** — vintage paper tones
    - **Newspaper** — black &amp; white print look
    - **🎃 Halloween** — orange/purple glow with Creepster font
    - **🎄 Christmas** — red/green with Mountains of Christmas font
    - **🌊 Ocean Deep** — deep-sea blues with cyan/teal accents
    - **❄️ Arctic Frost** — icy blues with soft glows
    - **🍬 Candy Pop** — pink/violet pastels with rounded shapes (Baloo 2 / Nunito)
    - **☕ Coffee House** — warm browns with serif type (Georgia)
- **Fixed top navigation** — the nav bar stays pinned to the top of the viewport while you scroll (its height is
  auto-synced to `--topbar-h`, so themes and font scaling never break the layout).
- **Accessibility panel** — font size (A−/A+), high contrast, reduce motion, dyslexia-friendly font, large focus rings,
  color-blind simulation (protanopia/deuteranopia/tritanopia), and OS-settings auto-detect (`prefers-reduced-motion` /
  `prefers-contrast`). Settings persist via `localStorage`. Includes a screen-reader `aria-live` region that announces
  game opens and wins.
- **Dialog accessibility** — modals use `role="dialog"` + `aria-modal`, move focus into themselves on open, trap
  <kbd>Tab</kbd> inside while open, and restore focus to the invoking element on close. Toggle buttons (sound, mode,
  favorites filter, theme chips) expose `aria-pressed` state, and the search field has an `aria-label`.
- **Favorite hearts** — a frosted chip behind each heart keeps it readable on any thumbnail, turning solid red when
  active.
- **Data export / import** — download all your data (favorites, scores, stats, achievements, recent, hidden, settings)
  as a JSON backup, and restore it on another device. Also a "Reset all" option to erase everything.
- **PWA install prompt** — a banner appears (on supported browsers) inviting you to install the app for offline play.
  Dismissible.
- **Offline indicator** — a small "Offline" badge appears in the topbar when `navigator.onLine` is false, so you know
  you're playing from cache.
- **Sound FX** — Web Audio API beeps for click / win / lose / pop / flip, with mute toggle.
- **Best scores** saved per game (and per difficulty where applicable) via `localStorage`.
- **Favorites** — heart any game; the fav filter shows only your starred games.
- **Search &amp; filter** — filter by category + free-text search.
- **Sort options** — sort the game grid by default order, favorites first, name (A–Z), most played, recently played, or
  best score.
- **Back-to-top button** — a floating button appears when you scroll down, smoothly scrolls back to top.
- **Time-of-day greeting** — the hero shows "Good morning/afternoon/evening!" with your current streak.
- **Keyboard shortcut help** — press <kbd>?</kbd> to see all shortcuts; press <kbd>/</kbd> to focus the search box.
- **Confetti** — a celebratory animation fires when you unlock an achievement.
- **Card hover tooltips** — hovering a game card shows play count + best score.
- **Card stagger animation** — cards fade in with a stagger when the grid renders.
- **Custom scrollbars** — themed scrollbars matching the active theme.
- **Empty state** — when no games match your filter, a friendly empty state with a reset button appears.
- **Focus management** — closing a game returns focus to the card you opened it from.
- **Game mount error UI** — if a game fails to load, a friendly error with "Back to hub" and "Try again" buttons
  appears.
- **Print-friendly CSS** — print the stats or achievements modal cleanly (hides navigation, game view, etc.).
- **Hash routing** — each game has a shareable URL like `index.html#/wordle`.
- **Per-game help, hint, and solve buttons** — every game has a Help button explaining the rules; thinking games also
  have Hint (a nudge) and Solve (reveal the solution) buttons.
- **Non-predictable content** — Wordle, Hangman, and Trivia can fetch fresh content from Wikipedia and Open Trivia DB at
  runtime, with offline fallback to bundled lists. Cached 24h in IndexedDB so the same session doesn't re-fetch.
- **Mobile-friendly** — responsive grid, D-pads, swipe gestures, long-press flags.
- **Keyboard nav without browser interference** — every game supports the physical keyboard. The hub prevents Firefox
  quick-find (`/`, `'`) and Chrome search (`Ctrl+K`) from firing while a game is active, so typing letters / arrows /
  digits goes straight to the game.
- **PWA-ready** — installable on mobile, works offline via service worker.
- **Zero dependencies** — vanilla ES5/ES6 JS. Only one CDN call for Google Fonts (graceful fallback to system fonts if
  offline).

---

## 🚀 Quickstart

```bash
git clone https://github.com/HossamBalaha/Pixel-Arcade.git
cd Pixel-Arcade
python3 -m http.server 8000
# open http://localhost:8000/ in your browser
```

Or just open `index.html` directly in a browser. (Web Audio and service worker need a `localhost` or `https://` origin,
but everything else works on `file://`.)

---

## 📂 Project structure

```
Pixel-Arcade/
├── index.html              # Home shell — top bar, grid, game-view, modal, toasts
├── README.md               # This file
├── LICENSE                 # MIT
├── CONTRIBUTING.md         # How to add games / fix bugs
├── CODE_OF_CONDUCT.md      # Contributor Covenant 2.0
├── SECURITY.md             # Vulnerability reporting + known surfaces
├── CITATION.cff            # Citation metadata for academic use
├── site.webmanifest        # PWA manifest (single source of truth)
├── 404.html                # Branded not-found page
├── .nojekyll               # Disables Jekyll on GitHub Pages so all files pass through
├── browserconfig.xml       # Windows tile config
├── sw.js                   # Service worker — offline cache
├── robots.txt              # Allow all
├── sitemap.xml             # root URL only (per-game URLs are hash-routed)
├── .gitignore              # OS / editor / node cruft
├── css/
│   ├── themes.css          # 24 themes × light/dark via CSS variables
│   ├── base.css            # Layout, topbar, cards, buttons, modal, toasts
│   └── games.css           # Shared game-board styles
├── js/
│   ├── storage.js          # localStorage helpers (theme/mode/sound/favs/bests)
│   ├── audio.js            # Web Audio sound FX
│   ├── registry.js         # GameRegistry.register() pattern
│   ├── wikifetch.js        # Wikipedia + Open Trivia DB fetch with offline fallback
│   ├── app.js              # Router, theme switcher, grid, modal, toasts
│   ├── wordlist.js         # Comprehensive English word list (4/5/6-letter, NLTK-based)
│   └── games/              # 300 self-contained game files
│       ├── tictactoe.js
│       ├── wordle.js
│       ├── ...
│       └── slotmachine.js
├── tools/
│   └── generate-thumbnails.js  # Thumbnail generator — edit + re-run to
│                                # overwrite every game thumbnail (source of truth)
└── assets/
    ├── .gitkeep
    ├── icons/
    │   ├── logo.svg                 # Source SVG (hand-drawn, no copyright issues)
    │   ├── favicon.ico              # 16/32/48 multi-resolution
    │   ├── favicon-16x16.png
    │   ├── favicon-32x32.png
    │   ├── favicon-96x96.png
    │   ├── apple-touch-icon.png      # 180×180
    │   ├── android-chrome-192x192.png
    │   ├── android-chrome-512x512.png
    │   └── mstile-150x150.png
    └── thumbnails/
        ├── tictactoe.svg            # 300 game thumbnails (220×140 each)
        ├── wordle.svg
        └── ...
```

---

## ➕ Add a new game

1. Create `js/games/mygame.js`:

```javascript
(function () {
  let live = null;
  GameRegistry.register({
    id: "mygame",
    name: "My Game",
    icon: "🎲",
    category: "logic",            // word | logic | arcade | strategy | quiz
    description: "One short sentence.",
    tags: ["fun", "new"],
    mount: function (root, ctx) {
      const {App, AudioFX, Storage} = ctx;
      let alive = true;
      const pendingTimers = [];

      function later(fn, ms) {
        const id = setTimeout(() => {
          if (alive) fn();
        }, ms);
        pendingTimers.push(id);
        return id;
      }

      // ... build UI inside root ...
      let state = { /* ... */};

      function doHint() { /* ... */
      }

      function doSolve() { /* ... */
      }

      live = {hint: doHint, solve: doSolve};

      function onKey(e) { /* ... */
      }

      document.addEventListener("keydown", onKey);

      return function cleanup() {
        alive = false;
        document.removeEventListener("keydown", onKey);
        pendingTimers.forEach(clearTimeout);
        live = null;
      };
    },
    hint: function () {
      if (live && live.hint) live.hint();
    },
    solve: function () {
      if (live && live.solve) live.solve();
    },
    help: function () {
      App.showModal("How to play My Game", "...");
    },
  });
})();
```

2. Add the game to `js/catalog.js` (step 3 below), then generate its thumbnail automatically:

   ```bash
   node tools/generate-thumbnails.js --only=mygame   # or run with no flags to regenerate ALL
   ```

   The generator reads `js/catalog.js` and writes `assets/thumbnails/<id>.svg` (220×140, icon on a
   category-coded gradient). Edit the CONFIG at the top of `tools/generate-thumbnails.js` — colors, icon
   overrides, hand-drawn vector icons, layout — and re-run; existing thumbnails are overwritten to match.
   `node tools/generate-thumbnails.js --check` verifies every game has a valid, font-safe thumbnail.

3. Register the game in the catalog so it appears on the hub: add an entry to `js/catalog.js`'s `CATALOG` array
   (`{id, name, icon, category, description, tags, age, difficulty, duration, players}`). The hub renders from this
   manifest and lazy-loads `js/games/<id>.js` only when the card is opened (hovering preloads it), so no
   `<script>` tag in `index.html` is needed. Optionally enrich `js/game-metadata.js` instead — both work.

4. Test by visiting `http://localhost:8000/#/mygame` (or `http://localhost:8000/?game=mygame` for the shareable
   deep link).

5. Update this README — add your game to the appropriate category table above.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full pull-request checklist.

---

## 🎨 Theming

Themes are pure CSS variables. To customize colors, fonts, or radii, edit `css/themes.css`:

```css
[data-theme="minimal"][data-mode="dark"] {
    --accent: #ff6b6b; /* change accent color */
    --radius: 8px; /* change border radius */
}
```

Switching themes at runtime: `document.documentElement.setAttribute("data-theme", "casino")` and
`setAttribute("data-mode", "dark")`. The in-app switcher already does this and persists the choice in `localStorage`.

---

## ♿ Accessibility

- All keyboard-operable games respect `prefers-reduced-motion`.
- Buttons have `aria-label`s where icons-only.
- Color contrast follows WCAG AA in the Modern Minimal theme.
- The whole app works without a mouse.
- Most games are keyboard-only navigable.

---

## 📦 Tech stack

- **HTML** — single `index.html` shell
- **CSS** — three stylesheets, custom properties, no preprocessor
- **JavaScript** — vanilla ES5/ES6, no framework, no bundler, no `npm install`
- **Fonts** — Google Fonts (Inter, Press Start 2P, VT323, Baloo 2, Nunito, Playfair Display, JetBrains Mono). Falls back
  to system fonts if the CDN is blocked.
- **PWA** — service worker (`sw.js`) + manifest + offline cache.
- **External APIs** (optional, online-source toggle):
    - `https://en.wikipedia.org/w/api.php` — random article titles for Wordle/Hangman
    - `https://en.wikipedia.org/api/rest_v1/page/summary` — trivia facts
    - `https://opentdb.com/api.php` — Trivia Quiz online questions
    - All public, no API keys, CORS-enabled.

---

## 👤 About the author

**Hossam Magdy Balaha** is the creator and sole maintainer of Pixel Arcade. The project started as a single-page hub for
a handful of classic games and grew into a 300-game collection spanning every major casual-game genre.

- Maintainer: Hossam Magdy Balaha
- License: MIT (free for personal and commercial use, attribution appreciated)
- Issues and pull requests welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md)

If you use Pixel Arcade in research or teaching, please cite it using the metadata in [CITATION.cff](./CITATION.cff).

---

## 📄 License &amp; community files

| File                                       | Purpose                                                |
|--------------------------------------------|--------------------------------------------------------|
| [LICENSE](./LICENSE)                       | MIT — free for any use, attribution appreciated.       |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | How to add games, fix bugs, open pull requests.        |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Contributor Covenant 2.0 — be excellent to each other. |
| [SECURITY.md](./SECURITY.md)               | How to report security vulnerabilities.                |
| [CITATION.cff](./CITATION.cff)             | Citation metadata for academic use.                    |

All artwork in `assets/icons/` and `assets/thumbnails/` is **original work** generated for this project — no copyrighted
content. The source `logo.svg` is a hand-drawn arcade cabinet; every thumbnail is an SVG produced by
`tools/generate-thumbnails.js` (emoji or hand-drawn vector icon on a category-coded gradient). Reuse freely under
MIT.

---

## 🙋 FAQ

<details>
<summary><b>Can I add my own Wordle word list?</b></summary>

Yes — open `js/games/wordle.js` and edit the `WORDS` constant. Same for Hangman (`WORDS` array), Word Scramble, Trivia
(`QUESTIONS` array), etc.
</details>

<details>
<summary><b>Will my best scores carry across devices?</b></summary>

No — they're stored in `localStorage` on each device. Add a sync backend if you need cross-device scores.
</details>

<details>
<summary><b>Why are some games slow?</b></summary>

Connect 4 Hard AI uses minimax depth 5 — first move takes ~1-2s. Other difficulties are instant.
</details>

<details>
<summary><b>Can I deploy on Netlify/Vercel/Cloudflare Pages?</b></summary>

Yes — drop the folder in, no build command needed. Set publish directory to the folder root.
</details>

<details>
<summary><b>How do the Hint and Solve buttons work?</b></summary>

- The **Help** button (❔) is available on every game and explains the rules.
- The **Hint** button (💡) is available on thinking games (Wordle, Hangman, Mastermind, Sudoku, Minesweeper, Number
  Guess, Trivia, Sliding Puzzle, Lights Out, etc.) and gives you a small nudge — reveal a letter, narrow the range,
  highlight a move.
- The **Solve** button (✓) is available on games where a solution exists (Wordle, Hangman, Mastermind, Sudoku,
  Minesweeper, Hanoi, etc.) and reveals the full solution, ending the game as a loss.
- Buttons that don't apply to a game are hidden automatically.

</details>

<details>
<summary><b>What happens when Wikipedia is offline?</b></summary>

The games fall back to bundled word lists (50+ words per difficulty) so the game remains playable. The cache is held in
IndexedDB for 24h, so even after the network comes back, you won't re-fetch the same content during the same session.
</details>

<details>
<summary><b>How do I make a 301st game?</b></summary>

See [➕ Add a new game](#-add-a-new-game) above. The framework scales to hundreds of games — each game is one
self-contained JS
file.
</details>

---

*Built with ❤️ and AI assistance by Hossam Magdy Balaha. MIT License.*
