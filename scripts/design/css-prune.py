"""Supprime de globals.css les règles dont TOUS les sélecteurs commencent par un des préfixes donnés.
Usage : python scripts/design/css-prune.py .auth- .mailbox-
Les @media devenus vides sont retirés."""
import re, sys
path = "src/app/globals.css"
prefixes = tuple(sys.argv[1:])
css = open(path, encoding="utf-8").read()

def parse(text):
    out, i, n = [], 0, len(text)
    while i < n:
        j = text.find("{", i)
        if j == -1:
            out.append(("raw", text[i:])); break
        head = text[i:j]
        depth, k = 1, j + 1
        while depth and k < n:
            if text[k] == "{": depth += 1
            elif text[k] == "}": depth -= 1
            k += 1
        out.append(("block", head, text[j + 1:k - 1]))
        i = k
    return out

def matches(selector_text):
    sels = [s.strip() for s in selector_text.split(",") if s.strip()]
    return sels and all(s.startswith(prefixes) for s in sels)

def render(nodes):
    res = []
    for node in nodes:
        if node[0] == "raw":
            res.append(node[1]); continue
        _, head, body = node
        sel = head.strip()
        if sel.startswith("@media") or sel.startswith("@supports"):
            inner = render(parse(body))
            if inner.strip():
                res.append(f"{head}{{{inner}}}")
            else:
                res.append(head[: len(head) - len(head.lstrip())])
            continue
        if not sel.startswith("@") and matches(re.sub(r"/\*.*?\*/", "", sel, flags=re.S)):
            res.append(head[: len(head) - len(head.lstrip())])
            continue
        res.append(f"{head}{{{body}}}")
    return "".join(res)

result = re.sub(r"\n{3,}", "\n\n", render(parse(css)))
open(path, "w", encoding="utf-8", newline="\n").write(result)
print(len(css), "->", len(result))
