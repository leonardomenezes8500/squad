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
  },
  required: ["findings"],
};

const VERDICT = {
  type: "object",
  properties: { refuted: { type: "boolean" }, reason: { type: "string" } },
  required: ["refuted", "reason"],
};

const base = args.base || "main";
const scope = `Review the changes of \`git diff ${base}...HEAD\` for GitHub issue #${args.issue} (\`gh issue view ${args.issue}\`). Only report problems in the changed code. Use severity critical/high only for things that break behavior, leak data or break access control.`;

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

phase("Review");
// Barrier: dedup needs every dimension's findings together.
const results = await parallel(
  DIMENSIONS.map(
    (d) => () =>
      agent(`${scope}\n\nLens: ${d.lens}`, {
        label: `review:${d.key}`,
        phase: "Review",
        schema: FINDINGS,
        agentType: args.agentSkills ? d.agentType : undefined,
      }),
  ),
);
const failedDims = DIMENSIONS.filter((d, i) => !results[i]).map((d) => d.key);
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
