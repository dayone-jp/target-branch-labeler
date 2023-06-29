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
     * @param {number} prNumber
     * @param {string} labelName
     */
    async function hasLabel(prNumber, labelName) {
      try {
        const { data: pr } = await octokit.pulls.get({
          ...github.context.repo,
          pull_number: prNumber,
        });

        return pr.labels.some((label) => label.name === labelName);
      } catch (error) {
        core.error("Error fetching PR details:", error);
        core.setFailed(error.message);
        return false;
      }
    }

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
          // await octokit.issues.addLabels({
          //   ...github.context.repo,
          //   issue_number: pr.number,
          //   labels: [labelName],
          // });

          const { data: commits } = await octokit.pulls.listCommits({
            ...github.context.repo,
            pull_number: pr.number,
          });

          await octokit.repos.createCommitStatus({
            ...github.context.repo,
            sha: commits[0]?.sha,
            state: "error",
            context: "Block Merge to the develop before the Release",
            description: `This PR is blocked and cannot be merged.`,
          });
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
      const firstPR = prs[0];
      core.info(`Release PR: #${firstPR.number}`);

      const hasBlockedLabel = await hasLabel(firstPR.number, label);

      if (hasBlockedLabel) {
        core.info(`PR #${firstPR.number} has the "${label}" label.`);

        await addLabelToDevelopPRs(label);
        core.info(
          `Added "${label}" label to all other PRs targeting the ${develop} branch.`
        );
      } else {
        core.info(`PR #${firstPR.number} does not have the "${label}" label.`);
      }
    } else {
      core.info(`No open PRs from ${develop} to ${master}.`);
    }
  } catch (error) {
    core.error("Error fetching PRs:", error);
    core.setFailed(error.message);
  }
}

await addMergeBlockedLabelsToAllTargetPrs();
