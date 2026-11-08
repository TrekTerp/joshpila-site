#!/usr/bin/env python3
"""Build the portable Lab from readable source files. Python standard library only."""
import base64
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUTPUT = ROOT / "dist" / "magic_squares_lab_combined.html"
CHUNK_SIZE = 120


def read(path):
    return path.read_bytes().decode("utf-8")


def split_text(value):
    """Wrap long strings in short chunks without altering their contents."""
    if isinstance(value, str) and len(value) > CHUNK_SIZE:
        chunks = []
        for line in value.splitlines(keepends=True):
            chunks.extend(line[i:i + CHUNK_SIZE] for i in range(0, len(line), CHUNK_SIZE))
        return {"$labText": chunks}
    if isinstance(value, dict):
        if "$labText" in value:
            raise ValueError("$labText is reserved for the build format")
        return {key: split_text(item) for key, item in value.items()}
    if isinstance(value, list):
        return [split_text(item) for item in value]
    return value


def build():
    manifest = json.loads(read(SRC / "package.json"))
    payload = {
        "views": {name: read(SRC / path) for name, path in manifest["views"].items()},
        "assets": {
            name: {"type": item["type"], "data": base64.b64encode((SRC / item["path"]).read_bytes()).decode("ascii")}
            for name, item in manifest["assets"].items()
        },
        "anchors": json.loads(read(SRC / "anchors.json")),
        "documents": {name: read(SRC / path) for name, path in manifest["documents"].items()},
    }
    missing = set()
    for html in payload["views"].values():
        missing.update(set(re.findall(r"__LAB_ASSET_([a-f0-9]+)__", html)) - payload["assets"].keys())
    if missing:
        raise ValueError(f"Missing artwork: {sorted(missing)}")
    # Escape '<' so source HTML cannot terminate the JSON script element.
    packed = json.dumps(split_text(payload), ensure_ascii=False, indent=2).replace("<", "\\u003c")
    replacements = {
        "@@LAB_PACKAGE@@": packed,
        "@@SHELL_CSS@@": read(SRC / "shell.css"),
        "@@SHELL_JS@@": read(SRC / "shell.js"),
    }
    result = read(SRC / "shell.html")
    for marker, text in replacements.items():
        if result.count(marker) != 1:
            raise ValueError(f"Expected exactly one {marker} marker")
        result = result.replace(marker, text)
    # Catch accidental regressions to the multi-megabyte one-line package.
    longest = max(map(len, result.splitlines()))
    if longest > 5000:
        raise ValueError(f"Generated line is too long: {longest} characters")
    OUTPUT.parent.mkdir(exist_ok=True)
    OUTPUT.write_bytes(result.encode("utf-8"))
    print(json.dumps({"output": str(OUTPUT), "bytes": OUTPUT.stat().st_size,
                      "lines": len(result.splitlines()), "longest_line_characters": longest}))


if __name__ == "__main__":
    build()
