---
name: context
description: Keep a project's context in the right Claude Code memory layer - CLAUDE.md, path-scoped .claude/rules, CLAUDE.local.md, auto memory, git - lean, current and non-duplicated. Use when the user says "/squad:context", "contextualize", "update the context/CLAUDE.md/memory", after a decision worth keeping, and in short form at the end of every squad issue.
argument-hint: "[short]"
---

# context

Runs in the main session: it's the one that saw the conversation. Talk to the user in their language.

## Where each thing goes

| What | Layer | Loaded |
|---|---|---|
| Team rules that apply everywhere | `CLAUDE.md` (or `.claude/CLAUDE.md`) | every session and every subagent |
| Rules for one part of the code (a module, an API integration, tests) | `.claude/rules/<topic>.md` with `paths:` globs in frontmatter | only when matching files are read, subagents included |
| This dev's personal notes for this project | `CLAUDE.local.md` (gitignored) | every session of this dev |
| This dev's habits across all projects | `~/.claude/CLAUDE.md`, only when the user asks | every session of this dev |
| Who the user is, how they like to work, feedback, context not in the code | auto memory (`MEMORY.md` + topic files) | main session only, not subagents |
| Decisions, what was done and why | commit messages and issues | when someone reads git |
| Long reference (vendor docs, specs) | `docs/`, pointed to from a rule or with `@path` | on demand |

Consequences:

- Subagents don't get auto memory. Anything the squad's agents must follow belongs in `CLAUDE.md` or `.claude/rules/`.
- Keep `CLAUDE.md` under ~200 lines. For every line: would removing it make Claude make a mistake? If not, cut it. Move topic-specific blocks to path-scoped rules.
- Never store what the code or git already says (file lists, architecture a reader can see, changelogs).
- One fact, one place. When moving a fact, delete it from where it was.

## Short form (end of an issue, or "short")

1. From this conversation, list at most 3 things a future session would get wrong without being told. Skip anything derivable from the code or git.
2. Put each in its layer. Update or remove any entry it contradicts.
3. One line to the user: what was saved where, or "nothing to save".

## Full form

1. Inventory every layer that exists: file paths, line counts, `MEMORY.md` line count against its 200-line load limit.
2. Launch the `squad:context-auditor` agent. Pass it the auto memory directory path and the list of files.
3. With its report, propose one diff: stale lines removed, contradictions resolved, duplicates collapsed, oversized blocks moved to `.claude/rules/` with `paths:`, missing essentials added (the conventions `/squad:setup` writes, if absent).
4. Wait for the user's go, apply, and commit the versioned files (message says why). Memory files outside the repo aren't committed.
