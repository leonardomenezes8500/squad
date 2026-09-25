# squad

Claude Code plugin that makes Claude work like a team on GitHub issues. This repo is both the marketplace and the plugin. Public at github.com/leonardomenezes8500/squad; site planned at squad.8500.site.

## Principles

- **Lean on purpose.** squad takes ideas from ECC (task sizing, plan/PR gates, single writer with parallel readers, adversarial review that fails closed) and none of its bulk: no agent or skill catalogs, no blocking hooks, no memory system of its own.
- **Compose, don't duplicate.** ponytail (simplicity), humanizer (prose), agent-skills (reviewer, test and security agents) and graphify (codebase graph) do their part; squad orchestrates them. Every skill still works when a companion is missing, with a plain fallback.
- **The dev steers, the squad works.** One writer; research and review run in parallel and read-only; gates at the plan and the PR. Merging is always the dev's call: an auto-merge mode was written and Claude Code's auto-mode classifier blocked it as "merge without review". Don't bring it back.
- **Git is the memory**, here and in every project squad works on. CLAUDE.md and auto memory hold rules and context that can't be read from the code, never history. Commit messages carry the why, which is why squad sets their format.
- **Subagents don't load auto memory.** Anything the squad's agents must follow has to live in CLAUDE.md or `.claude/rules/`.
- **Public repo, nothing private.** Files, commit messages, issues and PRs never name the maintainer's other projects, local paths, machine details or accounts beyond the public repo owner. Examples use made-up names.
- **Generic.** Skills never assume a specific project. Talk to the user in their language; everything in this repo is English.

## Mechanics that bite

- Skills reach their own files through `${CLAUDE_SKILL_DIR}`, which works both installed as a plugin and copied into a project.
- A workflow script must start with `export const meta` (a pure literal); SKILL.md and agent files must start with frontmatter. Pixogram banners go after those.
- Invoking a skill whose instructions call Workflow counts as the user's opt-in; the skill says so explicitly.
- Review agents use agent-skills' `agentType` only when it's installed (`args.agentSkills`); otherwise a default agent gets the same lens.
- graphify: never add its hooks to a project (a teammate without graphify gets a hook error on every tool call). Code enters the graph via AST for free; docs and images need `GEMINI_API_KEY` or `GOOGLE_API_KEY` (`graphify extract . --backend gemini`). Check keys exist, never print them.
- AgentShield 1.6.0 has no ignore option, so the shield agent and the CI scan a copy holding only CLAUDE.md, `.claude/` and `.mcp.json`: lockfile integrity hashes read as Azure keys. Exit 2 means findings without regression, 3 means regression. Its `prompt-defense-*` checks target public chatbot prompts; they stay in the baseline. The shield fixes real findings but never edits the baseline or writes text to satisfy a keyword check.

## Working on squad

- Validate: `claude plugin validate .` and `claude plugin validate .claude-plugin/plugin.json`. Its warning that this CLAUDE.md isn't loaded for plugin users is expected: the file is for working on squad, not shipped.
- Load test in a temp git dir with `claude --plugin-dir <this path> -p "list the squad:* skills and agents"`. Don't test through `claude plugin marketplace add/remove`: the marketplace registry is global to the machine, so removing the test's "squad" marketplace also breaks every project that installed squad.
- Bump `version` in `.claude-plugin/plugin.json` on every user-visible change, or installed copies keep the cached old version.
- Logo: `pixogram -o assets/logo.png "squad:accent1" "8500:accent2"`.
- README credits whoever squad borrows from. A tool's own upstream credits stay in that tool's repo.
