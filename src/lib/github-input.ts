const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;

/** Validate the server-fn input; "" means "the repo the server runs in". */
export function parseRepoInput(data: unknown): { repo: string } {
  const repo = typeof data === "object" && data !== null && "repo" in data ? data.repo : "";
  if (typeof repo !== "string" || (repo !== "" && !REPO_PATTERN.test(repo))) {
    throw new Error("Repository must look like owner/repo");
  }
  return { repo };
}

/** Prefer gh's own stderr (auth, unknown repo, rate limit) over a generic exec error. */
export function ghFailureMessage(command: string, error: unknown): string {
  const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : "";
  return stderr.trim() || `gh ${command} failed`;
}
