#!/usr/bin/env python3
"""Move changes made to the old web/app.js and web/styles.css into the parts in web/app/ and web/css/.

On 15 Nov 2026 app.js and styles.css were split into parts (tools/podziel_app.py, web/app/README.md). Work that was
started on the old files (a stash, or commits on another branch) no longer applies with `git pull`. This tool does a
normal 3-way merge instead: the parts in your working tree are joined back into one app.js (exactly as it would look),
your changes are merged into it (`git merge-file`, like git does), and the result is split again into the parts.
Only the parts your changes touch are rewritten. Conflicts get the usual <<<<<<< ======= >>>>>>> markers.

    git stash                                    # your edits of app.js / styles.css (and anything else) go to the stash
    git pull                                     # brings the split
    python3 poznan-trend-detective/tools/przenies_zmiany_app.py stash@{0}
    git stash pop; git rm -q poznan-trend-detective/web/app.js poznan-trend-detective/web/styles.css; git stash drop
                                                 # (the last line brings back your other files; app.js and styles.css
                                                 #  come back as "deleted by us": remove them, they live in the parts now)

With commits on your own branch: python3 .../przenies_zmiany_app.py my-branch   (run it on main, after git pull)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import podziel_app as P  # noqa: E402

APP = HERE.parent              # poznan-trend-detective/
WEB = APP / "web"
REPO = Path(subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=APP, capture_output=True, text=True, check=True).stdout.strip())
REL = APP.relative_to(REPO).as_posix()


def git(*args, ok=False):
    r = subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True)
    if r.returncode and not ok:
        sys.exit(f"git {' '.join(args)}: {r.stderr.strip()}")
    return r


def show(ref, name):
    r = git("show", f"{ref}:{REL}/web/{name}", ok=True)
    return r.stdout if r.returncode == 0 else None


def merge(kind, ref, base_ref):
    """3-way merge of one old file into its parts. Returns (conflicts, changed parts, moved: False if left for hand work)."""
    name = "app.js" if kind == "js" else "styles.css"
    theirs, base = show(ref, name), show(base_ref, name)
    if theirs is None or base is None:
        print(f"{name}: not in {ref if theirs is None else base_ref}, nothing to move")
        return 0, [], True
    if theirs == base:
        print(f"{name}: no changes in {ref}")
        return 0, [], True
    d, ext = ("app", "js") if kind == "js" else ("css", "css")
    files = sorted((WEB / d).glob(f"[0-9][0-9]*.{ext}"))
    names = [f.name for f in files]
    texts = [f.read_text(encoding="utf-8") for f in files]
    current = P.join_js(texts, names) if kind == "js" else P.join_css(texts, names)
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        (t / "current").write_text(current, encoding="utf-8")
        (t / "base").write_text(base, encoding="utf-8")
        (t / "theirs").write_text(theirs, encoding="utf-8")
        r = subprocess.run(["git", "merge-file", "-p", "-L", "now (main)", "-L", "base", "-L", f"yours ({ref})",
                            str(t / "current"), str(t / "base"), str(t / "theirs")], capture_output=True, text=True)
    if r.returncode < 0:
        sys.exit(f"{name}: git merge-file failed: {r.stderr}")
    merged, conflicts = r.stdout, r.returncode

    def by_hand(why):
        out = Path(tempfile.mkdtemp(prefix="przenies_")) / name
        out.write_text(merged, encoding="utf-8")
        print(f"{name}: NOT MOVED: {why}.\n  The merged file (your changes on top of today's code) is {out}.\n"
              f"  Move your changes into web/{d}/ by hand; see what they are with: git diff {base_ref[:9]} {ref} -- {REL}/web/{name}")
        return conflicts, [], False
    try:
        parts, _ = P.split_js(merged) if kind == "js" else P.split_css(merged)
    except (SystemExit, AssertionError, ValueError, StopIteration) as e:
        return by_hand(f"the merged file cannot be cut into the parts ({e or 'a section marker or the start-up guard changed'})")
    if [q[0] for q in parts] != names:
        return by_hand(f"the parts do not match the files in web/{d}/")
    changed = []
    hlen = P.js_hlen if kind == "js" else (lambda t: t.index("\n") + 1)
    known = {q[0] for q in (P.JS if kind == "js" else P.CSS)}
    for (n, text, *_), f, old in zip(parts, files, texts):
        if n not in known:  # a part added after the split keeps its own header
            text = old[:hlen(old)] + text[hlen(text):]
        if text != old:
            f.write_text(text, encoding="utf-8")
            changed.append(f"web/{d}/{n}")
    return conflicts, changed, True


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ref = sys.argv[1]
    git("rev-parse", "--verify", "--quiet", ref + "^{commit}")
    stash = ref.startswith(("stash", "refs/stash"))
    # the version you started from: for a stash its parent commit, for a branch where it left main
    base = git("rev-parse", ref + "^1").stdout.strip() if stash else git("merge-base", ref, "HEAD").stdout.strip()
    print(f"your changes: {ref}; the version you started from: {base[:9]}")
    total, touched, moved = 0, [], True
    for kind in ("js", "css"):
        c, ch, ok = merge(kind, ref, base)
        total += c
        touched += ch
        moved = moved and ok
    if touched:
        print("changed parts:\n  " + "\n  ".join(touched))
    marked = [t for t in touched if any(l.startswith("<<<<<<< ") for l in (REPO / REL / t).read_text(encoding="utf-8").split("\n"))]
    if marked:
        print(f"{total} conflict(s), marked with <<<<<<< in: {', '.join(marked)}. Fix them, then run: node {REL}/tests/app_parts.mjs")
    elif touched:
        print(f"no conflicts. Check: node {REL}/tests/app_parts.mjs, then open the app")
    if stash and moved:
        print(f"next: git stash pop; git rm -q {REL}/web/app.js {REL}/web/styles.css; git stash drop"
              "\n  (brings back your other files; app.js and styles.css come back as 'deleted by us': remove them)")
    return 2 if not moved else 1 if marked else 0


if __name__ == "__main__":
    sys.exit(main())
