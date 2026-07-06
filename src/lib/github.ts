import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { createServerFn } from "@tanstack/react-start";

import { ghFailureMessage, parseRepoInput } from "#/lib/github-input";
import type { PullRequest, StackedPrData } from "#/lib/stack";

const execFileAsync = promisify(execFile);

const PR_FIELDS = [
  "number",
  "title",
  "url",
  "headRefName",
  "baseRefName",
  "isDraft",
  "reviewDecision",
  "additions",
  "deletions",
  "updatedAt",
  "author",
  "statusCheckRollup",
].join(",");

async function gh(args: Array<string>): Promise<string> {
  try {
    const { stdout } = await execFileAsync("gh", args, { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
  } catch (error) {
    throw new Error(ghFailureMessage(args[0] ?? "", error));
  }
}

/**
 * Fetch every open PR in the repo via the local `gh` CLI (reusing its auth), plus the viewer's
 * login so the client can distinguish their PRs. An empty repo means "the repo in the server's
 * working directory".
 */
export const getStackedPrsServerFn = createServerFn({ method: "GET" })
  .validator(parseRepoInput)
  .handler(async ({ data: { repo } }): Promise<StackedPrData> => {
    const repoArgs = repo === "" ? [] : ["--repo", repo];
    const [prsJson, viewerJson, repoJson] = await Promise.all([
      gh(["pr", "list", ...repoArgs, "--state", "open", "--limit", "100", "--json", PR_FIELDS]),
      gh(["api", "user", "--jq", ".login"]),
      repo === ""
        ? gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])
        : Promise.resolve(repo),
    ]);

    return {
      repo: repoJson.trim(),
      viewer: viewerJson.trim(),
      prs: JSON.parse(prsJson) as Array<PullRequest>,
    };
  });
