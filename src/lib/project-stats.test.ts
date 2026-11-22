import assert from "node:assert/strict";
import { mock, test } from "node:test";
import {
  fetchGitHubStars,
  fetchLifetimeDownloads,
  formatStarCount,
  GITHUB_STATS_URL,
  getDownloadRanges,
  isCount,
  PROJECT_STATS_SNAPSHOT,
  parseGitHubRepo,
  resetGitHubStarsCache,
} from "./project-stats.ts";

test("lifetime ranges cover every day exactly once across yearly boundaries", () => {
  const ranges = getDownloadRanges("2028-06-01");
  assert.equal(ranges[0].start, "2026-05-30");
  assert.equal(ranges.at(-1)?.end, "2028-06-01");
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    assert(Date.parse(range.end) - Date.parse(range.start) <= 364 * 86_400_000);
    if (i)
      assert.equal(
        Date.parse(range.start) - Date.parse(ranges[i - 1].end),
        86_400_000,
      );
  }
  assert.throws(() => getDownloadRanges("2026-05-29"));
  assert.throws(() => getDownloadRanges("invalid"));
});

test("downloads require every complete matching npm window; partial data is never a total", async () => {
  const ranges = getDownloadRanges("2027-06-01");
  const fixtures = ranges.map((range, i) => ({
    package: "create-fsd-architecture",
    start: range.start,
    end: range.end,
    downloads: i + 10,
  }));
  let failedWindow = false;
  let wrongPackage = false;
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0]) => {
      const index = ranges.findIndex((range) => range.url === String(input));
      if (failedWindow && index === 1)
        return new Response("unavailable", { status: 503 });
      const fixture = fixtures[index];
      return Response.json({
        ...fixture,
        ...(wrongPackage ? { package: "other-package" } : {}),
      });
    },
  );
  try {
    assert.equal(await fetchLifetimeDownloads("2027-06-01"), 21);
    failedWindow = true;
    await assert.rejects(fetchLifetimeDownloads("2027-06-01"));
    failedWindow = false;
    wrongPackage = true;
    await assert.rejects(fetchLifetimeDownloads("2027-06-01"));
  } finally {
    fetchMock.mock.restore();
  }
});

test("only finite non-negative integer counts can replace verified statistics", () => {
  assert(isCount(0));
  assert(isCount(3808));
  for (const value of [-1, NaN, Infinity, 2.5, "13", null])
    assert(!isCount(value));
});

test("parseGitHubRepo accepts only canonical two-segment GitHub repository URLs", () => {
  assert.deepEqual(parseGitHubRepo("https://github.com/FSD-CLI/cli"), {
    owner: "FSD-CLI",
    repo: "cli",
  });
  assert.deepEqual(parseGitHubRepo("https://github.com/FSD-CLI/cli/"), {
    owner: "FSD-CLI",
    repo: "cli",
  });
  assert.equal(parseGitHubRepo("https://github.com/FSD-CLI/cli/issues"), null);
  assert.equal(parseGitHubRepo("https://github.com/FSD-CLI"), null);
  assert.equal(parseGitHubRepo("https://gitlab.com/FSD-CLI/cli"), null);
  assert.equal(parseGitHubRepo("not-a-url"), null);
});

test("formatStarCount formats counts consistently including invalid inputs", () => {
  assert.equal(formatStarCount(0), "0");
  assert.equal(formatStarCount(17), "17");
  assert.equal(formatStarCount(1_250), "1.3k");
  assert.equal(formatStarCount(10_000), "10k");
  assert.equal(
    formatStarCount(Number.NaN),
    formatStarCount(PROJECT_STATS_SNAPSHOT.stars),
  );
});

test("fetchGitHubStars deduplicates in-flight requests, caches with TTL, and preserves checkedAt", async () => {
  resetGitHubStarsCache();
  let calls = 0;
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async (input: Parameters<typeof fetch>[0]) => {
      assert.equal(String(input), GITHUB_STATS_URL);
      calls++;
      return Response.json({
        full_name: "FSD-CLI/cli",
        stargazers_count: 17,
      });
    },
  );

  try {
    const [first, second] = await Promise.all([
      fetchGitHubStars(),
      fetchGitHubStars(),
    ]);
    assert.equal(calls, 1);
    assert.equal(first.stars, 17);
    assert.deepEqual(first, second);

    // Subsequent call within TTL reuses cached value and original checkedAt.
    const cached = await fetchGitHubStars();
    assert.equal(calls, 1);
    assert.equal(cached.checkedAt, first.checkedAt);
  } finally {
    fetchMock.mock.restore();
    resetGitHubStarsCache();
  }
});

test("fetchGitHubStars passes an AbortSignal and lets a caller abort without cancelling shared fetches", async () => {
  resetGitHubStarsCache();
  let receivedSignal: AbortSignal | undefined;
  let resolveFetch!: (response: Response) => void;

  const fetchMock = mock.method(
    globalThis,
    "fetch",
    (_input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      receivedSignal = init?.signal ?? undefined;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    },
  );

  try {
    const callerController = new AbortController();
    const abortedCall = fetchGitHubStars(callerController.signal);
    const healthyCall = fetchGitHubStars();

    assert(receivedSignal instanceof AbortSignal);
    assert.equal(receivedSignal.aborted, false);

    callerController.abort();
    await assert.rejects(abortedCall);
    assert.equal(receivedSignal.aborted, false);

    resolveFetch(
      Response.json({
        full_name: "FSD-CLI/cli",
        stargazers_count: 18,
      }),
    );
    const result = await healthyCall;
    assert.equal(result.stars, 18);
  } finally {
    fetchMock.mock.restore();
    resetGitHubStarsCache();
  }
});
