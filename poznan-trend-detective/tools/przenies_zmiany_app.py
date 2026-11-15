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
    name = "app.js" if kind == "js" else "styles.css"
    theirs, base = show(ref, name), show(base_ref, name)
    if theirs is None or base is None:
        print(f"{name}: not in {ref if theirs is None else base_ref}, nothing to move")
        return 0, []
    if theirs == base:
        print(f"{name}: no changes in {ref}")
        return 0, []
    d, ext = ("app", "js") if kind == "js" else ("css", "css")
    files = sorted((WEB / d).glob(f"[0-9][0-9]*.{ext}"))
    texts = [f.read_text(encoding="utf-8") for f in files]
    current = P.join_js(texts) if kind == "js" else P.join_css(texts)
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
    try:
        parts, _ = P.split_js(merged) if kind == "js" else P.split_css(merged)
    except SystemExit as e:
        out = WEB / f"{name}.merged"
        out.write_text(merged, encoding="utf-8")
        print(f"{name}: merged, but the result cannot be cut into parts ({e}). It is in {out}: move your changes by hand.")
        return conflicts, []
    names = [p[0] for p in parts]
    if names != [f.name for f in files]:
        print(f"{name}: the parts in web/{d}/ are not the ones this tool knows ({len(files)} files): moving by hand is safer")
        (WEB / f"{name}.merged").write_text(merged, encoding="utf-8")
        return conflicts, []
    changed = []
    for (n, text, *_), f, old in zip(parts, files, texts):
        if text != old:
            f.write_text(text, encoding="utf-8")
            changed.append(f"web/{d}/{n}")
    return conflicts, changed


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ref = sys.argv[1]
    git("rev-parse", "--verify", "--quiet", ref + "^{commit}")
    base = git("merge-base", ref, "HEAD").stdout.strip()
    if ref.startswith("stash"):
        base = git("rev-parse", ref + "^1").stdout.strip()  # the commit the stash was made on
    print(f"your changes: {ref}; the version you started from: {base[:9]}")
    total, touched = 0, []
    for kind in ("js", "css"):
        c, ch = merge(kind, ref, base)
        total += c
        touched += ch
    if touched:
        print("changed parts:\n  " + "\n  ".join(touched))
    if total:
        print(f"{total} conflict(s): look for <<<<<<< in the parts above, fix them, then run node {REL}/tests/app_parts.mjs")
    elif touched:
        print(f"no conflicts. Check: node {REL}/tests/app_parts.mjs, then open the app")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
