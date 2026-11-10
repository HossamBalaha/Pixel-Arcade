#!/usr/bin/env python3
"""
Color-clash audit for Pixel Arcade canvas games.

Static analysis: parses every js/games/*.js, finds canvas fill/stroke colors,
reconstructs which colors paint the background layer (full-canvas / large
fillRects) and which paint game elements, resolves theme-variable colors
(--text, --accent, ...) against every theme variant in css/themes.css, and
reports element/background pairs whose worst-case WCAG contrast ratio across
all themes falls below a threshold.

Catches the "invisible game element" bug class, e.g. a puck drawn with
--text (#0f172a in light themes) on a hardcoded #0f172a rink.

Usage:
    python3 tools/audit-colors.py               # report pairs < 2.5, worst first
    python3 tools/audit-colors.py --threshold 3 # stricter cut

Zero dependencies (Python 3 stdlib only). Exit code is always 0 — read the
report and judge: element-on-element fills (eyes on a body, overlays under
white "Game Over" text) are expected false positives.

Design rule enforced by convention:
    * a game with a FIXED scene background (rink, cave, night sky) must draw
      its elements in FIXED high-contrast colors — never theme variables;
    * a game that fills its canvas with a theme variable (--bg-soft) must
      draw its elements with theme variables that contrast in every theme.
"""
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
GAMES_DIR = SITE / "js" / "games"
THEMES_CSS = SITE / "css" / "themes.css"

THRESHOLD = 2.5


# ---------- color math ----------
def srgb_to_lin(c):
  c = c / 255.0
  return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(rgb):
  r, g, b = rgb
  return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)


def contrast(rgb1, rgb2):
  l1, l2 = luminance(rgb1), luminance(rgb2)
  if l1 < l2:
    l1, l2 = l2, l1
  return (l1 + 0.05) / (l2 + 0.05)


def parse_color(s):
  s = s.strip()
  m = re.fullmatch(r"#([0-9a-fA-F]{3})", s)
  if m:
    h = m.group(1)
    return tuple(int(h[i] * 2, 16) for i in range(3)) + (1.0,)
  m = re.fullmatch(r"#([0-9a-fA-F]{6})", s)
  if m:
    h = m.group(1)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
  m = re.fullmatch(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)", s)
  if m:
    a = float(m.group(4)) if m.group(4) is not None else 1.0
    return (float(m.group(1)), float(m.group(2)), float(m.group(3)), a)
  return None


def blend(fg, bg):
  r, g, b, a = fg
  return (r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a))


# ---------- themes ----------
def parse_themes():
  css = THEMES_CSS.read_text()
  themes = {}
  for m in re.finditer(r"\[data-theme=\"([a-z]+)\"\]\[data-mode=\"([a-z]+)\"\][^{]*\{([^}]*)\}", css):
    name = "%s-%s" % (m.group(1), m.group(2))
    vals = {}
    for pm in re.finditer(r"--([a-z0-9-]+)\s*:\s*([^;]+);", m.group(3)):
      vals[pm.group(1)] = pm.group(2).strip()
    themes.setdefault(name, {}).update(vals)
  return themes


THEMES = parse_themes()


def theme_var_rgb(var, theme):
  v = theme.get(var)
  if not v:
    return None
  c = parse_color(v)
  return tuple(c[:3]) if c else None


VAR_READ = re.compile(
  r"(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=\s*[A-Za-z_$][\w$]*\.getPropertyValue\(\"--([a-z0-9-]+)\"\)"
  r"(?:\.trim\(\))?(?:\s*\|\|\s*(\"[^\"]*\"|'[^']*'))?"
)
FILL_RE = re.compile(r"\.fillStyle\s*=\s*([^;]+);")
STROKE_RE = re.compile(r"\.strokeStyle\s*=\s*([^;]+);")
RECT_RE = re.compile(r"fillRect\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)")


def is_big_dim(expr):
  expr = expr.strip()
  if re.search(r"\b(W|H|w|h|cw|ch|Wd|Ht|width|height)\b", expr):
    return True
  if re.search(r"canvas\.(width|height)", expr):
    return True
  if re.fullmatch(r"[\d.]+", expr) and float(expr) >= 150:
    return True
  return False


