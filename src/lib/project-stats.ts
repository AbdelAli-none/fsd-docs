// Verified public API snapshot, retained when the visitor cannot reach a source.
export const PROJECT_STATS_SNAPSHOT = {
  downloads: 3808,
  downloadsStart: "2026-05-30",
  downloadsEnd: "2026-10-15",
  stars: 17,
  starsCheckedAt: "2026-11-22",
} as const;

export const GITHUB_STATS_URL = "https://api.github.com/repos/FSD-CLI/cli";
const DAY = 86_400_000;
const GITHUB_FETCH_TIMEOUT_MS = 10_000;
const STARS_CACHE_TTL_MS = 5 * 60 * 1000;

export interface GitHubStarsResult {
  stars: number;
  checkedAt: string;
}

interface CachedGitHubStars extends GitHubStarsResult {
  expiresAt: number;
}

let cachedStars: CachedGitHubStars | null = null;
let inFlightStars: Promise<GitHubStarsResult> | null = null;

/** @internal Exposed for deterministic unit tests. */
export function resetGitHubStarsCache() {
  cachedStars = null;
  inFlightStars = null;
}

// Disjoint one-year windows keep lifetime totals within npm's range limit as
// the package ages. A missing window must fail the whole total, not undercount it.
export function getDownloadRanges(end: string) {
  const last = Date.parse(`${end}T00:00:00Z`);
  let start = Date.parse(`${PROJECT_STATS_SNAPSHOT.downloadsStart}T00:00:00Z`);
  if (!Number.isFinite(last) || last < start)
    throw new Error("Invalid download range");
  const ranges: { start: string; end: string; url: string }[] = [];
  while (start <= last) {
    const stop = Math.min(last, start + 364 * DAY);
    const from = new Date(start).toISOString().slice(0, 10);
    const to = new Date(stop).toISOString().slice(0, 10);
    ranges.push({
      start: from,
      end: to,
      url: `https://api.npmjs.org/downloads/point/${from}:${to}/create-fsd-architecture`,
    });
    start = stop + DAY;
  }
  return ranges;
}

export function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseGitHubRepo(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname !== "github.com" &&
      parsed.hostname !== "www.github.com"
    )
      return null;
    const segments = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (segments.length !== 2 || !segments[0] || !segments[1]) return null;
    return { owner: segments[0], repo: segments[1] };
  } catch {
    return null;
  }
}

export function formatStarCount(count: number): string {
  if (!isCount(count)) {
    const fallback = isCount(PROJECT_STATS_SNAPSHOT.stars)
      ? PROJECT_STATS_SNAPSHOT.stars
      : 0;
    return formatStarCount(fallback);
  }
  if (count < 1_000) return count.toString();
  if (count < 1_000_000) {
    const value = Math.round((count / 1_000) * 10) / 10;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}k`;
  }
  const value = Math.round((count / 1_000_000) * 10) / 10;
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}m`;
}

function raceWithCallerSignal<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(
      signal.reason ?? new DOMException("Aborted", "AbortError"),
    );
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export async function fetchGitHubStars(
  signal?: AbortSignal,
): Promise<GitHubStarsResult> {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }

  const now = Date.now();
  if (cachedStars && now < cachedStars.expiresAt) {
    return { stars: cachedStars.stars, checkedAt: cachedStars.checkedAt };
  }

  if (!inFlightStars) {
    const requestController = new AbortController();
    const timeoutId = setTimeout(
      () =>
        requestController.abort(new DOMException("Timeout", "TimeoutError")),
      GITHUB_FETCH_TIMEOUT_MS,
    );

    inFlightStars = fetch(GITHUB_STATS_URL, {
      signal: requestController.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("GitHub statistics unavailable");
        const data = await response.json();
        if (!isCount(data.stargazers_count) || data.full_name !== "FSD-CLI/cli")
          throw new Error("Invalid GitHub statistics");

        const result: GitHubStarsResult = {
          stars: data.stargazers_count,
          checkedAt: new Date().toISOString().slice(0, 10),
        };
        cachedStars = {
          ...result,
          expiresAt: Date.now() + STARS_CACHE_TTL_MS,
        };
        return result;
      })
      .finally(() => {
        clearTimeout(timeoutId);
        inFlightStars = null;
      });
  }

  return raceWithCallerSignal(inFlightStars, signal);
}

export async function fetchLifetimeDownloads(
  end: string,
  signal?: AbortSignal,
) {
  const ranges = getDownloadRanges(end);
  const counts = await Promise.all(
    ranges.map(async (range) => {
      const response = await fetch(range.url, { signal });
      if (!response.ok) throw new Error("npm statistics unavailable");
      const data = await response.json();
      if (
        !isCount(data.downloads) ||
        data.package !== "create-fsd-architecture" ||
        data.start !== range.start ||
        data.end !== range.end
      )
        throw new Error("Invalid npm statistics");
      return data.downloads;
    }),
  );
  return counts.reduce((total, count) => total + count, 0);
}
