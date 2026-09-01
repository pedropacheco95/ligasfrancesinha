// Compare pyRound against Python's round() directly.
//
// The page comparison cannot catch a regression here: the values that expose
// the difference (goals/appearances at 40 or 80 appearances) are not in the
// current data, so every rendered page would still match while the helper was
// quietly wrong. Run with: node qa/check-rounding.mjs
import { execFileSync } from "node:child_process";
import { pyRound } from "../src/lib/format.ts";

const PYTHON = `
import json
out = {
  "div":  [[g, a, round(g / a, 2)] for a in range(1, 121) for g in range(0, 121)],
  "pct":  [[n, d, round((n / d) * 100, 2)] for d in range(1, 301) for n in range(0, d + 1)],
  "lit1": [[v, 1, round(v, 1)] for v in [2.675, 0.15, 4.45, 0.125, 0.5, 1.5, 2.5, -0.15, -2.675, 0.045, 1.005]],
  "lit2": [[v, 2, round(v, 2)] for v in [2.675, 0.125, 0.045, 1.005, -2.675, 0.005, 0.015, 0.025, 0.035]],
}
print(json.dumps(out))
`;

// Tens of thousands of cases, well past the default 1MB pipe buffer.
const reference = JSON.parse(
  execFileSync("python3", ["-c", PYTHON], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }),
);

let checked = 0;
const failures = [];
const compare = (label, actual, expected) => {
  checked += 1;
  if (actual !== expected) failures.push(`${label}: python ${expected}, port ${actual}`);
};

for (const [g, a, expected] of reference.div) compare(`${g}/${a}`, pyRound(g / a, 2), expected);
for (const [n, d, expected] of reference.pct) {
  compare(`${n}/${d} as %`, pyRound((n / d) * 100, 2), expected);
}
for (const [value, digits, expected] of [...reference.lit1, ...reference.lit2]) {
  compare(`round(${value}, ${digits})`, pyRound(value, digits), expected);
}

for (const failure of failures.slice(0, 10)) console.log("DIFF  " + failure);
console.log(`\n${checked - failures.length}/${checked} rounding cases match Python`);
process.exit(failures.length ? 1 : 0);