def audit_game(path):
  src = path.read_text()
  if "getContext" not in src and "<canvas" not in src:
    return []
  issues = []
  ident2var = {}
  for m in VAR_READ.finditer(src):
    ident2var[m.group(1)] = (m.group(2), m.group(3).strip("\"'") if m.group(3) else None)

  lines = src.split("\n")
  n = len(lines)

  def classify(expr):
    expr = expr.strip()
    m = re.fullmatch(r"[\"']([^\"']+)[\"']", expr)
    if m:
      return ("hard", m.group(1)) if parse_color(m.group(1)) else None
    if expr in ident2var:
      return ("var", ident2var[expr][0])
    m = re.fullmatch(r"[A-Za-z_$][\w$]*\.getPropertyValue\(\"--([a-z0-9-]+)\"\)(?:\.trim\(\))?", expr)
    if m:
      return ("var", m.group(1))
    m = re.fullmatch(r"`\$\{([A-Za-z_$][\w$]*)\}`", expr)
    if m and m.group(1) in ident2var:
      return ("var", ident2var[m.group(1)][0])
    return None

  # pass 1: background layers (fillStyle feeding a full-canvas or large fillRect)
  bg_layers = []
  for i, line in enumerate(lines):
    for m in FILL_RE.finditer(line):
      c = classify(m.group(1))
      if not c:
        continue
      for j in range(i, min(i + 3, n)):
        rm = RECT_RE.search(lines[j])
        if rm:
          x, y, w_, h_ = rm.groups()
          origin = re.fullmatch(r"0\s*", x) and re.fullmatch(r"0\s*", y)
          big = is_big_dim(w_) and is_big_dim(h_)
          if origin or big:
            if c[0] == "hard":
              pc = parse_color(c[1])
              if pc and pc[3] > 0.85:
                bg_layers.append((j + 1, "hard", tuple(int(v) for v in pc[:3]),
                                  "L%d #%s %s" % (j + 1, c[1], "full" if origin else "scene")))
            else:
              bg_layers.append((j + 1, "var", c[1],
                                "L%d var --%s %s" % (j + 1, c[1], "full" if origin else "scene")))
          break

  # pass 2: elements (fillStyle/strokeStyle that are not background fills)
  for i, line in enumerate(lines):
    for regex, role in ((FILL_RE, "fill"), (STROKE_RE, "stroke")):
      for m in regex.finditer(line):
        c = classify(m.group(1))
        if not c:
          continue
        is_bg = False
        for j in range(i, min(i + 3, n)):
          rm = RECT_RE.search(lines[j])
          if rm:
            x, y, w_, h_ = rm.groups()
            origin = re.fullmatch(r"0\s*", x) and re.fullmatch(r"0\s*", y)
            big = is_big_dim(w_) and is_big_dim(h_)
            if origin or big:
              is_bg = True
            break
        if is_bg:
          continue
        if c[0] == "hard":
          pc = parse_color(c[1])
          if not pc or pc[3] < 0.55:  # translucent tints are decorative
            continue
        cands = [b for b in bg_layers if b[0] <= i + 1]
        if not cands:
          cands = [(0, "page", "bg", "transparent canvas over page --bg")]
        bg = cands[-1]
        worst = None
        for tname, tvars in THEMES.items():
          if c[0] == "var":
            ec = theme_var_rgb(c[1], tvars)
            if not ec:
              continue
          else:
            pc = parse_color(c[1])
            ec = tuple(int(v) for v in pc[:3])
          if bg[1] == "hard":
            bc = bg[2]
          elif bg[1] == "var":
            bc = theme_var_rgb(bg[2], tvars)
            if not bc:
              continue
          else:
            bc = theme_var_rgb("bg", tvars)
            if not bc:
              continue
          r = contrast(ec, bc)
          if worst is None or r < worst[0]:
            worst = (r, tname)
        if worst and worst[0] < THRESHOLD:
          issues.append({
            "game" : path.stem, "line": i + 1, "role": role,
            "color": m.group(1).strip(),
            "kind" : ("var --" + c[1]) if c[0] == "var" else "hardcoded",
            "bg"   : bg[3], "ratio": round(worst[0], 2), "theme": worst[1],
          })
  return issues


def main():
  threshold = THRESHOLD
  if "--threshold" in sys.argv:
    try:
      threshold = float(sys.argv[sys.argv.index("--threshold") + 1])
    except (IndexError, ValueError):
      pass
  all_issues = []
  for p in sorted(GAMES_DIR.glob("*.js")):
    all_issues.extend(audit_game(p))
  all_issues.sort(key=lambda x: x["ratio"])
  seen, out = set(), []
  for i in all_issues:
    key = (i["game"], i["color"], i["bg"], i["role"])
    if key in seen:
      continue
    seen.add(key)
    out.append(i)
  print("== Color clash audit: %d pairs (worst-case ratio < %s) ==\n" % (len(out), threshold))
  cur = None
  for i in out:
    if i["game"] != cur:
      cur = i["game"]
      print("\n--- %s ---" % i["game"])
    print("  L%4d %6s %-30s (%s) on %s  ->  %s @ %s"
          % (i["line"], i["role"], i["color"], i["kind"], i["bg"], i["ratio"], i["theme"]))
  games = sorted(set(i["game"] for i in out))
  print("\n%d pairs across %d games: %s" % (len(out), len(games), ", ".join(games)))
  print("\nNOTE: element-on-element fills (eyes on a body, dark overlay under white"
        "\n'Game Over' text) and per-cell board paints are expected false positives."
        "\nReview each hit before changing colors.")


if __name__ == "__main__":
  main()
