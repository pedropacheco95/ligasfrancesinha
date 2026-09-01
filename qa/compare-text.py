"""Diff the visible text of each Flask page against its React port."""

import html
import re
import sys
import urllib.parse
import urllib.error
import urllib.request

FLASK = "http://127.0.0.1:5001"
REACT = "http://127.0.0.1:5173"

DROP_BLOCKS = re.compile(
    r"<(script|style|template)\b.*?</\1>", re.IGNORECASE | re.DOTALL
)
COMMENTS = re.compile(r"<!--.*?-->", re.DOTALL)
HEAD = re.compile(r"<head\b.*?</head>", re.IGNORECASE | re.DOTALL)
TAGS = re.compile(r"<[^>]+>")
WHITESPACE = re.compile(r"\s+")


def fetch(base, path):
    """Return (status, markup). A 500 is a legitimate outcome to compare."""
    url = base + urllib.parse.quote(path)
    request = urllib.request.Request(url, headers={"User-Agent": "parity-check"})
    try:
        with urllib.request.urlopen(request) as response:
            return response.status, response.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace")


def to_text(markup):
    markup = HEAD.sub(" ", markup)
    markup = DROP_BLOCKS.sub(" ", markup)
    # React SSR separates adjacent text nodes with an empty comment; dropping it
    # outright is what the browser effectively renders.
    markup = COMMENTS.sub("", markup)
    markup = TAGS.sub("\n", markup)
    text = html.unescape(markup)
    tokens = [WHITESPACE.sub(" ", line).strip() for line in text.split("\n")]
    return [token for token in tokens if token]


def main():
    paths = [line.strip() for line in open(sys.argv[1]) if line.strip()]
    failures = 0

    for path in paths:
        try:
            flask_status, flask_markup = fetch(FLASK, path)
            react_status, react_markup = fetch(REACT, path)
        except Exception as exc:  # noqa: BLE001
            print(f"ERROR  {path}: {exc}")
            failures += 1
            continue

        if flask_status >= 500 or react_status >= 500:
            if flask_status == react_status:
                print(f"MATCH  {path}  (both {flask_status})")
            else:
                failures += 1
                print(f"DIFF   {path}  flask={flask_status} react={react_status}")
            continue

        flask_text = to_text(flask_markup)
        react_text = to_text(react_markup)

        if flask_text == react_text:
            print(f"MATCH  {path}  ({len(flask_text)} tokens)")
            continue

        failures += 1
        only_flask = [t for t in flask_text if t not in set(react_text)]
        only_react = [t for t in react_text if t not in set(flask_text)]
        print(f"DIFF   {path}  flask={len(flask_text)} react={len(react_text)}")
        if only_flask:
            print(f"         only in flask ({len(only_flask)}): {only_flask[:12]}")
        if only_react:
            print(f"         only in react ({len(only_react)}): {only_react[:12]}")
        if not only_flask and not only_react:
            for index, (a, b) in enumerate(zip(flask_text, react_text)):
                if a != b:
                    print(f"         first order diff at {index}: flask={a!r} react={b!r}")
                    break

    print(f"\n{len(paths) - failures}/{len(paths)} pages match")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
