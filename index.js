// @ts-check
import core from "@actions/core";
import github from "@actions/github";

async function addMergeBlockedLabelsToAllTargetPrs() {
  try {
    const master = core.getInput("release-target-branch");
    const develop = core.getInput("release-source-branch");
    const label = core.getInput("label");

    const octokit = github.getOctokit(process.env.GITHUB_TOKEN ?? "").rest;

    /**
     *
     * @param {string} labelName
     */
    async function addLabelToDevelopPRs(labelName) {
      try {
        const { data: prs } = await octokit.pulls.list({
          ...github.context.repo,
          base: develop,
          state: "open",
        });

        for (const pr of prs) {
          await octokit.issues.addLabels({
            ...github.context.repo,
            issue_number: pr.number,
            labels: [labelName],
          });

          // await octokit.repos.createCommitStatus({
          //   ...github.context.repo,
          //   sha: pr.head.sha,
          //   state: "error",
          //   context: `Block Merge to ${develop} before the Release`,
          //   description: `This PR is blocked and cannot be merged.`,
          // });
          core.info(`Added "${labelName}" label to PR #${pr.number}`);
        }
      } catch (error) {
        core.error("Error adding label to PRs:", error);
        core.setFailed(error.message);
      }
    }

    const { data: prs } = await octokit.pulls.list({
      ...github.context.repo,
      base: master,
      head: develop,
      state: "open",
    });

    if (prs.length > 0) {
      const releasePR = prs[0];
      core.info(`Release PR: #${releasePR.number}`);

      await addLabelToDevelopPRs(label);
      core.info(
        `Added "${label}" label to all other PRs targeting the ${develop} branch.`
      );
    } else {
      core.info(`No open PRs from ${develop} to ${master}.`);
    }
  } catch (error) {
    core.error("Error fetching PRs:", error);
    core.setFailed(error.message);
  }
}

await addMergeBlockedLabelsToAllTargetPrs();
