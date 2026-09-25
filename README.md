![squad8500](assets/logo.png)

A Claude Code plugin that makes Claude work like a professional team. You steer toward the goal: you approve plans and you merge. The squad picks the work, one agent writes the code, and the rest research and review in parallel.

```
/squad:team              # next unblocked issue of the earliest open milestone
/squad:team 42           # that issue
/squad:team auth         # next issue of that milestone, or the issues serving that goal
/squad:team auto         # keep going: small issues skip the plan gate, PRs pile up for you to merge
```

## What happens

1. **Intake.** Picks the issue, checks that the issues it depends on are closed, and sizes it (trivial, small, standard, large). The size decides which steps run, so a typo fix doesn't get a design review.
2. **Research.** Parallel, read-only. A codebase scout (uses [graphify](https://github.com/Graphify-Labs/graphify) when the graph is worth it) and a docs reader for every external API the issue touches.
3. **Plan → you approve.** Thin slices, the test for each, and what's deliberately left out, posted as a comment on the issue.
4. **Implement.** One writer, slice by slice, test first for real logic, one commit per slice.
5. **Verify.** Lint, format, build, tests. Three tries, then it asks you.
6. **Review.** A workflow runs reviewers in parallel (correctness, tests, over-engineering, and security when the change touches auth, secrets, webhooks or user input), dedups their findings, and sends every critical/high one to a skeptic who tries to prove it wrong. If the skeptic can't, it blocks. A reviewer that crashes counts as a failure, not a pass.
7. **PR → you approve.** Opens it with `Closes #42`, waits for CI. Merging is always yours.
8. **Context.** Whatever the issue taught that a future session needs goes to the right memory layer.

`/squad:context` keeps the project's context in the layer Claude Code loads it from: `CLAUDE.md` for team rules, path-scoped `.claude/rules/` for one area of the code, `CLAUDE.local.md` for you alone, auto memory for how you work, git for decisions. Subagents don't read auto memory, so anything the squad must follow lives in `CLAUDE.md` or rules. A context auditor checks every claim against the repo and flags what's stale, duplicated or in the wrong place.

`/squad:setup` prepares a project: companion plugins in project scope, conventions in `CLAUDE.md`, a permissions deny list, and an [AgentShield](https://github.com/affaan-m/agentshield) gate in CI.

## Install

For you, in every project:

```
/plugin marketplace add leonardomenezes8500/squad
/plugin install squad@squad
```

For everyone who clones a project (writes to its `.claude/settings.json`):

```
claude plugin marketplace add leonardomenezes8500/squad --scope project
claude plugin install squad@squad --scope project
```

Or paste this into the project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "squad": {
      "source": { "source": "github", "repo": "leonardomenezes8500/squad" }
    }
  },
  "enabledPlugins": { "squad@squad": true }
}
```

Use `--scope local` to install it only for yourself in one project.

## Works best with

squad runs on its own. These make it better, and `/squad:setup` offers to add them:

- [ponytail](https://github.com/DietrichGebert/ponytail): minimal code, and the over-engineering reviewer.
- [agent-skills](https://github.com/addyosmani/agent-skills): the code-reviewer, test-engineer and security-auditor agents the review workflow uses. Without it, generic agents take the same roles.
- [humanizer](https://github.com/blader/humanizer): user-facing text that doesn't read like AI.
- [graphify](https://github.com/Graphify-Labs/graphify): a knowledge graph of the codebase for the scout. Code needs no key; set `GEMINI_API_KEY` to get docs and images into the graph too.

## Conventions it follows

Code, comments, commits and docs in English. UI copy in the project's language. Comments only for the non-obvious why. Simple over clever, and over DRY. The project's `CLAUDE.md` wins over all of this.

## Credits

- The orchestration ideas (sizing the task to pick phases, plan and commit gates, a single writer with parallel readers, adversarial review that fails closed) come from **[Affaan Mustafa](https://github.com/affaan-m)**'s [ECC](https://github.com/affaan-m/ECC). squad keeps those ideas and drops the rest to stay small. The CI gate uses his [AgentShield](https://github.com/affaan-m/agentshield).
- Review roles by [agent-skills](https://github.com/addyosmani/agent-skills) from **[Addy Osmani](https://github.com/addyosmani)**. Simplicity rules from [ponytail](https://github.com/DietrichGebert/ponytail), prose rules from [humanizer](https://github.com/blader/humanizer), codebase graph from [graphify](https://github.com/Graphify-Labs/graphify).
- Logo and comment banners made with [pixogram](https://github.com/leonardomenezes8500/pixogram).

MIT, see [LICENSE](LICENSE).
