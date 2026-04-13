---
name: architect
description: This skill should be used when the user asks to "architect", "design the system", "plan the architecture", "create an ADR", "make design decisions", "define the structure", or invokes "/brains:architect". Creates architectural designs, ADRs, and technical plans. Supports --single (default), --parallel, and --debate modes.
user-invocable: true
argument-hint: "[--single|--parallel|--debate] [topic]"
allowed-tools: Bash, Read, Glob, Grep, Write, Edit, Agent
---

# Architect: Design and Decision-Making

Create architectural designs, record decisions as ADRs, and produce detailed technical plans that guide implementation. Build on storm and research outputs when available.

Set the plugin base path:
```bash
BRAINS_PATH="<base directory from header>/../.."
```

## Mode Behavior

| Mode | Flow |
|------|------|
| `--single` | Local LLM designs independently. **(default)** |
| `--parallel` | Design locally, then send to council for architectural review. |
| `--debate` | Each major architectural decision is debated across LLMs. |

For `--parallel` and `--debate`, read and follow `$BRAINS_PATH/references/multi-llm-protocol.md`.

## Process

### 1. Gather Inputs

Check for prior BRAINS phase outputs in `docs/plans/`:
- Storm specs (`*-storm.md`) — design direction and constraints
- Research reports (`*-research.md`) — technical findings and dependency recommendations

Also read:
- `ARCHITECTURE.md` if it exists — current architectural patterns
- `docs/adr/` — prior architectural decisions for consistency
- Existing codebase structure — follow established patterns

If no prior phase outputs exist, gather context directly from the user and codebase.

### 2. Identify Architectural Decisions

List the decisions that must be made. Categorize each:

| Decision | Category | Impact | Reversibility |
|----------|----------|--------|---------------|
| Example: data storage | Infrastructure | High | Low |
| Example: API format | Interface | Medium | Medium |

Present this list to the user. Prioritize high-impact, low-reversibility decisions — these need the most attention.

### 3. Make Decisions

For each architectural decision:

**Single mode:** Evaluate options, recommend one with clear rationale. Present to user for approval.

**Parallel mode:** Draft recommendation locally, then send to council:
```
Review this architectural decision for [project].

Decision: [what needs to be decided]
Context: [constraints, requirements, prior research]
Recommendation: [proposed approach]
Rationale: [why this approach]
Alternatives considered: [other options and why they were rejected]

Evaluate: Is this the right call? What risks or alternatives are we missing?
```

**Debate mode:** Send the decision to the council for multi-round deliberation:
```
Architectural decision needed: [what needs to be decided]

Context: [constraints, requirements, prior research]
Options identified: [list of approaches]

Evaluate each option. Consider: scalability, maintainability, security, developer experience, and alignment with existing patterns.
```

### 4. Record ADRs

For each significant decision, create an ADR in `docs/adr/`:

**Filename format:** `YYYY-MM-DD-NNN-<title>.md` where NNN is a globally sequential number (check existing ADRs in `docs/adr/` for the next available number).

**ADR structure:**
```markdown
# ADR-NNN: [Title]

**Date:** YYYY-MM-DD
**Status:** Accepted
**Decision makers:** [user + council providers if applicable]

## Context
[Why this decision is needed]

## Decision
[What was decided]

## Rationale
[Why this option was chosen over alternatives]

## Alternatives Considered
### [Alternative 1]
- Pros: ...
- Cons: ...
- Why rejected: ...

## Consequences
[What changes as a result of this decision]

## Council Input
[Summary of multi-LLM feedback, if applicable]
```

### 5. Create Architecture Design

Produce a comprehensive design document covering:

- **System overview** — high-level component diagram (text-based)
- **Component design** — each component's responsibility, interface, and dependencies
- **Data flow** — how data moves through the system
- **API design** — endpoints, contracts, error handling (if applicable)
- **Data model** — schemas, relationships, migrations (if applicable)
- **Error handling strategy** — how failures propagate and are handled
- **Testing strategy** — what to test at each level
- **Security considerations** — auth, input validation, secrets handling
- **Implementation sequence** — what to build first, dependency order

### 6. Council Review (Parallel Mode)

After the design is complete, send the full architecture to the council for review:

```
Review this architecture design for [project].

[Full design document]

Evaluate:
1. Are component boundaries clean and well-defined?
2. Are there coupling or cohesion concerns?
3. Does the data flow make sense?
4. Are there scalability or performance risks?
5. Is the implementation sequence reasonable?
```

Integrate feedback with user approval.

## Output

Write the architecture to `docs/plans/YYYY-MM-DD-<topic>-architect.md`. Commit ADRs and the architecture document to git.

## Phase Transition

After the design is written and approved:

> "Architect phase complete. Design committed to `<path>`. ADRs recorded in `docs/adr/`.
>
> Next steps:
> - `/brains:implement` — create implementation plan and begin building
> - `/brains:brains` — continue the full BRAINS pipeline"

## Additional Resources

- **`$BRAINS_PATH/references/multi-llm-protocol.md`** — shared multi-LLM invocation protocol
