const DEFAULT_REPO = { owner: "FSD-CLI", repo: "cli" } as const;

export function parseGitHubRepo(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/, "") };
  } catch {
    return null;
  }
}

export function formatStarCount(count: number | null | undefined): string {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return "—";
  }
  const safeCount = Math.floor(count);
  if (safeCount >= 1_000) {
    const formatted = (safeCount / 1_000).toFixed(1).replace(/\.0$/, "");
    return `${formatted}k`;
  }
  return safeCount.toString();
}

export async function getRepoStars(
  repoUrl = `https://github.com/${DEFAULT_REPO.owner}/${DEFAULT_REPO.repo}`,
  signal?: AbortSignal,
): Promise<number | null> {
  const target = parseGitHubRepo(repoUrl) ?? DEFAULT_REPO;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${target.owner}/${target.repo}`,
      {
        signal,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "FSD-CLI-Docs",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as { stargazers_count?: unknown };
    const value = payload.stargazers_count;
    return typeof value === "number" && Number.isFinite(value) && value >= 0
      ? Math.floor(value)
      : null;
  } catch {
    return null;
  }
}
