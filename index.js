// @ts-check
import core from "@actions/core";
import github from "@actions/github";

async function addMergeBlockedLabelsToAllTargetPrs() {
  try {
    const develop = core.getInput("release-source-branch");
    const label = core.getInput("label");
    const actionType = core.getInput("action-type");

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN ?? "").rest;

    try {
      const { data: prs } = await octokit.pulls.list({
        ...github.context.repo,
        base: develop,
        state: "open",
      });

      for (const pr of prs) {
        if (actionType === "add") {
          await octokit.issues.addLabels({
            ...github.context.repo,
            issue_number: pr.number,
            labels: [label],
          });
        } else {
          try {
            await octokit.issues.removeLabel({
              ...github.context.repo,
              issue_number: pr.number,
              name: label,
            });
          } catch (e) {
            core.info(`No "${label}" label for PR #${pr.number}`);
          }
        }

        core.info(`${actionType} "${label}" label to PR #${pr.number}`);
      }
    } catch (error) {
      core.error("Error adding label to PRs:", error);
      core.setFailed(error.message);
    }

    core.info(
      `Added "${label}" label to all other PRs targeting the ${develop} branch.`
    );
  } catch (error) {
    core.error("Error fetching PRs:", error);
    core.setFailed(error.message);
  }
}

await addMergeBlockedLabelsToAllTargetPrs();

// await octokit.repos.createCommitStatus({
//   ...github.context.repo,
//   sha: pr.head.sha,
//   state: "error",
//   context: `Block Merge to ${develop} before the Release`,
//   description: `This PR is blocked and cannot be merged.`,
// });
