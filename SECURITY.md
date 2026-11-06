# Security Policy

Pixel Arcade is a static client-side web app — no backend, no database, no authentication. The attack surface is minimal
but not zero.

## Supported versions

Only the latest release on `main` is supported. Older versions do not receive security updates.

## Reporting a vulnerability

**DO NOT open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting: go to
**https://github.com/HossamBalaha/Pixel-Arcade/security/advisories/new** and click "Report a vulnerability". This keeps
the report private to the maintainer until a fix is published.

Alternatively, open a private discussion with the maintainer via the repo's **Security** tab.

Please include:

- A description of the issue
- Steps to reproduce
- Affected file(s) or game(s)
- Suggested fix (if any)

You will receive a response within 7 days.

## Known attack surfaces

### 1. localStorage

The app stores user preferences (theme, mode, sound, favorites, best scores) in `localStorage`. A malicious script
running on the same origin could read or tamper with these.

**Mitigation**: do not store secrets in localStorage. (We don't.)

### 2. Service Worker cache poisoning

If an attacker can serve modified `sw.js` or `index.html`, they could cache malicious versions and persist them.

**Mitigation**: only deploy via GitHub Pages (HTTPS) and verify the source before deploying.

### 3. Cross-origin API calls

The app calls:

- `https://en.wikipedia.org/w/api.php` (random article titles for Wordle/Hangman)
- `https://en.wikipedia.org/api/rest_v1/page/summary` (trivia facts)
- `https://opentdb.com/api.php` (trivia questions)

These are CORS-enabled public APIs with no API key. We trust the responses only as game content (never as code) and
decode HTML entities before display. Fetched text is inserted as `textContent` (not `innerHTML`) — so XSS via Wikipedia
content is not possible.

If any of these APIs goes rogue or is compromised, the worst case is incorrect game content. No user data is sent to
these APIs.

### 4. Wikipedia article titles

We filter Wikipedia random article titles to:

- only ASCII letters (A-Z)
- length 4-12

This eliminates profanity / offensive titles in most cases, but Wikipedia's content is moderated by humans — if you spot
an offensive word appearing, please report it (see above).

### 5. innerHTML usage

The game framework uses `innerHTML` to build UI in some places (e.g. `root.innerHTML = "..."` in mount functions). All
inserted strings are either:

- static literals in our code (safe)
- values from `Wiki.randomWord()` / `Wiki.randomTrivia()` which are inserted as `textContent` after decoding HTML
  entities (safe)
- user input from `<input>` fields which is read via `.value` and inserted as `textContent` (safe)

The single deliberate exception is the `decode()` helper in `js/games/trivia.js`, which decodes HTML entities returned
by OpenTDB. It uses a `<textarea>` element (whose `.value` reflects the decoded text without parsing it as HTML), so an
unescaped `<img onerror=…>` in the API response can never execute. If you contribute a new game that needs to decode
HTML entities from a remote source, copy this pattern — do **not** use a `<div>` + `.textContent` (which parses the
string as HTML first).

If you contribute a new game, **never** insert user-controlled text via `innerHTML` without escaping.

## Disclosure policy

- Public disclosure after the fix is released, with credit to the reporter (unless they prefer to remain anonymous).
