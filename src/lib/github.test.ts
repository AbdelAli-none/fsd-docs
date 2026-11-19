import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { formatStarCount, getRepoStars, parseGitHubRepo } from "./github.ts";

const navSource = fs.readFileSync(
  "src/components/landing/navigation.tsx",
  "utf8",
);

test("parseGitHubRepo extracts owner and repo for FSD-CLI/cli", () => {
  assert.deepEqual(parseGitHubRepo("https://github.com/FSD-CLI/cli"), {
    owner: "FSD-CLI",
    repo: "cli",
  });
  assert.deepEqual(parseGitHubRepo("https://github.com/FSD-CLI/cli.git/"), {
    owner: "FSD-CLI",
    repo: "cli",
  });
  assert.equal(parseGitHubRepo("https://gitlab.com/FSD-CLI/cli"), null);
  assert.equal(parseGitHubRepo("not-a-url"), null);
});

test("formatStarCount handles counts, 1k formatting, and invalid inputs without NaN", () => {
  assert.equal(formatStarCount(0), "0");
  assert.equal(formatStarCount(120), "120");
  assert.equal(formatStarCount(1_000), "1k");
  assert.equal(formatStarCount(1_450), "1.5k");
  assert.equal(formatStarCount(null), "—");
  assert.equal(formatStarCount(undefined), "—");
  assert.equal(formatStarCount(-3), "—");
  assert.equal(formatStarCount(Number.NaN), "—");
});

test("getRepoStars sends required headers and returns null on failure", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ stargazers_count: 88 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const stars = await getRepoStars("https://github.com/FSD-CLI/cli");
    assert.equal(stars, 88);
    assert.equal(capturedUrl, "https://api.github.com/repos/FSD-CLI/cli");

    const headers = new Headers(capturedInit?.headers);
    assert.equal(headers.get("User-Agent"), "FSD-CLI-Docs");
    assert.equal(headers.get("Accept"), "application/vnd.github+json");
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = (async () =>
    new Response("rate limited", { status: 403 })) as typeof fetch;

  try {
    const fallbackStars = await getRepoStars("https://github.com/FSD-CLI/cli");
    assert.equal(fallbackStars, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Navigation renders yellow star badge, spinner, and fallback without NaN", () => {
  assert.match(navSource, /fill-amber-400 text-amber-400/, "yellow star icon");
  assert.match(navSource, /Loader2/, "loading spinner");
  assert.match(navSource, /formatStarCount/, "star count formatter");
  assert.doesNotMatch(navSource, /Number\(stars\)/, "unsafe Number(stars)");
  assert.doesNotMatch(navSource, />GitHub</, "old static GitHub text label");
});
