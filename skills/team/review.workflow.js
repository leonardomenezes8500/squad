export const meta = {
  name: "squad-review",
  description:
    "Parallel review of a branch diff, dedup, adversarial check of critical/high findings",
  phases: [{ title: "Review" }, { title: "Verify" }],
};

// ███ ███ █ █ ███ ██
// █   █ █ █ █ █ █ █ █
// ███ █ █ █ █ ███ █ █
//   █ █   █ █ █ █ █ █
// ███ ███ ███ █ █ ██   review

const FINDINGS = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file: { type: "string" },
          line: { type: "number" },
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          title: { type: "string" },
          detail: { type: "string" },
          fix: { type: "string" },
        },
        required: ["file", "severity", "title", "detail"],
      },
    },
    error: { type: "string" },
  },
  required: ["findings"],
};

const VERDICT = {
  type: "object",
  properties: { refuted: { type: "boolean" }, reason: { type: "string" } },
  required: ["refuted", "reason"],
};

const base = args.base || "main";
const issue = args.tracker || `gh issue view ${args.issue}`;
const scope = `Review the changes of \`git diff ${base}...HEAD\` for issue #${args.issue} (\`${issue}\`). Only report problems in the changed code. Use severity critical/high only for things that break behavior, leak data or break access control.`;

const DIMENSIONS = [
  {
    key: "correctness",
    agentType: "agent-skills:code-reviewer",
    lens: "Correctness, and whether the issue checklist is actually met.",
  },
  {
    key: "tests",
    agentType: "agent-skills:test-engineer",
    lens: "Is non-trivial logic covered by a test that would fail if it broke? Missing edge cases?",
  },
  {
    key: "simplicity",
    lens: "Over-engineering only (use the ponytail-review skill if it's available): speculative abstractions, reinvented stdlib, unneeded dependencies, dead flexibility. Severity medium/low.",
  },
];
if (args.security) {
  DIMENSIONS.push({
    key: "security",
    agentType: "agent-skills:security-auditor",
    lens: "Security: auth, access control/tenant isolation, secrets, input validation, webhook verification.",
  });
}

// Codex: a model from another lab reviews through its plugin's own runtime and review
// prompt; this agent only runs it and maps the output. Its claims still face the skeptic.
if (args.codex) {
  const mode = args.security ? "adversarial-review" : "review";
  const focus = args.security
    ? " challenge the auth, access control, secrets and input handling"
    : "";
  DIMENSIONS.push({
    key: "codex",
    prompt: `Run exactly: node "${args.codex}" ${mode} --wait --base ${base}${focus}

It can take several minutes; use a long Bash timeout. Map every problem Codex reports in the changed code to a finding, keeping its file, line and wording. Don't review the code yourself. If the command fails, return no findings and set error to its most useful error lines.`,
  });
}

phase("Review");
// Barrier: dedup needs every dimension's findings together.
const results = await parallel(
  DIMENSIONS.map(
    (d) => () =>
      agent(d.prompt || `${scope}\n\nLens: ${d.lens}`, {
        label: `review:${d.key}`,
        phase: "Review",
        schema: FINDINGS,
        agentType: args.agentSkills ? d.agentType : undefined,
      }),
  ),
);
// A reviewer that died or couldn't run its tool leaves its dimension unreviewed.
const failedDims = DIMENSIONS.flatMap((d, i) =>
  !results[i] ? [d.key] : results[i].error ? [`${d.key} (${results[i].error})`] : [],
);
if (failedDims.length)
  log(
    `Reviewers that died (their dimension is unreviewed): ${failedDims.join(", ")}`,
  );

const seen = new Map();
for (const f of results.filter(Boolean).flatMap((r) => r.findings)) {
  const key = `${f.file}:${f.line ?? ""}:${f.title.toLowerCase()}`;
  if (!seen.has(key)) seen.set(key, f);
}
const all = [...seen.values()];
const serious = all.filter(
  (f) => f.severity === "critical" || f.severity === "high",
);
const suggestions = all.filter(
  (f) => f.severity === "medium" || f.severity === "low",
);

phase("Verify");
const verdicts = await parallel(
  serious.map(
    (f) => () =>
      agent(
        `${scope}\n\nA reviewer claims this ${f.severity} problem:\n${f.file}:${f.line ?? "?"} ${f.title}\n${f.detail}\n\nTry to refute it by reading the code. refuted=true only if you can show it is wrong; if unsure, refuted=false.`,
        { label: `verify:${f.file}`, phase: "Verify", schema: VERDICT },
      ),
  ),
);
// Fail closed: a dead verifier keeps the finding blocking.
const blocking = serious.filter((f, i) => !verdicts[i] || !verdicts[i].refuted);
const refuted = serious.filter((f, i) => verdicts[i] && verdicts[i].refuted);

return { blocking, suggestions, refuted, failedDims };
