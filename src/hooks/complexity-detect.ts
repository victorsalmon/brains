/**
 * Complexity Detection Hook
 *
 * Monitors incoming user messages for complexity signals and suggests
 * the BRAINS workflow when 2+ signals are detected (or 1 strong signal).
 * Never auto-invokes BRAINS — suggestion is advisory only.
 *
 * Signals: multi-component scope, architectural decisions, unfamiliar
 * territory, integration risk, security surface, ambiguous requirements,
 * greenfield work, major rework.
 *
 * Port note: Original plugin used Claude Code's SKILL.md auto-detection.
 * OpenCode maps this to a session.updated event hook that logs suggestions.
 */

const COMPLEXITY_SIGNALS = [
  {
    pattern: /\b(multiple components?|cross.?cutting|span.*layers?|api.*database.*ui|multi.?service)\b/i,
    label: "Multi-component scope",
  },
  {
    pattern: /\b(architecture|architectural decision|choose between|trade.?off|design decision|approach|pattern)\b/i,
    label: "Architectural decisions",
  },
  {
    pattern: /\b(unfamiliar|new codebase|first time|haven't worked|no prior context)\b/i,
    label: "Unfamiliar territory",
  },
  {
    pattern: /\b(integration|external api|shared state|other team|third.?party|depends on)\b/i,
    label: "Integration risk",
  },
  {
    pattern: /\b(auth|security|permissions?|secrets?|credentials?|encryption|vulnerabilit)\b/i,
    label: "Security surface",
  },
  {
    pattern: /\b(ambiguous|unclear|not sure|vague|undefined|requirements?|spec)\b/i,
    label: "Ambiguous requirements",
  },
  {
    pattern: /\b(greenfield|from scratch|new system|new service|new feature|build a)\b/i,
    label: "Greenfield work",
  },
  {
    pattern: /\b(refactor|rewrite|redesign|rearchitect|overhaul|migrate)\b/i,
    label: "Major rework",
  },
]

export function detectComplexity(message: string): { signals: string[]; shouldSuggest: boolean } {
  const signals: string[] = []

  for (const signal of COMPLEXITY_SIGNALS) {
    if (signal.pattern.test(message)) {
      signals.push(signal.label)
    }
  }

  // Suggest if 2+ signals, or 1 strong signal (greenfield, major rework)
  const strongSignals = ["Greenfield work", "Major rework"]
  const hasStrongSignal = signals.some((s) => strongSignals.includes(s))
  const shouldSuggest = signals.length >= 2 || (signals.length === 1 && hasStrongSignal)

  return { signals, shouldSuggest }
}

export function formatSuggestion(signals: string[]): string {
  const signalList = signals.map((s) => `- ${s}`).join("\n")

  return [
    `This looks like it could benefit from a structured approach. The BRAINS workflow can help with ${signals[0].toLowerCase()}.`,
    "",
    "Switch to the **brains** agent (Tab key) and describe your task to start phase 1.",
    "Or just proceed directly if you prefer.",
    "",
    `Complexity signals detected:\n${signalList}`,
  ].join("\n")
}
