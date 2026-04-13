---
name: research
description: This skill should be used when the user asks to "research", "investigate", "look into", "find out about", "study the codebase", "check dependencies", "what exists for", "find prior art online", "what libraries exist for", or invokes "/brains:research". Deep investigation of codebases, dependencies, documentation, and prior art. Supports --single (default), --parallel, and --debate modes.
user-invocable: true
argument-hint: "[--single|--parallel|--debate] [topic]"
allowed-tools: Bash, Read, Glob, Grep, WebFetch, WebSearch, Agent
---

# Research: Structured Investigation

Conduct deep, systematic investigation of codebases, dependencies, documentation, and prior art. Produce a structured research report that informs the architect and implement phases.

Set the plugin base path:
```bash
BRAINS_PATH="<base directory from header>/../.."
```

## Mode Behavior

| Mode | Flow |
|------|------|
| `--single` | Local LLM researches independently. **(default)** |
| `--parallel` | Research locally, then send findings to council for validation and expansion. |
| `--debate` | Each major research question is investigated by all LLMs, findings compared. |

For `--parallel` and `--debate`, read and follow `$BRAINS_PATH/references/multi-llm-protocol.md`.

## Process

### 1. Define Research Questions

Before investigating, define clear research questions. Sources for these questions:

- **Storm output**: If a storm spec exists in `docs/plans/`, extract open questions and areas needing investigation
- **User request**: Parse the topic into specific, answerable questions
- **Implicit needs**: Identify what must be understood before architecture can begin

Present the research questions to the user for confirmation. Add or remove questions based on feedback.

### 2. Investigate

For each research question, use the appropriate investigation method:

**Codebase investigation:**
- Use Glob to find relevant files by pattern
- Use Grep to search for specific symbols, patterns, or conventions
- Use Read to understand file contents, focusing on interfaces and contracts
- Check git history for context on why code exists (`git log --oneline -20 -- <file>`)

**Dependency research:**
- Check existing dependencies (package.json, Cargo.toml, pyproject.toml, etc.)
- Use WebSearch and WebFetch to research candidate libraries
- Evaluate: recent commit activity, security posture, community adoption, license
- Use context7 MCP tools when available for up-to-date library documentation

**Documentation and prior art:**
- Search for existing design docs, ADRs, and READMEs in the project
- Check for related issues or PRs in the repository
- Use WebSearch for prior art, blog posts, and reference implementations

**Architecture understanding:**
- Read ARCHITECTURE.md if it exists
- Trace data flows through the codebase
- Map component boundaries and interfaces
- Identify patterns and conventions in use

### 3. Compile Findings

For each research question, document:

- **Answer**: What was found
- **Confidence**: High / Medium / Low
- **Sources**: Files, URLs, or git commits that support the finding
- **Implications**: How this affects design decisions
- **Open questions**: What remains unanswered

### 4. Council Review (Parallel Mode)

After compiling findings, format a review question for the council:

```
Review these research findings for [topic].

[Research findings]

Evaluate:
1. Are there gaps in the investigation?
2. Do the findings support the conclusions drawn?
3. Are there additional resources, approaches, or prior art we should consider?
4. Are there risks or considerations the research missed?
```

Invoke star-chamber following parallel mode protocol. Integrate council feedback into the report.

### 5. Council Investigation (Debate Mode)

In debate mode, send each major research question to the council:

```
Investigate this question: [research question]

Context: [project context, what we know so far]

Provide your analysis, including relevant prior art, risks, and recommendations.
```

Run debate rounds for each question. Synthesize the council's findings alongside local research.

## Research Report

Write findings to `docs/plans/YYYY-MM-DD-<topic>-research.md`. Structure:

```markdown
# Research: [Topic]

## Research Questions
1. [Question 1]
2. [Question 2]

## Findings

### [Question 1]
**Answer:** ...
**Confidence:** High/Medium/Low
**Sources:** ...
**Implications:** ...

### [Question 2]
...

## Dependencies Evaluated
| Library | Version | License | Activity | Recommendation |
|---------|---------|---------|----------|---------------|

## Architecture Context
[Relevant existing architecture observations]

## Council Feedback
[If multi-LLM mode was used]

## Open Questions
[What remains unanswered]

## Recommendations
[Summary of recommendations for the architect phase]
```

Commit the research document to git.

## Phase Transition

After the report is written:

> "Research phase complete. Report committed to `<path>`.
>
> Next steps:
> - `/brains:architect` — create the architectural design based on these findings
> - `/brains:brains` — continue the full BRAINS pipeline"

## Additional Resources

- **`$BRAINS_PATH/references/multi-llm-protocol.md`** — shared multi-LLM invocation protocol
