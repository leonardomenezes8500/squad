---
name: team
description: Take a GitHub issue from open to a reviewed PR with a team of subagents (research, plan, TDD implement, parallel adversarial review, verify) and two human gates. Use when the user says "/squad:team <n>", "/team <n>", "work issue <n>", "toca/pega a issue <n>", or asks the squad/team/agents to work an issue.
argument-hint: <issue number>
---

# team

One issue in, one PR that closes it out. The main session is the only writer; subagents research and review in parallel, each with a small scoped prompt. Talk to the user in their language.

## Conventions

The project's CLAUDE.md wins over these; `/squad:setup` writes them there.

- Code, comments, commit messages, README and docs in English. UI copy in the project's UI language.
- Comments only for the non-obvious why. No comment that repeats what the code says.
- Simple beats clever and beats DRY: repeated simple code is fine.
- User-facing prose (UI copy, README, PR body) goes through the humanizer skill when it's installed.

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

## 4. Verify

Run the verify commands. On failure fix and rerun, max 3 rounds; then stop and show the user the failure.

## 5. Review

- **standard/large:** `Workflow({scriptPath: "${CLAUDE_SKILL_DIR}/review.workflow.js", args: {issue: <n>, base: "<default branch>", security: <true if a security trigger applies>, agentSkills: <true if agent-skills:code-reviewer is an available agent type>}})`. Invoking this skill is the user's opt-in for the workflow.
- **small:** one reviewer subagent (`agent-skills:code-reviewer` when available) on `git diff <base>...HEAD`.

Fix every blocking finding, then back to step 4. Max 3 review rounds; then escalate to the user with what's left. Non-blocking suggestions go in the PR body, never silently dropped. If the workflow reports dead reviewers, say which dimension went unreviewed.

## 6. Gate 2 → PR

Show the user: what changed, verify results, review results, what was left out. On their go: push, open the PR with `Closes #<n>`, wait for CI to go green. Merge only when the user says so. After merge, if the project has a graphify graph, run `graphify update .`.
