---
name: storm
description: This skill should be used when the user asks to "brainstorm", "storm", "explore ideas", "think through a problem", "generate approaches", "what should we build", or invokes "/brains:storm". Collaborative multi-LLM brainstorming with optional visual companion. Supports --single, --parallel (default), and --debate modes.
user-invocable: true
argument-hint: "[--single|--parallel|--debate] [--rounds N] [topic]"
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Agent, TaskCreate, TaskUpdate
---

# Storm: Multi-LLM Brainstorming

Turn ideas into fully formed designs through collaborative dialogue, optionally amplified by a multi-LLM council. The default mode is **parallel** — brainstorm locally, then send the design to the council for review.

Set the plugin base path from the skill loader header:
```bash
BRAINS_PATH="<base directory from header>/../.."
```

## Mode Behavior

| Mode | Flow |
|------|------|
| `--single` | Brainstorm with local LLM only. No council. |
| `--parallel` | Brainstorm locally, then send completed design to council for review. **(default)** |
| `--debate` | Each major design decision is debated across LLMs in real time. |

For `--parallel` and `--debate`, read and follow `$BRAINS_PATH/references/multi-llm-protocol.md` for prerequisites, invocation mechanics, and result presentation.

## Hard Gate

Do NOT write any implementation code, scaffold any project, or take any implementation action until a design has been presented and the user has approved it. This applies to every task regardless of perceived simplicity.

## Checklist

Create a task for each item and complete them in order:

1. **Parse arguments** — detect mode, rounds, and topic from invocation
2. **Explore project context** — check files, docs, recent commits, ARCHITECTURE.md
3. **Offer visual companion** — if the topic will involve visual questions (own message, nothing else). Read `$BRAINS_PATH/skills/storm/references/visual-companion.md` if the user accepts.
4. **Ask clarifying questions** — one at a time, prefer multiple choice. Focus on purpose, constraints, and success criteria.
5. **Propose 2-3 approaches** — with trade-offs and a recommendation. Lead with the recommended option.
6. **Present design** — scale each section to its complexity. Get approval after each section. Cover: architecture, components, data flow, error handling, testing.
7. **Council review** — parallel mode: send completed design to council. Debate mode: already incorporated. Single mode: skip.
8. **Integrate council feedback** — revise design based on council input (with user approval)
9. **Write design doc** — save to `docs/plans/YYYY-MM-DD-<topic>-storm.md`, commit to git
10. **Self-review spec** — scan for placeholders, contradictions, ambiguity, scope issues. Fix inline.
11. **User reviews spec** — ask user to review the written spec before proceeding
12. **Suggest next phase** — recommend `/brains:research` or `/brains:architect`

## Brainstorming Process

### Understanding the Idea

- Explore the current project state first (files, docs, recent commits)
- Before detailed questions, assess scope: if the request describes multiple independent subsystems, flag this immediately and help decompose into sub-projects
- For appropriately-scoped projects, ask questions one at a time
- Prefer multiple choice when possible, open-ended when necessary
- Only one question per message

### Exploring Approaches

- Propose 2-3 different approaches with trade-offs
- Present conversationally with a recommendation and reasoning
- Lead with the recommended option

### Presenting the Design

- Scale each section to its complexity: a few sentences if straightforward, up to 200-300 words if nuanced
- Ask after each section whether it looks right so far
- Cover: architecture, components, data flow, error handling, testing

### Design Principles

- Break systems into smaller units with one clear purpose and well-defined interfaces
- Each unit should be understandable without reading its internals
- Smaller, well-bounded units are easier to reason about and implement correctly

### Working in Existing Codebases

- Explore current structure before proposing changes. Follow existing patterns.
- Where existing code has problems affecting the work, include targeted improvements as part of the design
- Do not propose unrelated refactoring

## Council Review (Parallel Mode)

After the design is complete and user-approved, format a review question for the council:

```
Review this design for [topic].

[Full design content]

Evaluate:
1. Completeness — are there gaps or missing considerations?
2. Feasibility — are there technical risks or implementation challenges?
3. Alternatives — are there better approaches we haven't considered?
4. Trade-offs — are the chosen trade-offs reasonable?
```

Invoke star-chamber following `$BRAINS_PATH/references/multi-llm-protocol.md` parallel mode protocol.

Present council feedback to the user. If feedback reveals significant issues, revise the design (with user approval) before writing the spec.

## Council Integration (Debate Mode)

In debate mode, use the council at each major decision point during brainstorming:

- When proposing 2-3 approaches, debate them across providers before presenting to the user
- For significant architectural choices within the design, run a debate round
- Synthesize council input into the recommendation presented to the user
- Still present the final recommendation to the user for approval — the council is advisory

Follow the debate protocol in `$BRAINS_PATH/references/multi-llm-protocol.md`.

## Spec Output

Write the validated design to `docs/plans/YYYY-MM-DD-<topic>-storm.md`. Include:

- Problem statement and goals
- Chosen approach with rationale
- Architecture overview
- Component descriptions
- Data flow
- Error handling strategy
- Testing strategy
- Council feedback summary (if multi-LLM mode was used)
- Open questions (if any)

Commit the design document to git.

## Phase Transition

After the spec is written and approved:

> "Storm phase complete. Design spec committed to `<path>`.
>
> Next steps:
> - `/brains:research` — investigate dependencies, prior art, and technical feasibility
> - `/brains:architect` — jump straight to detailed architectural planning
> - `/brains:brains` — continue the full BRAINS pipeline"

## Additional Resources

- **`references/visual-companion.md`** — browser-based visual brainstorming guide
- **`$BRAINS_PATH/references/multi-llm-protocol.md`** — shared multi-LLM invocation protocol
