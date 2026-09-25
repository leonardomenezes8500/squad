---
name: team
description: Work a project like a professional team of subagents - pick the next issue (or the one given), research, plan, TDD implement, parallel adversarial review, verify, open the PR - with the dev steering at the gates, or chaining issues in auto mode. Use when the user says "/squad:team", "/team", "work issue <n>", "toca/pega a issue <n>", "next issue", "continue the milestone", or asks the squad/team/agents to work.
argument-hint: "[issue number | milestone | goal] [auto]"
---

# team

The dev steers toward the goal; the squad does the work. Each issue ends in a PR that closes it; merging is always the dev's call. The main session is the only writer; subagents research and review in parallel, each with a small scoped prompt. Talk to the user in their language.

## Target

- **issue number** → that issue.
- **milestone name** → the next unblocked issue in it.
- **a goal in words** → the open issues that serve it; if none fit, draft the issue(s) (title, milestone, checklist) as part of the Gate 1 plan and create them on the go.
- **nothing** → the next unblocked issue: earliest open milestone (due date first, then title order), lowest issue number whose dependencies are all closed. Say which one and why in one line.

## Modes

- **gated** (default): stop at Gate 1 and Gate 2.
- **auto** (the user says "auto", "autonomous", "autônomo", "vai sozinho"): trivial/small issues skip Gate 1 (the plan is still posted on the issue). Once a PR is open with CI green, don't wait: move on to the next issue that doesn't depend on an unmerged PR. Standard/large plans still stop at Gate 1. Stop and report on any escalation, at the end of the milestone, or when everything left is waiting on a merge. After each PR, a two-line status: what's ready to merge, what's next.

## Conventions

The project's CLAUDE.md wins over these; `/squad:setup` writes them there.

- Code, comments, commit messages, README and docs in English. UI copy in the project's UI language.
- Comments only for the non-obvious why. No comment that repeats what the code says.
- Simple beats clever and beats DRY: repeated simple code is fine.
- User-facing prose (UI copy, README, PR body) goes through the humanizer skill when it's installed.

## Commit messages

Git is the project's memory: CLAUDE.md and auto memory never keep history or changelogs, so what happened and why has to be readable from `git log` alone.

- Subject: `type: summary` (feat, fix, refactor, test, docs, chore, ci), imperative, under 72 characters.
- Body for anything beyond a trivial change: why it was needed, what was tried or ruled out and why, constraints discovered on the way, and `Refs #<n>`.
- One logical change per commit. A failed approach that got reverted is worth a sentence in the commit that replaces it.

## 0. Intake

1. `gh issue view <n> --comments`. Every issue it says it depends on must be closed; if one isn't, stop and say which.
2. Detect the verify commands: CLAUDE.md first, then `package.json` scripts / Makefile / pyproject (lint, format check, build, test).
3. Classify the size and state it in one line so the user can override:
   - **trivial**: one file, no new behavior (copy, config, rename) → steps 3, 4, 6
   - **small**: a few files, known pattern, no new dependency or contract → step 2 in chat, then 3–6
   - **standard**: new behavior, new table/endpoint/integration, or any security trigger → all steps
   - **large**: spans modules or needs a design choice → all steps, and suggest splitting the issue first

Security triggers (always at least standard): auth/login, access control or tenant isolation, tokens and secrets, webhooks, input from users or external APIs, payments.

## 1. Research (standard, large)

Launch in parallel, read-only, each returning a short summary:

- **codebase**: the `squad:graphify-scout` agent: what already exists that this issue should reuse, and the files it will touch.
- **vendor docs**: the official docs for every external API or library the issue touches (source-driven: cite the page). Captured docs go in `docs/<vendor>/` with the capture date.
- **large only**: 2–3 alternative approaches with trade-offs.

## 2. Plan → Gate 1

Write the plan as a comment on the issue (`gh issue comment`): thin vertical slices in order, the files each touches, the test that proves each one, and what is deliberately left out (ponytail: the lazy version that works, and when to add the rest). Small issues: plan in chat.

**Gate 1:** stop and wait for the user's go. No code before it.

## 3. Implement

- Branch `issue-<n>-<slug>` from an up-to-date default branch.
- Slice by slice. Non-trivial logic follows TDD: failing test, code, green. If the project has no test runner yet, the first issue that needs one adds it.
- When ponytail is installed its ladder applies to every slice.
- One commit per slice; the message says why. Tick the issue checkbox only after the commit that does it exists.
- UI changes: run the app and check it in a browser before calling the slice done.
- Any text a person will read (UI copy, error messages, README, docs) is written, then passed through the humanizer skill when it's installed, before the slice's commit.

## 4. Verify

Run the verify commands. On failure fix and rerun, max 3 rounds; then stop and show the user the failure.

If the branch touches agent config (`CLAUDE.md`, `.claude/**`, `.mcp.json`, hooks, permissions, plugins, MCP servers), launch the `squad:shield` agent. It fixes real critical/high findings in place; commit its fixes as their own commit and carry anything it says needs the user (rotating a secret, confirming a permission) into Gate 2.

## 5. Review

- **standard/large:** `Workflow({scriptPath: "${CLAUDE_SKILL_DIR}/review.workflow.js", args: {issue: <n>, base: "<default branch>", security: <true if a security trigger applies>, agentSkills: <true if agent-skills:code-reviewer is an available agent type>}})`. Invoking this skill is the user's opt-in for the workflow.
- **small:** one reviewer subagent (`agent-skills:code-reviewer` when available) on `git diff <base>...HEAD`.

Fix every blocking finding, then back to step 4. Max 3 review rounds; then escalate to the user with what's left. Non-blocking suggestions go in the PR body, never silently dropped. If the workflow reports dead reviewers, say which dimension went unreviewed.

## 6. Gate 2 → PR

Show the user: what changed, verify results, review results, what was left out. On their go: push, open the PR with `Closes #<n>` (body passed through the humanizer skill when installed), wait for CI to go green. Merge only when the user says so.

## 7. After merge

- If the project has a graphify graph, `graphify update .` (AST, free). If `graphify check-update .` then reports pending semantic work and a Gemini key is set (`GEMINI_API_KEY`/`GOOGLE_API_KEY`, never print it), run `graphify extract . --backend gemini`; without a key, mention once that docs/images are missing from the graph.
- Run the `context` skill in its short form: anything this issue taught that a future session needs goes to the right memory layer.
